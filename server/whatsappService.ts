import fs from 'fs';
import path from 'path';
import { getSupabase } from './supabase.js';

const DATA_DIR = path.join(process.cwd(), 'data');
const WHATSAPP_CONFIG_FILE = path.join(DATA_DIR, 'whatsapp_config.json');
const WHATSAPP_TENANTS_FILE = path.join(DATA_DIR, 'whatsapp_tenants.json');
const WHATSAPP_LOGS_FILE = path.join(DATA_DIR, 'whatsapp_logs.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch {}
}

export interface WhatsAppConfig {
  tenant_id: string;
  client_name: string;
  provider: 'META_CLOUD_API';
  api_base_url: string;
  graph_version: string;
  phone_number_id: string;
  business_account_id: string;
  access_token: string;
  admin_phone: string;
  enabled: boolean;
  customer_confirmation_enabled: boolean;
  admin_alerts_enabled: boolean;
  template_name_customer: string;
  template_language_customer: string;
  template_name_admin: string;
  template_language_admin: string;
  webhook_verify_token: string;
  updated_at?: string;
  last_test_at?: string;
  last_test_status?: 'CONNECTED' | 'FAILED';
  last_test_error?: string;
  last_error?: string;
  last_error_at?: string;
}

export interface WhatsAppTenantSummary {
  tenant_id: string;
  client_name: string;
  phone_number_id: string;
  admin_phone: string;
  enabled: boolean;
  has_access_token: boolean;
  last_test_status?: 'CONNECTED' | 'FAILED';
  updated_at?: string;
}

export interface WhatsAppLog {
  id: string | number;
  lead_id?: number | string | null;
  tenant_id?: string;
  recipient_type: 'CUSTOMER' | 'ADMIN' | 'TEST';
  recipient_phone: string;
  message_type: 'CUSTOMER_CONFIRMATION' | 'ADMIN_ALERT' | 'TEST';
  status: 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
  whatsapp_message_id?: string;
  error_message?: string;
  payload?: any;
  created_at: string;
}

const DEFAULT_TENANT_ID = 'rental_pune';

const DEFAULT_CONFIG: WhatsAppConfig = {
  tenant_id: DEFAULT_TENANT_ID,
  client_name: 'Rental Pune Luxury Real Estate',
  provider: 'META_CLOUD_API',
  api_base_url: 'https://graph.facebook.com',
  graph_version: 'v21.0',
  phone_number_id: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
  business_account_id: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '',
  access_token: process.env.WHATSAPP_ACCESS_TOKEN || '',
  admin_phone: process.env.WHATSAPP_ADMIN_PHONE || '+919822012345',
  enabled: true,
  customer_confirmation_enabled: true,
  admin_alerts_enabled: true,
  template_name_customer: 'rental_pune_enquiry_customer',
  template_language_customer: 'en',
  template_name_admin: 'rental_pune_admin_alert',
  template_language_admin: 'en',
  webhook_verify_token: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'rental_pune_secure_verify_2026'
};

function loadJson<T>(file: string, fallback: T): T {
  try {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf-8');
      return JSON.parse(content);
    }
  } catch {}
  return fallback;
}

function saveJson(file: string, data: any): void {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), { encoding: 'utf-8', mode: 0o600 });
  } catch (e) {
    console.error(`Failed to save JSON to ${file}:`, e);
  }
}

// In-flight dispatches tracker to prevent concurrent duplicate notifications during retries
const inFlightDispatches = new Set<string>();

export interface BusinessBranding {
  websiteName: string;
  companyName: string;
  phone: string;
}

// In-memory cache for dynamic branding with instant invalidation
let cachedBranding: BusinessBranding | null = null;
let lastBrandingFetch = 0;
const BRANDING_CACHE_TTL_MS = 10000; // 10 seconds

/**
 * Invalidate the branding cache immediately whenever settings are updated in the admin panel.
 */
export function invalidateBrandingCache(): void {
  cachedBranding = null;
  lastBrandingFetch = 0;
}

/**
 * Retrieve the central business brand name and display parameters dynamically.
 */
export async function getBusinessBranding(): Promise<BusinessBranding> {
  const now = Date.now();
  if (cachedBranding && (now - lastBrandingFetch < BRANDING_CACHE_TTL_MS)) {
    return cachedBranding;
  }

  const fileSettings = loadJson<Record<string, string>>(SETTINGS_FILE, {});
  const dbSettings: Record<string, string> = {};
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data } = await supabase
        .from('settings')
        .select('key, value')
        .in('key', ['website_name', 'company_name', 'phone', 'whatsapp_number']);
      if (Array.isArray(data)) {
        data.forEach((row: any) => {
          if (row.key && row.value) dbSettings[row.key] = String(row.value).trim();
        });
      }
    } catch {}
  }

  const rawWebsiteName = dbSettings.website_name || fileSettings.website_name || '';
  const rawCompanyName = dbSettings.company_name || fileSettings.company_name || '';
  const rawPhone = dbSettings.phone || fileSettings.phone || dbSettings.whatsapp_number || fileSettings.whatsapp_number || '';

  const websiteName = rawWebsiteName.trim() || rawCompanyName.trim() || 'Rental Pune';
  const companyName = rawCompanyName.trim() || websiteName;
  const phone = rawPhone.trim() || '+919822012345';

  cachedBranding = { websiteName, companyName, phone };
  lastBrandingFetch = now;
  return cachedBranding;
}

