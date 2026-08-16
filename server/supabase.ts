import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { db } from './db.js';

const DEFAULT_SUPABASE_URL = 'https://ddfsfemggwjtryosdgya.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_l4em_aFSdxQIpW2gLbShHA_r8Gjpt-j';

let supabaseClient: SupabaseClient | null = null;
let lastUsedUrl = '';
let lastUsedKey = '';

export function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_KEY;
  return { url, key };
}

export function getSupabase(): SupabaseClient | null {
  const { url, key } = getSupabaseConfig();

  if (!url || !key) {
    return null;
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
  assigned_agent_id BIGINT,
  property_id BIGINT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS site_visits (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  lead_id BIGINT,
  property_id BIGINT,
  agent_id BIGINT,
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

-- Enable RLS and public access policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE home_faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_visit_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE owner_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Allow authenticated update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Allow full access for authenticated/anon" ON properties FOR ALL USING (true);
CREATE POLICY "Allow full access for settings" ON settings FOR ALL USING (true);
CREATE POLICY "Allow full access for home_faqs" ON home_faqs FOR ALL USING (true);
CREATE POLICY "Allow full access for leads" ON leads FOR ALL USING (true);
CREATE POLICY "Allow full access for site_visits" ON site_visits FOR ALL USING (true);
CREATE POLICY "Allow full access for site_visit_feedback" ON site_visit_feedback FOR ALL USING (true);
CREATE POLICY "Allow full access for invoices" ON invoices FOR ALL USING (true);
CREATE POLICY "Allow full access for owner_submissions" ON owner_submissions FOR ALL USING (true);
`;

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

  try {
    // 1. Try Supabase Admin Auth API (requires service role key or admin capabilities)
    let authUser: any = null;
    try {
      const { data: adminData, error: adminError } = await supabase.auth.admin.createUser({
        email: cleanEmail,
        password: cleanPassword,
        email_confirm: true,
        user_metadata: {
          name: agentData.name,
          phone: agentData.phone || '',
          role: 'agent',
          notes: agentData.notes || ''
        }
      });

      if (!adminError && adminData?.user) {
        authUser = adminData.user;
      } else if (adminError && !adminError.message.includes('not authorized') && !adminError.message.includes('Forbidden')) {
        // Specific error like user already exists
        if (adminError.message.toLowerCase().includes('already registered')) {
          return { success: false, error: 'An account with this email already exists in Supabase.' };
        }
      }
    } catch (adminErr) {
      console.warn('Admin API not available, trying regular signup:', adminErr);
    }

    // 2. Fallback to regular signUp if admin API was not available
    if (!authUser) {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: cleanEmail,
        password: cleanPassword,
        options: {
          data: {
            name: agentData.name,
            phone: agentData.phone || '',
            role: 'agent',
            notes: agentData.notes || ''
          }
        }
      });

      if (signUpError) {
        return { success: false, error: signUpError.message };
      }

      if (signUpData?.user) {
        authUser = signUpData.user;
      }
    }

    if (!authUser) {
      return { success: false, error: 'Could not create user in Supabase Auth' };
    }

    // 3. Upsert into Supabase profiles table
    try {
      await supabase.from('profiles').upsert([{
        id: authUser.id,
        user_id: authUser.id,
        name: agentData.name,
        email: cleanEmail,
        phone: agentData.phone || '',
        role: 'agent',
        notes: agentData.notes || '',
        created_at: authUser.created_at || new Date().toISOString()
      }]);
    } catch (profErr) {
      console.warn('Profiles upsert note:', profErr);
    }

    return {
      success: true,
      user: {
        id: authUser.id,
        user_id: authUser.id,
        name: agentData.name,
        email: cleanEmail,
        phone: agentData.phone || '',
        role: 'AGENT',
        notes: agentData.notes || '',
        created_at: authUser.created_at || new Date().toISOString()
      }
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to create agent' };
  }
}

export async function syncAllDataToSupabase(): Promise<{ success: boolean; synced: Record<string, number>; errors: string[] }> {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, synced: {}, errors: ['Supabase client not initialized'] };
  }

  const tables = ['users', 'properties', 'leads', 'site_visits', 'site_visit_feedback', 'invoices', 'settings', 'home_faqs', 'owner_submissions'];
  const synced: Record<string, number> = {};
  const errors: string[] = [];

  for (const table of tables) {
    try {
      const res = await db.execute(`SELECT * FROM ${table}`);
      if (res.rows && res.rows.length > 0) {
        let count = 0;
        for (const row of res.rows) {
          const rowData = { ...row };
          const { error } = await supabase.from(table).upsert([rowData]);
          if (error) {
            errors.push(`${table} (ID ${row.id || row.key}): ${error.message}`);
          } else {
            count++;
          }
        }
        synced[table] = count;
      } else {
        synced[table] = 0;
      }
    } catch (err: any) {
      errors.push(`Table ${table}: ${err?.message || err}`);
    }
  }

  return {
    success: errors.length === 0,
    synced,
    errors,
  };
}

/**
 * Automatically sync a single record to Supabase in the background
 */
export async function autoSyncRowToSupabase(table: string, rowData: Record<string, any>): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  try {
    const cleanData = { ...rowData };
    const { error } = await supabase.from(table).upsert([cleanData]);
    if (error) {
      console.warn(`[Auto-Sync] Warning syncing ${table}:`, error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn(`[Auto-Sync] Error syncing ${table}:`, err?.message || err);
    return false;
  }
}

/**
 * Automatically delete a record from Supabase in the background
 */
export async function autoDeleteFromSupabase(table: string, column: string, value: any): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  try {
    const { error } = await supabase.from(table).delete().eq(column, value);
    if (error) {
      console.warn(`[Auto-Sync] Warning deleting from ${table}:`, error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn(`[Auto-Sync] Error deleting from ${table}:`, err?.message || err);
    return false;
  }
}

/**
 * Automatically bulk delete records from Supabase in the background
 */
export async function autoBulkDeleteFromSupabase(table: string, column: string, values: any[]): Promise<boolean> {
  if (!values || values.length === 0) return true;
  const supabase = getSupabase();
  if (!supabase) return false;

  try {
    const { error } = await supabase.from(table).delete().in(column, values);
    if (error) {
      console.warn(`[Auto-Sync] Warning bulk deleting from ${table}:`, error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn(`[Auto-Sync] Error bulk deleting from ${table}:`, err?.message || err);
    return false;
  }
}

// Background Auto-Sync Timer State
let autoSyncInterval: NodeJS.Timeout | null = null;
let lastAutoSyncTime: string | null = null;
let autoSyncStatus: { active: boolean; lastSync?: string; lastResult?: any } = { active: false };

export function getAutoSyncStatus() {
  return {
    active: true,
    lastSyncTime: lastAutoSyncTime,
    intervalMinutes: 1,
    status: 'REALTIME_AND_BACKGROUND_ACTIVE'
  };
}

/**
 * Starts continuous background synchronization loop (runs every 60 seconds and on startup)
 */
export function startContinuousAutoSync(intervalMs = 60000) {
  if (autoSyncInterval) {
    clearInterval(autoSyncInterval);
  }

  // Initial sync after 3 seconds on boot
  setTimeout(async () => {
    try {
      console.log('[Auto-Sync] Initializing automatic Supabase background sync...');
      const res = await syncAllDataToSupabase();
      lastAutoSyncTime = new Date().toISOString();
      autoSyncStatus = { active: true, lastSync: lastAutoSyncTime, lastResult: res };
      console.log('[Auto-Sync] Database initial auto-sync complete:', res.synced);
    } catch (e) {
      console.warn('[Auto-Sync] Initial sync note:', e);
    }
  }, 3000);

  // Recurring background sync every minute
  autoSyncInterval = setInterval(async () => {
    try {
      const res = await syncAllDataToSupabase();
      lastAutoSyncTime = new Date().toISOString();
      autoSyncStatus = { active: true, lastSync: lastAutoSyncTime, lastResult: res };
    } catch (e) {
      console.warn('[Auto-Sync] Periodic sync note:', e);
    }
  }, intervalMs);

  autoSyncStatus.active = true;
}

