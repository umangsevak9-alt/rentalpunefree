/**
 * Cloudflare Worker Entry Point (_worker.js)
 * 
 * Production handler for Rental Pune CRM on Cloudflare Workers:
 * 1. Persistent configuration & audit logs backed by Supabase Cloud Database.
 * 2. POST /api/leads (Saves enquiry to Supabase & dispatches live Meta WhatsApp notifications).
 * 3. POST /api/bookings (Saves booking to Supabase & dispatches live Meta WhatsApp notifications).
 * 4. POST /api/whatsapp/test-connection (Live Meta Graph API test).
 * 5. GET & POST /api/whatsapp/settings (Live sync to Supabase settings table).
 * 6. POST /api/whatsapp/send-test (Dispatches verified template message via Meta API).
 * 7. GET /api/whatsapp/logs (Real-time audit log from Supabase).
 * 8. Static assets & SPA fallback via env.ASSETS.fetch(request).
 */

const SUPABASE_DEFAULT_URL = 'https://ddfsfemggwjtryosdgya.supabase.co';
const SUPABASE_DEFAULT_KEY = 'sb_publishable_l4em_aFSdxQIpW2gLbShHA_r8Gjpt-j';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept',
  'Access-Control-Max-Age': '86400',
};

function jsonResponse(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...CORS_HEADERS,
      ...extraHeaders
    }
  });
}

function redactSecrets(text) {
  if (!text) return '';
  return String(text)
    .replace(/EA[A-Za-z0-9_-]{20,}/g, 'EAA***[REDACTED]')
    .replace(/(Bearer\s+)[A-Za-z0-9._-]+/gi, '$1***[REDACTED]')
    .replace(/(access_token=)[^&]+/gi, '$1***[REDACTED]');
}

function getMaskedToken(token) {
  if (!token) return '';
  const clean = String(token).trim();
  if (clean.length <= 8) return '••••••••';
  return `${clean.slice(0, 4)}••••••••${clean.slice(-4)}`;
}

function cleanPhone(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

// Supabase REST Helper
function getSupabaseCredentials(env) {
  const url = (env && env.SUPABASE_URL) || SUPABASE_DEFAULT_URL;
  const key = (env && env.SUPABASE_ANON_KEY) || SUPABASE_DEFAULT_KEY;
  return { url: url.replace(/\/$/, ''), key };
}

async function fetchFromSupabase(path, env, options = {}) {
  const { url, key } = getSupabaseCredentials(env);
  const headers = {
    'apikey': key,
    'Authorization': `Bearer ${key}`,
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  return await fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers
  });
}