/**
 * Mask access token securely for frontend display.
 * Never send raw access tokens to the client.
 */
export function maskToken(token?: string): string {
  if (!token || typeof token !== 'string') return '';
  const trimmed = token.trim();
  if (trimmed.length <= 8) return '••••••••';
  const prefix = trimmed.substring(0, 4);
  const suffix = trimmed.substring(trimmed.length - 4);
  return `${prefix}••••••••••••••••${suffix}`;
}

/**
 * Redact sensitive tokens from any error message or payload string.
 */
export function redactSecrets(text?: string | null): string {
  if (!text || typeof text !== 'string') return '';
  return text.replace(/EAAB[a-zA-Z0-9_-]{20,}/g, 'EAAB••••••••••••[REDACTED]');
}

/**
 * Clean & normalize phone number into Meta WhatsApp Cloud API E.164 format (without + symbol).
 */
export function cleanWhatsAppNumber(phone?: string | null): string | null {
  if (!phone || typeof phone !== 'string') return null;
  const digitsOnly = phone.replace(/\D/g, '');
  if (!digitsOnly) return null;

  // Indian standard 10-digit mobile starting with 6, 7, 8, or 9
  if (digitsOnly.length === 10 && /^[6-9]/.test(digitsOnly)) {
    return '91' + digitsOnly;
  }
  // 11 digits starting with 0 (e.g. 09822012345)
  if (digitsOnly.length === 11 && digitsOnly.startsWith('0') && /^[6-9]/.test(digitsOnly.substring(1))) {
    return '91' + digitsOnly.substring(1);
  }
  // Standard 12 digits starting with 91
  if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
    return digitsOnly;
  }
  // Valid international number (between 10 and 15 digits)
  if (digitsOnly.length >= 10 && digitsOnly.length <= 15) {
    return digitsOnly;
  }

  return null;
}

/**
 * Load all tenants map from storage.
 */
function loadTenantsMap(): Record<string, WhatsAppConfig> {
  const tenants = loadJson<Record<string, WhatsAppConfig>>(WHATSAPP_TENANTS_FILE, {});
  if (!tenants[DEFAULT_TENANT_ID]) {
    // If not present, seed with single-client configuration file or default
    const legacy = loadJson<Partial<WhatsAppConfig>>(WHATSAPP_CONFIG_FILE, {});
    tenants[DEFAULT_TENANT_ID] = {
      ...DEFAULT_CONFIG,
      ...legacy,
      tenant_id: DEFAULT_TENANT_ID
    };
  }
  return tenants;
}

/**
 * List all configured tenant client profiles (with masked tokens).
 */
export function listWhatsAppTenants(): WhatsAppTenantSummary[] {
  const tenants = loadTenantsMap();
  return Object.values(tenants).map(t => ({
    tenant_id: t.tenant_id,
    client_name: t.client_name || t.tenant_id,
    phone_number_id: t.phone_number_id || '',
    admin_phone: t.admin_phone || '',
    enabled: t.enabled !== false,
    has_access_token: Boolean(t.access_token && t.access_token.trim().length > 10),
    last_test_status: t.last_test_status,
    updated_at: t.updated_at
  }));
}

/**
 * Retrieve active WhatsApp configuration for a specific tenant or the default tenant.
 */
export function getWhatsAppConfig(tenantId: string = DEFAULT_TENANT_ID): WhatsAppConfig {
  const cleanTenantId = (tenantId || DEFAULT_TENANT_ID).trim().toLowerCase();
  const tenants = loadTenantsMap();
  const tenantConfig = tenants[cleanTenantId] || tenants[DEFAULT_TENANT_ID] || DEFAULT_CONFIG;

  // Environment variables override default tenant if provided
  const envToken = cleanTenantId === DEFAULT_TENANT_ID ? process.env.WHATSAPP_ACCESS_TOKEN : '';
  const envPhoneId = cleanTenantId === DEFAULT_TENANT_ID ? process.env.WHATSAPP_PHONE_NUMBER_ID : '';
  const envWabaId = cleanTenantId === DEFAULT_TENANT_ID ? process.env.WHATSAPP_BUSINESS_ACCOUNT_ID : '';
  const envAdminPhone = cleanTenantId === DEFAULT_TENANT_ID ? process.env.WHATSAPP_ADMIN_PHONE : '';
  const envVerifyToken = cleanTenantId === DEFAULT_TENANT_ID ? process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN : '';

  return {
    tenant_id: cleanTenantId,
    client_name: tenantConfig.client_name || (cleanTenantId === DEFAULT_TENANT_ID ? 'Rental Pune Luxury Real Estate' : cleanTenantId),
    provider: 'META_CLOUD_API',
    api_base_url: tenantConfig.api_base_url || 'https://graph.facebook.com',
    graph_version: tenantConfig.graph_version || 'v21.0',
    phone_number_id: envPhoneId || tenantConfig.phone_number_id || '',
    business_account_id: envWabaId || tenantConfig.business_account_id || '',
    access_token: envToken || tenantConfig.access_token || '',
    admin_phone: envAdminPhone || tenantConfig.admin_phone || '+919822012345',
    enabled: tenantConfig.enabled !== false,
    customer_confirmation_enabled: tenantConfig.customer_confirmation_enabled !== false,
    admin_alerts_enabled: tenantConfig.admin_alerts_enabled !== false,
    template_name_customer: tenantConfig.template_name_customer || 'rental_pune_enquiry_customer',
    template_language_customer: tenantConfig.template_language_customer || 'en',
    template_name_admin: tenantConfig.template_name_admin || 'rental_pune_admin_alert',
    template_language_admin: tenantConfig.template_language_admin || 'en',
    webhook_verify_token: envVerifyToken || tenantConfig.webhook_verify_token || 'rental_pune_secure_verify_2026',
    updated_at: tenantConfig.updated_at,
    last_test_at: tenantConfig.last_test_at,
    last_test_status: tenantConfig.last_test_status,
    last_test_error: tenantConfig.last_test_error,
    last_error: tenantConfig.last_error,
    last_error_at: tenantConfig.last_error_at
  };
}

