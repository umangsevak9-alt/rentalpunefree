import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { supabaseDb } from './supabaseDb.js';
import { 
  getSupabase, 
  isSupabaseConnected, 
  getSupabaseConfig, 
  testSupabaseConnection, 
  getAutoSyncStatus,
  SUPABASE_SCHEMA_SQL,
  createAuthAgentUser,
  supabaseStorage
} from './supabase.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit for rich media
});

// --- SYSTEM HEALTH & DATABASE DIAGNOSTICS ---
router.get('/health', async (req, res) => {
  try {
    const start = Date.now();
    const supabase = getSupabase();
    let supabaseStatus = { connected: false, message: 'Not configured' };
    if (supabase) {
      const test = await testSupabaseConnection();
      supabaseStatus = { connected: test.ok, message: test.message };
    }

    res.json({
      status: 'healthy',
      database: {
        engine: 'Supabase PostgreSQL (Cloud)',
        connected: supabaseStatus.connected,
        latencyMs: Date.now() - start,
      },
      supabase: supabaseStatus,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(500).json({ status: 'unhealthy', error: err?.message });
  }
});

router.get('/database/status', async (req, res) => {
  try {
    const start = Date.now();
    const supabaseTest = await testSupabaseConnection();
    const { url } = getSupabaseConfig();

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      latencyMs: Date.now() - start,
      supabaseCloud: {
        url,
        connected: supabaseTest.ok,
        tablesExist: supabaseTest.tablesExist,
        statusMessage: supabaseTest.message
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

// --- AUTHENTICATION ---
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const supabase = getSupabase();
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase client is not configured' });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password
    });

    if (error) {
      return res.status(401).json({ error: error.message });
    }

    res.json({ 
      token: data.session?.access_token, 
      user: { 
        id: data.user?.id, 
        name: data.user?.user_metadata?.name || email.split('@')[0], 
        email: data.user?.email, 
        role: data.user?.user_metadata?.role || 'AGENT' 
      } 
    });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Server error' });
  }
});

// Middleware to verify auth (supports official Supabase Auth JWTs & local sessions)
const authenticate = async (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized: No token provided' });

  // 1. Try Supabase Auth Token Verification
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (user && !error) {
        let role = user.user_metadata?.role || 'ADMIN';
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .or(`id.eq.${user.id},user_id.eq.${user.id}`)
            .maybeSingle();
          if (profile?.role) {
            role = profile.role;
          }
        } catch {}

        req.user = {
          id: user.id,
          user_id: user.id,
          email: user.email,
          role: String(role).toUpperCase() === 'AGENT' || String(role).toLowerCase() === 'agent' ? 'AGENT' : 'ADMIN',
          rawRole: role,
          name: user.user_metadata?.name || user.email?.split('@')[0],
          isSupabaseUser: true
        };
        return supabaseStorage.run({ token }, () => next());
      }
    } catch (err) {
      // Continue to local JWT fallback
    }
  }

  // 2. Local JWT fallback
  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    return supabaseStorage.run({ token }, () => next());
  } catch (err) {
    // If token was provided from frontend in development mode, allow proceeding
    return res.status(401).json({ error: 'Invalid or expired authentication session' });
  }
};

const requireAdmin = (req: any, res: any, next: any) => {
  const role = String(req.user?.role || '').toUpperCase();
  if (role !== 'MAIN_ADMIN' && role !== 'ADMIN') {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }
  next();
};

router.get('/auth/me', authenticate, async (req: any, res: any) => {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase client is not configured' });
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', req.user.id)
      .maybeSingle();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!profile) {
      return res.json({
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        permissions: '[]'
      });
    }

    res.json({
      id: profile.id,
      name: profile.name,
      email: profile.email,
      role: String(profile.role).toUpperCase(),
      phone: profile.phone,
      notes: profile.notes
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Server error' });
  }
});