// Load WhatsApp configuration permanently from Supabase settings table
async function loadWhatsAppConfig(env) {
  const fallback = {
    tenant_id: 'rental_pune',
    client_name: 'Rental Pune Luxury Real Estate',
    provider: 'META_CLOUD_API',
    api_base_url: 'https://graph.facebook.com',
    graph_version: 'v21.0',
    phone_number_id: (env && env.WHATSAPP_PHONE_NUMBER_ID) || '',
    business_account_id: (env && env.WHATSAPP_BUSINESS_ACCOUNT_ID) || '',
    access_token: (env && env.WHATSAPP_ACCESS_TOKEN) || '',
    admin_phone: (env && env.WHATSAPP_ADMIN_PHONE) || '+919822012345',
    enabled: true,
    customer_confirmation_enabled: true,
    admin_alerts_enabled: true,
    template_name_customer: 'rental_pune_enquiry_customer',
    template_language_customer: 'en',
    template_name_admin: 'rental_pune_admin_alert',
    template_language_admin: 'en',
    webhook_verify_token: 'rental_pune_secure_verify_2026',
    has_access_token: false,
    masked_access_token: '',
    updated_at: new Date().toISOString()
  };

  try {
    const res = await fetchFromSupabase('settings?select=key,value&key=like.whatsapp*', env);
    if (res.ok) {
      const rows = await res.json();
      if (Array.isArray(rows) && rows.length > 0) {
        const map = {};
        for (const r of rows) {
          if (r.key && r.value !== null && r.value !== undefined) {
            map[r.key] = r.value;
          }
        }
        fallback.phone_number_id = map['whatsapp_phone_number_id'] || fallback.phone_number_id;
        fallback.business_account_id = map['whatsapp_business_account_id'] || fallback.business_account_id;
        fallback.access_token = map['whatsapp_access_token'] || fallback.access_token;
        fallback.admin_phone = map['whatsapp_admin_phone'] || fallback.admin_phone;
        fallback.enabled = map['whatsapp_enabled'] !== 'false';
        fallback.customer_confirmation_enabled = map['whatsapp_customer_confirmation_enabled'] !== 'false';
        fallback.admin_alerts_enabled = map['whatsapp_admin_alerts_enabled'] !== 'false';
        fallback.template_name_customer = map['whatsapp_template_name_customer'] || fallback.template_name_customer;
        fallback.template_name_admin = map['whatsapp_template_name_admin'] || fallback.template_name_admin;
        fallback.template_language_customer = map['whatsapp_template_language_customer'] || fallback.template_language_customer;
        fallback.template_language_admin = map['whatsapp_template_language_admin'] || fallback.template_language_admin;
        fallback.has_access_token = Boolean(fallback.access_token);
        fallback.masked_access_token = getMaskedToken(fallback.access_token);
      }
    }
  } catch (err) {
    console.warn('Error loading config from Supabase:', err);
  }

  return fallback;
}

// Persist WhatsApp configuration permanently to Supabase settings table
async function saveWhatsAppConfigToSupabase(newConfig, env) {
  const rows = [
    { key: 'whatsapp_phone_number_id', value: newConfig.phone_number_id || '' },
    { key: 'whatsapp_business_account_id', value: newConfig.business_account_id || '' },
    { key: 'whatsapp_admin_phone', value: newConfig.admin_phone || '+919822012345' },
    { key: 'whatsapp_enabled', value: String(newConfig.enabled !== false) },
    { key: 'whatsapp_customer_confirmation_enabled', value: String(newConfig.customer_confirmation_enabled !== false) },
    { key: 'whatsapp_admin_alerts_enabled', value: String(newConfig.admin_alerts_enabled !== false) },
    { key: 'whatsapp_template_name_customer', value: newConfig.template_name_customer || 'rental_pune_enquiry_customer' },
    { key: 'whatsapp_template_name_admin', value: newConfig.template_name_admin || 'rental_pune_admin_alert' },
    { key: 'whatsapp_template_language_customer', value: newConfig.template_language_customer || 'en' },
    { key: 'whatsapp_template_language_admin', value: newConfig.template_language_admin || 'en' },
    { key: 'whatsapp_updated_at', value: new Date().toISOString() }
  ];

  if (newConfig.access_token && !newConfig.access_token.includes('••') && !newConfig.access_token.includes('*')) {
    rows.push({ key: 'whatsapp_access_token', value: newConfig.access_token.trim() });
  }

  try {
    await fetchFromSupabase('settings', env, {
      method: 'POST',
      headers: { 'Prefer': 'resolution=merge-duplicates' },
      body: JSON.stringify(rows)
    });
  } catch (e) {
    console.error('Failed to save settings to Supabase:', e);
  }
}

// Append notification log entry permanently to Supabase
async function appendWhatsAppLog(logEntry, env) {
  try {
    const res = await fetchFromSupabase('settings?select=value&key=eq.whatsapp_audit_logs', env);
    let logs = [];
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data[0]?.value) {
        try { logs = JSON.parse(data[0].value); } catch {}
      }
    }
    logs.unshift(logEntry);
    if (logs.length > 100) logs.length = 100;

    await fetchFromSupabase('settings', env, {
      method: 'POST',
      headers: { 'Prefer': 'resolution=merge-duplicates' },
      body: JSON.stringify([{ key: 'whatsapp_audit_logs', value: JSON.stringify(logs) }])
    });
  } catch (e) {
    console.error('Failed to persist audit log:', e);
  }
}

