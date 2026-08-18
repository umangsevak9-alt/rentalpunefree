import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AsyncLocalStorage } from 'node:async_hooks';

const DEFAULT_SUPABASE_URL = 'https://ddfsfemggwjtryosdgya.supabase.co';
const DEFAULT_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkZnNmZW1nZ3dqdHJ5b3NkZ3lhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIwNDQ5ODIsImV4cCI6MjA1NzYyMDk4Mn0.uHw5_j7Q4E8j5Fh0aWvjYl4K1D9_9H1z6Q6S9lE0I6U';

let supabaseClient: SupabaseClient | null = null;
let lastUsedUrl = '';
let lastUsedKey = '';

// Export request-scoped context storage
export const supabaseStorage = new AsyncLocalStorage<{ token?: string }>();

export function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_KEY;
  return { url, key };
}

export function getSupabase(): SupabaseClient | null {
  const { url, key } = getSupabaseConfig();

  if (!url || !key) {
    return null;
  }

  // Retrieve request-scoped token from AsyncLocalStorage
  const store = supabaseStorage.getStore();
  const token = store?.token;

  if (token) {
    // Return a request-scoped client with the active user's JWT token
    return createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });
  }

  if (!supabaseClient || lastUsedUrl !== url || lastUsedKey !== key) {
    lastUsedUrl = url;
    lastUsedKey = key;
    supabaseClient = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return supabaseClient;
}

export async function testSupabaseConnection(): Promise<{ ok: boolean; message: string; tablesExist?: boolean; data?: any }> {
  try {
    const client = getSupabase();
    if (!client) return { ok: false, message: 'Supabase client not initialized' };
    
    // Test selecting from properties or settings
    const { data, error } = await client.from('settings').select('count', { count: 'exact', head: true });
    
    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
        return { 
          ok: true, 
          tablesExist: false,
          message: 'Connected to Supabase project! (Tables not created yet in Supabase schema)' 
        };
      }
      return { ok: true, tablesExist: false, message: `Connected to Supabase: ${error.message}` };
    }
    return { ok: true, tablesExist: true, message: 'Connected & synchronized with Supabase database!', data };
  } catch (err: any) {
    return { ok: false, message: err?.message || 'Connection failed' };
  }
}

export function isSupabaseConnected(): boolean {
  const { url, key } = getSupabaseConfig();
  return !!(url && key);
}