// --- SETTINGS (Public & Admin) ---
router.get('/settings', async (req, res) => {
  try {
    const settings = await supabaseDb.getSettings();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/settings', authenticate, requireAdmin, async (req, res) => {
  try {
    const updates = req.body; // e.g. { hero_heading: 'New Heading', phone: '123' }
    await supabaseDb.updateSettings(updates);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// --- UPLOAD HANDLERS (SUPABASE STORAGE EXCLUSIVE) ---
router.post('/upload/image', authenticate, upload.single('file'), async (req: any, res: any) => {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase client is not configured on the server.' });
    }

    let inputBuffer: Buffer;
    let originalName = 'photo';
    let originalSize = 0;

    if (req.file) {
      inputBuffer = req.file.buffer;
      originalName = req.file.originalname;
      originalSize = req.file.size;
    } else if (req.body && req.body.image) {
      // base64 image data support
      const base64Data = req.body.image.replace(/^data:image\/\w+;base64,/, '');
      inputBuffer = Buffer.from(base64Data, 'base64');
      originalName = req.body.name || 'image.png';
      originalSize = inputBuffer.length;
    } else {
      return res.status(400).json({ error: 'No image file provided.' });
    }

    // Auto-convert to high quality WebP format (effort 4, quality 92)
    const webpBuffer = await sharp(inputBuffer)
      .webp({ quality: 92, effort: 4 })
      .toBuffer();

    const cleanBaseName = path.parse(originalName).name.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30);
    const filename = `photo-${Date.now()}-${cleanBaseName}.webp`;

    // Ensure bucket exists or try to create it
    try {
      await supabase.storage.createBucket('property-images', { public: true });
    } catch (e) {
      // safe to ignore
    }

    const { data, error } = await supabase.storage
      .from('property-images')
      .upload(filename, webpBuffer, {
        contentType: 'image/webp',
        upsert: true
      });

    if (error) {
      throw new Error(`Failed to upload image to Supabase Storage: ${error.message}`);
    }

    const { data: { publicUrl } } = supabase.storage
      .from('property-images')
      .getPublicUrl(filename);

    const savedBytes = originalSize > webpBuffer.length ? originalSize - webpBuffer.length : 0;
    const savedPercent = originalSize > 0 ? Math.round((savedBytes / originalSize) * 100) : 0;

    res.json({
      success: true,
      url: publicUrl,
      format: 'webp',
      filename,
      originalSize,
      compressedSize: webpBuffer.length,
      savedPercent: Math.max(0, savedPercent)
    });
  } catch (err: any) {
    console.error('Error uploading/converting image to WebP:', err);
    res.status(500).json({ error: err?.message || 'Failed to process and convert image to WebP.' });
  }
});

router.post('/upload/video', authenticate, upload.single('file'), async (req: any, res: any) => {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase client is not configured on the server.' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No video file provided.' });
    }

    const ext = path.extname(req.file.originalname) || '.mp4';
    const cleanBaseName = path.parse(req.file.originalname).name.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30);
    const filename = `video-${Date.now()}-${cleanBaseName}${ext}`;

    // Ensure bucket exists or try to create it
    try {
      await supabase.storage.createBucket('property-images', { public: true });
    } catch (e) {
      // safe to ignore
    }

    const { data, error } = await supabase.storage
      .from('property-images')
      .upload(filename, req.file.buffer, {
        contentType: req.file.mimetype || 'video/mp4',
        upsert: true
      });

    if (error) {
      throw new Error(`Failed to upload video to Supabase Storage: ${error.message}`);
    }

    const { data: { publicUrl } } = supabase.storage
      .from('property-images')
      .getPublicUrl(filename);

    res.json({
      success: true,
      url: publicUrl,
      filename,
      size: req.file.size
    });
  } catch (err: any) {
    console.error('Error uploading video:', err);
    res.status(500).json({ error: err?.message || 'Failed to upload video.' });
  }
});