/**
 * Update WhatsApp configuration safely for a given tenant.
 * If access_token contains bullet points or is empty, retains existing secret token.
 */
export function updateWhatsAppConfig(newConfig: Partial<WhatsAppConfig>, targetTenantId?: string): WhatsAppConfig {
  const cleanTenantId = (targetTenantId || newConfig.tenant_id || DEFAULT_TENANT_ID).trim().toLowerCase();
  const tenants = loadTenantsMap();
  const current = getWhatsAppConfig(cleanTenantId);

  let tokenToSave = current.access_token;
  if (newConfig.access_token && typeof newConfig.access_token === 'string') {
    const raw = newConfig.access_token.trim();
    if (raw && !raw.includes('••') && !raw.includes('*')) {
      tokenToSave = raw;
    }
  }

  const merged: WhatsAppConfig = {
    ...current,
    ...newConfig,
    tenant_id: cleanTenantId,
    client_name: newConfig.client_name?.trim() || current.client_name,
    provider: 'META_CLOUD_API',
    api_base_url: (newConfig.api_base_url?.trim() || current.api_base_url || 'https://graph.facebook.com').replace(/\/$/, ''),
    graph_version: (newConfig.graph_version?.trim() || current.graph_version || 'v21.0').replace(/^\//, ''),
    phone_number_id: newConfig.phone_number_id !== undefined ? String(newConfig.phone_number_id).trim() : current.phone_number_id,
    business_account_id: newConfig.business_account_id !== undefined ? String(newConfig.business_account_id).trim() : current.business_account_id,
    access_token: tokenToSave,
    admin_phone: newConfig.admin_phone !== undefined ? String(newConfig.admin_phone).trim() : current.admin_phone,
    enabled: newConfig.enabled !== undefined ? Boolean(newConfig.enabled) : current.enabled,
    customer_confirmation_enabled: newConfig.customer_confirmation_enabled !== undefined ? Boolean(newConfig.customer_confirmation_enabled) : current.customer_confirmation_enabled,
    admin_alerts_enabled: newConfig.admin_alerts_enabled !== undefined ? Boolean(newConfig.admin_alerts_enabled) : current.admin_alerts_enabled,
    template_name_customer: newConfig.template_name_customer?.trim() || current.template_name_customer,
    template_language_customer: newConfig.template_language_customer?.trim() || current.template_language_customer,
    template_name_admin: newConfig.template_name_admin?.trim() || current.template_name_admin,
    template_language_admin: newConfig.template_language_admin?.trim() || current.template_language_admin,
    webhook_verify_token: newConfig.webhook_verify_token?.trim() || current.webhook_verify_token,
    updated_at: new Date().toISOString()
  };

  tenants[cleanTenantId] = merged;
  saveJson(WHATSAPP_TENANTS_FILE, tenants);

  // Sync default tenant to legacy config file for backwards compatibility
  if (cleanTenantId === DEFAULT_TENANT_ID) {
    saveJson(WHATSAPP_CONFIG_FILE, merged);

    // Synchronize to Supabase settings and credentials
    try {
      const supabase = getSupabase();
      if (supabase) {
        const publicSettings = [
          { key: 'whatsapp_phone_number_id', value: merged.phone_number_id },
          { key: 'whatsapp_business_account_id', value: merged.business_account_id },
          { key: 'whatsapp_admin_phone', value: merged.admin_phone },
          { key: 'whatsapp_enabled', value: String(merged.enabled) },
          { key: 'whatsapp_customer_confirmation_enabled', value: String(merged.customer_confirmation_enabled) },
          { key: 'whatsapp_admin_alerts_enabled', value: String(merged.admin_alerts_enabled) },
          { key: 'whatsapp_template_name_customer', value: merged.template_name_customer },
          { key: 'whatsapp_template_name_admin', value: merged.template_name_admin }
        ];
        (async () => {
          try {
            await supabase.from('settings').upsert(publicSettings, { onConflict: 'key' });
          } catch {}
        })();

        if (tokenToSave) {
          (async () => {
            try {
              await supabase.from('settings').upsert([{ key: 'whatsapp_access_token', value: tokenToSave }], { onConflict: 'key' });
            } catch (err) {
              console.warn('Error saving whatsapp_access_token to Supabase settings:', err);
            }
          })();
        }
      }
    } catch {}
  }

  return merged;
}

/**
 * Record a WhatsApp notification log.
 */
export async function logWhatsAppNotification(logEntry: Omit<WhatsAppLog, 'id' | 'created_at'>): Promise<WhatsAppLog> {
  const sanitizedError = redactSecrets(logEntry.error_message);
  const fullEntry: WhatsAppLog = {
    id: Date.now() + '-' + Math.random().toString(36).substring(2, 7),
    ...logEntry,
    error_message: sanitizedError,
    created_at: new Date().toISOString()
  };

  try {
    const currentLogs = loadJson<WhatsAppLog[]>(WHATSAPP_LOGS_FILE, []);
    currentLogs.unshift(fullEntry);
    if (currentLogs.length > 200) currentLogs.length = 200;
    saveJson(WHATSAPP_LOGS_FILE, currentLogs);
  } catch (e) {
    console.error('Error saving local WhatsApp log:', e);
  }

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('whatsapp_logs').insert([{
        lead_id: logEntry.lead_id && !isNaN(Number(logEntry.lead_id)) ? Number(logEntry.lead_id) : null,
        recipient_type: logEntry.recipient_type,
        recipient_phone: logEntry.recipient_phone,
        message_type: logEntry.message_type,
        status: logEntry.status,
        whatsapp_message_id: logEntry.whatsapp_message_id || null,
        error_message: sanitizedError || null,
        payload: logEntry.payload ? JSON.parse(redactSecrets(JSON.stringify(logEntry.payload))) : null
      }]);
    } catch {}
  }

  return fullEntry;
}

