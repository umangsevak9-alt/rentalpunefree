import { useState, useEffect } from 'react';
import { useAppStore } from '../../store/index.js';
import { Upload, Image as ImageIcon, Video, Trash2, CheckCircle2, Sparkles, Building2, Eye } from 'lucide-react';

const PRESET_HERO_IMAGES = [
  {
    title: 'Beverly Hills Villa',
    url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1920&q=80'
  },
  {
    title: 'Modern Architecture',
    url: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1920&q=80'
  },
  {
    title: 'Glass Penthouse Sunset',
    url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1920&q=80'
  },
  {
    title: 'Luxury Estate Pool',
    url: 'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1920&q=80'
  }
];

export default function HeroSection() {
  const { token, settings, setSettings } = useAppStore();
  const [formData, setFormData] = useState<any>({});
  const [status, setStatus] = useState('');
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [heroImagePreview, setHeroImagePreview] = useState<string>('');

  useEffect(() => {
    setFormData(settings);
    setLogoPreview(settings.logo_url || '');
    setHeroImagePreview(settings.hero_image_url || '');
  }, [settings]);

  // Handle Logo File Upload
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 3 * 1024 * 1024) {
        alert('File size should be under 3MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setLogoPreview(base64);
        setFormData((prev: any) => ({ ...prev, logo_url: base64 }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle Hero Image File Upload
  const handleHeroImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Image file size should be under 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setHeroImagePreview(base64);
        setFormData((prev: any) => ({ ...prev, hero_image_url: base64 }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('Saving...');
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setSettings(formData);
        setStatus('Hero section and branding updated successfully!');
        setTimeout(() => setStatus(''), 4000);
      } else {
        setStatus('Failed to update settings.');
      }
    } catch (err) {
      setStatus('Failed to update settings.');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 text-white">
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Hero Section & Logo Branding</h1>
        <p className="text-neutral-400 text-sm mt-1">Upload your official brand logo, configure hero media (image/video), and customize headline text.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* CARD 1: WEBSITE LOGO UPLOAD */}
        <div className="bg-neutral-950 p-6 md:p-8 rounded-3xl border border-neutral-800 shadow-xl space-y-6">
          <div className="flex items-center space-x-3 border-b border-neutral-800 pb-4">
            <div className="w-10 h-10 rounded-2xl bg-red-600/20 border border-red-600/40 flex items-center justify-center text-red-500 font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Website Logo</h2>
              <p className="text-xs text-neutral-400">Upload your logo to appear in the top header and footer navigation.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* Upload Controls */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-neutral-300 mb-2">Upload Logo File</label>
                <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-neutral-800 hover:border-red-600 rounded-2xl cursor-pointer bg-black/60 transition-colors group">
                  <Upload className="w-8 h-8 text-neutral-500 group-hover:text-red-500 mb-2 transition-colors" />
                  <span className="text-xs text-neutral-400 group-hover:text-white font-medium">Click or drag image file to upload</span>
                  <span className="text-[10px] text-neutral-600 mt-1">PNG, SVG, JPG, WEBP (Max 3MB)</span>
                  <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-400 mb-1">Or Paste Logo Image URL</label>
                <input 
                  type="text" 
                  value={formData.logo_url || ''} 
                  onChange={e => {
                    setFormData({...formData, logo_url: e.target.value});
                    setLogoPreview(e.target.value);
                  }} 
                  placeholder="https://..." 
                  className="w-full px-4 py-2.5 bg-black border border-neutral-800 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-red-600 text-sm"
                />
              </div>

              {formData.logo_url && (
                <button
                  type="button"
                  onClick={() => {
                    setFormData({...formData, logo_url: ''});
                    setLogoPreview('');
                  }}
                  className="inline-flex items-center text-xs font-bold text-red-500 hover:text-red-400 space-x-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove Uploaded Logo</span>
                </button>
              )}
            </div>

            {/* Logo Preview Box */}
            <div>
              <label className="block text-sm font-bold text-neutral-300 mb-2">Logo Live Preview</label>
              <div className="space-y-3">
                <div className="p-6 rounded-2xl bg-black border border-neutral-800 flex items-center justify-center h-28 relative">
                  <span className="absolute top-2 left-3 text-[10px] uppercase font-bold text-neutral-600">Dark Mode Header Preview</span>
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo Preview" className="max-h-14 max-w-[200px] object-contain" />
                  ) : (
                    <div className="flex items-center space-x-2 text-neutral-600">
                      <Building2 className="w-6 h-6 text-red-600" />
                      <span className="font-extrabold text-white text-lg">{formData.website_name || 'Serene Estates'}</span>
                    </div>
                  )}
                </div>

                <div className="p-6 rounded-2xl bg-white border border-neutral-300 flex items-center justify-center h-28 relative text-neutral-900">
                  <span className="absolute top-2 left-3 text-[10px] uppercase font-bold text-neutral-400">Light Mode Background</span>
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo Preview" className="max-h-14 max-w-[200px] object-contain" />
                  ) : (
                    <div className="flex items-center space-x-2 text-neutral-400">
                      <Building2 className="w-6 h-6 text-red-600" />
                      <span className="font-extrabold text-neutral-900 text-lg">{formData.website_name || 'Serene Estates'}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CARD 2: HERO BACKGROUND MEDIA */}
        <div className="bg-neutral-950 p-6 md:p-8 rounded-3xl border border-neutral-800 shadow-xl space-y-6">
          <div className="flex items-center space-x-3 border-b border-neutral-800 pb-4">
            <div className="w-10 h-10 rounded-2xl bg-red-600/20 border border-red-600/40 flex items-center justify-center text-red-500 font-bold">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Hero Background Media</h2>
              <p className="text-xs text-neutral-400">Select whether to display a background Image or Background Video in your landing page hero.</p>
            </div>
          </div>

          {/* Media Type Selector */}
          <div>
            <label className="block text-sm font-bold text-neutral-300 mb-2">Media Format</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, hero_media_type: 'image' })}
                className={`flex items-center justify-center space-x-3 p-4 rounded-2xl border text-sm font-bold transition-all ${
                  (formData.hero_media_type || 'image') === 'image'
                    ? 'bg-red-600/20 border-red-600 text-white shadow-lg'
                    : 'bg-black border-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                <ImageIcon className="w-5 h-5 text-red-500" />
                <span>Hero Image</span>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, hero_media_type: 'video' })}
                className={`flex items-center justify-center space-x-3 p-4 rounded-2xl border text-sm font-bold transition-all ${
                  formData.hero_media_type === 'video'
                    ? 'bg-red-600/20 border-red-600 text-white shadow-lg'
                    : 'bg-black border-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                <Video className="w-5 h-5 text-red-500" />
                <span>Hero Video (.mp4)</span>
              </button>
            </div>
          </div>

          {/* Media Input: Image Mode */}
          {(formData.hero_media_type || 'image') === 'image' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-neutral-300 mb-2">Upload Hero Image File</label>
                    <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-neutral-800 hover:border-red-600 rounded-2xl cursor-pointer bg-black/60 transition-colors group">
                      <Upload className="w-8 h-8 text-neutral-500 group-hover:text-red-500 mb-2 transition-colors" />
                      <span className="text-xs text-neutral-400 group-hover:text-white font-medium">Click or drag image file</span>
                      <span className="text-[10px] text-neutral-600 mt-1">JPG, PNG, WEBP (Max 5MB)</span>
                      <input type="file" accept="image/*" onChange={handleHeroImageUpload} className="hidden" />
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-400 mb-1">Or Direct Hero Image URL</label>
                    <input 
                      type="text" 
                      value={formData.hero_image_url || ''} 
                      onChange={e => {
                        setFormData({...formData, hero_image_url: e.target.value});
                        setHeroImagePreview(e.target.value);
                      }} 
                      placeholder="https://..." 
                      className="w-full px-4 py-2.5 bg-black border border-neutral-800 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-red-600 text-sm"
                    />
                  </div>
                </div>

                {/* Hero Image Live Mockup */}
                <div>
                  <label className="block text-sm font-bold text-neutral-300 mb-2">Hero Mockup Preview</label>
                  <div className="relative h-48 rounded-2xl overflow-hidden border border-neutral-800 bg-black flex items-center justify-center text-center p-4">
                    {heroImagePreview || formData.hero_image_url ? (
                      <img src={heroImagePreview || formData.hero_image_url} alt="Hero Mockup" className="absolute inset-0 w-full h-full object-cover opacity-50" />
                    ) : (
                      <div className="text-neutral-600 text-xs">No image selected</div>
                    )}
                    <div className="relative z-10 max-w-xs">
                      <h3 className="text-lg font-extrabold text-white line-clamp-1">{formData.hero_heading || 'Discover Your Dream Home'}</h3>
                      <p className="text-[10px] text-neutral-300 mt-1 line-clamp-2">{formData.hero_subheading}</p>
                      <span className="inline-block mt-3 px-3 py-1 bg-red-600 text-white rounded-full text-[10px] font-bold">
                        {formData.hero_cta_text || 'Explore Properties'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Curated Preset Background Images */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3 flex items-center space-x-1">
                  <Sparkles className="w-3.5 h-3.5 text-red-500" />
                  <span>Or Pick From Luxury Presets</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {PRESET_HERO_IMAGES.map((preset) => (
                    <button
                      key={preset.title}
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, hero_image_url: preset.url, hero_media_type: 'image' });
                        setHeroImagePreview(preset.url);
                      }}
                      className={`relative rounded-xl overflow-hidden h-24 border text-left group transition-all ${
                        formData.hero_image_url === preset.url
                          ? 'border-red-600 ring-2 ring-red-600'
                          : 'border-neutral-800 hover:border-neutral-600'
                      }`}
                    >
                      <img src={preset.url} alt={preset.title} className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent p-2 flex flex-col justify-end">
                        <span className="text-[10px] font-bold text-white truncate">{preset.title}</span>
                      </div>
                      {formData.hero_image_url === preset.url && (
                        <CheckCircle2 className="w-4 h-4 text-red-500 absolute top-2 right-2 bg-black rounded-full" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Media Input: Video Mode */}
          {formData.hero_media_type === 'video' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-neutral-300 mb-1">Hero Video URL (.mp4 format)</label>
                <input 
                  type="text" 
                  value={formData.hero_video_url || ''} 
                  onChange={e => setFormData({...formData, hero_video_url: e.target.value})} 
                  placeholder="https://assets.mixkit.co/videos/preview/mixkit-modern-apartment-building-exterior-41549-large.mp4" 
                  className="w-full px-4 py-3 bg-black border border-neutral-800 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-red-600 text-sm"
                />
              </div>

              {formData.hero_video_url && (
                <div>
                  <label className="block text-xs font-bold text-neutral-400 mb-2">Video Stream Preview</label>
                  <div className="rounded-2xl overflow-hidden border border-neutral-800 max-h-56 bg-black">
                    <video 
                      src={formData.hero_video_url} 
                      autoPlay 
                      loop 
                      muted 
                      playsInline 
                      className="w-full h-56 object-cover opacity-80"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* CARD 3: HERO TEXT & CTA CONFIGURATION */}
        <div className="bg-neutral-950 p-6 md:p-8 rounded-3xl border border-neutral-800 shadow-xl space-y-6">
          <div className="flex items-center space-x-3 border-b border-neutral-800 pb-4">
            <div className="w-10 h-10 rounded-2xl bg-red-600/20 border border-red-600/40 flex items-center justify-center text-red-500 font-bold">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Hero Section Headlines & CTA</h2>
              <p className="text-xs text-neutral-400">Customize the main hero title, subtitle, and primary call-to-action button text.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-neutral-300 mb-1">Main Hero Title</label>
              <input 
                type="text" 
                value={formData.hero_heading || ''} 
                onChange={e => setFormData({...formData, hero_heading: e.target.value})} 
                placeholder="e.g. Discover Your Dream Home" 
                className="w-full px-4 py-3 bg-black border border-neutral-800 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-red-600 text-sm font-semibold"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-neutral-300 mb-1">Hero Subheading</label>
              <textarea 
                rows={3} 
                value={formData.hero_subheading || ''} 
                onChange={e => setFormData({...formData, hero_subheading: e.target.value})} 
                placeholder="e.g. Experience luxury living with our premium real estate properties." 
                className="w-full px-4 py-3 bg-black border border-neutral-800 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-red-600 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-neutral-300 mb-1">Call To Action Button Label</label>
              <input 
                type="text" 
                value={formData.hero_cta_text || ''} 
                onChange={e => setFormData({...formData, hero_cta_text: e.target.value})} 
                placeholder="e.g. Explore Properties" 
                className="w-full px-4 py-3 bg-black border border-neutral-800 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-red-600 text-sm"
              />
            </div>
          </div>
        </div>

        {/* SAVE & SUBMIT ACTION BUTTON */}
        <div className="flex items-center space-x-4 pt-2">
          <button 
            type="submit" 
            className="px-8 py-4 bg-red-600 text-white font-extrabold rounded-2xl hover:bg-red-700 transition-all shadow-xl shadow-red-600/30 hover:scale-[1.02] active:scale-95"
          >
            Save & Publish Hero Changes
          </button>
          {status && <span className="text-sm font-extrabold text-red-500 animate-pulse">{status}</span>}
        </div>
      </form>
    </div>
  );
}