// --- PROPERTIES ---
router.get('/properties', async (req, res) => {
  try {
    const properties = await supabaseDb.getProperties();
    res.json(properties);
  } catch (err) {
    console.error('Error fetching properties:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/properties/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const property = await supabaseDb.getProperty(id);
    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }
    res.json(property);
  } catch (err) {
    console.error('Error fetching property:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/properties', authenticate, requireAdmin, async (req, res) => {
  try {
    const { title, description, price, type, bedrooms, bathrooms, area, location, status, images, videos, faqs } = req.body;
    const cleanImages = (Array.isArray(images) ? images : []).slice(0, 10);
    const cleanVideos = (Array.isArray(videos) ? videos : []).slice(0, 4);
    const cleanFaqs = Array.isArray(faqs) ? faqs : [];

    const result = await supabaseDb.createProperty({
      title,
      description,
      price,
      type,
      bedrooms,
      bathrooms,
      area,
      location,
      status,
      images: cleanImages,
      videos: cleanVideos,
      faqs: cleanFaqs
    });

    res.json({ id: result.id, success: true });
  } catch (err) {
    console.error('Error creating property:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/properties/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, price, type, bedrooms, bathrooms, area, location, status, images, videos, faqs } = req.body;
    const cleanImages = (Array.isArray(images) ? images : []).slice(0, 10);
    const cleanVideos = (Array.isArray(videos) ? videos : []).slice(0, 4);
    const cleanFaqs = Array.isArray(faqs) ? faqs : [];

    await supabaseDb.updateProperty(id, {
      title,
      description,
      price,
      type,
      bedrooms,
      bathrooms,
      area,
      location,
      status,
      images: cleanImages,
      videos: cleanVideos,
      faqs: cleanFaqs
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Error updating property:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// --- HOME PAGE FAQS (Public & Admin) ---
router.get('/faqs', async (req, res) => {
  try {
    const faqs = await supabaseDb.getFaqs();
    res.json(faqs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch FAQs' });
  }
});

router.get('/faqs/all', authenticate, requireAdmin, async (req, res) => {
  try {
    const faqs = await supabaseDb.getFaqsAll();
    res.json(faqs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch all FAQs' });
  }
});

router.post('/faqs', authenticate, requireAdmin, async (req, res) => {
  try {
    const { question, answer, category, sort_order = 0, is_active = 1 } = req.body;
    if (!question || !answer) {
      return res.status(400).json({ error: 'Question and answer are required' });
    }
    const result = await supabaseDb.createFaq({
      question,
      answer,
      category,
      sort_order,
      is_active
    });
    res.json({ id: result.id, success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create FAQ' });
  }
});

router.put('/faqs/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { question, answer, category, sort_order, is_active } = req.body;
    await supabaseDb.updateFaq(id, {
      question,
      answer,
      category,
      sort_order,
      is_active
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update FAQ' });
  }
});

router.delete('/faqs/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await supabaseDb.deleteFaq(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete FAQ' });
  }
});

router.post('/faqs/reset-defaults', authenticate, requireAdmin, async (req, res) => {
  try {
    const defaultHomeFaqs = [
      {
        question: 'How does the rental search and move-in process work with Rental Pune?',
        answer: 'Our process is simple and hassle-free: (1) Browse verified listings online or send us your specific requirements, (2) Schedule an assisted in-person site visit or live video walkthrough, (3) Finalize terms with the landlord with our expert assistance, (4) Complete doorstep biometric registration for the Leave & License agreement, and (5) Receive keys and move in with peace of mind.',
        category: 'Renting Process',
        sort_order: 1
      },
      {
        question: 'What is the typical security deposit amount in Pune?',
        answer: 'Security deposits across prime Pune localities (Baner, Kothrud, Viman Nagar, Hinjewadi, Kharadi, Koregaon Park) typically range between 2 to 3 months of monthly rent. The deposit is 100% refundable at the end of the tenancy upon key handover, subject to inspection.',
        category: 'Agreements & Deposits',
        sort_order: 2
      },
      {
        question: 'Is a registered Leave & License agreement mandatory in Maharashtra?',
        answer: 'Yes. Under Maharashtra Rent Control laws, every residential rental must be formalized via a government-registered Leave & License agreement with biometric Aadhaar verification and Pune Police tenant intimation. Rental Pune manages the complete biometric execution at your doorstep or office.',
        category: 'Agreements & Deposits',
        sort_order: 3
      },
      {
        question: 'What are your brokerage and service charges?',
        answer: 'We charge a standard, transparent 1-month rent brokerage upon successful agreement execution. This includes dedicated accompanied visits, rent negotiation, society NOC coordination, police verification, and complete agreement execution.',
        category: 'Brokerage & Fees',
        sort_order: 4
      },
      {
        question: 'Are bachelors, working professionals, and pet parents welcome?',
        answer: 'Yes! Many gated societies and premium high-rises in Pune welcome bachelors and pet owners. We pre-screen society bylaws so you are only shown properties matching your exact profile, saving you time and avoiding last-minute society objections.',
        category: 'Society & Move-in',
        sort_order: 5
      },
      {
        question: 'Who is responsible for society maintenance and utility bills?',
        answer: 'In standard Pune rental agreements, monthly housing society maintenance charges are paid directly by the property owner. Tenants pay for personal utilities consumed, such as electricity (MSEDCL), piped cooking gas (MNGL), and broadband internet.',
        category: 'Society & Move-in',
        sort_order: 6
      },
      {
        question: 'I am a property owner / NRI with a flat in Pune. How do you assist landlords?',
        answer: 'We offer end-to-end landlord services for resident owners and NRIs: professional photography, tenant background screening, rent agreement drafting, rent collection follow-ups, and move-in/move-out property condition audits.',
        category: 'Property Owners',
        sort_order: 7
      },
      {
        question: 'How do I schedule a site visit or virtual property walkthrough?',
        answer: 'You can click "Schedule Walkthrough" on any listing, fill out the assisted inquiry form on this homepage, or message us directly on WhatsApp. Our luxury rental advisor will coordinate the visit at your preferred date and time.',
        category: 'Renting Process',
        sort_order: 8
      }
    ];

    const all = await supabaseDb.resetFaqs(defaultHomeFaqs);
    res.json({ success: true, count: all.length, faqs: all });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reset FAQs' });
  }
});

router.delete('/properties/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const supabase = getSupabase();
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase client is not configured' });
    }

    // Get site visits for this property
    const { data: visits } = await supabase.from('site_visits').select('id').eq('property_id', id);
    const visitIds = visits?.map(v => v.id) || [];

    // Clean up dependent visits feedback
    if (visitIds.length > 0) {
      await supabase.from('site_visit_feedback').delete().in('visit_id', visitIds);
    }
    // Clean up site visits
    await supabase.from('site_visits').delete().eq('property_id', id);
    // Unlink from leads
    await supabase.from('leads').update({ property_id: null }).eq('property_id', id);
    // Delete invoices
    await supabase.from('invoices').delete().eq('property_id', id);
    
    // Delete property using supabaseDb repository layer
    await supabaseDb.deleteProperty(id);

    res.json({ success: true });
  } catch (err: any) {
    console.error('Error deleting property:', err);
    res.status(500).json({ error: err?.message || 'Server error' });
  }
});

// Admin BULK DELETE properties
router.post('/properties/bulk-delete', authenticate, requireAdmin, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'No property IDs provided for deletion.' });
    }

    const cleanIds = ids.map(id => Number(id)).filter(id => !isNaN(id) && id > 0);
    if (cleanIds.length === 0) {
      return res.status(400).json({ error: 'Invalid property IDs provided.' });
    }

    const supabase = getSupabase();
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase client is not configured' });
    }

    // Get site visits for these properties
    const { data: visits } = await supabase.from('site_visits').select('id').in('property_id', cleanIds);
    const visitIds = visits?.map(v => v.id) || [];

    // Clean up dependent visits feedback
    if (visitIds.length > 0) {
      await supabase.from('site_visit_feedback').delete().in('visit_id', visitIds);
    }
    // Clean up site visits
    await supabase.from('site_visits').delete().in('property_id', cleanIds);
    // Unlink from leads
    await supabase.from('leads').update({ property_id: null }).in('property_id', cleanIds);
    // Delete invoices
    await supabase.from('invoices').delete().in('property_id', cleanIds);
    
    // Bulk delete properties using supabaseDb repository layer
    await supabaseDb.bulkDeleteProperties(cleanIds);

    res.json({ success: true, count: cleanIds.length, message: `${cleanIds.length} properties deleted successfully.` });
  } catch (err: any) {
    console.error('Error bulk deleting properties:', err);
    res.status(500).json({ error: err?.message || 'Failed to bulk delete properties' });
  }
});

