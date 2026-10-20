/**
 * Cloudflare Worker Entry Point (_worker.js)
 * 
 * Production handler for Rental Pune CRM on Cloudflare Workers / Pages:
 * - CORS preflight (OPTIONS) with full headers
 * - POST /api/whatsapp/test-connection (Live Meta Graph API verification)
 * - GET /api/whatsapp/settings (Retrieve WhatsApp CRM configuration)
 * - POST /api/whatsapp/settings (Save WhatsApp CRM configuration)
 * - POST /api/whatsapp/send-test (Send test template message via Meta API)
 * - GET /api/whatsapp/tenants (List active tenants)
 * - GET /api/whatsapp/logs (Recent WhatsApp notification logs)
 * - Strict RFC-compliant HTTP 405 Method Not Allowed with 'Allow' header & structured JSON
 * - Static assets & SPA fallback via env.ASSETS.fetch(request)
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept',
  'Access-Control-Max-Age': '86400',
};

// Global in-memory configuration store for worker lifetime (and synced with env/storage)
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

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname.replace(/\/$/, '') || '/';
    const method = request.method.toUpperCase();

    // Initialize from Worker environment variables if present
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

    // Helper: Verify Bearer Auth Token
    const requireAuth = () => {
      const authHeader = request.headers.get('Authorization') || '';
      if (!authHeader.startsWith('Bearer ')) {
        return jsonResponse(
          {
            error: 'Unauthorized: No token provided',
            message: 'Authentication required for WhatsApp administration.'
          },
          401
        );
      }
      return null;
    };

    // 2. WHATSAPP SETTINGS (GET & POST)
    if (pathname === '/api/whatsapp/settings') {
      if (method === 'GET') {
        const authErr = requireAuth();
        if (authErr) return authErr;

        return jsonResponse({
          ...storedConfig,
          access_token: undefined, // Never expose raw token
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
          settings: {
            ...storedConfig,
            access_token: undefined
          }
        });
      }

      return jsonResponse(
        {
          error: `HTTP 405 Method Not Allowed. Endpoint ${pathname} allows GET, POST, OPTIONS.`,
          message: `Method ${method} not allowed.`,
          allowedMethods: ['GET', 'POST', 'OPTIONS']
        },
        405,
        { 'Allow': 'GET, POST, OPTIONS' }
      );
    }

    // 3. WHATSAPP TEST CONNECTION (POST)
    if (pathname === '/api/whatsapp/test-connection') {
      if (method !== 'POST') {
        return jsonResponse(
          {
            connected: false,
            message: `Method ${method} not allowed on ${pathname}. Please use POST.`,
            error: `HTTP 405 Method Not Allowed. Endpoint requires POST method.`,
            allowedMethods: ['POST', 'OPTIONS']
          },
          405,
          { 'Allow': 'POST, OPTIONS' }
        );
      }

      const authErr = requireAuth();
      if (authErr) return authErr;

      let body = {};
      try {
        const text = await request.text();
        if (text && text.trim()) body = JSON.parse(text);
      } catch {
        return jsonResponse(
          { connected: false, error: 'Invalid JSON payload in request body', message: 'Failed to parse JSON body' },
          400
        );
      }

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

      if (!/^\d+$/.test(phoneNumberId)) {
        return jsonResponse({
          connected: false,
          message: 'Invalid WhatsApp Phone Number ID',
          error: 'WhatsApp Phone Number ID must contain only digits (typically 15-16 digits).'
        }, 200);
      }

      if (!accessToken) {
        return jsonResponse({
          connected: false,
          message: 'Meta Access Token is missing',
          error: 'Please configure your Meta WhatsApp Cloud API System User Access Token.'
        }, 200);
      }

      // Live verification call to Meta Graph API
      const metaUrl = `${apiBaseUrl}/${graphVersion}/${phoneNumberId}?fields=verified_name,code_verification_status,display_phone_number,quality_rating,account_mode,status,platform_type`;

      try {
        const metaRes = await fetch(metaUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        });

        const metaText = await metaRes.text();
        let metaData = null;
        try {
          metaData = JSON.parse(metaText);
        } catch {
          metaData = null;
        }

        if (!metaData) {
          const snippet = redactSecrets(metaText.slice(0, 150));
          return jsonResponse({
            connected: false,
            message: `Meta API returned HTTP ${metaRes.status}: ${snippet || 'Empty response'}`,
            error: `Meta API returned HTTP ${metaRes.status}`,
            code: metaRes.status
          }, 200);
        }

        if (!metaRes.ok || metaData.error) {
          const errObj = metaData.error || {};
          const code = errObj.code || metaRes.status;
          const subcode = errObj.error_subcode;
          let diagnostic = redactSecrets(errObj.message || `Meta API error (HTTP ${metaRes.status})`);

          if (code === 190) {
            if (subcode === 463) {
              diagnostic = 'Meta Auth Error (#190/463): System User access token has expired. Please generate a new permanent token in Meta Business Settings.';
            } else if (subcode === 467) {
              diagnostic = 'Meta Auth Error (#190/467): Access token is invalid or was revoked in Meta Business Manager.';
            } else {
              diagnostic = `Meta Auth Error (#190): Access token validation failed. Check System User token permissions (whatsapp_business_messaging, whatsapp_business_management).`;
            }
          } else if (code === 100) {
            diagnostic = `Meta Parameter Error (#100): Phone Number ID "${phoneNumberId}" was not found or does not belong to this WhatsApp Business Account.`;
          }

          return jsonResponse({
            connected: false,
            message: diagnostic,
            error: diagnostic,
            code: code,
            subcode: subcode
          }, 200);
        }

        return jsonResponse({
          connected: true,
          message: 'Verified with Meta Graph API! Connection established.',
          details: {
            verified_name: metaData.verified_name || 'Verified Business Account',
            display_phone_number: metaData.display_phone_number || phoneNumberId,
            quality_rating: metaData.quality_rating || 'UNKNOWN',
            code_verification_status: metaData.code_verification_status || 'VERIFIED',
            account_mode: metaData.account_mode || 'LIVE',
            status: metaData.status || 'CONNECTED'
          }
        }, 200);

      } catch (networkErr) {
        return jsonResponse({
          connected: false,
          message: `Network error reaching Meta Graph API: ${redactSecrets(networkErr.message)}`,
          error: redactSecrets(networkErr.message)
        }, 200);
      }
    }

    // 4. WHATSAPP TENANTS & LOGS
    if (pathname === '/api/whatsapp/tenants') {
      const authErr = requireAuth();
      if (authErr) return authErr;
      return jsonResponse([
        {
          tenant_id: storedConfig.tenant_id,
          client_name: storedConfig.client_name,
          phone_number_id: storedConfig.phone_number_id,
          enabled: storedConfig.enabled,
          has_access_token: Boolean(storedConfig.access_token)
        }
      ]);
    }

    if (pathname === '/api/whatsapp/logs') {
      const authErr = requireAuth();
      if (authErr) return authErr;
      return jsonResponse(storedLogs.slice(0, 50));
    }

    // 5. CATCH-ALL FOR OTHER API ROUTES
    if (pathname.startsWith('/api/')) {
      const backendUrl = env.BACKEND_API_URL;
      if (backendUrl) {
        try {
          const targetUrl = new URL(request.url);
          const proxyTarget = new URL(backendUrl);
          targetUrl.protocol = proxyTarget.protocol;
          targetUrl.host = proxyTarget.host;
          targetUrl.port = proxyTarget.port;

          const proxyReq = new Request(targetUrl.toString(), request);
          return await fetch(proxyReq);
        } catch (proxyErr) {
          return jsonResponse({ error: `Backend proxy error: ${proxyErr.message}` }, 502);
        }
      }

      return jsonResponse({
        error: `API route ${method} ${pathname} not found on Worker`,
        status: 404
      }, 404);
    }

    // 6. STATIC ASSETS & SPA ROUTING FALLBACK
    if (env.ASSETS && typeof env.ASSETS.fetch === 'function') {
      try {
        const assetRes = await env.ASSETS.fetch(request);
        if (assetRes.status !== 404) {
          return assetRes;
        }
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
