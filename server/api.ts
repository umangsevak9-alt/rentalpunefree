import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { db } from './db.js';
import { 
  getSupabase, 
  isSupabaseConnected, 
  getSupabaseConfig, 
  testSupabaseConnection, 
  syncAllDataToSupabase, 
  autoSyncRowToSupabase,
  autoDeleteFromSupabase,
  autoBulkDeleteFromSupabase,
  getAutoSyncStatus,
  SUPABASE_SCHEMA_SQL 
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
    const dbTest = await db.execute('SELECT 1 as alive');
    const latencyMs = Date.now() - start;

    const supabase = getSupabase();
    let supabaseStatus = { connected: false, message: 'Not configured' };
    if (supabase) {
      const test = await testSupabaseConnection();
      supabaseStatus = { connected: test.ok, message: test.message };
    }

    res.json({
      status: 'healthy',
      database: {
        engine: 'SQLite (LibSQL)',
        connected: dbTest.rows.length > 0,
        latencyMs,
      },
      autoSync: getAutoSyncStatus(),
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
    const [
      props, leads, visits, feedbacks, invoices, submissions, users, faqs, settings
    ] = await Promise.all([
      db.execute('SELECT COUNT(*) as count FROM properties'),
      db.execute('SELECT COUNT(*) as count FROM leads'),
      db.execute('SELECT COUNT(*) as count FROM site_visits'),
      db.execute('SELECT COUNT(*) as count FROM site_visit_feedback'),
      db.execute('SELECT COUNT(*) as count FROM invoices'),
      db.execute('SELECT COUNT(*) as count FROM owner_submissions'),
      db.execute('SELECT COUNT(*) as count FROM users'),
      db.execute('SELECT COUNT(*) as count FROM home_faqs'),
      db.execute('SELECT COUNT(*) as count FROM settings')
    ]);

    const supabaseTest = await testSupabaseConnection();
    const { url } = getSupabaseConfig();
    const autoSyncInfo = getAutoSyncStatus();

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      latencyMs: Date.now() - start,
      autoSync: {
        mode: 'Continuous 100% Automatic Synchronization',
        realtimeTrigger: 'Active on every Create/Update/Delete event',
        backgroundSyncInterval: 'Every 60 seconds',
        status: 'ACTIVE'
      },
      localDatabase: {
        engine: 'SQLite (LibSQL Persistent Storage)',
        status: 'CONNECTED & OPERATIONAL',
        tables: {
          properties: Number(props.rows[0]?.count || 0),
          leads: Number(leads.rows[0]?.count || 0),
          site_visits: Number(visits.rows[0]?.count || 0),
          site_visit_feedback: Number(feedbacks.rows[0]?.count || 0),
          invoices: Number(invoices.rows[0]?.count || 0),
          owner_submissions: Number(submissions.rows[0]?.count || 0),
          users: Number(users.rows[0]?.count || 0),
          home_faqs: Number(faqs.rows[0]?.count || 0),
          settings: Number(settings.rows[0]?.count || 0)
        }
      },
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
    const result = await db.execute({
      sql: 'SELECT * FROM users WHERE email = ?',
      args: [email]
    });
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    
    const isMatch = await bcrypt.compare(password, user.password as string);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Middleware to verify auth
const authenticate = async (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    // Verify that the user still exists in the database
    const userRes = await db.execute({
      sql: 'SELECT id, role, email FROM users WHERE id = ?',
      args: [decoded.id]
    });
    if (userRes.rows.length === 0) {
      return res.status(401).json({ error: 'User account has been deleted or deactivated.' });
    }
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

const requireAdmin = (req: any, res: any, next: any) => {
  if (req.user.role !== 'MAIN_ADMIN' && req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
};

router.get('/auth/me', authenticate, async (req: any, res: any) => {
  try {
    const result = await db.execute({
      sql: 'SELECT id, name, email, role, permissions FROM users WHERE id = ?',
      args: [req.user.id]
    });
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// --- SETTINGS (Public & Admin) ---
router.get('/settings', async (req, res) => {
  try {
    const result = await db.execute('SELECT * FROM settings');
    const settings = result.rows.reduce((acc: any, row: any) => {
      acc[row.key] = row.value;
      return acc;
    }, {});
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/settings', authenticate, requireAdmin, async (req, res) => {
  try {
    const updates = req.body; // e.g. { hero_heading: 'New Heading', phone: '123' }
    for (const [key, value] of Object.entries(updates)) {
      await db.execute({
        sql: 'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=?',
        args: [key, String(value), String(value)]
      });
      // Automatic background Supabase sync
      autoSyncRowToSupabase('settings', { key, value: String(value) }).catch(() => {});
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// --- UPLOAD HANDLERS (AUTO-WEBP FOR IMAGES & VIDEO SUPPORT) ---
router.post('/upload/image', authenticate, upload.single('file'), async (req: any, res: any) => {
  try {
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
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

    // Auto-convert to high quality WebP format (effort 4, quality 92 for lossless-like fidelity with reduced storage)
    const webpBuffer = await sharp(inputBuffer)
      .webp({ quality: 92, effort: 4 })
      .toBuffer();

    const cleanBaseName = path.parse(originalName).name.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30);
    const filename = `photo-${Date.now()}-${cleanBaseName}.webp`;
    const targetPath = path.join(uploadsDir, filename);

    await fs.promises.writeFile(targetPath, webpBuffer);

    const fileUrl = `/uploads/${filename}`;
    const savedBytes = originalSize > webpBuffer.length ? originalSize - webpBuffer.length : 0;
    const savedPercent = originalSize > 0 ? Math.round((savedBytes / originalSize) * 100) : 0;

    res.json({
      success: true,
      url: fileUrl,
      format: 'webp',
      filename,
      originalSize,
      compressedSize: webpBuffer.length,
      savedPercent: Math.max(0, savedPercent)
    });
  } catch (err: any) {
    console.error('Error uploading/converting image to WebP:', err);
    res.status(500).json({ error: 'Failed to process and convert image to WebP.' });
  }
});

router.post('/upload/video', authenticate, upload.single('file'), async (req: any, res: any) => {
  try {
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No video file provided.' });
    }

    const ext = path.extname(req.file.originalname) || '.mp4';
    const cleanBaseName = path.parse(req.file.originalname).name.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30);
    const filename = `video-${Date.now()}-${cleanBaseName}${ext}`;
    const targetPath = path.join(uploadsDir, filename);

    await fs.promises.writeFile(targetPath, req.file.buffer);

    res.json({
      success: true,
      url: `/uploads/${filename}`,
      filename,
      size: req.file.size
    });
  } catch (err: any) {
    console.error('Error uploading video:', err);
    res.status(500).json({ error: 'Failed to upload video.' });
  }
});

// --- PROPERTIES ---
router.get('/properties', async (req, res) => {
  try {
    const result = await db.execute('SELECT * FROM properties ORDER BY id DESC');
    res.json(result.rows.map(r => {
      let parsedImages: string[] = [];
      let parsedVideos: string[] = [];
      let parsedFaqs: any[] = [];
      try {
        parsedImages = r.images ? (typeof r.images === 'string' ? JSON.parse(r.images as string) : r.images) : [];
      } catch (e) {
        parsedImages = [];
      }
      try {
        parsedVideos = r.videos ? (typeof r.videos === 'string' ? JSON.parse(r.videos as string) : r.videos) : [];
      } catch (e) {
        parsedVideos = [];
      }
      try {
        parsedFaqs = r.faqs ? (typeof r.faqs === 'string' ? JSON.parse(r.faqs as string) : r.faqs) : [];
      } catch (e) {
        parsedFaqs = [];
      }
      return {
        ...r,
        images: Array.isArray(parsedImages) ? parsedImages.slice(0, 10) : [],
        videos: Array.isArray(parsedVideos) ? parsedVideos.slice(0, 4) : [],
        faqs: Array.isArray(parsedFaqs) ? parsedFaqs : []
      };
    }));
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/properties/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.execute({
      sql: 'SELECT * FROM properties WHERE id = ?',
      args: [id]
    });
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Property not found' });
    }
    const r = result.rows[0];
    let parsedImages: string[] = [];
    let parsedVideos: string[] = [];
    let parsedFaqs: any[] = [];
    try {
      parsedImages = r.images ? (typeof r.images === 'string' ? JSON.parse(r.images as string) : r.images) : [];
    } catch (e) {
      parsedImages = [];
    }
    try {
      parsedVideos = r.videos ? (typeof r.videos === 'string' ? JSON.parse(r.videos as string) : r.videos) : [];
    } catch (e) {
      parsedVideos = [];
    }
    try {
      parsedFaqs = r.faqs ? (typeof r.faqs === 'string' ? JSON.parse(r.faqs as string) : r.faqs) : [];
    } catch (e) {
      parsedFaqs = [];
    }
    res.json({
      ...r,
      images: Array.isArray(parsedImages) ? parsedImages.slice(0, 10) : [],
      videos: Array.isArray(parsedVideos) ? parsedVideos.slice(0, 4) : [],
      faqs: Array.isArray(parsedFaqs) ? parsedFaqs : []
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/properties', authenticate, requireAdmin, async (req, res) => {
  try {
    const { title, description, price, type, bedrooms, bathrooms, area, location, status, images, videos, faqs } = req.body;
    const cleanImages = (Array.isArray(images) ? images : []).slice(0, 10);
    const cleanVideos = (Array.isArray(videos) ? videos : []).slice(0, 4);
    const cleanFaqs = Array.isArray(faqs) ? faqs : [];
    const imagesJson = JSON.stringify(cleanImages);
    const videosJson = JSON.stringify(cleanVideos);
    const faqsJson = JSON.stringify(cleanFaqs);

    const result = await db.execute({
      sql: 'INSERT INTO properties (title, description, price, type, bedrooms, bathrooms, area, location, images, videos, faqs, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      args: [title, description, price ? Number(price) : null, type, bedrooms ? Number(bedrooms) : null, bathrooms ? Number(bathrooms) : null, area ? Number(area) : null, location, imagesJson, videosJson, faqsJson, status || 'PUBLISHED']
    });
    const newId = result.lastInsertRowid !== undefined ? Number(result.lastInsertRowid) : null;

    // Automatic real-time background Supabase sync
    if (newId) {
      autoSyncRowToSupabase('properties', {
        id: newId,
        title,
        description,
        price: price ? Number(price) : null,
        type,
        bedrooms: bedrooms ? Number(bedrooms) : null,
        bathrooms: bathrooms ? Number(bathrooms) : null,
        area: area ? Number(area) : null,
        location,
        status: status || 'PUBLISHED',
        images: imagesJson,
        videos: videosJson,
        faqs: faqsJson
      }).catch(() => {});
    }

    res.json({ id: newId, success: true });
  } catch (err) {
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
    const imagesJson = JSON.stringify(cleanImages);
    const videosJson = JSON.stringify(cleanVideos);
    const faqsJson = JSON.stringify(cleanFaqs);

    await db.execute({
      sql: `UPDATE properties 
            SET title = ?, description = ?, price = ?, type = ?, bedrooms = ?, bathrooms = ?, area = ?, location = ?, status = ?, images = ?, videos = ?, faqs = ?
            WHERE id = ?`,
      args: [title, description, price ? Number(price) : null, type, bedrooms ? Number(bedrooms) : null, bathrooms ? Number(bathrooms) : null, area ? Number(area) : null, location, status || 'PUBLISHED', imagesJson, videosJson, faqsJson, id]
    });

    // Automatic real-time Supabase sync
    autoSyncRowToSupabase('properties', {
      id: Number(id),
      title,
      description,
      price: price ? Number(price) : null,
      type,
      bedrooms: bedrooms ? Number(bedrooms) : null,
      bathrooms: bathrooms ? Number(bathrooms) : null,
      area: area ? Number(area) : null,
      location,
      status: status || 'PUBLISHED',
      images: imagesJson,
      videos: videosJson,
      faqs: faqsJson
    }).catch(() => {});

    res.json({ success: true });
  } catch (err) {
    console.error('Error updating property:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// --- HOME PAGE FAQS (Public & Admin) ---
router.get('/faqs', async (req, res) => {
  try {
    const result = await db.execute('SELECT * FROM home_faqs WHERE is_active = 1 ORDER BY sort_order ASC, id ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch FAQs' });
  }
});

router.get('/faqs/all', authenticate, requireAdmin, async (req, res) => {
  try {
    const result = await db.execute('SELECT * FROM home_faqs ORDER BY sort_order ASC, id ASC');
    res.json(result.rows);
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
    const result = await db.execute({
      sql: 'INSERT INTO home_faqs (question, answer, category, sort_order, is_active) VALUES (?, ?, ?, ?, ?)',
      args: [question, answer, category || 'General', Number(sort_order), is_active ? 1 : 0]
    });
    const newId = Number(result.lastInsertRowid);
    autoSyncRowToSupabase('home_faqs', {
      id: newId,
      question,
      answer,
      category: category || 'General',
      sort_order: Number(sort_order),
      is_active: is_active ? 1 : 0
    }).catch(() => {});

    res.json({ id: newId, success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create FAQ' });
  }
});

router.put('/faqs/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { question, answer, category, sort_order, is_active } = req.body;
    await db.execute({
      sql: `UPDATE home_faqs 
            SET question = COALESCE(?, question),
                answer = COALESCE(?, answer),
                category = COALESCE(?, category),
                sort_order = COALESCE(?, sort_order),
                is_active = COALESCE(?, is_active)
            WHERE id = ?`,
      args: [
        question !== undefined ? question : null,
        answer !== undefined ? answer : null,
        category !== undefined ? category : null,
        sort_order !== undefined ? Number(sort_order) : null,
        is_active !== undefined ? (is_active ? 1 : 0) : null,
        id
      ]
    });

    const updated = await db.execute({ sql: 'SELECT * FROM home_faqs WHERE id = ?', args: [id] });
    if (updated.rows[0]) {
      autoSyncRowToSupabase('home_faqs', updated.rows[0]).catch(() => {});
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update FAQ' });
  }
});

router.delete('/faqs/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await db.execute({
      sql: 'DELETE FROM home_faqs WHERE id = ?',
      args: [id]
    });
    autoDeleteFromSupabase('home_faqs', 'id', Number(id)).catch(() => {});
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete FAQ' });
  }
});

router.post('/faqs/reset-defaults', authenticate, requireAdmin, async (req, res) => {
  try {
    await db.execute('DELETE FROM home_faqs');
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

    for (const f of defaultHomeFaqs) {
      await db.execute({
        sql: 'INSERT INTO home_faqs (question, answer, category, sort_order, is_active) VALUES (?, ?, ?, ?, 1)',
        args: [f.question, f.answer, f.category, f.sort_order]
      });
    }

    const all = await db.execute('SELECT * FROM home_faqs ORDER BY sort_order ASC, id ASC');
    res.json({ success: true, count: all.rows.length, faqs: all.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reset FAQs' });
  }
});

router.delete('/properties/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Clean up dependent visits feedback
    await db.execute({
      sql: 'DELETE FROM site_visit_feedback WHERE visit_id IN (SELECT id FROM site_visits WHERE property_id = ?)',
      args: [id]
    });
    // Clean up site visits
    await db.execute({
      sql: 'DELETE FROM site_visits WHERE property_id = ?',
      args: [id]
    });
    // Unlink from leads
    await db.execute({
      sql: 'UPDATE leads SET property_id = NULL WHERE property_id = ?',
      args: [id]
    });
    // Delete invoices
    await db.execute({
      sql: 'DELETE FROM invoices WHERE property_id = ?',
      args: [id]
    });
    // Delete property
    await db.execute({
      sql: 'DELETE FROM properties WHERE id = ?',
      args: [id]
    });

    // Automatic Supabase sync
    autoDeleteFromSupabase('properties', 'id', Number(id)).catch(() => {});

    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting property:', err);
    res.status(500).json({ error: 'Server error' });
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

    const placeholders = cleanIds.map(() => '?').join(',');

    await db.execute({
      sql: `DELETE FROM site_visit_feedback WHERE visit_id IN (SELECT id FROM site_visits WHERE property_id IN (${placeholders}))`,
      args: cleanIds
    });
    await db.execute({
      sql: `DELETE FROM site_visits WHERE property_id IN (${placeholders})`,
      args: cleanIds
    });
    await db.execute({
      sql: `UPDATE leads SET property_id = NULL WHERE property_id IN (${placeholders})`,
      args: cleanIds
    });
    await db.execute({
      sql: `DELETE FROM invoices WHERE property_id IN (${placeholders})`,
      args: cleanIds
    });
    await db.execute({
      sql: `DELETE FROM properties WHERE id IN (${placeholders})`,
      args: cleanIds
    });

    // Automatic Supabase Bulk Delete
    autoBulkDeleteFromSupabase('properties', 'id', cleanIds).catch(() => {});

    res.json({ success: true, count: cleanIds.length, message: `${cleanIds.length} properties deleted successfully.` });
  } catch (err) {
    console.error('Error bulk deleting properties:', err);
    res.status(500).json({ error: 'Failed to bulk delete properties' });
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

    const result = await db.execute({
      sql: 'INSERT INTO leads (name, email, phone, notes, property_id, source) VALUES (?, ?, ?, ?, ?, ?)',
      args: [cleanName, cleanEmail, cleanPhone, cleanNotes, cleanPropertyId, 'Website']
    });
    
    const newId = result.lastInsertRowid !== undefined ? Number(result.lastInsertRowid) : 1;

    // Automatic real-time Supabase background sync
    autoSyncRowToSupabase('leads', {
      id: newId,
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      property_id: cleanPropertyId,
      notes: cleanNotes,
      status: 'New',
      source: 'Website'
    }).catch(() => {});

    return res.status(201).json({ 
      success: true, 
      id: newId, 
      message: 'Enquiry received. Our team will contact you in 2 hours.' 
    });
  } catch (err: any) {
    console.error('Lead submission error:', err);
    return res.status(500).json({ error: err?.message || 'Failed to submit enquiry.' });
  }
});

router.get('/leads', authenticate, requireAdmin, async (req, res) => {
  try {
    const result = await db.execute(`
      SELECT 
        l.*,
        p.title as property_title,
        u.name as assigned_agent_name
      FROM leads l
      LEFT JOIN properties p ON l.property_id = p.id
      LEFT JOIN users u ON l.assigned_agent_id = u.id
      ORDER BY l.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/leads/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, status, source, notes, assigned_agent_id, property_id } = req.body;

    await db.execute({
      sql: `UPDATE leads 
            SET name = ?, email = ?, phone = ?, status = ?, source = ?, notes = ?, assigned_agent_id = ?, property_id = ?
            WHERE id = ?`,
      args: [
        name, 
        email || null, 
        phone, 
        status || 'New', 
        source || 'Website', 
        notes || null, 
        assigned_agent_id ? Number(assigned_agent_id) : null, 
        property_id ? Number(property_id) : null, 
        id
      ]
    });

    // Automatic real-time Supabase sync
    autoSyncRowToSupabase('leads', {
      id: Number(id),
      name,
      email: email || null,
      phone,
      status: status || 'New',
      source: source || 'Website',
      notes: notes || null,
      assigned_agent_id: assigned_agent_id ? Number(assigned_agent_id) : null,
      property_id: property_id ? Number(property_id) : null
    }).catch(() => {});

    res.json({ success: true });
  } catch (err) {
    console.error('Error updating lead:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/leads/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Clean up dependent visits feedback
    await db.execute({
      sql: 'DELETE FROM site_visit_feedback WHERE visit_id IN (SELECT id FROM site_visits WHERE lead_id = ?)',
      args: [id]
    });
    // Clean up site visits
    await db.execute({
      sql: 'DELETE FROM site_visits WHERE lead_id = ?',
      args: [id]
    });
    // Clean up invoices
    await db.execute({
      sql: 'DELETE FROM invoices WHERE lead_id = ?',
      args: [id]
    });
    // Delete lead
    await db.execute({
      sql: 'DELETE FROM leads WHERE id = ?',
      args: [id]
    });

    // Automatic Supabase sync
    autoDeleteFromSupabase('leads', 'id', Number(id)).catch(() => {});

    res.json({ success: true, message: 'Lead deleted successfully' });
  } catch (err) {
    console.error('Error deleting lead:', err);
    res.status(500).json({ error: 'Server error' });
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

    const placeholders = cleanIds.map(() => '?').join(',');

    await db.execute({
      sql: `DELETE FROM site_visit_feedback WHERE visit_id IN (SELECT id FROM site_visits WHERE lead_id IN (${placeholders}))`,
      args: cleanIds
    });
    await db.execute({
      sql: `DELETE FROM site_visits WHERE lead_id IN (${placeholders})`,
      args: cleanIds
    });
    await db.execute({
      sql: `DELETE FROM invoices WHERE lead_id IN (${placeholders})`,
      args: cleanIds
    });
    await db.execute({
      sql: `DELETE FROM leads WHERE id IN (${placeholders})`,
      args: cleanIds
    });

    // Automatic Supabase bulk delete
    autoBulkDeleteFromSupabase('leads', 'id', cleanIds).catch(() => {});

    res.json({ success: true, count: cleanIds.length, message: `${cleanIds.length} leads deleted successfully.` });
  } catch (err) {
    console.error('Error bulk deleting leads:', err);
    res.status(500).json({ error: 'Failed to bulk delete leads' });
  }
});

// --- AGENTS (Users) ---
router.get('/agents', authenticate, requireAdmin, async (req, res) => {
  try {
    const result = await db.execute({
      sql: 'SELECT id, name, email, role, created_at FROM users WHERE role = ? ORDER BY id DESC',
      args: ['AGENT']
    });
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/agents', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required' });
    }

    // Check if email already exists
    const existing = await db.execute({
      sql: 'SELECT id FROM users WHERE email = ?',
      args: [email]
    });
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'An agent with this email address already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await db.execute({
      sql: 'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      args: [name, email, hashedPassword, 'AGENT']
    });
    const newId = result.lastInsertRowid !== undefined ? Number(result.lastInsertRowid) : 1;

    // Automatic Supabase sync
    autoSyncRowToSupabase('users', {
      id: newId,
      name,
      email,
      password: hashedPassword,
      role: 'AGENT'
    }).catch(() => {});

    res.json({ id: newId, success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/agents/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    if (password && password.trim()) {
      const hashedPassword = await bcrypt.hash(password.trim(), 10);
      await db.execute({
        sql: 'UPDATE users SET name = ?, email = ?, password = ? WHERE id = ?',
        args: [name, email, hashedPassword, id]
      });
      autoSyncRowToSupabase('users', { id: Number(id), name, email, password: hashedPassword, role: 'AGENT' }).catch(() => {});
    } else {
      await db.execute({
        sql: 'UPDATE users SET name = ?, email = ? WHERE id = ?',
        args: [name, email, id]
      });
      autoSyncRowToSupabase('users', { id: Number(id), name, email, role: 'AGENT' }).catch(() => {});
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error updating agent:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/agents/:id', authenticate, requireAdmin, async (req: any, res: any) => {
  try {
    const { id } = req.params;

    // Prevent self-deletion if logged in admin
    if (Number(req.user.id) === Number(id)) {
      return res.status(400).json({ error: 'You cannot delete your own account while logged in.' });
    }

    // Check if the agent exists
    const userCheck = await db.execute({
      sql: 'SELECT id, email, role FROM users WHERE id = ?',
      args: [id]
    });

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Safety: only allow deleting agent role unless specifically allowed
    if (userCheck.rows[0].role === 'MAIN_ADMIN') {
      return res.status(403).json({ error: 'Cannot delete Main Admin account.' });
    }

    // Unassign agent from leads so leads remain intact
    await db.execute({
      sql: 'UPDATE leads SET assigned_agent_id = NULL WHERE assigned_agent_id = ?',
      args: [id]
    });

    // Unassign agent from visits
    await db.execute({
      sql: 'UPDATE site_visits SET agent_id = NULL WHERE agent_id = ?',
      args: [id]
    });

    // DELETE from users table - completely removes agent credentials from DB
    await db.execute({
      sql: 'DELETE FROM users WHERE id = ?',
      args: [id]
    });

    // Automatic Supabase delete
    autoDeleteFromSupabase('users', 'id', Number(id)).catch(() => {});

    console.log(`Agent ID ${id} (${userCheck.rows[0].email}) deleted from database.`);

    res.json({ success: true, message: 'Agent deleted permanently from database.' });
  } catch (err) {
    console.error('Error deleting agent:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// --- SITE VISITS ---
router.get('/visits', authenticate, async (req: any, res: any) => {
  try {
    let sql = `
      SELECT 
        v.*, 
        l.name as lead_name, 
        l.phone as lead_phone, 
        l.email as lead_email, 
        p.title as property_title,
        p.location as property_location,
        u.name as agent_name,
        u.email as agent_email,
        f.id as feedback_id,
        f.interest_level,
        f.customer_feedback,
        f.requirements,
        f.budget,
        f.preferred_configuration,
        f.timeline,
        f.next_action,
        f.created_at as feedback_created_at
      FROM site_visits v 
      LEFT JOIN leads l ON v.lead_id = l.id 
      LEFT JOIN properties p ON v.property_id = p.id
      LEFT JOIN users u ON v.agent_id = u.id
      LEFT JOIN site_visit_feedback f ON f.visit_id = v.id
    `;
    let args: any[] = [];
    
    // If agent, only show their visits
    if (req.user.role === 'AGENT') {
      sql += ' WHERE v.agent_id = ?';
      args.push(req.user.id);
    }
    
    sql += ' ORDER BY v.visit_date DESC, v.visit_time DESC';
    
    const result = await db.execute({ sql, args });
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/visits', authenticate, requireAdmin, async (req, res) => {
  try {
    const { lead_id, property_id, agent_id, visit_date, visit_time, notes } = req.body;
    const result = await db.execute({
      sql: 'INSERT INTO site_visits (lead_id, property_id, agent_id, visit_date, visit_time, notes) VALUES (?, ?, ?, ?, ?, ?)',
      args: [lead_id, property_id, agent_id, visit_date, visit_time, notes]
    });
    const newId = result.lastInsertRowid !== undefined ? Number(result.lastInsertRowid) : 1;

    // Automatic Supabase sync
    autoSyncRowToSupabase('site_visits', {
      id: newId,
      lead_id: lead_id ? Number(lead_id) : null,
      property_id: property_id ? Number(property_id) : null,
      agent_id: agent_id ? Number(agent_id) : null,
      visit_date,
      visit_time,
      notes: notes || null,
      status: 'Scheduled'
    }).catch(() => {});

    res.json({ id: newId });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/visits/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { lead_id, property_id, agent_id, visit_date, visit_time, status, notes } = req.body;
    await db.execute({
      sql: `UPDATE site_visits 
            SET lead_id = ?, property_id = ?, agent_id = ?, visit_date = ?, visit_time = ?, status = ?, notes = ?
            WHERE id = ?`,
      args: [
        lead_id ? Number(lead_id) : null,
        property_id ? Number(property_id) : null,
        agent_id ? Number(agent_id) : null,
        visit_date,
        visit_time,
        status || 'Scheduled',
        notes || null,
        id
      ]
    });

    // Automatic Supabase sync
    autoSyncRowToSupabase('site_visits', {
      id: Number(id),
      lead_id: lead_id ? Number(lead_id) : null,
      property_id: property_id ? Number(property_id) : null,
      agent_id: agent_id ? Number(agent_id) : null,
      visit_date,
      visit_time,
      status: status || 'Scheduled',
      notes: notes || null
    }).catch(() => {});

    res.json({ success: true });
  } catch (err) {
    console.error('Error updating site visit:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/visits/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // First delete any linked site visit feedback
    await db.execute({
      sql: 'DELETE FROM site_visit_feedback WHERE visit_id = ?',
      args: [id]
    });

    // Delete the site visit
    await db.execute({
      sql: 'DELETE FROM site_visits WHERE id = ?',
      args: [id]
    });

    // Automatic Supabase sync
    autoDeleteFromSupabase('site_visits', 'id', Number(id)).catch(() => {});
    autoDeleteFromSupabase('site_visit_feedback', 'visit_id', Number(id)).catch(() => {});

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

    const placeholders = cleanIds.map(() => '?').join(',');

    // Delete feedback for these visits
    await db.execute({
      sql: `DELETE FROM site_visit_feedback WHERE visit_id IN (${placeholders})`,
      args: cleanIds
    });

    // Delete visits
    await db.execute({
      sql: `DELETE FROM site_visits WHERE id IN (${placeholders})`,
      args: cleanIds
    });

    // Automatic Supabase bulk delete
    autoBulkDeleteFromSupabase('site_visits', 'id', cleanIds).catch(() => {});
    autoBulkDeleteFromSupabase('site_visit_feedback', 'visit_id', cleanIds).catch(() => {});

    res.json({ success: true, count: cleanIds.length, message: `${cleanIds.length} site visits deleted successfully.` });
  } catch (err) {
    console.error('Error bulk deleting site visits:', err);
    res.status(500).json({ error: 'Failed to bulk delete site visits' });
  }
});

router.delete('/feedbacks/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await db.execute({
      sql: 'DELETE FROM site_visit_feedback WHERE id = ?',
      args: [id]
    });
    autoDeleteFromSupabase('site_visit_feedback', 'id', Number(id)).catch(() => {});
    res.json({ success: true, message: 'Feedback deleted successfully.' });
  } catch (err) {
    console.error('Error deleting feedback:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// --- AGENT FEEDBACK ---
router.get('/feedbacks', authenticate, async (req: any, res: any) => {
  try {
    let sql = `
      SELECT 
        f.*,
        v.visit_date,
        v.visit_time,
        v.status as visit_status,
        v.notes as visit_notes,
        l.name as lead_name,
        l.phone as lead_phone,
        l.email as lead_email,
        p.title as property_title,
        p.location as property_location,
        p.price as property_price,
        p.type as property_type,
        u.name as agent_name,
        u.email as agent_email
      FROM site_visit_feedback f
      JOIN site_visits v ON f.visit_id = v.id
      LEFT JOIN leads l ON v.lead_id = l.id
      LEFT JOIN properties p ON v.property_id = p.id
      LEFT JOIN users u ON v.agent_id = u.id
    `;
    let args: any[] = [];

    // If agent, only show their submitted feedbacks
    if (req.user.role === 'AGENT') {
      sql += ' WHERE v.agent_id = ?';
      args.push(req.user.id);
    }

    sql += ' ORDER BY f.created_at DESC';

    const result = await db.execute({ sql, args });
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching feedbacks:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/visits/:id/feedback', authenticate, async (req: any, res: any) => {
  try {
    const visitId = req.params.id;
    // Verify visit belongs to agent if agent
    if (req.user.role === 'AGENT') {
       const visit = await db.execute({sql: 'SELECT * FROM site_visits WHERE id = ? AND agent_id = ?', args: [visitId, req.user.id]});
       if (visit.rows.length === 0) return res.status(403).json({error: 'Forbidden'});
    }
    
    const { interest_level, customer_feedback, requirements, budget, preferred_configuration, timeline, next_action } = req.body;
    
    // Check if feedback already exists for this visit
    const existing = await db.execute({
      sql: 'SELECT id FROM site_visit_feedback WHERE visit_id = ?',
      args: [visitId]
    });

    if (existing.rows.length > 0) {
      await db.execute({
        sql: `UPDATE site_visit_feedback 
              SET interest_level = ?, customer_feedback = ?, requirements = ?, budget = ?, preferred_configuration = ?, timeline = ?, next_action = ?
              WHERE visit_id = ?`,
        args: [interest_level, customer_feedback, requirements, budget ? Number(budget) : null, preferred_configuration, timeline, next_action, visitId]
      });
      autoSyncRowToSupabase('site_visit_feedback', {
        visit_id: Number(visitId),
        interest_level,
        customer_feedback,
        requirements,
        budget: budget ? Number(budget) : null,
        preferred_configuration,
        timeline,
        next_action
      }).catch(() => {});
    } else {
      const fbRes = await db.execute({
        sql: `INSERT INTO site_visit_feedback (visit_id, interest_level, customer_feedback, requirements, budget, preferred_configuration, timeline, next_action) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [visitId, interest_level, customer_feedback, requirements, budget ? Number(budget) : null, preferred_configuration, timeline, next_action]
      });
      const newFbId = Number(fbRes.lastInsertRowid);
      autoSyncRowToSupabase('site_visit_feedback', {
        id: newFbId,
        visit_id: Number(visitId),
        interest_level,
        customer_feedback,
        requirements,
        budget: budget ? Number(budget) : null,
        preferred_configuration,
        timeline,
        next_action
      }).catch(() => {});
    }
    
    await db.execute({
      sql: 'UPDATE site_visits SET status = ? WHERE id = ?',
      args: ['Completed', visitId]
    });

    autoSyncRowToSupabase('site_visits', { id: Number(visitId), status: 'Completed' }).catch(() => {});
    
    res.json({ success: true });
  } catch (err) {
    console.error('Feedback submit error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// --- INVOICES API (IN RUPEES ₹) ---
router.get('/invoices', authenticate, async (req: any, res: any) => {
  try {
    const result = await db.execute(`
      SELECT 
        i.*,
        l.name as lead_name,
        l.email as lead_email,
        l.phone as lead_phone,
        p.title as property_title,
        p.location as property_location,
        p.price as property_price,
        p.type as property_type
      FROM invoices i
      LEFT JOIN leads l ON i.lead_id = l.id
      LEFT JOIN properties p ON i.property_id = p.id
      ORDER BY i.id DESC
    `);

    const formatted = result.rows.map(row => {
      let items = [];
      if (typeof row.items === 'string') {
        try {
          items = JSON.parse(row.items);
        } catch (e) {
          items = [];
        }
      } else if (Array.isArray(row.items)) {
        items = row.items;
      }
      return {
        ...row,
        items
      };
    });

    res.json(formatted);
  } catch (err) {
    console.error('Error fetching invoices:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/invoices/:id', authenticate, async (req: any, res: any) => {
  try {
    const id = req.params.id;
    const result = await db.execute({
      sql: `
        SELECT 
          i.*,
          l.name as lead_name,
          l.email as lead_email,
          l.phone as lead_phone,
          p.title as property_title,
          p.location as property_location,
          p.price as property_price
        FROM invoices i
        LEFT JOIN leads l ON i.lead_id = l.id
        LEFT JOIN properties p ON i.property_id = p.id
        WHERE i.id = ?
      `,
      args: [id]
    });

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const row = result.rows[0];
    let items = [];
    if (typeof row.items === 'string') {
      try {
        items = JSON.parse(row.items);
      } catch (e) {
        items = [];
      }
    } else if (Array.isArray(row.items)) {
      items = row.items;
    }

    res.json({
      ...row,
      items
    });
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
      const countRes = await db.execute('SELECT COUNT(*) as count FROM invoices');
      const nextNum = Number(countRes.rows[0].count) + 1;
      const year = new Date().getFullYear();
      finalInvoiceNumber = `INV-${year}-${String(nextNum).padStart(4, '0')}`;
    }

    const itemsJson = typeof items === 'string' ? items : JSON.stringify(items || []);
    const calcSubtotal = Number(subtotal) || 0;
    const calcTax = Number(tax) || 0;
    const calcDiscount = Number(discount) || 0;
    const calcTotal = Number(total) || (calcSubtotal + calcTax - calcDiscount);
    const calcPaid = Number(amount_paid) || 0;
    const calcBalance = balance_due !== undefined ? Number(balance_due) : Math.max(0, calcTotal - calcPaid);
    const finalStatus = status || (calcPaid >= calcTotal ? 'Paid' : calcPaid > 0 ? 'Partially Paid' : 'Pending');

    const result = await db.execute({
      sql: `INSERT INTO invoices (
        invoice_number, lead_id, property_id, client_name, client_email, client_phone, client_address,
        client_pan, client_gstin, items, subtotal, tax_type, tax_rate, tax, discount, total,
        amount_paid, balance_due, status, payment_mode, issue_date, due_date, notes, terms,
        bank_name, account_holder, account_number, ifsc_code, branch_name, account_type, upi_id, upi_qr_url, payment_instructions
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        finalInvoiceNumber,
        lead_id ? Number(lead_id) : null,
        property_id ? Number(property_id) : null,
        client_name || 'Client',
        client_email || '',
        client_phone || '',
        client_address || '',
        client_pan || '',
        client_gstin || '',
        itemsJson,
        calcSubtotal,
        tax_type || 'GST_18',
        Number(tax_rate) || 18,
        calcTax,
        calcDiscount,
        calcTotal,
        calcPaid,
        calcBalance,
        finalStatus,
        payment_mode || 'Bank Transfer / NEFT / RTGS',
        issue_date || new Date().toISOString().split('T')[0],
        due_date || new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
        notes || '',
        terms || '1. All payments must be made in Indian Rupees (INR ₹) via RTGS / NEFT / Cheque / UPI.\n2. Goods & Services Tax (GST) is levied as per Indian Real Estate Tax guidelines.\n3. Possession shall be handed over subject to realization of full payment.',
        bank_name || '',
        account_holder || '',
        account_number || '',
        ifsc_code || '',
        branch_name || '',
        account_type || '',
        upi_id || '',
        upi_qr_url || '',
        payment_instructions || ''
      ]
    });

    const newId = result.lastInsertRowid !== undefined ? Number(result.lastInsertRowid) : 1;

    // Automatic Supabase sync
    autoSyncRowToSupabase('invoices', {
      id: newId,
      invoice_number: finalInvoiceNumber,
      lead_id: lead_id ? Number(lead_id) : null,
      property_id: property_id ? Number(property_id) : null,
      client_name: client_name || 'Client',
      client_email: client_email || '',
      client_phone: client_phone || '',
      client_address: client_address || '',
      client_pan: client_pan || '',
      client_gstin: client_gstin || '',
      items: itemsJson,
      subtotal: calcSubtotal,
      tax_type: tax_type || 'GST_18',
      tax_rate: Number(tax_rate) || 18,
      tax: calcTax,
      discount: calcDiscount,
      total: calcTotal,
      amount_paid: calcPaid,
      balance_due: calcBalance,
      status: finalStatus,
      payment_mode: payment_mode || 'Bank Transfer / NEFT / RTGS',
      issue_date: issue_date || new Date().toISOString().split('T')[0],
      due_date: due_date || new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
      notes: notes || '',
      terms: terms || '',
      bank_name: bank_name || '',
      account_holder: account_holder || '',
      account_number: account_number || '',
      ifsc_code: ifsc_code || '',
      branch_name: branch_name || '',
      account_type: account_type || '',
      upi_id: upi_id || '',
      upi_qr_url: upi_qr_url || '',
      payment_instructions: payment_instructions || ''
    }).catch(() => {});

    res.json({ id: newId, invoice_number: finalInvoiceNumber, success: true });
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

    const itemsJson = typeof items === 'string' ? items : JSON.stringify(items || []);
    const calcSubtotal = Number(subtotal) || 0;
    const calcTax = Number(tax) || 0;
    const calcDiscount = Number(discount) || 0;
    const calcTotal = Number(total) || (calcSubtotal + calcTax - calcDiscount);
    const calcPaid = Number(amount_paid) || 0;
    const calcBalance = balance_due !== undefined ? Number(balance_due) : Math.max(0, calcTotal - calcPaid);

    await db.execute({
      sql: `UPDATE invoices SET 
        invoice_number = ?, lead_id = ?, property_id = ?, client_name = ?, client_email = ?, client_phone = ?,
        client_address = ?, client_pan = ?, client_gstin = ?, items = ?, subtotal = ?, tax_type = ?,
        tax_rate = ?, tax = ?, discount = ?, total = ?, amount_paid = ?, balance_due = ?,
        status = ?, payment_mode = ?, issue_date = ?, due_date = ?, notes = ?, terms = ?,
        bank_name = ?, account_holder = ?, account_number = ?, ifsc_code = ?, branch_name = ?,
        account_type = ?, upi_id = ?, upi_qr_url = ?, payment_instructions = ?
      WHERE id = ?`,
      args: [
        invoice_number,
        lead_id ? Number(lead_id) : null,
        property_id ? Number(property_id) : null,
        client_name,
        client_email || '',
        client_phone || '',
        client_address || '',
        client_pan || '',
        client_gstin || '',
        itemsJson,
        calcSubtotal,
        tax_type || 'GST_18',
        Number(tax_rate) || 18,
        calcTax,
        calcDiscount,
        calcTotal,
        calcPaid,
        calcBalance,
        status || 'Pending',
        payment_mode || 'Bank Transfer / NEFT / RTGS',
        issue_date,
        due_date,
        notes || '',
        terms || '',
        bank_name || '',
        account_holder || '',
        account_number || '',
        ifsc_code || '',
        branch_name || '',
        account_type || '',
        upi_id || '',
        upi_qr_url || '',
        payment_instructions || '',
        id
      ]
    });

    // Automatic Supabase sync
    autoSyncRowToSupabase('invoices', {
      id: Number(id),
      invoice_number,
      lead_id: lead_id ? Number(lead_id) : null,
      property_id: property_id ? Number(property_id) : null,
      client_name,
      client_email: client_email || '',
      client_phone: client_phone || '',
      client_address: client_address || '',
      client_pan: client_pan || '',
      client_gstin: client_gstin || '',
      items: itemsJson,
      subtotal: calcSubtotal,
      tax_type: tax_type || 'GST_18',
      tax_rate: Number(tax_rate) || 18,
      tax: calcTax,
      discount: calcDiscount,
      total: calcTotal,
      amount_paid: calcPaid,
      balance_due: calcBalance,
      status: status || 'Pending',
      payment_mode: payment_mode || 'Bank Transfer / NEFT / RTGS',
      issue_date,
      due_date,
      notes: notes || '',
      terms: terms || '',
      bank_name: bank_name || '',
      account_holder: account_holder || '',
      account_number: account_number || '',
      ifsc_code: ifsc_code || '',
      branch_name: branch_name || '',
      account_type: account_type || '',
      upi_id: upi_id || '',
      upi_qr_url: upi_qr_url || '',
      payment_instructions: payment_instructions || ''
    }).catch(() => {});

    res.json({ success: true });
  } catch (err) {
    console.error('Error updating invoice:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/invoices/:id', authenticate, requireAdmin, async (req: any, res: any) => {
  try {
    const id = req.params.id;
    await db.execute({
      sql: 'DELETE FROM invoices WHERE id = ?',
      args: [id]
    });
    autoDeleteFromSupabase('invoices', 'id', Number(id)).catch(() => {});
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

    const invRes = await db.execute({
      sql: 'SELECT total FROM invoices WHERE id = ?',
      args: [id]
    });

    if (invRes.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const total = Number(invRes.rows[0].total) || 0;
    const newPaid = Number(amount_paid) || 0;
    const newBalance = Math.max(0, total - newPaid);
    const newStatus = status || (newPaid >= total ? 'Paid' : newPaid > 0 ? 'Partially Paid' : 'Pending');

    await db.execute({
      sql: 'UPDATE invoices SET amount_paid = ?, balance_due = ?, status = ?, payment_mode = COALESCE(?, payment_mode) WHERE id = ?',
      args: [newPaid, newBalance, newStatus, payment_mode || null, id]
    });

    autoSyncRowToSupabase('invoices', {
      id: Number(id),
      amount_paid: newPaid,
      balance_due: newBalance,
      status: newStatus,
      payment_mode: payment_mode || null
    }).catch(() => {});

    res.json({ success: true, amount_paid: newPaid, balance_due: newBalance, status: newStatus });
  } catch (err) {
    console.error('Error updating invoice payment:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// --- DASHBOARD STATS ---
router.get('/dashboard/stats', authenticate, async (req: any, res: any) => {
  try {
    const [
      propTotal,
      propPublished,
      propSold,
      propDraft,
      propValueRes,
      propTypesRes,
      leadTotal,
      leadActive,
      leadConverted,
      leadNew,
      leadStagesRes,
      visitTotal,
      visitScheduled,
      visitCompleted,
      agentCount,
      feedbackCount,
      hotCount,
      warmCount,
      coldCount,
      avgBudgetRes,
      invoiceCountRes,
      invoicePaidCountRes,
      invoicePendingCountRes,
      invoiceSumsRes
    ] = await Promise.all([
      db.execute('SELECT COUNT(*) as count FROM properties'),
      db.execute("SELECT COUNT(*) as count FROM properties WHERE status = 'PUBLISHED'"),
      db.execute("SELECT COUNT(*) as count FROM properties WHERE status = 'SOLD'"),
      db.execute("SELECT COUNT(*) as count FROM properties WHERE status = 'DRAFT'"),
      db.execute("SELECT SUM(price) as total_val, SUM(CASE WHEN status = 'PUBLISHED' THEN price ELSE 0 END) as published_val FROM properties"),
      db.execute('SELECT type, COUNT(*) as count FROM properties GROUP BY type ORDER BY count DESC'),
      db.execute('SELECT COUNT(*) as count FROM leads'),
      db.execute("SELECT COUNT(*) as count FROM leads WHERE status NOT IN ('Lost', 'Converted')"),
      db.execute("SELECT COUNT(*) as count FROM leads WHERE status = 'Converted'"),
      db.execute("SELECT COUNT(*) as count FROM leads WHERE status = 'New'"),
      db.execute('SELECT status, COUNT(*) as count FROM leads GROUP BY status ORDER BY count DESC'),
      db.execute('SELECT COUNT(*) as count FROM site_visits'),
      db.execute("SELECT COUNT(*) as count FROM site_visits WHERE status = 'Scheduled'"),
      db.execute("SELECT COUNT(*) as count FROM site_visits WHERE status = 'Completed'"),
      db.execute("SELECT COUNT(*) as count FROM users WHERE role = 'AGENT'"),
      db.execute('SELECT COUNT(*) as count FROM site_visit_feedback'),
      db.execute("SELECT COUNT(*) as count FROM site_visit_feedback WHERE interest_level = 'Hot'"),
      db.execute("SELECT COUNT(*) as count FROM site_visit_feedback WHERE interest_level = 'Warm'"),
      db.execute("SELECT COUNT(*) as count FROM site_visit_feedback WHERE interest_level = 'Cold'"),
      db.execute('SELECT AVG(budget) as avg_budget FROM site_visit_feedback WHERE budget > 0'),
      db.execute('SELECT COUNT(*) as count FROM invoices'),
      db.execute("SELECT COUNT(*) as count FROM invoices WHERE status = 'Paid'"),
      db.execute("SELECT COUNT(*) as count FROM invoices WHERE status = 'Pending'"),
      db.execute('SELECT SUM(total) as total_invoiced, SUM(amount_paid) as total_collected, SUM(balance_due) as total_due FROM invoices')
    ]);

    const recentFeedbacks = await db.execute(`
      SELECT 
        f.*,
        v.visit_date,
        v.visit_time,
        l.name as lead_name,
        l.phone as lead_phone,
        p.title as property_title,
        u.name as agent_name
      FROM site_visit_feedback f
      JOIN site_visits v ON f.visit_id = v.id
      LEFT JOIN leads l ON v.lead_id = l.id
      LEFT JOIN properties p ON v.property_id = p.id
      LEFT JOIN users u ON v.agent_id = u.id
      ORDER BY f.created_at DESC
      LIMIT 6
    `);

    const recentLeads = await db.execute(`
      SELECT 
        l.id,
        l.name,
        l.phone,
        l.email,
        l.status,
        l.source,
        l.created_at,
        p.title as property_title,
        u.name as agent_name
      FROM leads l
      LEFT JOIN properties p ON l.property_id = p.id
      LEFT JOIN users u ON l.assigned_agent_id = u.id
      ORDER BY l.created_at DESC
      LIMIT 5
    `);

    const totalVal = Number(propValueRes.rows[0]?.total_val) || 0;
    const publishedVal = Number(propValueRes.rows[0]?.published_val) || 0;
    const avgBudget = Number(avgBudgetRes.rows[0]?.avg_budget) || 0;

    res.json({
      serverTime: new Date().toISOString(),
      properties: {
        total: Number(propTotal.rows[0]?.count) || 0,
        published: Number(propPublished.rows[0]?.count) || 0,
        sold: Number(propSold.rows[0]?.count) || 0,
        draft: Number(propDraft.rows[0]?.count) || 0,
        totalPortfolioValue: totalVal,
        publishedPortfolioValue: publishedVal,
        typeBreakdown: propTypesRes.rows || []
      },
      leads: {
        total: Number(leadTotal.rows[0]?.count) || 0,
        active: Number(leadActive.rows[0]?.count) || 0,
        converted: Number(leadConverted.rows[0]?.count) || 0,
        new: Number(leadNew.rows[0]?.count) || 0,
        stageBreakdown: leadStagesRes.rows || [],
        recent: recentLeads.rows || []
      },
      visits: {
        total: Number(visitTotal.rows[0]?.count) || 0,
        scheduled: Number(visitScheduled.rows[0]?.count) || 0,
        completed: Number(visitCompleted.rows[0]?.count) || 0
      },
      agents: {
        total: Number(agentCount.rows[0]?.count) || 0
      },
      feedbacks: {
        total: Number(feedbackCount.rows[0]?.count) || 0,
        hotLeads: Number(hotCount.rows[0]?.count) || 0,
        warmLeads: Number(warmCount.rows[0]?.count) || 0,
        coldLeads: Number(coldCount.rows[0]?.count) || 0,
        averageBudget: avgBudget,
        recent: recentFeedbacks.rows || []
      },
      invoices: {
        total: Number(invoiceCountRes.rows[0]?.count) || 0,
        paid: Number(invoicePaidCountRes.rows[0]?.count) || 0,
        pending: Number(invoicePendingCountRes.rows[0]?.count) || 0,
        totalInvoiced: Number(invoiceSumsRes.rows[0]?.total_invoiced) || 0,
        totalCollected: Number(invoiceSumsRes.rows[0]?.total_collected) || 0,
        totalDue: Number(invoiceSumsRes.rows[0]?.total_due) || 0
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
    const result = await syncAllDataToSupabase();
    return res.json(result);
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

    const amenitiesJson = typeof amenities === 'string' ? amenities : JSON.stringify(amenities);
    const imagesJson = typeof images === 'string' ? images : JSON.stringify(images);

    const result = await db.execute({
      sql: `INSERT INTO owner_submissions (
        owner_name, owner_phone, owner_email, owner_type, property_title, property_type,
        bhk_config, location, address, expected_rent, security_deposit, furnishing,
        available_from, preferred_tenants, amenities, images, notes, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
      args: [
        owner_name,
        owner_phone,
        owner_email || null,
        owner_type,
        property_title,
        property_type,
        bhk_config,
        location,
        address || null,
        expected_rent ? Number(expected_rent) : null,
        security_deposit ? Number(security_deposit) : null,
        furnishing,
        available_from || null,
        preferred_tenants,
        amenitiesJson,
        imagesJson,
        notes || null
      ]
    });

    const newId = Number(result.lastInsertRowid);

    // Also sync to Supabase if connected
    const supabase = getSupabase();
    if (supabase) {
      supabase.from('owner_submissions').insert([{
        id: newId,
        owner_name,
        owner_phone,
        owner_email: owner_email || null,
        owner_type,
        property_title,
        property_type,
        bhk_config,
        location,
        address: address || null,
        expected_rent: expected_rent ? Number(expected_rent) : null,
        security_deposit: security_deposit ? Number(security_deposit) : null,
        furnishing,
        available_from: available_from || null,
        preferred_tenants,
        amenities: amenitiesJson,
        images: imagesJson,
        notes: notes || null,
        status: 'PENDING'
      }]).then(() => {}, () => {});
    }

    return res.status(201).json({
      id: newId,
      message: 'Property listing submitted successfully! Our team will contact you shortly.'
    });
  } catch (err: any) {
    console.error('Error creating owner submission:', err);
    return res.status(500).json({ error: 'Failed to submit property listing' });
  }
});

// Admin GET all owner submissions
router.get('/owner-submissions', authenticate, requireAdmin, async (req, res) => {
  try {
    const submissions = await db.execute('SELECT * FROM owner_submissions ORDER BY created_at DESC');
    return res.json(submissions.rows || []);
  } catch (err) {
    console.error('Error fetching owner submissions:', err);
    return res.status(500).json({ error: 'Failed to fetch owner submissions' });
  }
});

// Admin UPDATE submission status or notes
router.put('/owner-submissions/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, admin_notes } = req.body;

    await db.execute({
      sql: 'UPDATE owner_submissions SET status = COALESCE(?, status), admin_notes = COALESCE(?, admin_notes) WHERE id = ?',
      args: [status || null, admin_notes || null, id]
    });

    const supabase = getSupabase();
    if (supabase) {
      const updateData: any = {};
      if (status) updateData.status = status;
      if (admin_notes !== undefined) updateData.admin_notes = admin_notes;
      supabase.from('owner_submissions').update(updateData).eq('id', id).then(() => {}, () => {});
    }

    return res.json({ success: true, message: 'Submission updated' });
  } catch (err) {
    console.error('Error updating owner submission:', err);
    return res.status(500).json({ error: 'Failed to update submission' });
  }
});

// Admin DELETE owner submission
router.delete('/owner-submissions/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await db.execute({ sql: 'DELETE FROM owner_submissions WHERE id = ?', args: [Number(id)] });

    const supabase = getSupabase();
    if (supabase) {
      supabase.from('owner_submissions').delete().eq('id', Number(id)).then(() => {}, () => {});
    }

    return res.json({ success: true, message: 'Submission deleted' });
  } catch (err) {
    console.error('Error deleting owner submission:', err);
    return res.status(500).json({ error: 'Failed to delete submission' });
  }
});

// Admin BULK DELETE owner submissions
router.post('/owner-submissions/bulk-delete', authenticate, requireAdmin, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'No submission IDs provided for deletion.' });
    }

    const cleanIds = ids.map(id => Number(id)).filter(id => !isNaN(id) && id > 0);
    if (cleanIds.length === 0) {
      return res.status(400).json({ error: 'Invalid submission IDs provided.' });
    }

    const placeholders = cleanIds.map(() => '?').join(',');
    await db.execute({
      sql: `DELETE FROM owner_submissions WHERE id IN (${placeholders})`,
      args: cleanIds
    });

    const supabase = getSupabase();
    if (supabase) {
      supabase.from('owner_submissions').delete().in('id', cleanIds).then(() => {}, () => {});
    }

    return res.json({ success: true, count: cleanIds.length, message: `${cleanIds.length} owner submissions deleted successfully.` });
  } catch (err) {
    console.error('Error bulk deleting owner submissions:', err);
    return res.status(500).json({ error: 'Failed to bulk delete owner submissions' });
  }
});

// Admin APPROVE & CONVERT submission directly to a PUBLISHED property!
router.post('/owner-submissions/:id/approve', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const subRes = await db.execute({ sql: 'SELECT * FROM owner_submissions WHERE id = ?', args: [Number(id)] });
    
    if (!subRes.rows || subRes.rows.length === 0) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    const sub: any = subRes.rows[0];

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

    const propResult = await db.execute({
      sql: `INSERT INTO properties (
        title, description, price, type, bedrooms, bathrooms, area, location, status, images, amenities
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PUBLISHED', ?, ?)`,
      args: [
        sub.property_title,
        description,
        sub.expected_rent || 30000,
        sub.bhk_config,
        sub.bhk_config.includes('1') ? 1 : sub.bhk_config.includes('3') ? 3 : 2,
        sub.bhk_config.includes('1') ? 1 : sub.bhk_config.includes('3') ? 3 : 2,
        sub.bhk_config.includes('1') ? 800 : sub.bhk_config.includes('3') ? 1600 : 1200,
        sub.location,
        JSON.stringify(imagesArr),
        JSON.stringify(amenitiesArr)
      ]
    });

    const newPropertyId = Number(propResult.lastInsertRowid);

    // Update submission status (using single quotes so SQLite treats APPROVED as string literal)
    await db.execute({
      sql: "UPDATE owner_submissions SET status = 'APPROVED', admin_notes = ? WHERE id = ?",
      args: [`Converted to Published Property #${newPropertyId}`, Number(id)]
    });

    const supabase = getSupabase();
    if (supabase) {
      supabase.from('owner_submissions').update({
        status: 'APPROVED',
        admin_notes: `Converted to Published Property #${newPropertyId}`
      }).eq('id', Number(id)).then(() => {}, () => {});

      supabase.from('properties').insert([{
        id: newPropertyId,
        title: sub.property_title,
        description,
        price: sub.expected_rent || 30000,
        type: sub.bhk_config,
        bedrooms: sub.bhk_config.includes('1') ? 1 : sub.bhk_config.includes('3') ? 3 : 2,
        bathrooms: sub.bhk_config.includes('1') ? 1 : sub.bhk_config.includes('3') ? 3 : 2,
        area: sub.bhk_config.includes('1') ? 800 : sub.bhk_config.includes('3') ? 1600 : 1200,
        location: sub.location,
        status: 'PUBLISHED',
        images: JSON.stringify(imagesArr),
        amenities: JSON.stringify(amenitiesArr)
      }]).then(() => {}, () => {});
    }

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