// --- LEADS ---
router.post('/leads', async (req, res) => {
  // Public endpoint for contact forms & site visit requests
  try {
    const { name, email, phone, notes, property_id } = req.body;
    
    if (!name || !phone) {
      return res.status(400).json({ error: 'Name and phone number are required.' });
    }

    const cleanPropertyId = property_id && !isNaN(Number(property_id)) ? Number(property_id) : null;
    const cleanNotes = notes ? String(notes) : '';
    const cleanEmail = email ? String(email) : '';
    const cleanName = String(name).trim();
    const cleanPhone = String(phone).trim();

    const result = await supabaseDb.createLead({
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      notes: cleanNotes,
      property_id: cleanPropertyId,
      source: 'Website'
    });

    return res.status(201).json({ 
      success: true, 
      id: result.id, 
      message: 'Enquiry received. Our team will contact you in 2 hours.' 
    });
  } catch (err: any) {
    console.error('Lead submission error:', err);
    return res.status(500).json({ error: err?.message || 'Failed to submit enquiry.' });
  }
});

router.get('/leads', authenticate, async (req: any, res: any) => {
  try {
    const userRole = String(req.user?.role || '').toUpperCase();
    const userId = req.user?.id || req.user?.user_id;

    let leads = await supabaseDb.getLeads();
    
    // If agent, only show their assigned leads
    if (userRole === 'AGENT' && userId) {
      leads = leads.filter(l => String(l.assigned_agent_id) === String(userId));
    }

    let properties: any[] = [];
    let agents: any[] = [];
    try {
      properties = await supabaseDb.getProperties();
    } catch (e) {
      console.warn('Could not fetch properties for leads join:', e);
    }
    try {
      agents = await supabaseDb.getAgents();
    } catch (e) {
      console.warn('Could not fetch agents for leads join:', e);
    }

    const joinedLeads = leads.map(l => {
      const prop = properties.find(p => String(p.id) === String(l.property_id));
      const agent = agents.find(a => String(a.id || a.user_id) === String(l.assigned_agent_id));
      return {
        ...l,
        property_title: prop?.title || null,
        assigned_agent_name: agent?.name || null
      };
    });

    res.json(joinedLeads);
  } catch (err: any) {
    console.error('Error fetching leads:', err);
    res.status(500).json({ error: err?.message || 'Server error fetching leads' });
  }
});

router.put('/leads/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, status, source, notes, assigned_agent_id, property_id } = req.body;

    await supabaseDb.updateLead(id, {
      name,
      email,
      phone,
      status,
      source,
      notes,
      assigned_agent_id,
      property_id
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Error updating lead:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/leads/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const supabase = getSupabase();
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase client is not configured' });
    }

    // Get site visits for this lead
    const { data: visits } = await supabase.from('site_visits').select('id').eq('lead_id', id);
    const visitIds = visits?.map(v => v.id) || [];

    // Clean up dependent visits feedback
    if (visitIds.length > 0) {
      await supabase.from('site_visit_feedback').delete().in('visit_id', visitIds);
    }
    // Clean up site visits
    await supabase.from('site_visits').delete().eq('lead_id', id);
    // Clean up invoices
    await supabase.from('invoices').delete().eq('lead_id', id);

    // Delete lead using supabaseDb
    await supabaseDb.deleteLead(id);

    res.json({ success: true, message: 'Lead deleted successfully' });
  } catch (err: any) {
    console.error('Error deleting lead:', err);
    res.status(500).json({ error: err?.message || 'Server error' });
  }
});

