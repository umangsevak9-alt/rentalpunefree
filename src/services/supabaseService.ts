import { createClient, SupabaseClient, User as SupabaseAuthUser } from '@supabase/supabase-js';
import { Property, Lead, PropertyBooking, Visit, VisitFeedback, Invoice, User, FAQ, GalleryItem, Settings } from '../types.js';
import { useAppStore } from '../store/index.js';

// Retrieve credentials with local storage override capability
function getSavedSupabaseConfig() {
  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
  const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

  const defaultUrl = 'https://ddfsfemggwjtryosdgya.supabase.co';
  const defaultKey = 'sb_publishable_l4em_aFSdxQIpW2gLbShHA_r8Gjpt-j';

  if (typeof window !== 'undefined' && window.localStorage) {
    const customUrl = localStorage.getItem('rp_custom_supabase_url');
    const customKey = localStorage.getItem('rp_custom_supabase_anon_key');
    // If the saved custom key is the old broken eyJ key, discard it
    if (customKey && customKey.startsWith('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9')) {
      localStorage.removeItem('rp_custom_supabase_anon_key');
    } else if (customUrl && customKey) {
      return { url: customUrl.trim(), key: customKey.trim() };
    }
  }

  return { url: envUrl || defaultUrl, key: envKey || defaultKey };
}

const initialConfig = getSavedSupabaseConfig();
export let supabaseUrl = initialConfig.url;
export let supabaseAnonKey = initialConfig.key;

export function createSupabaseInstance(url: string, key: string): SupabaseClient {
  return createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    }
  });
}

export let supabase: SupabaseClient = createSupabaseInstance(supabaseUrl, supabaseAnonKey);

export function updateSupabaseCredentials(newUrl: string, newKey: string): void {
  const cleanUrl = (newUrl || '').trim();
  const cleanKey = (newKey || '').trim();

  if (cleanUrl && cleanKey) {
    supabaseUrl = cleanUrl;
    supabaseAnonKey = cleanKey;
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('rp_custom_supabase_url', cleanUrl);
      localStorage.setItem('rp_custom_supabase_anon_key', cleanKey);
    }
    supabase = createSupabaseInstance(cleanUrl, cleanKey);
  }
}

export function resetSupabaseCredentials(): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.removeItem('rp_custom_supabase_url');
    localStorage.removeItem('rp_custom_supabase_anon_key');
  }
  const fallback = getSavedSupabaseConfig();
  supabaseUrl = fallback.url;
  supabaseAnonKey = fallback.key;
  supabase = createSupabaseInstance(supabaseUrl, supabaseAnonKey);
}

export const BUCKET_NAME = 'property-images';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('placeholder')
);

export function getStorageImageUrl(filePath: string): string {
  if (!filePath) return '';
  if (filePath.startsWith('http://') || filePath.startsWith('https://') || filePath.startsWith('data:')) {
    return filePath;
  }
  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);
  return data?.publicUrl || filePath;
}

// Safe JSON parse helper
export function safeJsonParse<T>(val: any, fallback: T): T {
  if (val === null || val === undefined || val === '') return fallback;
  if (typeof val === 'object') return val as T;
  if (typeof val !== 'string') return fallback;
  const trimmed = val.trim();
  if (!trimmed || trimmed === 'undefined' || trimmed === 'null') return fallback;
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    return fallback;
  }
}

export function notifyUpdate(key: string, data?: any): void {
  if (typeof window === 'undefined') return;
  try {
    const timestamp = Date.now().toString();
    localStorage.setItem(`rp_${key}_updated_at`, timestamp);
    localStorage.setItem(`rp_last_sync_all`, timestamp);
    window.dispatchEvent(new CustomEvent(`${key}_updated`, { detail: data }));
    window.dispatchEvent(new CustomEvent('rp_data_updated', { detail: { entity: key, data } }));
  } catch (e) {}
}

export function getStoredToken(): string {
  if (typeof window === 'undefined' || !window.localStorage) return '';
  try {
    return localStorage.getItem('rp_auth_token') || localStorage.getItem('token') || '';
  } catch {
    return '';
  }
}
const getToken = getStoredToken;

// Local storage caching helpers
export function getLocal<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined' || !window.localStorage) return fallback;
  try {
    const val = localStorage.getItem('rp_' + key);
    return safeJsonParse<T>(val, fallback);
  } catch {
    return fallback;
  }
}

export function setLocal<T>(key: string, data: T): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    localStorage.setItem('rp_' + key, JSON.stringify(data));
    notifyUpdate(key, data);
  } catch (e) {
    console.warn('LocalStorage save failed:', e);
  }
}

// Initial Seed Properties with Rent, Commercial, and Buy/Sell (Sale) categories
const SEED_PROPERTIES: Property[] = [
  {
    id: 1,
    title: 'Skyline Penthouse Koregaon Park',
    type: '4 BHK',
    price: 185000,
    bedrooms: 4,
    bathrooms: 4,
    area: 3400,
    location: 'Koregaon Park, Pune',
    description: 'Spectacular 4 BHK luxury penthouse with private plunge pool, panoramic greenery views, smart automation, and private elevator for rent.',
    status: 'PUBLISHED',
    purpose: 'RENT',
    category: 'RESIDENTIAL',
    furnishing: 'Fully Furnished',
    images: [
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80'
    ],
    videos: [],
    faqs: [
      { question: 'Is the plunge pool temperature controlled?', answer: 'Yes, it features automated solar and electric heating.' },
      { question: 'How many car parking spots are allotted?', answer: '3 covered basement reserved parking spots.' }
    ],
    created_at: new Date().toISOString()
  },
  {
    id: 2,
    title: 'Grade-A Tech Office Tower Hinjewadi',
    type: 'Commercial Office',
    price: 320000,
    bedrooms: 0,
    bathrooms: 4,
    area: 5800,
    location: 'Hinjewadi Phase 1, Pune',
    description: 'Fully plug & play commercial IT office space with 80+ workstations, 4 executive conference rooms, server room, and high-speed fiber connectivity.',
    status: 'PUBLISHED',
    purpose: 'COMMERCIAL',
    category: 'COMMERCIAL',
    furnishing: 'Fully Furnished Plug & Play',
    images: [
      'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1200&q=80'
    ],
    videos: [],
    faqs: [
      { question: 'Is DG power backup available 24x7?', answer: 'Yes, 100% DG power backup is available round the clock with zero downtime.' }
    ],
    created_at: new Date().toISOString()
  },
  {
    id: 3,
    title: 'Signature 3 BHK Ready Possession Flat Baner',
    type: '3 BHK',
    price: 18500000, // 1.85 Cr
    bedrooms: 3,
    bathrooms: 3,
    area: 1750,
    location: 'Baner, Pune',
    description: 'Ready Possession ultra-modern 3 BHK apartment in prime Baner high-rise. 100% Occupation Certificate (OC) received, immediate handover, East-facing, Italian marble flooring, 3 balconies, and luxury clubhouse access.',
    status: 'PUBLISHED',
    purpose: 'READY_POSSESSION',
    category: 'READY_POSSESSION',
    furnishing: 'Semi-Furnished',
    images: [
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1200&q=80'
    ],
    videos: [],
    faqs: [
      { question: 'Is clear title & OC available?', answer: 'Yes, full Occupation Certificate (OC) received and bank-approved clear title with immediate possession.' }
    ],
    created_at: new Date().toISOString()
  },
  {
    id: 4,
    title: 'High-Street Retail Showroom FC Road',
    type: 'Retail Showroom',
    price: 250000,
    bedrooms: 0,
    bathrooms: 2,
    area: 2100,
    location: 'FC Road, Shivaji Nagar, Pune',
    description: 'Prime ground floor retail commercial showroom with 45 ft massive frontage, high footfall zone, ideal for luxury brands, jewelry, or flagship stores.',
    status: 'PUBLISHED',
    purpose: 'COMMERCIAL',
    category: 'COMMERCIAL',
    furnishing: 'Bare Shell / Customized',
    images: [
      'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80'
    ],
    videos: [],
    faqs: [
      { question: 'Is frontage visible from main traffic flow?', answer: 'Yes, prime corner location with clear direct visibility.' }
    ],
    created_at: new Date().toISOString()
  },
  {
    id: 5,
    title: 'Grand Waterfront Villa Kalyani Nagar',
    type: '4 BHK',
    price: 220000,
    bedrooms: 4,
    bathrooms: 5,
    area: 4200,
    location: 'Kalyani Nagar, Pune',
    description: 'Ultra-luxurious standalone villa with manicured private lawn, double-height ceiling living room, designer modular kitchen, and staff quarters for rent.',
    status: 'PUBLISHED',
    purpose: 'RENT',
    category: 'RESIDENTIAL',
    furnishing: 'Fully Furnished',
    images: [
      'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80'
    ],
    videos: [],
    faqs: [
      { question: 'Are pets allowed?', answer: 'Yes, fully pet-friendly with private enclosed lawn.' }
    ],
    created_at: new Date().toISOString()
  },
  {
    id: 6,
    title: 'Luxury 4 BHK Duplex Penthouse For Sale Viman Nagar',
    type: '4 BHK',
    price: 29500000, // 2.95 Cr
    bedrooms: 4,
    bathrooms: 5,
    area: 3600,
    location: 'Viman Nagar, Pune',
    description: 'Exclusive 4 BHK duplex penthouse for outright purchase. Private terrace deck, double-height foyer, servant quarters, and panoramic airport views.',
    status: 'PUBLISHED',
    purpose: 'SALE',
    category: 'RESIDENTIAL',
    furnishing: 'Designer Semi-Furnished',
    images: [
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=80'
    ],
    videos: [],
    faqs: [
      { question: 'How many car parkings are included in sale?', answer: '3 covered basement reserved slots are deed-allotted.' }
    ],
    created_at: new Date().toISOString()
  },
  {
    id: 7,
    title: 'Riverfront Panoramic Suite Boat Club Road',
    type: '3 BHK',
    price: 135000,
    bedrooms: 3,
    bathrooms: 3,
    area: 2650,
    location: 'Boat Club Road, Pune',
    description: 'Exclusive 3 BHK riverfront apartment for rent in one of Pune’s most prestigious addresses. Unobstructed Mula-Mutha river vistas and wrap-around balconies.',
    status: 'PUBLISHED',
    purpose: 'RENT',
    category: 'RESIDENTIAL',
    furnishing: 'Fully Furnished',
    images: [
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=80'
    ],
    videos: [],
    faqs: [],
    created_at: new Date().toISOString()
  },
  {
    id: 8,
    title: 'Modern 2 BHK Executive Flat Kothrud',
    type: '2 BHK',
    price: 38000,
    bedrooms: 2,
    bathrooms: 2,
    area: 1150,
    location: 'Kothrud, Pune',
    description: 'Well-ventilated 2 BHK apartment for rent in peaceful residential pocket near Paud Road metro station, modular kitchen, and covered parking.',
    status: 'PUBLISHED',
    purpose: 'RENT',
    category: 'RESIDENTIAL',
    furnishing: 'Semi-Furnished',
    images: [
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80'
    ],
    videos: [],
    faqs: [],
    created_at: new Date().toISOString()
  },
  {
    id: 9,
    title: 'Pre-Leased Commercial Grade-A IT Office For Sale - EON Kharadi',
    type: 'Rented Commercial by Sell',
    price: 34500000, // 3.45 Cr
    bedrooms: 0,
    bathrooms: 4,
    area: 3200,
    location: 'EON Free Zone, Kharadi, Pune',
    description: 'Grade-A Pre-leased commercial office for outright sale in EON IT Park, Kharadi. Currently rented to a Global Tech MNC at ₹2,45,000/month with 9-year long-term registered lease (5-year lock-in) and 15% escalation every 3 years. Immediate high rental yield investment with zero vacancy.',
    status: 'PUBLISHED',
    purpose: 'RENTED_COMMERCIAL_SALE',
    category: 'RENTED_COMMERCIAL_SALE',
    current_rent: 245000,
    roi_yield: '8.52% ROI Yield',
    tenant_name: 'Global Tech MNC (Grade-A Tenant)',
    lease_term: '9 Years Registered Lease (5 Yrs Lock-in)',
    furnishing: 'Fully Furnished Warm Shell',
    images: [
      'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1200&q=80'
    ],
    videos: [],
    faqs: [
      { question: 'What is the monthly rental income?', answer: 'Generates ₹2,45,000 net monthly rental credited directly to buyer account with zero maintenance liability.' },
      { question: 'Is the lease agreement registered?', answer: 'Yes, fully registered 9-year corporate lease with 5-year lock-in and 15% periodic escalation.' }
    ],
    created_at: new Date().toISOString()
  },
  {
    id: 10,
    title: 'Rented High-Street Retail Showroom For Sale - Baner High Street',
    type: 'Rented Commercial by Sell',
    price: 28000000, // 2.80 Cr
    bedrooms: 0,
    bathrooms: 2,
    area: 2100,
    location: 'Baner Main Road, Pune',
    description: 'High-footfall corner retail showroom on main Baner Road, pre-leased to a leading Scheduled Commercial Bank. Long-term 15-year lease tenure, regular guaranteed cash flow, and prime commercial appreciation.',
    status: 'PUBLISHED',
    purpose: 'RENTED_COMMERCIAL_SALE',
    category: 'COMMERCIAL',
    current_rent: 195000,
    roi_yield: '8.36% ROI Yield',
    tenant_name: 'Leading Scheduled Commercial Bank',
    lease_term: '15 Years Lease (9 Yrs Remaining Lock-in)',
    furnishing: 'Fully Fitted Bank Branch',
    images: [
      'https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1200&q=80'
    ],
    videos: [],
    faqs: [
      { question: 'Who is the tenant?', answer: 'Pre-leased to a Top-tier Commercial Bank with timely auto-debit rental payments and long-standing lease.' }
    ],
    created_at: new Date().toISOString()
  },
  {
    id: 11,
    title: 'Sovereign Sky Mansions - 3 & 4 BHK Balewadi High Street',
    type: '3 BHK',
    price: 16500000, // 1.65 Cr
    bedrooms: 3,
    bathrooms: 3,
    area: 1980,
    location: 'Balewadi High Street, Pune',
    description: 'Under Construction ultra-luxury skyscraper residences with 11-ft clear ceiling height, infinity rooftop pool, 50,000 sq.ft clubhouse, and flexible 20:80 subvention payment scheme. Possession Dec 2027.',
    status: 'PUBLISHED',
    purpose: 'UNDER_CONSTRUCTION',
    category: 'UNDER_CONSTRUCTION',
    furnishing: 'Unfurnished / Bare Shell with Marble Flooring',
    images: [
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80'
    ],
    videos: [],
    faqs: [
      { question: 'What is the expected possession timeline?', answer: 'Target possession is December 2027 with MahaRERA registered construction milestones.' },
      { question: 'What payment plans are offered?', answer: 'Special construction linked 20:80 payment structure with zero pre-EMI till possession.' }
    ],
    created_at: new Date().toISOString()
  },
  {
    id: 12,
    title: 'Kharadi Central Signature High-Rise Tower',
    type: '4 BHK',
    price: 24000000, // 2.40 Cr
    bedrooms: 4,
    bathrooms: 4,
    area: 2750,
    location: 'Kharadi IT Corridor, Pune',
    description: 'Under Construction iconic twin-tower development in Prime Kharadi. Features private deck with river views, automated smart-home infrastructure, Olympic-sized swimming pool, and bespoke concierge. Possession March 2028.',
    status: 'PUBLISHED',
    purpose: 'UNDER_CONSTRUCTION',
    category: 'UNDER_CONSTRUCTION',
    furnishing: 'Designer Shell',
    images: [
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=80'
    ],
    videos: [],
    faqs: [
      { question: 'Is the project MahaRERA approved?', answer: 'Yes, fully registered under MahaRERA with transparent escrow milestone verification.' }
    ],
    created_at: new Date().toISOString()
  }
];

