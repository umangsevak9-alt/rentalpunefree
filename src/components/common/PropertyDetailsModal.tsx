import React, { useState, useEffect } from 'react';
import { Property, Settings } from '../../types.js';
import { 
  X, 
  MapPin, 
  BedDouble, 
  Bath, 
  Maximize2, 
  Building2, 
  Calendar, 
  MessageCircle, 
  Share2, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  ShieldCheck, 
  Phone, 
  ExternalLink, 
  Sparkles, 
  Clock, 
  Compass, 
  Car, 
  Tv, 
  Waves, 
  Dumbbell, 
  Trees, 
  Zap, 
  Play, 
  Film, 
  Copy, 
  Check, 
  Heart, 
  Building,
  KeyRound,
  Check as CheckIcon,
  HelpCircle,
  ChevronDown,
  Layers
} from 'lucide-react';
import { getWhatsAppUrl } from '../../utils/whatsapp.js';

interface PropertyDetailsModalProps {
  property: Property | null;
  settings: Settings;
  isOpen: boolean;
  onClose: () => void;
  onBookVisit: (property: Property) => void;
  onShare: (property: Property) => void;
}

export default function PropertyDetailsModal({
  property,
  settings,
  isOpen,
  onClose,
  onBookVisit,
  onShare
}: PropertyDetailsModalProps) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'photos' | 'video' | 'amenities' | 'faqs'>('photos');
  const [isSaved, setIsSaved] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  useEffect(() => {
    if (property) {
      setActiveImageIndex(0);
      setActiveTab('photos');
      // Check favorites
      try {
        const favs = JSON.parse(localStorage.getItem('rp_favorites') || '[]');
        setIsSaved(favs.includes(property.id));
      } catch {}
    }
  }, [property]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && property?.images?.length) {
        setActiveImageIndex(prev => (prev + 1) % property.images.length);
      }
      if (e.key === 'ArrowLeft' && property?.images?.length) {
        setActiveImageIndex(prev => (prev - 1 + property.images.length) % property.images.length);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, property, onClose]);

  if (!isOpen || !property) return null;

  const images = property.images && property.images.length > 0 
    ? property.images 
    : ['https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80'];

  const videos = property.videos && property.videos.length > 0 ? property.videos : [];
  const furnitureList = property.furniture && property.furniture.length > 0 ? property.furniture : [];
  
  const isRentedCommercial = property.purpose === 'RENTED_COMMERCIAL_SALE' || property.purpose === 'RENTED_COMMERCIAL_BY_SELL' || property.type === 'Rented Commercial by Sell' || property.type?.toLowerCase().includes('rented commercial') || property.category === 'RENTED_COMMERCIAL_SALE';
  const isCommercial = !isRentedCommercial && (property.purpose === 'COMMERCIAL' || property.category === 'COMMERCIAL' || property.type?.toLowerCase().includes('office') || property.type?.toLowerCase().includes('commercial') || property.type?.toLowerCase().includes('showroom'));
  const isSale = !isRentedCommercial && !isCommercial && (property.purpose === 'SALE' || (!isCommercial && Number(property.price) > 5000000));

  const formattedPrice = isRentedCommercial || isSale
    ? Number(property.price) >= 10000000
      ? `₹${(Number(property.price) / 10000000).toFixed(2)} Cr`
      : `₹${(Number(property.price) / 100000).toFixed(1)} Lakh`
    : `₹${Number(property.price).toLocaleString('en-IN')}`;

  const pricePeriod = isRentedCommercial ? 'Outright Sale' : isSale ? 'Total Price' : '/ month';
  const securityDeposit = isRentedCommercial 
    ? 'Pre-Leased Commercial Investment Asset' 
    : isSale 
    ? 'Ready Possession' 
    : `₹${(Number(property.price) * 2).toLocaleString('en-IN')} (2 Mos)`;

  const toggleFavorite = () => {
    try {
      const favs = JSON.parse(localStorage.getItem('rp_favorites') || '[]');
      let updated;
      if (favs.includes(property.id)) {
        updated = favs.filter((id: number) => id !== property.id);
        setIsSaved(false);
      } else {
        updated = [...favs, property.id];
        setIsSaved(true);
      }
      localStorage.setItem('rp_favorites', JSON.stringify(updated));
    } catch {}
  };

  const copyPropertyLink = () => {
    const url = `${window.location.origin}/#property-${property.id}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const defaultAmenities = [
    { icon: Waves, label: 'Infinity Swimming Pool' },
    { icon: Dumbbell, label: 'Modern Fitness Center & Gym' },
    { icon: ShieldCheck, label: '24/7 Gated Security & CCTV' },
    { icon: Car, label: 'Covered Reserved Car Parking' },
    { icon: Zap, label: '100% Power Backup' },
    { icon: Trees, label: 'Landscaped Garden & Jogging Track' },
    { icon: Building2, label: 'High-Speed Elevators' },
    { icon: KeyRound, label: 'Intercom & Video Door Phone' }
  ];

  const defaultFaqs = property.faqs && property.faqs.length > 0 ? property.faqs : [
    {
      question: 'What is the standard lease term and lock-in period?',
      answer: 'Standard registered agreement tenure is 11 to 24 months with a 6-month lock-in period and 1-month notice period.'
    },
    {
      question: 'Is the society pet friendly and family friendly?',
      answer: 'Yes, this premium society welcomes families and working professionals with dedicated pet-friendly zones and parks.'
    },
    {
      question: 'What are the society maintenance and utility charges?',
      answer: 'Society maintenance is included in the monthly rent. Electricity and piped natural gas (PNG) are billed as per actual meter usage.'
    },
    {
      question: 'How quickly can I schedule a walkthrough and move in?',
      answer: 'Keys are retained with our executive relationship managers for same-day private walkthroughs. Possession can be provided within 24–48 hours.'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-[#040810]/90 backdrop-blur-xl flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div 
        className="bg-[#0b1320] border border-[#d4a359]/30 text-white rounded-3xl max-w-6xl w-full max-h-[94vh] shadow-2xl shadow-black/80 flex flex-col relative overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* TOP STATUS & CONTROLS HEADER BAR */}
        <div className="flex items-center justify-between px-5 sm:px-8 py-4 border-b border-white/10 bg-[#080f1a]/80 backdrop-blur-md z-30 flex-shrink-0">
          <div className="flex items-center space-x-2.5">
            <span className={`text-[11px] font-black uppercase px-3 py-1 rounded-full tracking-wider border shadow-sm ${
              isCommercial
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                : isSale
                ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                : 'bg-[#d4a359]/20 border-[#d4a359]/40 text-[#d4a359]'
            }`}>
              {isCommercial ? 'Commercial Property' : isSale ? 'For Sale' : 'Luxury Rental'}
            </span>

            <span className="hidden sm:inline-flex items-center space-x-1 text-xs text-emerald-400 font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Verified Ownership & Key Available</span>
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={toggleFavorite}
              className={`p-2 rounded-full border transition-all cursor-pointer ${
                isSaved 
                  ? 'bg-rose-600 border-rose-500 text-white' 
                  : 'bg-white/5 hover:bg-white/10 border-white/15 text-neutral-300 hover:text-white'
              }`}
              title={isSaved ? 'Saved to favorites' : 'Save property'}
            >
              <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
            </button>

            <button
              onClick={() => onShare(property)}
              className="p-2 rounded-full bg-white/5 hover:bg-[#d4a359] border border-white/15 text-neutral-300 hover:text-[#080f1a] transition-all cursor-pointer"
              title="Share property specifications & brochure"
            >
              <Share2 className="w-4 h-4" />
            </button>

            <button
              onClick={copyPropertyLink}
              className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/15 text-xs text-neutral-300 hover:text-white transition-all cursor-pointer"
              title="Copy direct property link"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[#d4a359]" />}
              <span>{copiedLink ? 'Link Copied!' : 'Copy Link'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-full bg-white/10 hover:bg-rose-600 text-white transition-all cursor-pointer ml-1"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MODAL MAIN SCROLLABLE CONTENT */}
        <div className="overflow-y-auto flex-1 p-5 sm:p-8 space-y-8 scrollbar-thin scrollbar-thumb-white/20">
          
          {/* 1. CINEMATIC MEDIA SHOWCASE & CAROUSEL */}
          <div className="space-y-3">
            {/* View Switcher Tabs (Photos / Walkthrough Video) */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('photos')}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                    activeTab === 'photos'
                      ? 'bg-[#d4a359] text-[#080f1a] shadow-md shadow-[#d4a359]/20'
                      : 'bg-white/5 hover:bg-white/10 text-neutral-300'
                  }`}
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>High-Res Gallery ({images.length})</span>
                </button>

                {videos.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('video')}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                      activeTab === 'video'
                        ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                        : 'bg-white/5 hover:bg-white/10 text-neutral-300'
                    }`}
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Watch Video Tour</span>
                  </button>
                )}
              </div>

              <span className="text-xs text-neutral-400 font-mono hidden sm:inline">
                {activeTab === 'photos' && `${activeImageIndex + 1} of ${images.length} views`}
              </span>
            </div>

            {/* Media Main Viewport */}
            {activeTab === 'photos' ? (
              <div className="relative h-72 sm:h-96 md:h-[430px] rounded-2xl overflow-hidden bg-black border border-white/10 group shadow-inner">
                <img 
                  src={images[activeImageIndex]} 
                  alt={`${property.title} view ${activeImageIndex + 1}`} 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30 pointer-events-none" />

                {/* Left & Right Nav Buttons */}
                {images.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => setActiveImageIndex(prev => (prev - 1 + images.length) % images.length)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 hover:bg-[#d4a359] text-white hover:text-[#080f1a] backdrop-blur-md border border-white/20 flex items-center justify-center transition-all cursor-pointer shadow-lg"
                      title="Previous image"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveImageIndex(prev => (prev + 1) % images.length)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 hover:bg-[#d4a359] text-white hover:text-[#080f1a] backdrop-blur-md border border-white/20 flex items-center justify-center transition-all cursor-pointer shadow-lg"
                      title="Next image"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>
                  </>
                )}

                {/* Bottom Overlay Badge */}
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between pointer-events-none">
                  <div className="bg-[#080f1a]/80 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/15 text-xs text-white font-medium flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>High Definition Architectural Photography</span>
                  </div>

                  <div className="bg-[#080f1a]/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/15 text-xs font-mono text-[#d4a359]">
                    {activeImageIndex + 1} / {images.length}
                  </div>
                </div>
              </div>
            ) : (
              /* Video Walkthrough Player - 9:16 on mobile, landscape/full on desktop */
              <div className="relative aspect-[9/16] sm:aspect-auto h-auto sm:h-96 md:h-[430px] max-h-[70vh] sm:max-h-none rounded-2xl overflow-hidden bg-black border border-white/10 shadow-inner flex items-center justify-center max-w-xs sm:max-w-none mx-auto w-full">
                {videos[0]?.includes('youtube.com') || videos[0]?.includes('youtu.be') ? (
                  <iframe 
                    src={`https://www.youtube.com/embed/${videos[0].match(/(?:youtu\.be\/|watch\?v=)([\w-]{11})/)?.[1] || ''}?autoplay=1`}
                    title="Property Walkthrough" 
                    className="w-full h-full border-0"
                    allowFullScreen
                  />
                ) : (
                  <video 
                    src={videos[0]} 
                    controls 
                    autoPlay 
                    playsInline 
                    className="w-full h-full object-contain bg-black"
                  />
                )}
              </div>
            )}

            {/* Thumbnail Ribbon */}
            {images.length > 1 && (
              <div className="flex space-x-2.5 overflow-x-auto pb-1 pt-1 scrollbar-none">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setActiveTab('photos');
                      setActiveImageIndex(idx);
                    }}
                    className={`relative w-20 h-14 sm:w-24 sm:h-16 rounded-xl overflow-hidden flex-shrink-0 border-2 transition-all cursor-pointer ${
                      activeImageIndex === idx && activeTab === 'photos'
                        ? 'border-[#d4a359] scale-105 shadow-md shadow-[#d4a359]/30 ring-2 ring-[#d4a359]/50'
                        : 'border-white/10 opacity-60 hover:opacity-100 hover:border-white/30'
                    }`}
                  >
                    <img src={img} alt={`thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 2. TITLE, LOCATION & PRICING HERO STRIP */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-white/5 via-white/[0.03] to-transparent border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <span className="text-[#d4a359] text-xs font-extrabold uppercase tracking-widest">
                  {property.type || 'Residence'}
                </span>
                <span className="text-neutral-500">•</span>
                <span className="text-xs text-neutral-400 font-medium">Ref ID: RP-{property.id.toString().padStart(4, '0')}</span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold font-serif text-white tracking-tight">
                {property.title}
              </h2>

              <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-300 pt-1">
                <div className="flex items-center text-[#d4a359] font-medium">
                  <MapPin className="w-4 h-4 mr-1 shrink-0" />
                  <span>{property.location}</span>
                </div>
                <span className="text-neutral-600 hidden sm:inline">•</span>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(property.location + ' Pune')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-neutral-400 hover:text-white underline inline-flex items-center space-x-1"
                >
                  <span>Explore on Google Maps</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* Pricing Box */}
            <div className="bg-[#080f1a] border border-[#d4a359]/40 p-5 rounded-2xl md:text-right flex-shrink-0 shadow-lg space-y-1">
              <span className="text-[11px] uppercase tracking-wider text-neutral-400 font-bold block">
                {isSale ? 'Asking Price' : 'Monthly Rental'}
              </span>
              <div className="text-3xl sm:text-4xl font-extrabold text-[#d4a359] font-serif">
                {formattedPrice}
                <span className="text-xs text-neutral-400 font-sans font-normal ml-1">{pricePeriod}</span>
              </div>
              <div className="text-[11px] text-neutral-400 pt-1">
                Security Deposit: <span className="text-white font-semibold">{securityDeposit}</span>
              </div>
            </div>
          </div>

          {/* 3. FOUR CORE SPECIFICATION TILES */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center justify-center text-center space-y-1 group hover:border-[#d4a359]/40 transition-colors">
              <BedDouble className="w-6 h-6 text-[#d4a359] group-hover:scale-110 transition-transform" />
              <span className="text-xs text-neutral-400 font-medium">Configuration</span>
              <span className="text-base font-bold text-white">
                {isRentedCommercial ? 'Pre-Leased Commercial' : isCommercial ? `${property.bedrooms || 1} Work Zones` : `${property.bedrooms} BHK Master`}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center justify-center text-center space-y-1 group hover:border-[#d4a359]/40 transition-colors">
              <Bath className="w-6 h-6 text-[#d4a359] group-hover:scale-110 transition-transform" />
              <span className="text-xs text-neutral-400 font-medium">Bathrooms</span>
              <span className="text-base font-bold text-white">{property.bathrooms || 2} Washrooms</span>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center justify-center text-center space-y-1 group hover:border-[#d4a359]/40 transition-colors">
              <Maximize2 className="w-6 h-6 text-[#d4a359] group-hover:scale-110 transition-transform" />
              <span className="text-xs text-neutral-400 font-medium">Carpet Area</span>
              <span className="text-base font-bold text-white">{property.area} Sq.Ft</span>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center justify-center text-center space-y-1 group hover:border-[#d4a359]/40 transition-colors">
              <Building2 className="w-6 h-6 text-[#d4a359] group-hover:scale-110 transition-transform" />
              <span className="text-xs text-neutral-400 font-medium">Furnishing</span>
              <span className="text-base font-bold text-white">{property.furnishing || 'Fully Fitted'}</span>
            </div>
          </div>

          {/* PRE-LEASED COMMERCIAL FINANCIAL HIGHLIGHTS (If Rented Commercial by Sell) */}
          {(isRentedCommercial || property.current_rent) && (
            <div className="bg-gradient-to-r from-amber-500/10 via-yellow-500/15 to-amber-500/10 border-2 border-amber-400/40 rounded-2xl p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2 border-b border-amber-400/20 pb-3">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  <h4 className="text-base font-bold text-amber-300 font-serif">Pre-Leased Commercial Investment Metrics</h4>
                </div>
                <span className="px-3 py-1 bg-amber-400 text-black text-xs font-black rounded-full uppercase tracking-wider">
                  Guaranteed Cashflow Asset
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                <div className="bg-[#080f1a]/80 p-3.5 rounded-xl border border-amber-400/20">
                  <span className="text-[11px] font-bold text-neutral-400 uppercase block mb-1">Current Rent / Mo</span>
                  <span className="text-lg sm:text-xl font-extrabold text-amber-400 font-serif">
                    {property.current_rent 
                      ? property.current_rent >= 100000 
                        ? `₹${(property.current_rent / 100000).toFixed(2)} Lakh` 
                        : `₹${property.current_rent.toLocaleString('en-IN')}`
                      : '₹2.45 Lakh'}
                  </span>
                </div>

                <div className="bg-[#080f1a]/80 p-3.5 rounded-xl border border-amber-400/20">
                  <span className="text-[11px] font-bold text-neutral-400 uppercase block mb-1">Gross ROI Yield</span>
                  <span className="text-lg sm:text-xl font-extrabold text-emerald-400 font-serif">
                    {property.roi_yield || '8.40% Annual'}
                  </span>
                </div>

                <div className="bg-[#080f1a]/80 p-3.5 rounded-xl border border-amber-400/20">
                  <span className="text-[11px] font-bold text-neutral-400 uppercase block mb-1">Corporate Tenant</span>
                  <span className="text-sm sm:text-base font-extrabold text-white truncate block">
                    {property.tenant_name || 'Tier-1 Blue Chip Lessee'}
                  </span>
                </div>

                <div className="bg-[#080f1a]/80 p-3.5 rounded-xl border border-amber-400/20">
                  <span className="text-[11px] font-bold text-neutral-400 uppercase block mb-1">Registered Lease Term</span>
                  <span className="text-sm sm:text-base font-extrabold text-white truncate block">
                    {property.lease_term || '9 Years (3+3+3)'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 4. DESCRIPTION & HIGHLIGHTS */}
          <div className="space-y-3">
            <h3 className="text-lg font-bold font-serif text-white flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-[#d4a359]" />
              <span>Property Overview & Architectural Highlights</span>
            </h3>
            <p className="text-neutral-300 text-sm sm:text-base leading-relaxed bg-[#080f1a]/60 p-5 rounded-2xl border border-white/10">
              {property.description || `Experience superior luxury living with this premium ${property.bedrooms} BHK residence located in the heart of ${property.location}. Featuring bespoke interiors, abundance of natural daylight, high ceilings, verified title documentation, and concierge assistance.`}
            </p>
          </div>

          {/* 5. INCLUDED FURNISHINGS & APPLIANCES */}
          {furnitureList.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-bold font-serif text-white flex items-center space-x-2">
                <Tv className="w-4 h-4 text-[#d4a359]" />
                <span>Included Furnishings & Fitted Appliances</span>
              </h3>
              <div className="flex flex-wrap gap-2.5">
                {furnitureList.map((item, idx) => (
                  <span 
                    key={idx}
                    className="px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-neutral-200 flex items-center space-x-2"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{item}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 6. SOCIETY & LIFESTYLE AMENITIES */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold font-serif text-white flex items-center space-x-2">
              <Building className="w-4 h-4 text-[#d4a359]" />
              <span>Society & Lifestyle Amenities</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {defaultAmenities.map((amenity, idx) => {
                const Icon = amenity.icon;
                return (
                  <div key={idx} className="p-3.5 rounded-xl bg-[#080f1a] border border-white/10 flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-[#d4a359]/15 text-[#d4a359] flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-medium text-neutral-200">{amenity.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 7. PROPERTY POLICIES & FREQUENTLY ASKED QUESTIONS */}
          <div className="space-y-3">
            <h3 className="text-lg font-bold font-serif text-white flex items-center space-x-2">
              <HelpCircle className="w-4 h-4 text-[#d4a359]" />
              <span>Rental Terms & Property Policies</span>
            </h3>
            <div className="space-y-2">
              {defaultFaqs.map((faq, idx) => (
                <div 
                  key={idx}
                  className="rounded-2xl bg-[#080f1a] border border-white/10 overflow-hidden transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                    className="w-full p-4 text-left flex items-center justify-between text-xs sm:text-sm font-bold text-white hover:text-[#d4a359] cursor-pointer"
                  >
                    <span>{faq.question}</span>
                    <ChevronDown className={`w-4 h-4 text-[#d4a359] transition-transform ${expandedFaq === idx ? 'rotate-180' : ''}`} />
                  </button>
                  {expandedFaq === idx && (
                    <div className="px-4 pb-4 pt-1 text-xs text-neutral-300 border-t border-white/5 leading-relaxed">
                      {faq.answer}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* BOTTOM FIXED CONCIERGE ACTION BAR */}
        <div className="p-4 sm:p-6 border-t border-white/10 bg-[#080f1a] flex flex-col sm:flex-row items-center justify-between gap-4 z-30 flex-shrink-0">
          <div className="hidden md:flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-neutral-400 font-medium">Assisted Property Concierge</div>
              <div className="text-sm font-bold text-white">{settings?.phone || '+91 98220 12345'}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:flex items-center gap-3 w-full md:w-auto">
            <a
              href={getWhatsAppUrl(settings, { property })}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-emerald-950/40 flex items-center justify-center space-x-2 cursor-pointer"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Inquire via WhatsApp</span>
            </a>

            <button
              type="button"
              onClick={() => {
                onClose();
                onBookVisit(property);
              }}
              className="px-8 py-3.5 bg-[#d4a359] hover:bg-[#e5b364] text-[#080f1a] font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-xl shadow-[#d4a359]/30 hover:scale-[1.02] active:scale-95 flex items-center justify-center space-x-2 cursor-pointer"
            >
              <Calendar className="w-4 h-4" />
              <span>Book Property</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