// Admin BULK DELETE leads
router.post('/leads/bulk-delete', authenticate, requireAdmin, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'No lead IDs provided for deletion.' });
    }

    const cleanIds = ids.map(id => Number(id)).filter(id => !isNaN(id) && id > 0);
    if (cleanIds.length === 0) {
      return res.status(400).json({ error: 'Invalid lead IDs provided.' });
    }

    const supabase = getSupabase();
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase client is not configured' });
    }

    // Get site visits for these leads
    const { data: visits } = await supabase.from('site_visits').select('id').in('lead_id', cleanIds);
    const visitIds = visits?.map(v => v.id) || [];

    // Clean up dependent visits feedback
    if (visitIds.length > 0) {
      await supabase.from('site_visit_feedback').delete().in('visit_id', visitIds);
    }
    // Clean up site visits
    await supabase.from('site_visits').delete().in('lead_id', cleanIds);
    // Clean up invoices
    await supabase.from('invoices').delete().in('lead_id', cleanIds);

    // Bulk delete leads using supabaseDb
    await supabaseDb.bulkDeleteLeads(cleanIds);

    res.json({ success: true, count: cleanIds.length, message: `${cleanIds.length} leads deleted successfully.` });
  } catch (err: any) {
    console.error('Error bulk deleting leads:', err);
    res.status(500).json({ error: err?.message || 'Failed to bulk delete leads' });
  }
});

// --- AGENTS (Users & Field Agents) ---
router.get(['/agents', '/admin/agents'], authenticate, requireAdmin, async (req, res) => {
  try {
    const agents = await supabaseDb.getAgents();
    res.json(agents);
  } catch (err) {
    res.status(500).json({ error: 'Server error fetching agents' });
  }
});

router.post(['/agents', '/admin/create-agent'], authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, email, password, phone, notes } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Create Agent Auth User in Supabase Auth & Profiles
    const authResult = await createAuthAgentUser({
      name: name.trim(),
      email: cleanEmail,
      password: password.trim(),
      phone: phone?.trim() || '',
      notes: notes?.trim() || ''
    });

    if (!authResult.success) {
      return res.status(400).json({ error: authResult.error || 'Failed to create agent in Supabase Auth' });
    }

    return res.status(201).json({
      success: true,
      message: 'Agent account created successfully in Supabase Auth',
      agent: authResult.user
    });
  } catch (err: any) {
    console.error('Error creating agent:', err);
    res.status(500).json({ error: err?.message || 'Server error creating agent account' });
  }
});

router.put(['/agents/:id', '/admin/agents/:id'], authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, phone, notes } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    // Update using supabaseDb
    await supabaseDb.updateAgent(id, { name, email, phone, notes });

    // Update auth password in Supabase if provided
    const supabase = getSupabase();
    if (supabase && password && password.trim()) {
      try {
        await supabase.auth.admin.updateUserById(id, {
          password: password.trim(),
          user_metadata: { name, phone: phone || '', notes: notes || '' }
        });
      } catch (e) {
        console.warn('Supabase auth password update error:', e);
      }
    }

    res.json({ success: true });
  } catch (err: any) {
    console.error('Error updating agent:', err);
    res.status(500).json({ error: err?.message || 'Server error' });
  }
});

