import { useEffect, useState, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/index.js';
import { Property, GalleryItem } from '../../types.js';
import { 
  ShieldCheck, 
  MapPin, 
  Headphones, 
  Calendar, 
  ArrowRight, 
  Heart, 
  Eye, 
  X, 
  CheckCircle2, 
  Building2, 
  Users, 
  Star, 
  Sparkles, 
  BedDouble, 
  Bath, 
  Maximize2,
  Handshake,
  Home as HomeIcon,
  Search,
  Filter,
  Phone,
  Clock,
  Play,
  Film,
  Image as ImageIcon,
  MessageCircle,
  Share2,
  SlidersHorizontal,
  ArrowUpDown,
  RotateCcw,
  SearchX,
  IndianRupee,
  Layers,
  Check,
  Building,
  Briefcase,
  Tag,
  Store,
  KeyRound,
  HardHat,
  Waves,
  Dumbbell,
  Trees,
  Gamepad2,
  PartyPopper,
  Zap,
  ShoppingBag,
  Baby,
  Plane,
  GraduationCap,
  Train,
  Stethoscope,
  Mail,
  ChevronLeft,
  ChevronRight,
  VolumeX
} from 'lucide-react';
import { getWhatsAppUrl } from '../../utils/whatsapp.js';
import SharePropertyModal from '../../components/common/SharePropertyModal.js';
import PropertyDetailsModal from '../../components/common/PropertyDetailsModal.js';
import HomeFaqSection from '../../components/home/HomeFaqSection.js';
import { supabaseService } from '../../services/supabaseService.js';

export const DEFAULT_SAMPLE_HERO_VIDEO = 'https://assets.mixkit.co/videos/preview/mixkit-modern-apartment-building-exterior-41549-large.mp4';

function parseVideoSource(rawUrl?: string, mediaType?: string) {
  if (mediaType === 'image') {
    return { type: 'none' as const, url: '', bgUrl: '', modalUrl: '', isDirect: false, isYouTube: false };
  }
  
  const effectiveUrl = (rawUrl && rawUrl.trim()) ? rawUrl.trim() : DEFAULT_SAMPLE_HERO_VIDEO;
  const url = effectiveUrl;
  
  // YouTube Detection (matches youtube.com, youtu.be, embed, shorts)
  const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
  if (ytMatch && ytMatch[1]) {
    const id = ytMatch[1];
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    // Clean uninterrupted background loop parameters without player controls, title logos, annotations, or keyboard shortcuts
    const bgUrl = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=1&loop=1&playlist=${id}&controls=0&showinfo=0&rel=0&iv_load_policy=3&modestbranding=1&disablekb=1&enablejsapi=1&playsinline=1&fs=0&autohide=1${origin ? `&origin=${encodeURIComponent(origin)}` : ''}`;
    const modalUrl = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&controls=1&rel=0&playsinline=1`;
    return {
      type: 'youtube' as const,
      url,
      id,
      bgUrl,
      modalUrl,
      isDirect: false,
      isYouTube: true
    };
  }

  // Vimeo Detection
  const vimeoMatch = url.match(/(?:vimeo\.com\/)(\d+)/);
  if (vimeoMatch && vimeoMatch[1]) {
    const id = vimeoMatch[1];
    return {
      type: 'vimeo' as const,
      url,
      id,
      bgUrl: `https://player.vimeo.com/video/${id}?autoplay=1&muted=1&loop=1&background=1&controls=0&title=0&byline=0&portrait=0`,
      modalUrl: `https://player.vimeo.com/video/${id}?autoplay=1`,
      isDirect: false,
      isYouTube: false
    };
  }

  // Direct MP4 / WebM / Supabase Storage Video File
  return {
    type: 'direct' as const,
    url,
    bgUrl: url,
    modalUrl: url,
    isDirect: true,
    isYouTube: false
  };
}

export default function Home() {
  const navigate = useNavigate();
  const { settings } = useAppStore();
  const [properties, setProperties] = useState<Property[]>([]);
  const [wishlist, setWishlist] = useState<number[]>([]);
  
  const heroVideoInfo = useMemo(() => {
    return parseVideoSource(settings?.hero_video_url, settings?.hero_media_type);
  }, [settings?.hero_video_url, settings?.hero_media_type]);
  
  // Search & Filter State with Transaction Type (Rental Property / Ready Possession / Under Construction / Residential / Commercial)
  const [selectedPurpose, setSelectedPurpose] = useState<'ALL' | 'RENT' | 'READY_POSSESSION' | 'UNDER_CONSTRUCTION' | 'RESIDENTIAL' | 'COMMERCIAL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('ALL');
  const [selectedBhk, setSelectedBhk] = useState('ALL');
  const [priceRange, setPriceRange] = useState('ALL');
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc' | 'area-desc' | 'newest'>('featured');
  const [showWishlistOnly, setShowWishlistOnly] = useState(false);

  // Modals & Media
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [referredProperty, setReferredProperty] = useState<Property | null>(null);
  const [sharingProperty, setSharingProperty] = useState<Property | null>(null);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [activeMediaTab, setActiveMediaTab] = useState<'photos' | 'videos'>('photos');
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [heroVideoFailed, setHeroVideoFailed] = useState(false);
  const heroVideoElementRef = useRef<HTMLVideoElement | null>(null);

  // Automatically reset failed state whenever user updates video URL or switches media format
  useEffect(() => {
    setHeroVideoFailed(false);
  }, [settings?.hero_video_url, settings?.hero_media_type]);

  // Robust Autoplay handler for background loop
  useEffect(() => {
    const video = heroVideoElementRef.current;
    if (!video || heroVideoInfo.type !== 'direct' || heroVideoFailed) return;

    video.muted = true;
    video.defaultMuted = true;
    video.loop = true;
    video.playsInline = true;

    const startPlay = () => {
      if (video && video.paused) {
        video.play().catch(() => {
          // Handled silently for autoplay policy
        });
      }
    };

    startPlay();

    // In case the browser delays autoplay until first user interaction or tab focus
    window.addEventListener('click', startPlay, { once: true, passive: true });
    window.addEventListener('touchstart', startPlay, { once: true, passive: true });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        startPlay();
      }
    });

    return () => {
      window.removeEventListener('click', startPlay);
      window.removeEventListener('touchstart', startPlay);
    };
  }, [heroVideoInfo.url, heroVideoInfo.type, heroVideoFailed]);
  const [activeGalleryImage, setActiveGalleryImage] = useState<string | null>(null);
  const [activeGalleryItem, setActiveGalleryItem] = useState<GalleryItem | null>(null);
  const [galleryCategoryFilter, setGalleryCategoryFilter] = useState<string>('ALL');
  const [isGalleryModalOpen, setIsGalleryModalOpen] = useState(false);
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [heroSlideIndex, setHeroSlideIndex] = useState(0);

  // Book Visit / Lead modal
  const [isVisitModalOpen, setIsVisitModalOpen] = useState(false);
  const [leadModalSource, setLeadModalSource] = useState<string>('Hero Section - Enquire Now');
  const [leadForm, setLeadForm] = useState({ 
    name: '', 
    email: '', 
    phone: '', 
    visitDate: '', 
    visitTime: '11:00',
    notes: '',
    preferredLocation: 'Baner'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formStatus, setFormStatus] = useState('');
  const [showThankYou, setShowThankYou] = useState(false);

  // Default Pune properties fallback covering Rental, Ready Possession, Under Construction, Residential & Commercial
  const defaultPuneProperties: Property[] = [
    {
      id: 101,
      title: '3 BHK Luxury Apartment Baner',
      description: 'Expansive high-rise residence in Baner featuring panoramic city views, imported Italian marble flooring, designer modular kitchen, and exclusive clubhouse amenities.',
      price: 45000,
      type: '3 BHK',
      bedrooms: 3,
      bathrooms: 3,
      area: 1650,
      location: 'Baner, Pune',
      status: 'PUBLISHED',
      purpose: 'RENT',
      category: 'RENTAL',
      images: [
        'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1200&q=80'
      ]
    },
    {
      id: 102,
      title: 'Grade-A Tech Office Tower Hinjewadi',
      description: 'Fully plug & play commercial IT office space in Hinjewadi Phase 1 with 80+ workstations, 4 executive conference rooms, server room, and 100% DG power backup.',
      price: 320000,
      type: 'Commercial Office',
      bedrooms: 0,
      bathrooms: 4,
      area: 5800,
      location: 'Hinjewadi Phase 1, Pune',
      status: 'PUBLISHED',
      purpose: 'COMMERCIAL',
      category: 'COMMERCIAL',
      images: [
        'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1200&q=80'
      ]
    },
    {
      id: 103,
      title: 'Signature 3 BHK Ready Possession Flat Baner',
      description: 'Ready Possession ultra-modern 3 BHK apartment in prime Baner high-rise. 100% Occupation Certificate (OC) received, immediate handover, East-facing, Italian marble flooring, 3 balconies, and luxury clubhouse access.',
      price: 18500000, // 1.85 Cr
      type: '3 BHK Flat',
      bedrooms: 3,
      bathrooms: 3,
      area: 1750,
      location: 'Baner, Pune',
      status: 'PUBLISHED',
      purpose: 'READY_POSSESSION',
      category: 'READY_POSSESSION',
      images: [
        'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1200&q=80'
      ]
    },
    {
      id: 104,
      title: 'Sovereign Sky Mansions - 3 & 4 BHK Balewadi',
      description: 'Under Construction ultra-luxury skyscraper residences with 11-ft clear ceiling height, infinity rooftop pool, 50,000 sq.ft clubhouse, and flexible 20:80 payment scheme. Possession Dec 2027.',
      price: 16500000, // 1.65 Cr
      type: '3 BHK Flat',
      bedrooms: 3,
      bathrooms: 3,
      area: 1980,
      location: 'Balewadi High Street, Pune',
      status: 'PUBLISHED',
      purpose: 'UNDER_CONSTRUCTION',
      category: 'UNDER_CONSTRUCTION',
      images: [
        'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80'
      ]
    },
    {
      id: 105,
      title: 'Pre-Leased Commercial IT Office - EON Kharadi',
      description: 'Grade-A Pre-leased commercial office for outright sale in EON IT Park, Kharadi. Currently rented to a Global Tech MNC at ₹2,45,000/month with 9-year long-term lease. Immediate 8.52% high rental yield.',
      price: 34500000, // 3.45 Cr
      type: 'Rented Commercial by Sell',
      bedrooms: 0,
      bathrooms: 4,
      area: 3200,
      location: 'EON Free Zone, Kharadi, Pune',
      status: 'PUBLISHED',
      purpose: 'COMMERCIAL',
      category: 'COMMERCIAL',
      current_rent: 245000,
      roi_yield: '8.52% ROI Yield',
      tenant_name: 'Global Tech MNC',
      lease_term: '9 Years Registered Lease',
      images: [
        'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1200&q=80'
      ]
    },
    {
      id: 106,
      title: 'Luxury 4 BHK Ready Possession Duplex Penthouse Viman Nagar',
      description: 'Ready-to-move 4 BHK duplex penthouse for outright purchase. Private terrace deck, double-height foyer, servant quarters, OC received, and panoramic airport views.',
      price: 29500000, // 2.95 Cr
      type: '4 BHK Penthouse',
      bedrooms: 4,
      bathrooms: 5,
      area: 3600,
      location: 'Viman Nagar, Pune',
      status: 'PUBLISHED',
      purpose: 'READY_POSSESSION',
      category: 'READY_POSSESSION',
      images: [
        'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=80'
      ]
    },
    {
      id: 107,
      title: '2 BHK Modern Rental Apartment Kothrud',
      description: 'Contemporary, sun-filled 2 BHK in prime Kothrud. Located walking distance to metro station, premium cafes, reputed institutions, and serene green parks.',
      price: 28000,
      type: '2 BHK',
      bedrooms: 2,
      bathrooms: 2,
      area: 1100,
      location: 'Kothrud, Pune',
      status: 'PUBLISHED',
      purpose: 'RENT',
      category: 'RENTAL',
      images: [
        'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=80'
      ]
    },
    {
      id: 108,
      title: 'Kharadi Central Signature Tower (Under Construction)',
      description: 'Under Construction iconic twin-tower development in Prime Kharadi. Features private deck with river views, smart-home automation, and Olympic pool. Possession March 2028.',
      price: 24000000, // 2.40 Cr
      type: '4 BHK Flat',
      bedrooms: 4,
      bathrooms: 4,
      area: 2750,
      location: 'Kharadi IT Corridor, Pune',
      status: 'PUBLISHED',
      purpose: 'UNDER_CONSTRUCTION',
      category: 'UNDER_CONSTRUCTION',
      images: [
        'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=80'
      ]
    }
  ];

  useEffect(() => {
    // 1. Initial cached render immediately (0ms delay)
    const cachedProps = supabaseService.getLocal<Property[]>('properties', []);
    if (cachedProps.length > 0) {
      const published = cachedProps.filter((p: Property) => p.status === 'PUBLISHED');
      if (published.length > 0) {
        setProperties(published);
      }
    }

    // 2. Fetch fresh data from Supabase & backend
    const loadFreshProperties = async () => {
      try {
        const data = await supabaseService.properties.getAll();
        if (Array.isArray(data) && data.length > 0) {
          const published = data.filter((p: Property) => p.status === 'PUBLISHED');
          setProperties(published.length > 0 ? published : defaultPuneProperties);
        } else {
          setProperties(defaultPuneProperties);
        }
      } catch {
        setProperties(defaultPuneProperties);
      }
    };
    loadFreshProperties();

    // 3. Instant event listeners for real-time changes
    const handlePropertiesUpdated = (e?: any) => {
      const updatedList = (e && e.detail) || supabaseService.getLocal<Property[]>('properties', []);
      if (Array.isArray(updatedList) && updatedList.length > 0) {
        const published = updatedList.filter((p: Property) => p.status === 'PUBLISHED');
        setProperties(published.length > 0 ? published : defaultPuneProperties);
      }
    };
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'rp_properties') {
        handlePropertiesUpdated();
      }
    };
    window.addEventListener('properties_updated', handlePropertiesUpdated);
    window.addEventListener('rp_properties_synced', handlePropertiesUpdated);
    window.addEventListener('storage', handleStorageChange);

    // Fetch dynamic gallery from Supabase
    supabaseService.gallery.getAll().then(items => {
      if (items && items.length > 0) {
        setGalleryItems(items.filter(item => item.is_active !== 0 && item.is_active !== false));
      }
    }).catch(console.error);

    const handleGalleryUpdate = (e: any) => {
      if (Array.isArray(e.detail)) {
        setGalleryItems(e.detail.filter(item => item.is_active !== 0 && item.is_active !== false));
      }
    };
    window.addEventListener('gallery_updated', handleGalleryUpdate);
    window.addEventListener('rp_gallery_synced', handleGalleryUpdate);

    return () => {
      window.removeEventListener('properties_updated', handlePropertiesUpdated);
      window.removeEventListener('rp_properties_synced', handlePropertiesUpdated);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('gallery_updated', handleGalleryUpdate);
      window.removeEventListener('rp_gallery_synced', handleGalleryUpdate);
    };
  }, []);

  // Handle deep-linking query parameter (e.g. ?property=101 or ?property=3)
  useEffect(() => {
    if (typeof window === 'undefined' || properties.length === 0) return;
    const urlParams = new URLSearchParams(window.location.search);
    const propertyId = urlParams.get('property');
    if (propertyId) {
      const match = properties.find(p => String(p.id) === String(propertyId));
      if (match) {
        setSelectedProperty(match);
        setActiveMediaIndex(0);
        setActiveMediaTab('photos');
        // Smooth scroll down to property section
        setTimeout(() => {
          const section = document.getElementById('properties');
          if (section) {
            section.scrollIntoView({ behavior: 'smooth' });
          }
        }, 300);
      }
    }
  }, [properties]);

  const toggleWishlist = (id: number) => {
    setWishlist(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const resetAllFilters = () => {
    setSelectedPurpose('ALL');
    setSearchQuery('');
    setSelectedLocation('ALL');
    setSelectedBhk('ALL');
    setPriceRange('ALL');
    setSortBy('featured');
    setShowWishlistOnly(false);
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedPurpose !== 'ALL') count++;
    if (searchQuery.trim()) count++;
    if (selectedLocation !== 'ALL') count++;
    if (selectedBhk !== 'ALL') count++;
    if (priceRange !== 'ALL') count++;
    if (sortBy !== 'featured') count++;
    if (showWishlistOnly) count++;
    return count;
  }, [selectedPurpose, searchQuery, selectedLocation, selectedBhk, priceRange, sortBy, showWishlistOnly]);

  const getBadgeForIndex = (index: number) => {
    const badges = ['PREMIUM', 'POPULAR', 'NEW LISTING', 'VERIFIED'];
    return badges[index % badges.length];
  };

  // Helper to format price based on purpose & amount (Lakhs, Crores, or Monthly Rent)
  const formatPropertyPrice = (property: Property) => {
    const isRentedCommercial = property.purpose === 'RENTED_COMMERCIAL_SALE' || property.purpose === 'RENTED_COMMERCIAL_BY_SELL' || property.type === 'Rented Commercial by Sell' || property.type?.toLowerCase().includes('rented commercial') || property.category === 'RENTED_COMMERCIAL_SALE';
    const isCommercial = isRentedCommercial || property.purpose === 'COMMERCIAL' || property.category === 'COMMERCIAL' || property.type?.toLowerCase().includes('office') || property.type?.toLowerCase().includes('showroom') || property.type?.toLowerCase().includes('retail') || property.type?.toLowerCase().includes('commercial');
    const isUnderConstruction = property.purpose === 'UNDER_CONSTRUCTION' || property.category === 'UNDER_CONSTRUCTION' || property.title?.toLowerCase().includes('under construction') || property.title?.toLowerCase().includes('new launch') || property.description?.toLowerCase().includes('under construction');
    const isReadyPossession = !isUnderConstruction && (property.purpose === 'READY_POSSESSION' || property.category === 'READY_POSSESSION' || property.title?.toLowerCase().includes('ready possession') || property.title?.toLowerCase().includes('ready to move') || property.description?.toLowerCase().includes('ready possession') || property.description?.toLowerCase().includes('occupation certificate') || property.description?.toLowerCase().includes('oc available'));
    const isRent = property.purpose === 'RENT' || property.category === 'RENTAL' || (!isCommercial && !isReadyPossession && !isUnderConstruction && Number(property.price) < 500000);
    const isSale = !isRent && (!isCommercial || isRentedCommercial);

    if (isRentedCommercial) {
      const salePriceFormatted = property.price >= 10000000 
        ? `₹${(property.price / 10000000).toFixed(2).replace(/\.00$/, '')} Cr`
        : `₹${(property.price / 100000).toFixed(1).replace(/\.0$/, '')} Lakh`;
      
      const rentText = property.current_rent 
        ? `₹${(property.current_rent >= 100000 ? (property.current_rent / 100000).toFixed(2) + 'L' : property.current_rent.toLocaleString('en-IN'))}/mo Rent`
        : 'Pre-Leased';

      return {
        amount: salePriceFormatted,
        period: `Sale (${rentText})`
      };
    }

    if (isSale) {
      if (property.price >= 10000000) {
        return {
          amount: `₹${(property.price / 10000000).toFixed(2).replace(/\.00$/, '')} Cr`,
          period: isUnderConstruction ? 'New Launch Price' : (isReadyPossession ? 'Ready Possession' : 'Total Price')
        };
      } else {
        return {
          amount: `₹${(property.price / 100000).toFixed(1).replace(/\.0$/, '')} Lakhs`,
          period: isUnderConstruction ? 'Pre-launch Price' : 'For Sale'
        };
      }
    }
    
    if (isCommercial) {
      if (property.price >= 100000) {
        return {
          amount: `₹${(property.price / 100000).toFixed(2).replace(/\.00$/, '')} Lakh`,
          period: '/mo Lease'
        };
      }
      return {
        amount: `₹${property.price.toLocaleString('en-IN')}`,
        period: '/mo Commercial'
      };
    }

    return {
      amount: `₹${property.price.toLocaleString('en-IN')}`,
      period: '/mo'
    };
  };

  // Helper for Purpose Badge
  const getPropertyPurposeBadge = (property: Property) => {
    if (property.purpose === 'RENTED_COMMERCIAL_SALE' || property.purpose === 'RENTED_COMMERCIAL_BY_SELL' || property.type === 'Rented Commercial by Sell' || property.type?.toLowerCase().includes('rented commercial') || property.category === 'RENTED_COMMERCIAL_SALE') {
      return { label: '⭐ PRE-LEASED COMMERCIAL', bg: 'bg-gradient-to-r from-amber-500 to-yellow-500 text-black border-amber-300 font-black' };
    }
    if (property.purpose === 'UNDER_CONSTRUCTION' || property.category === 'UNDER_CONSTRUCTION' || property.title?.toLowerCase().includes('under construction') || property.title?.toLowerCase().includes('new launch') || property.description?.toLowerCase().includes('under construction')) {
      return { label: 'UNDER CONSTRUCTION', bg: 'bg-cyan-600 text-white border-cyan-400 font-black' };
    }
    if (property.purpose === 'READY_POSSESSION' || property.category === 'READY_POSSESSION' || property.title?.toLowerCase().includes('ready possession') || property.title?.toLowerCase().includes('ready to move') || property.description?.toLowerCase().includes('ready possession') || property.description?.toLowerCase().includes('occupation certificate') || property.description?.toLowerCase().includes('oc available')) {
      return { label: 'READY POSSESSION', bg: 'bg-blue-600 text-white border-blue-400 font-black' };
    }
    if (property.purpose === 'COMMERCIAL' || property.category === 'COMMERCIAL' || property.type?.toLowerCase().includes('office') || property.type?.toLowerCase().includes('showroom') || property.type?.toLowerCase().includes('retail')) {
      return { label: 'COMMERCIAL SPACES', bg: 'bg-indigo-700 text-white border-indigo-500 font-bold' };
    }
    if (property.purpose === 'RESIDENTIAL' || (property.purpose === 'SALE' && Number(property.price) >= 500000)) {
      return { label: 'RESIDENTIAL PROPERTIES', bg: 'bg-amber-600 text-white border-amber-400 font-bold' };
    }
    return { label: 'RENTAL PROPERTY', bg: 'bg-emerald-600 text-white border-emerald-400 font-bold' };
  };

  const filteredProperties = useMemo(() => {
    return properties.filter(p => {
      // 1. Transaction Purpose match (RENT / READY_POSSESSION / UNDER_CONSTRUCTION / RESIDENTIAL / COMMERCIAL / ALL)
      const isRentedCommercial = p.purpose === 'RENTED_COMMERCIAL_SALE' || p.purpose === 'RENTED_COMMERCIAL_BY_SELL' || p.type === 'Rented Commercial by Sell' || p.type?.toLowerCase().includes('rented commercial') || p.category === 'RENTED_COMMERCIAL_SALE';
      const isCommercial = isRentedCommercial || p.purpose === 'COMMERCIAL' || p.category === 'COMMERCIAL' || p.type?.toLowerCase().includes('office') || p.type?.toLowerCase().includes('showroom') || p.type?.toLowerCase().includes('retail') || p.type?.toLowerCase().includes('commercial');
      const isUnderConstruction = p.purpose === 'UNDER_CONSTRUCTION' || p.category === 'UNDER_CONSTRUCTION' || p.title?.toLowerCase().includes('under construction') || p.title?.toLowerCase().includes('new launch') || p.description?.toLowerCase().includes('under construction') || p.description?.toLowerCase().includes('possession in');
      const isReadyPossession = !isUnderConstruction && (p.purpose === 'READY_POSSESSION' || p.category === 'READY_POSSESSION' || p.title?.toLowerCase().includes('ready possession') || p.title?.toLowerCase().includes('ready to move') || p.description?.toLowerCase().includes('ready possession') || p.description?.toLowerCase().includes('occupation certificate') || p.description?.toLowerCase().includes('oc available'));
      const isRent = p.purpose === 'RENT' || p.category === 'RENTAL' || (!isCommercial && !isReadyPossession && !isUnderConstruction && Number(p.price) < 500000);
      const isResidential = p.purpose === 'RESIDENTIAL' || isReadyPossession || isUnderConstruction || (!isCommercial && (p.bedrooms > 0 || Number(p.price) >= 500000));

      if (selectedPurpose === 'RENT' && !isRent) return false;
      if (selectedPurpose === 'READY_POSSESSION' && !isReadyPossession) return false;
      if (selectedPurpose === 'UNDER_CONSTRUCTION' && !isUnderConstruction) return false;
      if (selectedPurpose === 'RESIDENTIAL' && !isResidential) return false;
      if (selectedPurpose === 'COMMERCIAL' && !isCommercial) return false;

      // 2. Keyword search query matching
      const q = searchQuery.trim().toLowerCase();
      const queryMatch = !q || (
        (p.title && p.title.toLowerCase().includes(q)) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.location && p.location.toLowerCase().includes(q)) ||
        (p.type && p.type.toLowerCase().includes(q)) ||
        (p.purpose && p.purpose.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q)) ||
        (p.tenant_name && p.tenant_name.toLowerCase().includes(q)) ||
        (p.roi_yield && p.roi_yield.toLowerCase().includes(q)) ||
        (p.lease_term && p.lease_term.toLowerCase().includes(q)) ||
        `${p.bedrooms} bhk`.includes(q) ||
        `${p.bedrooms}bhk`.includes(q) ||
        `${p.bedrooms} bed`.includes(q) ||
        `${p.bedrooms} bedroom`.includes(q) ||
        `${p.area} sqft`.includes(q) ||
        (q.includes('rented commercial') && isRentedCommercial) ||
        (q.includes('pre-leased') && isRentedCommercial) ||
        (q.includes('commercial') && (isCommercial || isRentedCommercial)) ||
        (q.includes('office') && (isCommercial || isRentedCommercial || p.type?.toLowerCase().includes('office'))) ||
        (q.includes('shop') && (isCommercial || p.type?.toLowerCase().includes('shop') || p.type?.toLowerCase().includes('showroom'))) ||
        (q.includes('showroom') && (isCommercial || p.type?.toLowerCase().includes('showroom'))) ||
        (q.includes('rent') && (isRent || (isRentedCommercial && p.current_rent))) ||
        (q.includes('buy') && (isResidential || isRentedCommercial)) ||
        (q.includes('sale') && (isResidential || isRentedCommercial)) ||
        (q.includes('resale') && isResidential)
      );

      // 3. Location filter
      const locMatch = selectedLocation === 'ALL' || (p.location && p.location.toLowerCase().includes(selectedLocation.toLowerCase()));

      // 4. BHK / Sub-type filter
      const bhkMatch = selectedBhk === 'ALL' || 
        (p.type && p.type.toLowerCase().includes(selectedBhk.toLowerCase())) || 
        p.bedrooms.toString() === selectedBhk ||
        (selectedBhk === '4+' && p.bedrooms >= 4) ||
        (selectedBhk === 'Office' && p.type?.toLowerCase().includes('office')) ||
        (selectedBhk === 'Showroom' && (p.type?.toLowerCase().includes('showroom') || p.type?.toLowerCase().includes('retail'))) ||
        (selectedBhk === 'Penthouse' && (p.title?.toLowerCase().includes('penthouse') || p.type?.toLowerCase().includes('penthouse'))) ||
        (selectedBhk === 'Pre-Leased' && isRentedCommercial);

      // 5. Price range filter (adapted to Rent vs Commercial vs Buy & Sell vs Rented Commercial)
      let priceMatch = true;
      if (priceRange !== 'ALL') {
        // Rent ranges
        if (priceRange === 'under-30k') priceMatch = p.price <= 30000;
        else if (priceRange === '30k-50k') priceMatch = p.price > 30000 && p.price <= 50000;
        else if (priceRange === '50k-80k') priceMatch = p.price > 50000 && p.price <= 80000;
        else if (priceRange === 'above-80k') priceMatch = p.price > 80000 && p.price < 500000;
        // Commercial ranges
        else if (priceRange === 'comm-under-1l') priceMatch = p.price <= 100000;
        else if (priceRange === 'comm-1l-3l') priceMatch = p.price > 100000 && p.price <= 300000;
        else if (priceRange === 'comm-above-3l') priceMatch = p.price > 300000 && p.price < 10000000;
        // Buy / Sale ranges & Rented commercial
        else if (priceRange === 'buy-under-1cr') priceMatch = p.price <= 10000000;
        else if (priceRange === 'buy-1cr-2cr') priceMatch = p.price > 10000000 && p.price <= 20000000;
        else if (priceRange === 'buy-2cr-3cr') priceMatch = p.price > 20000000 && p.price <= 30000000;
        else if (priceRange === 'buy-above-3cr') priceMatch = p.price > 30000000;
      }

      // 6. Wishlist filter
      const wishlistMatch = !showWishlistOnly || wishlist.includes(p.id);

      return queryMatch && locMatch && bhkMatch && priceMatch && wishlistMatch;
    }).sort((a, b) => {
      if (sortBy === 'price-asc') return a.price - b.price;
      if (sortBy === 'price-desc') return b.price - a.price;
      if (sortBy === 'area-desc') return (b.area || 0) - (a.area || 0);
      if (sortBy === 'newest') return (Number(b.id) || 0) - (Number(a.id) || 0);
      return 0; // featured / default order
    });
  }, [properties, selectedPurpose, searchQuery, selectedLocation, selectedBhk, priceRange, sortBy, showWishlistOnly, wishlist]);

  const isValidPhone = (phone: string): boolean => {
    const clean = phone.replace(/[\s\-\(\)\+]/g, '');
    return clean.length >= 7 && clean.length <= 15 && /^\d+$/.test(clean);
  };

  const handleLeadSubmit = async (e: React.FormEvent): Promise<boolean> => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormStatus('');

    const trimmedName = leadForm.name.trim();
    const trimmedPhone = leadForm.phone.trim();
    const trimmedEmail = leadForm.email.trim();
    const trimmedNotes = leadForm.notes.trim();

    // Validations
    if (!trimmedName) {
      setFormStatus('Name is required.');
      setIsSubmitting(false);
      return false;
    }

    if (!trimmedPhone) {
      setFormStatus('Phone number is required.');
      setIsSubmitting(false);
      return false;
    }

    if (!isValidPhone(trimmedPhone)) {
      setFormStatus('Please enter a valid phone number (at least 10 digits).');
      setIsSubmitting(false);
      return false;
    }

    if (trimmedEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        setFormStatus('Please enter a valid email address.');
        setIsSubmitting(false);
        return false;
      }
    }

    const targetProp = referredProperty || selectedProperty;
    let submittedSuccessfully = false;

    if (targetProp) {
      // 1. Property Booking Submission -> Dedicated "Property Booked" System
      const bookingPayload = {
        property_id: Number(targetProp.id),
        property_title: targetProp.title,
        property_location: targetProp.location,
        property_price: targetProp.price,
        property_type: targetProp.type,
        property_image: targetProp.images?.[0] || '',
        customer_name: trimmedName,
        customer_phone: trimmedPhone,
        customer_email: trimmedEmail || undefined,
        preferred_date: leadForm.visitDate || '',
        preferred_time: leadForm.visitTime || '11:00 AM',
        move_in_timeline: 'Immediate / Within 15 Days',
        occupancy_type: leadForm.preferredLocation ? `Locality Preference: ${leadForm.preferredLocation}` : 'Standard',
        notes: trimmedNotes || `Booking request for ${targetProp.title}`,
        source: 'PROPERTY_BOOKED'
      };

      try {
        await supabaseService.bookings.create(bookingPayload);
        submittedSuccessfully = true;
      } catch (err: any) {
        console.error('Booking creation error:', err);
      }
    } else {
      // 2. General Lead Submission
      const currentSource = leadModalSource || 'Hero Section - Enquire Now';
      const leadPayload = {
        name: trimmedName,
        email: trimmedEmail || undefined,
        phone: trimmedPhone,
        notes: `[${currentSource}] Location: ${leadForm.preferredLocation || 'Pune'} | Preferred Date: ${leadForm.visitDate || 'Flexible'} ${leadForm.visitTime || ''} | Requirement: ${trimmedNotes || 'General Enquiry'}`,
        source: currentSource
      };

      try {
        const res = await fetch('/api/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(leadPayload)
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success) {
          submittedSuccessfully = true;
        }
      } catch (apiErr) {
        console.warn('API lead submission fallback triggered:', apiErr);
      }

      if (!submittedSuccessfully) {
        try {
          await supabaseService.leads.create({
            name: trimmedName,
            email: trimmedEmail || undefined,
            phone: trimmedPhone,
            notes: leadPayload.notes,
            source: currentSource
          });
          submittedSuccessfully = true;
        } catch (fallbackErr: any) {
          console.error('Supabase fallback lead creation failed:', fallbackErr);
        }
      }
    }

    if (submittedSuccessfully) {
      setLeadForm({ name: '', email: '', phone: '', visitDate: '', visitTime: '11:00', notes: '', preferredLocation: 'Baner' });
      setReferredProperty(null);
      setIsVisitModalOpen(false);
      navigate('/thank-you');
      setIsSubmitting(false);
      return true;
    } else {
      setFormStatus('Failed to submit booking request. Please check your details and try again.');
      setIsSubmitting(false);
      return false;
    }
  };

  return (
    <div className="w-full bg-[#080f1a] text-white selection:bg-[#d4a359] selection:text-[#080f1a] overflow-x-hidden">
      
      {/* 1. HERO SECTION (LUXURY ARCHITECTURAL DISPLAY WITH LOOPING MUTED VIDEO / SLIDESHOW) */}
      <section className="relative min-h-[90vh] sm:min-h-[85vh] flex flex-col justify-center overflow-hidden bg-[#080f1a] pt-28 pb-16 sm:pt-36 sm:pb-24 px-4 sm:px-6 lg:px-8">
        
        {/* Background Architectural Luxury Video Loop or Building Carousel */}
        {(() => {
          const heroSlides = [
            'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=2000&q=85',
            'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=2000&q=85',
            'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=2000&q=85'
          ];

          const activeHeroImage = (settings?.hero_image_url && settings.hero_image_url.trim())
            ? settings.hero_image_url.trim()
            : heroSlides[heroSlideIndex % heroSlides.length];

          if (heroVideoInfo.type !== 'none' && !heroVideoFailed) {
            return (
              <div className="absolute inset-0 z-0 overflow-hidden">
                {heroVideoInfo.isDirect ? (
                  <video 
                    key={heroVideoInfo.url}
                    src={heroVideoInfo.url} 
                    autoPlay 
                    muted 
                    loop 
                    playsInline 
                    preload="auto"
                    controls={false}
                    tabIndex={-1}
                    aria-hidden="true"
                    disablePictureInPicture
                    disableRemotePlayback
                    // @ts-ignore
                    controlsList="nodownload nofullscreen noremoteplayback noplaybackrate"
                    onError={() => {
                      console.warn('Hero video failed to load or unsupported format, falling back to architectural backdrop.');
                      setHeroVideoFailed(true);
                    }}
                    ref={(el) => {
                      heroVideoElementRef.current = el;
                      if (el) {
                        el.muted = true;
                        el.defaultMuted = true;
                        el.loop = true;
                        el.playsInline = true;
                        el.play().catch(() => {
                          // Browser autoplay permission catch
                        });
                      }
                    }}
                    className="w-full h-full object-cover object-center brightness-85 scale-105 transition-all duration-1000 ease-out pointer-events-none select-none"
                  />
                ) : heroVideoInfo.type === 'youtube' ? (
                  <div className="w-full h-full relative overflow-hidden pointer-events-none">
                    <iframe
                      src={heroVideoInfo.bgUrl}
                      title="Hero Video Background"
                      className="w-[320%] h-[140%] sm:w-[160%] sm:h-[160%] min-w-full min-h-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 object-cover border-0 pointer-events-none brightness-85"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    />
                  </div>
                ) : heroVideoInfo.type === 'vimeo' ? (
                  <div className="w-full h-full relative overflow-hidden pointer-events-none">
                    <iframe
                      src={heroVideoInfo.bgUrl}
                      title="Hero Video Background"
                      className="w-[320%] h-[140%] sm:w-[160%] sm:h-[160%] min-w-full min-h-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 object-cover border-0 pointer-events-none brightness-85"
                      allow="autoplay; fullscreen"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <img 
                    src={activeHeroImage} 
                    alt="Luxury Living Architecture" 
                    className="w-full h-full object-cover object-center brightness-85 scale-105 transition-all duration-1000 ease-out"
                  />
                )}
                {/* Luxury Overlays - Softer subtle black gradients for clearer image & video visibility */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#080f1a]/80 via-[#080f1a]/40 to-[#080f1a]/20 pointer-events-none"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-[#080f1a]/85 via-transparent to-[#080f1a]/35 pointer-events-none"></div>
              </div>
            );
          }

          return (
            <div className="absolute inset-0 z-0">
              <img 
                src={activeHeroImage} 
                alt="Luxury Living Architecture" 
                className="w-full h-full object-cover object-center brightness-85 scale-105 transition-all duration-1000 ease-out"
              />
              {/* Luxury Overlays - Softer subtle black gradients for clearer image & video visibility */}
              <div className="absolute inset-0 bg-gradient-to-r from-[#080f1a]/80 via-[#080f1a]/40 to-[#080f1a]/20 pointer-events-none"></div>
              <div className="absolute inset-0 bg-gradient-to-t from-[#080f1a]/85 via-transparent to-[#080f1a]/35 pointer-events-none"></div>
            </div>
          );
        })()}

        {/* Hero Top Content Area */}
        <div className="relative z-10 max-w-7xl mx-auto w-full my-auto py-8">
          
          <div className="max-w-3xl space-y-6">
            
            {/* Gold Eyebrow */}
            <div className="inline-flex items-center space-x-2.5">
              <span className="w-2.5 h-2.5 rotate-45 bg-[#d4a359] inline-block"></span>
              <span className="text-[#d4a359] text-xs sm:text-sm font-bold uppercase tracking-[0.25em]">
                EXPERIENCE THE EPITOME OF LUXURY
              </span>
            </div>

            {/* Display Headline */}
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-white font-serif leading-[1.08]">
              {settings?.hero_heading ? (
                <span>{settings.hero_heading}</span>
              ) : (
                <>
                  LAVISH LIVING <br />
                  <span className="text-[#d4a359] italic font-serif">BEYOND IMAGINATION</span>
                </>
              )}
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-neutral-200/95 max-w-xl font-normal leading-relaxed">
              {settings?.hero_subheading || 'Premium 2, 3 & 4 BHK Residences crafted for those who deserve the finest in life.'}
            </p>

            {/* Hero Quick Action Buttons */}
            <div className="pt-2 flex flex-wrap items-center gap-3.5 sm:gap-4">
              <a
                href="#properties"
                className="inline-flex items-center justify-center px-8 py-3.5 bg-[#d4a359] hover:bg-[#c29247] text-[#080f1a] font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg hover:shadow-[#d4a359]/30 active:scale-98 cursor-pointer"
              >
                Explore Residences
              </a>
              <button
                type="button"
                onClick={() => {
                  setReferredProperty(null);
                  setLeadModalSource('Hero Section - Enquire Now');
                  setFormStatus('');
                  setIsVisitModalOpen(true);
                }}
                className="inline-flex items-center justify-center px-8 py-3.5 bg-[#d4a359] hover:bg-[#c29247] text-[#080f1a] font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg hover:shadow-[#d4a359]/30 active:scale-98 cursor-pointer"
              >
                Enquire Now
              </button>
            </div>

          </div>

        </div>

      </section>

      {/* 2. FEATURED PROPERTIES SECTION: "Handpicked For You" (WARM CREAM / OFF-WHITE BG) */}
      <section id="properties" className="bg-[#f8f6f0] text-[#111827] py-16 sm:py-20 px-4 sm:px-6 lg:px-8 border-b border-[#e8e4db]">
        <div className="max-w-7xl mx-auto">
          
          {/* Header Row */}
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-[#d4a359] text-xs font-bold uppercase tracking-[0.2em]">FEATURED PROPERTIES</span>
                <div className="w-8 h-[2px] bg-[#d4a359]"></div>
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold font-serif text-[#111827] tracking-tight">
                Handpicked For You
              </h2>
              <p className="text-sm text-neutral-600 mt-2 max-w-xl">
                Explore verified luxury apartments, penthouses, and gated society homes across Pune's top IT and prime corridors.
              </p>
            </div>

            {/* View All & Reset Buttons */}
            <div className="flex items-center space-x-3">
              {activeFilterCount > 0 && (
                <button
                  onClick={resetAllFilters}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-white hover:bg-neutral-100 text-neutral-700 text-xs font-bold uppercase tracking-wider rounded-lg border border-[#e8e4db] shadow-sm transition-all cursor-pointer"
                  title="Reset all active search filters"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-[#d4a359]" />
                  <span>Reset Filters</span>
                </button>
              )}

              <button 
                onClick={resetAllFilters}
                className="inline-flex items-center space-x-2 px-4 sm:px-5 py-2 sm:py-2.5 bg-white hover:bg-neutral-50 text-[#111827] text-xs font-bold uppercase tracking-wider rounded-lg border border-[#e8e4db] shadow-sm hover:border-[#d4a359] transition-all cursor-pointer"
              >
                <span>VIEW ALL PROPERTIES</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#d4a359]" />
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* ADVANCED ATTRACTIVE SEARCH & FILTER CONTROL HUB */}
          {/* ========================================================================= */}
          <div className="bg-white rounded-3xl border border-[#e8e4db] shadow-xl p-4 sm:p-7 mb-10 transition-all hover:shadow-2xl">
            
            {/* Top Segment Tabs: Rental Property | Ready Possession Property | Under Construction Property | Residential Properties | Commercial Spaces | All Listings */}
            <div className="flex items-center justify-between flex-wrap gap-2 pb-4 mb-5 border-b border-neutral-100">
              <div className="flex items-center bg-neutral-100/90 p-1.5 rounded-2xl gap-1.5 w-full sm:w-auto overflow-x-auto scrollbar-none">
                
                {/* 1. RENTAL PROPERTY */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPurpose('RENT');
                    setSelectedBhk('ALL');
                    setPriceRange('ALL');
                  }}
                  className={`flex-1 sm:flex-initial inline-flex items-center justify-center space-x-2 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
                    selectedPurpose === 'RENT'
                      ? 'bg-emerald-700 text-white shadow-md shadow-emerald-700/20'
                      : 'text-neutral-700 hover:text-emerald-800 hover:bg-emerald-50/70'
                  }`}
                >
                  <KeyRound className="w-4 h-4 text-emerald-300" />
                  <span>Rental Property</span>
                </button>

                {/* 2. READY POSSESSION PROPERTY */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPurpose('READY_POSSESSION');
                    setSelectedBhk('ALL');
                    setPriceRange('ALL');
                  }}
                  className={`flex-1 sm:flex-initial inline-flex items-center justify-center space-x-2 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
                    selectedPurpose === 'READY_POSSESSION'
                      ? 'bg-blue-700 text-white shadow-md shadow-blue-700/20'
                      : 'text-neutral-700 hover:text-blue-800 hover:bg-blue-50/70'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 text-blue-300" />
                  <span>Ready Possession Property</span>
                </button>

                {/* 3. UNDER CONSTRUCTION PROPERTY */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPurpose('UNDER_CONSTRUCTION');
                    setSelectedBhk('ALL');
                    setPriceRange('ALL');
                  }}
                  className={`flex-1 sm:flex-initial inline-flex items-center justify-center space-x-2 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
                    selectedPurpose === 'UNDER_CONSTRUCTION'
                      ? 'bg-cyan-700 text-white shadow-md shadow-cyan-700/20'
                      : 'text-neutral-700 hover:text-cyan-800 hover:bg-cyan-50/70'
                  }`}
                >
                  <HardHat className="w-4 h-4 text-cyan-300" />
                  <span>Under Construction Property</span>
                </button>

                {/* 4. RESIDENTIAL PROPERTIES */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPurpose('RESIDENTIAL');
                    setSelectedBhk('ALL');
                    setPriceRange('ALL');
                  }}
                  className={`flex-1 sm:flex-initial inline-flex items-center justify-center space-x-2 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
                    selectedPurpose === 'RESIDENTIAL'
                      ? 'bg-amber-700 text-white shadow-md shadow-amber-700/20'
                      : 'text-neutral-700 hover:text-amber-800 hover:bg-amber-50/70'
                  }`}
                >
                  <HomeIcon className="w-4 h-4 text-amber-300" />
                  <span>Residential Properties</span>
                </button>

                {/* 5. COMMERCIAL SPACES */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPurpose('COMMERCIAL');
                    setSelectedBhk('ALL');
                    setPriceRange('ALL');
                  }}
                  className={`flex-1 sm:flex-initial inline-flex items-center justify-center space-x-2 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
                    selectedPurpose === 'COMMERCIAL'
                      ? 'bg-indigo-700 text-white shadow-md shadow-indigo-700/20'
                      : 'text-neutral-700 hover:text-indigo-800 hover:bg-indigo-50/70'
                  }`}
                >
                  <Building className="w-4 h-4 text-indigo-300" />
                  <span>Commercial Spaces</span>
                </button>

                {/* 6. ALL LISTINGS TAB */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPurpose('ALL');
                  }}
                  className={`flex-1 sm:flex-initial inline-flex items-center justify-center space-x-1.5 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
                    selectedPurpose === 'ALL'
                      ? 'bg-[#080f1a] text-[#d4a359] shadow-md shadow-black/10'
                      : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60'
                  }`}
                >
                  <Layers className="w-4 h-4 text-[#d4a359]" />
                  <span>All Listings</span>
                </button>

              </div>

              {/* Segment Context Badge */}
              <div className="hidden lg:flex items-center space-x-2 text-xs font-semibold text-neutral-500">
                <span className="w-2 h-2 rounded-full bg-[#d4a359]"></span>
                <span>
                  {selectedPurpose === 'RENT' && 'Showing Verified Residential Flats, Penthouses & Homes For Rent in Pune'}
                  {selectedPurpose === 'READY_POSSESSION' && 'Showing 100% Ready-to-Move Residences with Full OC Received across Pune'}
                  {selectedPurpose === 'UNDER_CONSTRUCTION' && 'Showing Premium Under Construction & New Launch Projects with Flexible Payment Plans'}
                  {selectedPurpose === 'RESIDENTIAL' && 'Showing Luxury Residential Homes, Apartments, Villas & Penthouses for Purchase'}
                  {selectedPurpose === 'COMMERCIAL' && 'Showing Grade-A Tech IT Offices, High-Street Retail & Pre-Leased ROI Commercial Assets'}
                  {selectedPurpose === 'ALL' && 'Full Pune Catalog: Rental, Ready Possession, Under Construction, Residential & Commercial'}
                </span>
              </div>
            </div>

            {/* Primary Search Input Capsule */}
            <div className="relative flex flex-col md:flex-row items-stretch md:items-center gap-3">
              <div className="relative flex-1 flex items-center">
                <div className="absolute left-4 pointer-events-none flex items-center justify-center">
                  <div className="w-9 h-9 rounded-xl bg-[#d4a359]/15 flex items-center justify-center">
                    <Search className="w-4 h-4 text-[#b8863b]" />
                  </div>
                </div>
                
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    selectedPurpose === 'RENT'
                      ? "Search rental homes, society, Baner, Kothrud, Viman Nagar, 2 BHK, Penthouse, Rent..."
                      : selectedPurpose === 'READY_POSSESSION'
                      ? "Search ready-to-move homes with OC, immediate possession, Baner, Koregaon Park..."
                      : selectedPurpose === 'UNDER_CONSTRUCTION'
                      ? "Search upcoming skyscraper projects, new launch, possession 2027-2028, Balewadi, Kharadi..."
                      : selectedPurpose === 'RESIDENTIAL'
                      ? "Search residential properties for sale, 3 BHK Flat, Luxury Villa, Duplex Penthouse, Pune..."
                      : selectedPurpose === 'COMMERCIAL'
                      ? "Search commercial office, retail showroom, IT tech park, pre-leased ROI assets, Hinjewadi..."
                      : "Search across rental, ready possession, under construction, residential & commercial properties..."
                  }
                  className="w-full pl-16 pr-10 py-3.5 bg-neutral-50/80 hover:bg-neutral-50 focus:bg-white text-sm font-medium text-neutral-900 placeholder:text-neutral-400 rounded-2xl border border-neutral-200 focus:border-[#d4a359] focus:ring-4 focus:ring-[#d4a359]/15 outline-none transition-all"
                />

                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3.5 p-1 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200/60 transition-all cursor-pointer"
                    title="Clear search query"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Wishlist toggle pill & Direct Search Action */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowWishlistOnly(prev => !prev)}
                  className={`flex-1 md:flex-initial inline-flex items-center justify-center space-x-2 px-4 py-3.5 rounded-2xl text-xs font-bold uppercase tracking-wider border transition-all cursor-pointer ${
                    showWishlistOnly
                      ? 'bg-rose-50 border-rose-300 text-rose-600 shadow-sm'
                      : 'bg-neutral-50 hover:bg-neutral-100 border-neutral-200 text-neutral-700'
                  }`}
                  title="Toggle wishlisted properties"
                >
                  <Heart className={`w-4 h-4 ${showWishlistOnly ? 'fill-rose-500 text-rose-500' : 'text-neutral-400'}`} />
                  <span>Saved ({wishlist.length})</span>
                </button>

                <a
                  href="#property-results-grid"
                  className="inline-flex items-center justify-center space-x-2 px-6 py-3.5 bg-[#d4a359] hover:bg-[#e5b364] text-[#080f1a] font-bold text-xs uppercase tracking-wider rounded-2xl shadow-md shadow-[#d4a359]/20 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>
                    Search {
                      selectedPurpose === 'READY_POSSESSION' ? 'Ready Possession' :
                      selectedPurpose === 'UNDER_CONSTRUCTION' ? 'Under Construction' :
                      selectedPurpose === 'RESIDENTIAL' ? 'Residential' :
                      selectedPurpose === 'COMMERCIAL' ? 'Commercial' :
                      selectedPurpose === 'RENT' ? 'Rental' :
                      'Properties'
                    }
                  </span>
                </a>
              </div>
            </div>

            {/* Secondary Filter Dropdowns Grid (Context-Aware for Rental vs Ready Possession vs Under Construction vs Residential vs Commercial) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-4 mt-4 border-t border-neutral-100">
              
              {/* 1. Location Select */}
              <div className="relative">
                <label className="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1 flex items-center space-x-1">
                  <MapPin className="w-3 h-3 text-[#d4a359]" />
                  <span>Locality / Area</span>
                </label>
                <div className="relative">
                  <select
                    value={selectedLocation}
                    onChange={(e) => setSelectedLocation(e.target.value)}
                    className="w-full appearance-none pl-3 pr-8 py-2.5 bg-neutral-50 hover:bg-white text-xs font-semibold text-neutral-800 rounded-xl border border-neutral-200 hover:border-neutral-300 focus:border-[#d4a359] focus:ring-2 focus:ring-[#d4a359]/15 outline-none transition-all cursor-pointer"
                  >
                    <option value="ALL">All Pune Localities</option>
                    <option value="Baner">Baner (IT Corridor)</option>
                    <option value="Kothrud">Kothrud (Prime Central)</option>
                    <option value="Viman Nagar">Viman Nagar (Airport/East)</option>
                    <option value="Hinjewadi">Hinjewadi (Tech Hub)</option>
                    <option value="FC Road">FC Road / Shivaji Nagar</option>
                    <option value="Kharadi">Kharadi (EON Free Zone)</option>
                    <option value="Koregaon Park">Koregaon Park (Luxury)</option>
                    <option value="Balewadi">Balewadi High Street</option>
                    <option value="Wakad">Wakad (West Pune)</option>
                    <option value="Kalyani Nagar">Kalyani Nagar</option>
                    <option value="Aundh">Aundh</option>
                    <option value="Bavdhan">Bavdhan</option>
                    <option value="Magarpatta">Magarpatta City</option>
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400">
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>

              {/* 2. Configuration / Property Type Select (Dynamic Based on Purpose) */}
              <div className="relative">
                <label className="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1 flex items-center space-x-1">
                  {selectedPurpose === 'COMMERCIAL' ? (
                    <Building className="w-3 h-3 text-indigo-500" />
                  ) : selectedPurpose === 'UNDER_CONSTRUCTION' ? (
                    <HardHat className="w-3 h-3 text-cyan-500" />
                  ) : selectedPurpose === 'READY_POSSESSION' ? (
                    <CheckCircle2 className="w-3 h-3 text-blue-500" />
                  ) : (
                    <BedDouble className="w-3 h-3 text-[#d4a359]" />
                  )}
                  <span>
                    {selectedPurpose === 'COMMERCIAL' 
                      ? 'Commercial Asset Type' 
                      : selectedPurpose === 'UNDER_CONSTRUCTION'
                      ? 'Under Construction Unit'
                      : selectedPurpose === 'READY_POSSESSION'
                      ? 'Ready Possession Type'
                      : 'Configuration / Type'}
                  </span>
                </label>
                <div className="relative">
                  <select
                    value={selectedBhk}
                    onChange={(e) => setSelectedBhk(e.target.value)}
                    className="w-full appearance-none pl-3 pr-8 py-2.5 bg-neutral-50 hover:bg-white text-xs font-semibold text-neutral-800 rounded-xl border border-neutral-200 hover:border-neutral-300 focus:border-[#d4a359] focus:ring-2 focus:ring-[#d4a359]/15 outline-none transition-all cursor-pointer"
                  >
                    {selectedPurpose === 'COMMERCIAL' ? (
                      <>
                        <option value="ALL">All Commercial Spaces</option>
                        <option value="Office">IT & Corporate Office Space</option>
                        <option value="Showroom">High-Street Retail Showroom</option>
                        <option value="Pre-Leased">Pre-Leased Commercial (High ROI)</option>
                      </>
                    ) : selectedPurpose === 'UNDER_CONSTRUCTION' ? (
                      <>
                        <option value="ALL">All Under Construction Projects</option>
                        <option value="2 BHK">2 BHK High-Rise</option>
                        <option value="3 BHK">3 BHK Luxury Sky Suite</option>
                        <option value="4+">4+ BHK / Skyscraper Tower</option>
                      </>
                    ) : selectedPurpose === 'READY_POSSESSION' ? (
                      <>
                        <option value="ALL">All Ready Possession Units (OC Received)</option>
                        <option value="2 BHK">2 BHK Ready to Move</option>
                        <option value="3 BHK">3 BHK Luxury Ready Flat</option>
                        <option value="4+">4+ BHK / Ready Penthouse</option>
                        <option value="Penthouse">Duplex Penthouse</option>
                      </>
                    ) : selectedPurpose === 'RESIDENTIAL' ? (
                      <>
                        <option value="ALL">All Residential Properties</option>
                        <option value="2 BHK">2 BHK Flat / Apartment</option>
                        <option value="3 BHK">3 BHK Luxury Flat</option>
                        <option value="4+">4+ BHK / Duplex</option>
                        <option value="Penthouse">Luxury Penthouse</option>
                      </>
                    ) : (
                      <>
                        <option value="ALL">All Configurations</option>
                        <option value="1 BHK">1 BHK Flat</option>
                        <option value="2 BHK">2 BHK Apartment</option>
                        <option value="3 BHK">3 BHK Luxury Residence</option>
                        <option value="4+">4+ BHK / Penthouse</option>
                        <option value="Penthouse">Penthouse & Duplex</option>
                      </>
                    )}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400">
                    <Layers className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>

              {/* 3. Budget Range Select (Dynamic for Rental vs Ready Possession vs Under Construction vs Residential vs Commercial) */}
              <div className="relative">
                <label className="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1 flex items-center space-x-1">
                  <IndianRupee className="w-3 h-3 text-[#d4a359]" />
                  <span>
                    {selectedPurpose === 'COMMERCIAL'
                      ? 'Commercial Budget'
                      : selectedPurpose === 'RENT'
                      ? 'Monthly Rent Range'
                      : 'Purchase Price Range'}
                  </span>
                </label>
                <div className="relative">
                  <select
                    value={priceRange}
                    onChange={(e) => setPriceRange(e.target.value)}
                    className="w-full appearance-none pl-3 pr-8 py-2.5 bg-neutral-50 hover:bg-white text-xs font-semibold text-neutral-800 rounded-xl border border-neutral-200 hover:border-neutral-300 focus:border-[#d4a359] focus:ring-2 focus:ring-[#d4a359]/15 outline-none transition-all cursor-pointer"
                  >
                    {selectedPurpose === 'COMMERCIAL' ? (
                      <>
                        <option value="ALL">Any Commercial Budget</option>
                        <option value="comm-under-1l">Under ₹1.00 Lakh / mo Lease</option>
                        <option value="comm-1l-3l">₹1.00 Lakh - ₹3.00 Lakh / mo Lease</option>
                        <option value="comm-above-3l">Above ₹3.00 Lakh / mo</option>
                        <option value="buy-2cr-3cr">₹2.00 Cr - ₹3.00 Cr (Purchase)</option>
                        <option value="buy-above-3cr">Above ₹3.00 Cr (Pre-Leased Sale)</option>
                      </>
                    ) : selectedPurpose === 'RENT' ? (
                      <>
                        <option value="ALL">Any Rent Budget</option>
                        <option value="under-30k">Under ₹30,000 / mo</option>
                        <option value="30k-50k">₹30,000 - ₹50,000 / mo</option>
                        <option value="50k-80k">₹50,000 - ₹80,000 / mo</option>
                        <option value="above-80k">Above ₹80,000 / mo (Luxury)</option>
                      </>
                    ) : (
                      <>
                        <option value="ALL">Any Purchase Budget</option>
                        <option value="buy-under-1cr">Under ₹1.00 Crore</option>
                        <option value="buy-1cr-2cr">₹1.00 Cr - ₹2.00 Cr</option>
                        <option value="buy-2cr-3cr">₹2.00 Cr - ₹3.00 Cr</option>
                        <option value="buy-above-3cr">Above ₹3.00 Cr (Ultra Luxury)</option>
                      </>
                    )}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400">
                    <Filter className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>

              {/* 4. Sort By Select */}
              <div className="relative">
                <label className="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1 flex items-center space-x-1">
                  <ArrowUpDown className="w-3 h-3 text-[#d4a359]" />
                  <span>Sort Results By</span>
                </label>
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="w-full appearance-none pl-3 pr-8 py-2.5 bg-neutral-50 hover:bg-white text-xs font-semibold text-neutral-800 rounded-xl border border-neutral-200 hover:border-neutral-300 focus:border-[#d4a359] focus:ring-2 focus:ring-[#d4a359]/15 outline-none transition-all cursor-pointer"
                  >
                    <option value="featured">Featured Curations</option>
                    <option value="price-asc">Price: Low to High</option>
                    <option value="price-desc">Price: High to Low</option>
                    <option value="area-desc">Area: Largest First</option>
                    <option value="newest">Newest Listings</option>
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400">
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>

            </div>

            {/* Quick Interactive Dynamic Pills Tailored to Category */}
            <div className="pt-3.5 mt-3.5 border-t border-neutral-100 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs font-semibold scrollbar-none">
                <span className="text-[11px] uppercase tracking-wider font-bold text-neutral-400 mr-1 flex items-center">
                  Quick Picks:
                </span>
                
                {(selectedPurpose === 'COMMERCIAL' ? [
                  { label: 'All Commercial', action: () => { setSelectedLocation('ALL'); setSelectedBhk('ALL'); setPriceRange('ALL'); } },
                  { label: 'Hinjewadi Tech', action: () => { setSelectedLocation('Hinjewadi'); setSelectedBhk('Office'); } },
                  { label: 'FC Road Retail', action: () => { setSelectedLocation('FC Road'); setSelectedBhk('Showroom'); } },
                  { label: 'IT Office', action: () => setSelectedBhk('Office') },
                  { label: 'Retail Showroom', action: () => setSelectedBhk('Showroom') },
                  { label: 'Pre-Leased ROI', action: () => setSelectedBhk('Pre-Leased') },
                ] : selectedPurpose === 'READY_POSSESSION' ? [
                  { label: 'All Ready Possession', action: () => { setSelectedLocation('ALL'); setSelectedBhk('ALL'); setPriceRange('ALL'); } },
                  { label: 'Baner Ready 3 BHK', action: () => { setSelectedLocation('Baner'); setSelectedBhk('3 BHK'); } },
                  { label: 'Koregaon Park Ready', action: () => { setSelectedLocation('Koregaon Park'); } },
                  { label: '2 BHK Ready', action: () => setSelectedBhk('2 BHK') },
                  { label: '3 BHK Ready', action: () => setSelectedBhk('3 BHK') },
                  { label: 'OC Received', action: () => setSelectedBhk('ALL') },
                ] : selectedPurpose === 'UNDER_CONSTRUCTION' ? [
                  { label: 'All Under Construction', action: () => { setSelectedLocation('ALL'); setSelectedBhk('ALL'); setPriceRange('ALL'); } },
                  { label: 'Balewadi New Launch', action: () => { setSelectedLocation('Balewadi'); } },
                  { label: 'Kharadi High-Rise', action: () => { setSelectedLocation('Kharadi'); } },
                  { label: '2 BHK Tower', action: () => setSelectedBhk('2 BHK') },
                  { label: '3 BHK Sky Suite', action: () => setSelectedBhk('3 BHK') },
                ] : selectedPurpose === 'RESIDENTIAL' ? [
                  { label: 'All Residential', action: () => { setSelectedLocation('ALL'); setSelectedBhk('ALL'); setPriceRange('ALL'); } },
                  { label: 'Baner 3 BHK', action: () => { setSelectedLocation('Baner'); setSelectedBhk('3 BHK'); } },
                  { label: 'Viman Nagar Penthouse', action: () => { setSelectedLocation('Viman Nagar'); setSelectedBhk('Penthouse'); } },
                  { label: '3 BHK Flat', action: () => setSelectedBhk('3 BHK') },
                  { label: 'Under ₹1 Cr', action: () => setPriceRange('buy-under-1cr') },
                  { label: '₹1 Cr - ₹2 Cr', action: () => setPriceRange('buy-1cr-2cr') },
                  { label: 'Luxury Penthouse', action: () => setSelectedBhk('Penthouse') },
                ] : [
                  { label: 'All Rentals', action: () => { setSelectedLocation('ALL'); setSelectedBhk('ALL'); setPriceRange('ALL'); } },
                  { label: 'Baner', action: () => setSelectedLocation('Baner') },
                  { label: 'Kothrud', action: () => setSelectedLocation('Kothrud') },
                  { label: 'Viman Nagar', action: () => setSelectedLocation('Viman Nagar') },
                  { label: 'Hinjewadi', action: () => setSelectedLocation('Hinjewadi') },
                  { label: '2 BHK', action: () => setSelectedBhk('2 BHK') },
                  { label: '3 BHK Luxury', action: () => setSelectedBhk('3 BHK') },
                  { label: 'Under ₹30k', action: () => setPriceRange('under-30k') },
                  { label: '₹30k-₹50k', action: () => setPriceRange('30k-50k') },
                ]).map((chip, idx) => {
                  const isActive = 
                    (chip.label === 'All Rentals' && selectedPurpose === 'RENT' && selectedLocation === 'ALL' && selectedBhk === 'ALL' && priceRange === 'ALL') ||
                    (chip.label === 'All Commercial' && selectedPurpose === 'COMMERCIAL' && selectedLocation === 'ALL' && selectedBhk === 'ALL' && priceRange === 'ALL') ||
                    (chip.label === 'All Ready Possession' && selectedPurpose === 'READY_POSSESSION' && selectedLocation === 'ALL' && selectedBhk === 'ALL' && priceRange === 'ALL') ||
                    (chip.label === 'All Under Construction' && selectedPurpose === 'UNDER_CONSTRUCTION' && selectedLocation === 'ALL' && selectedBhk === 'ALL' && priceRange === 'ALL') ||
                    (chip.label === 'All Residential' && selectedPurpose === 'RESIDENTIAL' && selectedLocation === 'ALL' && selectedBhk === 'ALL' && priceRange === 'ALL') ||
                    (chip.label === selectedLocation) ||
                    (chip.label === selectedBhk) ||
                    (chip.label === '3 BHK Luxury' && selectedBhk === '3 BHK') ||
                    (chip.label === '3 BHK Flat' && selectedBhk === '3 BHK') ||
                    (chip.label === '3 BHK Ready' && selectedBhk === '3 BHK') ||
                    (chip.label === '2 BHK Ready' && selectedBhk === '2 BHK') ||
                    (chip.label === 'IT Office' && selectedBhk === 'Office') ||
                    (chip.label === 'Retail Showroom' && selectedBhk === 'Showroom') ||
                    (chip.label === 'Pre-Leased ROI' && selectedBhk === 'Pre-Leased') ||
                    (chip.label === 'Under ₹30k' && priceRange === 'under-30k') ||
                    (chip.label === '₹30k-₹50k' && priceRange === '30k-50k') ||
                    (chip.label === 'Under ₹1 Cr' && priceRange === 'buy-under-1cr') ||
                    (chip.label === '₹1 Cr - ₹2 Cr' && priceRange === 'buy-1cr-2cr') ||
                    (chip.label === '₹1L - ₹3L /mo' && priceRange === 'comm-1l-3l');

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={chip.action}
                      className={`px-3 py-1.5 rounded-full transition-all text-xs font-medium cursor-pointer whitespace-nowrap ${
                        isActive
                          ? 'bg-[#d4a359] text-[#080f1a] font-bold shadow-sm'
                          : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
                      }`}
                    >
                      {chip.label}
                    </button>
                  );
                })}
              </div>

              {/* Active Filters Clear Action */}
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="text-xs text-rose-600 hover:text-rose-700 font-bold flex items-center space-x-1 cursor-pointer transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Clear All ({activeFilterCount})</span>
                </button>
              )}
            </div>

          </div>

          {/* Results Summary Bar */}
          <div id="property-results-grid" className="flex items-center justify-between flex-wrap gap-3 mb-6">
            <div className="flex items-center space-x-2.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-sm font-bold text-neutral-800">
                Showing <span className="text-[#b8863b] font-extrabold">{filteredProperties.length}</span> of {properties.length}{' '}
                {selectedPurpose === 'COMMERCIAL'
                  ? 'commercial spaces'
                  : selectedPurpose === 'READY_POSSESSION'
                  ? 'ready possession properties'
                  : selectedPurpose === 'UNDER_CONSTRUCTION'
                  ? 'under construction properties'
                  : selectedPurpose === 'RESIDENTIAL'
                  ? 'residential properties'
                  : selectedPurpose === 'RENT'
                  ? 'rental properties'
                  : 'properties'}
              </span>
              {searchQuery && (
                <span className="text-xs text-neutral-500 bg-neutral-200/70 px-2 py-0.5 rounded-md font-medium">
                  Keyword: "{searchQuery}"
                </span>
              )}
            </div>

            {/* Active Tags Preview */}
            <div className="flex items-center flex-wrap gap-1.5 text-xs">
              {selectedPurpose !== 'ALL' && (
                <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md bg-[#080f1a] text-[#d4a359] font-bold">
                  <span>
                    Category: {
                      selectedPurpose === 'RENT' ? 'Rental Property' :
                      selectedPurpose === 'READY_POSSESSION' ? 'Ready Possession' :
                      selectedPurpose === 'UNDER_CONSTRUCTION' ? 'Under Construction' :
                      selectedPurpose === 'RESIDENTIAL' ? 'Residential Properties' :
                      selectedPurpose === 'COMMERCIAL' ? 'Commercial Spaces' :
                      selectedPurpose
                    }
                  </span>
                  <button onClick={() => setSelectedPurpose('ALL')} className="hover:text-white cursor-pointer"><X className="w-3 h-3" /></button>
                </span>
              )}
              {selectedLocation !== 'ALL' && (
                <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md bg-[#d4a359]/15 text-[#8f6424] font-semibold">
                  <span>Locality: {selectedLocation}</span>
                  <button onClick={() => setSelectedLocation('ALL')} className="hover:text-black cursor-pointer"><X className="w-3 h-3" /></button>
                </span>
              )}
              {selectedBhk !== 'ALL' && (
                <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md bg-[#d4a359]/15 text-[#8f6424] font-semibold">
                  <span>Type: {selectedBhk}</span>
                  <button onClick={() => setSelectedBhk('ALL')} className="hover:text-black cursor-pointer"><X className="w-3 h-3" /></button>
                </span>
              )}
              {priceRange !== 'ALL' && (
                <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md bg-[#d4a359]/15 text-[#8f6424] font-semibold">
                  <span>Budget Filter Active</span>
                  <button onClick={() => setPriceRange('ALL')} className="hover:text-black cursor-pointer"><X className="w-3 h-3" /></button>
                </span>
              )}
              {showWishlistOnly && (
                <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md bg-rose-100 text-rose-700 font-semibold">
                  <span>Saved Only</span>
                  <button onClick={() => setShowWishlistOnly(false)} className="hover:text-rose-900 cursor-pointer"><X className="w-3 h-3" /></button>
                </span>
              )}
            </div>
          </div>

          {/* 4-Card Grid on Desktop matching reference */}
          {filteredProperties.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {filteredProperties.map((property, idx) => {
                const isWishlisted = wishlist.includes(property.id);
                const badge = getBadgeForIndex(idx);
                const priceInfo = formatPropertyPrice(property);
                const purposeBadge = getPropertyPurposeBadge(property);
                const isRentedCommercial = property.purpose === 'RENTED_COMMERCIAL_SALE' || property.purpose === 'RENTED_COMMERCIAL_BY_SELL' || property.type === 'Rented Commercial by Sell' || property.type?.toLowerCase().includes('rented commercial') || property.category === 'RENTED_COMMERCIAL_SALE';
                const isCommercial = !isRentedCommercial && (property.purpose === 'COMMERCIAL' || property.category === 'COMMERCIAL' || property.type?.toLowerCase().includes('office') || property.type?.toLowerCase().includes('showroom'));

                return (
                  <div 
                    key={property.id}
                    onClick={() => {
                      setSelectedProperty(property);
                      setActiveMediaIndex(0);
                      setActiveMediaTab('photos');
                    }}
                    className={`bg-white rounded-2xl overflow-hidden border shadow-md hover:shadow-2xl transition-all duration-300 flex flex-col justify-between group cursor-pointer relative ${
                      isRentedCommercial ? 'border-amber-400 hover:border-amber-500 ring-1 ring-amber-400/20' : 'border-[#e8e4db] hover:border-[#d4a359]/60'
                    }`}
                  >
                    <div>
                      {/* Property Image Container */}
                      <div className="h-56 bg-neutral-100 relative overflow-hidden">
                        <img 
                          src={property.images?.[0] || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80'} 
                          alt={property.title} 
                          className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500" 
                        />

                        {/* Hover Overlay Hint */}
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                          <span className="px-4 py-2 rounded-full bg-[#080f1a]/85 backdrop-blur-md text-[#d4a359] text-xs font-bold uppercase tracking-wider border border-[#d4a359]/40 shadow-xl flex items-center space-x-1.5 transform translate-y-2 group-hover:translate-y-0 transition-transform">
                            <Eye className="w-3.5 h-3.5" />
                            <span>View Full Showcase</span>
                          </span>
                        </div>
                        
                        {/* Transaction Purpose & Golden Tag Badge (Top Left) */}
                        <div className="absolute top-3.5 left-3.5 flex flex-col space-y-1 z-10">
                          <div className={`text-[10px] font-black uppercase px-2.5 py-1 rounded shadow-md tracking-wider border ${purposeBadge.bg}`}>
                            {purposeBadge.label}
                          </div>
                          <div className="bg-[#080f1a]/85 backdrop-blur-md text-[#d4a359] text-[9px] font-extrabold uppercase px-2 py-0.5 rounded shadow-sm tracking-wider w-fit">
                            {isRentedCommercial && property.roi_yield ? `${property.roi_yield} ROI Yield` : badge}
                          </div>
                        </div>

                        {/* Top Right Actions: Share + Wishlist */}
                        <div className="absolute top-3.5 right-3.5 flex items-center space-x-2 z-10">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setSharingProperty(property);
                            }}
                            className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-md text-[#111827] hover:text-[#d4a359] flex items-center justify-center shadow-md hover:scale-110 active:scale-95 transition-all cursor-pointer"
                            title="Share property specifications & link"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>

                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleWishlist(property.id);
                            }}
                            className="w-8 h-8 rounded-full bg-white text-[#111827] flex items-center justify-center shadow-md hover:scale-110 active:scale-95 transition-all cursor-pointer"
                            title="Save to Wishlist"
                          >
                            <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-[#d4a359] text-[#d4a359]' : 'text-neutral-600'}`} />
                          </button>
                        </div>
                      </div>

                      {/* Card Content */}
                      <div className="p-5">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-[#b8863b] mb-1 flex items-center justify-between">
                          <span>{property.type || (isRentedCommercial ? 'Rented Commercial by Sell' : isCommercial ? 'Commercial Property' : 'Residential Apartment')}</span>
                          {isRentedCommercial && property.tenant_name && (
                            <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-bold">Tenant: {property.tenant_name}</span>
                          )}
                        </div>
                        <h3 className="text-base font-bold text-[#111827] group-hover:text-[#b8863b] transition-colors line-clamp-1">
                          {property.title}
                        </h3>
                        
                        {/* Location with Pin */}
                        <div className="flex items-center text-xs text-neutral-500 mt-1">
                          <MapPin className="w-3.5 h-3.5 text-[#d4a359] mr-1 flex-shrink-0" />
                          <span className="truncate">{property.location}</span>
                        </div>

                        {/* Adaptive Price Display */}
                        <div className="mt-3 flex items-baseline justify-between">
                          <div>
                            <span className="text-lg font-extrabold text-[#111827] font-serif">
                              {priceInfo.amount}
                            </span>
                            <span className="text-xs font-semibold text-neutral-500 ml-1">
                              {priceInfo.period}
                            </span>
                          </div>
                          <span className="text-[11px] font-bold text-[#b8863b] group-hover:underline">
                            Explore &rarr;
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="p-5 pt-0">
                      {/* Amenities Specs Footer (Adaptive for Pre-Leased vs Commercial vs Residential) */}
                      <div className="pt-3.5 border-t border-neutral-100 grid grid-cols-3 text-center text-xs text-neutral-600 font-medium">
                        {isRentedCommercial ? (
                          <>
                            <div className="flex items-center justify-center space-x-1">
                              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                              <span className="truncate font-bold text-amber-900">{property.roi_yield || 'High ROI'}</span>
                            </div>
                            <div className="flex items-center justify-center space-x-1 border-x border-neutral-200">
                              <Building className="w-3.5 h-3.5 text-neutral-400" />
                              <span className="truncate">{property.lease_term || 'Leased'}</span>
                            </div>
                            <div className="flex items-center justify-center space-x-1">
                              <Maximize2 className="w-3.5 h-3.5 text-neutral-400" />
                              <span>{property.area} Sq.Ft</span>
                            </div>
                          </>
                        ) : isCommercial ? (
                          <>
                            <div className="flex items-center justify-center space-x-1">
                              <Building className="w-3.5 h-3.5 text-neutral-400" />
                              <span>Commercial</span>
                            </div>
                            <div className="flex items-center justify-center space-x-1 border-x border-neutral-200">
                              <Bath className="w-3.5 h-3.5 text-neutral-400" />
                              <span>{property.bathrooms || 2} Washrooms</span>
                            </div>
                            <div className="flex items-center justify-center space-x-1">
                              <Maximize2 className="w-3.5 h-3.5 text-neutral-400" />
                              <span>{property.area} Sq.Ft</span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center justify-center space-x-1">
                              <BedDouble className="w-3.5 h-3.5 text-neutral-400" />
                              <span>{property.bedrooms} Beds</span>
                            </div>
                            <div className="flex items-center justify-center space-x-1 border-x border-neutral-200">
                              <Bath className="w-3.5 h-3.5 text-neutral-400" />
                              <span>{property.bathrooms} Baths</span>
                            </div>
                            <div className="flex items-center justify-center space-x-1">
                              <Maximize2 className="w-3.5 h-3.5 text-neutral-400" />
                              <span>{property.area} Sq.Ft</span>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Action Buttons inside Card */}
                      <div className="pt-3 mt-3 border-t border-neutral-100 flex items-center space-x-2">
                        <a
                          href={getWhatsAppUrl(settings, { property })}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex-1 inline-flex items-center justify-center space-x-1.5 py-2 px-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 hover:text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold transition-all cursor-pointer"
                          title="Chat about this property on WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                          <span>WhatsApp</span>
                        </a>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSharingProperty(property);
                          }}
                          className="inline-flex items-center justify-center space-x-1.5 py-2 px-3 bg-[#d4a359]/10 hover:bg-[#d4a359] text-[#b8863b] hover:text-[#080f1a] border border-[#d4a359]/30 rounded-lg text-xs font-bold transition-all cursor-pointer"
                          title="Share specifications, link & cover image to WhatsApp"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Share</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProperty(property);
                            setActiveMediaIndex(0);
                            setActiveMediaTab('photos');
                          }}
                          className="px-3 py-2 bg-[#080f1a] hover:bg-[#d4a359] text-[#d4a359] hover:text-[#080f1a] border border-[#d4a359]/40 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-1"
                          title="View Full Amenities, Photos & Video Tour"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Details</span>
                        </button>
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Attractive Empty State */
            <div className="bg-white rounded-3xl border border-[#e8e4db] shadow-md p-10 sm:p-14 text-center max-w-2xl mx-auto space-y-5">
              <div className="w-16 h-16 rounded-2xl bg-[#d4a359]/15 border border-[#d4a359]/30 flex items-center justify-center mx-auto text-[#b8863b]">
                <SearchX className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl sm:text-2xl font-bold font-serif text-[#111827]">
                  No matching properties found
                </h3>
                <p className="text-sm text-neutral-500 max-w-md mx-auto">
                  We couldn't find any {
                    selectedPurpose === 'COMMERCIAL' ? 'commercial spaces' :
                    selectedPurpose === 'READY_POSSESSION' ? 'ready possession properties' :
                    selectedPurpose === 'UNDER_CONSTRUCTION' ? 'under construction projects' :
                    selectedPurpose === 'RESIDENTIAL' ? 'residential properties' :
                    selectedPurpose === 'RENT' ? 'rental properties' :
                    'properties'
                  } matching your current criteria. Try adjusting your keyword or switching categories.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="px-6 py-3 bg-[#d4a359] hover:bg-[#e5b364] text-[#080f1a] font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer inline-flex items-center space-x-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Show All Properties</span>
                </button>
                <a
                  href={getWhatsAppUrl(settings, { 
                    customMessage: `Hello Rental Pune, I am looking for a ${
                      selectedPurpose === 'COMMERCIAL' ? 'commercial space' :
                      selectedPurpose === 'READY_POSSESSION' ? 'ready possession flat with OC' :
                      selectedPurpose === 'UNDER_CONSTRUCTION' ? 'under construction project' :
                      selectedPurpose === 'RESIDENTIAL' ? 'residential property for purchase' :
                      'rental home'
                    } in Pune with specific requirements.` 
                  })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer inline-flex items-center space-x-2"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-600" />
                  <span>Request Custom Requirement</span>
                </a>
              </div>
            </div>
          )}

        </div>
      </section>

      {/* 3. ABOUT THE PROJECT SECTION ("Redefining Luxury in Every Detail") */}
      <section id="about-project" className="bg-white text-neutral-900 py-20 px-4 sm:px-6 lg:px-8 border-b border-[#e8e4db]">
        <div className="max-w-7xl mx-auto">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Large Luxury Image */}
            <div className="lg:col-span-6 relative">
              <div className="rounded-3xl overflow-hidden shadow-2xl border border-neutral-200 aspect-[4/3] relative">
                <img 
                  src={settings?.about_luxury_image_url || 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=85'} 
                  alt="Luxury Living Interior" 
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                />
              </div>

              {/* Floating Gold Experience Badge */}
              <div className="absolute -bottom-6 -right-4 sm:bottom-6 sm:-right-6 bg-[#080f1a] text-white p-5 rounded-2xl shadow-2xl border border-[#d4a359]/40 max-w-[200px]">
                <div className="text-3xl font-extrabold text-[#d4a359] font-serif">
                  {settings?.about_luxury_badge_number || '35+'}
                </div>
                <div className="text-xs font-bold uppercase tracking-wider mt-1 text-neutral-200">
                  {settings?.about_luxury_badge_text || 'Luxury Amenities & Services'}
                </div>
              </div>
            </div>

            {/* Right About Narrative */}
            <div className="lg:col-span-6 space-y-6">
              
              {/* Eyebrow */}
              <div className="flex items-center space-x-3">
                <span className="text-[#d4a359] text-xs font-bold uppercase tracking-[0.2em]">
                  {settings?.about_luxury_eyebrow || 'ABOUT THE PROJECT'}
                </span>
                <div className="w-8 h-[2px] bg-[#d4a359]"></div>
              </div>

              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold font-serif text-neutral-900 leading-tight">
                {settings?.about_luxury_heading || 'Redefining Luxury in Every Detail'}
              </h2>

              <p className="text-neutral-600 text-sm sm:text-base leading-relaxed">
                {settings?.about_luxury_tagline || 'Rental Pune is a premium residential development that brings together elegant architecture, world-class amenities and a prime location to offer an unmatched lifestyle.'}
              </p>

              {/* 4 Feature Points with Gold Icons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-full bg-[#d4a359]/15 text-[#d4a359] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-neutral-900">
                      {settings?.about_luxury_point1_title || 'Architectural Excellence'}
                    </h4>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      {settings?.about_luxury_point1_desc || 'International standard designs'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-full bg-[#d4a359]/15 text-[#d4a359] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-neutral-900">
                      {settings?.about_luxury_point2_title || 'Spacious Residences'}
                    </h4>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      {settings?.about_luxury_point2_desc || 'Airy layouts with private decks'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-full bg-[#d4a359]/15 text-[#d4a359] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-neutral-900">
                      {settings?.about_luxury_point3_title || 'Green & Open Spaces'}
                    </h4>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      {settings?.about_luxury_point3_desc || '70% open landscaped parks'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-full bg-[#d4a359]/15 text-[#d4a359] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-neutral-900">
                      {settings?.about_luxury_point4_title || '24/7 Security & Safety'}
                    </h4>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      {settings?.about_luxury_point4_desc || 'Multi-tier smart surveillance'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Know More Gold Outline Button */}
              <div className="pt-2">
                <button 
                  onClick={() => {
                    setReferredProperty(null);
                    setFormStatus('');
                    setIsVisitModalOpen(true);
                  }}
                  className="px-8 py-3.5 border-2 border-[#d4a359] text-[#111827] hover:bg-[#d4a359] hover:text-[#080f1a] font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm cursor-pointer"
                >
                  KNOW MORE
                </button>
              </div>

            </div>

          </div>

        </div>
      </section>


      {/* 3. STATS STRIP SECTION */}
      <section className="bg-[#faf8f5] py-12 px-4 sm:px-6 lg:px-8 border-b border-[#e8e4db]">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center divide-y sm:divide-y-0 sm:divide-x divide-neutral-200">
            
            <div className="pt-4 sm:pt-0 sm:px-4">
              <div className="text-3xl sm:text-5xl font-extrabold text-[#d4a359] font-serif">
                {settings?.about_stat1_number || '3.5'}
              </div>
              <div className="text-xs sm:text-sm font-bold uppercase tracking-wider text-neutral-600 mt-1">
                {settings?.about_stat1_label || 'Acres of Land'}
              </div>
            </div>

            <div className="pt-4 sm:pt-0 sm:px-4">
              <div className="text-3xl sm:text-5xl font-extrabold text-[#d4a359] font-serif">
                {settings?.about_stat2_number || '4'}
              </div>
              <div className="text-xs sm:text-sm font-bold uppercase tracking-wider text-neutral-600 mt-1">
                {settings?.about_stat2_label || 'Towers'}
              </div>
            </div>

            <div className="pt-4 sm:pt-0 sm:px-4">
              <div className="text-3xl sm:text-5xl font-extrabold text-[#d4a359] font-serif">
                {settings?.about_stat3_number || '25+'}
              </div>
              <div className="text-xs sm:text-sm font-bold uppercase tracking-wider text-neutral-600 mt-1">
                {settings?.about_stat3_label || 'Lifestyle Amenities'}
              </div>
            </div>

            <div className="pt-4 sm:pt-0 sm:px-4">
              <div className="text-3xl sm:text-5xl font-extrabold text-[#d4a359] font-serif">
                {settings?.about_stat4_number || '500+'}
              </div>
              <div className="text-xs sm:text-sm font-bold uppercase tracking-wider text-neutral-600 mt-1">
                {settings?.about_stat4_label || 'Happy Families'}
              </div>
            </div>

          </div>
        </div>
      </section>


      {/* 4. DYNAMIC GALLERY SECTION ("A Glimpse of Lavish Living") */}
      <section id="gallery" className="bg-[#ffffff] text-neutral-900 py-20 px-4 sm:px-6 lg:px-8 border-b border-[#e8e4db]">
        <div className="max-w-7xl mx-auto space-y-10">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-[#d4a359] text-xs font-bold uppercase tracking-[0.2em]">GALLERY</span>
                <div className="w-8 h-[2px] bg-[#d4a359]"></div>
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold font-serif text-neutral-900 tracking-tight">
                A Glimpse of Lavish Living
              </h2>
            </div>

            <button 
              onClick={() => {
                if (galleryItems.length > 0) {
                  setActiveGalleryItem(galleryItems[0]);
                  setIsGalleryModalOpen(true);
                } else {
                  setActiveGalleryImage('https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1600&q=85');
                }
              }}
              className="px-6 py-3 border-2 border-[#d4a359] text-[#111827] hover:bg-[#d4a359] hover:text-[#080f1a] font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm cursor-pointer"
            >
              VIEW ALL GALLERY
            </button>
          </div>

          {/* Dynamic Gallery Photos Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {(galleryItems.length > 0 ? galleryItems : [
              {
                id: 1,
                title: 'Tower Exterior & Pool Promenade',
                category: 'Grand Architecture',
                image_url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80',
                description: 'International standard tower facade with landscaped deck.'
              },
              {
                id: 2,
                title: 'Infinity Edge Swimming Pool',
                category: 'Lifestyle',
                image_url: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80',
                description: 'Temperature-controlled infinity lap pool with luxury sun loungers.'
              },
              {
                id: 3,
                title: 'Grand Living & Dining Hall',
                category: 'Interiors',
                image_url: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=800&q=80',
                description: 'Double-height Italian marble living room with designer chandeliers.'
              },
              {
                id: 4,
                title: 'Presidential Master Bedroom',
                category: 'Suites',
                image_url: 'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&w=800&q=80',
                description: 'Spacious master suite featuring wooden flooring and private balcony.'
              },
              {
                id: 5,
                title: 'Executive Clubhouse & Lounge',
                category: 'Amenities',
                image_url: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80',
                description: 'Private resident lounge, business center, and meeting suites.'
              }
            ]).slice(0, 5).map((item, idx) => (
              <div 
                key={item.id || idx}
                onClick={() => {
                  setActiveGalleryItem(item as GalleryItem);
                  setIsGalleryModalOpen(true);
                }}
                className="group relative rounded-2xl overflow-hidden aspect-[4/3] shadow-md border border-neutral-200 cursor-pointer"
              >
                <img 
                  src={item.image_url} 
                  alt={item.title} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  onError={(e: any) => {
                    e.target.src = 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-6 flex flex-col justify-end text-white">
                  <span className="text-xs font-bold text-[#d4a359] uppercase tracking-wider">
                    {item.category || 'Lifestyle'}
                  </span>
                  <span className="text-base font-bold font-serif">
                    {item.title}
                  </span>
                </div>
              </div>
            ))}

            {/* Item 6: Discover More Card */}
            <div 
              onClick={() => {
                setReferredProperty(null);
                setFormStatus('');
                setIsVisitModalOpen(true);
              }}
              className="group relative rounded-2xl overflow-hidden aspect-[4/3] shadow-md border-2 border-dashed border-[#d4a359]/60 hover:border-[#d4a359] bg-[#faf8f5] p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all"
            >
              <div className="w-14 h-14 rounded-full bg-[#d4a359]/15 text-[#d4a359] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Calendar className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold font-serif text-neutral-900">Experience in Person</h4>
              <p className="text-xs text-neutral-600 mt-1 max-w-xs">Book an escorted walkthrough of model residences and sample apartments.</p>
              <span className="text-xs font-bold text-[#d4a359] uppercase tracking-wider mt-3 underline">Schedule Site Visit &rarr;</span>
            </div>

          </div>

        </div>
      </section>

      {/* 5. WORLD-CLASS AMENITIES SECTION (MATCHING LUXURY THEME) */}
      <section id="amenities" className="bg-[#ffffff] text-neutral-900 py-20 px-4 sm:px-6 lg:px-8 border-b border-[#e8e4db]">
        <div className="max-w-7xl mx-auto space-y-12">
          
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <div className="inline-flex items-center justify-center space-x-2">
              <div className="w-8 h-[2px] bg-[#d4a359]"></div>
              <span className="text-[#d4a359] text-xs font-bold uppercase tracking-[0.2em]">AMENITIES</span>
              <div className="w-8 h-[2px] bg-[#d4a359]"></div>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold font-serif text-neutral-900 tracking-tight">
              World-Class Amenities for a Balanced Life
            </h2>
            <p className="text-sm text-neutral-500 max-w-xl mx-auto">
              Curated lifestyle, fitness, recreation, and wellness features designed to enrich your every day.
            </p>
          </div>

          {/* 10 Luxury Amenity Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 sm:gap-6">
            
            {/* Amenity 1 */}
            <div className="bg-[#faf8f5] hover:bg-white border border-[#e8e4db] hover:border-[#d4a359] rounded-2xl p-6 text-center space-y-3 shadow-sm hover:shadow-md transition-all group">
              <div className="w-12 h-12 rounded-full border border-[#d4a359]/40 bg-[#d4a359]/10 text-[#d4a359] flex items-center justify-center mx-auto group-hover:scale-110 group-hover:bg-[#d4a359] group-hover:text-[#080f1a] transition-all">
                <Waves className="w-6 h-6" />
              </div>
              <h4 className="text-xs sm:text-sm font-bold text-neutral-900">Infinity Pool</h4>
              <p className="text-[11px] text-neutral-500">Temperature Controlled</p>
            </div>

            {/* Amenity 2 */}
            <div className="bg-[#faf8f5] hover:bg-white border border-[#e8e4db] hover:border-[#d4a359] rounded-2xl p-6 text-center space-y-3 shadow-sm hover:shadow-md transition-all group">
              <div className="w-12 h-12 rounded-full border border-[#d4a359]/40 bg-[#d4a359]/10 text-[#d4a359] flex items-center justify-center mx-auto group-hover:scale-110 group-hover:bg-[#d4a359] group-hover:text-[#080f1a] transition-all">
                <Dumbbell className="w-6 h-6" />
              </div>
              <h4 className="text-xs sm:text-sm font-bold text-neutral-900">Fitness Center</h4>
              <p className="text-[11px] text-neutral-500">Modern Equipment</p>
            </div>

            {/* Amenity 3 */}
            <div className="bg-[#faf8f5] hover:bg-white border border-[#e8e4db] hover:border-[#d4a359] rounded-2xl p-6 text-center space-y-3 shadow-sm hover:shadow-md transition-all group">
              <div className="w-12 h-12 rounded-full border border-[#d4a359]/40 bg-[#d4a359]/10 text-[#d4a359] flex items-center justify-center mx-auto group-hover:scale-110 group-hover:bg-[#d4a359] group-hover:text-[#080f1a] transition-all">
                <Building2 className="w-6 h-6" />
              </div>
              <h4 className="text-xs sm:text-sm font-bold text-neutral-900">Clubhouse</h4>
              <p className="text-[11px] text-neutral-500">Exclusive Social Lounge</p>
            </div>

            {/* Amenity 4 */}
            <div className="bg-[#faf8f5] hover:bg-white border border-[#e8e4db] hover:border-[#d4a359] rounded-2xl p-6 text-center space-y-3 shadow-sm hover:shadow-md transition-all group">
              <div className="w-12 h-12 rounded-full border border-[#d4a359]/40 bg-[#d4a359]/10 text-[#d4a359] flex items-center justify-center mx-auto group-hover:scale-110 group-hover:bg-[#d4a359] group-hover:text-[#080f1a] transition-all">
                <Trees className="w-6 h-6" />
              </div>
              <h4 className="text-xs sm:text-sm font-bold text-neutral-900">Landscaped Gardens</h4>
              <p className="text-[11px] text-neutral-500">Acre Zen Pathways</p>
            </div>

            {/* Amenity 5 */}
            <div className="bg-[#faf8f5] hover:bg-white border border-[#e8e4db] hover:border-[#d4a359] rounded-2xl p-6 text-center space-y-3 shadow-sm hover:shadow-md transition-all group">
              <div className="w-12 h-12 rounded-full border border-[#d4a359]/40 bg-[#d4a359]/10 text-[#d4a359] flex items-center justify-center mx-auto group-hover:scale-110 group-hover:bg-[#d4a359] group-hover:text-[#080f1a] transition-all">
                <Baby className="w-6 h-6" />
              </div>
              <h4 className="text-xs sm:text-sm font-bold text-neutral-900">Kids Play Area</h4>
              <p className="text-[11px] text-neutral-500">Safe Cushioned Turf</p>
            </div>

            {/* Amenity 6 */}
            <div className="bg-[#faf8f5] hover:bg-white border border-[#e8e4db] hover:border-[#d4a359] rounded-2xl p-6 text-center space-y-3 shadow-sm hover:shadow-md transition-all group">
              <div className="w-12 h-12 rounded-full border border-[#d4a359]/40 bg-[#d4a359]/10 text-[#d4a359] flex items-center justify-center mx-auto group-hover:scale-110 group-hover:bg-[#d4a359] group-hover:text-[#080f1a] transition-all">
                <Gamepad2 className="w-6 h-6" />
              </div>
              <h4 className="text-xs sm:text-sm font-bold text-neutral-900">Indoor Games</h4>
              <p className="text-[11px] text-neutral-500">Billiards & Table Tennis</p>
            </div>

            {/* Amenity 7 */}
            <div className="bg-[#faf8f5] hover:bg-white border border-[#e8e4db] hover:border-[#d4a359] rounded-2xl p-6 text-center space-y-3 shadow-sm hover:shadow-md transition-all group">
              <div className="w-12 h-12 rounded-full border border-[#d4a359]/40 bg-[#d4a359]/10 text-[#d4a359] flex items-center justify-center mx-auto group-hover:scale-110 group-hover:bg-[#d4a359] group-hover:text-[#080f1a] transition-all">
                <PartyPopper className="w-6 h-6" />
              </div>
              <h4 className="text-xs sm:text-sm font-bold text-neutral-900">Party Lawn</h4>
              <p className="text-[11px] text-neutral-500">Open-Air Amphitheatre</p>
            </div>

            {/* Amenity 8 */}
            <div className="bg-[#faf8f5] hover:bg-white border border-[#e8e4db] hover:border-[#d4a359] rounded-2xl p-6 text-center space-y-3 shadow-sm hover:shadow-md transition-all group">
              <div className="w-12 h-12 rounded-full border border-[#d4a359]/40 bg-[#d4a359]/10 text-[#d4a359] flex items-center justify-center mx-auto group-hover:scale-110 group-hover:bg-[#d4a359] group-hover:text-[#080f1a] transition-all">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h4 className="text-xs sm:text-sm font-bold text-neutral-900">24/7 Security</h4>
              <p className="text-[11px] text-neutral-500">CCTV & Smart Access</p>
            </div>

            {/* Amenity 9 */}
            <div className="bg-[#faf8f5] hover:bg-white border border-[#e8e4db] hover:border-[#d4a359] rounded-2xl p-6 text-center space-y-3 shadow-sm hover:shadow-md transition-all group">
              <div className="w-12 h-12 rounded-full border border-[#d4a359]/40 bg-[#d4a359]/10 text-[#d4a359] flex items-center justify-center mx-auto group-hover:scale-110 group-hover:bg-[#d4a359] group-hover:text-[#080f1a] transition-all">
                <Zap className="w-6 h-6" />
              </div>
              <h4 className="text-xs sm:text-sm font-bold text-neutral-900">EV Charging</h4>
              <p className="text-[11px] text-neutral-500">Dedicated Smart Points</p>
            </div>

            {/* Amenity 10 */}
            <div className="bg-[#faf8f5] hover:bg-white border border-[#e8e4db] hover:border-[#d4a359] rounded-2xl p-6 text-center space-y-3 shadow-sm hover:shadow-md transition-all group">
              <div className="w-12 h-12 rounded-full border border-[#d4a359]/40 bg-[#d4a359]/10 text-[#d4a359] flex items-center justify-center mx-auto group-hover:scale-110 group-hover:bg-[#d4a359] group-hover:text-[#080f1a] transition-all">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <h4 className="text-xs sm:text-sm font-bold text-neutral-900">Convenience Mart</h4>
              <p className="text-[11px] text-neutral-500">Daily Essentials Onsite</p>
            </div>

          </div>

        </div>
      </section>


      {/* 6. LOCATION ADVANTAGE ("Perfectly Connected to Everything") */}
      <section id="location" className="bg-[#faf8f5] text-neutral-900 py-20 px-4 sm:px-6 lg:px-8 border-b border-[#e8e4db]">
        <div className="max-w-7xl mx-auto space-y-12">
          
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <div className="inline-flex items-center justify-center space-x-2">
              <div className="w-8 h-[2px] bg-[#d4a359]"></div>
              <span className="text-[#d4a359] text-xs font-bold uppercase tracking-[0.2em]">LOCATION ADVANTAGE</span>
              <div className="w-8 h-[2px] bg-[#d4a359]"></div>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold font-serif text-neutral-900 tracking-tight">
              Perfectlys Connected to Everything
            </h2>
            <p className="text-sm text-neutral-500 max-w-xl mx-auto">
              Strategically situated in Pune's prime corridors with effortless reach to IT clusters, schools, metro hubs & retail destinations.
            </p>
          </div>

          {/* 6 Connectivity Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Card 1 */}
            <div className="bg-white rounded-2xl p-6 border border-[#e8e4db] shadow-sm hover:shadow-md transition-all flex items-start space-x-4">
              <div className="w-12 h-12 rounded-xl bg-[#d4a359]/15 text-[#d4a359] flex items-center justify-center flex-shrink-0">
                <Train className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-base font-bold text-neutral-900">Metro Station</h4>
                  <span className="text-xs font-bold px-2.5 py-1 bg-[#d4a359]/15 text-[#b8863b] rounded-full">5 Mins</span>
                </div>
                <p className="text-xs text-neutral-500 mt-1">Direct rapid transit to city center & expressway</p>
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-white rounded-2xl p-6 border border-[#e8e4db] shadow-sm hover:shadow-md transition-all flex items-start space-x-4">
              <div className="w-12 h-12 rounded-xl bg-[#d4a359]/15 text-[#d4a359] flex items-center justify-center flex-shrink-0">
                <Building2 className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-base font-bold text-neutral-900">Business & IT Hub</h4>
                  <span className="text-xs font-bold px-2.5 py-1 bg-[#d4a359]/15 text-[#b8863b] rounded-full">10 Mins</span>
                </div>
                <p className="text-xs text-neutral-500 mt-1">Eon IT Park, Hinjewadi Phase 1 & Panchshil Tech Park</p>
              </div>
            </div>

            {/* Card 3 */}
            <div className="bg-white rounded-2xl p-6 border border-[#e8e4db] shadow-sm hover:shadow-md transition-all flex items-start space-x-4">
              <div className="w-12 h-12 rounded-xl bg-[#d4a359]/15 text-[#d4a359] flex items-center justify-center flex-shrink-0">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-base font-bold text-neutral-900">Top Schools</h4>
                  <span className="text-xs font-bold px-2.5 py-1 bg-[#d4a359]/15 text-[#b8863b] rounded-full">10 Mins</span>
                </div>
                <p className="text-xs text-neutral-500 mt-1">Symbiosis, Mercedes-Benz & Vibgyor International</p>
              </div>
            </div>

            {/* Card 4 */}
            <div className="bg-white rounded-2xl p-6 border border-[#e8e4db] shadow-sm hover:shadow-md transition-all flex items-start space-x-4">
              <div className="w-12 h-12 rounded-xl bg-[#d4a359]/15 text-[#d4a359] flex items-center justify-center flex-shrink-0">
                <Plane className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-base font-bold text-neutral-900">Airport</h4>
                  <span className="text-xs font-bold px-2.5 py-1 bg-[#d4a359]/15 text-[#b8863b] rounded-full">15 Mins</span>
                </div>
                <p className="text-xs text-neutral-500 mt-1">Pune International Airport via signal-free corridor</p>
              </div>
            </div>

            {/* Card 5 */}
            <div className="bg-white rounded-2xl p-6 border border-[#e8e4db] shadow-sm hover:shadow-md transition-all flex items-start space-x-4">
              <div className="w-12 h-12 rounded-xl bg-[#d4a359]/15 text-[#d4a359] flex items-center justify-center flex-shrink-0">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-base font-bold text-neutral-900">Shopping Mall</h4>
                  <span className="text-xs font-bold px-2.5 py-1 bg-[#d4a359]/15 text-[#b8863b] rounded-full">2 Mins</span>
                </div>
                <p className="text-xs text-neutral-500 mt-1">Phoenix Marketcity, Westend Mall & Luxury Retail</p>
              </div>
            </div>

            {/* Card 6 */}
            <div className="bg-white rounded-2xl p-6 border border-[#e8e4db] shadow-sm hover:shadow-md transition-all flex items-start space-x-4">
              <div className="w-12 h-12 rounded-xl bg-[#d4a359]/15 text-[#d4a359] flex items-center justify-center flex-shrink-0">
                <Stethoscope className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-base font-bold text-neutral-900">Super Specialty Hospital</h4>
                  <span className="text-xs font-bold px-2.5 py-1 bg-[#d4a359]/15 text-[#b8863b] rounded-full">5 Mins</span>
                </div>
                <p className="text-xs text-neutral-500 mt-1">Jupiter, Ruby Hall & Manipal Multispeciality Hospitals</p>
              </div>
            </div>

          </div>

        </div>
      </section>


      {/* 7. LUXURY CTA BANNER ("Your Dream Home Awaits") */}
      <section className="bg-[#080f1a] text-white py-16 px-4 sm:px-6 lg:px-8 border-y border-[#d4a359]/30 relative overflow-hidden">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
          
          <div className="space-y-2 text-center md:text-left">
            <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold font-serif text-white">
              Your Dream Home Awaits
            </h3>
            <p className="text-neutral-300 text-sm max-w-xl">
              Book a private site visit today and step into the luxury you deserve.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <a
              href={`tel:${settings?.phone || '+919876543210'}`}
              className="px-7 py-3.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider rounded-xl border border-white/20 transition-all flex items-center space-x-2 cursor-pointer"
            >
              <Phone className="w-4 h-4 text-[#d4a359]" />
              <span>{settings?.phone || '+91 98765 43210'}</span>
            </a>

            <button
              onClick={() => {
                setReferredProperty(null);
                setFormStatus('');
                setIsVisitModalOpen(true);
              }}
              className="px-8 py-3.5 bg-[#d4a359] hover:bg-[#e5b364] text-[#080f1a] font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-[#d4a359]/30 transition-all cursor-pointer"
            >
              SCHEDULE VISIT
            </button>
          </div>

        </div>
      </section>


      {/* OWNER / LANDLORD LISTING CTA BANNER */}
      <section className="bg-gradient-to-r from-[#050a12] via-[#0b1626] to-[#050a12] text-white py-16 px-4 sm:px-6 lg:px-8 border-y border-[#d4a359]/20 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#d4a359]/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-8 relative z-10">
          <div className="space-y-3 max-w-2xl text-center lg:text-left">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#d4a359]/15 border border-[#d4a359]/30 text-[#d4a359] text-xs font-bold uppercase tracking-wider">
              <Building2 className="w-3.5 h-3.5" />
              <span>Are You a Pune Flat Owner or NRI Landlord?</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-serif font-bold text-white leading-tight">
              List Your Property With <span className="text-[#d4a359]">Rental Pune</span>
            </h2>
            <p className="text-sm text-neutral-300 leading-relaxed">
              Get matched with verified corporate tenants & IT professionals in Baner, Kothrud, Viman Nagar & Hinjewadi. Doorstep Leave & License registration, free listing & fast tenant onboarding.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
            <Link
              to="/list-property"
              className="w-full sm:w-auto px-8 py-4 bg-[#d4a359] hover:bg-[#e5b364] text-[#080f1a] font-serif font-bold text-sm rounded-2xl shadow-xl shadow-[#d4a359]/20 transition-all text-center flex items-center justify-center space-x-2 cursor-pointer"
            >
              <Building2 className="w-4 h-4" />
              <span>List Your Property Now</span>
            </Link>
            
            <a
              href={getWhatsAppUrl(settings, { customMessage: 'Hello Rental Pune, I am a property owner and would like to list my flat for rent.' })}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-6 py-4 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 font-bold text-sm rounded-2xl transition-all text-center flex items-center justify-center space-x-2 cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 text-emerald-400" />
              <span>Owner WhatsApp</span>
            </a>
          </div>
        </div>
      </section>

      {/* HOME FAQS SECTION */}
      <HomeFaqSection settings={settings} />

      {/* 4. "WHY CHOOSE US" SECTION (DEEP MIDNIGHT NAVY BG MATCHING IMAGE FOOTER) */}
      <section id="why-us" className="bg-[#080f1a] text-white py-20 px-4 sm:px-6 lg:px-8 border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Title */}
            <div className="lg:col-span-4 space-y-3">
              <div className="space-y-1">
                <span className="text-[#d4a359] text-xs font-bold uppercase tracking-[0.2em]">WHY CHOOSE US</span>
                <div className="w-10 h-[2px] bg-[#d4a359]"></div>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold font-serif text-white leading-tight">
                Pune's Most Trusted <br />
                Rental Partner
              </h2>
            </div>

            {/* Right 4 Feature Items */}
            <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              
              {/* 1. Trusted & Verified */}
              <div className="flex items-start space-x-3.5">
                <div className="w-11 h-11 rounded-full border border-[#d4a359]/50 flex items-center justify-center flex-shrink-0 text-[#d4a359]">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Trusted & Verified</h4>
                  <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                    All properties are verified for your safety
                  </p>
                </div>
              </div>

              {/* 2. Hassle-Free Process */}
              <div className="flex items-start space-x-3.5">
                <div className="w-11 h-11 rounded-full border border-[#d4a359]/50 flex items-center justify-center flex-shrink-0 text-[#d4a359]">
                  <Handshake className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Hassle-Free Process</h4>
                  <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                    Simple & transparent rental process
                  </p>
                </div>
              </div>

              {/* 3. Expert Support */}
              <div className="flex items-start space-x-3.5">
                <div className="w-11 h-11 rounded-full border border-[#d4a359]/50 flex items-center justify-center flex-shrink-0 text-[#d4a359]">
                  <Headphones className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Expert Support</h4>
                  <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                    Dedicated support at every step
                  </p>
                </div>
              </div>

              {/* 4. Wide Selection */}
              <div className="flex items-start space-x-3.5">
                <div className="w-11 h-11 rounded-full border border-[#d4a359]/50 flex items-center justify-center flex-shrink-0 text-[#d4a359]">
                  <HomeIcon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Wide Selection</h4>
                  <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                    Options for every need and budget
                  </p>
                </div>
              </div>

            </div>

          </div>

        </div>
      </section>


      {/* 5. CONTACT / ENQUIRY SECTION */}
      <section id="contact" className="bg-[#050a12] text-white py-20 px-4 sm:px-6 lg:px-8 border-t border-white/5">
        <div className="max-w-4xl mx-auto">
          <div className="bg-[#0e1726] border border-white/10 rounded-3xl p-8 sm:p-12 shadow-2xl">
            <div className="text-center max-w-xl mx-auto mb-8">
              <span className="text-[#d4a359] text-xs font-bold uppercase tracking-[0.2em] block mb-2">
                ASSISTED RENTAL INQUIRY
              </span>
              <h2 className="text-3xl font-bold font-serif text-white">
                Find Your Next Home in Pune
              </h2>
              <p className="text-sm text-neutral-400 mt-2">
                Leave your details below. Our luxury rental advisors will get in touch within 2 hours with curated options.
              </p>
            </div>

            {formStatus && (
              <div className="mb-6 p-4 rounded-xl bg-[#d4a359]/10 border border-[#d4a359]/30 text-[#d4a359] text-sm font-semibold flex items-center space-x-3">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                <span>{formStatus}</span>
              </div>
            )}

            <form onSubmit={handleLeadSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold uppercase text-neutral-300 mb-1">Your Name</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. Aditya Kulkarni" 
                    value={leadForm.name} 
                    onChange={e => setLeadForm({...leadForm, name: e.target.value})}
                    className="w-full px-4 py-3 bg-[#080f1a] border border-white/15 rounded-xl text-white text-sm focus:outline-none focus:border-[#d4a359] placeholder-neutral-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-neutral-300 mb-1">Phone Number</label>
                  <input 
                    type="tel" 
                    required
                    placeholder="+91 98765 43210" 
                    value={leadForm.phone} 
                    onChange={e => setLeadForm({...leadForm, phone: e.target.value})}
                    className="w-full px-4 py-3 bg-[#080f1a] border border-white/15 rounded-xl text-white text-sm focus:outline-none focus:border-[#d4a359] placeholder-neutral-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold uppercase text-neutral-300 mb-1">Email Address</label>
                  <input 
                    type="email" 
                    placeholder="aditya@example.com" 
                    value={leadForm.email} 
                    onChange={e => setLeadForm({...leadForm, email: e.target.value})}
                    className="w-full px-4 py-3 bg-[#080f1a] border border-white/15 rounded-xl text-white text-sm focus:outline-none focus:border-[#d4a359] placeholder-neutral-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-neutral-300 mb-1">Preferred Location</label>
                  <select
                    value={leadForm.preferredLocation}
                    onChange={e => setLeadForm({...leadForm, preferredLocation: e.target.value})}
                    className="w-full px-4 py-3 bg-[#080f1a] border border-white/15 rounded-xl text-white text-sm focus:outline-none focus:border-[#d4a359] cursor-pointer"
                  >
                    <option value="Baner">Baner / Balewadi</option>
                    <option value="Kothrud">Kothrud / Bavdhan</option>
                    <option value="Viman Nagar">Viman Nagar / Kalyani Nagar</option>
                    <option value="Hinjewadi">Hinjewadi IT Park</option>
                    <option value="Koregaon Park">Koregaon Park</option>
                    <option value="Magarpatta">Magarpatta / Kharadi</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-neutral-300 mb-1">Requirements / Move-in Timeline</label>
                <textarea 
                  rows={3}
                  placeholder="e.g. Looking for a 3 BHK fully furnished flat with parking, immediate possession..."
                  value={leadForm.notes}
                  onChange={e => setLeadForm({...leadForm, notes: e.target.value})}
                  className="w-full px-4 py-3 bg-[#080f1a] border border-white/15 rounded-xl text-white text-sm focus:outline-none focus:border-[#d4a359] placeholder-neutral-500"
                ></textarea>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 bg-[#d4a359] hover:bg-[#e5b364] text-[#080f1a] font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-[#d4a359]/20 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Sending Request...' : 'Send Rental Inquiry'}
                </button>

                <a 
                  href={getWhatsAppUrl(settings, { customMessage: 'Hi Rental Pune, I am looking for a rental property in Pune and would like personalized assistance.' })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-emerald-950/40 flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Chat on WhatsApp</span>
                </a>
              </div>
            </form>
          </div>
        </div>
      </section>


      {/* BOOK PROPERTY / SITE VISIT MODAL */}
      {isVisitModalOpen && (
        <div className="fixed inset-0 bg-[#080f1a]/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0e1726] border border-[#d4a359]/30 text-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button 
              onClick={() => {
                setIsVisitModalOpen(false);
                setReferredProperty(null);
              }}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#d4a359]/15 border border-[#d4a359]/30 flex items-center justify-center text-[#d4a359]">
                {referredProperty ? <HomeIcon className="w-5 h-5" /> : leadModalSource?.includes('Enquire') ? <Mail className="w-5 h-5" /> : <Calendar className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-xl font-bold font-serif text-white">
                  {referredProperty ? 'Book Property' : leadModalSource?.includes('Enquire') ? 'Enquire Now' : 'Book a Site Visit'}
                </h3>
                <p className="text-xs text-neutral-400">
                  {referredProperty 
                    ? 'Direct luxury booking reservation & assisted visit' 
                    : leadModalSource?.includes('Enquire')
                    ? 'Connect with our luxury residence specialist & get pricing details'
                    : 'Schedule an assisted walkthrough in Pune'}
                </p>
              </div>
            </div>

            {/* Selected Property Preview Banner if booking specific property */}
            {referredProperty && (
              <div className="mb-5 p-3 rounded-2xl bg-white/[0.04] border border-[#d4a359]/25 flex items-center space-x-3.5">
                <img 
                  src={referredProperty.images?.[0] || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=300&q=80'} 
                  alt={referredProperty.title} 
                  className="w-16 h-16 rounded-xl object-cover border border-white/10 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#d4a359] px-2 py-0.5 rounded-md bg-[#d4a359]/15 inline-block mb-1">
                    {referredProperty.type} • {referredProperty.bedrooms} BHK
                  </span>
                  <h4 className="text-sm font-bold text-white truncate">{referredProperty.title}</h4>
                  <p className="text-xs text-neutral-400 truncate">
                    {referredProperty.location} • <span className="text-[#d4a359] font-bold">₹{referredProperty.price?.toLocaleString('en-IN')}/mo</span>
                  </p>
                </div>
              </div>
            )}

            {formStatus && (
              <div className="mb-4 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold">
                {formStatus}
              </div>
            )}

            <form onSubmit={async (e) => {
              e.preventDefault();
              const success = await handleLeadSubmit(e);
              if (success) {
                setIsVisitModalOpen(false);
              }
            }} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">Full Name *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={leadForm.name}
                  onChange={e => setLeadForm({...leadForm, name: e.target.value})}
                  className="w-full px-4 py-2.5 bg-[#080f1a] border border-white/15 rounded-xl text-white text-sm focus:outline-none focus:border-[#d4a359]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Phone Number *</label>
                  <input 
                    type="tel" 
                    required
                    placeholder="+91 98765 43210"
                    value={leadForm.phone}
                    onChange={e => setLeadForm({...leadForm, phone: e.target.value})}
                    className="w-full px-4 py-2.5 bg-[#080f1a] border border-white/15 rounded-xl text-white text-sm focus:outline-none focus:border-[#d4a359]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Email Address</label>
                  <input 
                    type="email" 
                    placeholder="name@email.com"
                    value={leadForm.email}
                    onChange={e => setLeadForm({...leadForm, email: e.target.value})}
                    className="w-full px-4 py-2.5 bg-[#080f1a] border border-white/15 rounded-xl text-white text-sm focus:outline-none focus:border-[#d4a359]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Preferred Date</label>
                  <input 
                    type="date" 
                    value={leadForm.visitDate}
                    onChange={e => setLeadForm({...leadForm, visitDate: e.target.value})}
                    className="w-full px-4 py-2.5 bg-[#080f1a] border border-white/15 rounded-xl text-white text-sm focus:outline-none focus:border-[#d4a359]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Preferred Time Slot</label>
                  <select
                    value={leadForm.visitTime || '11:00 AM'}
                    onChange={e => setLeadForm({...leadForm, visitTime: e.target.value})}
                    className="w-full px-4 py-2.5 bg-[#080f1a] border border-white/15 rounded-xl text-white text-sm focus:outline-none focus:border-[#d4a359]"
                  >
                    <option value="10:00 AM">10:00 AM - 11:30 AM</option>
                    <option value="11:30 AM">11:30 AM - 01:00 PM</option>
                    <option value="02:30 PM">02:30 PM - 04:00 PM</option>
                    <option value="04:30 PM">04:30 PM - 06:00 PM</option>
                    <option value="06:30 PM">06:30 PM - 08:00 PM</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">Special Requirements / Notes</label>
                <input 
                  type="text" 
                  placeholder="e.g. Need immediate possession, bachelor flat, pet friendly"
                  value={leadForm.notes}
                  onChange={e => setLeadForm({...leadForm, notes: e.target.value})}
                  className="w-full px-4 py-2.5 bg-[#080f1a] border border-white/15 rounded-xl text-white text-sm focus:outline-none focus:border-[#d4a359]"
                />
              </div>

              <button 
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 bg-[#d4a359] hover:bg-[#e5b364] text-[#080f1a] font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-xl shadow-[#d4a359]/20 mt-2 cursor-pointer flex items-center justify-center space-x-2 active:scale-98"
              >
                <Calendar className="w-4 h-4" />
                <span>{isSubmitting ? 'Confirming Booking...' : (referredProperty ? 'Book Property Now' : 'Confirm Site Visit')}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* IMMERSIVE LUXURY PROPERTY DETAILS SHOWCASE MODAL */}
      <PropertyDetailsModal
        property={selectedProperty}
        settings={settings}
        isOpen={!!selectedProperty}
        onClose={() => setSelectedProperty(null)}
        onBookVisit={(prop) => {
          setReferredProperty(prop);
          setSelectedProperty(null);
          setFormStatus('');
          setIsVisitModalOpen(true);
        }}
        onShare={(prop) => setSharingProperty(prop)}
      />

      {/* THANK YOU MODAL */}
      {showThankYou && (
        <div className="fixed inset-0 bg-[#080f1a]/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0e1726] border border-[#d4a359]/40 text-white rounded-3xl max-w-md w-full p-8 shadow-2xl text-center space-y-4 animate-in zoom-in-95">
            <div className="w-14 h-14 rounded-full bg-[#d4a359]/20 text-[#d4a359] flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold font-serif text-white">Enquiry Received</h3>
            <p className="text-sm text-neutral-300 leading-relaxed">
              Thank you for reaching out to Rental Pune. Our dedicated relationship manager will contact you in 2 hours.
            </p>
            <div className="pt-2 space-y-2">
              <a
                href={getWhatsAppUrl(settings, { customMessage: 'Hi Rental Pune, I just submitted an inquiry on your website and would like immediate assistance.' })}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-950/40"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Chat Instantly on WhatsApp</span>
              </a>
              <button 
                onClick={() => setShowThankYou(false)}
                className="w-full py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
              >
                Continue Browsing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SHARE PROPERTY MODAL (WITH SPECIFICATIONS & COVER PHOTO PREVIEW) */}
      <SharePropertyModal
        property={sharingProperty}
        settings={settings}
        onClose={() => setSharingProperty(null)}
      />

      {/* VIDEO WALKTHROUGH MODAL */}
      {isVideoModalOpen && (
        <div className="fixed inset-0 bg-[#080f1a]/90 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[#0e1726] border border-[#d4a359]/40 text-white rounded-3xl max-w-sm sm:max-w-4xl w-full p-4 sm:p-6 shadow-2xl relative animate-in zoom-in-95 my-auto">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#d4a359]"></span>
                <h3 className="text-sm sm:text-lg font-bold font-serif text-white truncate">
                  {settings?.hero_video_title || 'Experience Luxury Architecture & Walkthrough'}
                </h3>
              </div>
              <button 
                onClick={() => setIsVideoModalOpen(false)}
                className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Close Walkthrough"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* 9:16 on Mobile, 16:9 on Desktop */}
            <div className="aspect-[9/16] sm:aspect-video max-h-[72vh] sm:max-h-none w-full rounded-2xl overflow-hidden bg-black shadow-inner flex items-center justify-center mx-auto">
              {heroVideoInfo.isDirect ? (
                <video
                  src={heroVideoInfo.url}
                  controls
                  autoPlay
                  playsInline
                  className="w-full h-full object-contain sm:object-contain bg-black"
                />
              ) : heroVideoInfo.type === 'youtube' ? (
                <iframe
                  src={heroVideoInfo.modalUrl}
                  title={settings?.hero_video_title || 'Luxury Property Walkthrough'}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              ) : heroVideoInfo.type === 'vimeo' ? (
                <iframe
                  src={heroVideoInfo.modalUrl}
                  title={settings?.hero_video_title || 'Luxury Property Walkthrough'}
                  className="w-full h-full border-0"
                  allow="autoplay; fullscreen"
                  allowFullScreen
                ></iframe>
              ) : (
                <iframe
                  src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1"
                  title="Luxury Property Walkthrough"
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DYNAMIC GALLERY LIGHTBOX MODAL */}
      {(isGalleryModalOpen || activeGalleryImage) && (
        <div className="fixed inset-0 bg-[#050a12]/95 backdrop-blur-xl z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="relative max-w-6xl w-full bg-[#080f1a] rounded-3xl border border-[#d4a359]/30 shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#0c1424]">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-[#d4a359]/15 text-[#d4a359] flex items-center justify-center">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold font-serif text-white">
                    {activeGalleryItem?.title || 'Luxury Architecture & Living Showcase'}
                  </h3>
                  <div className="flex items-center space-x-2 text-xs text-neutral-400">
                    <span className="text-[#d4a359] font-medium">{activeGalleryItem?.category || 'Grand Architecture'}</span>
                    <span>•</span>
                    <span>High Resolution Photo Gallery</span>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => {
                  setIsGalleryModalOpen(false);
                  setActiveGalleryImage(null);
                  setActiveGalleryItem(null);
                }}
                className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Close Gallery"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Category Filter Pills in Modal */}
            <div className="px-6 py-2.5 bg-[#0a101d] border-b border-white/5 flex items-center space-x-2 overflow-x-auto no-scrollbar">
              {['ALL', 'Grand Architecture', 'Lifestyle', 'Interiors', 'Suites', 'Amenities', 'Wellness'].map((cat) => {
                const isSelected = galleryCategoryFilter === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setGalleryCategoryFilter(cat)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#d4a359] text-[#080f1a] font-bold shadow-sm'
                        : 'bg-white/5 text-neutral-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            {/* Main Image Display with Next/Prev Arrows */}
            <div className="relative flex-1 bg-black flex items-center justify-center min-h-[300px] max-h-[56vh] overflow-hidden group">
              <img 
                src={activeGalleryItem?.image_url || activeGalleryImage || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1600&q=85'} 
                alt={activeGalleryItem?.title || 'Luxury Showcase'} 
                className="max-h-[56vh] w-auto max-w-full object-contain mx-auto"
                onError={(e: any) => {
                  e.target.src = 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1600&q=85';
                }}
              />

              {/* Navigation Arrows */}
              {galleryItems.length > 1 && (
                <>
                  <button
                    onClick={() => {
                      const filtered = galleryCategoryFilter === 'ALL'
                        ? galleryItems
                        : galleryItems.filter(i => i.category === galleryCategoryFilter);
                      if (filtered.length === 0) return;
                      const currentIdx = filtered.findIndex(i => i.id === activeGalleryItem?.id);
                      const nextIdx = (currentIdx - 1 + filtered.length) % filtered.length;
                      setActiveGalleryItem(filtered[nextIdx]);
                    }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/60 hover:bg-[#d4a359] text-white hover:text-[#080f1a] transition-all backdrop-blur-md cursor-pointer border border-white/10 shadow-lg"
                    title="Previous Photo"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>

                  <button
                    onClick={() => {
                      const filtered = galleryCategoryFilter === 'ALL'
                        ? galleryItems
                        : galleryItems.filter(i => i.category === galleryCategoryFilter);
                      if (filtered.length === 0) return;
                      const currentIdx = filtered.findIndex(i => i.id === activeGalleryItem?.id);
                      const nextIdx = (currentIdx + 1) % filtered.length;
                      setActiveGalleryItem(filtered[nextIdx]);
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/60 hover:bg-[#d4a359] text-white hover:text-[#080f1a] transition-all backdrop-blur-md cursor-pointer border border-white/10 shadow-lg"
                    title="Next Photo"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </>
              )}
            </div>

            {/* Description & Thumbnail Bar */}
            <div className="p-4 sm:p-5 bg-[#0a101d] border-t border-white/10 space-y-3">
              {activeGalleryItem?.description && (
                <p className="text-xs sm:text-sm text-neutral-300 text-center max-w-2xl mx-auto italic">
                  "{activeGalleryItem.description}"
                </p>
              )}

              {/* Thumbnails Carousel */}
              <div className="flex items-center justify-center space-x-2 overflow-x-auto py-1 no-scrollbar">
                {(galleryCategoryFilter === 'ALL' 
                  ? galleryItems 
                  : galleryItems.filter(i => i.category === galleryCategoryFilter)
                ).map((item) => {
                  const isActive = activeGalleryItem?.id === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveGalleryItem(item)}
                      className={`relative w-16 h-12 sm:w-20 sm:h-14 rounded-lg overflow-hidden flex-shrink-0 transition-all cursor-pointer border-2 ${
                        isActive
                          ? 'border-[#d4a359] ring-2 ring-[#d4a359]/50 scale-105 opacity-100'
                          : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img 
                        src={item.image_url} 
                        alt={item.title} 
                        className="w-full h-full object-cover" 
                      />
                    </button>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
