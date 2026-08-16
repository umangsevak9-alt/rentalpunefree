import fs from 'fs';
import path from 'path';
import { getSupabase } from './supabase.js';

const DATA_DIR = path.join(process.cwd(), 'data');
const SUBMISSIONS_FILE = path.join(DATA_DIR, 'owner_submissions.json');
const AGENTS_FILE = path.join(DATA_DIR, 'agents.json');
const LEADS_FILE = path.join(DATA_DIR, 'leads.json');
const VISITS_FILE = path.join(DATA_DIR, 'visits.json');
const FEEDBACKS_FILE = path.join(DATA_DIR, 'feedbacks.json');
const INVOICES_FILE = path.join(DATA_DIR, 'invoices.json');
const PROPERTIES_FILE = path.join(DATA_DIR, 'properties.json');

const DEFAULT_AGENTS = [
  {
    id: 1,
    user_id: '1',
    name: 'Vikram Joshi',
    email: 'vikram.joshi@rentalpune.com',
    phone: '+91 98221 44556',
    role: 'AGENT',
    notes: 'Koregaon Park & Kalyani Nagar Luxury Rental Specialist',
    created_at: new Date(Date.now() - 3600000 * 48).toISOString()
  },
  {
    id: 2,
    user_id: '2',
    name: 'Pooja Kulkarni',
    email: 'pooja.kulkarni@rentalpune.com',
    phone: '+91 98222 77889',
    role: 'AGENT',
    notes: 'Boat Club Road, Bund Garden & Camp Area Specialist',
    created_at: new Date(Date.now() - 3600000 * 36).toISOString()
  },
  {
    id: 3,
    user_id: '3',
    name: 'Rahul Deshmukh',
    email: 'rahul.deshmukh@rentalpune.com',
    phone: '+91 98223 11223',
    role: 'AGENT',
    notes: 'Baner, Balewadi & Hinjewadi Phase 1-3 Specialist',
    created_at: new Date(Date.now() - 3600000 * 24).toISOString()
  }
];

function ensureDataDir(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (e) {
    console.warn('[supabaseDb] Error creating data directory:', e);
  }
}

function loadJsonFile<T>(filePath: string, fallback: T): T {
  try {
    ensureDataDir();
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2), 'utf-8');
      return fallback;
    }
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed as unknown as T;
    }
    return parsed || fallback;
  } catch (err) {
    console.warn(`[supabaseDb] Error reading ${filePath}:`, err);
    return fallback;
  }
}

function saveJsonFile<T>(filePath: string, data: T): void {
  try {
    ensureDataDir();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.warn(`[supabaseDb] Error saving ${filePath}:`, err);
  }
}

const DEFAULT_OWNER_SUBMISSIONS = [
  {
    id: 101,
    owner_name: 'Anand Kulkarni',
    owner_phone: '+91 98220 14589',
    owner_email: 'anand.kulkarni@gmail.com',
    owner_type: 'OWNER',
    property_title: '3 BHK Luxury Flat in Megapolis Mulberry',
    property_type: 'Apartment',
    bhk_config: '3 BHK',
    location: 'Hinjewadi Phase 3',
    address: 'Tower A, Megapolis, Rajiv Gandhi Infotech Park, Hinjewadi',
    expected_rent: 38000,
    security_deposit: 100000,
    furnishing: 'Fully Furnished',
    available_from: 'Immediate',
    preferred_tenants: 'Family / IT Professionals',
    amenities: ['Power Backup', 'Gymnasium', 'Swimming Pool', '24/7 Security', 'Covered Parking', 'Clubhouse', 'Modular Kitchen'],
    images: [
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80'
    ],
    notes: 'Premium high-floor flat with valley views, high-speed fiber internet, and 100% power backup. Ideal for tech professionals.',
    status: 'PENDING',
    admin_notes: '',
    created_at: new Date(Date.now() - 3600000 * 2).toISOString()
  },
  {
    id: 102,
    owner_name: 'Rajesh Sharma',
    owner_phone: '+91 98811 77234',
    owner_email: 'rajesh.nri@outlook.com',
    owner_type: 'NRI',
    property_title: '2 BHK Premium Flat in Amanora Sweet Water Villas',
    property_type: 'Apartment',
    bhk_config: '2 BHK',
    location: 'Hadapsar',
    address: 'Sector 4, Amanora Park Town, Hadapsar, Pune',
    expected_rent: 32000,
    security_deposit: 80000,
    furnishing: 'Semi-Furnished',
    available_from: 'Next Month',
    preferred_tenants: 'Any',
    amenities: ['24/7 Security', 'Covered Parking', 'Modular Kitchen', 'Elevator / Lift', 'Piped MNGL Gas'],
    images: [
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80'
    ],
    notes: 'NRI owner based in Dubai. Society management has keys for inspection walkthroughs.',
    status: 'CONTACTED',
    admin_notes: 'Spoke with owner on WhatsApp. Walkthrough key with society office.',
    created_at: new Date(Date.now() - 3600000 * 8).toISOString()
  },
  {
    id: 103,
    owner_name: 'Priya Deshmukh',
    owner_phone: '+91 97654 32190',
    owner_email: 'priya.deshmukh@yahoo.com',
    owner_type: 'OWNER',
    property_title: '4 BHK Duplex Penthouse in Panchshil Towers',
    property_type: 'Penthouse / Villa',
    bhk_config: '4 BHK',
    location: 'Kharadi',
    address: 'Tower B, Panchshil Towers, EON Free Zone, Kharadi, Pune',
    expected_rent: 85000,
    security_deposit: 250000,
    furnishing: 'Fully Furnished',
    available_from: 'Immediate',
    preferred_tenants: 'Family',
    amenities: ['Swimming Pool', 'Clubhouse', '24/7 Security', 'Power Backup', 'Gymnasium', 'Children Play Area', 'Pet Friendly'],
    images: [
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80'
    ],
    notes: 'Ultra luxury duplex penthouse with designer interiors, Italian marble, and world class clubhouse.',
    status: 'APPROVED',
    admin_notes: 'Agreement signed. Verified owner credentials.',
    created_at: new Date(Date.now() - 3600000 * 24).toISOString()
  }
];

function loadSubmissionsFromFile(): any[] {
  return loadJsonFile<any[]>(SUBMISSIONS_FILE, DEFAULT_OWNER_SUBMISSIONS);
}

function saveSubmissionsToFile(list: any[]): void {
  saveJsonFile(SUBMISSIONS_FILE, list);
}

