import { createClient } from '@libsql/client';
import bcrypt from 'bcryptjs';

// We use a local SQLite file for persistence
export const db = createClient({
  url: 'file:local.db',
});

export async function initDb() {
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'AGENT', -- 'MAIN_ADMIN', 'ADMIN', 'AGENT'
      permissions TEXT, -- JSON string for granular permissions
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS properties (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      price REAL,
      type TEXT, -- e.g., '1 BHK', '2 BHK', 'Villa'
      bedrooms INTEGER,
      bathrooms INTEGER,
      area REAL,
      location TEXT,
      status TEXT DEFAULT 'PUBLISHED',
      images TEXT, -- JSON array of URLs (up to 10 photos)
      videos TEXT, -- JSON array of URLs (up to 4 videos)
      faqs TEXT, -- JSON array of FAQ objects {id, question, answer, category}
      hero_image TEXT,
      hero_video TEXT,
      floor_plans TEXT, -- JSON array
      brochures TEXT,
      amenities TEXT, -- JSON array
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      status TEXT DEFAULT 'New', -- 'New', 'Contacted', 'Interested', 'Site Visit Scheduled', 'Site Visit Completed', 'Follow-up', 'Negotiation', 'Converted', 'Lost'
      source TEXT,
      assigned_agent_id INTEGER,
      property_id INTEGER,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(assigned_agent_id) REFERENCES users(id),
      FOREIGN KEY(property_id) REFERENCES properties(id)
    );

    CREATE TABLE IF NOT EXISTS site_visits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER,
      property_id INTEGER,
      agent_id INTEGER,
      visit_date TEXT,
      visit_time TEXT,
      status TEXT DEFAULT 'Scheduled', -- 'Scheduled', 'Confirmed', 'Completed', 'Cancelled', 'Rescheduled', 'No Show'
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(lead_id) REFERENCES leads(id),
      FOREIGN KEY(property_id) REFERENCES properties(id),
      FOREIGN KEY(agent_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS site_visit_feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      visit_id INTEGER UNIQUE,
      interest_level TEXT, -- 'Hot', 'Warm', 'Cold'
      customer_feedback TEXT,
      requirements TEXT,
      budget REAL,
      preferred_configuration TEXT,
      timeline TEXT,
      next_action TEXT,
      photos TEXT, -- JSON array
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(visit_id) REFERENCES site_visits(id)
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number TEXT UNIQUE,
      lead_id INTEGER,
      property_id INTEGER,
      subtotal REAL,
      tax REAL,
      discount REAL,
      total REAL,
      status TEXT DEFAULT 'Pending',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(lead_id) REFERENCES leads(id),
      FOREIGN KEY(property_id) REFERENCES properties(id)
    );

    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS home_faqs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      category TEXT DEFAULT 'General',
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS owner_submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_name TEXT NOT NULL,
      owner_phone TEXT NOT NULL,
      owner_email TEXT,
      owner_type TEXT DEFAULT 'OWNER',
      property_title TEXT NOT NULL,
      property_type TEXT DEFAULT 'Apartment',
      bhk_config TEXT DEFAULT '2 BHK',
      location TEXT NOT NULL,
      address TEXT,
      expected_rent REAL,
      security_deposit REAL,
      furnishing TEXT DEFAULT 'Semi-Furnished',
      available_from TEXT,
      preferred_tenants TEXT DEFAULT 'Any',
      amenities TEXT,
      images TEXT,
      notes TEXT,
      status TEXT DEFAULT 'PENDING',
      admin_notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Ensure video, faqs and invoice columns exist on existing tables
  try {
    await db.execute('ALTER TABLE properties ADD COLUMN videos TEXT');
  } catch (e) {}

  try {
    await db.execute('ALTER TABLE properties ADD COLUMN faqs TEXT');
  } catch (e) {}

  const invoiceColumns = [
    'ALTER TABLE invoices ADD COLUMN client_name TEXT',
    'ALTER TABLE invoices ADD COLUMN client_email TEXT',
    'ALTER TABLE invoices ADD COLUMN client_phone TEXT',
    'ALTER TABLE invoices ADD COLUMN client_address TEXT',
    'ALTER TABLE invoices ADD COLUMN client_pan TEXT',
    'ALTER TABLE invoices ADD COLUMN client_gstin TEXT',
    'ALTER TABLE invoices ADD COLUMN items TEXT',
    'ALTER TABLE invoices ADD COLUMN tax_type TEXT DEFAULT "GST_18"',
    'ALTER TABLE invoices ADD COLUMN tax_rate REAL DEFAULT 18',
    'ALTER TABLE invoices ADD COLUMN amount_paid REAL DEFAULT 0',
    'ALTER TABLE invoices ADD COLUMN balance_due REAL DEFAULT 0',
    'ALTER TABLE invoices ADD COLUMN payment_mode TEXT DEFAULT "Bank Transfer / NEFT / RTGS"',
    'ALTER TABLE invoices ADD COLUMN issue_date TEXT',
    'ALTER TABLE invoices ADD COLUMN due_date TEXT',
    'ALTER TABLE invoices ADD COLUMN terms TEXT',
    'ALTER TABLE invoices ADD COLUMN bank_name TEXT',
    'ALTER TABLE invoices ADD COLUMN account_holder TEXT',
    'ALTER TABLE invoices ADD COLUMN account_number TEXT',
    'ALTER TABLE invoices ADD COLUMN ifsc_code TEXT',
    'ALTER TABLE invoices ADD COLUMN branch_name TEXT',
    'ALTER TABLE invoices ADD COLUMN account_type TEXT',
    'ALTER TABLE invoices ADD COLUMN upi_id TEXT',
    'ALTER TABLE invoices ADD COLUMN upi_qr_url TEXT',
    'ALTER TABLE invoices ADD COLUMN payment_instructions TEXT'
  ];

  for (const alterSql of invoiceColumns) {
    try {
      await db.execute(alterSql);
    } catch (e) {}
  }

  // Create Main Admin if it doesn't exist
  const adminRes = await db.execute({
    sql: 'SELECT id FROM users WHERE email = ?',
    args: ['admin@admin.com'],
  });

  if (adminRes.rows.length === 0) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await db.execute({
      sql: 'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      args: ['Main Admin', 'admin@admin.com', hashedPassword, 'MAIN_ADMIN'],
    });
    console.log('Main Admin created: admin@admin.com / admin123');
  }

  // Seed default settings if empty
  const settingsRes = await db.execute('SELECT COUNT(*) as count FROM settings');
  if (settingsRes.rows[0].count === 0) {
    const defaultSettings = [
      { key: 'website_name', value: 'Rental Pune' },
      { key: 'company_name', value: 'Rental Pune Real Estate LLP' },
      { key: 'phone', value: '+91 98765 43210' },
      { key: 'whatsapp_number', value: '+91 98765 43210' },
      { key: 'whatsapp_url', value: 'https://wa.me/919876543210?text=Hi%20Rental%20Pune%2C%20I%20am%20interested%20in%20rental%20properties.' },
      { key: 'whatsapp_message', value: 'Hi Rental Pune, I am interested in rental properties.' },
      { key: 'email', value: 'contact@rentalpune.com' },
      { key: 'address', value: 'Prime Business Tower, Senapati Bapat Road, Pune, Maharashtra 411016' },
      { key: 'hero_heading', value: 'Premium Rentals. Prime Pune.' },
      { key: 'hero_subheading', value: "Discover thoughtfully curated rental properties in Pune's most desirable locations." },
      { key: 'bank_name', value: 'HDFC Bank Ltd.' },
      { key: 'account_holder', value: 'Rental Pune Real Estate LLP' },
      { key: 'account_number', value: '50200089234123' },
      { key: 'ifsc_code', value: 'HDFC0001234' },
      { key: 'branch_name', value: 'Senapati Bapat Road Branch, Pune' },
      { key: 'account_type', value: 'Current Account' },
      { key: 'upi_id', value: 'rentalpune@hdfcbank' },
      { key: 'upi_number', value: '9876543210' },
      { key: 'gstin', value: '27AABCR5429B1Z4' },
      { key: 'pan', value: 'AABCR5429B' },
      { key: 'payment_instructions', value: 'Please specify your Invoice Number in the payment remarks/narration. Send UTR confirmation to payments@rentalpune.com' }
    ];
    for (const setting of defaultSettings) {
      await db.execute({
        sql: 'INSERT INTO settings (key, value) VALUES (?, ?)',
        args: [setting.key, setting.value]
      });
    }
  }

  // Backfill standard FAQs for existing properties if empty or null
  try {
    const allProps = await db.execute('SELECT id, title, location, type, faqs FROM properties');
    for (const row of allProps.rows) {
      if (!row.faqs || row.faqs === '[]' || row.faqs === '' || row.faqs === 'null') {
        const titleStr = String(row.title || '');
        const defaultPropFaqs = [
          {
            id: `faq-${row.id}-1`,
            category: 'Maintenance',
            question: 'What are the monthly society maintenance charges & inclusions?',
            answer: `The society maintenance is ₹${titleStr.includes('3 BHK') ? '4,500' : '2,800'}/month. It covers 24/7 security personnel, common electricity, elevator maintenance, daily garbage disposal, swimming pool & gym amenities.`
          },
          {
            id: `faq-${row.id}-2`,
            category: 'Society Rules',
            question: 'What are the society rules regarding tenants, quiet hours & move-in?',
            answer: 'Welcomes families and working professionals. Quiet hours are 10:30 PM – 6:00 AM. 48-hour prior intimation to society manager required before shifting. Move-in lift protection pads provided.'
          },
          {
            id: `faq-${row.id}-3`,
            category: 'Parking',
            question: 'What parking availability is allocated with this residence?',
            answer: `${titleStr.includes('3 BHK') ? '2 dedicated covered basement car parking slots' : '1 dedicated covered car parking slot'} + 1 two-wheeler slot. Visitor parking available via MyGate app approval.`
          },
          {
            id: `faq-${row.id}-4`,
            category: 'Deposit & Agreement',
            question: 'What is the security deposit amount and agreement tenure?',
            answer: 'Refundable security deposit is 2 months rent. Standard 11-month registered rent agreement with police verification and 6 months lock-in period.'
          },
          {
            id: `faq-${row.id}-5`,
            category: 'Pet Policy',
            question: 'Are pets allowed in the society and apartment?',
            answer: 'Yes, pet-friendly society with standard pet hygiene guidelines in common areas and leash etiquette in elevators.'
          }
        ];

        await db.execute({
          sql: 'UPDATE properties SET faqs = ? WHERE id = ?',
          args: [JSON.stringify(defaultPropFaqs), row.id]
        });
      }
    }
  } catch (e) {
    console.error('Error backfilling property FAQs:', e);
  }

  // Seed sample agent if none exist
  const agentRes = await db.execute({
    sql: 'SELECT id FROM users WHERE role = ?',
    args: ['AGENT']
  });
  if (agentRes.rows.length === 0) {
    const agentPass = await bcrypt.hash('agent123', 10);
    await db.execute({
      sql: 'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      args: ['Alexander Vance', 'agent@sereneestates.com', agentPass, 'AGENT']
    });
    console.log('Sample Agent created: agent@sereneestates.com / agent123');
  }

  // Seed sample properties if none exist
  const propRes = await db.execute('SELECT COUNT(*) as count FROM properties');
  if (propRes.rows[0].count === 0) {
    await db.execute({
      sql: `INSERT INTO properties (title, description, price, type, bedrooms, bathrooms, area, location, images, status) VALUES 
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?),
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?),
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?),
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        '3 BHK Luxury Apartment',
        'Spacious, premium high-rise apartment in Baner with panoramic hill views, Italian marble flooring, modern modular kitchen, and clubhouse access.',
        45000,
        '3 BHK',
        3,
        3,
        1650,
        'Baner, Pune',
        JSON.stringify([
          'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1200&q=80'
        ]),
        'PUBLISHED',

        '2 BHK Modern Apartment',
        'Elegantly furnished contemporary 2 BHK in prime Kothrud. Close to metro station, reputed schools, and premium dining hubs.',
        28000,
        '2 BHK',
        2,
        2,
        1100,
        'Kothrud, Pune',
        JSON.stringify([
          'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=80'
        ]),
        'PUBLISHED',

        '3 BHK Premium Apartment',
        'Sunlit corner residence in Viman Nagar near airport and IT hubs. Features expansive private balcony, automated smart lighting, and 2 covered parking.',
        50000,
        '3 BHK',
        3,
        3,
        1800,
        'Viman Nagar, Pune',
        JSON.stringify([
          'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1200&q=80'
        ]),
        'PUBLISHED',

        '2 BHK Spacious Apartment',
        'Smart urban 2 BHK in Hinjewadi Phase 1, minutes from top IT parks. 24/7 security, high-speed elevators, swimming pool, and gymnasium.',
        24000,
        '2 BHK',
        2,
        2,
        950,
        'Hinjewadi, Pune',
        JSON.stringify([
          'https://images.unsplash.com/photo-1600573472550-8090b5e0745e?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1600566752355-35792bedcfea?auto=format&fit=crop&w=1200&q=80'
        ]),
        'PUBLISHED'
      ]
    });
  }

  // Seed sample leads, visits and feedbacks if empty
  const feedbackRes = await db.execute('SELECT COUNT(*) as count FROM site_visit_feedback');
  if (feedbackRes.rows[0].count === 0) {
    // Ensure we have a lead
    const leadInsert = await db.execute({
      sql: 'INSERT INTO leads (name, email, phone, status, source, notes) VALUES (?, ?, ?, ?, ?, ?)',
      args: ['Marcus Sterling', 'marcus.sterling@apexcapital.com', '+1 (555) 234-5678', 'Site Visit Completed', 'Website', 'Interested in high floor luxury penthouse with quick closing.']
    });
    const leadId = Number(leadInsert.lastInsertRowid);

    // Get an agent
    const agent = await db.execute("SELECT id FROM users WHERE role = 'AGENT' LIMIT 1");
    const agentId = agent.rows.length > 0 ? Number(agent.rows[0].id) : 1;

    // Get property
    const prop = await db.execute("SELECT id FROM properties LIMIT 1");
    const propId = prop.rows.length > 0 ? Number(prop.rows[0].id) : 1;

    // Insert completed visit
    const visitInsert = await db.execute({
      sql: 'INSERT INTO site_visits (lead_id, property_id, agent_id, visit_date, visit_time, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      args: [leadId, propId, agentId, new Date().toISOString().split('T')[0], '14:30', 'Completed', 'Client arrived with family; toured entire penthouse and private elevator.']
    });
    const visitId = Number(visitInsert.lastInsertRowid);

    // Insert feedback submitted by agent
    await db.execute({
      sql: `INSERT INTO site_visit_feedback (visit_id, interest_level, customer_feedback, requirements, budget, preferred_configuration, timeline, next_action) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        visitId,
        'Hot',
        'Client was very impressed with the private infinity pool and unobstructed sunset views. Expressed serious intent to make an offer pending contract review.',
        'Requires minimum 4 parking spaces, EV chargers, and smart automation system.',
        5000000,
        '4 BHK Penthouse with high ceiling and terrace',
        'Immediate (0-1 month)',
        'Send draft sales agreement and schedule follow-up call with client legal advisor on Friday.'
      ]
    });

    // Insert second sample lead & visit with Warm feedback
    const lead2 = await db.execute({
      sql: 'INSERT INTO leads (name, email, phone, status, source, notes) VALUES (?, ?, ?, ?, ?, ?)',
      args: ['Elena Rostova', 'elena.rostova@designgroup.com', '+1 (555) 876-5432', 'Site Visit Completed', 'Referral', 'Looking for architectural villa in private neighborhood.']
    });
    const lead2Id = Number(lead2.lastInsertRowid);

    const visit2 = await db.execute({
      sql: 'INSERT INTO site_visits (lead_id, property_id, agent_id, visit_date, visit_time, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      args: [lead2Id, propId, agentId, new Date(Date.now() - 86400000).toISOString().split('T')[0], '11:00', 'Completed', 'Conducted walk-through of master suite and exterior gardens.']
    });
    const visit2Id = Number(visit2.lastInsertRowid);

    await db.execute({
      sql: `INSERT INTO site_visit_feedback (visit_id, interest_level, customer_feedback, requirements, budget, preferred_configuration, timeline, next_action) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        visit2Id,
        'Warm',
        'Loved the layout and architecture. Comparing with another estate in Malibu; requested detailed property tax and HOA breakdown.',
        'Requires dedicated art studio space with natural north-facing light.',
        4500000,
        'Modern 3 or 4 BHK with landscaped garden',
        '1-3 months',
        'Email detailed HOA documentation and invite for twilight viewing.'
      ]
    });
  }

  // Seed default Home Page FAQs if empty
  try {
    const faqCountRes = await db.execute('SELECT COUNT(*) as count FROM home_faqs');
    if (faqCountRes.rows[0].count === 0) {
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
      console.log('Seeded default Home Page FAQs in home_faqs table.');
    }
  } catch (e) {
    console.error('Error seeding home_faqs:', e);
  }
}
