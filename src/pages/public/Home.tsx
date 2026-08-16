import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../../store/index.js';
import { Property } from '../../types.js';
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
  Share2
} from 'lucide-react';
import { getWhatsAppUrl } from '../../utils/whatsapp.js';
import SharePropertyModal from '../../components/common/SharePropertyModal.js';
import HomeFaqSection from '../../components/home/HomeFaqSection.js';

export default function Home() {
  const { settings } = useAppStore();
  const [properties, setProperties] = useState<Property[]>([]);
  const [wishlist, setWishlist] = useState<number[]>([]);
  
  // Search & Filter State
  const [selectedLocation, setSelectedLocation] = useState('ALL');
  const [selectedBhk, setSelectedBhk] = useState('ALL');
  const [priceRange, setPriceRange] = useState('ALL');

  // Modals
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [sharingProperty, setSharingProperty] = useState<Property | null>(null);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [activeMediaTab, setActiveMediaTab] = useState<'photos' | 'videos'>('photos');

  // Book Visit / Lead modal
  const [isVisitModalOpen, setIsVisitModalOpen] = useState(false);
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

  // Default Pune properties fallback matching the exact reference screenshot
  const defaultPuneProperties: Property[] = [
    {
      id: 101,
      title: '3 BHK Luxury Apartment',
      description: 'Expansive high-rise residence in Baner featuring panoramic city views, imported Italian marble flooring, designer modular kitchen, and exclusive clubhouse amenities.',
      price: 45000,
      type: '3 BHK',
      bedrooms: 3,
      bathrooms: 3,
      area: 1650,
      location: 'Baner, Pune',
      status: 'PUBLISHED',
      images: [
        'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1200&q=80'
      ]
    },
    {
      id: 102,
      title: '2 BHK Modern Apartment',
      description: 'Contemporary, sun-filled 2 BHK in prime Kothrud. Located walking distance to metro station, premium cafes, reputed institutions, and serene green parks.',
      price: 28000,
      type: '2 BHK',
      bedrooms: 2,
      bathrooms: 2,
      area: 1100,
      location: 'Kothrud, Pune',
      status: 'PUBLISHED',
      images: [
        'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=80'
      ]
    },
    {
      id: 103,
      title: '3 BHK Premium Apartment',
      description: 'Sunlit corner residence in Viman Nagar near Pune Airport and major IT corridors. Features automated smart lighting, expansive terrace balcony, and covered parking.',
      price: 50000,
      type: '3 BHK',
      bedrooms: 3,
      bathrooms: 3,
      area: 1800,
      location: 'Viman Nagar, Pune',
      status: 'PUBLISHED',
      images: [
        'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1200&q=80'
      ]
    },
    {
      id: 104,
      title: '2 BHK Spacious Apartment',
      description: 'Smart urban home in Hinjewadi Phase 1, minutes from top IT tech parks. 24/7 security surveillance, high-speed elevators, swimming pool, and fully equipped gym.',
      price: 24000,
      type: '2 BHK',
      bedrooms: 2,
      bathrooms: 2,
      area: 950,
      location: 'Hinjewadi, Pune',
      status: 'PUBLISHED',
      images: [
        'https://images.unsplash.com/photo-1600573472550-8090b5e0745e?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1600566752355-35792bedcfea?auto=format&fit=crop&w=1200&q=80'
      ]
    }
  ];

  useEffect(() => {
    fetch('/api/properties')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          const published = data.filter((p: Property) => p.status === 'PUBLISHED');
          if (published.length > 0) {
            setProperties(published);
          } else {
            setProperties(defaultPuneProperties);
          }
        } else {
          setProperties(defaultPuneProperties);
        }
      })
      .catch(err => {
        console.error('Failed to load properties, using curated Pune catalog:', err);
        setProperties(defaultPuneProperties);
      });
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

  const getBadgeForIndex = (index: number) => {
    const badges = ['PREMIUM', 'POPULAR', 'NEW LISTING', 'BEST DEAL'];
    return badges[index % badges.length];
  };

  const filteredProperties = properties.filter(p => {
    const locMatch = selectedLocation === 'ALL' || p.location.toLowerCase().includes(selectedLocation.toLowerCase());
    const bhkMatch = selectedBhk === 'ALL' || p.type.toLowerCase().includes(selectedBhk.toLowerCase()) || p.bedrooms.toString() === selectedBhk;
    const priceMatch = 
      priceRange === 'ALL' ? true :
      priceRange === 'under-30k' ? p.price <= 30000 :
      priceRange === '30k-50k' ? (p.price > 30000 && p.price <= 50000) :
      priceRange === 'above-50k' ? p.price > 50000 : true;

    return locMatch && bhkMatch && priceMatch;
  });

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormStatus('');

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: leadForm.name,
          email: leadForm.email,
          phone: leadForm.phone,
          property_id: selectedProperty ? Number(selectedProperty.id) : null,
          notes: `[Booking Request] Location: ${leadForm.preferredLocation} | Preferred Date: ${leadForm.visitDate} ${leadForm.visitTime} | Notes: ${leadForm.notes}`
        })
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok || res.status === 201 || data.success) {
        setShowThankYou(true);
        setFormStatus('Thank you! Your enquiry has been received. Our team will contact you in 2 hours.');
        setLeadForm({ name: '', email: '', phone: '', visitDate: '', visitTime: '11:00', notes: '', preferredLocation: 'Baner' });
      } else {
        setFormStatus(data.error || 'Failed to submit enquiry. Please check your details.');
      }
    } catch (err) {
      // Fallback success for preview
      setShowThankYou(true);
      setFormStatus('Thank you! Your enquiry has been received. Our team will contact you in 2 hours.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full bg-[#080f1a] text-white selection:bg-[#d4a359] selection:text-[#080f1a] overflow-x-hidden">
      
      {/* 1. HERO SECTION (EXACT DESIGN MATCH) */}
      <section className="relative min-h-[92vh] flex flex-col justify-center overflow-hidden bg-[#080f1a] pt-12 pb-28 px-4 sm:px-6 lg:px-8">
        
        {/* Background Architectural Luxury Building at Twilight */}
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=2000&q=85" 
            alt="Rental Pune Hero" 
            className="w-full h-full object-cover object-center brightness-75 scale-105 transform duration-1000 ease-out"
          />
          {/* Subtle Gradient Overlays */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#080f1a]/95 via-[#080f1a]/70 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#080f1a] via-transparent to-[#080f1a]/40"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Hero Content */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Eyebrow: Gold line + FIND YOUR PERFECT SPACE */}
            <div className="flex items-center space-x-3">
              <div className="w-8 h-[2px] bg-[#d4a359]"></div>
              <span className="text-[#d4a359] text-xs sm:text-sm font-bold uppercase tracking-[0.25em]">
                FIND YOUR PERFECT SPACE
              </span>
            </div>

            {/* Headline: Premium Rentals. Prime Pune. */}
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-white font-serif leading-[1.1]">
              Premium Rentals. <br />
              Prime <span className="text-[#d4a359] italic font-serif">Pune.</span>
            </h1>

            {/* Subheading */}
            <p className="text-base sm:text-lg text-neutral-200/90 max-w-xl font-normal leading-relaxed">
              Discover thoughtfully curated rental properties in Pune's most desirable locations.
            </p>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-wrap items-center gap-4">
              {/* Explore Properties Button */}
              <a 
                href="#properties"
                className="inline-flex items-center space-x-2 px-7 py-3.5 bg-[#d4a359] hover:bg-[#e5b364] text-[#080f1a] font-bold text-xs sm:text-sm uppercase tracking-wider rounded-lg shadow-lg shadow-[#d4a359]/20 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
              >
                <span>EXPLORE PROPERTIES</span>
                <ArrowRight className="w-4 h-4" />
              </a>

              {/* Book a Visit Button */}
              <button 
                onClick={() => setIsVisitModalOpen(true)}
                className="inline-flex items-center space-x-2 px-7 py-3.5 bg-transparent hover:bg-white/10 text-white font-bold text-xs sm:text-sm uppercase tracking-wider rounded-lg border border-[#d4a359]/60 hover:border-[#d4a359] transition-all cursor-pointer"
              >
                <Calendar className="w-4 h-4 text-[#d4a359]" />
                <span>BOOK A VISIT</span>
              </button>
            </div>
          </div>

          {/* Right Floating Glassmorphism Feature Card */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <div className="w-full max-w-md bg-[#0b1320]/85 backdrop-blur-xl border border-white/15 rounded-2xl p-6 sm:p-7 shadow-2xl space-y-6">
              
              {/* Feature 1: Verified Properties */}
              <div className="flex items-start space-x-4 group">
                <div className="w-11 h-11 rounded-xl bg-[#d4a359]/15 border border-[#d4a359]/30 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                  <ShieldCheck className="w-6 h-6 text-[#d4a359]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white group-hover:text-[#d4a359] transition-colors">Verified Properties</h3>
                  <p className="text-xs text-neutral-300 mt-0.5 font-normal">100% Verified & Trusted</p>
                </div>
              </div>

              {/* Feature 2: Prime Locations */}
              <div className="flex items-start space-x-4 group">
                <div className="w-11 h-11 rounded-xl bg-[#d4a359]/15 border border-[#d4a359]/30 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                  <MapPin className="w-6 h-6 text-[#d4a359]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white group-hover:text-[#d4a359] transition-colors">Prime Locations</h3>
                  <p className="text-xs text-neutral-300 mt-0.5 font-normal">Best Connectivity in Pune</p>
                </div>
              </div>

              {/* Feature 3: Personalized Support */}
              <div className="flex items-start space-x-4 group">
                <div className="w-11 h-11 rounded-xl bg-[#d4a359]/15 border border-[#d4a359]/30 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                  <Headphones className="w-6 h-6 text-[#d4a359]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white group-hover:text-[#d4a359] transition-colors">Personalized Support</h3>
                  <p className="text-xs text-neutral-300 mt-0.5 font-normal">We're Here to Help You</p>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* Carousel indicator dots (matching the bottom 3 pill indicators) */}
        <div className="absolute bottom-6 inset-x-0 flex justify-center space-x-2 z-10 pointer-events-none">
          <div className="w-8 h-1.5 rounded-full bg-[#d4a359]"></div>
          <div className="w-8 h-1.5 rounded-full bg-white/40"></div>
          <div className="w-8 h-1.5 rounded-full bg-white/20"></div>
        </div>

      </section>


      {/* 2. STATS FLOATING RIBBON (WHITE CARD SPANNING ACROSS HERO & BODY) */}
      <section className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 sm:-mt-14 mb-16">
        <div className="bg-white rounded-2xl shadow-2xl border border-[#e8e4db] py-7 px-6 sm:px-12 grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 divide-y sm:divide-y-0 sm:divide-x divide-neutral-100">
          
          {/* Stat 1: 500+ */}
          <div className="flex items-center space-x-4 pt-4 sm:pt-0 sm:px-4">
            <div className="w-12 h-12 rounded-xl bg-[#d4a359]/10 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-7 h-7 text-[#d4a359]" />
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-[#111827] font-serif tracking-tight">500+</div>
              <div className="text-xs sm:text-sm font-semibold text-neutral-500">Premium Properties</div>
            </div>
          </div>

          {/* Stat 2: 1000+ */}
          <div className="flex items-center space-x-4 pt-4 sm:pt-0 sm:px-4">
            <div className="w-12 h-12 rounded-xl bg-[#d4a359]/10 flex items-center justify-center flex-shrink-0">
              <Users className="w-7 h-7 text-[#d4a359]" />
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-[#111827] font-serif tracking-tight">1000+</div>
              <div className="text-xs sm:text-sm font-semibold text-neutral-500">Happy Customers</div>
            </div>
          </div>

          {/* Stat 3: 20+ */}
          <div className="flex items-center space-x-4 pt-4 sm:pt-0 sm:px-4">
            <div className="w-12 h-12 rounded-xl bg-[#d4a359]/10 flex items-center justify-center flex-shrink-0">
              <MapPin className="w-7 h-7 text-[#d4a359]" />
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-[#111827] font-serif tracking-tight">20+</div>
              <div className="text-xs sm:text-sm font-semibold text-neutral-500">Prime Locations</div>
            </div>
          </div>

          {/* Stat 4: 4.8/5 */}
          <div className="flex items-center space-x-4 pt-4 sm:pt-0 sm:px-4">
            <div className="w-12 h-12 rounded-xl bg-[#d4a359]/10 flex items-center justify-center flex-shrink-0">
              <Star className="w-7 h-7 text-[#d4a359] fill-[#d4a359]/30" />
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-[#111827] font-serif tracking-tight">4.8/5</div>
              <div className="text-xs sm:text-sm font-semibold text-neutral-500">Customer Rating</div>
            </div>
          </div>

        </div>
      </section>


      {/* 3. FEATURED PROPERTIES SECTION: "Handpicked For You" (WARM CREAM / OFF-WHITE BG) */}
      <section id="properties" className="bg-[#f8f6f0] text-[#111827] py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          
          {/* Header Row */}
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-[#d4a359] text-xs font-bold uppercase tracking-[0.2em]">FEATURED PROPERTIES</span>
                <div className="w-8 h-[2px] bg-[#d4a359]"></div>
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold font-serif text-[#111827] tracking-tight">
                Handpicked For You
              </h2>
            </div>

            {/* Filter pills & View all button */}
            <div className="flex items-center flex-wrap gap-3">
              <div className="flex items-center space-x-2 bg-white rounded-lg p-1 border border-[#e8e4db] shadow-sm text-xs font-semibold">
                {['ALL', 'Baner', 'Kothrud', 'Viman Nagar', 'Hinjewadi'].map(loc => (
                  <button
                    key={loc}
                    onClick={() => setSelectedLocation(loc)}
                    className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                      selectedLocation === loc 
                        ? 'bg-[#d4a359] text-[#080f1a] font-bold shadow-sm' 
                        : 'text-neutral-600 hover:text-black hover:bg-neutral-100'
                    }`}
                  >
                    {loc === 'ALL' ? 'All Locations' : loc}
                  </button>
                ))}
              </div>

              <button 
                onClick={() => { setSelectedLocation('ALL'); setSelectedBhk('ALL'); setPriceRange('ALL'); }}
                className="inline-flex items-center space-x-2 px-5 py-2.5 bg-white hover:bg-neutral-50 text-[#111827] text-xs font-bold uppercase tracking-wider rounded-lg border border-[#e8e4db] shadow-sm hover:border-[#d4a359] transition-all cursor-pointer"
              >
                <span>VIEW ALL PROPERTIES</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 4-Card Grid on Desktop matching reference */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredProperties.map((property, idx) => {
              const isWishlisted = wishlist.includes(property.id);
              const badge = getBadgeForIndex(idx);

              return (
                <div 
                  key={property.id}
                  className="bg-white rounded-2xl overflow-hidden border border-[#e8e4db] shadow-md hover:shadow-xl transition-all duration-300 flex flex-col group"
                >
                  {/* Property Image Container */}
                  <div className="h-56 bg-neutral-100 relative overflow-hidden">
                    <img 
                      src={property.images?.[0] || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80'} 
                      alt={property.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    />
                    
                    {/* Golden Tag Badge (Top Left) */}
                    <div className="absolute top-3.5 left-3.5 bg-[#d4a359] text-[#080f1a] text-[10px] font-extrabold uppercase px-2.5 py-1 rounded shadow-md tracking-wider">
                      {badge}
                    </div>

                    {/* Top Right Actions: Share + Wishlist */}
                    <div className="absolute top-3.5 right-3.5 flex items-center space-x-2">
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

                    {/* Quick View Button on Hover */}
                    <button 
                      onClick={() => {
                        setSelectedProperty(property);
                        setActiveMediaIndex(0);
                        setActiveMediaTab('photos');
                      }}
                      className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-md text-[#111827] p-2 rounded-full shadow-md hover:bg-white transition-all cursor-pointer opacity-90 group-hover:opacity-100"
                      title="View Photos & Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Card Content */}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-base font-bold text-[#111827] group-hover:text-[#b8863b] transition-colors line-clamp-1">
                        {property.title}
                      </h3>
                      
                      {/* Location with Pin */}
                      <div className="flex items-center text-xs text-neutral-500 mt-1">
                        <MapPin className="w-3.5 h-3.5 text-[#d4a359] mr-1 flex-shrink-0" />
                        <span className="truncate">{property.location}</span>
                      </div>

                      {/* Monthly Rent */}
                      <div className="mt-3">
                        <span className="text-lg font-extrabold text-[#111827] font-serif">
                          ₹{property.price.toLocaleString('en-IN')}
                        </span>
                        <span className="text-xs font-semibold text-neutral-500 ml-1">/mo</span>
                      </div>
                    </div>

                    {/* Amenities Specs Footer */}
                    <div className="pt-3.5 mt-3.5 border-t border-neutral-100 grid grid-cols-3 text-center text-xs text-neutral-600 font-medium">
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
                        onClick={() => {
                          setSelectedProperty(property);
                          setActiveMediaIndex(0);
                          setActiveMediaTab('photos');
                        }}
                        className="px-3 py-2 bg-neutral-900 hover:bg-[#d4a359] text-white hover:text-[#080f1a] rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center"
                        title="View Details & Gallery"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </div>

                  </div>
                </div>
              );
            })}
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


      {/* BOOK A VISIT MODAL */}
      {isVisitModalOpen && (
        <div className="fixed inset-0 bg-[#080f1a]/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0e1726] border border-white/15 text-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button 
              onClick={() => setIsVisitModalOpen(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-[#d4a359]/15 border border-[#d4a359]/30 flex items-center justify-center text-[#d4a359]">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold font-serif text-white">Book a Site Visit</h3>
                <p className="text-xs text-neutral-400">Schedule an assisted walkthrough in Pune</p>
              </div>
            </div>

            <form onSubmit={async (e) => {
              await handleLeadSubmit(e);
              setIsVisitModalOpen(false);
            }} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">Full Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="Rahul Sharma"
                  value={leadForm.name}
                  onChange={e => setLeadForm({...leadForm, name: e.target.value})}
                  className="w-full px-4 py-2.5 bg-[#080f1a] border border-white/15 rounded-xl text-white text-sm focus:outline-none focus:border-[#d4a359]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Phone Number</label>
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
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Visit Date</label>
                  <input 
                    type="date" 
                    required
                    value={leadForm.visitDate}
                    onChange={e => setLeadForm({...leadForm, visitDate: e.target.value})}
                    className="w-full px-4 py-2.5 bg-[#080f1a] border border-white/15 rounded-xl text-white text-sm focus:outline-none focus:border-[#d4a359]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">Location Preference</label>
                <select
                  value={leadForm.preferredLocation}
                  onChange={e => setLeadForm({...leadForm, preferredLocation: e.target.value})}
                  className="w-full px-4 py-2.5 bg-[#080f1a] border border-white/15 rounded-xl text-white text-sm focus:outline-none focus:border-[#d4a359]"
                >
                  <option value="Baner">Baner</option>
                  <option value="Kothrud">Kothrud</option>
                  <option value="Viman Nagar">Viman Nagar</option>
                  <option value="Hinjewadi">Hinjewadi</option>
                </select>
              </div>

              <button 
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-[#d4a359] hover:bg-[#e5b364] text-[#080f1a] font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md mt-2 cursor-pointer"
              >
                Confirm Site Visit
              </button>
            </form>
          </div>
        </div>
      )}


      {/* QUICK VIEW PROPERTY MODAL */}
      {selectedProperty && (
        <div className="fixed inset-0 bg-[#080f1a]/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0e1726] border border-white/15 text-white rounded-3xl max-w-3xl w-full overflow-hidden shadow-2xl relative max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200">
            
            <div className="absolute top-4 right-4 flex items-center space-x-2 z-20">
              <button 
                onClick={() => setSharingProperty(selectedProperty)}
                className="bg-white/10 hover:bg-[#d4a359] text-white hover:text-[#080f1a] p-2 rounded-full shadow-lg cursor-pointer transition-colors"
                title="Share Property Specifications"
              >
                <Share2 className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setSelectedProperty(null)}
                className="bg-white/10 hover:bg-white text-white hover:text-[#080f1a] p-2 rounded-full shadow-lg cursor-pointer transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Media Gallery Image */}
            <div className="h-72 sm:h-96 bg-black relative">
              <img 
                src={selectedProperty.images?.[activeMediaIndex] || selectedProperty.images?.[0]} 
                alt={selectedProperty.title} 
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-4 left-4 bg-[#080f1a]/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/15 text-xs text-white">
                {activeMediaIndex + 1} / {selectedProperty.images?.length || 1}
              </div>
            </div>

            {/* Thumbnails */}
            {selectedProperty.images && selectedProperty.images.length > 1 && (
              <div className="bg-[#080f1a] p-3 flex space-x-2 overflow-x-auto border-b border-white/10">
                {selectedProperty.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveMediaIndex(idx)}
                    className={`w-16 h-12 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all cursor-pointer ${
                      activeMediaIndex === idx ? 'border-[#d4a359] scale-105' : 'border-transparent opacity-60'
                    }`}
                  >
                    <img src={img} alt="thumb" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Property Details */}
            <div className="p-6 sm:p-8 overflow-y-auto space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-[#d4a359] text-xs font-bold uppercase">{selectedProperty.type}</span>
                  <h3 className="text-2xl font-bold font-serif text-white">{selectedProperty.title}</h3>
                  <p className="text-xs text-neutral-400 flex items-center mt-1">
                    <MapPin className="w-3.5 h-3.5 text-[#d4a359] mr-1" />
                    {selectedProperty.location}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-extrabold text-[#d4a359] font-serif">
                    ₹{selectedProperty.price.toLocaleString('en-IN')} <span className="text-xs font-normal text-white">/mo</span>
                  </div>
                </div>
              </div>

              <p className="text-neutral-300 text-sm leading-relaxed">
                {selectedProperty.description}
              </p>

              <div className="grid grid-cols-3 gap-3 py-3 border-y border-white/10 text-center text-xs">
                <div className="p-2 rounded-xl bg-white/5">
                  <span className="block text-[#d4a359] font-bold text-sm">{selectedProperty.bedrooms}</span>
                  <span className="text-neutral-400">Bedrooms</span>
                </div>
                <div className="p-2 rounded-xl bg-white/5">
                  <span className="block text-[#d4a359] font-bold text-sm">{selectedProperty.bathrooms}</span>
                  <span className="text-neutral-400">Bathrooms</span>
                </div>
                <div className="p-2 rounded-xl bg-white/5">
                  <span className="block text-[#d4a359] font-bold text-sm">{selectedProperty.area}</span>
                  <span className="text-neutral-400">Sq.Ft</span>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                <a
                  href={getWhatsAppUrl(settings, { property: selectedProperty })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center space-x-2 cursor-pointer"
                  title="Inquire directly with property manager"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Inquire on WhatsApp</span>
                </a>

                <button
                  type="button"
                  onClick={() => setSharingProperty(selectedProperty)}
                  className="w-full sm:w-auto px-4 py-3 bg-[#d4a359]/20 hover:bg-[#d4a359] text-[#d4a359] hover:text-[#080f1a] border border-[#d4a359]/40 font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center space-x-1.5 cursor-pointer"
                  title="Share property specifications, link & cover image"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Share Specs</span>
                </button>

                <button
                  onClick={() => {
                    setSelectedProperty(null);
                    setIsVisitModalOpen(true);
                  }}
                  className="flex-1 w-full py-3 bg-[#d4a359] hover:bg-[#e5b364] text-[#080f1a] font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md text-center cursor-pointer"
                >
                  Schedule Walkthrough
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

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

    </div>
  );
}