/**
 * Robust database repository layer that relies 100% on Supabase Cloud.
 * Direct configuration checks enforce that the application raises clear errors
 * if Supabase is unconfigured or offline, rather than failing silently or falling back.
 */

// Helper to check if a value is stringified JSON and parse it
function safeParseJSON(val: any, fallback: any = [], context?: string) {
  if (!val) return fallback;
  if (typeof val !== 'string') return val;
  try {
    return JSON.parse(val);
  } catch (e: any) {
    console.error(`[JSON Error] Malformed JSON encountered${context ? ` in ${context}` : ''}: "${val.substring(0, 100)}". Error: ${e?.message || e}`);
    return fallback;
  }
}

// Internal helper to get active Supabase client with clear unconfigured check
function getClient() {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase client is not configured on the server. Please define SUPABASE_URL and SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY in your environment variables.');
  }
  return supabase;
}

// Utility to execute inserts with automatic sequence/duplicate key retry logic
async function executeWithInsertRetry<T>(operation: () => Promise<any>, retries: number = 5): Promise<T> {
  let lastError: any = null;
  for (let attempt = 1; attempt <= retries; attempt++) {
    const result = await operation();
    const { data, error } = result;
    if (!error) {
      if (data !== undefined && data !== null) return data as T;
      throw new Error("No data returned from insertion operation");
    }
    
    const errorMsg = String(error.message || '').toLowerCase();
    const isDuplicateKey = error.code === '23505' || error.code === 'PGRST116' || errorMsg.includes('duplicate key') || errorMsg.includes('unique constraint');
    
    if (isDuplicateKey) {
      console.warn(`[Supabase Sequence Collision] Attempt ${attempt} failed with unique constraint/duplicate key. Retrying to allow sequence to advance... Error: ${error.message}`);
      lastError = error;
      await new Promise(resolve => setTimeout(resolve, 50));
      continue;
    }
    
    throw error;
  }
  
  throw new Error(`Insert failed after ${retries} attempts due to persistent sequence/key collisions. Last error: ${lastError?.message || lastError}`);
}

