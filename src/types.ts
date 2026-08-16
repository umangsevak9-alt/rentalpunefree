export type User = {
  id: number;
  name: string;
  email: string;
  role: 'MAIN_ADMIN' | 'ADMIN' | 'AGENT';
  permissions?: string;
  created_at?: string;
};

export type FAQ = {
  id: number;
  question: string;
  answer: string;
  category: string;
  sort_order?: number;
  is_active?: number;
  created_at?: string;
};

export type PropertyFAQ = {
  id?: string;
  question: string;
  answer: string;
  category?: string;
};

export type Property = {
  id: number;
  title: string;
  description: string;
  price: number;
  type: string;
  bedrooms: number;
  bathrooms: number;
  area: number;
  location: string;
  status: string;
  images: string[];
  videos?: string[];
  faqs?: PropertyFAQ[];
  created_at?: string;
};

export type Lead = {
  id: number;
  name: string;
  email: string;
  phone: string;
  status: string;
  source?: string;
  property_id?: number;
  property_title?: string;
  assigned_agent_id?: number;
  assigned_agent_name?: string;
  notes?: string;
  created_at?: string;
};

export type Visit = {
  id: number;
  lead_id: number;
  property_id: number;
  agent_id: number;
  visit_date: string;
  visit_time: string;
  status: string;
  notes: string;
  lead_name?: string;
  lead_phone?: string;
  lead_email?: string;
  property_title?: string;
  property_location?: string;
  agent_name?: string;
  agent_email?: string;
  feedback_id?: number;
  interest_level?: string;
  customer_feedback?: string;
  requirements?: string;
  budget?: number;
  preferred_configuration?: string;
  timeline?: string;
  next_action?: string;
  feedback_created_at?: string;
};

export type VisitFeedback = {
  id: number;
  visit_id: number;
  interest_level: 'Hot' | 'Warm' | 'Cold' | string;
  customer_feedback: string;
  requirements?: string;
  budget?: number;
  preferred_configuration?: string;
  timeline?: string;
  next_action?: string;
  photos?: string;
  created_at: string;
  visit_date?: string;
  visit_time?: string;
  visit_status?: string;
  visit_notes?: string;
  lead_name?: string;
  lead_phone?: string;
  lead_email?: string;
  property_title?: string;
  property_location?: string;
  property_price?: number;
  property_type?: string;
  agent_name?: string;
  agent_email?: string;
};

export type Settings = {
  website_name?: string;
  company_name?: string;
  phone?: string;
  email?: string;
  address?: string;
  hero_heading?: string;
  hero_subheading?: string;
  gstin?: string;
  pan?: string;
  whatsapp_url?: string;
  whatsapp_number?: string;
  whatsapp_message?: string;
  bank_name?: string;
  account_holder?: string;
  account_number?: string;
  ifsc_code?: string;
  branch_name?: string;
  account_type?: string;
  upi_id?: string;
  upi_number?: string;
  upi_qr_url?: string;
  payment_instructions?: string;
  [key: string]: string | undefined;
};

export type InvoiceItem = {
  id?: string;
  description: string;
  category?: string;
  quantity: number;
  rate: number;
  amount: number;
};

export type Invoice = {
  id: number;
  invoice_number: string;
  lead_id?: number;
  property_id?: number;
  client_name: string;
  client_email?: string;
  client_phone?: string;
  client_address?: string;
  client_pan?: string;
  client_gstin?: string;
  property_title?: string;
  property_location?: string;
  items: InvoiceItem[] | string;
  subtotal: number;
  tax_type?: 'GST_18' | 'GST_12' | 'GST_5' | 'NONE' | string;
  tax_rate?: number;
  tax: number;
  discount: number;
  total: number;
  amount_paid?: number;
  balance_due?: number;
  status: 'Pending' | 'Paid' | 'Partially Paid' | 'Overdue' | 'Cancelled' | string;
  payment_mode?: string;
  issue_date?: string;
  due_date?: string;
  notes?: string;
  terms?: string;
  bank_name?: string;
  account_holder?: string;
  account_number?: string;
  ifsc_code?: string;
  branch_name?: string;
  account_type?: string;
  upi_id?: string;
  upi_qr_url?: string;
  payment_instructions?: string;
  created_at?: string;
};
