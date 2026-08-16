import React, { useState } from 'react';
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
  MapPin
} from 'lucide-react';
import { useAppStore } from '../../store/index.js';
import { getWhatsAppUrl } from '../../utils/whatsapp.js';

export default function ListProperty() {
  const { settings } = useAppStore();
  const whatsAppUrl = getWhatsAppUrl(settings);

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
    available_from: '',
    preferred_tenants: 'Any',
    amenities: [] as string[],
    imageUrlInput: '',
    images: [] as string[],
    notes: ''
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

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

  const handleAmenityToggle = (amenity: string) => {
    if (form.amenities.includes(amenity)) {
      setForm({ ...form, amenities: form.amenities.filter(a => a !== amenity) });
    } else {
      setForm({ ...form, amenities: [...form.amenities, amenity] });
    }
  };

  const handleAddImage = () => {
    if (form.imageUrlInput.trim()) {
      setForm({
        ...form,
        images: [...form.images, form.imageUrlInput.trim()],
        imageUrlInput: ''
      });
    }
  };

  const handleRemoveImage = (index: number) => {
    setForm({
      ...form,
      images: form.images.filter((_, i) => i !== index)
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.owner_name || !form.owner_phone || !form.property_title || !form.location) {
      setErrorMsg('Please fill in your Name, Phone Number, Property Title, and Location.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/owner-submissions', {
        method: 'POST',
        headers: { 'Content-[#d4a359]': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit property listing');
      }

      setSubmitted(true);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
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
                      available_from: '',
                      preferred_tenants: 'Any',
                      amenities: [],
                      imageUrlInput: '',
                      images: [],
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
                      Preferred Tenants
                    </label>
                    <select
                      value={form.preferred_tenants}
                      onChange={e => setForm({ ...form, preferred_tenants: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#080f1a] border border-white/15 text-white text-sm focus:outline-none focus:border-[#d4a359] transition-colors cursor-pointer"
                    >
                      {['Any (Family or Bachelors)', 'Family Only', 'Working IT Professionals', 'Company Lease Only'].map(p => (
                        <option key={p} value={p} className="bg-[#080f1a] text-white">
                          {p}
                        </option>
                      ))}
                    </select>
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

              {/* 4. AMENITIES & PHOTOS */}
              <div className="space-y-4 pt-4 border-t border-white/10">
                <h3 className="text-sm font-bold uppercase tracking-wider text-white/90 flex items-center space-x-2 border-b border-white/5 pb-2">
                  <Sparkles className="w-4 h-4 text-[#d4a359]" />
                  <span>4. Key Amenities & Property Photos</span>
                </h3>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-2">
                    Select Available Amenities:
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

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    Photo URLs (Optional - Add image links or Google Drive links)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="Paste image URL (https://...)"
                      value={form.imageUrlInput}
                      onChange={e => setForm({ ...form, imageUrlInput: e.target.value })}
                      className="flex-1 px-4 py-2.5 rounded-xl bg-[#080f1a] border border-white/15 text-white text-sm focus:outline-none focus:border-[#d4a359]"
                    />
                    <button
                      type="button"
                      onClick={handleAddImage}
                      className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
                    >
                      Add Photo
                    </button>
                  </div>

                  {form.images.length > 0 && (
                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {form.images.map((img, idx) => (
                        <div key={idx} className="relative group bg-[#080f1a] rounded-lg overflow-hidden border border-white/10 h-20">
                          <img src={img} alt="Property" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(idx)}
                            className="absolute top-1 right-1 bg-black/80 text-white text-xs p-1 rounded-full hover:bg-red-600 transition-colors"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

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
                  disabled={submitting}
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