export const supabaseDb = {
  // --- PROPERTIES ---
  async getProperties(): Promise<any[]> {
    const supabase = getClient();
    const { data, error } = await supabase.from('properties').select('*').order('id', { ascending: false });
    if (error) {
      throw new Error(`Supabase query failed (Properties): ${error.message} (Code: ${error.code})`);
    }
    if (!data) return [];
    return data.map(p => ({
      ...p,
      images: safeParseJSON(p.images, [], `properties.images (ID ${p.id})`),
      videos: safeParseJSON(p.videos, [], `properties.videos (ID ${p.id})`),
      faqs: safeParseJSON(p.faqs, [], `properties.faqs (ID ${p.id})`)
    }));
  },

  async getProperty(id: any): Promise<any | null> {
    const supabase = getClient();
    const { data, error } = await supabase.from('properties').select('*').eq('id', id).maybeSingle();
    if (error) {
      throw new Error(`Supabase query failed (Property ID ${id}): ${error.message} (Code: ${error.code})`);
    }
    if (!data) return null;
    return {
      ...data,
      images: safeParseJSON(data.images, [], `properties.images (ID ${id})`),
      videos: safeParseJSON(data.videos, [], `properties.videos (ID ${id})`),
      faqs: safeParseJSON(data.faqs, [], `properties.faqs (ID ${id})`)
    };
  },

  async createProperty(p: any): Promise<any> {
    const imagesStr = JSON.stringify(p.images || []);
    const videosStr = JSON.stringify(p.videos || []);
    const faqsStr = JSON.stringify(p.faqs || []);

    const supabase = getClient();
    const payload = {
      title: p.title,
      description: p.description,
      price: p.price ? Number(p.price) : null,
      type: p.type,
      bedrooms: p.bedrooms ? Number(p.bedrooms) : null,
      bathrooms: p.bathrooms ? Number(p.bathrooms) : null,
      area: p.area ? Number(p.area) : null,
      location: p.location,
      status: p.status || 'PUBLISHED',
      images: imagesStr,
      videos: videosStr,
      faqs: faqsStr
    };
    return executeWithInsertRetry<any>(async () => 
      await supabase.from('properties').insert([payload]).select().single()
    );
  },

  async updateProperty(id: any, p: any): Promise<boolean> {
    const imagesStr = JSON.stringify(p.images || []);
    const videosStr = JSON.stringify(p.videos || []);
    const faqsStr = JSON.stringify(p.faqs || []);

    const supabase = getClient();
    const payload = {
      title: p.title,
      description: p.description,
      price: p.price ? Number(p.price) : null,
      type: p.type,
      bedrooms: p.bedrooms ? Number(p.bedrooms) : null,
      bathrooms: p.bathrooms ? Number(p.bathrooms) : null,
      area: p.area ? Number(p.area) : null,
      location: p.location,
      status: p.status || 'PUBLISHED',
      images: imagesStr,
      videos: videosStr,
      faqs: faqsStr
    };
    const { error } = await supabase.from('properties').update(payload).eq('id', id);
    if (error) {
      throw new Error(`Supabase update failed (Property ID ${id}): ${error.message} (Code: ${error.code})`);
    }
    return true;
  },

  async deleteProperty(id: any): Promise<boolean> {
    const supabase = getClient();
    const { error } = await supabase.from('properties').delete().eq('id', id);
    if (error) {
      throw new Error(`Supabase deletion failed (Property ID ${id}): ${error.message} (Code: ${error.code})`);
    }
    return true;
  },

  async bulkDeleteProperties(ids: any[]): Promise<boolean> {
    if (!ids || ids.length === 0) return true;
    const supabase = getClient();
    const { error } = await supabase.from('properties').delete().in('id', ids);
    if (error) {
      throw new Error(`Supabase bulk deletion failed (Properties): ${error.message} (Code: ${error.code})`);
    }
    return true;
  },

  // --- LEADS ---
  async getLeads(): Promise<any[]> {
    const supabase = getClient();
    const { data, error } = await supabase.from('leads').select('*').order('id', { ascending: false });
    if (error) {
      throw new Error(`Supabase query failed (Leads): ${error.message} (Code: ${error.code})`);
    }
    return data || [];
  },

  async createLead(l: any): Promise<any> {
    const supabase = getClient();
    const payload = {
      name: l.name,
      email: l.email || '',
      phone: l.phone,
      status: l.status || 'New',
      source: l.source || 'Website',
      assigned_agent_id: l.assigned_agent_id ? String(l.assigned_agent_id) : null,
      property_id: l.property_id ? Number(l.property_id) : null,
      notes: l.notes || ''
    };
    return executeWithInsertRetry<any>(async () => 
      await supabase.from('leads').insert([payload]).select().single()
    );
  },

  async updateLead(id: any, l: any): Promise<boolean> {
    const supabase = getClient();
    const payload: any = {};
    if (l.name !== undefined) payload.name = l.name;
    if (l.email !== undefined) payload.email = l.email;
    if (l.phone !== undefined) payload.phone = l.phone;
    if (l.status !== undefined) payload.status = l.status;
    if (l.source !== undefined) payload.source = l.source;
    if (l.assigned_agent_id !== undefined) payload.assigned_agent_id = l.assigned_agent_id ? String(l.assigned_agent_id) : null;
    if (l.property_id !== undefined) payload.property_id = l.property_id ? Number(l.property_id) : null;
    if (l.notes !== undefined) payload.notes = l.notes;

    const { error } = await supabase.from('leads').update(payload).eq('id', id);
    if (error) {
      throw new Error(`Supabase update failed (Lead ID ${id}): ${error.message} (Code: ${error.code})`);
    }
    return true;
  },

  async deleteLead(id: any): Promise<boolean> {
    const supabase = getClient();
    const { error } = await supabase.from('leads').delete().eq('id', id);
    if (error) {
      throw new Error(`Supabase deletion failed (Lead ID ${id}): ${error.message} (Code: ${error.code})`);
    }
    return true;
  },

  async bulkDeleteLeads(ids: any[]): Promise<boolean> {
    if (!ids || ids.length === 0) return true;
    const supabase = getClient();
    const { error } = await supabase.from('leads').delete().in('id', ids);
    if (error) {
      throw new Error(`Supabase bulk deletion failed (Leads): ${error.message} (Code: ${error.code})`);
    }
    return true;
  },

  // --- SITE VISITS ---
  async getVisits(userRole?: string, userId?: any): Promise<any[]> {
    const supabase = getClient();
    const [vRes, lRes, pRes, fRes] = await Promise.all([
      supabase.from('site_visits').select('*'),
      supabase.from('leads').select('*'),
      supabase.from('properties').select('*'),
      supabase.from('site_visit_feedback').select('*')
    ]);

    if (vRes.error) throw new Error(`Supabase query failed (Visits): ${vRes.error.message}`);
    if (lRes.error) throw new Error(`Supabase query failed (Leads for Visits): ${lRes.error.message}`);
    if (pRes.error) throw new Error(`Supabase query failed (Properties for Visits): ${pRes.error.message}`);
    if (fRes.error) throw new Error(`Supabase query failed (Feedback for Visits): ${fRes.error.message}`);

    let profiles: any[] = [];
    try {
      const prRes = await supabase.from('profiles').select('*');
      if (!prRes.error && prRes.data) {
        profiles = prRes.data;
      } else {
        const uRes = await supabase.from('users').select('*');
        if (!uRes.error && uRes.data) profiles = uRes.data;
      }
    } catch {}

    let visits = vRes.data || [];
    const leads = lRes.data || [];
    const properties = pRes.data || [];
    const feedback = fRes.data || [];

    // Filter by agent if role is AGENT
    if (userRole === 'AGENT' && userId) {
      const cleanUserId = String(userId);
      visits = visits.filter(v => {
        if (String(v.agent_id) === cleanUserId) return true;
        const matchingProfile = profiles.find(p => String(p.id) === cleanUserId || String(p.user_id) === cleanUserId);
        if (matchingProfile) {
          return String(v.agent_id) === String(matchingProfile.id) || String(v.agent_id) === String(matchingProfile.user_id);
        }
        return false;
      });
    }

    // Perform In-Memory Join
    const joined = visits.map(v => {
      const lead = leads.find(l => String(l.id) === String(v.lead_id));
      const prop = properties.find(p => String(p.id) === String(v.property_id));
      const agent = profiles.find(a => String(a.id || a.user_id) === String(v.agent_id));
      const feed = feedback.find(f => String(f.visit_id) === String(v.id));

      return {
        ...v,
        lead_name: lead?.name || '',
        lead_phone: lead?.phone || '',
        lead_email: lead?.email || '',
        property_title: prop?.title || '',
        property_location: prop?.location || '',
        agent_name: agent?.name || '',
        agent_email: agent?.email || '',
        feedback_id: feed?.id || null,
        interest_level: feed?.interest_level || null,
        customer_feedback: feed?.customer_feedback || null,
        requirements: feed?.requirements || null,
        budget: feed?.budget || null,
        preferred_configuration: feed?.preferred_configuration || null,
        timeline: feed?.timeline || null,
        next_action: feed?.next_action || null,
        feedback_created_at: feed?.created_at || null
      };
    });

    // Sort by visit date and time descending
    return joined.sort((a, b) => {
      const dateA = `${a.visit_date || ''}T${a.visit_time || ''}`;
      const dateB = `${b.visit_date || ''}T${b.visit_time || ''}`;
      return dateB.localeCompare(dateA);
    });
  },

  async createVisit(v: any): Promise<any> {
    const supabase = getClient();
    const payload = {
      lead_id: v.lead_id ? Number(v.lead_id) : null,
      property_id: v.property_id ? Number(v.property_id) : null,
      agent_id: v.agent_id ? String(v.agent_id) : null,
      visit_date: v.visit_date,
      visit_time: v.visit_time,
      status: v.status || 'Scheduled',
      notes: v.notes || ''
    };
    return executeWithInsertRetry<any>(async () => 
      await supabase.from('site_visits').insert([payload]).select().single()
    );
  },

  async updateVisit(id: any, v: any): Promise<boolean> {
    const supabase = getClient();
    const payload: any = {};
    if (v.lead_id !== undefined) payload.lead_id = v.lead_id ? Number(v.lead_id) : null;
    if (v.property_id !== undefined) payload.property_id = v.property_id ? Number(v.property_id) : null;
    if (v.agent_id !== undefined) payload.agent_id = v.agent_id ? String(v.agent_id) : null;
    if (v.visit_date !== undefined) payload.visit_date = v.visit_date;
    if (v.visit_time !== undefined) payload.visit_time = v.visit_time;
    if (v.status !== undefined) payload.status = v.status;
    if (v.notes !== undefined) payload.notes = v.notes;

    const { error } = await supabase.from('site_visits').update(payload).eq('id', id);
    if (error) {
      throw new Error(`Supabase update failed (Visit ID ${id}): ${error.message} (Code: ${error.code})`);
    }
    return true;
  },

  async deleteVisit(id: any): Promise<boolean> {
    const supabase = getClient();
    const { error } = await supabase.from('site_visits').delete().eq('id', id);
    if (error) {
      throw new Error(`Supabase deletion failed (Visit ID ${id}): ${error.message} (Code: ${error.code})`);
    }
    return true;
  },

  async bulkDeleteVisits(ids: any[]): Promise<boolean> {
    if (!ids || ids.length === 0) return true;
    const supabase = getClient();
    const { error } = await supabase.from('site_visits').delete().in('id', ids);
    if (error) {
      throw new Error(`Supabase bulk deletion failed (Visits): ${error.message} (Code: ${error.code})`);
    }
    return true;
  },

  // --- SITE VISIT FEEDBACK ---
  async getFeedbacks(userRole?: string, userId?: any): Promise<any[]> {
    const supabase = getClient();
    const [fRes, vRes, lRes, pRes] = await Promise.all([
      supabase.from('site_visit_feedback').select('*'),
      supabase.from('site_visits').select('*'),
      supabase.from('leads').select('*'),
      supabase.from('properties').select('*')
    ]);

    if (fRes.error) throw new Error(`Supabase query failed (Feedback): ${fRes.error.message}`);
    if (vRes.error) throw new Error(`Supabase query failed (Visits for Feedback): ${vRes.error.message}`);
    if (lRes.error) throw new Error(`Supabase query failed (Leads for Feedback): ${lRes.error.message}`);
    if (pRes.error) throw new Error(`Supabase query failed (Properties for Feedback): ${pRes.error.message}`);

    let profiles: any[] = [];
    try {
      const prRes = await supabase.from('profiles').select('*');
      if (!prRes.error && prRes.data) {
        profiles = prRes.data;
      } else {
        const uRes = await supabase.from('users').select('*');
        if (!uRes.error && uRes.data) profiles = uRes.data;
      }
    } catch {}

    const feedbacks = fRes.data || [];
    const visits = vRes.data || [];
    const leads = lRes.data || [];
    const properties = pRes.data || [];

    // In-memory Join & Filter by agent if needed
    const joined = feedbacks.map(f => {
      const visit = visits.find(v => String(v.id) === String(f.visit_id));
      if (!visit) return null;

      // Filter here if agent
      if (userRole === 'AGENT' && userId && String(visit.agent_id) !== String(userId)) {
        return null;
      }

      const lead = leads.find(l => String(l.id) === String(visit.lead_id));
      const prop = properties.find(p => String(p.id) === String(visit.property_id));
      const agent = profiles.find(a => String(a.id || a.user_id) === String(visit.agent_id));

      return {
        ...f,
        visit_date: visit.visit_date,
        visit_time: visit.visit_time,
        visit_status: visit.status,
        visit_notes: visit.notes,
        lead_name: lead?.name || '',
        lead_phone: lead?.phone || '',
        lead_email: lead?.email || '',
        property_title: prop?.title || '',
        property_location: prop?.location || '',
        property_price: prop?.price || null,
        property_type: prop?.type || '',
        agent_name: agent?.name || '',
        agent_email: agent?.email || ''
      };
    }).filter(Boolean);

    return joined.sort((a, b) => {
      const dateA = a.created_at || '';
      const dateB = b.created_at || '';
      return dateB.localeCompare(dateA);
    });
  },

  async createFeedback(f: any): Promise<any> {
    const supabase = getClient();
    const payload = {
      visit_id: f.visit_id ? Number(f.visit_id) : null,
      interest_level: f.interest_level || 'Warm',
      customer_feedback: f.customer_feedback || '',
      requirements: f.requirements || '',
      budget: f.budget ? Number(f.budget) : null,
      preferred_configuration: f.preferred_configuration || '2 BHK',
      timeline: f.timeline || 'Immediate',
      next_action: f.next_action || '',
      photos: typeof f.photos === 'string' ? f.photos : JSON.stringify(f.photos || [])
    };

    let resultData = null;
    if (payload.visit_id) {
      const { data: existing } = await supabase
        .from('site_visit_feedback')
        .select('id')
        .eq('visit_id', payload.visit_id)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from('site_visit_feedback')
          .update(payload)
          .eq('id', existing.id)
          .select()
          .single();
        if (!error && data) resultData = data;
      }
    }

    if (!resultData) {
      resultData = await executeWithInsertRetry<any>(async () => 
        await supabase.from('site_visit_feedback').insert([payload]).select().single()
      );
    }

    // Automatically update the visit status to 'Completed' in site_visits table
    if (payload.visit_id) {
      try {
        await supabase.from('site_visits').update({ status: 'Completed' }).eq('id', payload.visit_id);
      } catch (e) {
        console.warn('Could not auto-update site_visit status to Completed:', e);
      }
    }

    return resultData;
  },

  async deleteFeedback(id: any): Promise<boolean> {
    const supabase = getClient();
    const { error } = await supabase.from('site_visit_feedback').delete().eq('id', id);
    if (error) {
      throw new Error(`Supabase deletion failed (Feedback ID ${id}): ${error.message} (Code: ${error.code})`);
    }
    return true;
  },

  // --- INVOICES ---
  async getInvoices(): Promise<any[]> {
    const supabase = getClient();
    const { data, error } = await supabase.from('invoices').select('*').order('id', { ascending: false });
    if (error) {
      throw new Error(`Supabase query failed (Invoices): ${error.message} (Code: ${error.code})`);
    }
    return data || [];
  },

  async getInvoice(id: any): Promise<any | null> {
    const supabase = getClient();
    const { data, error } = await supabase.from('invoices').select('*').eq('id', id).maybeSingle();
    if (error) {
      throw new Error(`Supabase query failed (Invoice ID ${id}): ${error.message} (Code: ${error.code})`);
    }
    return data;
  },

  async createInvoice(i: any): Promise<any> {
    const supabase = getClient();
    const payload = {
      invoice_number: i.invoice_number,
      lead_id: i.lead_id ? Number(i.lead_id) : null,
      property_id: i.property_id ? Number(i.property_id) : null,
      client_name: i.client_name,
      client_email: i.client_email || '',
      client_phone: i.client_phone || '',
      client_address: i.client_address || '',
      client_pan: i.client_pan || '',
      client_gstin: i.client_gstin || '',
      items: typeof i.items === 'string' ? i.items : JSON.stringify(i.items || []),
      subtotal: Number(i.subtotal || 0),
      tax_type: i.tax_type || 'GST_18',
      tax_rate: Number(i.tax_rate || 18),
      tax: Number(i.tax || 0),
      discount: Number(i.discount || 0),
      total: Number(i.total || 0),
      amount_paid: Number(i.amount_paid || 0),
      balance_due: Number(i.balance_due || 0),
      status: i.status || 'Pending',
      payment_mode: i.payment_mode || 'Bank Transfer / NEFT / RTGS',
      issue_date: i.issue_date,
      due_date: i.due_date,
      terms: i.terms || '',
      bank_name: i.bank_name || '',
      account_holder: i.account_holder || '',
      account_number: i.account_number || '',
      ifsc_code: i.ifsc_code || '',
      branch_name: i.branch_name || '',
      account_type: i.account_type || 'Current',
      upi_id: i.upi_id || '',
      upi_qr_url: i.upi_qr_url || '',
      payment_instructions: i.payment_instructions || '',
      notes: i.notes || ''
    };
    return executeWithInsertRetry<any>(async () => 
      await supabase.from('invoices').insert([payload]).select().single()
    );
  },

  async updateInvoice(id: any, i: any): Promise<boolean> {
    const supabase = getClient();
    const payload = {
      invoice_number: i.invoice_number,
      lead_id: i.lead_id ? Number(i.lead_id) : null,
      property_id: i.property_id ? Number(i.property_id) : null,
      client_name: i.client_name,
      client_email: i.client_email,
      client_phone: i.client_phone,
      client_address: i.client_address,
      client_pan: i.client_pan,
      client_gstin: i.client_gstin,
      items: typeof i.items === 'string' ? i.items : i.items ? JSON.stringify(i.items) : undefined,
      subtotal: i.subtotal !== undefined ? Number(i.subtotal) : undefined,
      tax_type: i.tax_type,
      tax_rate: i.tax_rate !== undefined ? Number(i.tax_rate) : undefined,
      tax: i.tax !== undefined ? Number(i.tax) : undefined,
      discount: i.discount !== undefined ? Number(i.discount) : undefined,
      total: i.total !== undefined ? Number(i.total) : undefined,
      amount_paid: i.amount_paid !== undefined ? Number(i.amount_paid) : undefined,
      balance_due: i.balance_due !== undefined ? Number(i.balance_due) : undefined,
      status: i.status,
      payment_mode: i.payment_mode,
      issue_date: i.issue_date,
      due_date: i.due_date,
      terms: i.terms,
      bank_name: i.bank_name,
      account_holder: i.account_holder,
      account_number: i.account_number,
      ifsc_code: i.ifsc_code,
      branch_name: i.branch_name,
      account_type: i.account_type,
      upi_id: i.upi_id,
      upi_qr_url: i.upi_qr_url,
      payment_instructions: i.payment_instructions,
      notes: i.notes
    };
    const cleanPayload = Object.fromEntries(
      Object.entries(payload).filter(([_, v]) => v !== undefined)
    );
    const { error } = await supabase.from('invoices').update(cleanPayload).eq('id', id);
    if (error) {
      throw new Error(`Supabase update failed (Invoice ID ${id}): ${error.message} (Code: ${error.code})`);
    }
    return true;
  },

  async deleteInvoice(id: any): Promise<boolean> {
    const supabase = getClient();
    const { error } = await supabase.from('invoices').delete().eq('id', id);
    if (error) {
      throw new Error(`Supabase deletion failed (Invoice ID ${id}): ${error.message} (Code: ${error.code})`);
    }
    return true;
  },

  // --- SETTINGS ---
  async getSettings(): Promise<Record<string, string>> {
    const supabase = getClient();
    const { data, error } = await supabase.from('settings').select('*');
    if (error) {
      throw new Error(`Supabase query failed (Settings): ${error.message} (Code: ${error.code})`);
    }
    const map: Record<string, string> = {};
    data?.forEach(s => {
      map[s.key] = s.value;
    });
    return map;
  },

  async updateSettings(updates: Record<string, string>): Promise<boolean> {
    const supabase = getClient();
    const rows = Object.entries(updates).map(([key, value]) => ({ key, value }));
    for (const row of rows) {
      const { error } = await supabase.from('settings').upsert([row], { onConflict: 'key' });
      if (error) {
        throw new Error(`Supabase upsert failed (Settings Key ${row.key}): ${error.message} (Code: ${error.code})`);
      }
    }
    return true;
  },

  // --- FAQs ---
  async getFaqs(): Promise<any[]> {
    const supabase = getClient();
    const { data, error } = await supabase.from('home_faqs').select('*').eq('is_active', 1).order('sort_order', { ascending: true });
    if (error) {
      throw new Error(`Supabase query failed (FAQs active): ${error.message} (Code: ${error.code})`);
    }
    return data || [];
  },

  async getFaqsAll(): Promise<any[]> {
    const supabase = getClient();
    const { data, error } = await supabase.from('home_faqs').select('*').order('sort_order', { ascending: true });
    if (error) {
      throw new Error(`Supabase query failed (FAQs all): ${error.message} (Code: ${error.code})`);
    }
    return data || [];
  },

  async createFaq(f: any): Promise<any> {
    const supabase = getClient();
    const payload = {
      question: f.question,
      answer: f.answer,
      category: f.category || 'General',
      sort_order: f.sort_order ? Number(f.sort_order) : 0,
      is_active: f.is_active !== undefined ? Number(f.is_active) : 1
    };
    return executeWithInsertRetry<any>(async () => 
      await supabase.from('home_faqs').insert([payload]).select().single()
    );
  },

  async updateFaq(id: any, f: any): Promise<boolean> {
    const supabase = getClient();
    const payload = {
      question: f.question,
      answer: f.answer,
      category: f.category,
      sort_order: f.sort_order !== undefined ? Number(f.sort_order) : undefined,
      is_active: f.is_active !== undefined ? Number(f.is_active) : undefined
    };
    const cleanPayload = Object.fromEntries(
      Object.entries(payload).filter(([_, v]) => v !== undefined)
    );
    const { error } = await supabase.from('home_faqs').update(cleanPayload).eq('id', id);
    if (error) {
      throw new Error(`Supabase update failed (FAQ ID ${id}): ${error.message} (Code: ${error.code})`);
    }
    return true;
  },

  async deleteFaq(id: any): Promise<boolean> {
    const supabase = getClient();
    const { error } = await supabase.from('home_faqs').delete().eq('id', id);
    if (error) {
      throw new Error(`Supabase deletion failed (FAQ ID ${id}): ${error.message} (Code: ${error.code})`);
    }
    return true;
  },

  async resetFaqs(faqs: any[]): Promise<any[]> {
    const supabase = getClient();
    // Delete all first
    const { error: delError } = await supabase.from('home_faqs').delete().neq('id', 0);
    if (delError) {
      throw new Error(`Supabase truncation failed (FAQs): ${delError.message} (Code: ${delError.code})`);
    }

    const payload = faqs.map(f => ({
      question: f.question,
      answer: f.answer,
      category: f.category || 'General',
      sort_order: f.sort_order || 0,
      is_active: 1
    }));

    return executeWithInsertRetry<any[]>(async () => 
      await supabase.from('home_faqs').insert(payload).select()
    );
  },

  // --- OWNER SUBMISSIONS ---
  _ownerSubmissionsMemory: null as any[] | null,

  async getOwnerSubmissions(): Promise<any[]> {
    if (!this._ownerSubmissionsMemory) {
      this._ownerSubmissionsMemory = loadSubmissionsFromFile();
    }

    let cloudData: any[] = [];
    try {
      const supabase = getClient();
      const { data, error } = await supabase.from('owner_submissions').select('*').order('id', { ascending: false });
      if (!error && Array.isArray(data) && data.length > 0) {
        cloudData = data.map(s => ({
          ...s,
          amenities: safeParseJSON(s.amenities, Array.isArray(s.amenities) ? s.amenities : [], `owner_submissions.amenities (ID ${s.id})`),
          images: safeParseJSON(s.images, Array.isArray(s.images) ? s.images : [], `owner_submissions.images (ID ${s.id})`)
        }));
      }
    } catch (e) {
      console.warn('[supabaseDb] Direct Supabase getOwnerSubmissions note:', e);
    }

    // Merge cloud data, file data, and memory store
    const map = new Map<any, any>();
    
    // First load from file/memory
    for (const item of this._ownerSubmissionsMemory) {
      map.set(String(item.id), item);
    }
    // Overlay cloud data
    for (const item of cloudData) {
      map.set(String(item.id), item);
    }

    const all = Array.from(map.values()).sort((a, b) => {
      const timeA = new Date(a.created_at || 0).getTime();
      const timeB = new Date(b.created_at || 0).getTime();
      return timeB - timeA || Number(b.id || 0) - Number(a.id || 0);
    });

    this._ownerSubmissionsMemory = all;
    saveSubmissionsToFile(all);

    return all;
  },

  async createOwnerSubmission(os: any): Promise<any> {
    if (!this._ownerSubmissionsMemory) {
      this._ownerSubmissionsMemory = loadSubmissionsFromFile();
    }

    const payload = {
      owner_name: os.owner_name,
      owner_phone: os.owner_phone,
      owner_email: os.owner_email || '',
      owner_type: os.owner_type || 'OWNER',
      property_title: os.property_title,
      property_type: os.property_type || 'Apartment',
      bhk_config: os.bhk_config || '2 BHK',
      location: os.location,
      address: os.address || '',
      expected_rent: os.expected_rent ? Number(os.expected_rent) : null,
      security_deposit: os.security_deposit ? Number(os.security_deposit) : null,
      furnishing: os.furnishing || 'Semi-Furnished',
      available_from: os.available_from || '',
      preferred_tenants: os.preferred_tenants || 'Any',
      amenities: typeof os.amenities === 'string' ? os.amenities : JSON.stringify(os.amenities || []),
      images: typeof os.images === 'string' ? os.images : JSON.stringify(os.images || []),
      notes: os.notes || '',
      status: os.status || 'PENDING',
      admin_notes: os.admin_notes || ''
    };

    let createdRecord: any = null;

    try {
      const supabase = getClient();
      createdRecord = await executeWithInsertRetry<any>(async () => 
        await supabase.from('owner_submissions').insert([payload]).select().single()
      );
    } catch (cloudErr) {
      console.warn('[supabaseDb] Cloud insert note (falling back to generated ID):', cloudErr);
    }

    if (!createdRecord) {
      createdRecord = {
        id: Date.now(),
        ...payload,
        created_at: new Date().toISOString()
      };
    }

    const formatted = {
      ...createdRecord,
      amenities: safeParseJSON(createdRecord.amenities, Array.isArray(createdRecord.amenities) ? createdRecord.amenities : []),
      images: safeParseJSON(createdRecord.images, Array.isArray(createdRecord.images) ? createdRecord.images : [])
    };

    // Prepend to memory cache and persist to file
    this._ownerSubmissionsMemory = [formatted, ...this._ownerSubmissionsMemory.filter(m => String(m.id) !== String(formatted.id))];
    saveSubmissionsToFile(this._ownerSubmissionsMemory);

    return formatted;
  },

  async updateOwnerSubmission(id: any, os: any): Promise<boolean> {
    if (!this._ownerSubmissionsMemory) {
      this._ownerSubmissionsMemory = loadSubmissionsFromFile();
    }

    const payload = {
      owner_name: os.owner_name,
      owner_phone: os.owner_phone,
      owner_email: os.owner_email,
      owner_type: os.owner_type,
      property_title: os.property_title,
      property_type: os.property_type,
      bhk_config: os.bhk_config,
      location: os.location,
      address: os.address,
      expected_rent: os.expected_rent ? Number(os.expected_rent) : undefined,
      security_deposit: os.security_deposit ? Number(os.security_deposit) : undefined,
      furnishing: os.furnishing,
      available_from: os.available_from,
      preferred_tenants: os.preferred_tenants,
      amenities: typeof os.amenities === 'string' ? os.amenities : os.amenities ? JSON.stringify(os.amenities) : undefined,
      images: typeof os.images === 'string' ? os.images : os.images ? JSON.stringify(os.images) : undefined,
      notes: os.notes,
      status: os.status,
      admin_notes: os.admin_notes
    };
    const cleanPayload = Object.fromEntries(
      Object.entries(payload).filter(([_, v]) => v !== undefined)
    );

    // Update memory and save to file
    this._ownerSubmissionsMemory = this._ownerSubmissionsMemory.map(item => {
      if (String(item.id) === String(id)) {
        return { ...item, ...cleanPayload };
      }
      return item;
    });
    saveSubmissionsToFile(this._ownerSubmissionsMemory);

    try {
      const supabase = getClient();
      await supabase.from('owner_submissions').update(cleanPayload).eq('id', id);
    } catch (e) {
      console.warn('[supabaseDb] updateOwnerSubmission cloud update note:', e);
    }

    return true;
  },

  async deleteOwnerSubmission(id: any): Promise<boolean> {
    if (!this._ownerSubmissionsMemory) {
      this._ownerSubmissionsMemory = loadSubmissionsFromFile();
    }
    // Delete from memory and persist
    this._ownerSubmissionsMemory = this._ownerSubmissionsMemory.filter(m => String(m.id) !== String(id));
    saveSubmissionsToFile(this._ownerSubmissionsMemory);

    try {
      const supabase = getClient();
      await supabase.from('owner_submissions').delete().eq('id', id);
    } catch (e) {
      console.warn('[supabaseDb] deleteOwnerSubmission cloud delete note:', e);
    }
    return true;
  },

  async bulkDeleteOwnerSubmissions(ids: any[]): Promise<boolean> {
    if (!ids || ids.length === 0) return true;
    if (!this._ownerSubmissionsMemory) {
      this._ownerSubmissionsMemory = loadSubmissionsFromFile();
    }
    const strIds = ids.map(i => String(i));
    this._ownerSubmissionsMemory = this._ownerSubmissionsMemory.filter(m => !strIds.includes(String(m.id)));
    saveSubmissionsToFile(this._ownerSubmissionsMemory);

    try {
      const supabase = getClient();
      await supabase.from('owner_submissions').delete().in('id', ids);
    } catch (e) {
      console.warn('[supabaseDb] bulkDeleteOwnerSubmissions cloud delete note:', e);
    }
    return true;
  },

  // --- AGENTS (PROFILES / USERS TABLE) ---
  async getAgents(): Promise<any[]> {
    const fileAgents = loadJsonFile<any[]>(AGENTS_FILE, DEFAULT_AGENTS);
    const map = new Map<string, any>();

    // 1. Seed with local file-backed agents
    for (const a of fileAgents) {
      const key = String(a.email || a.id || a.user_id || '').toLowerCase();
      if (key) {
        map.set(key, {
          id: a.id || a.user_id,
          user_id: a.user_id || a.id,
          name: a.name || 'Agent',
          email: a.email || '',
          phone: a.phone || '',
          role: 'AGENT',
          notes: a.notes || '',
          permissions: a.permissions || '',
          created_at: a.created_at || new Date().toISOString()
        });
      }
    }

    // 2. Fetch from Supabase profiles table
    try {
      const supabase = getClient();
      const { data, error } = await supabase.from('profiles').select('*').order('name', { ascending: true });
      if (!error && Array.isArray(data)) {
        for (const p of data) {
          const r = String(p.role || '').toLowerCase();
          if (r === 'agent' || r === 'field_agent' || r === 'sub_admin' || (!r.includes('admin') && p.email)) {
            const key = String(p.email || p.id || p.user_id || '').toLowerCase();
            if (key) {
              const existing = map.get(key) || {};
              map.set(key, {
                id: p.id || p.user_id || existing.id,
                user_id: p.user_id || p.id || existing.user_id,
                name: p.name || existing.name || 'Agent',
                email: p.email || existing.email || '',
                phone: p.phone || existing.phone || '',
                role: 'AGENT',
                notes: p.notes || existing.notes || '',
                permissions: p.permissions || existing.permissions || '',
                created_at: p.created_at || existing.created_at || new Date().toISOString()
              });
            }
          }
        }
      }
    } catch (e) {
      console.warn('Profiles getAgents warning:', e);
    }

    // 3. Fetch from Supabase users table
    try {
      const supabase = getClient();
      const { data, error } = await supabase.from('users').select('*').order('name', { ascending: true });
      if (!error && Array.isArray(data)) {
        for (const u of data) {
          const r = String(u.role || '').toLowerCase();
          if (r === 'agent' || r === 'field_agent' || r === 'sub_admin' || (!r.includes('admin') && u.email)) {
            const key = String(u.email || u.id || '').toLowerCase();
            if (key) {
              const existing = map.get(key) || {};
              map.set(key, {
                id: u.id || existing.id,
                user_id: u.id || existing.user_id,
                name: u.name || existing.name || 'Agent',
                email: u.email || existing.email || '',
                phone: u.phone || existing.phone || '',
                role: 'AGENT',
                notes: u.notes || existing.notes || '',
                permissions: u.permissions || existing.permissions || '',
                created_at: u.created_at || existing.created_at || new Date().toISOString()
              });
            }
          }
        }
      }
    } catch (e) {
      console.warn('Users getAgents warning:', e);
    }

    const result = Array.from(map.values());
    if (result.length > 0) {
      saveJsonFile(AGENTS_FILE, result);
    }
    return result;
  },

  async recordAgentLogin(userData: { id?: string | number; email: string; name?: string; phone?: string; role?: string; notes?: string }): Promise<void> {
    if (!userData || !userData.email) return;
    const cleanEmail = userData.email.trim().toLowerCase();
    const role = String(userData.role || '').toLowerCase();
    
    // If it's an agent or non-admin user logging in, guarantee it's in the agent directory
    const currentAgents = loadJsonFile<any[]>(AGENTS_FILE, DEFAULT_AGENTS);
    const existingIndex = currentAgents.findIndex(a => (a.email || '').toLowerCase() === cleanEmail);
    
    const updatedAgent = {
      id: userData.id || (existingIndex >= 0 ? currentAgents[existingIndex].id : `agent-${Date.now()}`),
      user_id: userData.id || (existingIndex >= 0 ? currentAgents[existingIndex].user_id : `agent-${Date.now()}`),
      name: userData.name || (existingIndex >= 0 ? currentAgents[existingIndex].name : cleanEmail.split('@')[0]),
      email: cleanEmail,
      phone: userData.phone || (existingIndex >= 0 ? currentAgents[existingIndex].phone : ''),
      role: 'AGENT',
      notes: userData.notes || (existingIndex >= 0 ? currentAgents[existingIndex].notes : 'Registered field agent'),
      created_at: existingIndex >= 0 ? currentAgents[existingIndex].created_at : new Date().toISOString(),
      last_login: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      currentAgents[existingIndex] = { ...currentAgents[existingIndex], ...updatedAgent };
    } else {
      currentAgents.unshift(updatedAgent);
    }
    saveJsonFile(AGENTS_FILE, currentAgents);

    // Upsert into Supabase profiles
    try {
      const supabase = getClient();
      await supabase.from('profiles').upsert([{
        id: updatedAgent.id,
        user_id: updatedAgent.user_id,
        name: updatedAgent.name,
        email: updatedAgent.email,
        phone: updatedAgent.phone,
        role: 'agent',
        notes: updatedAgent.notes,
        created_at: updatedAgent.created_at
      }]);
    } catch (e) {
      console.warn('[supabaseDb] recordAgentLogin profile upsert note:', e);
    }
  },

  async updateAgent(id: any, agent: any): Promise<boolean> {
    const payload = {
      name: agent.name,
      email: agent.email,
      phone: agent.phone || '',
      notes: agent.notes || '',
      updated_at: new Date().toISOString()
    };

    // Update in local file store
    const currentAgents = loadJsonFile<any[]>(AGENTS_FILE, DEFAULT_AGENTS);
    const updated = currentAgents.map(a => 
      String(a.id) === String(id) || String(a.user_id) === String(id) ? { ...a, ...payload } : a
    );
    saveJsonFile(AGENTS_FILE, updated);
    
    try {
      const supabase = getClient();
      await supabase.from('profiles').update(payload).or(`id.eq.${id},user_id.eq.${id}`);
    } catch {}

    try {
      const supabase = getClient();
      await supabase.from('users').update(payload).eq('id', id);
    } catch {}

    return true;
  },

  async deleteAgent(id: any): Promise<boolean> {
    // Delete from file store
    const currentAgents = loadJsonFile<any[]>(AGENTS_FILE, DEFAULT_AGENTS);
    const filtered = currentAgents.filter(a => String(a.id) !== String(id) && String(a.user_id) !== String(id));
    saveJsonFile(AGENTS_FILE, filtered);

    try {
      const supabase = getClient();
      await supabase.from('profiles').delete().or(`id.eq.${id},user_id.eq.${id}`);
    } catch {}

    try {
      const supabase = getClient();
      await supabase.from('users').delete().eq('id', id);
    } catch {}

    try {
      const supabase = getClient();
      await supabase.auth.admin.deleteUser(id);
    } catch (e) {
      console.warn('Auth admin deleteUser skipped (missing admin privileges):', e);
    }
    return true;
  },

  // --- DASHBOARD STATS ---
  async getDashboardStats(userRole?: string, userId?: any): Promise<any> {
    const properties = await this.getProperties();
    let leads = await this.getLeads();
    const visitsJoined = await this.getVisits(userRole, userId);
    const feedbacks = await this.getFeedbacks(userRole, userId);
    const invoices = await this.getInvoices();

    // Filters for leads if agent
    if (userRole === 'AGENT' && userId) {
      leads = leads.filter(l => String(l.assigned_agent_id) === String(userId));
    }

    const propTotal = properties.length;
    const propPublished = properties.filter(p => p.status === 'PUBLISHED').length;
    const propSold = properties.filter(p => p.status === 'SOLD').length;
    const propDraft = properties.filter(p => p.status === 'DRAFT').length;

    const totalVal = properties.reduce((acc, p) => acc + (p.price || 0), 0);
    const publishedVal = properties.filter(p => p.status === 'PUBLISHED').reduce((acc, p) => acc + (p.price || 0), 0);

    const typeCounts: Record<string, number> = {};
    properties.forEach(p => {
      const type = p.type || 'Apartment';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });
    const propTypes = Object.entries(typeCounts).map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count);

    const leadTotal = leads.length;
    const leadActive = leads.filter(l => l.status !== 'Lost' && l.status !== 'Converted').length;
    const leadConverted = leads.filter(l => l.status === 'Converted').length;
    const leadNew = leads.filter(l => l.status === 'New').length;

    const stageCounts: Record<string, number> = {};
    leads.forEach(l => {
      const status = l.status || 'New';
      stageCounts[status] = (stageCounts[status] || 0) + 1;
    });
    const leadStages = Object.entries(stageCounts).map(([status, count]) => ({ status, count })).sort((a, b) => b.count - a.count);

    const visitTotal = visitsJoined.length;
    const visitScheduled = visitsJoined.filter(v => v.status === 'Scheduled').length;
    const visitCompleted = visitsJoined.filter(v => v.status === 'Completed').length;

    const agents = await this.getAgents();
    const agentCount = agents.length;

    const feedbackCount = feedbacks.length;
    const hotCount = feedbacks.filter(f => f.interest_level === 'Hot').length;
    const warmCount = feedbacks.filter(f => f.interest_level === 'Warm').length;
    const coldCount = feedbacks.filter(f => f.interest_level === 'Cold').length;

    const budgetSum = feedbacks.reduce((acc, f) => acc + (f.budget || 0), 0);
    const budgetCount = feedbacks.filter(f => (f.budget || 0) > 0).length;
    const avgBudget = budgetCount > 0 ? (budgetSum / budgetCount) : 0;

    const invoiceCount = invoices.length;
    const invoicePaidCount = invoices.filter(i => i.status === 'Paid').length;
    const invoicePendingCount = invoices.filter(i => i.status === 'Pending').length;

    const totalInvoiced = invoices.reduce((acc, i) => acc + (i.total || 0), 0);
    const totalCollected = invoices.reduce((acc, i) => acc + (i.amount_paid || 0), 0);
    const totalDue = invoices.reduce((acc, i) => acc + (i.balance_due || 0), 0);

    const recentFeedbacks = feedbacks.slice(0, 6);
    const recentLeads = leads.slice(0, 6);

    return {
      properties: {
        total: propTotal,
        published: propPublished,
        sold: propSold,
        draft: propDraft,
        total_val: totalVal,
        published_val: publishedVal,
        types: propTypes
      },
      leads: {
        total: leadTotal,
        active: leadActive,
        converted: leadConverted,
        new: leadNew,
        stages: leadStages
      },
      visits: {
        total: visitTotal,
        scheduled: visitScheduled,
        completed: visitCompleted
      },
      agents: {
        count: agentCount
      },
      feedback: {
        total: feedbackCount,
        hot: hotCount,
        warm: warmCount,
        cold: coldCount,
        avg_budget: avgBudget
      },
      invoices: {
        total: invoiceCount,
        paid: invoicePaidCount,
        pending: invoicePendingCount,
        total_invoiced: totalInvoiced,
        total_collected: totalCollected,
        total_due: totalDue
      },
      recentFeedbacks,
      recentLeads
    };
  }
};