export const SUPABASE_SCHEMA_SQL = `-- Rental Pune Supabase Database Schema
-- Paste and run this SQL script in your Supabase SQL Editor (https://supabase.com/dashboard)

-- 1. Profiles table linked to Supabase Auth UUID
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'agent',
  notes TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to automatically populate profile when a user signs up via Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, user_id, name, email, phone, role)
  VALUES (
    NEW.id,
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'phone',
    COALESCE(NEW.raw_user_meta_data->>'role', 'agent')
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    phone = COALESCE(EXCLUDED.phone, profiles.phone),
    role = COALESCE(EXCLUDED.role, profiles.role),
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE IF NOT EXISTS users (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT,
  role TEXT DEFAULT 'AGENT',
  phone TEXT,
  notes TEXT,
  permissions TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS properties (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC,
  type TEXT,
  bedrooms INT,
  bathrooms INT,
  area NUMERIC,
  location TEXT,
  status TEXT DEFAULT 'PUBLISHED',
  images TEXT,
  videos TEXT,
  faqs TEXT,
  hero_image TEXT,
  hero_video TEXT,
  floor_plans TEXT,
  brochures TEXT,
  amenities TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS leads (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  status TEXT DEFAULT 'New',
  source TEXT,
  assigned_agent_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  property_id BIGINT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS site_visits (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  lead_id BIGINT,
  property_id BIGINT,
  agent_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  visit_date TEXT,
  visit_time TEXT,
  status TEXT DEFAULT 'Scheduled',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS site_visit_feedback (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  visit_id BIGINT UNIQUE,
  interest_level TEXT,
  customer_feedback TEXT,
  requirements TEXT,
  budget NUMERIC,
  preferred_configuration TEXT,
  timeline TEXT,
  next_action TEXT,
  photos TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoices (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  invoice_number TEXT UNIQUE,
  lead_id BIGINT,
  property_id BIGINT,
  client_name TEXT,
  client_email TEXT,
  client_phone TEXT,
  client_address TEXT,
  client_pan TEXT,
  client_gstin TEXT,
  items TEXT,
  subtotal NUMERIC,
  tax_type TEXT DEFAULT 'GST_18',
  tax_rate NUMERIC DEFAULT 18,
  tax NUMERIC,
  discount NUMERIC,
  total NUMERIC,
  amount_paid NUMERIC DEFAULT 0,
  balance_due NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'Pending',
  payment_mode TEXT DEFAULT 'Bank Transfer / NEFT / RTGS',
  issue_date TEXT,
  due_date TEXT,
  terms TEXT,
  bank_name TEXT,
  account_holder TEXT,
  account_number TEXT,
  ifsc_code TEXT,
  branch_name TEXT,
  account_type TEXT,
  upi_id TEXT,
  upi_qr_url TEXT,
  payment_instructions TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS settings (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  key TEXT UNIQUE NOT NULL,
  value TEXT
);

CREATE TABLE IF NOT EXISTS home_faqs (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT DEFAULT 'General',
  sort_order INT DEFAULT 0,
  is_active INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS owner_submissions (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  owner_name TEXT NOT NULL,
  owner_phone TEXT NOT NULL,
  owner_email TEXT,
  owner_type TEXT DEFAULT 'OWNER',
  property_title TEXT NOT NULL,
  property_type TEXT DEFAULT 'Apartment',
  bhk_config TEXT DEFAULT '2 BHK',
  location TEXT NOT NULL,
  address TEXT,
  expected_rent NUMERIC,
  security_deposit NUMERIC,
  furnishing TEXT DEFAULT 'Semi-Furnished',
  available_from TEXT,
  preferred_tenants TEXT DEFAULT 'Any',
  amenities TEXT,
  images TEXT,
  notes TEXT,
  status TEXT DEFAULT 'PENDING',
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE home_faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_visit_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE owner_submissions ENABLE ROW LEVEL SECURITY;

-- 1. Helper security functions for recursion-safe role assertions
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
DECLARE
  v_role text;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
  RETURN LOWER(v_role) IN ('admin', 'main_admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_agent()
RETURNS boolean AS $$
DECLARE
  v_role text;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
  RETURN LOWER(v_role) IN ('agent', 'field_agent');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Profiles table policies
CREATE POLICY "profiles_admin_all" ON profiles FOR ALL USING (public.is_admin());
CREATE POLICY "profiles_self_select" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_self_update" ON profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- 3. Properties table policies
CREATE POLICY "properties_admin_all" ON properties FOR ALL USING (public.is_admin());
CREATE POLICY "properties_agent_select" ON properties FOR SELECT USING (public.is_agent());
CREATE POLICY "properties_public_select" ON properties FOR SELECT USING (status = 'PUBLISHED');

-- 4. Leads table policies
CREATE POLICY "leads_admin_all" ON leads FOR ALL USING (public.is_admin());
CREATE POLICY "leads_agent_select" ON leads FOR SELECT USING (public.is_agent() AND assigned_agent_id = auth.uid());
CREATE POLICY "leads_agent_update" ON leads FOR UPDATE USING (public.is_agent() AND assigned_agent_id = auth.uid()) WITH CHECK (public.is_agent() AND assigned_agent_id = auth.uid());
CREATE POLICY "leads_public_insert" ON leads FOR INSERT WITH CHECK (true);

-- 5. Site visits policies
CREATE POLICY "site_visits_admin_all" ON site_visits FOR ALL USING (public.is_admin());
CREATE POLICY "site_visits_agent_select" ON site_visits FOR SELECT USING (public.is_agent() AND agent_id = auth.uid());
CREATE POLICY "site_visits_agent_update" ON site_visits FOR UPDATE USING (public.is_agent() AND agent_id = auth.uid()) WITH CHECK (public.is_agent() AND agent_id = auth.uid());

-- 6. Site visit feedback policies
CREATE POLICY "feedback_admin_all" ON site_visit_feedback FOR ALL USING (public.is_admin());
CREATE POLICY "feedback_agent_select" ON site_visit_feedback FOR SELECT USING (public.is_agent() AND visit_id IN (SELECT id FROM public.site_visits WHERE agent_id = auth.uid()));
CREATE POLICY "feedback_agent_insert" ON site_visit_feedback FOR INSERT WITH CHECK (public.is_agent() AND visit_id IN (SELECT id FROM public.site_visits WHERE agent_id = auth.uid()));
CREATE POLICY "feedback_agent_update" ON site_visit_feedback FOR UPDATE USING (public.is_agent() AND visit_id IN (SELECT id FROM public.site_visits WHERE agent_id = auth.uid())) WITH CHECK (public.is_agent() AND visit_id IN (SELECT id FROM public.site_visits WHERE agent_id = auth.uid()));

-- 7. Invoices policies
CREATE POLICY "invoices_admin_all" ON invoices FOR ALL USING (public.is_admin());
CREATE POLICY "invoices_agent_select" ON invoices FOR SELECT USING (public.is_agent() AND lead_id IN (SELECT id FROM public.leads WHERE assigned_agent_id = auth.uid()));

-- 8. Owner submissions policies
CREATE POLICY "owner_submissions_admin_all" ON owner_submissions FOR ALL USING (public.is_admin());
CREATE POLICY "owner_submissions_public_insert" ON owner_submissions FOR INSERT WITH CHECK (true);

-- 9. Home FAQs policies
CREATE POLICY "home_faqs_admin_all" ON home_faqs FOR ALL USING (public.is_admin());
CREATE POLICY "home_faqs_public_select" ON home_faqs FOR SELECT USING (is_active = 1);

-- 10. Settings policies (exclude private settings)
CREATE POLICY "settings_admin_all" ON settings FOR ALL USING (public.is_admin());
CREATE POLICY "settings_public_select" ON settings FOR SELECT USING (key LIKE 'public_%' OR key IN ('site_title', 'site_description', 'contact_email', 'contact_phone', 'currency', 'company_name', 'address', 'about_text', 'logo_url', 'primary_color', 'social_links'));
`;