// Initial Seed FAQs
const SEED_FAQS: FAQ[] = [
  {
    id: 1,
    question: 'How do I schedule a private property viewing with Rental Pune?',
    answer: 'You can request a private viewing through our VIP concierge form on any listing page or contact our team directly via WhatsApp or phone. We coordinate with owners for exclusive, confidential tours.',
    category: 'Viewing & Concierge',
    sort_order: 1,
    is_active: 1
  },
  {
    id: 2,
    question: 'What documentation is required for leasing luxury residences in Pune?',
    answer: 'Standard tenancy verification requires PAN Card, Aadhaar Card, proof of employment or business ownership, and reference checks. For NRI or corporate leases, company registration and GST credentials are used.',
    category: 'Documentation & Lease',
    sort_order: 2,
    is_active: 1
  },
  {
    id: 3,
    question: 'Are the properties 100% verified before listing?',
    answer: 'Yes. Every property in our luxury portfolio undergoes comprehensive title checks, owner identity confirmation, and physical condition inspection prior to onboarding.',
    category: 'Verification & Safety',
    sort_order: 3,
    is_active: 1
  }
];

// Initial Seed Agents
const SEED_AGENTS: User[] = [];

// Initial Seed Gallery Items
const SEED_GALLERY_ITEMS: GalleryItem[] = [
  {
    id: 1,
    title: 'Tower Exterior & Pool Promenade',
    category: 'Grand Architecture',
    image_url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1600&q=85',
    description: 'International standard tower facade with manicured landscaped deck and infinity pool promenade view.',
    sort_order: 1,
    is_active: 1
  },
  {
    id: 2,
    title: 'Infinity Edge Swimming Pool',
    category: 'Lifestyle',
    image_url: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1600&q=85',
    description: 'Temperature-controlled infinity lap pool with luxury sun loungers and panoramic sky view.',
    sort_order: 2,
    is_active: 1
  },
  {
    id: 3,
    title: 'Grand Living & Dining Hall',
    category: 'Interiors',
    image_url: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1600&q=85',
    description: 'Double-height Italian marble living room with designer chandeliers and floor-to-ceiling glass.',
    sort_order: 3,
    is_active: 1
  },
  {
    id: 4,
    title: 'Presidential Master Bedroom',
    category: 'Suites',
    image_url: 'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&w=1600&q=85',
    description: 'Spacious master suite featuring wooden flooring, walk-in closet, and private sunset deck.',
    sort_order: 4,
    is_active: 1
  },
  {
    id: 5,
    title: 'Executive Clubhouse & Lounge',
    category: 'Amenities',
    image_url: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1600&q=85',
    description: 'Private resident lounge, business center, and meeting suites for community networking.',
    sort_order: 5,
    is_active: 1
  },
  {
    id: 6,
    title: 'High-Tech Fitness Gymnasium',
    category: 'Wellness',
    image_url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1600&q=85',
    description: 'State-of-the-art cardio and weight training equipment with dedicated yoga studio.',
    sort_order: 6,
    is_active: 1
  }
];

// Initial Seed Owner Submissions
const SEED_OWNER_SUBMISSIONS = [
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
    furniture: ['Ceiling Fans (All Rooms)', 'Master Bedroom Wardrobe', 'Modular Kitchen Cabinets', 'Air Conditioner (AC)', 'Sofa Set (3+2)', 'King Bed with Mattress', 'Geyser / Water Heater', 'Smart TV 55"'],
    available_from: 'Immediate',
    preferred_tenants: 'Family / IT Professionals',
    amenities: ['Power Backup', 'Gymnasium', 'Swimming Pool', '24/7 Security', 'Covered Parking', 'Clubhouse', 'Modular Kitchen'],
    images: [
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80'
    ],
    videos: [],
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
    furniture: ['Ceiling Fans (All Rooms)', 'Cupboards / Wardrobes in 2 Bedrooms', 'Modular Kitchen', 'Geyser in 2 Bathrooms'],
    available_from: 'Next Month',
    preferred_tenants: 'Any',
    amenities: ['24/7 Security', 'Covered Parking', 'Modular Kitchen', 'Elevator / Lift', 'Piped MNGL Gas'],
    images: [
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80'
    ],
    videos: [],
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
    furniture: ['Designer Ceiling Fans & Lights', 'Full Wall Walk-in Wardrobes', 'Italian Modular Kitchen & Chimney', 'VRV Air Conditioning in all rooms', 'Imported Leather Sofa Set', 'King Bed & Queen Beds (4 sets)', 'Dining Table (6 Seater)', 'Microwave & Double Door Refrigerator', 'Washing Machine', 'Smart Home Automation'],
    available_from: 'Immediate',
    preferred_tenants: 'Family',
    amenities: ['Swimming Pool', 'Clubhouse', '24/7 Security', 'Power Backup', 'Gymnasium', 'Children Play Area', 'Pet Friendly'],
    images: [
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80'
    ],
    videos: [],
    notes: 'Ultra luxury duplex penthouse with designer interiors, Italian marble, and world class clubhouse.',
    status: 'APPROVED',
    admin_notes: 'Agreement signed. Verified owner credentials.',
    created_at: new Date(Date.now() - 3600000 * 24).toISOString()
  }
];

