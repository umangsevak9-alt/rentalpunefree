import React, { useState } from 'react';
import { Property, Settings } from '../../types.js';
import { 
  X, 
  Share2, 
  Copy, 
  Check, 
  MessageCircle, 
  ExternalLink, 
  MapPin, 
  BedDouble, 
  Bath, 
  Maximize2,
  Sparkles,
  Smartphone
} from 'lucide-react';
import { 
  generatePropertyShareText, 
  getPropertyShareUrl, 
  getWhatsAppBroadcastUrl,
  sharePropertyNative 
} from '../../utils/shareProperty.js';
import { formatINR } from '../../utils/currency.js';

interface SharePropertyModalProps {
  property: Property | null;
  settings?: Settings | null;
  onClose: () => void;
}

export default function SharePropertyModal({ property, settings, onClose }: SharePropertyModalProps) {
  const [copiedType, setCopiedType] = useState<'specs' | 'link' | null>(null);
  const [showFullTextPreview, setShowFullTextPreview] = useState(false);

  if (!property) return null;

  const shareUrl = getPropertyShareUrl(property.id);
  const shareText = generatePropertyShareText(property, settings);
  const whatsAppShareUrl = getWhatsAppBroadcastUrl(property, settings);
  const coverImage = property.images && property.images.length > 0 ? property.images[0] : null;

  const handleCopySpecs = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopiedType('specs');
      setTimeout(() => setCopiedType(null), 2500);
    } catch (err) {
      console.error('Failed to copy specs:', err);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedType('link');
      setTimeout(() => setCopiedType(null), 2500);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const handleNativeShare = async () => {
    const success = await sharePropertyNative(property, settings);
    if (success) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-[#080f1a]/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div 
        className="bg-[#0e1726] border border-white/15 text-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl relative max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-black/40">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#d4a359]/20 border border-[#d4a359]/30 flex items-center justify-center text-[#d4a359]">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white leading-tight">Share Property</h3>
              <p className="text-[11px] text-neutral-400">Share with clients, contacts & WhatsApp groups</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Visual Flyer Card Preview */}
          <div className="bg-gradient-to-br from-[#121c2e] to-[#0a121f] border border-white/10 rounded-2xl p-4 shadow-inner space-y-3">
            <div className="flex gap-3">
              {coverImage ? (
                <div className="w-24 h-24 rounded-xl overflow-hidden flex-shrink-0 relative border border-white/10">
                  <img 
                    src={coverImage} 
                    alt={property.title} 
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute bottom-1 right-1 bg-black/70 px-1.5 py-0.5 rounded text-[9px] font-mono text-white">
                    Cover
                  </span>
                </div>
              ) : (
                <div className="w-24 h-24 rounded-xl bg-neutral-900 border border-white/10 flex items-center justify-center flex-shrink-0 text-neutral-600 text-xs">
                  No Image
                </div>
              )}

              <div className="flex-1 min-w-0">
                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#d4a359]/20 text-[#d4a359] border border-[#d4a359]/30 mb-1">
                  {property.type || 'Property'}
                </span>
                <h4 className="text-sm font-bold text-white truncate leading-tight">
                  {property.title}
                </h4>
                <div className="flex items-center text-xs text-neutral-400 mt-1">
                  <MapPin className="w-3 h-3 text-[#d4a359] mr-1 flex-shrink-0" />
                  <span className="truncate">{property.location}</span>
                </div>
                <div className="text-sm font-extrabold text-[#d4a359] font-serif mt-1.5">
                  {formatINR(property.price)} <span className="text-[10px] font-normal text-neutral-400">/mo</span>
                </div>
              </div>
            </div>

            {/* Quick Specs Pill Badges */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/10 text-center text-[11px] text-neutral-300">
              <div className="bg-white/5 py-1.5 px-2 rounded-lg flex items-center justify-center space-x-1">
                <BedDouble className="w-3 h-3 text-neutral-400" />
                <span>{property.bedrooms} Beds</span>
              </div>
              <div className="bg-white/5 py-1.5 px-2 rounded-lg flex items-center justify-center space-x-1">
                <Bath className="w-3 h-3 text-neutral-400" />
                <span>{property.bathrooms} Baths</span>
              </div>
              <div className="bg-white/5 py-1.5 px-2 rounded-lg flex items-center justify-center space-x-1">
                <Maximize2 className="w-3 h-3 text-neutral-400" />
                <span>{property.area} Sq.Ft</span>
              </div>
            </div>
          </div>

          {/* Instant Share Actions */}
          <div className="space-y-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block">
              Share Options
            </span>

            {/* Main WhatsApp Share Button */}
            <a
              href={whatsAppShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3.5 px-4 bg-[#25D366] hover:bg-[#20ba59] text-white rounded-xl font-bold text-xs sm:text-sm uppercase tracking-wider transition-all flex items-center justify-center space-x-2.5 shadow-lg shadow-emerald-950/50 hover:scale-[1.01] active:scale-95 cursor-pointer"
            >
              <MessageCircle className="w-5 h-5 fill-white text-[#25D366]" />
              <span>Share Directly to WhatsApp</span>
            </a>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Copy Full Specifications */}
              <button
                type="button"
                onClick={handleCopySpecs}
                className={`py-3 px-3.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                  copiedType === 'specs'
                    ? 'bg-emerald-600/20 border-emerald-500/40 text-emerald-300'
                    : 'bg-white/5 hover:bg-white/10 border-white/15 text-white'
                }`}
              >
                {copiedType === 'specs' ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Specs Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-[#d4a359]" />
                    <span>Copy Full Flyer & Specs</span>
                  </>
                )}
              </button>

              {/* Copy Direct Link */}
              <button
                type="button"
                onClick={handleCopyLink}
                className={`py-3 px-3.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                  copiedType === 'link'
                    ? 'bg-emerald-600/20 border-emerald-500/40 text-emerald-300'
                    : 'bg-white/5 hover:bg-white/10 border-white/15 text-white'
                }`}
              >
                {copiedType === 'link' ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Link Copied!</span>
                  </>
                ) : (
                  <>
                    <ExternalLink className="w-4 h-4 text-neutral-400" />
                    <span>Copy Web Link Only</span>
                  </>
                )}
              </button>
            </div>

            {/* Native OS Share (if mobile/supported) */}
            {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
              <button
                type="button"
                onClick={handleNativeShare}
                className="w-full py-2.5 px-3.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer"
              >
                <Smartphone className="w-4 h-4 text-[#d4a359]" />
                <span>Share via Other Apps (Telegram, Email, etc.)</span>
              </button>
            )}
          </div>

          {/* Formatted Text Preview Accordion */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowFullTextPreview(!showFullTextPreview)}
              className="text-[11px] font-semibold text-neutral-400 hover:text-[#d4a359] flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3 h-3 text-[#d4a359]" />
              <span>{showFullTextPreview ? 'Hide specification text preview' : 'View formatted WhatsApp text specification'}</span>
            </button>

            {showFullTextPreview && (
              <div className="mt-2 p-3 bg-black/60 rounded-xl border border-neutral-800 text-neutral-300 text-xs font-mono whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                {shareText}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-black/40 border-t border-white/10 flex items-center justify-between text-xs text-neutral-400">
          <span>Recipient will receive all specs & cover preview link</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