// Load logs permanently from Supabase
async function loadWhatsAppLogs(env) {
  try {
    const res = await fetchFromSupabase('settings?select=value&key=eq.whatsapp_audit_logs', env);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data[0]?.value) {
        return JSON.parse(data[0].value);
      }
    }
  } catch {}
  return [];
}

// Send message via Meta WhatsApp Cloud API with Sandbox Fallback
async function sendMetaWhatsAppMessageOnWorker({ to, templateName, templateLanguage, templateParams, recipientType, leadId, env, config }) {
  const recipientPhone = cleanPhone(to);
  if (!recipientPhone) {
    const err = `Invalid phone number: ${to}`;
    await appendWhatsAppLog({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      lead_id: leadId,
      recipient_type: recipientType,
      recipient_phone: to || '',
      status: 'FAILED',
      error_message: err,
      created_at: new Date().toISOString()
    }, env);
    return { success: false, error: err };
  }

  const { phone_number_id, access_token, api_base_url, graph_version } = config;
  if (!phone_number_id || !access_token) {
    const err = 'WhatsApp credentials not configured (Phone Number ID or Access Token missing).';
    await appendWhatsAppLog({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      lead_id: leadId,
      recipient_type: recipientType,
      recipient_phone: recipientPhone,
      status: 'FAILED',
      error_message: err,
      created_at: new Date().toISOString()
    }, env);
    return { success: false, error: err };
  }

  const baseUrl = (api_base_url || 'https://graph.facebook.com').replace(/\/$/, '');
  const version = (graph_version || 'v21.0').replace(/^\//, '');
  const endpoint = `${baseUrl}/${version}/${phone_number_id}/messages`;

  const tName = templateName || 'hello_world';
  const tLang = tName === 'hello_world' ? 'en_US' : (templateLanguage || 'en');

  let payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: recipientPhone,
    type: 'template',
    template: {
      name: tName,
      language: { code: tLang }
    }
  };

  if (tName !== 'hello_world' && Array.isArray(templateParams) && templateParams.length > 0) {
    payload.template.components = [
      {
        type: 'body',
        parameters: templateParams.map(val => ({ type: 'text', text: String(val || 'Not provided') }))
      }
    ];
  }

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json().catch(() => null);

    if (res.ok && data?.messages?.[0]?.id) {
      const msgId = data.messages[0].id;
      await appendWhatsAppLog({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        lead_id: leadId,
        recipient_type: recipientType,
        recipient_phone: recipientPhone,
        status: 'SENT',
        whatsapp_message_id: msgId,
        payload: { template: tName },
        created_at: new Date().toISOString()
      }, env);
      return { success: true, messageId: msgId };
    }

    const errObj = data?.error || {};
    const code = errObj.code || res.status;
    let diagnostic = errObj.message || `Meta API error HTTP ${res.status}`;

    // Auto-fallback for Meta Sandbox / Test Numbers if custom template is not yet approved
    if (code === 132000 && tName !== 'hello_world') {
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
            to: recipientPhone,
            type: 'template',
            template: { name: 'hello_world', language: { code: 'en_US' } }
          })
        });
        const fallbackData = await fallbackRes.json().catch(() => null);
        if (fallbackRes.ok && fallbackData?.messages?.[0]?.id) {
          const fallbackMsgId = fallbackData.messages[0].id;
          await appendWhatsAppLog({
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            lead_id: leadId,
            recipient_type: recipientType,
            recipient_phone: recipientPhone,
            status: 'SENT',
            whatsapp_message_id: fallbackMsgId,
            payload: { note: `Custom template '${tName}' not approved (#132000). Delivered via Meta approved sandbox template 'hello_world'.` },
            created_at: new Date().toISOString()
          }, env);
          return { success: true, messageId: fallbackMsgId };
        }
      } catch {}
      diagnostic = `Meta Template Error (#132000): Template "${tName}" not approved in Meta WhatsApp Manager. (For test numbers, use 'hello_world').`;
    } else if (code === 131030) {
      diagnostic = `Meta Sandbox Limitation (#131030): Recipient ${recipientPhone} is not in your authorized test numbers list. Add this number in Meta Developer Portal -> WhatsApp -> API Setup -> "To" field.`;
    } else if (code === 190) {
      diagnostic = 'Meta Auth Error (#190): Access token is expired or invalid.';
    }

    await appendWhatsAppLog({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      lead_id: leadId,
      recipient_type: recipientType,
      recipient_phone: recipientPhone,
      status: 'FAILED',
      error_message: redactSecrets(diagnostic),
      created_at: new Date().toISOString()
    }, env);
    return { success: false, error: redactSecrets(diagnostic) };

  } catch (netErr) {
    const err = redactSecrets(netErr.message);
    await appendWhatsAppLog({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      lead_id: leadId,
      recipient_type: recipientType,
      recipient_phone: recipientPhone,
      status: 'FAILED',
      error_message: err,
      created_at: new Date().toISOString()
    }, env);
    return { success: false, error: err };
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname.replace(/\/$/, '') || '/';
    const method = request.method.toUpperCase();

    // 1. CORS Preflight
    if (method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          ...CORS_HEADERS,
          'Allow': 'GET, POST, PUT, DELETE, OPTIONS'
        }
      });
    }

    const requireAuth = () => {
      const authHeader = request.headers.get('Authorization') || '';
      if (!authHeader.startsWith('Bearer ')) {
        return jsonResponse(
          { error: 'Unauthorized: No token provided', message: 'Authentication required for WhatsApp administration.' },
          401
        );
      }
      return null;
    };

    // 2. LEAD CREATION ROUTE (POST /api/leads)
    if (pathname === '/api/leads') {
      if (method === 'POST') {
        let body = {};
        try {
          const text = await request.text();
          if (text) body = JSON.parse(text);
        } catch {}

        const name = (body.name || body.customer_name || 'Website Visitor').trim();
        const phone = (body.phone || body.customer_phone || '').trim();
        const email = (body.email || body.customer_email || '').trim();
        const notes = body.notes || 'General enquiry';
        const propTitle = body.property_title || 'Luxury Residence';
        const propLoc = body.property_location || 'Pune';
        const propPrice = body.property_price ? `₹${body.property_price}` : 'Not provided';
        const hasConsent = body.whatsapp_consent === true || body.whatsapp_consent === 'true';

        let leadId = Date.now();

        // 1. Save lead to Supabase Database
        try {
          const insertPayload = {
            name,
            phone: phone || null,
            email: email || null,
            notes,
            source: body.source || 'Website Concierge',
            status: 'New',
            whatsapp_consent: hasConsent,
            whatsapp_consent_at: hasConsent ? new Date().toISOString() : null,
            created_at: new Date().toISOString()
          };
          const sbRes = await fetchFromSupabase('leads', env, {
            method: 'POST',
            headers: { 'Prefer': 'return=representation' },
            body: JSON.stringify([insertPayload])
          });
          if (sbRes.ok) {
            const savedData = await sbRes.json();
            if (savedData?.[0]?.id) {
              leadId = savedData[0].id;
            }
          }
        } catch (dbErr) {
          console.warn('Lead DB save warning:', dbErr);
        }

        // 2. Load live WhatsApp config from Supabase
        const config = await loadWhatsAppConfig(env);

        // 3. Dispatch WhatsApp notifications
        const dispatchWork = async () => {
          // Admin Alert
          if (config.enabled && config.admin_alerts_enabled && config.admin_phone) {
            await sendMetaWhatsAppMessageOnWorker({
              to: config.admin_phone,
              templateName: config.template_name_admin || 'hello_world',
              templateLanguage: config.template_language_admin || 'en_US',
              templateParams: [name, phone, propTitle, propLoc, propPrice, notes],
              recipientType: 'ADMIN',
              leadId,
              env,
              config
            });
          }

          // Customer Confirmation (only if opt-in consent was provided)
          if (config.enabled && config.customer_confirmation_enabled && phone) {
            if (hasConsent) {
              await sendMetaWhatsAppMessageOnWorker({
                to: phone,
                templateName: config.template_name_customer || 'hello_world',
                templateLanguage: config.template_language_customer || 'en_US',
                templateParams: [name, propTitle, propLoc],
                recipientType: 'CUSTOMER',
                leadId,
                env,
                config
              });
            } else {
              await appendWhatsAppLog({
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                lead_id: leadId,
                recipient_type: 'CUSTOMER',
                recipient_phone: phone,
                status: 'SKIPPED',
                error_message: 'Customer did not provide explicit WhatsApp opt-in consent (checkbox left unchecked).',
                created_at: new Date().toISOString()
              }, env);
            }
          }
        };

        if (ctx && typeof ctx.waitUntil === 'function') {
          ctx.waitUntil(dispatchWork());
        } else {
          await dispatchWork();
        }

        return jsonResponse({
          success: true,
          id: leadId,
          message: 'Enquiry received. Our team will contact you in 2 hours.'
        }, 201);
      }

      return jsonResponse({ error: 'Method Not Allowed', allowedMethods: ['POST', 'OPTIONS'] }, 405, { 'Allow': 'POST, OPTIONS' });
    }

    // 3. BOOKING CREATION ROUTE (POST /api/bookings)
    if (pathname === '/api/bookings') {
      if (method === 'POST') {
        let body = {};
        try {
          const text = await request.text();
          if (text) body = JSON.parse(text);
        } catch {}

        const name = (body.customer_name || body.name || 'Website Visitor').trim();
        const phone = (body.customer_phone || body.phone || '').trim();
        const propTitle = body.property_title || body.propertyName || 'Luxury Residence';
        const propLoc = body.property_location || 'Pune';
        const hasConsent = body.whatsapp_consent === true || body.whatsapp_consent === 'true';
        let bookingId = Date.now();

        try {
          const insertPayload = {
            property_id: body.propertyId || body.property_id || null,
            property_title: propTitle,
            property_location: propLoc,
            customer_name: name,
            customer_phone: phone,
            customer_email: body.customer_email || body.email || null,
            notes: body.notes || 'Property booking request',
            status: 'NEW',
            whatsapp_consent: hasConsent,
            whatsapp_consent_at: hasConsent ? new Date().toISOString() : null,
            created_at: new Date().toISOString()
          };
          const sbRes = await fetchFromSupabase('property_bookings', env, {
            method: 'POST',
            headers: { 'Prefer': 'return=representation' },
            body: JSON.stringify([insertPayload])
          });
          if (sbRes.ok) {
            const savedData = await sbRes.json();
            if (savedData?.[0]?.id) bookingId = savedData[0].id;
          }
        } catch (dbErr) {
          console.warn('Booking DB save warning:', dbErr);
        }

        const config = await loadWhatsAppConfig(env);

        const dispatchWork = async () => {
          if (config.enabled && config.admin_alerts_enabled && config.admin_phone) {
            await sendMetaWhatsAppMessageOnWorker({
              to: config.admin_phone,
              templateName: config.template_name_admin || 'hello_world',
              templateLanguage: config.template_language_admin || 'en_US',
              templateParams: [name, phone, propTitle, propLoc],
              recipientType: 'ADMIN',
              leadId: bookingId,
              env,
              config
            });
          }
        };

        if (ctx && typeof ctx.waitUntil === 'function') {
          ctx.waitUntil(dispatchWork());
        } else {
          await dispatchWork();
        }

        return jsonResponse({
          success: true,
          booking: { id: bookingId, customer_name: name, customer_phone: phone, property_title: propTitle }
        }, 201);
      }
      return jsonResponse({ error: 'Method Not Allowed', allowedMethods: ['POST', 'OPTIONS'] }, 405, { 'Allow': 'POST, OPTIONS' });
    }

    // 4. WHATSAPP SETTINGS (GET & POST)
    if (pathname === '/api/whatsapp/settings') {
      if (method === 'GET') {
        const authErr = requireAuth();
        if (authErr) return authErr;

        const config = await loadWhatsAppConfig(env);
        return jsonResponse({
          ...config,
          access_token: undefined, // Never expose raw token in response
          masked_access_token: config.masked_access_token || getMaskedToken(config.access_token),
          has_access_token: Boolean(config.access_token)
        });
      }

      if (method === 'POST') {
        const authErr = requireAuth();
        if (authErr) return authErr;

        let body = {};
        try {
          const text = await request.text();
          if (text) body = JSON.parse(text);
        } catch {
          return jsonResponse({ error: 'Invalid JSON payload' }, 400);
        }

        const currentConfig = await loadWhatsAppConfig(env);
        const newAccessToken = body.access_token && !body.access_token.includes('••') && !body.access_token.includes('*')
          ? String(body.access_token).trim()
          : currentConfig.access_token;

        const updated = {
          ...currentConfig,
          phone_number_id: body.phone_number_id !== undefined ? String(body.phone_number_id).trim() : currentConfig.phone_number_id,
          business_account_id: body.business_account_id !== undefined ? String(body.business_account_id).trim() : currentConfig.business_account_id,
          admin_phone: body.admin_phone !== undefined ? String(body.admin_phone).trim() : currentConfig.admin_phone,
          enabled: body.enabled !== undefined ? Boolean(body.enabled) : currentConfig.enabled,
          customer_confirmation_enabled: body.customer_confirmation_enabled !== undefined ? Boolean(body.customer_confirmation_enabled) : currentConfig.customer_confirmation_enabled,
          admin_alerts_enabled: body.admin_alerts_enabled !== undefined ? Boolean(body.admin_alerts_enabled) : currentConfig.admin_alerts_enabled,
          template_name_customer: body.template_name_customer || currentConfig.template_name_customer,
          template_language_customer: body.template_language_customer || currentConfig.template_language_customer,
          template_name_admin: body.template_name_admin || currentConfig.template_name_admin,
          template_language_admin: body.template_language_admin || currentConfig.template_language_admin,
          access_token: newAccessToken
        };

        await saveWhatsAppConfigToSupabase(updated, env);

        return jsonResponse({
          success: true,
          message: 'WhatsApp configuration saved permanently.',
          settings: { ...updated, access_token: undefined, has_access_token: Boolean(newAccessToken) }
        });
      }

      return jsonResponse({ error: 'Method Not Allowed', allowedMethods: ['GET', 'POST', 'OPTIONS'] }, 405, { 'Allow': 'GET, POST, OPTIONS' });
    }

    // 5. WHATSAPP TEST CONNECTION (POST)
    if (pathname === '/api/whatsapp/test-connection') {
      if (method !== 'POST') {
        return jsonResponse({ connected: false, message: 'Please use POST', error: 'HTTP 405 Method Not Allowed' }, 405, { 'Allow': 'POST, OPTIONS' });
      }

      const authErr = requireAuth();
      if (authErr) return authErr;

      let body = {};
      try {
        const text = await request.text();
        if (text && text.trim()) body = JSON.parse(text);
      } catch {}

      const config = await loadWhatsAppConfig(env);
      const rawPhoneId = body.phone_number_id || config.phone_number_id || '';
      const phoneNumberId = String(rawPhoneId).trim();
      const rawToken = (body.access_token && !body.access_token.includes('••') && !body.access_token.includes('*'))
        ? body.access_token
        : config.access_token;
      const accessToken = String(rawToken || '').trim();
      const apiBaseUrl = (body.api_base_url || config.api_base_url || 'https://graph.facebook.com').replace(/\/$/, '');
      const graphVersion = (body.graph_version || config.graph_version || 'v21.0').replace(/^\//, '');

      if (!phoneNumberId) {
        return jsonResponse({
          connected: false,
          message: 'WhatsApp Phone Number ID is missing',
          error: 'Please enter your WhatsApp Phone Number ID from the Meta Developer Dashboard.'
        }, 200);
      }

      if (!accessToken) {
        return jsonResponse({
          connected: false,
          message: 'Meta Access Token is missing',
          error: 'Please configure your Meta WhatsApp Cloud API System User Access Token.'
        }, 200);
      }

      const metaUrl = `${apiBaseUrl}/${graphVersion}/${phoneNumberId}?fields=verified_name,code_verification_status,display_phone_number,quality_rating,account_mode,status,platform_type`;

      try {
        const metaRes = await fetch(metaUrl, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
        });
        const metaData = await metaRes.json().catch(() => null);

        if (!metaRes.ok || metaData?.error) {
          const errObj = metaData?.error || {};
          let diagnostic = errObj.message || `Meta API error (HTTP ${metaRes.status})`;
          if (errObj.code === 190) {
            diagnostic = 'Meta Auth Error (#190): Access token is expired or invalid.';
          }
          return jsonResponse({ connected: false, message: diagnostic, error: diagnostic, code: errObj.code }, 200);
        }

        return jsonResponse({
          connected: true,
          message: 'Verified with Meta Graph API! Connection established.',
          details: {
            verified_name: metaData.verified_name || 'Verified Business Account',
            display_phone_number: metaData.display_phone_number || phoneNumberId,
            quality_rating: metaData.quality_rating || 'UNKNOWN',
            status: metaData.status || 'CONNECTED'
          }
        }, 200);
      } catch (err) {
        return jsonResponse({ connected: false, message: `Network error: ${err.message}`, error: err.message }, 200);
      }
    }

    // 6. WHATSAPP SEND TEST MESSAGE (POST)
    if (pathname === '/api/whatsapp/send-test') {
      const authErr = requireAuth();
      if (authErr) return authErr;

      let body = {};
      try {
        const text = await request.text();
        if (text) body = JSON.parse(text);
      } catch {}

      const config = await loadWhatsAppConfig(env);
      const targetPhone = body.phone || config.admin_phone;
      if (!targetPhone) {
        return jsonResponse({ error: 'Please enter a recipient phone number.' }, 400);
      }

      const result = await sendMetaWhatsAppMessageOnWorker({
        to: targetPhone,
        templateName: body.template_name || 'hello_world',
        templateLanguage: body.template_language || 'en_US',
        recipientType: 'TEST',
        leadId: Date.now(),
        env,
        config
      });

      if (result.success) {
        return jsonResponse({
          success: true,
          message: `Test message successfully delivered to ${targetPhone} via Meta Cloud API!`,
          messageId: result.messageId
        });
      } else {
        return jsonResponse({ success: false, error: result.error || 'Failed to send test message via Meta API.' }, 400);
      }
    }

    // 7. TENANTS & LOGS
    if (pathname === '/api/whatsapp/tenants') {
      const config = await loadWhatsAppConfig(env);
      return jsonResponse([{ tenant_id: 'rental_pune', client_name: config.client_name }]);
    }

    if (pathname === '/api/whatsapp/logs') {
      const logs = await loadWhatsAppLogs(env);
      return jsonResponse(logs);
    }

    // 8. STATIC ASSETS & SPA ROUTING
    if (env.ASSETS && typeof env.ASSETS.fetch === 'function') {
      try {
        const assetRes = await env.ASSETS.fetch(request);
        if (assetRes.status !== 404) return assetRes;

        const acceptHeader = request.headers.get('Accept') || '';
        if (method === 'GET' && acceptHeader.includes('text/html')) {
          const indexReq = new Request(new URL('/index.html', request.url), request);
          return await env.ASSETS.fetch(indexReq);
        }
        return assetRes;
      } catch {
        return new Response('Asset not found', { status: 404 });
      }
    }

    return new Response('Rental Pune Worker - Static assets not configured', { status: 404 });
  }
};
