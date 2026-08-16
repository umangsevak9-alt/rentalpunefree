import { Property, Settings } from '../types.js';
import { formatINR } from './currency.js';

/**
 * Returns the absolute direct URL to view the property on the website.
 */
export function getPropertyShareUrl(propertyId: number): string {
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    return `${origin}/?property=${propertyId}`;
  }
  return `/?property=${propertyId}`;
}

/**
 * Generates an absolute image URL for the cover photo so it works across external links & WhatsApp.
 */
export function getAbsoluteImageUrl(imageUrl?: string): string {
  if (!imageUrl) return '';
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    return `${origin}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
  }
  return imageUrl;
}

/**
 * Generates a richly formatted text specification for WhatsApp sharing & broadcasting.
 */
export function generatePropertyShareText(property: Property, settings?: Settings | null): string {
  const shareUrl = getPropertyShareUrl(property.id);
  const coverImage = property.images && property.images.length > 0 ? getAbsoluteImageUrl(property.images[0]) : '';
  const priceFormatted = formatINR(property.price);
  const agencyName = settings?.site_title || 'RENTAL PUNE';
  const phone = settings?.whatsapp_number || settings?.phone || '+91 98765 43210';

  const specs = [
    `🛏️ *Bedrooms*: ${property.bedrooms} BHK / Beds`,
    `🛁 *Bathrooms*: ${property.bathrooms} Baths`,
    `📐 *Area*: ${property.area ? `${property.area} Sq.Ft` : 'Spacious'}`,
    property.type ? `🏢 *Type*: ${property.type}` : '',
  ].filter(Boolean).join('\n');

  const descSnippet = property.description 
    ? property.description.length > 220 
      ? property.description.substring(0, 220) + '...' 
      : property.description 
    : '';

  let text = `🏡 *${agencyName.toUpperCase()} - PROPERTY SPECIFICATION* 🏡\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  text += `✨ *${property.title}*\n`;
  text += `📍 *Location*: ${property.location}\n`;
  text += `💰 *Rent*: ${priceFormatted} / month\n\n`;
  text += `📋 *Property Specifications*:\n${specs}\n\n`;
  
  if (descSnippet) {
    text += `🌟 *Overview & Highlights*:\n${descSnippet}\n\n`;
  }

  if (coverImage) {
    text += `📸 *Cover Photo & Gallery*:\n${coverImage}\n\n`;
  }

  text += `🔗 *View Full Details & Book Walkthrough*:\n${shareUrl}\n\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `📞 *Direct WhatsApp Inquiries*: ${phone}\n`;
  text += `🏢 Premium Real Estate in Pune`;

  return text;
}

/**
 * Generates a direct WhatsApp link with the prefilled specification broadcast message.
 */
export function getWhatsAppBroadcastUrl(property: Property, settings?: Settings | null): string {
  const message = generatePropertyShareText(property, settings);
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
}

/**
 * Native device sharing via Web Share API if supported.
 */
export async function sharePropertyNative(property: Property, settings?: Settings | null): Promise<boolean> {
  const shareUrl = getPropertyShareUrl(property.id);
  const text = generatePropertyShareText(property, settings);

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({
        title: `${property.title} - Rental Pune`,
        text: text,
        url: shareUrl,
      });
      return true;
    } catch (err: any) {
      // If user cancelled sharing, don't fallback to error
      if (err?.name === 'AbortError') return true;
      console.warn('Native share failed, fallback to modal', err);
    }
  }
  return false;
}