router.delete(['/agents/:id', '/admin/agents/:id'], authenticate, requireAdmin, async (req: any, res: any) => {
  try {
    const { id } = req.params;

    // Prevent self-deletion if logged in admin
    if (req.user?.id === id || req.user?.user_id === id) {
      return res.status(400).json({ error: 'You cannot delete your own account while logged in.' });
    }

    // Delete using supabaseDb repository layer
    await supabaseDb.deleteAgent(id);

    // Delete Auth User
    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.auth.admin.deleteUser(id);
      } catch {}
    }

    res.json({ success: true, message: 'Agent deleted permanently.' });
  } catch (err) {
    console.error('Error deleting agent:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// --- SITE VISITS ---
router.get('/visits', authenticate, async (req: any, res: any) => {
  try {
    const visits = await supabaseDb.getVisits(req.user.role, req.user.id);
    res.json(visits);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/visits', authenticate, requireAdmin, async (req, res) => {
  try {
    const { lead_id, property_id, agent_id, visit_date, visit_time, notes } = req.body;
    const result = await supabaseDb.createVisit({
      lead_id,
      property_id,
      agent_id,
      visit_date,
      visit_time,
      notes
    });
    res.json({ id: result.id });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/visits/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { lead_id, property_id, agent_id, visit_date, visit_time, status, notes } = req.body;
    await supabaseDb.updateVisit(id, {
      lead_id,
      property_id,
      agent_id,
      visit_date,
      visit_time,
      status,
      notes
    });
    res.json({ success: true });
  } catch (err) {
    console.error('Error updating site visit:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/visits/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await supabaseDb.deleteVisit(id);
    res.json({ success: true, message: 'Site visit and feedback deleted successfully.' });
  } catch (err) {
    console.error('Error deleting site visit:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin BULK DELETE site visits
router.post('/visits/bulk-delete', authenticate, requireAdmin, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'No visit IDs provided for deletion.' });
    }

    const cleanIds = ids.map(id => Number(id)).filter(id => !isNaN(id) && id > 0);
    if (cleanIds.length === 0) {
      return res.status(400).json({ error: 'Invalid visit IDs provided.' });
    }

    await supabaseDb.bulkDeleteVisits(cleanIds);
    res.json({ success: true, count: cleanIds.length, message: `${cleanIds.length} site visits deleted successfully.` });
  } catch (err) {
    console.error('Error bulk deleting site visits:', err);
    res.status(500).json({ error: 'Failed to bulk delete site visits' });
  }
});

router.delete('/feedbacks/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await supabaseDb.deleteFeedback(id);
    res.json({ success: true, message: 'Feedback deleted successfully.' });
  } catch (err) {
    console.error('Error deleting feedback:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// --- AGENT FEEDBACK ---
router.get('/feedbacks', authenticate, async (req: any, res: any) => {
  try {
    const feedbacks = await supabaseDb.getFeedbacks(req.user.role, req.user.id);
    res.json(feedbacks);
  } catch (err) {
    console.error('Error fetching feedbacks:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/visits/:id/feedback', authenticate, async (req: any, res: any) => {
  try {
    const visitId = req.params.id;
    const { interest_level, customer_feedback, requirements, budget, preferred_configuration, timeline, next_action, photos } = req.body;
    
    const feedback = await supabaseDb.createFeedback({
      visit_id: visitId,
      interest_level,
      customer_feedback,
      requirements,
      budget,
      preferred_configuration,
      timeline,
      next_action,
      photos
    });
    
    res.json({ success: true, message: 'Feedback submitted successfully!', feedback });
  } catch (err: any) {
    console.error('Feedback submit error:', err);
    res.status(500).json({ error: err?.message || 'Server error saving feedback' });
  }
});

// --- INVOICES API (IN RUPEES ₹) ---
router.get('/invoices', authenticate, async (req: any, res: any) => {
  try {
    const invoices = await supabaseDb.getInvoices();
    res.json(invoices);
  } catch (err) {
    console.error('Error fetching invoices:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/invoices/:id', authenticate, async (req: any, res: any) => {
  try {
    const id = req.params.id;
    const invoice = await supabaseDb.getInvoice(id);
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    res.json(invoice);
  } catch (err) {
    console.error('Error fetching invoice details:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/invoices', authenticate, requireAdmin, async (req: any, res: any) => {
  try {
    const {
      invoice_number,
      lead_id,
      property_id,
      client_name,
      client_email,
      client_phone,
      client_address,
      client_pan,
      client_gstin,
      items,
      subtotal,
      tax_type,
      tax_rate,
      tax,
      discount,
      total,
      amount_paid,
      balance_due,
      status,
      payment_mode,
      issue_date,
      due_date,
      notes,
      terms,
      bank_name,
      account_holder,
      account_number,
      ifsc_code,
      branch_name,
      account_type,
      upi_id,
      upi_qr_url,
      payment_instructions
    } = req.body;

    // Generate unique invoice number if not provided
    let finalInvoiceNumber = invoice_number;
    if (!finalInvoiceNumber || !finalInvoiceNumber.trim()) {
      const invoices = await supabaseDb.getInvoices();
      const nextNum = invoices.length + 1;
      const year = new Date().getFullYear();
      finalInvoiceNumber = `INV-${year}-${String(nextNum).padStart(4, '0')}`;
    }

    const calcSubtotal = Number(subtotal) || 0;
    const calcTax = Number(tax) || 0;
    const calcDiscount = Number(discount) || 0;
    const calcTotal = Number(total) || (calcSubtotal + calcTax - calcDiscount);
    const calcPaid = Number(amount_paid) || 0;
    const calcBalance = balance_due !== undefined ? Number(balance_due) : Math.max(0, calcTotal - calcPaid);
    const finalStatus = status || (calcPaid >= calcTotal ? 'Paid' : calcPaid > 0 ? 'Partially Paid' : 'Pending');

    const result = await supabaseDb.createInvoice({
      invoice_number: finalInvoiceNumber,
      lead_id,
      property_id,
      client_name,
      client_email,
      client_phone,
      client_address,
      client_pan,
      client_gstin,
      items,
      subtotal: calcSubtotal,
      tax_type,
      tax_rate,
      tax: calcTax,
      discount: calcDiscount,
      total: calcTotal,
      amount_paid: calcPaid,
      balance_due: calcBalance,
      status: finalStatus,
      payment_mode,
      issue_date,
      due_date,
      notes,
      terms,
      bank_name,
      account_holder,
      account_number,
      ifsc_code,
      branch_name,
      account_type,
      upi_id,
      upi_qr_url,
      payment_instructions
    });

    res.json({ id: result.id, invoice_number: finalInvoiceNumber, success: true });
  } catch (err) {
    console.error('Error creating invoice:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/invoices/:id', authenticate, requireAdmin, async (req: any, res: any) => {
  try {
    const id = req.params.id;
    const {
      invoice_number,
      lead_id,
      property_id,
      client_name,
      client_email,
      client_phone,
      client_address,
      client_pan,
      client_gstin,
      items,
      subtotal,
      tax_type,
      tax_rate,
      tax,
      discount,
      total,
      amount_paid,
      balance_due,
      status,
      payment_mode,
      issue_date,
      due_date,
      notes,
      terms,
      bank_name,
      account_holder,
      account_number,
      ifsc_code,
      branch_name,
      account_type,
      upi_id,
      upi_qr_url,
      payment_instructions
    } = req.body;

    const calcSubtotal = Number(subtotal) || 0;
    const calcTax = Number(tax) || 0;
    const calcDiscount = Number(discount) || 0;
    const calcTotal = Number(total) || (calcSubtotal + calcTax - calcDiscount);
    const calcPaid = Number(amount_paid) || 0;
    const calcBalance = balance_due !== undefined ? Number(balance_due) : Math.max(0, calcTotal - calcPaid);

    await supabaseDb.updateInvoice(id, {
      invoice_number,
      lead_id,
      property_id,
      client_name,
      client_email,
      client_phone,
      client_address,
      client_pan,
      client_gstin,
      items,
      subtotal: calcSubtotal,
      tax_type,
      tax_rate,
      tax: calcTax,
      discount: calcDiscount,
      total: calcTotal,
      amount_paid: calcPaid,
      balance_due: calcBalance,
      status: status || 'Pending',
      payment_mode: payment_mode || 'Bank Transfer / NEFT / RTGS',
      issue_date,
      due_date,
      notes,
      terms,
      bank_name,
      account_holder,
      account_number,
      ifsc_code,
      branch_name,
      account_type,
      upi_id,
      upi_qr_url,
      payment_instructions
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Error updating invoice:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/invoices/:id', authenticate, requireAdmin, async (req: any, res: any) => {
  try {
    const id = req.params.id;
    await supabaseDb.deleteInvoice(id);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting invoice:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/invoices/:id/payment', authenticate, requireAdmin, async (req: any, res: any) => {
  try {
    const id = req.params.id;
    const { amount_paid, status, payment_mode } = req.body;

    const invoice = await supabaseDb.getInvoice(id);
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const total = Number(invoice.total) || 0;
    const newPaid = Number(amount_paid) || 0;
    const newBalance = Math.max(0, total - newPaid);
    const newStatus = status || (newPaid >= total ? 'Paid' : newPaid > 0 ? 'Partially Paid' : 'Pending');

    await supabaseDb.updateInvoice(id, {
      ...invoice,
      amount_paid: newPaid,
      balance_due: newBalance,
      status: newStatus,
      payment_mode: payment_mode || invoice.payment_mode
    });

    res.json({ success: true, amount_paid: newPaid, balance_due: newBalance, status: newStatus });
  } catch (err) {
    console.error('Error updating invoice payment:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// --- DASHBOARD STATS ---
router.get('/dashboard/stats', authenticate, async (req: any, res: any) => {
  try {
    const stats = await supabaseDb.getDashboardStats(req.user.role, req.user.id);
    res.json({
      serverTime: new Date().toISOString(),
      properties: {
        total: stats.properties.total,
        published: stats.properties.published,
        sold: stats.properties.sold,
        draft: stats.properties.draft,
        totalPortfolioValue: stats.properties.total_val,
        publishedPortfolioValue: stats.properties.published_val,
        typeBreakdown: stats.properties.types
      },
      leads: {
        total: stats.leads.total,
        active: stats.leads.active,
        converted: stats.leads.converted,
        new: stats.leads.new,
        stageBreakdown: stats.leads.stages,
        recent: stats.recentLeads
      },
      visits: {
        total: stats.visits.total,
        scheduled: stats.visits.scheduled,
        completed: stats.visits.completed
      },
      agents: {
        total: stats.agents.count
      },
      feedbacks: {
        total: stats.feedback.total,
        hotLeads: stats.feedback.hot,
        warmLeads: stats.feedback.warm,
        coldLeads: stats.feedback.cold,
        averageBudget: stats.feedback.avg_budget,
        recent: stats.recentFeedbacks
      },
      invoices: {
        total: stats.invoices.total,
        paid: stats.invoices.paid,
        pending: stats.invoices.pending,
        totalInvoiced: stats.invoices.total_invoiced,
        totalCollected: stats.invoices.total_collected,
        totalDue: stats.invoices.total_due
      }
    });
  } catch (err) {
    console.error('Error in /dashboard/stats:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// --- SUPABASE STATUS & SYNC ---
router.get('/supabase/status', authenticate, requireAdmin, async (req, res) => {
  const connected = isSupabaseConnected();
  const { url } = getSupabaseConfig();
  
  if (!connected) {
    return res.json({
      connected: false,
      message: 'Supabase credentials not configured in environment.'
    });
  }

  const testRes = await testSupabaseConnection();

  return res.json({
    connected: true,
    url,
    tablesExist: testRes.tablesExist,
    message: testRes.message
  });
});

router.get('/supabase/sql', authenticate, requireAdmin, async (req, res) => {
  return res.json({
    sql: SUPABASE_SCHEMA_SQL
  });
});

router.post('/supabase/sync', authenticate, requireAdmin, async (req, res) => {
  try {
    return res.json({
      success: true,
      message: 'Continuous synchronization with Supabase Cloud database is active and operational. Zero-latency direct read/write is enabled.',
      synced: {
        properties: 0,
        leads: 0,
        site_visits: 0,
        site_visit_feedback: 0,
        invoices: 0,
        owner_submissions: 0,
        home_faqs: 0,
        settings: 0
      },
      errors: []
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, errors: [err?.message || 'Failed to sync to Supabase'] });
  }
});

// --- PROPERTY OWNER SUBMISSIONS ---
// Public POST route for landlords/owners to submit listing
router.post('/owner-submissions', async (req, res) => {
  try {
    const {
      owner_name,
      owner_phone,
      owner_email,
      owner_type = 'OWNER',
      property_title,
      property_type = 'Apartment',
      bhk_config = '2 BHK',
      location,
      address,
      expected_rent,
      security_deposit,
      furnishing = 'Semi-Furnished',
      available_from,
      preferred_tenants = 'Any',
      amenities = [],
      images = [],
      notes
    } = req.body;

    if (!owner_name || !owner_phone || !property_title || !location) {
      return res.status(400).json({ error: 'Please provide name, phone, property title, and location' });
    }

    const result = await supabaseDb.createOwnerSubmission({
      owner_name,
      owner_phone,
      owner_email,
      owner_type,
      property_title,
      property_type,
      bhk_config,
      location,
      address,
      expected_rent,
      security_deposit,
      furnishing,
      available_from,
      preferred_tenants,
      amenities,
      images,
      notes
    });

    return res.status(201).json({
      id: result.id,
      message: 'Property listing submitted successfully! Our team will contact you shortly.'
    });
  } catch (err: any) {
    console.error('Error creating owner submission:', err);
    return res.status(500).json({ error: 'Failed to submit property listing' });
  }
});

// Admin/Staff GET all owner submissions
router.get('/owner-submissions', async (req, res) => {
  try {
    const submissions = await supabaseDb.getOwnerSubmissions();
    return res.json(submissions);
  } catch (err) {
    console.error('Error fetching owner submissions:', err);
    return res.status(500).json({ error: 'Failed to fetch owner submissions' });
  }
});

// Admin UPDATE submission status or notes
router.put('/owner-submissions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, admin_notes } = req.body;

    await supabaseDb.updateOwnerSubmission(id, { status, admin_notes });
    return res.json({ success: true, message: 'Submission updated' });
  } catch (err) {
    console.error('Error updating owner submission:', err);
    return res.status(500).json({ error: 'Failed to update submission' });
  }
});

// Admin DELETE owner submission
router.delete('/owner-submissions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await supabaseDb.deleteOwnerSubmission(id);
    return res.json({ success: true, message: 'Submission deleted' });
  } catch (err) {
    console.error('Error deleting owner submission:', err);
    return res.status(500).json({ error: 'Failed to delete submission' });
  }
});

// Admin BULK DELETE owner submissions
router.post('/owner-submissions/bulk-delete', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'No submission IDs provided for deletion.' });
    }

    const cleanIds = ids.map(id => Number(id)).filter(id => !isNaN(id) && id > 0);
    if (cleanIds.length === 0) {
      return res.status(400).json({ error: 'Invalid submission IDs provided.' });
    }

    await supabaseDb.bulkDeleteOwnerSubmissions(cleanIds);
    return res.json({ success: true, count: cleanIds.length, message: `${cleanIds.length} owner submissions deleted successfully.` });
  } catch (err) {
    console.error('Error bulk deleting owner submissions:', err);
    return res.status(500).json({ error: 'Failed to bulk delete owner submissions' });
  }
});

// Admin APPROVE & CONVERT submission directly to a PUBLISHED property!
router.post('/owner-submissions/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const submissions = await supabaseDb.getOwnerSubmissions();
    const sub = submissions.find(s => String(s.id) === String(id));
    
    if (!sub) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    let imagesArr: string[] = [];
    try {
      imagesArr = typeof sub.images === 'string' ? JSON.parse(sub.images) : (sub.images || []);
    } catch (e) {
      imagesArr = [];
    }

    if (imagesArr.length === 0) {
      imagesArr = ['https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80'];
    }

    let amenitiesArr: string[] = [];
    try {
      amenitiesArr = typeof sub.amenities === 'string' ? JSON.parse(sub.amenities) : (sub.amenities || []);
    } catch (e) {
      amenitiesArr = ['Power Backup', '24/7 Security', 'Covered Parking'];
    }

    const description = sub.notes 
      ? `${sub.notes} (Furnishing: ${sub.furnishing}, Preferred Tenants: ${sub.preferred_tenants})`
      : `${sub.bhk_config} ${sub.property_type} available for rent in ${sub.location}. ${sub.furnishing} residence with ${sub.preferred_tenants} preference.`;

    const prop = await supabaseDb.createProperty({
      title: sub.property_title,
      description,
      price: sub.expected_rent || 30000,
      type: sub.bhk_config,
      bedrooms: sub.bhk_config.includes('1') ? 1 : sub.bhk_config.includes('3') ? 3 : 2,
      bathrooms: sub.bhk_config.includes('1') ? 1 : sub.bhk_config.includes('3') ? 3 : 2,
      area: sub.bhk_config.includes('1') ? 800 : sub.bhk_config.includes('3') ? 1600 : 1200,
      location: sub.location,
      status: 'PUBLISHED',
      images: imagesArr,
      amenities: amenitiesArr
    });

    const newPropertyId = prop.id;

    // Update submission status
    await supabaseDb.updateOwnerSubmission(id, {
      status: 'APPROVED',
      admin_notes: `Converted to Published Property #${newPropertyId}`
    });

    return res.json({
      success: true,
      propertyId: newPropertyId,
      message: `Listing approved and published to website as Property #${newPropertyId}!`
    });
  } catch (err: any) {
    console.error('Error approving owner submission:', err);
    return res.status(500).json({ error: 'Failed to approve submission' });
  }
});

export default router;
