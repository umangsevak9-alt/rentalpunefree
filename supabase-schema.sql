-- ==============================================================================
-- RENTAL PUNE: COMPREHENSIVE SUPABASE POSTGRESQL DATABASE & STORAGE SCHEMA
-- ==============================================================================
-- Run this complete script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/sql
-- ==============================================================================

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. CREATE DATABASE TABLES
-- ==============================================================================

-- Profiles / User Role Table (Synced with Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'ADMIN' CHECK (role IN ('MAIN_ADMIN', 'ADMIN', 'AGENT')),
  permissions TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Legacy/Admin Users table for agent management and team assignments
CREATE TABLE IF NOT EXISTS public.users (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'AGENT' CHECK (role IN ('MAIN_ADMIN', 'ADMIN', 'AGENT')),
  permissions TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Properties / Listings Table
CREATE TABLE IF NOT EXISTS public.properties (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  type TEXT NOT NULL DEFAULT 'Apartment',
  bedrooms INT NOT NULL DEFAULT 2,
  bathrooms INT NOT NULL DEFAULT 2,
  area NUMERIC NOT NULL DEFAULT 1000,
  location TEXT NOT NULL DEFAULT 'Pune',
  status TEXT NOT NULL DEFAULT 'PUBLISHED' CHECK (status IN ('PUBLISHED', 'DRAFT', 'AVAILABLE', 'RESERVED', 'SOLD', 'ARCHIVED')),
  images JSONB DEFAULT '[]'::jsonb,
  videos JSONB DEFAULT '[]'::jsonb,
  faqs JSONB DEFAULT '[]'::jsonb,
  amenities JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leads / Inquiries Table
CREATE TABLE IF NOT EXISTS public.leads (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'New',
  source TEXT DEFAULT 'Website Concierge',
  property_id BIGINT REFERENCES public.properties(id) ON DELETE SET NULL,
  property_title TEXT,
  assigned_agent_id BIGINT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Site Visits Table
CREATE TABLE IF NOT EXISTS public.site_visits (
  id BIGSERIAL PRIMARY KEY,
  lead_id BIGINT REFERENCES public.leads(id) ON DELETE SET NULL,
  property_id BIGINT REFERENCES public.properties(id) ON DELETE SET NULL,
  agent_id BIGINT,
  visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  visit_time TEXT NOT NULL DEFAULT '11:00 AM',
  status TEXT NOT NULL DEFAULT 'Scheduled' CHECK (status IN ('Scheduled', 'Completed', 'Cancelled', 'Rescheduled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Site Visit Feedback Table
CREATE TABLE IF NOT EXISTS public.site_visit_feedback (
  id BIGSERIAL PRIMARY KEY,
  visit_id BIGINT UNIQUE REFERENCES public.site_visits(id) ON DELETE CASCADE,
  interest_level TEXT NOT NULL DEFAULT 'Warm' CHECK (interest_level IN ('Hot', 'Warm', 'Cold')),
  customer_feedback TEXT NOT NULL,
  requirements TEXT,
  budget NUMERIC,
  preferred_configuration TEXT,
  timeline TEXT,
  next_action TEXT,
  photos TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invoices Table
CREATE TABLE IF NOT EXISTS public.invoices (
  id BIGSERIAL PRIMARY KEY,
  invoice_number TEXT UNIQUE NOT NULL,
  lead_id BIGINT REFERENCES public.leads(id) ON DELETE SET NULL,
  property_id BIGINT REFERENCES public.properties(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL,
  client_email TEXT,
  client_phone TEXT,
  client_address TEXT,
  client_pan TEXT,
  client_gstin TEXT,
  property_title TEXT,
  property_location TEXT,
  items JSONB DEFAULT '[]'::jsonb,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  tax_type TEXT DEFAULT 'GST_18',
  tax_rate NUMERIC DEFAULT 18,
  tax NUMERIC NOT NULL DEFAULT 0,
  discount NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  balance_due NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Paid', 'Partially Paid', 'Overdue', 'Cancelled')),
  payment_mode TEXT DEFAULT 'Bank Transfer / NEFT / RTGS',
  issue_date DATE DEFAULT CURRENT_DATE,
  due_date DATE DEFAULT (CURRENT_DATE + INTERVAL '15 days'),
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

-- Home FAQs Table
CREATE TABLE IF NOT EXISTS public.home_faqs (
  id BIGSERIAL PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT DEFAULT 'General',
  sort_order INT DEFAULT 0,
  is_active INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Owner Property Submissions Table
CREATE TABLE IF NOT EXISTS public.owner_submissions (
  id BIGSERIAL PRIMARY KEY,
  owner_name TEXT NOT NULL,
  owner_phone TEXT NOT NULL,
  owner_email TEXT,
  owner_type TEXT DEFAULT 'OWNER',
  property_title TEXT NOT NULL,
  property_type TEXT DEFAULT 'Apartment',
  bhk_config TEXT DEFAULT '2 BHK',
  location TEXT NOT NULL,
  address TEXT,
  expected_rent NUMERIC DEFAULT 0,
  security_deposit NUMERIC DEFAULT 0,
  furnishing TEXT DEFAULT 'Semi-Furnished',
  available_from TEXT,
  preferred_tenants TEXT DEFAULT 'Any',
  amenities JSONB DEFAULT '[]'::jsonb,
  images JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Website Settings Table
CREATE TABLE IF NOT EXISTS public.settings (
  id BIGSERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 3. AUTH SYNC TRIGGER FOR SUPABASE AUTH USERS
-- ==============================================================================

-- Function to automatically sync auth.users into public.profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'role', 'ADMIN')
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    name = COALESCE(new.raw_user_meta_data->>'name', profiles.name),
    updated_at = NOW();

  -- Also keep users table updated for agent selection
  INSERT INTO public.users (name, email, role)
  VALUES (
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    COALESCE(new.raw_user_meta_data->>'role', 'ADMIN')
  )
  ON CONFLICT (email) DO UPDATE
  SET name = EXCLUDED.name;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Helper function to check if caller is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE public.profiles.id = auth.uid() 
      AND public.profiles.role IN ('MAIN_ADMIN', 'ADMIN')
    ) OR (auth.jwt() ->> 'role') = 'service_role'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_visit_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.home_faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owner_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- 4.1 Profiles Policies
CREATE POLICY "Public can view basic profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins have full access to profiles" ON public.profiles FOR ALL USING (public.is_admin() OR auth.role() = 'authenticated');

-- 4.2 Users Policies
CREATE POLICY "Public read users" ON public.users FOR SELECT USING (true);
CREATE POLICY "Admin full access users" ON public.users FOR ALL USING (public.is_admin() OR auth.role() = 'authenticated');

-- 4.3 Properties Policies
CREATE POLICY "Public read properties" ON public.properties FOR SELECT USING (true);
CREATE POLICY "Admin write properties" ON public.properties FOR ALL USING (public.is_admin() OR auth.role() = 'authenticated');

-- 4.4 Leads Policies (Public can submit leads, Admin can view/edit/delete)
CREATE POLICY "Public insert leads" ON public.leads FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin full access leads" ON public.leads FOR ALL USING (public.is_admin() OR auth.role() = 'authenticated');

-- 4.5 Site Visits Policies
CREATE POLICY "Admin full access site visits" ON public.site_visits FOR ALL USING (public.is_admin() OR auth.role() = 'authenticated');

-- 4.6 Feedback Policies
CREATE POLICY "Admin full access feedback" ON public.site_visit_feedback FOR ALL USING (public.is_admin() OR auth.role() = 'authenticated');

-- 4.7 Invoices Policies
CREATE POLICY "Admin full access invoices" ON public.invoices FOR ALL USING (public.is_admin() OR auth.role() = 'authenticated');

-- 4.8 Home FAQs Policies
CREATE POLICY "Public read FAQs" ON public.home_faqs FOR SELECT USING (true);
CREATE POLICY "Admin full access FAQs" ON public.home_faqs FOR ALL USING (public.is_admin() OR auth.role() = 'authenticated');

-- 4.9 Owner Submissions Policies (Public can submit property, Admin can view/approve/delete)
CREATE POLICY "Public insert owner submissions" ON public.owner_submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin full access owner submissions" ON public.owner_submissions FOR ALL USING (public.is_admin() OR auth.role() = 'authenticated');

-- 4.10 Settings Policies
CREATE POLICY "Public read settings" ON public.settings FOR SELECT USING (true);
CREATE POLICY "Admin write settings" ON public.settings FOR ALL USING (public.is_admin() OR auth.role() = 'authenticated');

-- ==============================================================================
-- 5. STORAGE BUCKET & POLICIES
-- ==============================================================================

-- Create 'property-images' public bucket in Supabase Storage
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'property-images',
  'property-images',
  true,
  52428800, -- 50MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/quicktime', 'video/webm', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE
SET public = true;

-- Storage RLS Policies
CREATE POLICY "Public Read Access" ON storage.objects
  FOR SELECT USING (bucket_id = 'property-images');

CREATE POLICY "Authenticated Uploads" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'property-images');

CREATE POLICY "Authenticated Updates" ON storage.objects
  FOR UPDATE USING (bucket_id = 'property-images');

CREATE POLICY "Authenticated Deletions" ON storage.objects
  FOR DELETE USING (bucket_id = 'property-images');

-- ==============================================================================
-- 6. DEFAULT INITIAL SEED DATA
-- ==============================================================================

-- 6.1 Seed Properties
INSERT INTO public.properties (id, title, description, price, type, bedrooms, bathrooms, area, location, status, images, videos, faqs)
VALUES 
(
  1,
  'Skyline Penthouse Koregaon Park',
  'Spectacular 4 BHK luxury penthouse with private plunge pool, panoramic greenery views, smart home automation, and private elevator access.',
  185000,
  '4 BHK',
  4,
  4,
  3400,
  'Koregaon Park, Pune',
  'PUBLISHED',
  '["https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80"]'::jsonb,
  '[]'::jsonb,
  '[{"question": "Is the plunge pool temperature controlled?", "answer": "Yes, it features automated solar and electric heating."}, {"question": "How many parking spots are included?", "answer": "3 reserved covered basement parking spots."}]'::jsonb
),
(
  2,
  'Grand Waterfront Villa Kalyani Nagar',
  'Ultra-luxurious standalone villa with manicured private lawn, double-height ceiling living room, designer modular kitchen, and staff quarters.',
  220000,
  '4 BHK',
  4,
  5,
  4200,
  'Kalyani Nagar, Pune',
  'PUBLISHED',
  '["https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80"]'::jsonb,
  '[]'::jsonb,
  '[{"question": "Are pets allowed?", "answer": "Yes, fully pet-friendly with private enclosed lawn."}]'::jsonb
),
(
  3,
  'Riverfront Panoramic Suite Boat Club Road',
  'Exclusive 3 BHK riverfront apartment in one of Pune’s most prestigious addresses. Unobstructed Mula-Mutha river vistas, wrap-around balconies, and imported finishes.',
  135000,
  '3 BHK',
  3,
  3,
  2650,
  'Boat Club Road, Pune',
  'PUBLISHED',
  '["https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=80"]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- Reset sequence for properties
SELECT setval('properties_id_seq', (SELECT COALESCE(MAX(id), 1) FROM public.properties));

-- 6.2 Seed FAQs
INSERT INTO public.home_faqs (id, question, answer, category, sort_order, is_active)
VALUES 
(
  1,
  'How do I schedule a private property viewing with Rental Pune?',
  'You can request a private viewing through our VIP concierge form on any listing page or contact our team directly via WhatsApp or phone. We coordinate with owners for exclusive, confidential tours.',
  'Viewing & Concierge',
  1,
  1
),
(
  2,
  'What documentation is required for leasing luxury residences in Pune?',
  'Standard tenancy verification requires PAN Card, Aadhaar Card, proof of employment or business ownership, and reference checks. For NRI or corporate leases, company registration and GST credentials are used.',
  'Documentation & Lease',
  2,
  1
),
(
  3,
  'Are the properties 100% verified before listing?',
  'Yes. Every property in our luxury portfolio undergoes comprehensive title checks, owner identity confirmation, and physical condition inspection prior to onboarding.',
  'Verification & Safety',
  3,
  1
)
ON CONFLICT (id) DO NOTHING;

-- Reset sequence for home_faqs
SELECT setval('home_faqs_id_seq', (SELECT COALESCE(MAX(id), 1) FROM public.home_faqs));

-- 6.3 Seed Settings
INSERT INTO public.settings (key, value)
VALUES 
  ('website_name', 'Rental Pune'),
  ('company_name', 'Rental Pune Luxury Real Estate Pvt. Ltd.'),
  ('phone', '+91 98220 12345'),
  ('email', 'concierge@rentalpune.com'),
  ('address', 'Level 5, ICC Trade Tower, Senapati Bapat Road, Pune, Maharashtra 411016'),
  ('hero_heading', 'Curated Luxury Residences in Prime Pune'),
  ('hero_subheading', 'Handpicked penthouses, riverside apartments, and signature villas in Pune''s most exclusive enclaves.'),
  ('whatsapp_number', '+919822012345'),
  ('whatsapp_message', 'Hello Rental Pune, I am looking for a luxury rental property in Pune.')
ON CONFLICT (key) DO NOTHING;

-- 6.4 Seed Agents in public.users
INSERT INTO public.users (id, name, email, role)
VALUES
  (1, 'Vikram Joshi', 'vikram.joshi@rentalpune.com', 'AGENT'),
  (2, 'Pooja Kulkarni', 'pooja.kulkarni@rentalpune.com', 'AGENT'),
  (3, 'Rahul Deshmukh', 'rahul.deshmukh@rentalpune.com', 'AGENT')
ON CONFLICT (id) DO NOTHING;

SELECT setval('users_id_seq', (SELECT COALESCE(MAX(id), 1) FROM public.users));
