import { Settings, Property } from '../types.js';

export function getWhatsAppUrl(
  settings?: Settings | null,
  options?: {
    customMessage?: string;
    property?: Property;
  }
): string {
  const directUrl = settings?.whatsapp_url?.trim();
  const phone = settings?.whatsapp_number || settings?.phone || '+91 98765 43210';
  const defaultMsg = settings?.whatsapp_message || 'Hi Rental Pune, I am interested in exploring rental properties.';

  let messageText = options?.customMessage || defaultMsg;

  if (options?.property) {
    const p = options.property;
    messageText = `Hi Rental Pune, I am interested in property "${p.title}" (${p.type || ''}) located at ${p.location} (Rent: ₹${Number(p.price).toLocaleString('en-IN')}/mo). Could you please share more details and arrange a visit?`;
  }

  // If admin provided a direct WhatsApp URL
  if (directUrl) {
    // If it's a wa.me or api.whatsapp.com URL and we have a specific property or custom message, update or append text parameter
    if (options?.property || options?.customMessage) {
      try {
        const urlObj = new URL(directUrl.startsWith('http') ? directUrl : `https://${directUrl}`);
        urlObj.searchParams.set('text', messageText);
        return urlObj.toString();
      } catch (e) {
        // If not a full URL or parse error, fallback to building wa.me
      }
    } else {
      return directUrl.startsWith('http') ? directUrl : `https://${directUrl}`;
    }
  }

  // Build clean wa.me link from phone number
  const cleanDigits = phone.replace(/[^0-9]/g, '');
  const numberFormatted = cleanDigits.startsWith('91') || cleanDigits.length > 10 ? cleanDigits : `91${cleanDigits}`;

  return `https://wa.me/${numberFormatted}?text=${encodeURIComponent(messageText)}`;
}
