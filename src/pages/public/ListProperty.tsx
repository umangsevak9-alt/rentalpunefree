import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, 
  CheckCircle2, 
  Upload, 
  Send, 
  ShieldCheck, 
  Sparkles, 
  Phone, 
  MessageCircle, 
  Check, 
  User, 
  Home, 
  IndianRupee, 
  FileText,
  MapPin,
  Film,
  Image as ImageIcon,
  Armchair,
  Trash2,
  Plus,
  Loader2,
  Video,
  X
} from 'lucide-react';
import { useAppStore } from '../../store/index.js';
import { getWhatsAppUrl } from '../../utils/whatsapp.js';
import { supabaseService } from '../../services/supabaseService.js';

export default function ListProperty() {
  const navigate = useNavigate();
  const { settings } = useAppStore();
  const whatsAppUrl = getWhatsAppUrl(settings, {
    customMessage: 'Hi Rental Pune, I am interested in listing my property for rent.'
  });

  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    owner_name: '',
    owner_phone: '',
    owner_email: '',
    owner_type: 'OWNER', // 'OWNER', 'NRI', 'AGENT', 'BUILDER'
    property_title: '',
    property_type: 'Apartment',
    bhk_config: '2 BHK',
    location: 'Baner',
    address: '',
    expected_rent: '',
    security_deposit: '',
    furnishing: 'Semi-Furnished',
    furniture: [
      'Ceiling Fans & LED Lights',
      'Cupboards & Wardrobes'
    ] as string[],
    available_from: '',
    preferred_tenants: 'Any',
    amenities: [
      '24/7 Security',
      'Covered Parking',
      'Power Backup'
    ] as string[],
    imageUrlInput: '',
    videoUrlInput: '',
    images: [] as string[],
    videos: [] as string[],
    notes: ''
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Media upload status states
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState('');

  const puneLocalities = [
    'Baner',
    'Balewadi High Street',
    'Kothrud',
    'Viman Nagar',
    'Kalyani Nagar',
    'Hinjewadi Phase 1',
    'Hinjewadi Phase 2 & 3',
    'Kharadi',
    'Koregaon Park',
    'Wakad',
    'Aundh',
    'Bavdhan',
    'Hadapsar',
    'Magarpatta City',
    'Pimple Saudagar',
    'Nigdi & PCMC',
    'Other Location in Pune'
  ];

  // 4 Primary Core Furniture Package Checkbox Options as requested
  const coreFurnitureOptions = [
    {
      id: 'Ceiling Fans & LED Lights',
      title: 'Ceiling Fans & LED Lights',
      desc: 'Energy efficient ceiling fans in all bedrooms/living room & LED tube lights/fixtures',
      icon: '🌀'
    },
    {
      id: 'Cupboards & Wardrobes',
      title: 'Cupboards & Wardrobes',
      desc: 'Built-in modular wardrobes with storage lofts & dressing mirrors in bedrooms',
      icon: '🚪'
    },
    {
      id: 'Modular Kitchen Cabinets',
      title: 'Modular Kitchen Cabinets',
      desc: 'Modern kitchen cabinets, granite counter storage, exhaust chimney & utensil drawers',
      icon: '🍳'
    },
    {
      id: 'Beds, Mattresses & Sofa Set',
      title: 'Beds, Mattresses & Sofa Set',
      desc: 'King/Queen size beds with comfortable mattresses & living room 3-seater sofa couch',
      icon: '🛋️'
    }
  ];

  // Additional Granular Furniture Items
  const additionalFurnitureOptions = [
    'Air Conditioner (AC)',
    'Dining Table (4/6 Seater)',
    'Geysers / Water Heaters',
    'Refrigerator & Washing Machine',
    'Smart LED TV & TV Unit',
    'Study Table & Office Chair',
    'Curtains & Window Blinds',
    'Shoe Rack & Foyer Unit'
  ];

  const amenityOptions = [
    'Power Backup',
    '24/7 Security',
    'Covered Parking',
    'Gymnasium',
    'Swimming Pool',
    'Elevator / Lift',
    'Clubhouse',
    'Piped MNGL Gas',
    'Children Play Area',
    'Pet Friendly',
    'Modular Kitchen',
    'Gated Community'
  ];

  const handleFurnitureToggle = (item: string) => {
    if (form.furniture.includes(item)) {
      setForm({ ...form, furniture: form.furniture.filter(f => f !== item) });
    } else {
      setForm({ ...form, furniture: [...form.furniture, item] });
    }
  };

  const handleSelectAllCoreFurniture = () => {
    const allCore = coreFurnitureOptions.map(c => c.id);
    const hasAll = allCore.every(c => form.furniture.includes(c));
    if (hasAll) {
      setForm({ ...form, furniture: form.furniture.filter(f => !allCore.includes(f)) });
    } else {
      const merged = Array.from(new Set([...form.furniture, ...allCore]));
      setForm({ ...form, furniture: merged });
    }
  };

  const handleAmenityToggle = (amenity: string) => {
    if (form.amenities.includes(amenity)) {
      setForm({ ...form, amenities: form.amenities.filter(a => a !== amenity) });
    } else {
      setForm({ ...form, amenities: [...form.amenities, amenity] });
    }
  };

  // --- SYSTEM FILE UPLOAD HANDLERS ---
  const handlePhotoFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImage(true);
    setErrorMsg('');
    const newImageUrls: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadProgressText(`Uploading & optimizing photo ${i + 1} of ${files.length}...`);

      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await fetch('/api/upload/image', {
          method: 'POST',
          body: formData
        });

        if (res.ok) {
          const data = await res.json();
          if (data && data.url) {
            newImageUrls.push(data.url);
          }
        } else {
          // If server upload fails, create local object URL / base64 fallback
          const localUrl = URL.createObjectURL(file);
          newImageUrls.push(localUrl);
        }
      } catch (err) {
        console.warn('Direct image upload fallback:', err);
        const localUrl = URL.createObjectURL(file);
        newImageUrls.push(localUrl);
      }
    }

    setForm(prev => ({
      ...prev,
      images: [...prev.images, ...newImageUrls]
    }));

    setUploadingImage(false);
    setUploadProgressText('');
    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  const handleVideoFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingVideo(true);
    setErrorMsg('');
    const newVideoUrls: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadProgressText(`Uploading walkthrough video ${i + 1} of ${files.length}...`);

      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await fetch('/api/upload/video', {
          method: 'POST',
          body: formData
        });

        if (res.ok) {
          const data = await res.json();
          if (data && data.url) {
            newVideoUrls.push(data.url);
          }
        } else {
          const localUrl = URL.createObjectURL(file);
          newVideoUrls.push(localUrl);
        }
      } catch (err) {
        console.warn('Direct video upload fallback:', err);
        const localUrl = URL.createObjectURL(file);
        newVideoUrls.push(localUrl);
      }
    }

    setForm(prev => ({
      ...prev,
      videos: [...prev.videos, ...newVideoUrls]
    }));

    setUploadingVideo(false);
    setUploadProgressText('');
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  const handleAddImageLink = () => {
    if (form.imageUrlInput.trim()) {
      setForm({
        ...form,
        images: [...form.images, form.imageUrlInput.trim()],
        imageUrlInput: ''
      });
    }
  };

  const handleAddVideoLink = () => {
    if (form.videoUrlInput.trim()) {
      setForm({
        ...form,
        videos: [...form.videos, form.videoUrlInput.trim()],
        videoUrlInput: ''
      });
    }
  };

  const handleRemoveImage = (index: number) => {
    setForm({
      ...form,
      images: form.images.filter((_, i) => i !== index)
    });
  };

  const handleRemoveVideo = (index: number) => {
    setForm({
      ...form,
      videos: form.videos.filter((_, i) => i !== index)
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = form.owner_name.trim();
    const trimmedPhone = form.owner_phone.trim();
    const trimmedTitle = form.property_title.trim();
    const trimmedLocation = form.location.trim();

    if (!trimmedName || !trimmedPhone || !trimmedTitle || !trimmedLocation) {
      setErrorMsg('Please fill in your Name, Phone Number, Property Title, and Location.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    const submissionPayload = {
      ...form,
      owner_name: trimmedName,
      owner_phone: trimmedPhone,
      property_title: trimmedTitle,
      location: trimmedLocation,
      expected_rent: form.expected_rent ? Number(form.expected_rent) : undefined,
      security_deposit: form.security_deposit ? Number(form.security_deposit) : undefined,
      furniture: form.furniture,
      videos: form.videos
    };

    let submittedSuccessfully = false;

    // Call supabaseService.ownerSubmissions.create which handles API POST, Supabase fallback, and local cache
    try {
      const result = await supabaseService.ownerSubmissions.create(submissionPayload);
      if (result) {
        submittedSuccessfully = true;
      }
    } catch (err: any) {
      console.warn('supabaseService ownerSubmissions.create warning:', err);
      // Secondary fallback
      try {
        const res = await fetch('/api/owner-submissions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submissionPayload)
        });
        if (res.ok) {
          submittedSuccessfully = true;
        }
      } catch (e) {
        console.error('Final fallback error:', e);
      }
    }

    if (submittedSuccessfully) {
      setSubmitted(true);
      // Broadcast event
      try {
        window.dispatchEvent(new CustomEvent('owner_submissions_updated'));
      } catch {}
      // Navigate to Thank You page with owner context
      navigate('/thank-you?type=owner', { 
        state: { 
          type: 'owner',
          propertyTitle: trimmedTitle,
          ownerName: trimmedName
        } 
      });
    } else {
      setErrorMsg('Something went wrong submitting your property details. Please try again.');
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-[#080f1a] text-white py-10 px-4 sm:px-6 lg:px-8 selection:bg-[#d4a359] selection:text-[#080f1a]">
      <div className="max-w-5xl mx-auto space-y-10">
        
        {/* Header Hero Section */}
        <div className="text-center space-y-4 pt-6">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-[#d4a359]/15 border border-[#d4a359]/30 text-[#d4a359] text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Owners & NRI Landlords Portal</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-serif font-bold tracking-tight text-white leading-tight">
            List Your Pune Property <span className="text-[#d4a359]">With Us</span>
          </h1>
          <p className="text-base sm:text-lg text-neutral-300 max-w-2xl mx-auto leading-relaxed">
            Connect directly with verified premium corporate tenants, IT professionals, and families across Pune. Zero upfront fees & doorstep biometric Leave & License registration.
          </p>
        </div>

        {/* Benefits Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#050a12] p-6 rounded-2xl border border-white/10 hover:border-[#d4a359]/40 transition-all space-y-3 shadow-lg">
            <div className="w-10 h-10 rounded-xl bg-[#d4a359]/20 flex items-center justify-center text-[#d4a359]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-serif font-bold text-lg text-white">Verified Tenants Only</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Thorough background checks, IT company employment verification, and tenant profiles before every visit.
            </p>
          </div>

          <div className="bg-[#050a12] p-6 rounded-2xl border border-white/10 hover:border-[#d4a359]/40 transition-all space-y-3 shadow-lg">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h3 className="font-serif font-bold text-lg text-white">Doorstep Registration</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Complete biometric Aadhaar execution for Leave & License agreement right at your home or workplace.
            </p>
          </div>

          <div className="bg-[#050a12] p-6 rounded-2xl border border-white/10 hover:border-[#d4a359]/40 transition-all space-y-3 shadow-lg">
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 flex items-center justify-center text-sky-400">
              <Building2 className="w-5 h-5" />
            </div>
            <h3 className="font-serif font-bold text-lg text-white">NRI & Owner Concierge</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Dedicated rental manager handles key collection, tenant walkthroughs, society NOCs, and rent management.
            </p>
          </div>
        </div>

        {/* Submission Form Container */}
        <div className="bg-[#050a12] rounded-3xl border border-white/15 p-6 sm:p-10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#d4a359]/5 rounded-full blur-3xl pointer-events-none"></div>

          {submitted ? (
            <div className="text-center py-16 space-y-6 max-w-lg mx-auto">
              <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/40 animate-bounce">
                <Check className="w-10 h-10" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white">
                Property Listing Received!
              </h2>
              <p className="text-sm text-neutral-300 leading-relaxed">
                Thank you <strong className="text-[#d4a359]">{form.owner_name}</strong>. Our Pune property advisor has received your details for <strong className="text-white">{form.property_title}</strong> in {form.location}.
              </p>
              <div className="bg-[#080f1a] p-4 rounded-xl border border-white/10 text-xs text-neutral-400 space-y-1 font-mono">
                <p>Status: <span className="text-amber-400 font-bold">Pending Review</span></p>
                <p>Contact Phone: {form.owner_phone}</p>
                <p>Expected Rent: ₹{Number(form.expected_rent || 0).toLocaleString('en-IN')}/mo</p>
                <p>Furniture Items: {form.furniture.length} selected</p>
                <p>Media: {form.images.length} Photos, {form.videos.length} Videos</p>
              </div>
              <p className="text-xs text-neutral-400">
                We will verify your details and contact you within 2 to 4 hours. You can also message us directly on WhatsApp for expedited processing!
              </p>

              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
                <a
                  href={whatsAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Connect on WhatsApp</span>
                </a>
                <button
                  type="button"
                  onClick={() => {
                    setSubmitted(false);
                    setForm({
                      owner_name: '',
                      owner_phone: '',
                      owner_email: '',
                      owner_type: 'OWNER',
                      property_title: '',
                      property_type: 'Apartment',
                      bhk_config: '2 BHK',
                      location: 'Baner',
                      address: '',
                      expected_rent: '',
                      security_deposit: '',
                      furnishing: 'Semi-Furnished',
                      furniture: ['Ceiling Fans & LED Lights', 'Cupboards & Wardrobes'],
                      available_from: '',
                      preferred_tenants: 'Any',
                      amenities: ['24/7 Security', 'Covered Parking', 'Power Backup'],
                      imageUrlInput: '',
                      videoUrlInput: '',
                      images: [],
                      videos: [],
                      notes: ''
                    });
                  }}
                  className="w-full sm:w-auto px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-bold text-sm rounded-xl transition-all"
                >
                  List Another Property
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-8">
              
              {/* Form Section Header */}
              <div className="border-b border-white/10 pb-4">
                <h2 className="text-xl font-serif font-bold text-[#d4a359] flex items-center space-x-2">
                  <Building2 className="w-5 h-5" />
                  <span>Property Owner & Listing Details Form</span>
                </h2>
                <p className="text-xs text-neutral-400 mt-1">
                  Fill in the details below to publish your property to Rental Pune verified tenant network.
                </p>
              </div>

              {errorMsg && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-semibold">
                  {errorMsg}
                </div>
              )}

              {/* 1. OWNER DETAILS */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-white/90 flex items-center space-x-2 border-b border-white/5 pb-2">
                  <User className="w-4 h-4 text-[#d4a359]" />
                  <span>1. Owner / Contact Person Information</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                      Your Full Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Anand Kulkarni"
                      value={form.owner_name}
                      onChange={e => setForm({ ...form, owner_name: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#080f1a] border border-white/15 text-white text-sm focus:outline-none focus:border-[#d4a359] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                      Phone Number (WhatsApp) <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. +91 98765 43210"
                      value={form.owner_phone}
                      onChange={e => setForm({ ...form, owner_phone: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#080f1a] border border-white/15 text-white text-sm focus:outline-none focus:border-[#d4a359] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                      Email Address (Optional)
                    </label>
                    <input
                      type="email"
                      placeholder="e.g. anand@gmail.com"
                      value={form.owner_email}
                      onChange={e => setForm({ ...form, owner_email: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#080f1a] border border-white/15 text-white text-sm focus:outline-none focus:border-[#d4a359] transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    You are listing as:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { id: 'OWNER', label: 'Resident Property Owner' },
                      { id: 'NRI', label: 'NRI / Outstation Landlord' },
                      { id: 'AGENT', label: 'Authorized Agent' },
                      { id: 'BUILDER', label: 'Developer / Builder' }
                    ].map(type => (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => setForm({ ...form, owner_type: type.id })}
                        className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                          form.owner_type === type.id
                            ? 'bg-[#d4a359] text-[#080f1a] border-[#d4a359] shadow-md'
                            : 'bg-[#080f1a] text-neutral-300 border-white/15 hover:border-white/30'
                        }`}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 2. PROPERTY SPECIFICATIONS */}
              <div className="space-y-4 pt-4 border-t border-white/10">
                <h3 className="text-sm font-bold uppercase tracking-wider text-white/90 flex items-center space-x-2 border-b border-white/5 pb-2">
                  <Home className="w-4 h-4 text-[#d4a359]" />
                  <span>2. Property Specifications & Locality</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                      Property Title / Society Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 3 BHK Luxury Flat in Megapolis Mulberry"
                      value={form.property_title}
                      onChange={e => setForm({ ...form, property_title: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#080f1a] border border-white/15 text-white text-sm focus:outline-none focus:border-[#d4a359] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                      Prime Pune Locality / Area <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={form.location}
                      onChange={e => setForm({ ...form, location: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#080f1a] border border-white/15 text-white text-sm focus:outline-none focus:border-[#d4a359] transition-colors cursor-pointer"
                    >
                      {puneLocalities.map(loc => (
                        <option key={loc} value={loc} className="bg-[#080f1a] text-white">
                          {loc}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                      BHK Configuration
                    </label>
                    <select
                      value={form.bhk_config}
                      onChange={e => setForm({ ...form, bhk_config: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#080f1a] border border-white/15 text-white text-sm focus:outline-none focus:border-[#d4a359] transition-colors cursor-pointer"
                    >
                      {['1 BHK', '1.5 BHK', '2 BHK', '2.5 BHK', '3 BHK', '3.5 BHK', '4 BHK', 'Penthouse / Villa'].map(bhk => (
                        <option key={bhk} value={bhk} className="bg-[#080f1a] text-white">
                          {bhk}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                      Property Type
                    </label>
                    <select
                      value={form.property_type}
                      onChange={e => setForm({ ...form, property_type: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#080f1a] border border-white/15 text-white text-sm focus:outline-none focus:border-[#d4a359] transition-colors cursor-pointer"
                    >
                      {['Apartment', 'Gated Society Flat', 'Independent House / Villa', 'Row House', 'Penthouse', 'Studio Apartment'].map(pt => (
                        <option key={pt} value={pt} className="bg-[#080f1a] text-white">
                          {pt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                      Furnishing Status
                    </label>
                    <select
                      value={form.furnishing}
                      onChange={e => setForm({ ...form, furnishing: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#080f1a] border border-white/15 text-white text-sm focus:outline-none focus:border-[#d4a359] transition-colors cursor-pointer"
                    >
                      {['Furnished', 'Semi-Furnished', 'Unfurnished'].map(f => (
                        <option key={f} value={f} className="bg-[#080f1a] text-white">
                          {f}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    Address / Landmark Details
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Flat 502, Building A, Near Balewadi High Street, Baner"
                    value={form.address}
                    onChange={e => setForm({ ...form, address: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#080f1a] border border-white/15 text-white text-sm focus:outline-none focus:border-[#d4a359] transition-colors"
                  />
                </div>
              </div>

              {/* 3. FINANCIALS & PREFERENCES */}
              <div className="space-y-4 pt-4 border-t border-white/10">
                <h3 className="text-sm font-bold uppercase tracking-wider text-white/90 flex items-center space-x-2 border-b border-white/5 pb-2">
                  <IndianRupee className="w-4 h-4 text-[#d4a359]" />
                  <span>3. Financial Expectations & Tenant Preference</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                      Expected Rent (₹/Month)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 35000"
                      value={form.expected_rent}
                      onChange={e => setForm({ ...form, expected_rent: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#080f1a] border border-white/15 text-white text-sm focus:outline-none focus:border-[#d4a359] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                      Security Deposit (₹)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 100000"
                      value={form.security_deposit}
                      onChange={e => setForm({ ...form, security_deposit: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#080f1a] border border-white/15 text-white text-sm focus:outline-none focus:border-[#d4a359] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                      Preferred Tenants / Purpose
                    </label>
                    <select
                      value={form.preferred_tenants}
                      onChange={e => setForm({ ...form, preferred_tenants: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#080f1a] border border-white/15 text-white text-sm focus:outline-none focus:border-[#d4a359] transition-colors cursor-pointer"
                    >
                      {[
                        'Any (Family or Bachelors)',
                        'Family Only',
                        'Working IT Professionals',
                        'Company Lease Only',
                        'For Management Purpose',
                        'Bachelors (Male / Female)'
                      ].map(p => (
                        <option key={p} value={p} className="bg-[#080f1a] text-white">
                          {p}
                        </option>
                      ))}
                    </select>
                    {form.preferred_tenants === 'For Management Purpose' && (
                      <p className="text-[11px] text-[#d4a359] mt-1.5 font-medium flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-[#d4a359]" />
                        <span>Dedicated rental management, tenant screening & key concierge service.</span>
                      </p>
                    )}
                  </div>

                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    Available Move-in Date
                  </label>
                  <input
                    type="date"
                    value={form.available_from}
                    onChange={e => setForm({ ...form, available_from: e.target.value })}
                    className="w-full sm:w-1/2 px-4 py-2.5 rounded-xl bg-[#080f1a] border border-white/15 text-white text-sm focus:outline-none focus:border-[#d4a359] transition-colors"
                  />
                </div>
              </div>

              {/* 4. SOCIETY & APARTMENT AMENITIES */}
              <div className="space-y-4 pt-4 border-t border-white/10">
                <h3 className="text-sm font-bold uppercase tracking-wider text-white/90 flex items-center space-x-2 border-b border-white/5 pb-2">
                  <Sparkles className="w-4 h-4 text-[#d4a359]" />
                  <span>4. Society & Building Amenities</span>
                </h3>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-2">
                    Select Available Society Features:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {amenityOptions.map(amenity => {
                      const isSelected = form.amenities.includes(amenity);
                      return (
                        <button
                          key={amenity}
                          type="button"
                          onClick={() => handleAmenityToggle(amenity)}
                          className={`p-2.5 rounded-xl text-xs font-medium border text-left transition-all flex items-center space-x-2 cursor-pointer ${
                            isSelected
                              ? 'bg-[#d4a359]/20 border-[#d4a359] text-white font-bold'
                              : 'bg-[#080f1a] border-white/10 text-neutral-400 hover:text-white'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-[#d4a359] border-[#d4a359] text-[#080f1a]' : 'border-white/20'}`}>
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <span className="truncate">{amenity}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 5. FURNITURE & FIXTURES (4 CORE CHECKBOX OPTIONS + DETAILED ITEMS) */}
              <div className="space-y-4 pt-4 border-t border-white/10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-2">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white/90 flex items-center space-x-2">
                    <Armchair className="w-4 h-4 text-[#d4a359]" />
                    <span>5. Furniture & Interior Fixtures Included</span>
                  </h3>
                  <button
                    type="button"
                    onClick={handleSelectAllCoreFurniture}
                    className="text-xs text-[#d4a359] hover:underline font-semibold text-left cursor-pointer"
                  >
                    Toggle All Core 4 Options
                  </button>
                </div>

                <p className="text-xs text-neutral-400">
                  Select which furniture items and woodwork fixtures are provided in your property:
                </p>

                {/* 4 Core Checkbox Cards as Requested */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {coreFurnitureOptions.map(option => {
                    const isChecked = form.furniture.includes(option.id);
                    return (
                      <div
                        key={option.id}
                        onClick={() => handleFurnitureToggle(option.id)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 select-none ${
                          isChecked
                            ? 'bg-[#d4a359]/15 border-[#d4a359] shadow-lg shadow-[#d4a359]/10'
                            : 'bg-[#080f1a] border-white/10 hover:border-white/25 hover:bg-white/[0.02]'
                        }`}
                      >
                        <div className={`w-5 h-5 mt-0.5 rounded-md border flex items-center justify-center flex-shrink-0 transition-colors ${
                          isChecked
                            ? 'bg-[#d4a359] border-[#d4a359] text-[#080f1a]'
                            : 'border-white/30 bg-black/40'
                        }`}>
                          {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>

                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-base">{option.icon}</span>
                            <span className={`text-sm font-bold ${isChecked ? 'text-white' : 'text-neutral-200'}`}>
                              {option.title}
                            </span>
                          </div>
                          <p className="text-[11px] text-neutral-400 leading-relaxed">
                            {option.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Additional Furniture Checklist */}
                <div className="pt-2">
                  <label className="block text-xs font-semibold text-neutral-300 mb-2">
                    Additional Appliances & Furnishings:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {additionalFurnitureOptions.map(item => {
                      const isSelected = form.furniture.includes(item);
                      return (
                        <button
                          key={item}
                          type="button"
                          onClick={() => handleFurnitureToggle(item)}
                          className={`p-2 rounded-xl text-xs border text-left transition-all flex items-center space-x-2 cursor-pointer ${
                            isSelected
                              ? 'bg-[#d4a359]/20 border-[#d4a359] text-white font-semibold'
                              : 'bg-[#080f1a] border-white/10 text-neutral-400 hover:text-white'
                          }`}
                        >
                          <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-[#d4a359] border-[#d4a359] text-[#080f1a]' : 'border-white/20'}`}>
                            {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </div>
                          <span className="truncate text-[11px]">{item}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Selected summary */}
                <div className="p-3 rounded-xl bg-[#080f1a] border border-white/10 text-xs text-neutral-400 flex flex-wrap items-center gap-1.5">
                  <span className="font-semibold text-white">Selected ({form.furniture.length}):</span>
                  {form.furniture.length === 0 ? (
                    <span className="italic text-neutral-500">None selected (Unfurnished)</span>
                  ) : (
                    form.furniture.map(f => (
                      <span key={f} className="px-2 py-0.5 rounded-md bg-[#d4a359]/20 border border-[#d4a359]/30 text-[#d4a359] text-[11px] font-medium">
                        {f}
                      </span>
                    ))
                  )}
                </div>
              </div>

              {/* 6. PHOTOS & VIDEOS (SYSTEM UPLOAD & LINK UPLOAD) */}
              <div className="space-y-6 pt-4 border-t border-white/10">
                <h3 className="text-sm font-bold uppercase tracking-wider text-white/90 flex items-center space-x-2 border-b border-white/5 pb-2">
                  <Upload className="w-4 h-4 text-[#d4a359]" />
                  <span>6. Property Photos & Video Walkthrough (System Upload)</span>
                </h3>

                {/* Hidden Native File Inputs */}
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoFilesSelected}
                  className="hidden"
                />
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  multiple
                  onChange={handleVideoFilesSelected}
                  className="hidden"
                />

                {/* Direct File Upload Dropzones */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Photo Dropzone */}
                  <div className="p-5 rounded-2xl border-2 border-dashed border-white/20 hover:border-[#d4a359] bg-[#080f1a] hover:bg-[#d4a359]/5 transition-all text-center space-y-3 flex flex-col items-center justify-center min-h-[160px]">
                    <div className="w-12 h-12 rounded-full bg-[#d4a359]/15 text-[#d4a359] flex items-center justify-center">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-white">Upload Photos from Device</p>
                      <p className="text-xs text-neutral-400">Living room, bedrooms, kitchen, balcony (JPEG, PNG, WebP)</p>
                    </div>
                    <button
                      type="button"
                      disabled={uploadingImage}
                      onClick={() => photoInputRef.current?.click()}
                      className="px-4 py-2 bg-[#d4a359] hover:bg-[#e5b364] text-[#080f1a] text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-md"
                    >
                      {uploadingImage ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Uploading Photos...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5" />
                          <span>Browse Photos from System</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Video Dropzone */}
                  <div className="p-5 rounded-2xl border-2 border-dashed border-white/20 hover:border-sky-400 bg-[#080f1a] hover:bg-sky-500/5 transition-all text-center space-y-3 flex flex-col items-center justify-center min-h-[160px]">
                    <div className="w-12 h-12 rounded-full bg-sky-500/15 text-sky-400 flex items-center justify-center">
                      <Video className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-white">Upload Video Walkthrough</p>
                      <p className="text-xs text-neutral-400">Short walkthrough tour from phone/camera (MP4, MOV, WebM)</p>
                    </div>
                    <button
                      type="button"
                      disabled={uploadingVideo}
                      onClick={() => videoInputRef.current?.click()}
                      className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-md"
                    >
                      {uploadingVideo ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Uploading Video...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5" />
                          <span>Browse Video from System</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {uploadProgressText && (
                  <div className="p-3 rounded-xl bg-[#d4a359]/10 border border-[#d4a359]/30 text-[#d4a359] text-xs flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
                    <span>{uploadProgressText}</span>
                  </div>
                )}

                {/* Uploaded Photos Gallery Preview */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-[#d4a359]" />
                      <span>Uploaded Photos ({form.images.length})</span>
                    </label>
                    {form.images.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, images: [] })}
                        className="text-[11px] text-red-400 hover:underline cursor-pointer"
                      >
                        Remove All Photos
                      </button>
                    )}
                  </div>

                  {form.images.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {form.images.map((img, idx) => (
                        <div key={idx} className="relative group bg-[#080f1a] rounded-xl overflow-hidden border border-white/15 h-28 shadow-md">
                          <img src={img} alt={`Property Photo ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-2">
                            <span className="text-[10px] font-mono text-white/90">Photo #{idx + 1}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(idx)}
                              className="bg-red-600/90 hover:bg-red-600 text-white p-1 rounded-md text-xs cursor-pointer shadow"
                              title="Delete Photo"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(idx)}
                            className="sm:hidden absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full text-xs"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-[#080f1a] border border-white/10 text-center text-xs text-neutral-500">
                      No photos uploaded yet. Use the system upload button above to add photos from your computer or phone.
                    </div>
                  )}
                </div>

                {/* Uploaded Videos Gallery Preview */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                      <Film className="w-3.5 h-3.5 text-sky-400" />
                      <span>Uploaded Video Walkthroughs ({form.videos.length})</span>
                    </label>
                    {form.videos.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, videos: [] })}
                        className="text-[11px] text-red-400 hover:underline cursor-pointer"
                      >
                        Remove All Videos
                      </button>
                    )}
                  </div>

                  {form.videos.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {form.videos.map((vid, idx) => (
                        <div key={idx} className="relative bg-[#080f1a] rounded-xl overflow-hidden border border-white/15 p-2 shadow-md space-y-2">
                          <video 
                            src={vid} 
                            controls 
                            playsInline
                            className="w-full h-36 rounded-lg bg-black object-cover" 
                          />
                          <div className="flex items-center justify-between text-xs px-1">
                            <span className="text-neutral-300 font-mono text-[11px]">Walkthrough #{idx + 1}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveVideo(idx)}
                              className="text-red-400 hover:text-red-300 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Remove</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-[#080f1a] border border-white/10 text-center text-xs text-neutral-500">
                      No walkthrough videos uploaded yet. Videos give properties 4x higher tenant inquiry rates!
                    </div>
                  )}
                </div>

                {/* Alternative URL Link Adder (Collapsible helper) */}
                <details className="bg-[#080f1a] rounded-xl border border-white/10 p-3 text-xs text-neutral-400">
                  <summary className="cursor-pointer font-semibold text-neutral-300 hover:text-white flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5 text-[#d4a359]" />
                    <span>Optional: Add Image or Video by Web URL / Google Drive Link</span>
                  </summary>
                  <div className="mt-3 space-y-3 pt-2 border-t border-white/5">
                    <div className="flex gap-2">
                      <input
                        type="url"
                        placeholder="Paste image link (https://...)"
                        value={form.imageUrlInput}
                        onChange={e => setForm({ ...form, imageUrlInput: e.target.value })}
                        className="flex-1 px-3 py-2 rounded-lg bg-black/40 border border-white/15 text-white text-xs focus:outline-none focus:border-[#d4a359]"
                      />
                      <button
                        type="button"
                        onClick={handleAddImageLink}
                        className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-lg transition-all cursor-pointer"
                      >
                        Add Image Link
                      </button>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="url"
                        placeholder="Paste video link (YouTube, Drive, or MP4 URL)"
                        value={form.videoUrlInput}
                        onChange={e => setForm({ ...form, videoUrlInput: e.target.value })}
                        className="flex-1 px-3 py-2 rounded-lg bg-black/40 border border-white/15 text-white text-xs focus:outline-none focus:border-sky-400"
                      />
                      <button
                        type="button"
                        onClick={handleAddVideoLink}
                        className="px-3 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-lg transition-all cursor-pointer"
                      >
                        Add Video Link
                      </button>
                    </div>
                  </div>
                </details>

                {/* Additional Notes */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    Additional Property Notes / Special Features
                  </label>
                  <textarea
                    rows={3}
                    placeholder="e.g. Newly painted 3 BHK flat on 12th floor with modular kitchen, East facing balcony, close to D-Mart Baner."
                    value={form.notes}
                    onChange={e => setForm({ ...form, notes: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#080f1a] border border-white/15 text-white text-sm focus:outline-none focus:border-[#d4a359] transition-colors"
                  ></textarea>
                </div>
              </div>

              {/* Submit CTA */}
              <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-neutral-400 space-y-0.5">
                  <p className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Free Listing • Verified Tenant Matching • Zero Hidden Costs</span>
                  </p>
                  <p>Our Pune property manager will review and contact you on WhatsApp / Phone.</p>
                </div>

                <button
                  type="submit"
                  disabled={submitting || uploadingImage || uploadingVideo}
                  className="w-full sm:w-auto px-8 py-4 bg-[#d4a359] hover:bg-[#e5b364] active:scale-95 text-[#080f1a] font-serif font-bold text-base rounded-2xl shadow-xl shadow-[#d4a359]/25 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-5 h-5" />
                  <span>{submitting ? 'Submitting Listing...' : 'Submit Property Listing'}</span>
                </button>
              </div>

            </form>
          )}

        </div>

      </div>
    </div>
  );
}

