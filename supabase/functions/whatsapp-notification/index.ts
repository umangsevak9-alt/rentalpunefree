// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This is a Supabase Edge Function to dispatch Meta WhatsApp Cloud API notifications for Rental Pune

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function cleanWhatsAppNumber(phone: string): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length === 10 && /^[6-9]/.test(digits)) return "91" + digits;
  if (digits.length === 11 && digits.startsWith("0")) return "91" + digits.substring(1);
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  if (digits.length >= 10 && digits.length <= 15) return digits;
  return null;
}

async function sendWhatsAppMessage(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  text: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: to,
        type: "text",
        text: { preview_url: false, body: text },
      }),
    });
    let rawText = "";
    let data: any = null;
    try {
      rawText = await res.text();
      if (rawText && rawText.trim().length > 0) {
        data = JSON.parse(rawText);
      }
    } catch {
      data = null;
    }

    if (res.ok && data?.messages?.[0]?.id) {
      return { success: true, data };
    }
    return { success: false, error: data?.error?.message || (rawText ? rawText.slice(0, 150) : `Meta API HTTP ${res.status}`), data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
    const accessToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
    const adminPhone = Deno.env.get("WHATSAPP_ADMIN_PHONE") || "919822012345";

    if (!phoneNumberId || !accessToken) {
      return new Response(
        JSON.stringify({ error: "Missing WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN in Supabase Secrets." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let payload: any = {};
    try {
      const rawBody = await req.text();
      if (rawBody && rawBody.trim().length > 0) {
        payload = JSON.parse(rawBody);
      }
    } catch {
      return new Response(
        JSON.stringify({ error: "Malformed or empty request payload." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    // Support Supabase Database Webhook payload ({ record: { ... } }) or direct { lead: { ... } }
    const lead = payload.record || payload.lead || payload;

    if (!lead || !lead.name || !lead.phone) {
      return new Response(
        JSON.stringify({ error: "Invalid lead payload: name and phone are required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const leadId = lead.id || Date.now();
    const customerName = lead.name.trim();
    const customerPhone = lead.phone.trim();
    const customerEmail = lead.email ? lead.email.trim() : "Not provided";
    const propertyTitle = lead.property_title || "Pune Luxury Property";
    const propertyLocation = lead.property_location || "Pune";
    const enquiryNotes = lead.notes || "General enquiry received.";
    const leadSource = lead.source || "Website Concierge";
    const websiteName = (Deno.env.get("WEBSITE_NAME") || lead.website_name || "Rental Pune").trim();
    const companyName = (Deno.env.get("COMPANY_NAME") || lead.company_name || `${websiteName} Luxury Real Estate`).trim();

    const results = {
      customer: { attempted: false } as any,
      admin: { attempted: false } as any,
    };

    // 1. Send Customer Confirmation (Recipient 1) - ONLY if customer gave explicit consent
    const cleanCustomer = cleanWhatsAppNumber(customerPhone);
    const hasConsent = Boolean(lead.whatsapp_consent);
    if (cleanCustomer) {
      if (!hasConsent) {
        results.customer = {
          attempted: false,
          skipped: true,
          error: "Customer did not provide explicit WhatsApp opt-in consent. Skipped in compliance with Meta policy."
        };
      } else {
        results.customer.attempted = true;
        const customerText = 
`🏡 *${websiteName} — Property Enquiry Received*

Namaste *${customerName}*,

Thank you for your interest in *${propertyTitle}* (${propertyLocation}).

We have successfully received your enquiry. Our luxury rental advisor is reviewing your requirements and will connect with you within 2 business hours.

📍 *Property:* ${propertyTitle}
📌 *Location:* ${propertyLocation}
🆔 *Reference:* #${leadId}

Warm regards,
*${companyName}*`;

        const custRes = await sendWhatsAppMessage(phoneNumberId, accessToken, cleanCustomer, customerText);
        results.customer.success = custRes.success;
        if (!custRes.success) results.customer.error = custRes.error;
      }
    }

    // 2. Send Admin Alert (Recipient 2)
    const cleanAdmin = cleanWhatsAppNumber(adminPhone);
    if (cleanAdmin) {
      results.admin.attempted = true;
      const adminText = 
`🚨 *NEW PROPERTY LEAD RECEIVED — ${websiteName.toUpperCase()}*

👤 *Client:* ${customerName}
📱 *Phone:* ${customerPhone}
✉️ *Email:* ${customerEmail}
💬 *WhatsApp Consent:* ${hasConsent ? '✅ Opted-in' : '❌ Not Opted-in (Call/Email only)'}

🏢 *Property:* ${propertyTitle}
📍 *Location:* ${propertyLocation}
🆔 *Property ID:* #${lead.property_id || "N/A"}

📝 *Client Notes:*
${enquiryNotes}

🌐 *Source:* ${leadSource}
🆔 *Lead ID:* #${leadId}`;

      const adminRes = await sendWhatsAppMessage(phoneNumberId, accessToken, cleanAdmin, adminText);
      results.admin.success = adminRes.success;
      if (!adminRes.success) results.admin.error = adminRes.error;
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