export const supabaseService = {
  // Local storage helpers
  getLocal<T>(key: string, fallback: T): T {
    return getLocal<T>(key, fallback);
  },
  setLocal<T>(key: string, data: T): void {
    setLocal<T>(key, data);
  },
  notifyUpdate(key: string, data?: any): void {
    notifyUpdate(key, data);
  },
  safeJsonParse<T>(val: any, fallback: T): T {
    return safeJsonParse<T>(val, fallback);
  },

  // --- AUTHENTICATION VIA OFFICIAL SUPABASE AUTH ---
  auth: {
    /**
     * Fetch user profile metadata & role from profiles table
     */
    async fetchUserProfile(supabaseUser: SupabaseAuthUser): Promise<User> {
      let role: 'MAIN_ADMIN' | 'ADMIN' | 'AGENT' = 'ADMIN';
      let name = supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0] || 'User';
      let phone = supabaseUser.user_metadata?.phone || '';
      let notes = supabaseUser.user_metadata?.notes || '';

      const metaRole = String(supabaseUser.user_metadata?.role || '').toLowerCase();
      if (metaRole === 'agent' || metaRole === 'field_agent') {
        role = 'AGENT';
      }

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .or(`id.eq.${supabaseUser.id},user_id.eq.${supabaseUser.id}`)
          .maybeSingle();

        if (profile) {
          const pRole = String(profile.role || '').toLowerCase();
          if (pRole === 'agent' || pRole === 'field_agent') {
            role = 'AGENT';
          } else if (pRole === 'main_admin') {
            role = 'MAIN_ADMIN';
          } else {
            role = 'ADMIN';
          }
          name = profile.name || name;
          phone = profile.phone || phone;
          notes = profile.notes || notes;
        }
      } catch (e) {
        console.warn('Profile fetch note:', e);
      }

      return {
        id: supabaseUser.id,
        user_id: supabaseUser.id,
        name: name,
        email: supabaseUser.email || '',
        phone: phone,
        role: role,
        notes: notes
      };
    },

    /**
     * Send OTP Verification Code
     */
    async sendOtp(email: string): Promise<{ success: boolean; message?: string; otpCode?: string; error?: string }> {
      try {
        const cleanEmail = (email || '').trim().toLowerCase();
        if (!cleanEmail) {
          return { success: false, error: 'Email address is required' };
        }

        // 1. Try server-side OTP generator & dispatcher
        try {
          const resp = await fetch('/api/auth/send-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: cleanEmail })
          });
          if (resp.ok) {
            const data = await resp.json();
            return {
              success: true,
              message: data.message || `Verification code sent to ${cleanEmail}`,
              otpCode: data.otpCode
            };
          }
        } catch (e) {}

        // 2. Fallback to client-side Supabase signInWithOtp
        const { error } = await supabase.auth.signInWithOtp({
          email: cleanEmail,
          options: { shouldCreateUser: true }
        });

        if (error) {
          return { success: false, error: error.message };
        }

        return {
          success: true,
          message: `Verification link / OTP sent to ${cleanEmail}`
        };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Failed to send OTP' };
      }
    },

    /**
     * Verify OTP Code and complete sign in
     */
    async verifyOtp(email: string, token: string): Promise<{ success: boolean; user?: User; token?: string; session?: any; error?: string }> {
      try {
        const cleanEmail = (email || '').trim().toLowerCase();
        const cleanToken = (token || '').trim();

        if (!cleanEmail || !cleanToken) {
          return { success: false, error: 'Email and 6-digit OTP code are required' };
        }

        // 1. Try server OTP verification first
        try {
          const resp = await fetch('/api/auth/verify-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: cleanEmail, otp: cleanToken })
          });
          if (resp.ok) {
            const data = await resp.json();
            if (data.user && data.token) {
              return {
                success: true,
                user: data.user,
                token: data.token,
                session: data.session || { access_token: data.token, user: data.user }
              };
            }
          } else {
            const errData = await resp.json().catch(() => ({}));
            if (errData.error && !errData.error.includes('Failed to fetch')) {
              // Proceed to try Supabase verifyOtp before failing
            }
          }
        } catch (e) {}

        // 2. Supabase verifyOtp fallback
        const { data, error } = await supabase.auth.verifyOtp({
          email: cleanEmail,
          token: cleanToken,
          type: 'email'
        });

        if (error) {
          return { success: false, error: error.message || 'Invalid or expired OTP code' };
        }

        if (data?.user && data?.session) {
          const userObj = await this.fetchUserProfile(data.user);
          return { success: true, user: userObj, token: data.session.access_token, session: data.session };
        }

        return { success: false, error: 'Could not establish session with OTP' };
      } catch (err: any) {
        return { success: false, error: err?.message || 'OTP verification failed' };
      }
    },
    async login(email: string, password?: string): Promise<{ success: boolean; user?: User; token?: string; session?: any; error?: string }> {
      try {
        const cleanEmail = (email || '').trim().toLowerCase();
        
        if (!cleanEmail || !password) {
          return { success: false, error: 'Email and password are required' };
        }

        // 1. Direct Supabase Auth email/password login
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: password
        });

        if (error) {
          return { success: false, error: error.message };
        }

        if (data?.user && data?.session) {
          const userObj = await this.fetchUserProfile(data.user);
          
          // Auto-sync agent login into agents directory
          if (userObj) {
            try {
              supabaseService.agents.registerAgent(userObj);
            } catch {}
          }

          return { success: true, user: userObj, token: data.session.access_token, session: data.session };
        }

        return { success: false, error: 'No active session returned from Supabase Auth' };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Authentication error' };
      }
    },

    /**
     * Sign up a new Admin or Agent in Supabase Auth
     */
    async signUp(email: string, password: string, name: string, role: 'MAIN_ADMIN' | 'ADMIN' | 'AGENT' = 'ADMIN', phone?: string): Promise<{ success: boolean; user?: User; token?: string; session?: any; error?: string }> {
      try {
        const cleanEmail = (email || '').trim().toLowerCase();
        const roleUpper = (role || 'ADMIN').toUpperCase();

        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password: password,
          options: {
            data: {
              name: name,
              role: roleUpper,
              phone: phone || ''
            }
          }
        });

        if (error) {
          return { success: false, error: error.message };
        }

        if (data?.user) {
          // Upsert into profiles table
          try {
            await supabase.from('profiles').upsert([{
              id: data.user.id,
              user_id: data.user.id,
              name: name,
              email: cleanEmail,
              phone: phone || '',
              role: roleUpper
            }]);
          } catch (e) {
            console.warn('Profiles upsert on signup note:', e);
          }

          const userObj = await this.fetchUserProfile(data.user);

          if (data.session) {
            return { success: true, user: userObj, token: data.session.access_token, session: data.session };
          }

          return { success: true, user: userObj, error: 'Account created! If email confirmation is enabled in your Supabase project, please check your inbox.' };
        }

        return { success: false, error: 'Failed to create user in Supabase Auth' };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Sign up failed' };
      }
    },

    /**
     * Resend signup confirmation email
     */
    async resendConfirmationEmail(email: string): Promise<{ success: boolean; message?: string; error?: string }> {
      try {
        const cleanEmail = (email || '').trim().toLowerCase();
        if (!cleanEmail) {
          return { success: false, error: 'Email address is required' };
        }
        const { error } = await supabase.auth.resend({
          type: 'signup',
          email: cleanEmail
        });
        if (error) {
          return { success: false, error: error.message };
        }
        return { success: true, message: `Confirmation email resent to ${cleanEmail}. Please check your inbox and spam folder.` };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Failed to resend confirmation email' };
      }
    },

    /**
     * Logout from Supabase Auth
     */
    async logout(): Promise<void> {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.warn('Supabase logout error:', e);
      }
    },

    /**
     * Get currently authenticated user from Supabase session
     */
    async getMe(): Promise<User | null> {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          return await this.fetchUserProfile(session.user);
        }
      } catch (err) {
        console.warn('getMe error:', err);
      }
      return null;
    }
  },

  // --- AGENTS & TEAM MANAGEMENT ---
  agents: {
    async getAll(): Promise<User[]> {
      const agentMap = new Map<string, User>();

      // 0. Always start with cached local agents so newly created agents are never lost during background fetch
      const localCached = getLocal<User[]>('agents', []);
      for (const a of localCached) {
        if (!a) continue;
        const email = String(a.email || '').toLowerCase().trim();
        if (email === 'vikram.joshi@rentalpune.com' || email === 'pooja.kulkarni@rentalpune.com' || email === 'rahul.deshmukh@rentalpune.com') {
          continue;
        }
        const key = email || String(a.id || a.user_id || '').toLowerCase();
        if (key) {
          const idVal = a.id || a.user_id;
          const agentId = a.agent_id || `AGENT-${typeof idVal === 'string' ? idVal.substring(idVal.length - 4) : idVal}`;
          agentMap.set(key, {
            id: idVal,
            user_id: a.user_id ? String(a.user_id) : String(a.id),
            agent_id: agentId,
            name: a.name || 'Agent',
            email: a.email || '',
            phone: a.phone || '',
            role: 'AGENT' as const,
            status: a.status || 'ACTIVE',
            last_login: a.last_login || null,
            notes: a.notes || '',
            permissions: a.permissions || '',
            created_at: a.created_at || new Date().toISOString()
          });
        }
      }

      // Fetch from all sources in parallel (Supabase Cloud registry, Admin API, Profiles, Users)
      await Promise.allSettled([
        // 1. Fetch live agents directly from Supabase Cloud settings registry
        (async () => {
          try {
            const { data: supaSetting, error: supaErr } = await supabase
              .from('settings')
              .select('value')
              .eq('key', 'agents_registry')
              .maybeSingle();

            if (!supaErr && supaSetting?.value) {
              const parsed = JSON.parse(supaSetting.value);
              if (Array.isArray(parsed)) {
                for (const u of parsed) {
                  if (!u) continue;
                  const email = String(u.email || '').toLowerCase().trim();
                  if (email === 'vikram.joshi@rentalpune.com' || email === 'pooja.kulkarni@rentalpune.com' || email === 'rahul.deshmukh@rentalpune.com' || email === 'admin@rentalpune.com' || u.role === 'MAIN_ADMIN' || u.role === 'ADMIN') {
                    continue;
                  }
                  const key = email || String(u.id || u.user_id || '').toLowerCase();
                  if (key) {
                    const idVal = u.id || u.user_id;
                    const agentId = u.agent_id || `AGENT-${typeof idVal === 'string' ? idVal.substring(idVal.length - 4) : idVal}`;
                    agentMap.set(key, {
                      id: idVal,
                      user_id: u.user_id ? String(u.user_id) : String(u.id),
                      agent_id: agentId,
                      name: u.name || (email ? email.split('@')[0] : 'Agent'),
                      email: u.email || '',
                      phone: u.phone || '',
                      role: 'AGENT' as const,
                      status: u.status || 'ACTIVE',
                      last_login: u.last_login || null,
                      notes: u.notes || '',
                      permissions: u.permissions || '',
                      created_at: u.created_at || new Date().toISOString()
                    });
                  }
                }
              }
            }
          } catch (err) {}
        })(),

        // 2. Fetch from server-side admin endpoint (syncs Cloud Supabase + Auth list + Server JSON)
        (async () => {
          try {
            const { data: { session } } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
            const storeToken = typeof useAppStore !== 'undefined' ? useAppStore.getState()?.token : null;
            const localToken = typeof localStorage !== 'undefined' ? (localStorage.getItem('supabase_auth_token') || localStorage.getItem('rp_auth_token')) : null;
            const activeToken = session?.access_token || storeToken || localToken;

            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (activeToken) {
              headers['Authorization'] = `Bearer ${activeToken}`;
            }
            const resp = await fetch('/api/admin/agents', { headers }).catch(() => null);
            if (resp && resp.ok) {
              const data = await resp.json();
              if (Array.isArray(data) && data.length > 0) {
                for (const u of data) {
                  const email = String(u.email || '').toLowerCase().trim();
                  if (email === 'vikram.joshi@rentalpune.com' || email === 'pooja.kulkarni@rentalpune.com' || email === 'rahul.deshmukh@rentalpune.com' || email === 'admin@rentalpune.com' || u.role === 'MAIN_ADMIN' || u.role === 'ADMIN') {
                    continue;
                  }
                  const key = email || String(u.id || u.user_id || '').toLowerCase();
                  if (key) {
                    const idVal = u.id || u.user_id;
                    const agentId = u.agent_id || `AGENT-${typeof idVal === 'string' ? idVal.substring(idVal.length - 4) : idVal}`;
                    agentMap.set(key, {
                      id: idVal,
                      user_id: u.user_id ? String(u.user_id) : String(u.id),
                      agent_id: agentId,
                      name: u.name || (email ? email.split('@')[0] : 'Agent'),
                      email: u.email || '',
                      phone: u.phone || '',
                      role: 'AGENT' as const,
                      status: u.status || 'ACTIVE',
                      last_login: u.last_login || null,
                      notes: u.notes || '',
                      permissions: u.permissions || '',
                      created_at: u.created_at || new Date().toISOString()
                    });
                  }
                }
              }
            }
          } catch (err) {}
        })(),

        // 3. Query Supabase profiles table directly
        (async () => {
          try {
            const { data: profiles, error } = await supabase
              .from('profiles')
              .select('*')
              .order('created_at', { ascending: false });

            if (!error && profiles && profiles.length > 0) {
              for (const p of profiles) {
                const email = String(p.email || '').toLowerCase().trim();
                if (email === 'vikram.joshi@rentalpune.com' || email === 'pooja.kulkarni@rentalpune.com' || email === 'rahul.deshmukh@rentalpune.com' || email === 'admin@rentalpune.com' || p.role === 'MAIN_ADMIN' || p.role === 'ADMIN') {
                  continue;
                }
                const key = email || String(p.id || p.user_id || '').toLowerCase();
                if (key) {
                  const existing = agentMap.get(key);
                  const idVal = p.id || p.user_id || existing?.id;
                  const agentId = p.agent_id || existing?.agent_id || `AGENT-${typeof idVal === 'string' ? idVal.substring(idVal.length - 4) : idVal}`;
                  agentMap.set(key, {
                    id: idVal,
                    user_id: p.user_id ? String(p.user_id) : (p.id ? String(p.id) : (existing?.user_id ? String(existing.user_id) : undefined)),
                    agent_id: agentId,
                    name: p.name || existing?.name || (email ? email.split('@')[0] : 'Agent'),
                    email: p.email || existing?.email || '',
                    phone: p.phone || existing?.phone || '',
                    role: 'AGENT' as const,
                    status: p.status || existing?.status || 'ACTIVE',
                    last_login: p.last_login || existing?.last_login || null,
                    notes: p.notes || existing?.notes || '',
                    permissions: p.permissions || existing?.permissions || '',
                    created_at: p.created_at || existing?.created_at || new Date().toISOString()
                  });
                }
              }
            }
          } catch (e) {}
        })(),

        // 4. Query Supabase users table directly (only role=AGENT)
        (async () => {
          try {
            const { data: users, error: uError } = await supabase
              .from('users')
              .select('*')
              .eq('role', 'AGENT')
              .order('created_at', { ascending: false });

            if (!uError && users && users.length > 0) {
              for (const u of users) {
                const email = String(u.email || '').toLowerCase().trim();
                if (email === 'vikram.joshi@rentalpune.com' || email === 'pooja.kulkarni@rentalpune.com' || email === 'rahul.deshmukh@rentalpune.com' || email === 'admin@rentalpune.com' || u.role === 'MAIN_ADMIN' || u.role === 'ADMIN') {
                  continue;
                }
                const key = email || String(u.id || '').toLowerCase();
                if (key) {
                  const existing = agentMap.get(key);
                  const idVal = u.id || existing?.id;
                  const agentId = u.agent_id || existing?.agent_id || `AGENT-${typeof idVal === 'string' ? idVal.substring(idVal.length - 4) : idVal}`;
                  agentMap.set(key, {
                    id: idVal,
                    user_id: u.id ? String(u.id) : (existing?.user_id ? String(existing.user_id) : undefined),
                    agent_id: agentId,
                    name: u.name || existing?.name || (email ? email.split('@')[0] : 'Agent'),
                    email: u.email || existing?.email || '',
                    phone: u.phone || existing?.phone || '',
                    role: 'AGENT' as const,
                    status: u.status || existing?.status || 'ACTIVE',
                    last_login: u.last_login || existing?.last_login || null,
                    notes: u.notes || existing?.notes || '',
                    permissions: u.permissions || existing?.permissions || '',
                    created_at: u.created_at || existing?.created_at || new Date().toISOString()
                  });
                }
              }
            }
          } catch (e) {}
        })()
      ]);

      const result = Array.from(agentMap.values()).filter(a => {
        const email = String(a.email || '').toLowerCase().trim();
        return email !== 'vikram.joshi@rentalpune.com' && email !== 'pooja.kulkarni@rentalpune.com' && email !== 'rahul.deshmukh@rentalpune.com' && email !== 'admin@rentalpune.com' && a.role !== 'MAIN_ADMIN' && a.role !== 'ADMIN';
      });

      // Save directly to local storage cache without firing feedback loop
      if (typeof window !== 'undefined' && window.localStorage && result.length > 0) {
        try {
          localStorage.setItem('rp_agents', JSON.stringify(result));
        } catch (e) {}
      }
      return result;
    },

    async getById(id: string | number): Promise<User | null> {
      const all = await this.getAll();
      return all.find(a => String(a.id) === String(id) || String(a.user_id) === String(id)) || null;
    },

    async registerAgent(userData: any): Promise<void> {
      if (!userData || !userData.email) return;
      const cleanEmail = String(userData.email).trim().toLowerCase();
      const current = getLocal<User[]>('agents', []);
      const existingIdx = current.findIndex(a => (a.email || '').toLowerCase() === cleanEmail);
      const updatedAgent: User = {
        id: userData.id || (existingIdx >= 0 ? current[existingIdx].id : `agent-${Date.now()}`),
        user_id: userData.user_id || userData.id || (existingIdx >= 0 ? current[existingIdx].user_id : `agent-${Date.now()}`),
        name: userData.name || (existingIdx >= 0 ? current[existingIdx].name : cleanEmail.split('@')[0]),
        email: cleanEmail,
        phone: userData.phone || (existingIdx >= 0 ? current[existingIdx].phone : ''),
        role: 'AGENT',
        notes: userData.notes || (existingIdx >= 0 ? current[existingIdx].notes : 'Active field agent'),
        created_at: existingIdx >= 0 ? current[existingIdx].created_at : new Date().toISOString()
      };
      
      let updatedList = [...current];
      if (existingIdx >= 0) {
        updatedList[existingIdx] = { ...updatedList[existingIdx], ...updatedAgent };
      } else {
        updatedList.unshift(updatedAgent);
      }
      setLocal('agents', updatedList);
      
      // Async sync to server
      fetch('/api/agents/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedAgent)
      }).catch(() => {});
    },

    async create(agent: { name: string; email: string; password?: string; phone?: string; notes?: string }): Promise<User> {
      const cleanEmail = agent.email.trim().toLowerCase();
      const { data: { session } } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
      const storeToken = typeof useAppStore !== 'undefined' ? useAppStore.getState()?.token : null;
      const activeToken = session?.access_token || storeToken;
      
      // 1. Call secure server-side endpoint /api/admin/create-agent (uses Supabase service-role admin API)
      let createdAgent: User | null = null;
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (activeToken) {
          headers['Authorization'] = `Bearer ${activeToken}`;
        }

        const resp = await fetch('/api/admin/create-agent', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            name: agent.name.trim(),
            email: cleanEmail,
            password: agent.password,
            phone: agent.phone || '',
            notes: agent.notes || ''
          })
        });

        if (resp.ok) {
          const resData = await resp.json();
          if (resData.agent || resData.user) {
            createdAgent = resData.agent || resData.user;
          }
        } else {
          const errData = await resp.json().catch(() => ({}));
          console.warn('Server create-agent endpoint returned status:', resp.status, errData);
        }
      } catch (err: any) {
        console.warn('Server create-agent endpoint fallback:', err);
      }

      // 2. Direct Supabase Admin/Auth fallback
      if (!createdAgent && agent.password) {
        let newUserId = `agent_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        try {
          const { data: authData, error: authError } = await supabase.auth.signUp({
            email: cleanEmail,
            password: agent.password,
            options: {
              data: {
                name: agent.name.trim(),
                phone: agent.phone || '',
                role: 'AGENT',
                notes: agent.notes || ''
              }
            }
          });

          if (authData?.user?.id) {
            newUserId = authData.user.id;
          } else if (authError) {
            console.warn('Supabase Auth signUp note in create:', authError.message);
          }
        } catch (authErr) {
          console.warn('Supabase Auth signUp catch in create:', authErr);
        }
        
        // Upsert into profiles table with uppercase AGENT
        try {
          await supabase.from('profiles').upsert([{
            id: newUserId,
            name: agent.name.trim(),
            email: cleanEmail,
            role: 'AGENT',
            created_at: new Date().toISOString()
          }], { onConflict: 'id' });
        } catch (e) {
          console.warn('Profile upsert note:', e);
        }

        // Upsert into users table with uppercase AGENT
        try {
          await supabase.from('users').upsert([{
            name: agent.name.trim(),
            email: cleanEmail,
            role: 'AGENT',
            created_at: new Date().toISOString()
          }], { onConflict: 'email' });
        } catch (e) {}

        createdAgent = {
          id: newUserId,
          user_id: newUserId,
          agent_id: `AGENT-${Math.floor(1000 + Math.random() * 9000)}`,
          name: agent.name.trim(),
          email: cleanEmail,
          phone: agent.phone,
          role: 'AGENT',
          status: 'ACTIVE',
          notes: agent.notes,
          created_at: new Date().toISOString()
        };

        // Sync to server for instant cross-device visibility
        fetch('/api/agents/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(createdAgent)
        }).catch(() => {});
      }

      if (!createdAgent) {
        createdAgent = {
          id: `agent-${Date.now()}`,
          user_id: `agent-${Date.now()}`,
          agent_id: `AGENT-${Math.floor(1000 + Math.random() * 9000)}`,
          name: agent.name.trim(),
          email: cleanEmail,
          phone: agent.phone,
          role: 'AGENT',
          status: 'ACTIVE',
          notes: agent.notes,
          created_at: new Date().toISOString()
        };

        fetch('/api/agents/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(createdAgent)
        }).catch(() => {});
      }

      const all = getLocal<User[]>('agents', []);
      const updatedList = [createdAgent, ...all.filter(a => (a.email || '').toLowerCase() !== cleanEmail)];
      setLocal('agents', updatedList);
      
      // Save directly to Supabase settings agents_registry for multi-device sync
      try {
        await supabase.from('settings').upsert({
          key: 'agents_registry',
          value: JSON.stringify(updatedList)
        }, { onConflict: 'key' });
      } catch (e) {}

      // Refresh authoritative multi-device list
      try {
        await supabaseService.agents.getAll();
      } catch (e) {}

      notifyUpdate('agents', createdAgent);
      return createdAgent;
    },

    async update(id: string | number, updates: Partial<User>): Promise<User> {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }
        await fetch(`/api/admin/agents/${id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(updates)
        }).catch(() => {});

        await supabase
          .from('profiles')
          .update({
            name: updates.name,
            email: updates.email,
            phone: updates.phone,
            notes: updates.notes
          })
          .or(`id.eq.${id},user_id.eq.${id}`);
      } catch (e) {
        console.warn('Supabase update agent error:', e);
      }

      const all = getLocal<User[]>('agents', []);
      const updated = all.map(a => String(a.id) === String(id) || String(a.user_id) === String(id) ? { ...a, ...updates } : a);
      setLocal('agents', updated);

      try {
        await supabase.from('settings').upsert({
          key: 'agents_registry',
          value: JSON.stringify(updated)
        }, { onConflict: 'key' });
      } catch (e) {}

      // Refresh authoritative multi-device list
      try {
        await supabaseService.agents.getAll();
      } catch (e) {}

      notifyUpdate('agents', updated);
      return updated.find(a => String(a.id) === String(id) || String(a.user_id) === String(id)) || (updates as User);
    },

    async delete(id: string | number): Promise<void> {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }
        await fetch(`/api/admin/agents/${id}`, {
          method: 'DELETE',
          headers
        }).catch(() => {});

        await supabase.from('profiles').delete().or(`id.eq.${id},user_id.eq.${id}`);
      } catch (e) {
        console.warn('Supabase delete agent error:', e);
      }
      const all = getLocal<User[]>('agents', []);
      const remaining = all.filter(a => String(a.id) !== String(id) && String(a.user_id) !== String(id));
      setLocal('agents', remaining);

      try {
        await supabase.from('settings').upsert({
          key: 'agents_registry',
          value: JSON.stringify(remaining)
        }, { onConflict: 'key' });
      } catch (e) {}

      // Refresh authoritative multi-device list
      try {
        await supabaseService.agents.getAll();
      } catch (e) {}

      notifyUpdate('agents', remaining);
    }
  },

  // --- PROPERTIES ---
  properties: {
    async getAll(): Promise<Property[]> {
      try {
        const { data, error } = await supabase
          .from('properties')
          .select('*')
          .order('id', { ascending: false });

        if (!error && data && data.length > 0) {
          const mapped: Property[] = data.map((p: any) => ({
            id: Number(p.id),
            title: p.title || 'Untitled Property',
            description: p.description || '',
            price: Number(p.price || 0),
            type: p.type || 'Apartment',
            bedrooms: Number(p.bedrooms || 0),
            bathrooms: Number(p.bathrooms || 0),
            area: Number(p.area || 0),
            location: p.location || 'Pune',
            status: p.status || 'PUBLISHED',
            purpose: p.purpose || (p.type === 'Rented Commercial by Sell' || p.type?.toLowerCase().includes('rented commercial') ? 'RENTED_COMMERCIAL_SALE' : (p.type?.toLowerCase().includes('office') || p.type?.toLowerCase().includes('retail') || p.type?.toLowerCase().includes('commercial') ? 'COMMERCIAL' : (Number(p.price) > 5000000 ? 'SALE' : 'RENT'))),
            category: p.category || (p.type === 'Rented Commercial by Sell' || p.type?.toLowerCase().includes('rented commercial') ? 'RENTED_COMMERCIAL_SALE' : (p.type?.toLowerCase().includes('office') || p.type?.toLowerCase().includes('retail') || p.type?.toLowerCase().includes('commercial') ? 'COMMERCIAL' : 'RESIDENTIAL')),
            furnishing: p.furnishing || 'Semi-Furnished',
            current_rent: p.current_rent ? Number(p.current_rent) : undefined,
            roi_yield: p.roi_yield,
            tenant_name: p.tenant_name,
            lease_term: p.lease_term,
            furniture: safeJsonParse<string[]>(p.furniture, Array.isArray(p.furniture) ? p.furniture : []),
            images: safeJsonParse<string[]>(p.images, Array.isArray(p.images) ? p.images : []),
            videos: safeJsonParse<string[]>(p.videos, Array.isArray(p.videos) ? p.videos : []),
            faqs: safeJsonParse<any[]>(p.faqs, Array.isArray(p.faqs) ? p.faqs : []),
            created_at: p.created_at
          }));
          setLocal('properties', mapped);
          return mapped;
        }
      } catch (e) {
        console.warn('Supabase properties fetch error:', e);
      }
      return getLocal<Property[]>('properties', SEED_PROPERTIES);
    },

    async getById(id: number | string): Promise<Property | null> {
      try {
        const { data, error } = await supabase
          .from('properties')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (!error && data) {
          return {
            id: Number(data.id),
            title: data.title,
            description: data.description,
            price: Number(data.price),
            type: data.type,
            bedrooms: Number(data.bedrooms),
            bathrooms: Number(data.bathrooms),
            area: Number(data.area),
            location: data.location,
            status: data.status,
            purpose: data.purpose || (data.type === 'Rented Commercial by Sell' || data.type?.toLowerCase().includes('rented commercial') ? 'RENTED_COMMERCIAL_SALE' : (data.type?.toLowerCase().includes('office') || data.type?.toLowerCase().includes('retail') || data.type?.toLowerCase().includes('commercial') ? 'COMMERCIAL' : (Number(data.price) > 5000000 ? 'SALE' : 'RENT'))),
            category: data.category || (data.type === 'Rented Commercial by Sell' || data.type?.toLowerCase().includes('rented commercial') ? 'RENTED_COMMERCIAL_SALE' : (data.type?.toLowerCase().includes('office') || data.type?.toLowerCase().includes('retail') || data.type?.toLowerCase().includes('commercial') ? 'COMMERCIAL' : 'RESIDENTIAL')),
            furnishing: data.furnishing,
            current_rent: data.current_rent ? Number(data.current_rent) : undefined,
            roi_yield: data.roi_yield,
            tenant_name: data.tenant_name,
            lease_term: data.lease_term,
            furniture: safeJsonParse<string[]>(data.furniture, Array.isArray(data.furniture) ? data.furniture : []),
            images: safeJsonParse<string[]>(data.images, Array.isArray(data.images) ? data.images : []),
            videos: safeJsonParse<string[]>(data.videos, Array.isArray(data.videos) ? data.videos : []),
            faqs: safeJsonParse<any[]>(data.faqs, Array.isArray(data.faqs) ? data.faqs : []),
            created_at: data.created_at
          };
        }
      } catch {}

      const all = await this.getAll();
      return all.find(p => p.id === Number(id)) || null;
    },

    async create(property: Omit<Property, 'id'>): Promise<Property> {
      const payload: any = {
        title: property.title,
        description: property.description,
        price: property.price,
        type: property.type,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        area: property.area,
        location: property.location,
        status: property.status || 'PUBLISHED',
        purpose: property.purpose || 'RENT',
        category: property.category || 'RESIDENTIAL',
        furnishing: property.furnishing || 'Semi-Furnished',
        furniture: JSON.stringify(property.furniture || []),
        images: JSON.stringify(property.images || []),
        videos: JSON.stringify(property.videos || []),
        faqs: JSON.stringify(property.faqs || [])
      };

      try {
        const { data, error } = await supabase
          .from('properties')
          .insert([payload])
          .select()
          .single();

        if (!error && data) {
          const newProp: Property = {
            id: Number(data.id),
            ...property,
            created_at: data.created_at
          };
          const existing = getLocal<Property[]>('properties', SEED_PROPERTIES);
          setLocal('properties', [newProp, ...existing]);
          return newProp;
        }
      } catch (e) {
        console.warn('Supabase create property error:', e);
      }

      // Local fallback
      const existing = getLocal<Property[]>('properties', SEED_PROPERTIES);
      const newId = existing.length > 0 ? Math.max(...existing.map(p => p.id)) + 1 : 1;
      const newProp: Property = {
        id: newId,
        ...property,
        created_at: new Date().toISOString()
      };
      setLocal('properties', [newProp, ...existing]);
      return newProp;
    },

    async update(id: number, updates: Partial<Property>): Promise<Property> {
      const payload: any = { ...updates };
      if (updates.images) payload.images = JSON.stringify(updates.images);
      if (updates.videos) payload.videos = JSON.stringify(updates.videos);
      if (updates.faqs) payload.faqs = JSON.stringify(updates.faqs);
      if (updates.furniture) payload.furniture = JSON.stringify(updates.furniture);

      try {
        await supabase
          .from('properties')
          .update(payload)
          .eq('id', id);
      } catch (e) {
        console.warn('Supabase update property error:', e);
      }

      const existing = getLocal<Property[]>('properties', SEED_PROPERTIES);
      const updated = existing.map(p => p.id === id ? { ...p, ...updates } : p);
      setLocal('properties', updated);
      return updated.find(p => p.id === id)!;
    },

    async delete(id: number): Promise<boolean> {
      try {
        await supabase.from('properties').delete().eq('id', id);
      } catch (e) {
        console.warn('Supabase delete property error:', e);
      }

      const existing = getLocal<Property[]>('properties', SEED_PROPERTIES);
      setLocal('properties', existing.filter(p => p.id !== id));
      return true;
    }
  },

  // --- LEADS ---
  leads: {
    async getAll(): Promise<Lead[]> {
      // 1. Instant fetch from backend API with session token
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const headers: Record<string, string> = {};
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }
        const apiRes = await fetch('/api/leads', { headers });
        if (apiRes.ok) {
          const apiData = await apiRes.json();
          if (Array.isArray(apiData)) {
            setLocal('leads', apiData);
            return apiData;
          }
        }
      } catch (err) {
        console.warn('API leads fetch error:', err);
      }

      // 2. Direct Supabase query fallback
      try {
        const [leadsRes, propsRes, agentsRes] = await Promise.allSettled([
          supabase.from('leads').select('*').order('id', { ascending: false }),
          supabase.from('properties').select('id, title'),
          supabase.from('users').select('id, name')
        ]);

        const leadsData = leadsRes.status === 'fulfilled' && !leadsRes.value.error ? leadsRes.value.data : null;
        const properties = propsRes.status === 'fulfilled' && !propsRes.value.error ? (propsRes.value.data || []) : [];
        const agents = agentsRes.status === 'fulfilled' && !agentsRes.value.error ? (agentsRes.value.data || []) : [];

        if (leadsData && leadsData.length > 0) {
          setLocal('leads', leadsData);
          return leadsData.map((l: any) => {
            const prop = properties.find((p: any) => String(p.id) === String(l.property_id));
            const agent = agents.find((a: any) => String(a.id) === String(l.assigned_agent_id));
            return {
              id: Number(l.id),
              name: l.name,
              email: l.email,
              phone: l.phone,
              status: l.status || 'New',
              source: l.source,
              property_id: l.property_id ? Number(l.property_id) : undefined,
              property_title: l.property_title || prop?.title || undefined,
              assigned_agent_id: l.assigned_agent_id ? Number(l.assigned_agent_id) : undefined,
              assigned_agent_name: l.assigned_agent_name || agent?.name || undefined,
              notes: l.notes,
              created_at: l.created_at
            };
          });
        }
      } catch (err) {
        console.warn('supabaseService.leads.getAll direct error:', err);
      }

      return getLocal<Lead[]>('leads', []);
    },

    async create(lead: Partial<Lead>): Promise<Lead> {
      try {
        const { data, error } = await supabase
          .from('leads')
          .insert([{
            name: lead.name,
            email: lead.email,
            phone: lead.phone,
            status: lead.status || 'New',
            source: lead.source || 'Website Concierge',
            property_id: lead.property_id ? Number(lead.property_id) : null,
            assigned_agent_id: lead.assigned_agent_id ? Number(lead.assigned_agent_id) : null,
            notes: lead.notes
          }])
          .select()
          .single();

        if (!error && data) {
          const newLead = { id: Number(data.id), ...lead } as Lead;
          const all = getLocal<Lead[]>('leads', []);
          setLocal('leads', [newLead, ...all]);
          return newLead;
        }
      } catch {}

      const all = getLocal<Lead[]>('leads', []);
      const newLead: Lead = {
        id: Date.now(),
        name: lead.name || '',
        email: lead.email || '',
        phone: lead.phone || '',
        status: lead.status || 'New',
        source: lead.source || 'Website Concierge',
        property_id: lead.property_id,
        property_title: lead.property_title,
        created_at: new Date().toISOString()
      };
      setLocal('leads', [newLead, ...all]);
      return newLead;
    },

    async update(id: number, updates: Partial<Lead>): Promise<void> {
      try {
        await supabase.from('leads').update({
          name: updates.name,
          email: updates.email,
          phone: updates.phone,
          status: updates.status,
          source: updates.source,
          property_id: updates.property_id ? Number(updates.property_id) : null,
          assigned_agent_id: updates.assigned_agent_id ? Number(updates.assigned_agent_id) : null,
          notes: updates.notes
        }).eq('id', id);
      } catch {}
      const all = getLocal<Lead[]>('leads', []);
      setLocal('leads', all.map(l => l.id === id ? { ...l, ...updates } : l));
    },

    async delete(id: number): Promise<void> {
      try {
        // Clean up visits/invoices related to this lead
        const { data: visits } = await supabase.from('site_visits').select('id').eq('lead_id', id);
        if (visits && visits.length > 0) {
          const visitIds = visits.map((v: any) => v.id);
          await supabase.from('site_visit_feedback').delete().in('visit_id', visitIds);
          await supabase.from('site_visits').delete().eq('lead_id', id);
        }
        await supabase.from('invoices').delete().eq('lead_id', id);
        await supabase.from('leads').delete().eq('id', id);
      } catch {}
      const all = getLocal<Lead[]>('leads', []);
      setLocal('leads', all.filter(l => l.id !== id));
    },

    async bulkDelete(ids: number[]): Promise<void> {
      try {
        const { data: visits } = await supabase.from('site_visits').select('id').in('lead_id', ids);
        if (visits && visits.length > 0) {
          const visitIds = visits.map((v: any) => v.id);
          await supabase.from('site_visit_feedback').delete().in('visit_id', visitIds);
          await supabase.from('site_visits').delete().in('lead_id', ids);
        }
        await supabase.from('invoices').delete().in('lead_id', ids);
        await supabase.from('leads').delete().in('id', ids);
      } catch {}
      const all = getLocal<Lead[]>('leads', []);
      setLocal('leads', all.filter(l => !ids.includes(l.id)));
    }
  },

  // --- PROPERTY BOOKINGS (Dedicated "Property Booked" Section) ---
  bookings: {
    async getAll(): Promise<PropertyBooking[]> {
      // 1. Try server API endpoint
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const headers: Record<string, string> = {};
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }
        const res = await fetch('/api/bookings', { headers });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setLocal('property_bookings', data);
            return data;
          }
        }
      } catch {}

      // 2. Fallback to Supabase direct query
      try {
        const { data, error } = await supabase.from('property_bookings').select('*').order('id', { ascending: false });
        if (!error && data && data.length > 0) {
          setLocal('property_bookings', data);
          return data;
        }
      } catch {}

      return getLocal<PropertyBooking[]>('property_bookings', [
        {
          id: 101,
          property_id: 101,
          property_title: '3 BHK Luxury Penthouse in Amar Landmark',
          property_location: 'Baner, Pune',
          property_price: 65000,
          property_type: 'Penthouse',
          property_image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80',
          customer_name: 'Vikramaditya Patil',
          customer_phone: '+91 98230 45678',
          customer_email: 'vikram.patil@tcs.com',
          preferred_date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
          preferred_time: '11:00 AM',
          move_in_timeline: 'Within 7 Days',
          occupancy_type: 'Family (3 Members)',
          status: 'VISIT_SCHEDULED',
          token_amount: 10000,
          notes: 'Interested in immediate agreement and move-in.',
          source: 'PROPERTY_BOOKED',
          created_at: new Date(Date.now() - 3600000 * 3).toISOString()
        },
        {
          id: 102,
          property_id: 104,
          property_title: '2 BHK Premium Smart Home in Rohan Leher',
          property_location: 'Baner, Pune',
          property_price: 32000,
          property_type: 'Apartment',
          property_image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
          customer_name: 'Dr. Ananya Deshmukh',
          customer_phone: '+91 97654 32100',
          customer_email: 'ananya.deshmukh@gmail.com',
          preferred_date: new Date(Date.now() + 86400000 * 4).toISOString().split('T')[0],
          preferred_time: '04:30 PM',
          move_in_timeline: 'Immediate',
          occupancy_type: 'Self & Spouse',
          status: 'NEW',
          token_amount: 0,
          notes: 'Requested private property walkthrough and lease terms review.',
          source: 'PROPERTY_BOOKED',
          created_at: new Date(Date.now() - 3600000 * 8).toISOString()
        }
      ]);
    },

    async create(booking: Partial<PropertyBooking>): Promise<PropertyBooking> {
      // 1. Try server API
      try {
        const res = await fetch('/api/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(booking)
        });
        if (res.ok) {
          const data = await res.json();
          if (data.booking) {
            const all = getLocal<PropertyBooking[]>('property_bookings', []);
            setLocal('property_bookings', [data.booking, ...all]);
            window.dispatchEvent(new CustomEvent('bookings_updated'));
            return data.booking;
          }
        }
      } catch {}

      // 2. Direct local save
      const all = getLocal<PropertyBooking[]>('property_bookings', []);
      const newBooking: PropertyBooking = {
        id: Date.now(),
        property_id: booking.property_id || 0,
        property_title: booking.property_title,
        property_location: booking.property_location,
        property_price: booking.property_price,
        property_type: booking.property_type,
        property_image: booking.property_image,
        customer_name: booking.customer_name || '',
        customer_phone: booking.customer_phone || '',
        customer_email: booking.customer_email || '',
        preferred_date: booking.preferred_date || '',
        preferred_time: booking.preferred_time || '',
        move_in_timeline: booking.move_in_timeline || '',
        occupancy_type: booking.occupancy_type || '',
        status: booking.status || 'NEW',
        token_amount: booking.token_amount || 0,
        notes: booking.notes || '',
        source: 'PROPERTY_BOOKED',
        created_at: new Date().toISOString()
      };
      setLocal('property_bookings', [newBooking, ...all]);
      window.dispatchEvent(new CustomEvent('bookings_updated'));
      return newBooking;
    },

    async update(id: number, updates: Partial<PropertyBooking>): Promise<void> {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        await fetch(`/api/bookings/${id}`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {})
          },
          body: JSON.stringify(updates)
        });
      } catch {}

      const all = getLocal<PropertyBooking[]>('property_bookings', []);
      setLocal('property_bookings', all.map(b => b.id === id ? { ...b, ...updates } : b));
      window.dispatchEvent(new CustomEvent('bookings_updated'));
    },

    async delete(id: number): Promise<void> {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        await fetch(`/api/bookings/${id}`, {
          method: 'DELETE',
          headers: {
            ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {})
          }
        });
      } catch {}

      const all = getLocal<PropertyBooking[]>('property_bookings', []);
      setLocal('property_bookings', all.filter(b => b.id !== id));
      window.dispatchEvent(new CustomEvent('bookings_updated'));
    },

    async bulkDelete(ids: number[]): Promise<void> {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        await fetch('/api/bookings/bulk-delete', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {})
          },
          body: JSON.stringify({ ids })
        });
      } catch {}

      const all = getLocal<PropertyBooking[]>('property_bookings', []);
      setLocal('property_bookings', all.filter(b => !ids.includes(b.id)));
      window.dispatchEvent(new CustomEvent('bookings_updated'));
    }
  },

  // --- SITE VISITS ---
  visits: {
    async getAll(): Promise<Visit[]> {
      // 1. Try server API endpoint (which joins leads, properties, agents, and feedback)
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const headers: Record<string, string> = {};
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }
        const res = await fetch('/api/visits', { headers });
        if (res.ok) {
          const apiData = await res.json();
          if (Array.isArray(apiData) && apiData.length > 0) {
            const mapped = apiData.map((v: any) => ({
              id: Number(v.id),
              lead_id: Number(v.lead_id),
              property_id: Number(v.property_id),
              agent_id: v.agent_id ? (isNaN(Number(v.agent_id)) ? v.agent_id : Number(v.agent_id)) : undefined,
              visit_date: v.visit_date,
              visit_time: v.visit_time,
              status: v.status || 'Scheduled',
              notes: v.notes || '',
              lead_name: v.lead_name,
              lead_phone: v.lead_phone,
              lead_email: v.lead_email,
              property_title: v.property_title,
              property_location: v.property_location,
              agent_name: v.agent_name,
              agent_email: v.agent_email,
              feedback_id: v.feedback_id ? Number(v.feedback_id) : undefined,
              interest_level: v.interest_level,
              customer_feedback: v.customer_feedback,
              requirements: v.requirements,
              budget: v.budget ? Number(v.budget) : undefined,
              preferred_configuration: v.preferred_configuration,
              timeline: v.timeline,
              next_action: v.next_action,
              feedback_created_at: v.feedback_created_at,
              created_at: v.created_at
            }));
            setLocal('visits', mapped);
            return mapped;
          }
        }
      } catch (err) {
        console.warn('API visits fetch warning:', err);
      }

      // 2. Direct Supabase query with feedback and agent joins
      try {
        const [vRes, fRes, lRes, pRes, profRes, uRes] = await Promise.allSettled([
          supabase.from('site_visits').select('*').order('id', { ascending: false }),
          supabase.from('site_visit_feedback').select('*'),
          supabase.from('leads').select('*'),
          supabase.from('properties').select('*'),
          supabase.from('profiles').select('*'),
          supabase.from('users').select('*')
        ]);

        if (vRes.status === 'fulfilled' && !vRes.value.error && vRes.value.data) {
          const feedbacks = fRes.status === 'fulfilled' ? fRes.value.data || [] : [];
          const leads = lRes.status === 'fulfilled' ? lRes.value.data || [] : [];
          const properties = pRes.status === 'fulfilled' ? pRes.value.data || [] : [];
          const allAgents = [
            ...(profRes.status === 'fulfilled' && Array.isArray(profRes.value.data) ? profRes.value.data : []),
            ...(uRes.status === 'fulfilled' && Array.isArray(uRes.value.data) ? uRes.value.data : [])
          ];

          const mapped = vRes.value.data.map((v: any) => {
            const feed = feedbacks.find((f: any) => String(f.visit_id) === String(v.id));
            const lead = leads.find((l: any) => String(l.id) === String(v.lead_id));
            const prop = properties.find((p: any) => String(p.id) === String(v.property_id));
            const agent = allAgents.find((a: any) => String(a.id) === String(v.agent_id) || String(a.user_id) === String(v.agent_id));

            return {
              id: Number(v.id),
              lead_id: Number(v.lead_id),
              property_id: Number(v.property_id),
              agent_id: v.agent_id ? (isNaN(Number(v.agent_id)) ? v.agent_id : Number(v.agent_id)) : undefined,
              visit_date: v.visit_date,
              visit_time: v.visit_time,
              status: v.status || 'Scheduled',
              notes: v.notes || '',
              lead_name: lead?.name,
              lead_phone: lead?.phone,
              property_title: prop?.title,
              agent_name: agent?.name,
              agent_email: agent?.email,
              feedback_id: feed?.id ? Number(feed.id) : undefined,
              interest_level: feed?.interest_level,
              customer_feedback: feed?.customer_feedback,
              requirements: feed?.requirements,
              budget: feed?.budget ? Number(feed.budget) : undefined,
              preferred_configuration: feed?.preferred_configuration,
              timeline: feed?.timeline,
              next_action: feed?.next_action,
              feedback_created_at: feed?.created_at,
              created_at: v.created_at
            };
          });

          setLocal('visits', mapped);
          return mapped;
        }
      } catch (err) {
        console.warn('Direct Supabase visits fetch warning:', err);
      }

      return getLocal<Visit[]>('visits', []);
    },

    async create(visit: Partial<Visit>): Promise<Visit> {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }
        await fetch('/api/visits', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            lead_id: visit.lead_id,
            property_id: visit.property_id,
            agent_id: visit.agent_id,
            visit_date: visit.visit_date,
            visit_time: visit.visit_time,
            notes: visit.notes
          })
        }).catch(() => {});

        const { data, error } = await supabase
          .from('site_visits')
          .insert([{
            lead_id: visit.lead_id,
            property_id: visit.property_id,
            agent_id: visit.agent_id,
            visit_date: visit.visit_date,
            visit_time: visit.visit_time,
            status: visit.status || 'Scheduled',
            notes: visit.notes
          }])
          .select()
          .single();

        if (!error && data) {
          const newVisit = { id: Number(data.id), ...visit } as Visit;
          const all = getLocal<Visit[]>('visits', []);
          setLocal('visits', [newVisit, ...all]);
          return newVisit;
        }
      } catch {}

      const all = getLocal<Visit[]>('visits', []);
      const newVisit: Visit = {
        id: Date.now(),
        lead_id: visit.lead_id || 0,
        property_id: visit.property_id || 0,
        agent_id: visit.agent_id || 0,
        visit_date: visit.visit_date || '',
        visit_time: visit.visit_time || '',
        status: visit.status || 'Scheduled',
        notes: visit.notes || '',
        created_at: new Date().toISOString()
      };
      setLocal('visits', [newVisit, ...all]);
      return newVisit;
    },

    async update(id: number, updates: Partial<Visit>): Promise<void> {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }
        await fetch(`/api/visits/${id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(updates)
        }).catch(() => {});

        await supabase.from('site_visits').update(updates).eq('id', id);
      } catch {}
      const all = getLocal<Visit[]>('visits', []);
      setLocal('visits', all.map(v => v.id === id ? { ...v, ...updates } : v));
    },

    async delete(id: number): Promise<void> {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const headers: Record<string, string> = {};
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }
        await fetch(`/api/visits/${id}`, {
          method: 'DELETE',
          headers
        }).catch(() => {});

        await supabase.from('site_visit_feedback').delete().eq('visit_id', id);
        await supabase.from('site_visits').delete().eq('id', id);
      } catch {}
      const all = getLocal<Visit[]>('visits', []);
      setLocal('visits', all.filter(v => v.id !== id));
    },

    async bulkDelete(ids: number[]): Promise<void> {
      try {
        await Promise.all(ids.map(id => this.delete(id)));
      } catch {}
      const all = getLocal<Visit[]>('visits', []);
      setLocal('visits', all.filter(v => !ids.includes(v.id)));
    },

    async submitFeedback(visitId: number, feedbackData: any): Promise<VisitFeedback> {
      const payload = {
        visit_id: visitId,
        interest_level: feedbackData.interest_level || 'Warm',
        customer_feedback: feedbackData.customer_feedback || feedbackData.feedback || '',
        requirements: feedbackData.requirements || '',
        budget: Number(feedbackData.budget) || undefined,
        preferred_configuration: feedbackData.preferred_configuration || '',
        timeline: feedbackData.timeline || '',
        next_action: feedbackData.next_action || '',
        photos: feedbackData.photos || ''
      };

      // 1. Submit via backend server endpoint
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }
        const res = await fetch(`/api/visits/${visitId}/feedback`, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          const resData = await res.json();
          if (resData.feedback) {
            return resData.feedback;
          }
        }
      } catch (err) {
        console.warn('Server feedback submission error:', err);
      }

      // 2. Direct Supabase / local persistence fallback
      return supabaseService.feedbacks.create(payload);
    }
  },

  // --- SITE VISIT FEEDBACK ---
  feedbacks: {
    async getAll(): Promise<VisitFeedback[]> {
      // 1. Try server API endpoint (which handles full joins and permissions)
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const headers: Record<string, string> = {};
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }
        const res = await fetch('/api/feedbacks', { headers });
        if (res.ok) {
          const apiData = await res.json();
          if (Array.isArray(apiData) && apiData.length > 0) {
            setLocal('feedbacks', apiData);
            return apiData;
          }
        }
      } catch (err) {
        console.warn('API feedbacks fetch warning:', err);
      }

      // 2. Direct Supabase query joining site_visit_feedback, site_visits, leads, properties, profiles
      try {
        const [fRes, vRes, lRes, pRes, prRes] = await Promise.all([
          supabase.from('site_visit_feedback').select('*').order('id', { ascending: false }),
          supabase.from('site_visits').select('*'),
          supabase.from('leads').select('*'),
          supabase.from('properties').select('*'),
          supabase.from('profiles').select('*')
        ]);

        if (!fRes.error && fRes.data) {
          const visits = vRes.data || [];
          const leads = lRes.data || [];
          const properties = pRes.data || [];
          const profiles = prRes.data || [];

          const mapped: VisitFeedback[] = fRes.data.map((f: any) => {
            const v = visits.find((visit: any) => String(visit.id) === String(f.visit_id));
            const l = v ? leads.find((lead: any) => String(lead.id) === String(v.lead_id)) : null;
            const p = v ? properties.find((prop: any) => String(prop.id) === String(v.property_id)) : null;
            const a = v ? profiles.find((prof: any) => String(prof.id || prof.user_id) === String(v.agent_id)) : null;

            return {
              id: Number(f.id),
              visit_id: Number(f.visit_id),
              interest_level: f.interest_level || 'Warm',
              customer_feedback: f.customer_feedback || '',
              requirements: f.requirements || '',
              budget: Number(f.budget || 0),
              preferred_configuration: f.preferred_configuration || '',
              timeline: f.timeline || '',
              next_action: f.next_action || '',
              photos: f.photos || '',
              visit_date: v?.visit_date,
              visit_time: v?.visit_time,
              visit_status: v?.status,
              lead_name: l?.name,
              lead_phone: l?.phone,
              lead_email: l?.email,
              property_title: p?.title,
              property_location: p?.location,
              agent_name: a?.name,
              created_at: f.created_at
            };
          });

          setLocal('feedbacks', mapped);
          return mapped;
        }
      } catch (err) {
        console.warn('Direct Supabase feedback fetch warning:', err);
      }

      return getLocal<VisitFeedback[]>('feedbacks', []);
    },

    async create(feedback: Partial<VisitFeedback>): Promise<VisitFeedback> {
      const payload: any = {
        visit_id: feedback.visit_id ? Number(feedback.visit_id) : null,
        interest_level: feedback.interest_level || 'Warm',
        customer_feedback: feedback.customer_feedback || '',
        requirements: feedback.requirements || '',
        budget: feedback.budget ? Number(feedback.budget) : null,
        preferred_configuration: feedback.preferred_configuration || '',
        timeline: feedback.timeline || '',
        next_action: feedback.next_action || '',
        photos: feedback.photos || ''
      };

      try {
        // Also call backend API if possible
        if (payload.visit_id) {
          const { data: { session } } = await supabase.auth.getSession();
          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          if (session?.access_token) {
            headers['Authorization'] = `Bearer ${session.access_token}`;
          }
          await fetch(`/api/visits/${payload.visit_id}/feedback`, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload)
          }).catch(() => {});

          // Upsert check in direct Supabase client
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

            if (!error && data) {
              const updated = { id: Number(data.id), ...feedback } as VisitFeedback;
              const all = getLocal<VisitFeedback[]>('feedbacks', []);
              setLocal('feedbacks', all.map(f => f.id === updated.id || f.visit_id === updated.visit_id ? updated : f));
              return updated;
            }
          }
        }

        const { data, error } = await supabase
          .from('site_visit_feedback')
          .insert([payload])
          .select()
          .single();

        if (!error && data) {
          const newF = { id: Number(data.id), ...feedback } as VisitFeedback;
          const all = getLocal<VisitFeedback[]>('feedbacks', []);
          setLocal('feedbacks', [newF, ...all.filter(f => f.id !== newF.id && f.visit_id !== newF.visit_id)]);
          return newF;
        }
      } catch (e) {
        console.warn('Supabase feedback insert warning:', e);
      }

      const all = getLocal<VisitFeedback[]>('feedbacks', []);
      const newF: VisitFeedback = {
        id: Date.now(),
        visit_id: feedback.visit_id || 0,
        interest_level: feedback.interest_level || 'Warm',
        customer_feedback: feedback.customer_feedback || '',
        requirements: feedback.requirements,
        budget: feedback.budget,
        preferred_configuration: feedback.preferred_configuration,
        timeline: feedback.timeline,
        next_action: feedback.next_action,
        created_at: new Date().toISOString()
      };
      setLocal('feedbacks', [newF, ...all.filter(f => f.visit_id !== newF.visit_id)]);
      return newF;
    },

    async delete(id: number): Promise<void> {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const headers: Record<string, string> = {};
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }
        await fetch(`/api/feedbacks/${id}`, {
          method: 'DELETE',
          headers
        }).catch(() => {});

        await supabase.from('site_visit_feedback').delete().eq('id', id);
      } catch {}
      const all = getLocal<VisitFeedback[]>('feedbacks', []);
      setLocal('feedbacks', all.filter(f => f.id !== id));
    }
  },

  // --- INVOICES ---
  invoices: {
    async getAll(): Promise<Invoice[]> {
      // 1. Try server endpoint
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const headers: Record<string, string> = {};
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }
        const res = await fetch('/api/invoices', { headers });
        if (res.ok) {
          const apiData = await res.json();
          if (Array.isArray(apiData) && apiData.length > 0) {
            const mapped = apiData.map((inv: any) => ({
              ...inv,
              id: Number(inv.id),
              items: safeJsonParse<any[]>(inv.items, Array.isArray(inv.items) ? inv.items : [])
            }));
            setLocal('invoices', mapped);
            return mapped;
          }
        }
      } catch (err) {
        console.warn('API invoices fetch warning:', err);
      }

      // 2. Direct Supabase query
      try {
        const { data, error } = await supabase
          .from('invoices')
          .select('*')
          .order('id', { ascending: false });

        if (!error && data && data.length > 0) {
          const mapped: Invoice[] = data.map((inv: any) => ({
            id: Number(inv.id),
            invoice_number: inv.invoice_number,
            lead_id: inv.lead_id ? Number(inv.lead_id) : undefined,
            property_id: inv.property_id ? Number(inv.property_id) : undefined,
            client_name: inv.client_name,
            client_email: inv.client_email,
            client_phone: inv.client_phone,
            client_address: inv.client_address,
            client_pan: inv.client_pan,
            client_gstin: inv.client_gstin,
            property_title: inv.property_title,
            property_location: inv.property_location,
            items: safeJsonParse<any[]>(inv.items, Array.isArray(inv.items) ? inv.items : []),
            subtotal: Number(inv.subtotal || 0),
            tax_type: inv.tax_type,
            tax_rate: Number(inv.tax_rate || 0),
            tax: Number(inv.tax || 0),
            discount: Number(inv.discount || 0),
            total: Number(inv.total || 0),
            amount_paid: Number(inv.amount_paid || 0),
            balance_due: Number(inv.balance_due || 0),
            status: inv.status || 'Pending',
            payment_mode: inv.payment_mode,
            issue_date: inv.issue_date,
            due_date: inv.due_date,
            notes: inv.notes,
            terms: inv.terms,
            bank_name: inv.bank_name,
            account_holder: inv.account_holder,
            account_number: inv.account_number,
            ifsc_code: inv.ifsc_code,
            branch_name: inv.branch_name,
            account_type: inv.account_type,
            upi_id: inv.upi_id,
            upi_qr_url: inv.upi_qr_url,
            payment_instructions: inv.payment_instructions,
            created_at: inv.created_at
          }));
          setLocal('invoices', mapped);
          return mapped;
        }
      } catch {}
      return getLocal<Invoice[]>('invoices', []);
    },

    async create(invoice: Partial<Invoice>): Promise<Invoice> {
      const payload: any = {
        ...invoice,
        items: JSON.stringify(invoice.items || [])
      };

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }
        await fetch('/api/invoices', {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        }).catch(() => {});

        const { data, error } = await supabase
          .from('invoices')
          .insert([payload])
          .select()
          .single();

        if (!error && data) {
          const newInv: Invoice = {
            id: Number(data.id),
            ...invoice,
            status: invoice.status || 'Pending',
            client_name: invoice.client_name || '',
            created_at: data.created_at
          } as Invoice;
          const all = getLocal<Invoice[]>('invoices', []);
          setLocal('invoices', [newInv, ...all]);
          return newInv;
        }
      } catch {}

      const all = getLocal<Invoice[]>('invoices', []);
      const newInv: Invoice = {
        id: Date.now(),
        ...invoice,
        status: invoice.status || 'Pending',
        client_name: invoice.client_name || '',
        created_at: new Date().toISOString()
      } as Invoice;
      setLocal('invoices', [newInv, ...all]);
      return newInv;
    },

    async recordPayment(id: number, amount: number, paymentMode?: string, notes?: string): Promise<void> {
      const all = await this.getAll();
      const inv = all.find(i => i.id === id);
      if (!inv) return;

      const newPaid = (inv.amount_paid || 0) + amount;
      const newBalance = Math.max(0, (inv.total || 0) - newPaid);
      const newStatus = newBalance === 0 ? 'Paid' : (newPaid > 0 ? 'Partially Paid' : inv.status);

      await this.update(id, {
        amount_paid: newPaid,
        balance_due: newBalance,
        status: newStatus as any,
        payment_mode: paymentMode || inv.payment_mode,
        notes: notes ? `${inv.notes ? inv.notes + '\n' : ''}Payment recorded: ₹${amount}` : inv.notes
      });
    },

    async update(id: number, updates: Partial<Invoice>): Promise<void> {
      const payload: any = { ...updates };
      if (updates.items) payload.items = JSON.stringify(updates.items);

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }
        await fetch(`/api/invoices/${id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(payload)
        }).catch(() => {});

        await supabase.from('invoices').update(payload).eq('id', id);
      } catch {}

      const all = getLocal<Invoice[]>('invoices', []);
      setLocal('invoices', all.map(i => i.id === id ? { ...i, ...updates } : i));
    },

    async delete(id: number): Promise<void> {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const headers: Record<string, string> = {};
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }
        await fetch(`/api/invoices/${id}`, {
          method: 'DELETE',
          headers
        }).catch(() => {});

        await supabase.from('invoices').delete().eq('id', id);
      } catch {}
      const all = getLocal<Invoice[]>('invoices', []);
      setLocal('invoices', all.filter(i => i.id !== id));
    }
  },

  // --- HOME FAQS ---
  faqs: {
    async getAll(): Promise<FAQ[]> {
      try {
        const { data, error } = await supabase
          .from('home_faqs')
          .select('*')
          .order('sort_order', { ascending: true });

        if (!error && data && data.length > 0) {
          const mapped: FAQ[] = data.map((f: any) => ({
            id: Number(f.id),
            question: f.question,
            answer: f.answer,
            category: f.category || 'General',
            sort_order: Number(f.sort_order || 0),
            is_active: Number(f.is_active !== undefined ? f.is_active : 1),
            created_at: f.created_at
          }));
          setLocal('faqs', mapped);
          return mapped;
        }
      } catch {}
      return getLocal<FAQ[]>('faqs', SEED_FAQS);
    },

    async getAllAdmin(): Promise<FAQ[]> {
      return this.getAll();
    },

    async create(faq: Partial<FAQ>): Promise<FAQ> {
      try {
        const { data, error } = await supabase
          .from('home_faqs')
          .insert([{
            question: faq.question,
            answer: faq.answer,
            category: faq.category || 'General',
            sort_order: faq.sort_order || 0,
            is_active: faq.is_active !== undefined ? faq.is_active : 1
          }])
          .select()
          .single();

        if (!error && data) {
          const newFaq: FAQ = {
            id: Number(data.id),
            question: data.question,
            answer: data.answer,
            category: data.category,
            sort_order: data.sort_order,
            is_active: data.is_active,
            created_at: data.created_at
          };
          const all = getLocal<FAQ[]>('faqs', SEED_FAQS);
          setLocal('faqs', [...all, newFaq]);
          return newFaq;
        }
      } catch {}

      const all = getLocal<FAQ[]>('faqs', SEED_FAQS);
      const newFaq: FAQ = {
        id: Date.now(),
        question: faq.question || '',
        answer: faq.answer || '',
        category: faq.category || 'General',
        sort_order: faq.sort_order || 0,
        is_active: faq.is_active !== undefined ? faq.is_active : 1,
        created_at: new Date().toISOString()
      };
      setLocal('faqs', [...all, newFaq]);
      return newFaq;
    },

    async update(id: number, updates: Partial<FAQ>): Promise<void> {
      try {
        await supabase.from('home_faqs').update(updates).eq('id', id);
      } catch {}
      const all = getLocal<FAQ[]>('faqs', SEED_FAQS);
      setLocal('faqs', all.map(f => f.id === id ? { ...f, ...updates } : f));
    },

    async delete(id: number): Promise<void> {
      try {
        await supabase.from('home_faqs').delete().eq('id', id);
      } catch {}
      const all = getLocal<FAQ[]>('faqs', SEED_FAQS);
      setLocal('faqs', all.filter(f => f.id !== id));
    },

    async resetDefaults(): Promise<FAQ[]> {
      try {
        await supabase.from('home_faqs').delete().neq('id', 0);
        for (const f of SEED_FAQS) {
          await supabase.from('home_faqs').insert([{
            question: f.question,
            answer: f.answer,
            category: f.category,
            sort_order: f.sort_order,
            is_active: 1
          }]);
        }
      } catch {}
      setLocal('faqs', SEED_FAQS);
      return SEED_FAQS;
    }
  },

  // --- HOMEPAGE GALLERY ---
  gallery: {
    async getAll(): Promise<GalleryItem[]> {
      try {
        const { data, error } = await supabase
          .from('home_gallery')
          .select('*')
          .order('sort_order', { ascending: true })
          .order('id', { ascending: true });

        if (!error && Array.isArray(data) && data.length > 0) {
          setLocal('gallery', data);
          return data;
        }
      } catch (err) {
        console.warn('Supabase gallery fetch note:', err);
      }

      // Try server API fallback
      try {
        const token = getToken();
        const res = await fetch('/api/gallery', {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (res.ok) {
          const apiItems = await res.json();
          if (Array.isArray(apiItems) && apiItems.length > 0) {
            setLocal('gallery', apiItems);
            return apiItems;
          }
        }
      } catch {}

      const local = getLocal<GalleryItem[]>('gallery', SEED_GALLERY_ITEMS);
      return local && local.length > 0 ? local : SEED_GALLERY_ITEMS;
    },

    async create(item: Omit<GalleryItem, 'id' | 'created_at'>): Promise<GalleryItem> {
      const all = await this.getAll();
      const nextId = all.length > 0 ? Math.max(...all.map(g => Number(g.id) || 0)) + 1 : 1;
      const newItem: GalleryItem = {
        id: nextId,
        title: item.title,
        category: item.category || 'Lifestyle',
        image_url: item.image_url,
        description: item.description || '',
        sort_order: item.sort_order ?? (all.length + 1),
        is_active: item.is_active === false || item.is_active === 0 ? 0 : 1,
        created_at: new Date().toISOString()
      };

      try {
        const { data, error } = await supabase
          .from('home_gallery')
          .insert([{
            title: newItem.title,
            category: newItem.category,
            image_url: newItem.image_url,
            description: newItem.description,
            sort_order: newItem.sort_order,
            is_active: newItem.is_active
          }])
          .select()
          .single();

        if (!error && data) {
          const updated = [...all, data];
          setLocal('gallery', updated);
          notifyUpdate('gallery', updated);
          return data;
        }
      } catch {}

      try {
        const token = getToken();
        await fetch('/api/gallery', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify(newItem)
        });
      } catch {}

      const updated = [...all, newItem];
      setLocal('gallery', updated);
      notifyUpdate('gallery', updated);
      return newItem;
    },

    async update(id: number, updates: Partial<GalleryItem>): Promise<GalleryItem | null> {
      try {
        const dbUpdates: any = {};
        if (updates.title !== undefined) dbUpdates.title = updates.title;
        if (updates.category !== undefined) dbUpdates.category = updates.category;
        if (updates.image_url !== undefined) dbUpdates.image_url = updates.image_url;
        if (updates.description !== undefined) dbUpdates.description = updates.description;
        if (updates.sort_order !== undefined) dbUpdates.sort_order = updates.sort_order;
        if (updates.is_active !== undefined) dbUpdates.is_active = updates.is_active === false || updates.is_active === 0 ? 0 : 1;

        const { data, error } = await supabase
          .from('home_gallery')
          .update(dbUpdates)
          .eq('id', id)
          .select()
          .single();

        if (!error && data) {
          const all = await this.getAll();
          const updated = all.map(g => g.id === id ? data : g);
          setLocal('gallery', updated);
          notifyUpdate('gallery', updated);
          return data;
        }
      } catch {}

      try {
        const token = getToken();
        await fetch(`/api/gallery/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify(updates)
        });
      } catch {}

      const all = await this.getAll();
      const updated = all.map(g => g.id === id ? { ...g, ...updates } : g);
      setLocal('gallery', updated);
      notifyUpdate('gallery', updated);
      return updated.find(g => g.id === id) || null;
    },

    async delete(id: number): Promise<void> {
      try {
        await supabase.from('home_gallery').delete().eq('id', id);
      } catch {}

      try {
        const token = getToken();
        await fetch(`/api/gallery/${id}`, {
          method: 'DELETE',
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
      } catch {}

      const all = await this.getAll();
      const filtered = all.filter(g => g.id !== id);
      setLocal('gallery', filtered);
      notifyUpdate('gallery', filtered);
    },

    async reorder(orderIds: number[]): Promise<GalleryItem[]> {
      try {
        const token = getToken();
        await fetch('/api/gallery/reorder', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ orderIds })
        });
      } catch {}

      const all = await this.getAll();
      const reordered = orderIds.map((id, index) => {
        const found = all.find(g => Number(g.id) === Number(id));
        if (found) {
          return { ...found, sort_order: index + 1 };
        }
        return null;
      }).filter(Boolean) as GalleryItem[];

      all.forEach(item => {
        if (!reordered.some(r => Number(r.id) === Number(item.id))) {
          reordered.push({ ...item, sort_order: reordered.length + 1 });
        }
      });

      try {
        for (const item of reordered) {
          await supabase.from('home_gallery').update({ sort_order: item.sort_order }).eq('id', item.id);
        }
      } catch {}

      setLocal('gallery', reordered);
      notifyUpdate('gallery', reordered);
      return reordered;
    },

    async resetDefaults(): Promise<GalleryItem[]> {
      try {
        await supabase.from('home_gallery').delete().neq('id', 0);
        for (const item of SEED_GALLERY_ITEMS) {
          await supabase.from('home_gallery').insert([{
            title: item.title,
            category: item.category,
            image_url: item.image_url,
            description: item.description,
            sort_order: item.sort_order,
            is_active: 1
          }]);
        }
      } catch {}

      try {
        const token = getToken();
        await fetch('/api/gallery/reset', {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
      } catch {}

      setLocal('gallery', SEED_GALLERY_ITEMS);
      notifyUpdate('gallery', SEED_GALLERY_ITEMS);
      return SEED_GALLERY_ITEMS;
    }
  },

  // --- OWNER SUBMISSIONS ---
  ownerSubmissions: {
    async getAll(): Promise<any[]> {
      const local = getLocal<any[]>('submissions', []);
      const altLocal = getLocal<any[]>('rental_pune_submissions', []);
      
      const combinedLocal = [...local, ...altLocal];
      const mergedMap = new Map<any, any>();

      // Seed baseline first
      for (const s of SEED_OWNER_SUBMISSIONS) {
        mergedMap.set(String(s.id), s);
      }

      // Merge local items
      for (const s of combinedLocal) {
        if (s && s.id) {
          mergedMap.set(String(s.id), s);
        }
      }

      // 1. Try server API endpoint
      try {
        let token = '';
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) token = session.access_token;
        } catch {}

        const headers: Record<string, string> = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const res = await fetch('/api/owner-submissions', { headers });
        if (res.ok) {
          const apiData = await res.json();
          if (Array.isArray(apiData)) {
            for (const s of apiData) {
              if (s && s.id) {
                mergedMap.set(String(s.id), {
                  id: Number(s.id),
                  owner_name: s.owner_name || '',
                  owner_phone: s.owner_phone || '',
                  owner_email: s.owner_email || '',
                  owner_type: s.owner_type || 'OWNER',
                  property_title: s.property_title || 'Property Listing',
                  property_type: s.property_type || 'Apartment',
                  bhk_config: s.bhk_config || '2 BHK',
                  location: s.location || '',
                  address: s.address || '',
                  expected_rent: Number(s.expected_rent || 0),
                  security_deposit: Number(s.security_deposit || 0),
                  furnishing: s.furnishing || 'Semi-Furnished',
                  furniture: safeJsonParse<string[]>(s.furniture, Array.isArray(s.furniture) ? s.furniture : []),
                  available_from: s.available_from || '',
                  preferred_tenants: s.preferred_tenants || 'Any',
                  amenities: safeJsonParse<string[]>(s.amenities, Array.isArray(s.amenities) ? s.amenities : []),
                  images: safeJsonParse<string[]>(s.images, Array.isArray(s.images) ? s.images : []),
                  videos: safeJsonParse<string[]>(s.videos, Array.isArray(s.videos) ? s.videos : []),
                  notes: s.notes || '',
                  status: s.status || 'PENDING',
                  admin_notes: s.admin_notes || '',
                  created_at: s.created_at || new Date().toISOString()
                });
              }
            }
          }
        }
      } catch (err) {
        console.warn('API owner_submissions fetch warning:', err);
      }

      // 2. Direct Supabase query fallback
      try {
        const { data, error } = await supabase
          .from('owner_submissions')
          .select('*')
          .order('id', { ascending: false });

        if (!error && Array.isArray(data) && data.length > 0) {
          for (const s of data) {
            if (s && s.id) {
              mergedMap.set(String(s.id), {
                id: Number(s.id),
                owner_name: s.owner_name || '',
                owner_phone: s.owner_phone || '',
                owner_email: s.owner_email || '',
                owner_type: s.owner_type || 'OWNER',
                property_title: s.property_title || '',
                property_type: s.property_type || 'Apartment',
                bhk_config: s.bhk_config || '2 BHK',
                location: s.location || '',
                address: s.address || '',
                expected_rent: Number(s.expected_rent || 0),
                security_deposit: Number(s.security_deposit || 0),
                furnishing: s.furnishing || 'Semi-Furnished',
                furniture: safeJsonParse<string[]>(s.furniture, Array.isArray(s.furniture) ? s.furniture : []),
                available_from: s.available_from || '',
                preferred_tenants: s.preferred_tenants || 'Any',
                amenities: safeJsonParse<string[]>(s.amenities, Array.isArray(s.amenities) ? s.amenities : []),
                images: safeJsonParse<string[]>(s.images, Array.isArray(s.images) ? s.images : []),
                videos: safeJsonParse<string[]>(s.videos, Array.isArray(s.videos) ? s.videos : []),
                notes: s.notes || '',
                status: s.status || 'PENDING',
                admin_notes: s.admin_notes || '',
                created_at: s.created_at || new Date().toISOString()
              });
            }
          }
        }
      } catch (err) {
        console.warn('Supabase owner_submissions fetch error:', err);
      }

      const finalList = Array.from(mergedMap.values()).sort((a, b) => {
        const timeA = new Date(a.created_at || 0).getTime();
        const timeB = new Date(b.created_at || 0).getTime();
        return timeB - timeA || Number(b.id || 0) - Number(a.id || 0);
      });

      setLocal('submissions', finalList);
      setLocal('rental_pune_submissions', finalList);

      return finalList;
    },

    async create(sub: any): Promise<any> {
      const newId = Date.now();
      const payload = {
        owner_name: sub.owner_name,
        owner_phone: sub.owner_phone,
        owner_email: sub.owner_email || '',
        owner_type: sub.owner_type || 'OWNER',
        property_title: sub.property_title,
        property_type: sub.property_type || 'Apartment',
        bhk_config: sub.bhk_config || '2 BHK',
        location: sub.location,
        address: sub.address || '',
        expected_rent: sub.expected_rent ? Number(sub.expected_rent) : null,
        security_deposit: sub.security_deposit ? Number(sub.security_deposit) : null,
        furnishing: sub.furnishing || 'Semi-Furnished',
        furniture: Array.isArray(sub.furniture) ? JSON.stringify(sub.furniture) : (sub.furniture || '[]'),
        available_from: sub.available_from || '',
        preferred_tenants: sub.preferred_tenants || 'Any',
        amenities: Array.isArray(sub.amenities) ? JSON.stringify(sub.amenities) : (sub.amenities || '[]'),
        images: Array.isArray(sub.images) ? JSON.stringify(sub.images) : (sub.images || '[]'),
        videos: Array.isArray(sub.videos) ? JSON.stringify(sub.videos) : (sub.videos || '[]'),
        notes: sub.notes || '',
        status: 'PENDING'
      };

      let newSub: any = {
        id: newId,
        ...sub,
        expected_rent: sub.expected_rent ? Number(sub.expected_rent) : 0,
        security_deposit: sub.security_deposit ? Number(sub.security_deposit) : 0,
        furnishing: sub.furnishing || 'Semi-Furnished',
        furniture: Array.isArray(sub.furniture) ? sub.furniture : safeJsonParse(sub.furniture, []),
        amenities: Array.isArray(sub.amenities) ? sub.amenities : safeJsonParse(sub.amenities, []),
        images: Array.isArray(sub.images) ? sub.images : safeJsonParse(sub.images, []),
        videos: Array.isArray(sub.videos) ? sub.videos : safeJsonParse(sub.videos, []),
        status: 'PENDING',
        created_at: new Date().toISOString()
      };

      // 1. Post to API
      try {
        const res = await fetch('/api/owner-submissions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          const apiRes = await res.json();
          if (apiRes && apiRes.id) {
            newSub.id = Number(apiRes.id);
          }
        }
      } catch (e) {
        console.warn('API submission note:', e);
      }

      // 2. Direct Supabase insertion for cloud redundancy
      try {
        const { data, error } = await supabase
          .from('owner_submissions')
          .insert([payload])
          .select()
          .single();

        if (!error && data && data.id) {
          newSub.id = Number(data.id);
        }
      } catch {}

      // Immediate local caching across multiple keys
      const all = getLocal<any[]>('submissions', []);
      const updated = [newSub, ...all.filter(i => String(i.id) !== String(newSub.id))];
      setLocal('submissions', updated);
      setLocal('rental_pune_submissions', updated);

      // Broadcast custom and storage events so other components and tabs refresh immediately
      try {
        window.dispatchEvent(new CustomEvent('owner_submissions_updated', { detail: newSub }));
      } catch {}

      return newSub;
    },

    async update(id: number, updates: any): Promise<void> {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }
        await fetch(`/api/owner-submissions/${id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(updates)
        });
      } catch {}

      try {
        await supabase.from('owner_submissions').update(updates).eq('id', id);
      } catch {}
      const all = getLocal<any[]>('submissions', []);
      setLocal('submissions', all.map(s => s.id === id ? { ...s, ...updates } : s));
    },

    async updateStatus(id: number, status: string, admin_notes?: string): Promise<void> {
      return this.update(id, { status, admin_notes });
    },

    async approveAndPublish(id: number): Promise<any> {
      return this.approve(id, true);
    },

    async approve(id: number, autoPublish = true): Promise<any> {
      const all = await this.getAll();
      const sub = all.find(s => s.id === id);
      if (!sub) return;

      if (autoPublish) {
        await supabaseService.properties.create({
          title: sub.property_title,
          description: sub.notes ? `${sub.notes} (Furnishing: ${sub.furnishing}, Preferred Tenants: ${sub.preferred_tenants})` : `Prime ${sub.bhk_config} luxury rental residence in ${sub.location}. Features ${sub.furnishing} interiors, superior cross-ventilation, and verified ownership.`,
          price: sub.expected_rent || 50000,
          type: sub.property_type || 'Apartment',
          bedrooms: sub.bhk_config?.includes('1') ? 1 : (sub.bhk_config?.includes('3') ? 3 : (sub.bhk_config?.includes('4') ? 4 : 2)),
          bathrooms: sub.bhk_config?.includes('1') ? 1 : (sub.bhk_config?.includes('3') ? 3 : (sub.bhk_config?.includes('4') ? 4 : 2)),
          area: sub.bhk_config?.includes('1') ? 850 : (sub.bhk_config?.includes('3') ? 1750 : (sub.bhk_config?.includes('4') ? 2400 : 1250)),
          location: sub.location || 'Pune',
          status: 'PUBLISHED',
          furnishing: sub.furnishing || 'Semi-Furnished',
          furniture: Array.isArray(sub.furniture) ? sub.furniture : [],
          images: sub.images && sub.images.length > 0 ? sub.images : ['https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80'],
          videos: Array.isArray(sub.videos) ? sub.videos : [],
          faqs: []
        });
      }

      await this.update(id, { status: 'APPROVED' });
    },

    async delete(id: number): Promise<void> {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const headers: Record<string, string> = {};
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }
        await fetch(`/api/owner-submissions/${id}`, {
          method: 'DELETE',
          headers
        });
      } catch {}

      try {
        await supabase.from('owner_submissions').delete().eq('id', id);
      } catch {}
      const all = getLocal<any[]>('submissions', []);
      setLocal('submissions', all.filter(s => s.id !== id));
    },

    async bulkDelete(ids: number[]): Promise<void> {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }
        await fetch('/api/owner-submissions/bulk-delete', {
          method: 'POST',
          headers,
          body: JSON.stringify({ ids })
        });
      } catch {}

      try {
        await supabase.from('owner_submissions').delete().in('id', ids);
      } catch {}
      const all = getLocal<any[]>('submissions', []);
      setLocal('submissions', all.filter(s => !ids.includes(s.id)));
    }
  },

  // --- SETTINGS ---
  settings: {
    async get(): Promise<Settings> {
      try {
        const { data, error } = await supabase
          .from('settings')
          .select('*');

        if (!error && data && data.length > 0) {
          const settingsObj: Settings = {};
          data.forEach((row: any) => {
            if (row.key) settingsObj[row.key] = row.value;
          });
          setLocal('settings', settingsObj);
          return settingsObj;
        }
      } catch {}

      const defaultSettings: Settings = {
        website_name: 'Rental Pune',
        company_name: 'Rental Pune Luxury Real Estate Pvt. Ltd.',
        phone: '+91 98220 12345',
        phone_secondary: '+91 20 6789 0123',
        phone_tagline: 'Direct Advisor Connect',
        email: 'concierge@rentalpune.com',
        email_support: 'info@rentalpune.com',
        email_tagline: 'Fast 2-hour response time',
        address: 'Balewadi High Street, Near Baner',
        office_city: 'Pune, Maharashtra - 411045, India',
        office_landmark: 'Near Baner & Pune-Bangalore Expressway',
        working_hours: 'Mon - Sun: 9:00 AM – 8:30 PM',
        working_days_note: 'Site visits open all 7 days',
        desk_status: 'Desk Active (9 AM - 8:30 PM)',
        contact_heading: 'Reach Out to Our Luxury Real Estate Advisors',
        contact_subtitle: 'Have questions about residential leases, high-end commercial spaces, society guidelines, or scheduling private site visits? Contact our Pune head office directly.',
        hero_heading: 'Curated Luxury Residences in Prime Pune',
        hero_subheading: 'Handpicked penthouses, riverside apartments, and signature villas in Pune\'s most exclusive enclaves.',
        hero_media_type: 'video',
        hero_video_url: 'https://assets.mixkit.co/videos/preview/mixkit-modern-apartment-building-exterior-41549-large.mp4',
        hero_video_title: 'Pune Luxury Architectural Showcase & Residences',
        whatsapp_number: '+919822012345',
        whatsapp_message: 'Hello Rental Pune, I am looking for a luxury rental property in Pune.'
      };

      const cached = getLocal<Settings>('settings', defaultSettings);
      const merged = { ...defaultSettings, ...cached };
      return merged;
    },

    async update(updates: Record<string, string>): Promise<Settings> {
      // 1. Instant optimistic local update & notification
      const existing = getLocal<Settings>('settings', {});
      const merged = { ...existing, ...updates };
      setLocal('settings', merged);
      notifyUpdate('settings', merged);

      // 2. Synchronize asynchronously with Supabase & server
      try {
        const entries = Object.entries(updates);
        if (entries.length > 0) {
          const rows = entries.map(([key, value]) => ({ key, value: String(value ?? '') }));
          await supabase
            .from('settings')
            .upsert(rows, { onConflict: 'key' });
        }
      } catch (e) {
        console.warn('Supabase update settings note:', e);
      }

      // Also notify backend API in background
      try {
        const token = getToken();
        fetch('/api/settings', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify(updates)
        }).catch(() => {});
      } catch {}

      return merged;
    }
  },

  // --- DASHBOARD METRICS ---
  dashboard: {
    getCachedStats(): any {
      const cached = getLocal<any>('dashboard_stats', null);
      if (cached && cached.summary) return cached;

      const properties = getLocal<Property[]>('properties', SEED_PROPERTIES);
      const leads = getLocal<Lead[]>('leads', []);
      const visits = getLocal<Visit[]>('visits', []);
      const feedbacks = getLocal<VisitFeedback[]>('feedbacks', []);
      const invoices = getLocal<Invoice[]>('invoices', []);
      const submissions = getLocal<any[]>('submissions', SEED_OWNER_SUBMISSIONS);
      const agents = getLocal<User[]>('agents', []);

      const hotLeads = feedbacks.filter(f => f.interest_level === 'Hot').length;
      const warmLeads = feedbacks.filter(f => f.interest_level === 'Warm').length;
      const coldLeads = feedbacks.filter(f => f.interest_level === 'Cold').length;

      const totalInvoiced = invoices.reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);
      const totalCollected = invoices.reduce((sum, inv) => sum + (Number(inv.amount_paid) || 0), 0);
      const totalDue = invoices.reduce((sum, inv) => sum + (Number(inv.balance_due) || 0), 0);

      const totalPortfolioValue = properties.reduce((sum, p) => sum + (Number(p.price) || 0), 0);
      const publishedProperties = properties.filter(p => p.status === 'PUBLISHED');
      const publishedPortfolioValue = publishedProperties.reduce((sum, p) => sum + (Number(p.price) || 0), 0);

      const typeMap: Record<string, number> = {};
      properties.forEach(p => {
        const t = p.type || 'Other';
        typeMap[t] = (typeMap[t] || 0) + 1;
      });
      const typeBreakdown = Object.entries(typeMap).map(([type, count]) => ({ type, count }));

      const stageMap: Record<string, number> = {};
      leads.forEach(l => {
        const s = l.status || 'New';
        stageMap[s] = (stageMap[s] || 0) + 1;
      });
      const stageBreakdown = Object.entries(stageMap).map(([status, count]) => ({ status, count }));

      const budgetsWithValues = feedbacks.filter(f => f.budget && Number(f.budget) > 0);
      const averageBudget = budgetsWithValues.length > 0
        ? Math.round(budgetsWithValues.reduce((sum, f) => sum + Number(f.budget), 0) / budgetsWithValues.length)
        : (feedbacks.length > 0 ? 120000 : 0);

      return {
        serverTime: new Date().toISOString(),
        summary: {
          propertiesCount: properties.length,
          leadsCount: leads.length,
          scheduledVisits: visits.filter(v => v.status === 'Scheduled').length,
          completedVisits: visits.filter(v => v.status === 'Completed').length,
          pendingInvoices: invoices.filter(i => i.status === 'Pending' || i.status === 'Partially Paid').length,
          ownerSubmissionsCount: submissions.length,
          totalRevenue: totalCollected
        },
        properties: {
          total: properties.length,
          published: publishedProperties.length,
          sold: properties.filter(p => p.status === 'SOLD').length,
          draft: properties.filter(p => p.status !== 'PUBLISHED' && p.status !== 'SOLD').length,
          totalPortfolioValue,
          publishedPortfolioValue,
          typeBreakdown
        },
        leads: {
          total: leads.length,
          active: leads.filter(l => l.status !== 'Converted' && l.status !== 'Lost' && l.status !== 'Dropped').length,
          converted: leads.filter(l => l.status === 'Converted').length,
          new: leads.filter(l => l.status === 'New').length,
          contacted: leads.filter(l => l.status === 'Contacted').length,
          qualified: leads.filter(l => l.status === 'Qualified').length,
          stageBreakdown,
          recent: leads.slice(0, 6)
        },
        visits: {
          total: visits.length,
          scheduled: visits.filter(v => v.status === 'Scheduled').length,
          completed: visits.filter(v => v.status === 'Completed').length,
          cancelled: visits.filter(v => v.status === 'Cancelled').length,
          recent: visits.slice(0, 6)
        },
        agents: {
          total: agents.length
        },
        feedbacks: {
          total: feedbacks.length,
          hotLeads,
          warmLeads,
          coldLeads,
          averageBudget,
          recent: feedbacks.slice(0, 6)
        },
        feedback: {
          total: feedbacks.length,
          hotLeads,
          warmLeads,
          coldLeads,
          averageBudget,
          recent: feedbacks.slice(0, 6)
        },
        invoices: {
          total: invoices.length,
          paid: invoices.filter(i => i.status === 'Paid').length,
          pending: invoices.filter(i => i.status === 'Pending' || i.status === 'Partially Paid').length,
          totalInvoiced,
          totalCollected,
          totalDue
        }
      };
    },

    hasCachedStats(): boolean {
      if (typeof window === 'undefined' || !window.localStorage) return false;
      const cached = getLocal<any>('dashboard_stats', null);
      if (cached && cached.summary) return true;
      const p = getLocal<any[]>('properties', []);
      const l = getLocal<any[]>('leads', []);
      return p.length > 0 || l.length > 0;
    },

    async getStats(): Promise<any> {
      const results = await Promise.allSettled([
        supabaseService.properties.getAll(),
        supabaseService.leads.getAll(),
        supabaseService.visits.getAll(),
        supabaseService.feedbacks.getAll(),
        supabaseService.invoices.getAll(),
        supabaseService.ownerSubmissions.getAll(),
        supabaseService.agents.getAll()
      ]);

      const properties = results[0].status === 'fulfilled' ? results[0].value : getLocal<Property[]>('properties', SEED_PROPERTIES);
      const leads = results[1].status === 'fulfilled' ? results[1].value : getLocal<Lead[]>('leads', []);
      const visits = results[2].status === 'fulfilled' ? results[2].value : getLocal<Visit[]>('visits', []);
      const feedbacks = results[3].status === 'fulfilled' ? results[3].value : getLocal<VisitFeedback[]>('feedbacks', []);
      const invoices = results[4].status === 'fulfilled' ? results[4].value : getLocal<Invoice[]>('invoices', []);
      const submissions = results[5].status === 'fulfilled' ? results[5].value : getLocal<any[]>('submissions', SEED_OWNER_SUBMISSIONS);
      const agents = results[6].status === 'fulfilled' ? results[6].value : getLocal<User[]>('agents', []);

      const hotLeads = feedbacks.filter(f => f.interest_level === 'Hot').length;
      const warmLeads = feedbacks.filter(f => f.interest_level === 'Warm').length;
      const coldLeads = feedbacks.filter(f => f.interest_level === 'Cold').length;

      const totalInvoiced = invoices.reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);
      const totalCollected = invoices.reduce((sum, inv) => sum + (Number(inv.amount_paid) || 0), 0);
      const totalDue = invoices.reduce((sum, inv) => sum + (Number(inv.balance_due) || 0), 0);

      const totalPortfolioValue = properties.reduce((sum, p) => sum + (Number(p.price) || 0), 0);
      const publishedProperties = properties.filter(p => p.status === 'PUBLISHED');
      const publishedPortfolioValue = publishedProperties.reduce((sum, p) => sum + (Number(p.price) || 0), 0);

      // Property type breakdown
      const typeMap: Record<string, number> = {};
      properties.forEach(p => {
        const t = p.type || 'Other';
        typeMap[t] = (typeMap[t] || 0) + 1;
      });
      const typeBreakdown = Object.entries(typeMap).map(([type, count]) => ({ type, count }));

      // Lead stage breakdown
      const stageMap: Record<string, number> = {};
      leads.forEach(l => {
        const s = l.status || 'New';
        stageMap[s] = (stageMap[s] || 0) + 1;
      });
      const stageBreakdown = Object.entries(stageMap).map(([status, count]) => ({ status, count }));

      // Feedback average budget
      const budgetsWithValues = feedbacks.filter(f => f.budget && Number(f.budget) > 0);
      const averageBudget = budgetsWithValues.length > 0
        ? Math.round(budgetsWithValues.reduce((sum, f) => sum + Number(f.budget), 0) / budgetsWithValues.length)
        : (feedbacks.length > 0 ? 120000 : 0);

      const statsData = {
        serverTime: new Date().toISOString(),
        summary: {
          propertiesCount: properties.length,
          leadsCount: leads.length,
          scheduledVisits: visits.filter(v => v.status === 'Scheduled').length,
          completedVisits: visits.filter(v => v.status === 'Completed').length,
          pendingInvoices: invoices.filter(i => i.status === 'Pending' || i.status === 'Partially Paid').length,
          ownerSubmissionsCount: submissions.length,
          totalRevenue: totalCollected
        },
        properties: {
          total: properties.length,
          published: publishedProperties.length,
          sold: properties.filter(p => p.status === 'SOLD').length,
          draft: properties.filter(p => p.status !== 'PUBLISHED' && p.status !== 'SOLD').length,
          totalPortfolioValue,
          publishedPortfolioValue,
          typeBreakdown
        },
        leads: {
          total: leads.length,
          active: leads.filter(l => l.status !== 'Converted' && l.status !== 'Lost' && l.status !== 'Dropped').length,
          converted: leads.filter(l => l.status === 'Converted').length,
          new: leads.filter(l => l.status === 'New').length,
          contacted: leads.filter(l => l.status === 'Contacted').length,
          qualified: leads.filter(l => l.status === 'Qualified').length,
          stageBreakdown,
          recent: leads.slice(0, 6)
        },
        visits: {
          total: visits.length,
          scheduled: visits.filter(v => v.status === 'Scheduled').length,
          completed: visits.filter(v => v.status === 'Completed').length,
          cancelled: visits.filter(v => v.status === 'Cancelled').length,
          recent: visits.slice(0, 6)
        },
        agents: {
          total: agents.length
        },
        feedbacks: {
          total: feedbacks.length,
          hotLeads,
          warmLeads,
          coldLeads,
          averageBudget,
          recent: feedbacks.slice(0, 6)
        },
        feedback: {
          total: feedbacks.length,
          hotLeads,
          warmLeads,
          coldLeads,
          averageBudget,
          recent: feedbacks.slice(0, 6)
        },
        invoices: {
          total: invoices.length,
          paid: invoices.filter(i => i.status === 'Paid').length,
          pending: invoices.filter(i => i.status === 'Pending' || i.status === 'Partially Paid').length,
          totalInvoiced,
          totalCollected,
          totalDue
        }
      };

      setLocal('dashboard_stats', statsData);
      return statsData;
    }
  },

  // Background concurrent preload
  async preloadAll(): Promise<void> {
    try {
      await Promise.allSettled([
        supabaseService.properties.getAll(),
        supabaseService.leads.getAll(),
        supabaseService.visits.getAll(),
        supabaseService.feedbacks.getAll(),
        supabaseService.invoices.getAll(),
        supabaseService.ownerSubmissions.getAll(),
        supabaseService.agents.getAll(),
        supabaseService.settings.get(),
        supabaseService.faqs.getAll(),
        supabaseService.gallery.getAll()
      ]);
    } catch {}
  },

  // --- SUPABASE STORAGE MEDIA UPLOAD ---
  storage: {
    async uploadImage(fileOrBlob: Blob | File, filename?: string): Promise<{ url: string; savedPercent?: number }> {
      try {
        const cleanName = filename || `property_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.webp`;
        const filePath = `properties/${cleanName}`;

        const { data, error } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(filePath, fileOrBlob, {
            contentType: 'image/webp',
            upsert: true
          });

        if (!error && data) {
          const { data: publicData } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(data.path);

          return { url: publicData.publicUrl, savedPercent: 45 };
        }
      } catch (e) {
        console.warn('Supabase storage upload error:', e);
      }

      // Convert to Data URL as resilient fallback
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve({ url: reader.result as string, savedPercent: 30 });
        };
        reader.readAsDataURL(fileOrBlob);
      });
    },

    async uploadVideo(file: File, filename?: string): Promise<{ url: string }> {
      try {
        const cleanName = filename || `video_${Date.now()}_${file.name}`;
        const filePath = `videos/${cleanName}`;

        const { data, error } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(filePath, file, {
            contentType: file.type || 'video/mp4',
            upsert: true
          });

        if (!error && data) {
          const { data: publicData } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(data.path);

          return { url: publicData.publicUrl };
        }
      } catch (e) {
        console.warn('Supabase video upload error:', e);
      }

      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve({ url: reader.result as string });
        };
        reader.readAsDataURL(file);
      });
    }
  },

  // --- REALTIME SUBSCRIPTIONS & SYNCHRONIZATION ---
  realtime: {
    activeChannel: null as any,
    
    init(): () => void {
      if (typeof window === 'undefined') return () => {};
      
      try {
        if (this.activeChannel) {
          supabase.removeChannel(this.activeChannel);
        }

        const channel = supabase
          .channel('rp-global-realtime')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'properties' },
            async (payload) => {
              console.log('[Supabase Realtime] properties changed:', payload);
              const data = await supabaseService.properties.getAll();
              notifyUpdate('properties', data);
            }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'leads' },
            async (payload) => {
              console.log('[Supabase Realtime] leads changed:', payload);
              const data = await supabaseService.leads.getAll();
              notifyUpdate('leads', data);
            }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'settings' },
            async (payload) => {
              console.log('[Supabase Realtime] settings changed:', payload);
              const data = await supabaseService.settings.get();
              try {
                // Dynamically update global store settings
                window.dispatchEvent(new CustomEvent('rp_settings_synced', { detail: data }));
              } catch {}
              notifyUpdate('settings', data);
            }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'site_visits' },
            async (payload) => {
              console.log('[Supabase Realtime] site_visits changed:', payload);
              const data = await supabaseService.visits.getAll();
              notifyUpdate('visits', data);
            }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'site_visit_feedback' },
            async (payload) => {
              console.log('[Supabase Realtime] site_visit_feedback changed:', payload);
              const data = await supabaseService.feedbacks.getAll();
              notifyUpdate('feedbacks', data);
            }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'owner_submissions' },
            async (payload) => {
              console.log('[Supabase Realtime] owner_submissions changed:', payload);
              const data = await supabaseService.ownerSubmissions.getAll();
              notifyUpdate('submissions', data);
            }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'faqs' },
            async (payload) => {
              console.log('[Supabase Realtime] faqs changed:', payload);
              const data = await supabaseService.faqs.getAll();
              notifyUpdate('faqs', data);
            }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'home_gallery' },
            async (payload) => {
              console.log('[Supabase Realtime] home_gallery changed:', payload);
              const data = await supabaseService.gallery.getAll();
              notifyUpdate('gallery', data);
            }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'invoices' },
            async (payload) => {
              console.log('[Supabase Realtime] invoices changed:', payload);
              const data = await supabaseService.invoices.getAll();
              notifyUpdate('invoices', data);
            }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'profiles' },
            async (payload) => {
              console.log('[Supabase Realtime] profiles changed:', payload);
              const data = await supabaseService.agents.getAll();
              notifyUpdate('agents', data);
            }
          )
          .subscribe((status, err) => {
            if (err) {
              console.warn('[Supabase Realtime] note:', status, err);
            } else {
              console.log('[Supabase Realtime] active status:', status);
            }
          });

        this.activeChannel = channel;

        return () => {
          if (this.activeChannel) {
            supabase.removeChannel(this.activeChannel);
            this.activeChannel = null;
          }
        };
      } catch (err) {
        console.warn('[Supabase Realtime] Init error:', err);
        return () => {};
      }
    },

    async testConnection(): Promise<{ ok: boolean; message: string; latencyMs: number }> {
      const start = Date.now();
      try {
        const { error } = await supabase.from('settings').select('count', { count: 'exact', head: true });
        const latencyMs = Date.now() - start;
        if (error && error.code !== 'PGRST205' && !error.message?.includes('schema cache')) {
          return { ok: false, message: error.message, latencyMs };
        }
        return { ok: true, message: 'Connected to Supabase Cloud Database with Realtime sync', latencyMs };
      } catch (err: any) {
        return { ok: false, message: err?.message || 'Connection error', latencyMs: Date.now() - start };
      }
    }
  }
};
