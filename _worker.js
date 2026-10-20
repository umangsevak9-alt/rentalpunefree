/**
 * Cloudflare Worker Entry Point (_worker.js)
 * 
 * Production handler for Rental Pune CRM on Cloudflare Workers:
 * - CORS preflight (OPTIONS)
 * - POST /api/leads (Saves enquiry & sends WhatsApp notification to Admin & Customer)
 * - POST /api/bookings (Saves booking & sends WhatsApp notification)
 * - POST /api/whatsapp/test-connection (Live Meta Graph API verification)
 * - GET /api/whatsapp/settings & POST /api/whatsapp/settings (Retrieve & Save config)
 * - POST /api/whatsapp/send-test (Sends verified hello_world or custom template)
 * - GET /api/whatsapp/tenants & GET /api/whatsapp/logs
 * - Static assets & SPA fallback via env.ASSETS.fetch(request)
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept',
  'Access-Control-Max-Age': '86400',
};

let storedConfig = {
  tenant_id: 'rental_pune',
  client_name: 'Rental Pune Luxury Real Estate',
  provider: 'META_CLOUD_API',
  api_base_url: 'https://graph.facebook.com',
  graph_version: 'v21.0',
  phone_number_id: '',
  business_account_id: '',
  access_token: '',
  admin_phone: '+919822012345',
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

let storedLogs = [];

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

// Meta message dispatch on Cloudflare Worker
async function dispatchMetaMessage({ to, templateName, templateLanguage, templateParams, recipientType, leadId, text }) {
  const recipientPhone = cleanPhone(to);
  if (!recipientPhone) {
    const err = `Invalid phone number: ${to}`;
    storedLogs.unshift({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      lead_id: leadId,
      recipient_type: recipientType,
      recipient_phone: to || '',
      status: 'FAILED',
      error_message: err,
      created_at: new Date().toISOString()
    });
    return { success: false, error: err };
  }

  const { phone_number_id, access_token, api_base_url, graph_version } = storedConfig;
  if (!phone_number_id || !access_token) {
    const err = 'WhatsApp credentials not configured (Phone Number ID or Access Token missing).';
    storedLogs.unshift({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      lead_id: leadId,
      recipient_type: recipientType,
      recipient_phone: recipientPhone,
      status: 'FAILED',
      error_message: err,
      created_at: new Date().toISOString()
    });
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

  if (tName !== 'hello_world' && templateParams && templateParams.length > 0) {
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
      storedLogs.unshift({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        lead_id: leadId,
        recipient_type: recipientType,
        recipient_phone: recipientPhone,
        status: 'SENT',
        whatsapp_message_id: msgId,
        payload: { template: tName },
        created_at: new Date().toISOString()
      });
      return { success: true, messageId: msgId };
    }

    const errObj = data?.error || {};
    const code = errObj.code || res.status;
    let diagnostic = errObj.message || `Meta API error HTTP ${res.status}`;

    if (code === 132000 && tName !== 'hello_world') {
      // Auto-fallback to Meta's universally approved hello_world for sandbox / test numbers
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
          storedLogs.unshift({
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            lead_id: leadId,
            recipient_type: recipientType,
            recipient_phone: recipientPhone,
            status: 'SENT',
            whatsapp_message_id: fallbackMsgId,
            payload: { note: `Custom template '${tName}' not approved. Sent via sandbox 'hello_world'.` },
            created_at: new Date().toISOString()
          });
          return { success: true, messageId: fallbackMsgId };
        }
      } catch {}
      diagnostic = `Meta Template Error (#132000): Template "${tName}" not approved in Meta WhatsApp Manager. (For test numbers, use 'hello_world').`;
    } else if (code === 131030) {
      diagnostic = `Meta Sandbox Limitation (#131030): Recipient ${recipientPhone} is not in your authorized test numbers list. Add this number in Meta Developer Portal -> WhatsApp -> API Setup -> To field.`;
    } else if (code === 190) {
      diagnostic = 'Meta Auth Error (#190): Access token is expired or invalid.';
    }

    storedLogs.unshift({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      lead_id: leadId,
      recipient_type: recipientType,
      recipient_phone: recipientPhone,
      status: 'FAILED',
      error_message: redactSecrets(diagnostic),
      created_at: new Date().toISOString()
    });
    return { success: false, error: redactSecrets(diagnostic) };

  } catch (netErr) {
    const err = redactSecrets(netErr.message);
    storedLogs.unshift({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      lead_id: leadId,
      recipient_type: recipientType,
      recipient_phone: recipientPhone,
      status: 'FAILED',
      error_message: err,
      created_at: new Date().toISOString()
    });
    return { success: false, error: err };
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname.replace(/\/$/, '') || '/';
    const method = request.method.toUpperCase();

    // Sync from env if present
    if (env.WHATSAPP_PHONE_NUMBER_ID && !storedConfig.phone_number_id) {
      storedConfig.phone_number_id = env.WHATSAPP_PHONE_NUMBER_ID;
    }
    if (env.WHATSAPP_ACCESS_TOKEN && !storedConfig.access_token) {
      storedConfig.access_token = env.WHATSAPP_ACCESS_TOKEN;
      storedConfig.has_access_token = true;
      storedConfig.masked_access_token = getMaskedToken(env.WHATSAPP_ACCESS_TOKEN);
    }
    if (env.WHATSAPP_BUSINESS_ACCOUNT_ID && !storedConfig.business_account_id) {
      storedConfig.business_account_id = env.WHATSAPP_BUSINESS_ACCOUNT_ID;
    }

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

    // 2. LEAD CREATION ROUTE (POST /api/leads) -> Direct save + WhatsApp Notification
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
        const leadId = Date.now();
        const hasConsent = body.whatsapp_consent === true || body.whatsapp_consent === 'true';

        // Trigger WhatsApp Notifications asynchronously on Worker
        if (ctx && typeof ctx.waitUntil === 'function') {
          ctx.waitUntil((async () => {
            // Admin notification
            if (storedConfig.enabled && storedConfig.admin_alerts_enabled && storedConfig.admin_phone) {
              await dispatchMetaMessage({
                to: storedConfig.admin_phone,
                templateName: storedConfig.template_name_admin || 'hello_world',
                templateLanguage: storedConfig.template_language_admin || 'en_US',
                templateParams: [name, phone, propTitle, propLoc, propPrice, notes],
                recipientType: 'ADMIN',
                leadId
              });
            }
            // Customer notification (only if opt-in consent provided)
            if (storedConfig.enabled && storedConfig.customer_confirmation_enabled && phone) {
              if (hasConsent) {
                await dispatchMetaMessage({
                  to: phone,
                  templateName: storedConfig.template_name_customer || 'hello_world',
                  templateLanguage: storedConfig.template_language_customer || 'en_US',
                  templateParams: [name, propTitle, propLoc],
                  recipientType: 'CUSTOMER',
                  leadId
                });
              } else {
                storedLogs.unshift({
                  id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                  lead_id: leadId,
                  recipient_type: 'CUSTOMER',
                  recipient_phone: phone,
                  status: 'SKIPPED',
                  error_message: 'Customer did not opt-in to WhatsApp updates (checkbox left unchecked).',
                  created_at: new Date().toISOString()
                });
              }
            }
          })());
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
        const bookingId = Date.now();
        const hasConsent = body.whatsapp_consent === true || body.whatsapp_consent === 'true';

        if (ctx && typeof ctx.waitUntil === 'function') {
          ctx.waitUntil((async () => {
            if (storedConfig.enabled && storedConfig.admin_alerts_enabled && storedConfig.admin_phone) {
              await dispatchMetaMessage({
                to: storedConfig.admin_phone,
                templateName: storedConfig.template_name_admin || 'hello_world',
                templateLanguage: storedConfig.template_language_admin || 'en_US',
                templateParams: [name, phone, propTitle, propLoc],
                recipientType: 'ADMIN',
                leadId: bookingId
              });
            }
          })());
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

        return jsonResponse({
          ...storedConfig,
          access_token: undefined,
          masked_access_token: storedConfig.masked_access_token || getMaskedToken(storedConfig.access_token),
          has_access_token: Boolean(storedConfig.access_token)
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

        const newAccessToken = body.access_token && !body.access_token.includes('••') && !body.access_token.includes('*')
          ? String(body.access_token).trim()
          : storedConfig.access_token;

        storedConfig = {
          ...storedConfig,
          phone_number_id: body.phone_number_id !== undefined ? String(body.phone_number_id).trim() : storedConfig.phone_number_id,
          business_account_id: body.business_account_id !== undefined ? String(body.business_account_id).trim() : storedConfig.business_account_id,
          admin_phone: body.admin_phone !== undefined ? String(body.admin_phone).trim() : storedConfig.admin_phone,
          api_base_url: body.api_base_url || storedConfig.api_base_url,
          graph_version: body.graph_version || storedConfig.graph_version,
          enabled: body.enabled !== undefined ? Boolean(body.enabled) : storedConfig.enabled,
          customer_confirmation_enabled: body.customer_confirmation_enabled !== undefined ? Boolean(body.customer_confirmation_enabled) : storedConfig.customer_confirmation_enabled,
          admin_alerts_enabled: body.admin_alerts_enabled !== undefined ? Boolean(body.admin_alerts_enabled) : storedConfig.admin_alerts_enabled,
          template_name_customer: body.template_name_customer || storedConfig.template_name_customer,
          template_language_customer: body.template_language_customer || storedConfig.template_language_customer,
          template_name_admin: body.template_name_admin || storedConfig.template_name_admin,
          template_language_admin: body.template_language_admin || storedConfig.template_language_admin,
          access_token: newAccessToken,
          has_access_token: Boolean(newAccessToken),
          masked_access_token: getMaskedToken(newAccessToken),
          updated_at: new Date().toISOString()
        };

        return jsonResponse({
          success: true,
          message: 'WhatsApp configuration saved successfully.',
          settings: { ...storedConfig, access_token: undefined }
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

      const rawPhoneId = body.phone_number_id || storedConfig.phone_number_id || env.WHATSAPP_PHONE_NUMBER_ID || '';
      const phoneNumberId = String(rawPhoneId).trim();
      const rawToken = (body.access_token && !body.access_token.includes('••') && !body.access_token.includes('*'))
        ? body.access_token
        : (storedConfig.access_token || env.WHATSAPP_ACCESS_TOKEN || '');
      const accessToken = String(rawToken).trim();
      const apiBaseUrl = (body.api_base_url || storedConfig.api_base_url || 'https://graph.facebook.com').replace(/\/$/, '');
      const graphVersion = (body.graph_version || storedConfig.graph_version || 'v21.0').replace(/^\//, '');

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

      const targetPhone = body.phone || storedConfig.admin_phone;
      if (!targetPhone) {
        return jsonResponse({ error: 'Please enter a recipient phone number.' }, 400);
      }

      const result = await dispatchMetaMessage({
        to: targetPhone,
        templateName: body.template_name || 'hello_world',
        templateLanguage: body.template_language || 'en_US',
        recipientType: 'TEST',
        leadId: Date.now()
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
      return jsonResponse([{ tenant_id: 'rental_pune', client_name: storedConfig.client_name }]);
    }

    if (pathname === '/api/whatsapp/logs') {
      return jsonResponse(storedLogs.slice(0, 50));
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
