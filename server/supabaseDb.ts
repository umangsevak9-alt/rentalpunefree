import { getSupabase } from './supabase.js';
import { db } from './db.js';

/**
 * Robust database layer that prioritizes Supabase directly as the source of truth,
 * with graceful fallback to local SQLite when Supabase is not active/available.
 */

// Helper to check if a value is stringified JSON and parse it
function safeParseJSON(val: any, fallback: any = []) {
  if (!val) return fallback;
  if (typeof val !== 'string') return val;
  try {
    return JSON.parse(val);
  } catch (e) {
    return fallback;
  }
}

export const supabaseDb = {
  // --- PROPERTIES ---
  async getProperties(): Promise<any[]> {
    const supabase = getSupabase();
    if (supabase) {
      const { data, error } = await supabase.from('properties').select('*').order('id', { ascending: false });
      if (!error && data) {
        return data.map(p => ({
          ...p,
          images: safeParseJSON(p.images, []),
          videos: safeParseJSON(p.videos, []),
          faqs: safeParseJSON(p.faqs, [])
        }));
      }
      console.warn('Supabase getProperties failed, falling back to SQLite:', error?.message);
    }

    const result = await db.execute('SELECT * FROM properties ORDER BY id DESC');
    return result.rows.map(r => ({
      ...r,
      images: safeParseJSON(r.images, []),
      videos: safeParseJSON(r.videos, []),
      faqs: safeParseJSON(r.faqs, [])
    }));
  },

  async getProperty(id: any): Promise<any | null> {
    const supabase = getSupabase();
    if (supabase) {
      const { data, error } = await supabase.from('properties').select('*').eq('id', id).maybeSingle();
      if (!error && data) {
        return {
          ...data,
          images: safeParseJSON(data.images, []),
          videos: safeParseJSON(data.videos, []),
          faqs: safeParseJSON(data.faqs, [])
        };
      }
    }

    const result = await db.execute({ sql: 'SELECT * FROM properties WHERE id = ?', args: [id] });
    if (result.rows.length === 0) return null;
    const r = result.rows[0];
    return {
      ...r,
      images: safeParseJSON(r.images, []),
      videos: safeParseJSON(r.videos, []),
      faqs: safeParseJSON(r.faqs, [])
    };
  },

  async createProperty(p: any): Promise<any> {
    const imagesStr = JSON.stringify(p.images || []);
    const videosStr = JSON.stringify(p.videos || []);
    const faqsStr = JSON.stringify(p.faqs || []);

    const supabase = getSupabase();
    if (supabase) {
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
      const { data, error } = await supabase.from('properties').insert([payload]).select().single();
      if (!error && data) {
        // Keep SQLite in sync too
        try {
          await db.execute({
            sql: 'INSERT INTO properties (id, title, description, price, type, bedrooms, bathrooms, area, location, status, images, videos, faqs) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            args: [data.id, p.title, p.description, p.price, p.type, p.bedrooms, p.bathrooms, p.area, p.location, p.status || 'PUBLISHED', imagesStr, videosStr, faqsStr]
          });
        } catch (err) {}
        return data;
      }
      console.warn('Supabase createProperty error:', error?.message);
    }

    const result = await db.execute({
      sql: 'INSERT INTO properties (title, description, price, type, bedrooms, bathrooms, area, location, status, images, videos, faqs) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      args: [p.title, p.description, p.price, p.type, p.bedrooms, p.bathrooms, p.area, p.location, p.status || 'PUBLISHED', imagesStr, videosStr, faqsStr]
    });
    return { id: Number(result.lastInsertRowid) };
  },

  async updateProperty(id: any, p: any): Promise<boolean> {
    const imagesStr = JSON.stringify(p.images || []);
    const videosStr = JSON.stringify(p.videos || []);
    const faqsStr = JSON.stringify(p.faqs || []);

    const supabase = getSupabase();
    if (supabase) {
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
      if (!error) {
        try {
          await db.execute({
            sql: 'UPDATE properties SET title=?, description=?, price=?, type=?, bedrooms=?, bathrooms=?, area=?, location=?, status=?, images=?, videos=?, faqs=? WHERE id=?',
            args: [p.title, p.description, p.price, p.type, p.bedrooms, p.bathrooms, p.area, p.location, p.status, imagesStr, videosStr, faqsStr, id]
          });
        } catch (err) {}
        return true;
      }
      console.warn('Supabase updateProperty error:', error?.message);
    }

    await db.execute({
      sql: 'UPDATE properties SET title=?, description=?, price=?, type=?, bedrooms=?, bathrooms=?, area=?, location=?, status=?, images=?, videos=?, faqs=? WHERE id=?',
      args: [p.title, p.description, p.price, p.type, p.bedrooms, p.bathrooms, p.area, p.location, p.status, imagesStr, videosStr, faqsStr, id]
    });
    return true;
  },

  async deleteProperty(id: any): Promise<boolean> {
    const supabase = getSupabase();
    if (supabase) {
      const { error } = await supabase.from('properties').delete().eq('id', id);
      if (!error) {
        try {
          await db.execute({ sql: 'DELETE FROM properties WHERE id = ?', args: [id] });
        } catch (err) {}
        return true;
      }
    }
    await db.execute({ sql: 'DELETE FROM properties WHERE id = ?', args: [id] });
    return true;
  },

  async bulkDeleteProperties(ids: any[]): Promise<boolean> {
    if (!ids || ids.length === 0) return true;
    const supabase = getSupabase();
    if (supabase) {
      const { error } = await supabase.from('properties').delete().in('id', ids);
      if (!error) {
        try {
          const sql = `DELETE FROM properties WHERE id IN (${ids.map(() => '?').join(',')})`;
          await db.execute({ sql, args: ids });
        } catch (err) {}
        return true;
      }
    }
    const sql = `DELETE FROM properties WHERE id IN (${ids.map(() => '?').join(',')})`;
    await db.execute({ sql, args: ids });
    return true;
  },

  // --- LEADS ---
  async getLeads(): Promise<any[]> {
    const supabase = getSupabase();
    if (supabase) {
      const { data, error } = await supabase.from('leads').select('*').order('id', { ascending: false });
      if (!error && data) return data;
    }
    const result = await db.execute('SELECT * FROM leads ORDER BY id DESC');
    return result.rows;
  },

  async createLead(l: any): Promise<any> {
    const supabase = getSupabase();
    if (supabase) {
      const payload = {
        name: l.name,
        email: l.email || '',
        phone: l.phone,
        status: l.status || 'New',
        source: l.source || 'Website',
        assigned_agent_id: l.assigned_agent_id ? Number(l.assigned_agent_id) : null,
        property_id: l.property_id ? Number(l.property_id) : null,
        notes: l.notes || ''
      };
      const { data, error } = await supabase.from('leads').insert([payload]).select().single();
      if (!error && data) {
        try {
          await db.execute({
            sql: 'INSERT INTO leads (id, name, email, phone, status, source, assigned_agent_id, property_id, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            args: [data.id, l.name, l.email || '', l.phone, l.status || 'New', l.source || 'Website', l.assigned_agent_id, l.property_id, l.notes || '']
          });
        } catch (err) {}
        return data;
      }
    }
    const result = await db.execute({
      sql: 'INSERT INTO leads (name, email, phone, status, source, assigned_agent_id, property_id, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      args: [l.name, l.email || '', l.phone, l.status || 'New', l.source || 'Website', l.assigned_agent_id, l.property_id, l.notes || '']
    });
    return { id: Number(result.lastInsertRowid) };
  },

  async updateLead(id: any, l: any): Promise<boolean> {
    const supabase = getSupabase();
    if (supabase) {
      const payload: any = {};
      if (l.name !== undefined) payload.name = l.name;
      if (l.email !== undefined) payload.email = l.email;
      if (l.phone !== undefined) payload.phone = l.phone;
      if (l.status !== undefined) payload.status = l.status;
      if (l.source !== undefined) payload.source = l.source;
      if (l.assigned_agent_id !== undefined) payload.assigned_agent_id = l.assigned_agent_id ? Number(l.assigned_agent_id) : null;
      if (l.property_id !== undefined) payload.property_id = l.property_id ? Number(l.property_id) : null;
      if (l.notes !== undefined) payload.notes = l.notes;

      const { error } = await supabase.from('leads').update(payload).eq('id', id);
      if (!error) {
        try {
          await db.execute({
            sql: 'UPDATE leads SET name=COALESCE(?, name), email=COALESCE(?, email), phone=COALESCE(?, phone), status=COALESCE(?, status), source=COALESCE(?, source), assigned_agent_id=COALESCE(?, assigned_agent_id), property_id=COALESCE(?, property_id), notes=COALESCE(?, notes) WHERE id=?',
            args: [l.name, l.email, l.phone, l.status, l.source, l.assigned_agent_id, l.property_id, l.notes, id]
          });
        } catch (err) {}
        return true;
      }
    }
    await db.execute({
      sql: 'UPDATE leads SET name=COALESCE(?, name), email=COALESCE(?, email), phone=COALESCE(?, phone), status=COALESCE(?, status), source=COALESCE(?, source), assigned_agent_id=COALESCE(?, assigned_agent_id), property_id=COALESCE(?, property_id), notes=COALESCE(?, notes) WHERE id=?',
      args: [l.name, l.email, l.phone, l.status, l.source, l.assigned_agent_id, l.property_id, l.notes, id]
    });
    return true;
  },

  async deleteLead(id: any): Promise<boolean> {
    const supabase = getSupabase();
    if (supabase) {
      const { error } = await supabase.from('leads').delete().eq('id', id);
      if (!error) {
        try {
          await db.execute({ sql: 'DELETE FROM leads WHERE id = ?', args: [id] });
        } catch (err) {}
        return true;
      }
    }
    await db.execute({ sql: 'DELETE FROM leads WHERE id = ?', args: [id] });
    return true;
  },

  async bulkDeleteLeads(ids: any[]): Promise<boolean> {
    if (!ids || ids.length === 0) return true;
    const supabase = getSupabase();
    if (supabase) {
      const { error } = await supabase.from('leads').delete().in('id', ids);
      if (!error) {
        try {
          const sql = `DELETE FROM leads WHERE id IN (${ids.map(() => '?').join(',')})`;
          await db.execute({ sql, args: ids });
        } catch (err) {}
        return true;
      }
    }
    const sql = `DELETE FROM leads WHERE id IN (${ids.map(() => '?').join(',')})`;
    await db.execute({ sql, args: ids });
    return true;
  },

  // --- SITE VISITS (JOINED WITH IN-MEMORY PROCESSOR FOR ROBUSTNESS) ---
  async getVisits(userRole?: string, userId?: any): Promise<any[]> {
    const supabase = getSupabase();
    let visits: any[] = [];
    let leads: any[] = [];
    let properties: any[] = [];
    let profiles: any[] = [];
    let feedback: any[] = [];

    if (supabase) {
      const [vRes, lRes, pRes, prRes, fRes] = await Promise.all([
        supabase.from('site_visits').select('*'),
        supabase.from('leads').select('*'),
        supabase.from('properties').select('*'),
        supabase.from('profiles').select('*'),
        supabase.from('site_visit_feedback').select('*')
      ]);

      if (!vRes.error) visits = vRes.data || [];
      if (!lRes.error) leads = lRes.data || [];
      if (!pRes.error) properties = pRes.data || [];
      if (!prRes.error) profiles = prRes.data || [];
      if (!fRes.error) feedback = fRes.data || [];
    }

    if (visits.length === 0) {
      // Fallback SQLite query
      try {
        const [vDb, lDb, pDb, uDb, fDb] = await Promise.all([
          db.execute('SELECT * FROM site_visits'),
          db.execute('SELECT id, name, phone, email FROM leads'),
          db.execute('SELECT id, title, location FROM properties'),
          db.execute('SELECT id, name, email FROM users'),
          db.execute('SELECT * FROM site_visit_feedback')
        ]);
        visits = vDb.rows || [];
        leads = lDb.rows || [];
        properties = pDb.rows || [];
        profiles = uDb.rows || [];
        feedback = fDb.rows || [];
      } catch (err) {
        console.error('SQLite visit join load error:', err);
      }
    }

    // Filter by agent if role is AGENT
    if (userRole === 'AGENT' && userId) {
      const cleanUserId = String(userId);
      visits = visits.filter(v => String(v.agent_id) === cleanUserId);
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
    const supabase = getSupabase();
    if (supabase) {
      const payload = {
        lead_id: v.lead_id ? Number(v.lead_id) : null,
        property_id: v.property_id ? Number(v.property_id) : null,
        agent_id: v.agent_id ? Number(v.agent_id) : null,
        visit_date: v.visit_date,
        visit_time: v.visit_time,
        notes: v.notes || '',
        status: v.status || 'Scheduled'
      };
      const { data, error } = await supabase.from('site_visits').insert([payload]).select().single();
      if (!error && data) {
        try {
          await db.execute({
            sql: 'INSERT INTO site_visits (id, lead_id, property_id, agent_id, visit_date, visit_time, notes, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            args: [data.id, v.lead_id, v.property_id, v.agent_id, v.visit_date, v.visit_time, v.notes || '', v.status || 'Scheduled']
          });
        } catch (err) {}
        return data;
      }
    }
    const result = await db.execute({
      sql: 'INSERT INTO site_visits (lead_id, property_id, agent_id, visit_date, visit_time, notes, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      args: [v.lead_id, v.property_id, v.agent_id, v.visit_date, v.visit_time, v.notes || '', v.status || 'Scheduled']
    });
    return { id: Number(result.lastInsertRowid) };
  },

  async updateVisit(id: any, v: any): Promise<boolean> {
    const supabase = getSupabase();
    if (supabase) {
      const payload: any = {};
      if (v.lead_id !== undefined) payload.lead_id = v.lead_id ? Number(v.lead_id) : null;
      if (v.property_id !== undefined) payload.property_id = v.property_id ? Number(v.property_id) : null;
      if (v.agent_id !== undefined) payload.agent_id = v.agent_id ? Number(v.agent_id) : null;
      if (v.visit_date !== undefined) payload.visit_date = v.visit_date;
      if (v.visit_time !== undefined) payload.visit_time = v.visit_time;
      if (v.status !== undefined) payload.status = v.status;
      if (v.notes !== undefined) payload.notes = v.notes;

      const { error } = await supabase.from('site_visits').update(payload).eq('id', id);
      if (!error) {
        try {
          await db.execute({
            sql: 'UPDATE site_visits SET lead_id=COALESCE(?, lead_id), property_id=COALESCE(?, property_id), agent_id=COALESCE(?, agent_id), visit_date=COALESCE(?, visit_date), visit_time=COALESCE(?, visit_time), status=COALESCE(?, status), notes=COALESCE(?, notes) WHERE id=?',
            args: [v.lead_id, v.property_id, v.agent_id, v.visit_date, v.visit_time, v.status, v.notes, id]
          });
        } catch (err) {}
        return true;
      }
    }
    await db.execute({
      sql: 'UPDATE site_visits SET lead_id=COALESCE(?, lead_id), property_id=COALESCE(?, property_id), agent_id=COALESCE(?, agent_id), visit_date=COALESCE(?, visit_date), visit_time=COALESCE(?, visit_time), status=COALESCE(?, status), notes=COALESCE(?, notes) WHERE id=?',
      args: [v.lead_id, v.property_id, v.agent_id, v.visit_date, v.visit_time, v.status, v.notes, id]
    });
    return true;
  },

  async deleteVisit(id: any): Promise<boolean> {
    const supabase = getSupabase();
    if (supabase) {
      const { error } = await supabase.from('site_visits').delete().eq('id', id);
      if (!error) {
        try {
          await db.execute({ sql: 'DELETE FROM site_visits WHERE id = ?', args: [id] });
        } catch (err) {}
        return true;
      }
    }
    await db.execute({ sql: 'DELETE FROM site_visits WHERE id = ?', args: [id] });
    return true;
  },

  async bulkDeleteVisits(ids: any[]): Promise<boolean> {
    if (!ids || ids.length === 0) return true;
    const supabase = getSupabase();
    if (supabase) {
      const { error } = await supabase.from('site_visits').delete().in('id', ids);
      if (!error) {
        try {
          const sql = `DELETE FROM site_visits WHERE id IN (${ids.map(() => '?').join(',')})`;
          await db.execute({ sql, args: ids });
        } catch (err) {}
        return true;
      }
    }
    const sql = `DELETE FROM site_visits WHERE id IN (${ids.map(() => '?').join(',')})`;
    await db.execute({ sql, args: ids });
    return true;
  },

  // --- SITE VISIT FEEDBACK ---
  async getFeedbacks(userRole?: string, userId?: any): Promise<any[]> {
    const supabase = getSupabase();
    let feedbacks: any[] = [];
    let visits: any[] = [];
    let leads: any[] = [];
    let properties: any[] = [];
    let profiles: any[] = [];

    if (supabase) {
      const [fRes, vRes, lRes, pRes, prRes] = await Promise.all([
        supabase.from('site_visit_feedback').select('*'),
        supabase.from('site_visits').select('*'),
        supabase.from('leads').select('*'),
        supabase.from('properties').select('*'),
        supabase.from('profiles').select('*')
      ]);

      if (!fRes.error) feedbacks = fRes.data || [];
      if (!vRes.error) visits = vRes.data || [];
      if (!lRes.error) leads = lRes.data || [];
      if (!pRes.error) properties = pRes.data || [];
      if (!prRes.error) profiles = prRes.data || [];
    }

    if (feedbacks.length === 0) {
      try {
        const [fDb, vDb, lDb, pDb, uDb] = await Promise.all([
          db.execute('SELECT * FROM site_visit_feedback'),
          db.execute('SELECT * FROM site_visits'),
          db.execute('SELECT id, name, phone, email FROM leads'),
          db.execute('SELECT id, title, location, price, type FROM properties'),
          db.execute('SELECT id, name, email FROM users')
        ]);
        feedbacks = fDb.rows || [];
        visits = vDb.rows || [];
        leads = lDb.rows || [];
        properties = pDb.rows || [];
        profiles = uDb.rows || [];
      } catch (err) {
        console.error('SQLite feedback join load error:', err);
      }
    }

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
    const photosStr = JSON.stringify(f.photos || []);
    const supabase = getSupabase();
    if (supabase) {
      const payload = {
        visit_id: Number(f.visit_id),
        interest_level: f.interest_level,
        customer_feedback: f.customer_feedback,
        requirements: f.requirements,
        budget: f.budget ? Number(f.budget) : null,
        preferred_configuration: f.preferred_configuration,
        timeline: f.timeline,
        next_action: f.next_action,
        photos: photosStr
      };
      const { data, error } = await supabase.from('site_visit_feedback').insert([payload]).select().single();
      if (!error && data) {
        try {
          await db.execute({
            sql: 'INSERT INTO site_visit_feedback (id, visit_id, interest_level, customer_feedback, requirements, budget, preferred_configuration, timeline, next_action, photos) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            args: [data.id, f.visit_id, f.interest_level, f.customer_feedback, f.requirements, f.budget, f.preferred_configuration, f.timeline, f.next_action, photosStr]
          });
          // Also set visit status to 'Completed'
          await this.updateVisit(f.visit_id, { status: 'Completed' });
        } catch (err) {}
        return data;
      }
    }
    const result = await db.execute({
      sql: 'INSERT INTO site_visit_feedback (visit_id, interest_level, customer_feedback, requirements, budget, preferred_configuration, timeline, next_action, photos) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      args: [f.visit_id, f.interest_level, f.customer_feedback, f.requirements, f.budget, f.preferred_configuration, f.timeline, f.next_action, photosStr]
    });
    await this.updateVisit(f.visit_id, { status: 'Completed' });
    return { id: Number(result.lastInsertRowid) };
  },

  async deleteFeedback(id: any): Promise<boolean> {
    const supabase = getSupabase();
    if (supabase) {
      const { error } = await supabase.from('site_visit_feedback').delete().eq('id', id);
      if (!error) {
        try {
          await db.execute({ sql: 'DELETE FROM site_visit_feedback WHERE id = ?', args: [id] });
        } catch (err) {}
        return true;
      }
    }
    await db.execute({ sql: 'DELETE FROM site_visit_feedback WHERE id = ?', args: [id] });
    return true;
  },

  // --- INVOICES ---
  async getInvoices(): Promise<any[]> {
    const supabase = getSupabase();
    if (supabase) {
      const { data, error } = await supabase.from('invoices').select('*').order('id', { ascending: false });
      if (!error && data) {
        return data.map(inv => ({
          ...inv,
          items: safeParseJSON(inv.items, [])
        }));
      }
    }
    const result = await db.execute('SELECT * FROM invoices ORDER BY id DESC');
    return result.rows.map(r => ({
      ...r,
      items: safeParseJSON(r.items, [])
    }));
  },

  async getInvoice(id: any): Promise<any | null> {
    const supabase = getSupabase();
    if (supabase) {
      const { data, error } = await supabase.from('invoices').select('*').eq('id', id).maybeSingle();
      if (!error && data) {
        return {
          ...data,
          items: safeParseJSON(data.items, [])
        };
      }
    }
    const result = await db.execute({ sql: 'SELECT * FROM invoices WHERE id = ?', args: [id] });
    if (result.rows.length === 0) return null;
    const r = result.rows[0];
    return {
      ...r,
      items: safeParseJSON(r.items, [])
    };
  },

  async createInvoice(i: any): Promise<any> {
    const itemsStr = JSON.stringify(i.items || []);
    const supabase = getSupabase();
    if (supabase) {
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
        items: itemsStr,
        subtotal: i.subtotal ? Number(i.subtotal) : null,
        tax_type: i.tax_type || 'GST_18',
        tax_rate: i.tax_rate ? Number(i.tax_rate) : 18,
        tax: i.tax ? Number(i.tax) : null,
        discount: i.discount ? Number(i.discount) : 0,
        total: i.total ? Number(i.total) : null,
        amount_paid: i.amount_paid ? Number(i.amount_paid) : 0,
        balance_due: i.balance_due ? Number(i.balance_due) : null,
        status: i.status || 'Pending',
        payment_mode: i.payment_mode || 'Bank Transfer / NEFT / RTGS',
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

      const { data, error } = await supabase.from('invoices').insert([payload]).select().single();
      if (!error && data) {
        try {
          await db.execute({
            sql: `INSERT INTO invoices (id, invoice_number, lead_id, property_id, client_name, client_email, client_phone, client_address, client_pan, client_gstin, items, subtotal, tax_type, tax_rate, tax, discount, total, amount_paid, balance_due, status, payment_mode, issue_date, due_date, terms, bank_name, account_holder, account_number, ifsc_code, branch_name, account_type, upi_id, upi_qr_url, payment_instructions, notes) 
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [data.id, i.invoice_number, i.lead_id, i.property_id, i.client_name, i.client_email, i.client_phone, i.client_address, i.client_pan, i.client_gstin, itemsStr, i.subtotal, i.tax_type, i.tax_rate, i.tax, i.discount, i.total, i.amount_paid, i.balance_due, i.status || 'Pending', i.payment_mode, i.issue_date, i.due_date, i.terms, i.bank_name, i.account_holder, i.account_number, i.ifsc_code, i.branch_name, i.account_type, i.upi_id, i.upi_qr_url, i.payment_instructions, i.notes]
          });
        } catch (err) {}
        return data;
      }
    }
    const result = await db.execute({
      sql: `INSERT INTO invoices (invoice_number, lead_id, property_id, client_name, client_email, client_phone, client_address, client_pan, client_gstin, items, subtotal, tax_type, tax_rate, tax, discount, total, amount_paid, balance_due, status, payment_mode, issue_date, due_date, terms, bank_name, account_holder, account_number, ifsc_code, branch_name, account_type, upi_id, upi_qr_url, payment_instructions, notes) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [i.invoice_number, i.lead_id, i.property_id, i.client_name, i.client_email, i.client_phone, i.client_address, i.client_pan, i.client_gstin, itemsStr, i.subtotal, i.tax_type, i.tax_rate, i.tax, i.discount, i.total, i.amount_paid, i.balance_due, i.status || 'Pending', i.payment_mode, i.issue_date, i.due_date, i.terms, i.bank_name, i.account_holder, i.account_number, i.ifsc_code, i.branch_name, i.account_type, i.upi_id, i.upi_qr_url, i.payment_instructions, i.notes]
    });
    return { id: Number(result.lastInsertRowid) };
  },

  async updateInvoice(id: any, i: any): Promise<boolean> {
    const itemsStr = JSON.stringify(i.items || []);
    const supabase = getSupabase();
    if (supabase) {
      const payload = {
        lead_id: i.lead_id ? Number(i.lead_id) : null,
        property_id: i.property_id ? Number(i.property_id) : null,
        client_name: i.client_name,
        client_email: i.client_email,
        client_phone: i.client_phone,
        client_address: i.client_address,
        client_pan: i.client_pan,
        client_gstin: i.client_gstin,
        items: itemsStr,
        subtotal: i.subtotal ? Number(i.subtotal) : null,
        tax_type: i.tax_type,
        tax_rate: i.tax_rate ? Number(i.tax_rate) : 18,
        tax: i.tax ? Number(i.tax) : null,
        discount: i.discount ? Number(i.discount) : 0,
        total: i.total ? Number(i.total) : null,
        amount_paid: i.amount_paid ? Number(i.amount_paid) : 0,
        balance_due: i.balance_due ? Number(i.balance_due) : null,
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

      const { error } = await supabase.from('invoices').update(payload).eq('id', id);
      if (!error) {
        try {
          await db.execute({
            sql: `UPDATE invoices 
                  SET lead_id=?, property_id=?, client_name=?, client_email=?, client_phone=?, client_address=?, client_pan=?, client_gstin=?, items=?, subtotal=?, tax_type=?, tax_rate=?, tax=?, discount=?, total=?, amount_paid=?, balance_due=?, status=?, payment_mode=?, issue_date=?, due_date=?, terms=?, bank_name=?, account_holder=?, account_number=?, ifsc_code=?, branch_name=?, account_type=?, upi_id=?, upi_qr_url=?, payment_instructions=?, notes=? 
                  WHERE id=?`,
            args: [i.lead_id, i.property_id, i.client_name, i.client_email, i.client_phone, i.client_address, i.client_pan, i.client_gstin, itemsStr, i.subtotal, i.tax_type, i.tax_rate, i.tax, i.discount, i.total, i.amount_paid, i.balance_due, i.status, i.payment_mode, i.issue_date, i.due_date, i.terms, i.bank_name, i.account_holder, i.account_number, i.ifsc_code, i.branch_name, i.account_type, i.upi_id, i.upi_qr_url, i.payment_instructions, i.notes, id]
          });
        } catch (err) {}
        return true;
      }
    }
    await db.execute({
      sql: `UPDATE invoices 
            SET lead_id=?, property_id=?, client_name=?, client_email=?, client_phone=?, client_address=?, client_pan=?, client_gstin=?, items=?, subtotal=?, tax_type=?, tax_rate=?, tax=?, discount=?, total=?, amount_paid=?, balance_due=?, status=?, payment_mode=?, issue_date=?, due_date=?, terms=?, bank_name=?, account_holder=?, account_number=?, ifsc_code=?, branch_name=?, account_type=?, upi_id=?, upi_qr_url=?, payment_instructions=?, notes=? 
            WHERE id=?`,
      args: [i.lead_id, i.property_id, i.client_name, i.client_email, i.client_phone, i.client_address, i.client_pan, i.client_gstin, itemsStr, i.subtotal, i.tax_type, i.tax_rate, i.tax, i.discount, i.total, i.amount_paid, i.balance_due, i.status, i.payment_mode, i.issue_date, i.due_date, i.terms, i.bank_name, i.account_holder, i.account_number, i.ifsc_code, i.branch_name, i.account_type, i.upi_id, i.upi_qr_url, i.payment_instructions, i.notes, id]
    });
    return true;
  },

  async deleteInvoice(id: any): Promise<boolean> {
    const supabase = getSupabase();
    if (supabase) {
      const { error } = await supabase.from('invoices').delete().eq('id', id);
      if (!error) {
        try {
          await db.execute({ sql: 'DELETE FROM invoices WHERE id = ?', args: [id] });
        } catch (err) {}
        return true;
      }
    }
    await db.execute({ sql: 'DELETE FROM invoices WHERE id = ?', args: [id] });
    return true;
  },

  // --- SETTINGS ---
  async getSettings(): Promise<Record<string, string>> {
    const supabase = getSupabase();
    if (supabase) {
      const { data, error } = await supabase.from('settings').select('*');
      if (!error && data && data.length > 0) {
        return data.reduce((acc: any, row: any) => {
          acc[row.key] = row.value;
          return acc;
        }, {});
      }
    }
    const result = await db.execute('SELECT * FROM settings');
    return result.rows.reduce((acc: any, row: any) => {
      acc[row.key] = row.value;
      return acc;
    }, {});
  },

  async updateSettings(updates: Record<string, string>): Promise<boolean> {
    const supabase = getSupabase();
    for (const [key, value] of Object.entries(updates)) {
      if (supabase) {
        await supabase.from('settings').upsert([{ key, value: String(value) }]);
      }
      try {
        await db.execute({
          sql: 'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=?',
          args: [key, String(value), String(value)]
        });
      } catch (err) {}
    }
    return true;
  },

  // --- FAQs ---
  async getFaqs(): Promise<any[]> {
    const supabase = getSupabase();
    if (supabase) {
      const { data, error } = await supabase.from('home_faqs').select('*').eq('is_active', 1).order('sort_order', { ascending: true }).order('id', { ascending: true });
      if (!error && data) return data;
    }
    const result = await db.execute('SELECT * FROM home_faqs WHERE is_active = 1 ORDER BY sort_order ASC, id ASC');
    return result.rows;
  },

  async getFaqsAll(): Promise<any[]> {
    const supabase = getSupabase();
    if (supabase) {
      const { data, error } = await supabase.from('home_faqs').select('*').order('sort_order', { ascending: true }).order('id', { ascending: true });
      if (!error && data) return data;
    }
    const result = await db.execute('SELECT * FROM home_faqs ORDER BY sort_order ASC, id ASC');
    return result.rows;
  },

  async createFaq(f: any): Promise<any> {
    const supabase = getSupabase();
    if (supabase) {
      const payload = {
        question: f.question,
        answer: f.answer,
        category: f.category || 'General',
        sort_order: f.sort_order ? Number(f.sort_order) : 0,
        is_active: f.is_active ? 1 : 0
      };
      const { data, error } = await supabase.from('home_faqs').insert([payload]).select().single();
      if (!error && data) {
        try {
          await db.execute({
            sql: 'INSERT INTO home_faqs (id, question, answer, category, sort_order, is_active) VALUES (?, ?, ?, ?, ?, ?)',
            args: [data.id, f.question, f.answer, f.category || 'General', f.sort_order, f.is_active ? 1 : 0]
          });
        } catch (err) {}
        return data;
      }
    }
    const result = await db.execute({
      sql: 'INSERT INTO home_faqs (question, answer, category, sort_order, is_active) VALUES (?, ?, ?, ?, ?)',
      args: [f.question, f.answer, f.category || 'General', f.sort_order, f.is_active ? 1 : 0]
    });
    return { id: Number(result.lastInsertRowid) };
  },

  async updateFaq(id: any, f: any): Promise<boolean> {
    const supabase = getSupabase();
    if (supabase) {
      const payload: any = {};
      if (f.question !== undefined) payload.question = f.question;
      if (f.answer !== undefined) payload.answer = f.answer;
      if (f.category !== undefined) payload.category = f.category;
      if (f.sort_order !== undefined) payload.sort_order = Number(f.sort_order);
      if (f.is_active !== undefined) payload.is_active = f.is_active ? 1 : 0;

      const { error } = await supabase.from('home_faqs').update(payload).eq('id', id);
      if (!error) {
        try {
          await db.execute({
            sql: 'UPDATE home_faqs SET question=COALESCE(?, question), answer=COALESCE(?, answer), category=COALESCE(?, category), sort_order=COALESCE(?, sort_order), is_active=COALESCE(?, is_active) WHERE id=?',
            args: [f.question, f.answer, f.category, f.sort_order, f.is_active !== undefined ? (f.is_active ? 1 : 0) : null, id]
          });
        } catch (err) {}
        return true;
      }
    }
    await db.execute({
      sql: 'UPDATE home_faqs SET question=COALESCE(?, question), answer=COALESCE(?, answer), category=COALESCE(?, category), sort_order=COALESCE(?, sort_order), is_active=COALESCE(?, is_active) WHERE id=?',
      args: [f.question, f.answer, f.category, f.sort_order, f.is_active !== undefined ? (f.is_active ? 1 : 0) : null, id]
    });
    return true;
  },

  async deleteFaq(id: any): Promise<boolean> {
    const supabase = getSupabase();
    if (supabase) {
      const { error } = await supabase.from('home_faqs').delete().eq('id', id);
      if (!error) {
        try {
          await db.execute({ sql: 'DELETE FROM home_faqs WHERE id = ?', args: [id] });
        } catch (err) {}
        return true;
      }
    }
    await db.execute({ sql: 'DELETE FROM home_faqs WHERE id = ?', args: [id] });
    return true;
  },

  async resetFaqs(faqs: any[]): Promise<any[]> {
    const supabase = getSupabase();
    if (supabase) {
      await supabase.from('home_faqs').delete().neq('id', 0); // Truncate
      await supabase.from('home_faqs').insert(faqs);
    }
    await db.execute('DELETE FROM home_faqs');
    for (const f of faqs) {
      await db.execute({
        sql: 'INSERT INTO home_faqs (question, answer, category, sort_order, is_active) VALUES (?, ?, ?, ?, 1)',
        args: [f.question, f.answer, f.category, f.sort_order]
      });
    }
    const result = await db.execute('SELECT * FROM home_faqs ORDER BY sort_order ASC, id ASC');
    return result.rows;
  },

  // --- OWNER SUBMISSIONS ---
  async getOwnerSubmissions(): Promise<any[]> {
    const supabase = getSupabase();
    if (supabase) {
      const { data, error } = await supabase.from('owner_submissions').select('*').order('id', { ascending: false });
      if (!error && data) return data;
    }
    const result = await db.execute('SELECT * FROM owner_submissions ORDER BY id DESC');
    return result.rows;
  },

  async createOwnerSubmission(os: any): Promise<any> {
    const imagesStr = JSON.stringify(os.images || []);
    const amenitiesStr = JSON.stringify(os.amenities || []);
    const supabase = getSupabase();
    if (supabase) {
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
        amenities: amenitiesStr,
        images: imagesStr,
        notes: os.notes || '',
        status: os.status || 'PENDING',
        admin_notes: os.admin_notes || ''
      };

      const { data, error } = await supabase.from('owner_submissions').insert([payload]).select().single();
      if (!error && data) {
        try {
          await db.execute({
            sql: `INSERT INTO owner_submissions (id, owner_name, owner_phone, owner_email, owner_type, property_title, property_type, bhk_config, location, address, expected_rent, security_deposit, furnishing, available_from, preferred_tenants, amenities, images, notes, status, admin_notes) 
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [data.id, os.owner_name, os.owner_phone, os.owner_email || '', os.owner_type || 'OWNER', os.property_title, os.property_type || 'Apartment', os.bhk_config || '2 BHK', os.location, os.address || '', os.expected_rent, os.security_deposit, os.furnishing || 'Semi-Furnished', os.available_from || '', os.preferred_tenants || 'Any', amenitiesStr, imagesStr, os.notes || '', os.status || 'PENDING', os.admin_notes || '']
          });
        } catch (err) {}
        return data;
      }
    }
    const result = await db.execute({
      sql: `INSERT INTO owner_submissions (owner_name, owner_phone, owner_email, owner_type, property_title, property_type, bhk_config, location, address, expected_rent, security_deposit, furnishing, available_from, preferred_tenants, amenities, images, notes, status, admin_notes) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [os.owner_name, os.owner_phone, os.owner_email || '', os.owner_type || 'OWNER', os.property_title, os.property_type || 'Apartment', os.bhk_config || '2 BHK', os.location, os.address || '', os.expected_rent, os.security_deposit, os.furnishing || 'Semi-Furnished', os.available_from || '', os.preferred_tenants || 'Any', amenitiesStr, imagesStr, os.notes || '', os.status || 'PENDING', os.admin_notes || '']
    });
    return { id: Number(result.lastInsertRowid) };
  },

  async updateOwnerSubmission(id: any, os: any): Promise<boolean> {
    const supabase = getSupabase();
    if (supabase) {
      const payload: any = {};
      if (os.status !== undefined) payload.status = os.status;
      if (os.admin_notes !== undefined) payload.admin_notes = os.admin_notes;

      const { error } = await supabase.from('owner_submissions').update(payload).eq('id', id);
      if (!error) {
        try {
          await db.execute({
            sql: 'UPDATE owner_submissions SET status=COALESCE(?, status), admin_notes=COALESCE(?, admin_notes) WHERE id=?',
            args: [os.status, os.admin_notes, id]
          });
        } catch (err) {}
        return true;
      }
    }
    await db.execute({
      sql: 'UPDATE owner_submissions SET status=COALESCE(?, status), admin_notes=COALESCE(?, admin_notes) WHERE id=?',
      args: [os.status, os.admin_notes, id]
    });
    return true;
  },

  async deleteOwnerSubmission(id: any): Promise<boolean> {
    const supabase = getSupabase();
    if (supabase) {
      const { error } = await supabase.from('owner_submissions').delete().eq('id', id);
      if (!error) {
        try {
          await db.execute({ sql: 'DELETE FROM owner_submissions WHERE id = ?', args: [id] });
        } catch (err) {}
        return true;
      }
    }
    await db.execute({ sql: 'DELETE FROM owner_submissions WHERE id = ?', args: [id] });
    return true;
  },

  async bulkDeleteOwnerSubmissions(ids: any[]): Promise<boolean> {
    if (!ids || ids.length === 0) return true;
    const supabase = getSupabase();
    if (supabase) {
      const { error } = await supabase.from('owner_submissions').delete().in('id', ids);
      if (!error) {
        try {
          const sql = `DELETE FROM owner_submissions WHERE id IN (${ids.map(() => '?').join(',')})`;
          await db.execute({ sql, args: ids });
        } catch (err) {}
        return true;
      }
    }
    const sql = `DELETE FROM owner_submissions WHERE id IN (${ids.map(() => '?').join(',')})`;
    await db.execute({ sql, args: ids });
    return true;
  },

  // --- AGENTS ---
  async getAgents(): Promise<any[]> {
    const supabase = getSupabase();
    if (supabase) {
      const { data, error } = await supabase.from('profiles').select('*').or("role.eq.agent,role.eq.AGENT").order('created_at', { ascending: false });
      if (!error && data) {
        return data.map(p => ({
          id: p.id,
          user_id: p.id,
          name: p.name,
          email: p.email,
          role: 'AGENT',
          phone: p.phone,
          notes: p.notes,
          created_at: p.created_at
        }));
      }
    }
    const result = await db.execute({
      sql: "SELECT id, name, email, role, phone, notes, created_at FROM users WHERE role = ? OR role = ? ORDER BY id DESC",
      args: ['AGENT', 'agent']
    });
    return result.rows;
  },

  async updateAgent(id: any, agent: any): Promise<boolean> {
    const supabase = getSupabase();
    if (supabase) {
      const { error } = await supabase.from('profiles').update({
        name: agent.name,
        email: agent.email,
        phone: agent.phone || '',
        notes: agent.notes || ''
      }).eq('id', id);
      if (!error) {
        try {
          await db.execute({
            sql: 'UPDATE users SET name=?, email=?, phone=?, notes=? WHERE id=? OR email=?',
            args: [agent.name, agent.email, agent.phone || '', agent.notes || '', id, agent.email]
          });
        } catch (err) {}
        return true;
      }
    }
    await db.execute({
      sql: 'UPDATE users SET name=?, email=?, phone=?, notes=? WHERE id=? OR email=?',
      args: [agent.name, agent.email, agent.phone || '', agent.notes || '', id, agent.email]
    });
    return true;
  },

  async deleteAgent(id: any): Promise<boolean> {
    const supabase = getSupabase();
    if (supabase) {
      // Deleting profile
      await supabase.from('profiles').delete().eq('id', id);
      // Attempt auth user delete if service role or metadata allows, but delete profile is standard
    }
    await db.execute({ sql: 'DELETE FROM users WHERE id = ?', args: [id] });
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
