-- ==============================================================================
-- RENTAL PUNE — WHATSAPP NOTIFICATION SYSTEM & SECURITY HARDENING MIGRATION
-- Migration: 20261018000000_create_whatsapp_system.sql
-- Compatible with PostgreSQL 14+ / Supabase
-- Fully Idempotent & Re-runnable
-- ==============================================================================

-- 1. Helper Function: public.is_admin()
-- Verifies caller is an authenticated administrator or service role using ONLY
-- server-controlled sources. NEVER trusts client-writable user_metadata.
-- Hardened with explicit SET search_path = public, pg_temp to prevent privilege escalation.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- 1.1 Service role always has trusted administrative access (server-side only)
  IF (auth.jwt() ->> 'role') = 'service_role' THEN
    RETURN TRUE;
  END IF;

  -- 1.2 Server-controlled app_metadata (CANNOT be edited by end-users via client SDK)
  IF (auth.jwt() -> 'app_metadata' ->> 'role') IN ('MAIN_ADMIN', 'ADMIN') THEN
    RETURN TRUE;
  END IF;

  -- 1.3 Check public.profiles where role is MAIN_ADMIN or ADMIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    IF EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE public.profiles.id = auth.uid() 
      AND public.profiles.role IN ('MAIN_ADMIN', 'ADMIN')
    ) THEN
      RETURN TRUE;
    END IF;
  END IF;

  -- 1.4 Check public.users where email matches auth email AND role is MAIN_ADMIN or ADMIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
    IF EXISTS (
      SELECT 1 FROM public.users 
      WHERE LOWER(public.users.email) = LOWER(auth.jwt() ->> 'email')
      AND public.users.role IN ('MAIN_ADMIN', 'ADMIN')
    ) THEN
      RETURN TRUE;
    END IF;
  END IF;

  -- Client-writable user_metadata is strictly ignored for authorization.
  RETURN FALSE;
END;
$$;

-- 2. Anti-Escalation Hardening on public.profiles
-- Prevents ordinary authenticated users from escalating their own 'role' column.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
    CREATE POLICY "Users can update own profile" ON public.profiles 
      FOR UPDATE 
      USING (auth.uid() = id)
      WITH CHECK (
        auth.uid() = id 
        AND (
          role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
          OR public.is_admin()
        )
      );
  END IF;
END $$;

-- 3. Anti-Escalation Hardening on public.users
-- Prevents ordinary authenticated users from modifying public.users to inject or elevate roles.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
    DROP POLICY IF EXISTS "Admin full access users" ON public.users;
    CREATE POLICY "Admin full access users" ON public.users 
      FOR ALL 
      USING (public.is_admin());
  END IF;
END $$;

-- 4. Harden Admin Write Access on Core Tables (Revoke open 'authenticated' access)
DO $$
BEGIN
  -- Settings: Only Admin can write settings (public can read)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'settings') THEN
    DROP POLICY IF EXISTS "Admin write settings" ON public.settings;
    CREATE POLICY "Admin write settings" ON public.settings FOR ALL USING (public.is_admin());
  END IF;

  -- Properties: Only Admin can write properties (public can read)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'properties') THEN
    DROP POLICY IF EXISTS "Admin write properties" ON public.properties;
    CREATE POLICY "Admin write properties" ON public.properties FOR ALL USING (public.is_admin());
  END IF;

  -- Leads: Public can INSERT leads, Only Admin can view/modify/delete
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leads') THEN
    DROP POLICY IF EXISTS "Admin full access leads" ON public.leads;
    CREATE POLICY "Admin full access leads" ON public.leads FOR ALL USING (public.is_admin());
  END IF;
END $$;

-- 5. Add WhatsApp Consent Columns to public.leads
-- Safe to rerun: uses ADD COLUMN IF NOT EXISTS
ALTER TABLE public.leads 
  ADD COLUMN IF NOT EXISTS whatsapp_consent BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS whatsapp_consent_at TIMESTAMPTZ;

COMMENT ON COLUMN public.leads.whatsapp_consent IS 'Explicit opt-in received from customer for WhatsApp enquiry confirmations';
COMMENT ON COLUMN public.leads.whatsapp_consent_at IS 'Timestamp when the WhatsApp opt-in was provided by the customer';

-- 6. Create public.whatsapp_logs Table
-- Foreign key lead_id BIGINT matches existing public.leads(id) type BIGINT/BIGSERIAL
CREATE TABLE IF NOT EXISTS public.whatsapp_logs (
  id BIGSERIAL PRIMARY KEY,
  lead_id BIGINT REFERENCES public.leads(id) ON DELETE SET NULL,
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('CUSTOMER', 'ADMIN', 'TEST')),
  recipient_phone TEXT NOT NULL,
  message_type TEXT NOT NULL CHECK (message_type IN ('CUSTOMER_CONFIRMATION', 'ADMIN_ALERT', 'TEST')),
  status TEXT NOT NULL DEFAULT 'SENT' CHECK (status IN ('SENT', 'DELIVERED', 'READ', 'FAILED')),
  whatsapp_message_id TEXT,
  error_message TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Indexes for Fast Lookups and Deduplication
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_lead_id ON public.whatsapp_logs (lead_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_created_at ON public.whatsapp_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_status ON public.whatsapp_logs (status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_recipient_phone ON public.whatsapp_logs (recipient_phone);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_message_id ON public.whatsapp_logs (whatsapp_message_id);

-- 8. Row Level Security (RLS) on public.whatsapp_logs
ALTER TABLE public.whatsapp_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "whatsapp_logs_admin_all" ON public.whatsapp_logs;
CREATE POLICY "whatsapp_logs_admin_all" ON public.whatsapp_logs 
  FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "whatsapp_logs_service_role" ON public.whatsapp_logs;
CREATE POLICY "whatsapp_logs_service_role" ON public.whatsapp_logs 
  FOR ALL USING ((auth.jwt() ->> 'role') = 'service_role');

-- 9. Protected Server-Side Credentials Table (Never Publicly Readable)
-- Stores the Meta System User Access Token strictly accessible to Admins & Service Role.
-- Ordinary authenticated users (customers/tenants) have NO read or write access.
CREATE TABLE IF NOT EXISTS public.whatsapp_credentials (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  access_token TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.whatsapp_credentials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "whatsapp_credentials_admin_all" ON public.whatsapp_credentials;
CREATE POLICY "whatsapp_credentials_admin_all" ON public.whatsapp_credentials 
  FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "whatsapp_credentials_service_role" ON public.whatsapp_credentials;
CREATE POLICY "whatsapp_credentials_service_role" ON public.whatsapp_credentials 
  FOR ALL USING ((auth.jwt() ->> 'role') = 'service_role');

-- 10. Strict Permissions Grant / Revoke
-- Revoke all permissions from anon and public to ensure complete lock-down
REVOKE ALL ON public.whatsapp_credentials FROM anon, public;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_credentials TO authenticated, service_role;

REVOKE ALL ON public.whatsapp_logs FROM anon, public;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_logs TO authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.whatsapp_logs_id_seq TO authenticated, service_role;