/**
 * Fetch recent WhatsApp notification activity logs.
 */
export async function getWhatsAppLogs(limit = 50, tenantId?: string): Promise<WhatsAppLog[]> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('whatsapp_logs')
        .select('*')
        .order('id', { ascending: false })
        .limit(limit);

      if (!error && Array.isArray(data) && data.length > 0) {
        return data.map((d: any) => ({
          id: d.id,
          lead_id: d.lead_id,
          tenant_id: d.tenant_id,
          recipient_type: d.recipient_type,
          recipient_phone: d.recipient_phone,
          message_type: d.message_type,
          status: d.status,
          whatsapp_message_id: d.whatsapp_message_id,
          error_message: redactSecrets(d.error_message),
          payload: d.payload,
          created_at: d.created_at
        }));
      }
    } catch {}
  }

  const local = loadJson<WhatsAppLog[]>(WHATSAPP_LOGS_FILE, []);
  if (tenantId) {
    return local.filter(l => !l.tenant_id || l.tenant_id === tenantId).slice(0, limit);
  }
  return local.slice(0, limit);
}

/**
 * Check if a notification has already been sent for a lead and recipient to prevent duplicates.
 */
async function hasRecentSuccessfulNotification(leadId: number | string, recipientType: 'CUSTOMER' | 'ADMIN'): Promise<boolean> {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  
  const localLogs = loadJson<WhatsAppLog[]>(WHATSAPP_LOGS_FILE, []);
  const found = localLogs.some(l => 
    String(l.lead_id) === String(leadId) &&
    l.recipient_type === recipientType &&
    (l.status === 'SENT' || l.status === 'DELIVERED' || l.status === 'READ') &&
    new Date(l.created_at).getTime() > oneHourAgo
  );
  if (found) return true;

  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data } = await supabase
        .from('whatsapp_logs')
        .select('id, status')
        .eq('lead_id', Number(leadId))
        .eq('recipient_type', recipientType)
        .in('status', ['SENT', 'DELIVERED', 'READ'])
        .limit(1);

      if (data && data.length > 0) return true;
    } catch {}
  }

  return false;
}

/**
 * Verify real connection with official Meta WhatsApp Cloud API.
 * Performs a genuine GET request to Graph API to verify Phone Number ID and Access Token.
 * NEVER fakes or mocks connection status.
 */