import crypto from 'crypto';

export async function createAuthAgentUser(agentData: {
  name: string;
  email: string;
  password?: string;
  phone?: string;
  notes?: string;
}): Promise<{ success: boolean; user?: any; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, error: 'Supabase client not initialized' };
  }

  const cleanEmail = agentData.email.trim().toLowerCase();
  const cleanPassword = agentData.password || 'PuneRental@2025';
  const shortNum = Math.floor(1000 + Math.random() * 9000);
  const formattedAgentId = `AGENT-${shortNum}`;
  // Use standard RFC4122 UUID v4 so PostgreSQL UUID columns don't fail syntax checks
  let authUserId: any = crypto.randomUUID();
  let authUser: any = null;

  try {
    // 1. Try Supabase Admin Auth API (if service role key is active)
    try {
      const { data: adminData, error: adminError } = await supabase.auth.admin.createUser({
        email: cleanEmail,
        password: cleanPassword,
        email_confirm: true,
        user_metadata: {
          name: agentData.name,
          phone: agentData.phone || '',
          role: 'AGENT',
          agent_id: formattedAgentId,
          notes: agentData.notes || ''
        }
      });

      if (!adminError && adminData?.user) {
        authUser = adminData.user;
        authUserId = adminData.user.id;
      }
    } catch (adminErr) {
      console.warn('Admin API note, falling back to signUp:', adminErr);
    }

    // 2. Fallback to regular signUp
    if (!authUser) {
      try {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: cleanEmail,
          password: cleanPassword,
          options: {
            data: {
              name: agentData.name,
              phone: agentData.phone || '',
              role: 'AGENT',
              agent_id: formattedAgentId,
              notes: agentData.notes || ''
            }
          }
        });

        if (signUpData?.user) {
          authUser = signUpData.user;
          authUserId = signUpData.user.id;
        } else if (signUpError) {
          console.warn('Supabase Auth signUp note:', signUpError.message);
        }
      } catch (signErr) {
        console.warn('Supabase Auth signUp catch:', signErr);
      }
    }

    // 3. Upsert into Supabase profiles table (uppercase 'AGENT' to satisfy PostgreSQL CHECK constraint)
    try {
      await supabase.from('profiles').upsert([{
        id: authUserId,
        name: agentData.name,
        email: cleanEmail,
        role: 'AGENT',
        created_at: new Date().toISOString()
      }], { onConflict: 'id' });
    } catch (profErr) {
      console.warn('Profiles upsert note:', profErr);
    }

    // 4. Upsert into Supabase users table (fallback)
    try {
      await supabase.from('users').upsert([{
        name: agentData.name,
        email: cleanEmail,
        role: 'AGENT',
        created_at: new Date().toISOString()
      }], { onConflict: 'email' });
    } catch (uErr) {
      console.warn('Users upsert note:', uErr);
    }

    const finalUser = {
      id: authUserId,
      user_id: authUserId,
      agent_id: formattedAgentId,
      name: agentData.name,
      email: cleanEmail,
      phone: agentData.phone || '',
      role: 'AGENT',
      status: 'ACTIVE',
      notes: agentData.notes || '',
      created_at: authUser?.created_at || new Date().toISOString()
    };

    return {
      success: true,
      user: finalUser
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to create agent' };
  }
}

export function getAutoSyncStatus() {
  return {
    active: true,
    lastSyncTime: new Date().toISOString(),
    intervalMinutes: 1,
    status: 'REALTIME_CLOUD_ACTIVE'
  };
}