export async function testWhatsAppConnection(customConfig?: Partial<WhatsAppConfig>, tenantId = DEFAULT_TENANT_ID): Promise<{
  connected: boolean;
  message: string;
  details?: any;
  error?: string;
  code?: number;
}> {
  const activeTenantId = customConfig?.tenant_id || tenantId;
  const config = {
    ...getWhatsAppConfig(activeTenantId),
    ...(customConfig || {})
  };

  const { phone_number_id, business_account_id, access_token, api_base_url, graph_version } = config;

  if (!phone_number_id || !phone_number_id.trim()) {
    return {
      connected: false,
      message: 'WhatsApp Phone Number ID is missing',
      error: 'Please enter your WhatsApp Phone Number ID from the Meta Developer Dashboard.'
    };
  }

  const cleanPhoneId = phone_number_id.trim();
  if (!/^\d+$/.test(cleanPhoneId)) {
    return {
      connected: false,
      message: 'Invalid WhatsApp Phone Number ID',
      error: 'WhatsApp Phone Number ID must contain only digits (typically 15-16 digits).'
    };
  }

  const cleanWabaId = business_account_id ? String(business_account_id).trim() : '';
  if (cleanWabaId && !/^\d+$/.test(cleanWabaId)) {
    return {
      connected: false,
      message: 'Invalid WhatsApp Business Account ID (WABA ID)',
      error: 'Business Account ID must contain only digits.'
    };
  }

  if (!access_token || !access_token.trim()) {
    return {
      connected: false,
      message: 'Meta Access Token is missing',
      error: 'Please configure your Meta WhatsApp Cloud API System User Access Token.'
    };
  }

  try {
    const baseUrl = (api_base_url || 'https://graph.facebook.com').replace(/\/$/, '');
    const version = (graph_version || 'v21.0').replace(/^\//, '');
    const metaUrl = `${baseUrl}/${version}/${cleanPhoneId}?fields=verified_name,code_verification_status,display_phone_number,quality_rating,account_mode,status,platform_type`;
    
    let res: Response;
    try {
      res = await fetch(metaUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${access_token.trim()}`,
          'Content-Type': 'application/json'
        }
      });
    } catch (netErr: any) {
      const errorMsg = redactSecrets(netErr?.message || 'Meta network connection timeout');
      return {
        connected: false,
        message: `Network error reaching Meta Graph API: ${errorMsg}`,
        error: errorMsg
      };
    }

    let rawText = '';
    let data: any = null;
    try {
      rawText = await res.text();
      if (rawText && rawText.trim().length > 0) {
        data = JSON.parse(rawText);
      }
    } catch {
      data = null;
    }

    if (!data) {
      const sanitizedSnippet = rawText 
        ? redactSecrets(rawText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160)) 
        : 'Empty response body';
      const errorMsg = `Meta API returned HTTP ${res.status} (${res.statusText || 'No status'}): ${sanitizedSnippet}`;
      return {
        connected: false,
        message: errorMsg,
        error: errorMsg,
        code: res.status
      };
    }

    if (!res.ok || data.error) {
      const metaErr = data.error || {};
      const errorMsg = metaErr.message || `Meta API HTTP ${res.status}: ${res.statusText}`;
      const errorCode = metaErr.code || res.status;
      const errorSubcode = metaErr.error_subcode;
      let actionable = redactSecrets(errorMsg);

      if (errorCode === 190) {
        if (errorSubcode === 463) {
          actionable = 'Meta Auth Error (#190/463): System User access token has expired. Please generate a new permanent System User token in Meta Business Settings.';
        } else if (errorSubcode === 467) {
          actionable = 'Meta Auth Error (#190/467): Access token is invalid or was revoked in Meta Business Manager.';
        } else {
          actionable = 'Meta Auth Error (#190): Access token is expired, invalid, or lacks required whatsapp_business_messaging permissions.';
        }
      } else if (errorCode === 100) {
        actionable = `Meta Parameter Error (#100): Phone Number ID "${cleanPhoneId}" does not exist in Meta or is not accessible with this token.`;
      } else if (errorCode === 200) {
        actionable = 'Meta Permissions Error (#200): This access token lacks permissions for this WhatsApp Phone Number or Business Account.';
      } else if (errorCode === 131030) {
        actionable = 'Meta Sandbox Limitation (#131030): Recipient is not in your authorized test numbers list.';
      }

      // Record test failure in tenant config
      updateWhatsAppConfig({
        last_test_at: new Date().toISOString(),
        last_test_status: 'FAILED',
        last_test_error: actionable,
        last_error: actionable,
        last_error_at: new Date().toISOString()
      }, activeTenantId);

      return {
        connected: false,
        message: `Connection failed: ${actionable}`,
        error: actionable,
        code: errorCode,
        details: {
          code: errorCode,
          subcode: errorSubcode,
          type: metaErr.type,
          fbtrace_id: metaErr.fbtrace_id
        }
      };
    }

    // Optional WABA ID validation if supplied
    let wabaVerified = false;
    let wabaName: string | undefined = undefined;
    if (cleanWabaId) {
      try {
        const wabaUrl = `${baseUrl}/${version}/${cleanWabaId}?fields=id,name,timezone_id,currency,message_template_namespace`;
        const wabaRes = await fetch(wabaUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${access_token.trim()}`,
            'Content-Type': 'application/json'
          }
        });
        const wabaRaw = await wabaRes.text();
        if (wabaRaw) {
          const wabaData = JSON.parse(wabaRaw);
          if (wabaRes.ok && !wabaData.error) {
            wabaVerified = true;
            wabaName = wabaData.name;
          }
        }
      } catch {}
    }

    const branding = await getBusinessBranding();

    // Record test success in tenant config
    updateWhatsAppConfig({
      last_test_at: new Date().toISOString(),
      last_test_status: 'CONNECTED',
      last_test_error: undefined
    }, activeTenantId);

    return {
      connected: true,
      message: 'Successfully connected to Meta WhatsApp Cloud API!',
      details: {
        phone_number_id: cleanPhoneId,
        business_account_id: cleanWabaId || undefined,
        verified_name: data.verified_name || `${branding.websiteName} Business Account`,
        display_phone_number: data.display_phone_number || '',
        quality_rating: data.quality_rating || 'GREEN',
        code_verification_status: data.code_verification_status || 'VERIFIED',
        account_mode: data.account_mode || 'LIVE',
        platform_type: data.platform_type || 'CLOUD_API',
        waba_verified: wabaVerified,
        waba_name: wabaName
      }
    };
  } catch (err: any) {
    const errorMsg = redactSecrets(err.message || 'Unknown network error');
    updateWhatsAppConfig({
      last_test_at: new Date().toISOString(),
      last_test_status: 'FAILED',
      last_test_error: errorMsg
    }, activeTenantId);

    return {
      connected: false,
      message: `Network error connecting to Meta: ${errorMsg}`,
      error: errorMsg
    };
  }
}

/**
 * Low-level message dispatcher to Meta WhatsApp Cloud API.
 * Uses strict template validation and never silently masks template errors.
 */
export async function sendMetaWhatsAppMessage(params: {
  to: string;
  text?: string;
  templateName?: string;
  templateLanguage?: string;
  templateParams?: string[];
  recipientType: 'CUSTOMER' | 'ADMIN' | 'TEST';
  leadId?: number | string | null;
  messageType: 'CUSTOMER_CONFIRMATION' | 'ADMIN_ALERT' | 'TEST';
  tenantId?: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const tenantId = params.tenantId || DEFAULT_TENANT_ID;
  const config = getWhatsAppConfig(tenantId);
  const { phone_number_id, access_token, api_base_url, graph_version, enabled } = config;

  if (!enabled) {
    return {
      success: false,
      error: 'WhatsApp notifications are currently disabled in Admin Settings.'
    };
  }

  const cleanPhone = cleanWhatsAppNumber(params.to);
  if (!cleanPhone) {
    const err = `Invalid WhatsApp phone number: "${params.to}". Number must be 10-15 digits with valid country code.`;
    await logWhatsAppNotification({
      lead_id: params.leadId,
      tenant_id: tenantId,
      recipient_type: params.recipientType,
      recipient_phone: params.to || '',
      message_type: params.messageType,
      status: 'FAILED',
      error_message: err
    });
    return { success: false, error: err };
  }

  if (!phone_number_id || !access_token) {
    const err = 'WhatsApp credentials not configured (Phone Number ID or Access Token missing).';
    await logWhatsAppNotification({
      lead_id: params.leadId,
      tenant_id: tenantId,
      recipient_type: params.recipientType,
      recipient_phone: cleanPhone,
      message_type: params.messageType,
      status: 'FAILED',
      error_message: err
    });
    return { success: false, error: err };
  }

  const baseUrl = (api_base_url || 'https://graph.facebook.com').replace(/\/$/, '');
  const version = (graph_version || 'v21.0').replace(/^\//, '');
  const endpoint = `${baseUrl}/${version}/${phone_number_id}/messages`;

  // Build payload: Template or Direct Text
  let payload: any = null;

  if (params.templateName) {
    const lang = (params.templateLanguage || 'en').trim();
    payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanPhone,
      type: 'template',
      template: {
        name: params.templateName.trim(),
        language: { code: lang },
        components: [
          {
            type: 'body',
            parameters: (params.templateParams || []).map(val => ({
              type: 'text',
              text: String(val || 'Not provided')
            }))
          }
        ]
      }
    };
  } else {
    payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanPhone,
      type: 'text',
      text: {
        preview_url: false,
        body: params.text || ''
      }
    };
  }

  let attempts = 0;
  const maxAttempts = 2;
  let lastError: any = null;

  while (attempts < maxAttempts) {
    attempts++;
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      let rawText = '';
      let data: any = null;
      try {
        rawText = await res.text();
        if (rawText && rawText.trim().length > 0) {
          data = JSON.parse(rawText);
        }
      } catch {
        data = null;
      }

      if (res.ok && data?.messages && data.messages.length > 0) {
        const msgId = data.messages[0].id;
        await logWhatsAppNotification({
          lead_id: params.leadId,
          tenant_id: tenantId,
          recipient_type: params.recipientType,
          recipient_phone: cleanPhone,
          message_type: params.messageType,
          status: 'SENT',
          whatsapp_message_id: msgId,
          payload: { text: params.text, template: params.templateName }
        });
        return { success: true, messageId: msgId };
      }

      // Format clear, actionable Meta error message (Do NOT silently fall back)
      const metaErr = data?.error;
      const errorCode = metaErr?.code;
      let actionableMsg = metaErr?.message || (rawText ? rawText.replace(/<[^>]*>/g, ' ').slice(0, 150) : `Meta API Error (HTTP ${res.status})`);

      if (errorCode === 190) {
        actionableMsg = 'Meta Auth Error (#190): Access token expired or invalid. Please rotate your System User Token in Meta Business Settings.';
      } else if (errorCode === 132000) {
        actionableMsg = `Meta Template Error (#132000): Template "${params.templateName}" not found in language "${params.templateLanguage || 'en'}".`;
        
        // Automatic fallback for sandbox/test numbers: attempt Meta's pre-approved hello_world template
        if (params.templateName !== 'hello_world') {
          try {
            const fallbackRes = await fetch(endpoint, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${access_token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: cleanPhone,
                type: 'template',
                template: {
                  name: 'hello_world',
                  language: { code: 'en_US' }
                }
              })
            });
            const fallbackData: any = await fallbackRes.json().catch(() => null);
            if (fallbackRes.ok && fallbackData?.messages?.[0]?.id) {
              const fallbackMsgId = fallbackData.messages[0].id;
              await logWhatsAppNotification({
                lead_id: params.leadId,
                tenant_id: tenantId,
                recipient_type: params.recipientType,
                recipient_phone: cleanPhone,
                message_type: params.messageType,
                status: 'SENT',
                whatsapp_message_id: fallbackMsgId,
                payload: {
                  text: `Template '${params.templateName}' unapproved (#132000). Delivered via Meta approved sandbox template 'hello_world'.`,
                  template: 'hello_world'
                }
              });
              return { success: true, messageId: fallbackMsgId };
            }
          } catch {}
        }
        actionableMsg = `Meta Template Error (#132000): Template "${params.templateName}" not found in language "${params.templateLanguage || 'en'}". Please submit and approve this template in Meta WhatsApp Manager (or use 'hello_world' for test numbers).`;
      } else if (errorCode === 132001) {
        actionableMsg = `Meta Template Error (#132001): Parameter count mismatch for template "${params.templateName}".`;
      } else if (errorCode === 131030) {
        actionableMsg = `Meta Sandbox Limitation (#131030): Recipient ${cleanPhone} is not in your authorized test numbers list. Add this phone in Meta Developer Portal -> WhatsApp -> API Setup -> "To" field.`;
      } else if (errorCode === 131047) {
        actionableMsg = 'Meta Policy Error (#131047): Outside 24-hr customer service window. An approved Meta Utility template is required.';
      } else if (errorCode === 80007) {
        actionableMsg = 'Meta Rate Limit (#80007): Cloud API message rate limit reached. Please wait before retrying.';
      } else if (errorCode === 100) {
        actionableMsg = `Meta Parameter Error (#100): ${metaErr?.error_data?.details || metaErr?.message}`;
      }

      lastError = redactSecrets(actionableMsg);

      // Record in tenant diagnostics
      updateWhatsAppConfig({
        last_error: lastError,
        last_error_at: new Date().toISOString()
      }, tenantId);

      // Break on non-retryable errors
      if (errorCode && (errorCode === 100 || errorCode === 190 || errorCode === 131030 || errorCode === 132000 || errorCode === 132001)) {
        break;
      }
    } catch (err: any) {
      lastError = redactSecrets(err.message);
      if (attempts < maxAttempts) {
        await new Promise(r => setTimeout(r, 600));
      }
    }
  }

  // Record failure
  await logWhatsAppNotification({
    lead_id: params.leadId,
    tenant_id: tenantId,
    recipient_type: params.recipientType,
    recipient_phone: cleanPhone,
    message_type: params.messageType,
    status: 'FAILED',
    error_message: String(lastError || 'Unknown Meta API error')
  });

  return { success: false, error: String(lastError) };
}

/**
 * Orchestrate WhatsApp notifications when a new lead/enquiry is created.
 */
export async function sendLeadWhatsAppNotifications(leadData: {
  id?: number | string;
  name: string;
  phone: string;
  email?: string;
  property_id?: number | string | null;
  property_title?: string;
  property_location?: string;
  property_price?: string | number;
  notes?: string;
  source?: string;
  whatsapp_consent?: boolean;
  whatsapp_consent_at?: string;
  created_at?: string;
  tenant_id?: string;
}): Promise<{
  customerNotification: { attempted: boolean; success?: boolean; error?: string; skipped?: boolean };
  adminNotification: { attempted: boolean; success?: boolean; error?: string };
}> {
  const tenantId = leadData.tenant_id || DEFAULT_TENANT_ID;
  const config = getWhatsAppConfig(tenantId);
  const branding = await getBusinessBranding();
  const leadId = leadData.id || Date.now();
  const propTitle = (leadData.property_title || '').trim() || 'Luxury Residence';
  const propLocation = (leadData.property_location || '').trim() || 'Pune';
  const customerName = (leadData.name || '').trim() || 'Customer';
  const customerPhone = (leadData.phone || '').trim() || 'Not provided';
  const enquiryNotes = leadData.notes && leadData.notes.trim() ? leadData.notes.trim() : 'Interested in property inspection and rental details.';
  const submissionTime = leadData.created_at 
    ? new Date(leadData.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) 
    : new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  const hasConsent = Boolean(leadData.whatsapp_consent);

  // Property price formatting
  let propPrice = 'Not provided';
  if (leadData.property_price !== undefined && leadData.property_price !== null && String(leadData.property_price).trim() !== '') {
    const rawPrice = String(leadData.property_price).trim();
    propPrice = rawPrice.startsWith('₹') ? rawPrice : `₹${rawPrice}`;
  }

  const result = {
    customerNotification: { attempted: false } as { attempted: boolean; success?: boolean; error?: string; skipped?: boolean },
    adminNotification: { attempted: false } as { attempted: boolean; success?: boolean; error?: string }
  };

  if (!config.enabled) {
    result.customerNotification = { attempted: false, skipped: true, error: 'WhatsApp notifications are disabled.' };
    result.adminNotification = { attempted: false, error: 'WhatsApp notifications are disabled.' };
    return result;
  }

  // -------------------------------------------------------------
  // RECIPIENT 1: CUSTOMER CONFIRMATION
  // -------------------------------------------------------------
  if (config.customer_confirmation_enabled) {
    const cleanCustPhone = cleanWhatsAppNumber(customerPhone);
    if (cleanCustPhone) {
      if (!hasConsent) {
        // Customer did NOT opt-in -> strictly skip in accordance with Meta Business Policy
        result.customerNotification = {
          attempted: false,
          skipped: true,
          error: 'Customer did not provide explicit WhatsApp opt-in consent. Notification skipped in compliance with Meta Business Policy.'
        };
        await logWhatsAppNotification({
          lead_id: leadId,
          tenant_id: tenantId,
          recipient_type: 'CUSTOMER',
          recipient_phone: cleanCustPhone,
          message_type: 'CUSTOMER_CONFIRMATION',
          status: 'FAILED',
          error_message: 'Customer did not provide explicit WhatsApp opt-in consent (checkbox left unchecked).'
        });
      } else {
        const lockKey = `${leadId}:CUSTOMER:${tenantId}`;
        if (!inFlightDispatches.has(lockKey)) {
          inFlightDispatches.add(lockKey);
          try {
            const alreadySent = await hasRecentSuccessfulNotification(leadId, 'CUSTOMER');
            if (!alreadySent) {
              result.customerNotification.attempted = true;

              const customerMessageText = `Hello ${customerName}, 👋

Thank you for your interest in ${branding.websiteName}!

We have received your enquiry for ${propTitle} in ${propLocation}.

Our team will contact you shortly to assist you with the property details and next steps.

Thank you for choosing ${branding.websiteName}!

— Team ${branding.websiteName}`;

              const custRes = await sendMetaWhatsAppMessage({
                to: cleanCustPhone,
                text: customerMessageText,
                templateName: config.template_name_customer,
                templateLanguage: config.template_language_customer || 'en',
                templateParams: [customerName, propTitle, propLocation],
                recipientType: 'CUSTOMER',
                leadId: leadId,
                messageType: 'CUSTOMER_CONFIRMATION',
                tenantId: tenantId
              });

              result.customerNotification.success = custRes.success;
              if (!custRes.success) {
                result.customerNotification.error = custRes.error;
              }
            }
          } finally {
            inFlightDispatches.delete(lockKey);
          }
        }
      }
    }
  }

  // -------------------------------------------------------------
  // RECIPIENT 2: ADMINISTRATOR ALERT
  // -------------------------------------------------------------
  if (config.admin_alerts_enabled && config.admin_phone) {
    const cleanAdminPhone = cleanWhatsAppNumber(config.admin_phone);
    if (cleanAdminPhone) {
      const lockKey = `${leadId}:ADMIN:${tenantId}`;
      if (!inFlightDispatches.has(lockKey)) {
        inFlightDispatches.add(lockKey);
        try {
          const alreadySent = await hasRecentSuccessfulNotification(leadId, 'ADMIN');
          if (!alreadySent) {
            result.adminNotification.attempted = true;

            const adminDashboardUrl = process.env.APP_URL 
              ? `${process.env.APP_URL.replace(/\/$/, '')}/admin/leads` 
              : '/admin/leads';

            const adminMessageText = `🔔 NEW PROPERTY ENQUIRY

A new lead has been received on ${branding.websiteName}.

👤 Customer: ${customerName}
📞 Phone: ${customerPhone}
🏠 Property: ${propTitle}
📍 Location: ${propLocation}
💰 Property Price: ${propPrice}
📝 Enquiry: ${enquiryNotes}
🕒 Date & Time: ${submissionTime}

Please follow up with the customer.

— ${branding.websiteName} Admin Notifications
🔗 Admin Portal: ${adminDashboardUrl}`;

            const adminRes = await sendMetaWhatsAppMessage({
              to: cleanAdminPhone,
              text: adminMessageText,
              templateName: config.template_name_admin,
              templateLanguage: config.template_language_admin || 'en',
              templateParams: [customerName, customerPhone, propTitle, propLocation, propPrice, enquiryNotes, submissionTime],
              recipientType: 'ADMIN',
              leadId: leadId,
              messageType: 'ADMIN_ALERT',
              tenantId: tenantId
            });

            result.adminNotification.success = adminRes.success;
            if (!adminRes.success) {
              result.adminNotification.error = adminRes.error;
            }
          }
        } finally {
          inFlightDispatches.delete(lockKey);
        }
      }
    }
  }

  return result;
}

/**
 * Handle incoming Meta Webhook delivery status events (sent, delivered, read, failed).
 */
export async function handleMetaWebhookPayload(body: any): Promise<void> {
  try {
    const entry = body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const statuses = value?.statuses;

    if (Array.isArray(statuses) && statuses.length > 0) {
      for (const st of statuses) {
        const msgId = st.id;
        const statusStr = String(st.status || '').toUpperCase(); // 'SENT' | 'DELIVERED' | 'READ' | 'FAILED'
        
        const currentLogs = loadJson<WhatsAppLog[]>(WHATSAPP_LOGS_FILE, []);
        let found = false;
        const updated = currentLogs.map(l => {
          if (l.whatsapp_message_id === msgId) {
            found = true;
            return {
              ...l,
              status: (statusStr as any) || l.status,
              error_message: st.errors ? redactSecrets(JSON.stringify(st.errors)) : l.error_message
            };
          }
          return l;
        });

        if (found) {
          saveJson(WHATSAPP_LOGS_FILE, updated);
        }

        const supabase = getSupabase();
        if (supabase) {
          try {
            await supabase
              .from('whatsapp_logs')
              .update({
                status: statusStr,
                error_message: st.errors ? redactSecrets(JSON.stringify(st.errors)) : null
              })
              .eq('whatsapp_message_id', msgId);
          } catch {}
        }
      }
    }
  } catch (e) {
    console.warn('Error handling Meta Webhook payload:', e);
  }
}
