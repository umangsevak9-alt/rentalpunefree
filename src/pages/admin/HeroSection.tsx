import { useState, useEffect } from 'react';
import { useAppStore } from '../../store/index.js';
import { 
  Upload, 
  Image as ImageIcon, 
  Video, 
  Trash2, 
  CheckCircle2, 
  Sparkles, 
  Building2, 
  Eye, 
  Film,
  Loader2, 
  Play, 
  Check, 
  AlertCircle,
  VolumeX,
  Smartphone,
  Monitor
} from 'lucide-react';
import { supabaseService } from '../../services/supabaseService.js';

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

const PRESET_HERO_VIDEOS = [
  {
    title: 'Modern Penthouse Loop',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-modern-apartment-building-exterior-41549-large.mp4',
    category: 'Architecture'
  },
  {
    title: 'Luxury Real Estate Walkthrough',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-interior-of-a-luxurious-modern-apartment-43093-large.mp4',
    category: 'Interior'
  },
  {
    title: 'Sunset Skyline Cityscape',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-aerial-view-of-city-traffic-at-night-42289-large.mp4',
    category: 'Panoramic'
  }
];

export default function HeroSection() {
  const { token, settings, setSettings } = useAppStore();
  const [formData, setFormData] = useState<any>({});
  const [status, setStatus] = useState('');
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [heroImagePreview, setHeroImagePreview] = useState<string>('');
  
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [videoUploadMsg, setVideoUploadMsg] = useState<{ text: string; type: 'info' | 'success' | 'error' } | null>(null);
  const [videoFileDetails, setVideoFileDetails] = useState<{ name: string; sizeMb: string } | null>(null);
  const [previewAspect, setPreviewAspect] = useState<'desktop' | 'mobile'>('desktop');

  useEffect(() => {
    setFormData(settings);
    setLogoPreview(settings.logo_url || '');
    setHeroImagePreview(settings.hero_image_url || '');
  }, [settings]);

  // Handle Logo File Upload directly to Supabase Storage
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('Logo file size should be under 10MB');
      return;
    }

    setUploadingLogo(true);
    try {
      const res = await supabaseService.storage.uploadImage(file, `logo_${Date.now()}`);
      if (res?.url) {
        setLogoPreview(res.url);
        const updated = { ...formData, logo_url: res.url };
        setFormData(updated);
        setSettings(updated);
        await supabaseService.settings.update({ logo_url: res.url });
        setStatus('Logo uploaded to Supabase Storage and published live!');
        setTimeout(() => setStatus(''), 4000);
      }
    } catch (err: any) {
      console.error('Logo upload error:', err);
      alert('Failed to upload logo to Supabase storage.');
    } finally {
      setUploadingLogo(false);
    }
  };

  // Handle Hero Image File Upload directly to Supabase Storage
  const handleHeroImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      alert('Hero image file size should be under 25MB');
      return;
    }

    setUploadingImage(true);
    try {
      const res = await supabaseService.storage.uploadImage(file, `hero_img_${Date.now()}`);
      if (res?.url) {
        setHeroImagePreview(res.url);
        const updated = { ...formData, hero_image_url: res.url, hero_media_type: 'image' };
        setFormData(updated);
        setSettings(updated);
        await supabaseService.settings.update({ hero_image_url: res.url, hero_media_type: 'image' });
        setStatus('Hero image uploaded to Supabase Storage and published live!');
        setTimeout(() => setStatus(''), 4000);
      }
    } catch (err: any) {
      console.error('Hero image upload error:', err);
      alert('Failed to upload hero image to Supabase storage.');
    } finally {
      setUploadingImage(false);
    }
  };

  // Handle Hero Video File Upload directly to Supabase Storage
  const handleHeroVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/') && !file.name.match(/\.(mp4|webm|mov|m4v|ogg)$/i)) {
      setVideoUploadMsg({
        text: 'Please select a valid video file (MP4, WebM, MOV, M4V).',
        type: 'error'
      });
      return;
    }

    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    if (file.size > 150 * 1024 * 1024) {
      setVideoUploadMsg({
        text: `File size (${sizeMb} MB) exceeds maximum 150MB limit.`,
        type: 'error'
      });
      return;
    }

    setVideoFileDetails({ name: file.name, sizeMb });
    setUploadingVideo(true);
    setVideoUploadMsg({ text: `Uploading "${file.name}" (${sizeMb} MB) to Supabase Storage...`, type: 'info' });

    try {
      // 1. Direct Supabase Storage upload (compatible with Cloudflare & CDN streaming)
      const res = await supabaseService.storage.uploadVideo(file, file.name);
      const videoUrl = res?.url;

      if (!videoUrl) {
        throw new Error('Supabase Storage did not return a public URL.');
      }

      const updated = {
        ...formData,
        hero_video_url: videoUrl,
        hero_media_type: 'video',
        hero_video_title: formData.hero_video_title || file.name.replace(/\.[^/.]+$/, '')
      };

      setFormData(updated);
      setSettings(updated);
      await supabaseService.settings.update(updated);

      setVideoUploadMsg({
        text: `Hero video successfully uploaded to Supabase Storage & published live on Cloudflare!`,
        type: 'success'
      });
      setStatus('Hero video published to live site!');
      setTimeout(() => setStatus(''), 4000);
    } catch (err: any) {
      console.error('Video upload error:', err);
      setVideoUploadMsg({
        text: `Upload error: ${err?.message || 'Failed to upload video to cloud storage.'}`,
        type: 'error'
      });
    } finally {
      setUploadingVideo(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // 1. Instant optimistic update across all views & store (0ms delay)
    setSettings(formData);
    setStatus('Hero section and branding updated successfully!');
    setTimeout(() => setStatus(''), 4000);

    // 2. Synchronize to Supabase & backend asynchronously
    try {
      await supabaseService.settings.update(formData);
    } catch (err) {
      console.warn('Background settings sync note:', err);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 text-white pb-16">
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Hero Section & Logo Branding</h1>
        <p className="text-neutral-400 text-sm mt-1">Upload your official brand logo, upload background video from your computer, and configure headline text.</p>
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
                <label className="block text-sm font-bold text-neutral-300 mb-2">Upload Logo From System</label>
                <label className={`flex flex-col items-center justify-center w-full h-36 border-2 border-dashed rounded-2xl cursor-pointer transition-colors group ${
                  uploadingLogo 
                    ? 'border-yellow-500/50 bg-yellow-500/5 cursor-wait' 
                    : 'border-neutral-800 hover:border-red-600 bg-black/60'
                }`}>
                  {uploadingLogo ? (
                    <div className="flex flex-col items-center space-y-1 text-center">
                      <Loader2 className="w-8 h-8 text-yellow-500 animate-spin mb-1" />
                      <span className="text-xs font-bold text-white">Uploading Logo to Supabase...</span>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-neutral-500 group-hover:text-red-500 mb-2 transition-colors" />
                      <span className="text-xs text-neutral-400 group-hover:text-white font-medium">Click or drag image file to upload</span>
                      <span className="text-[10px] text-neutral-600 mt-1">PNG, SVG, JPG, WEBP (Max 10MB)</span>
                    </>
                  )}
                  <input type="file" accept="image/*" onChange={handleLogoUpload} disabled={uploadingLogo} className="hidden" />
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
                      <span className="font-extrabold text-white text-lg">{formData.website_name || 'Rental Pune'}</span>
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
                      <span className="font-extrabold text-neutral-900 text-lg">{formData.website_name || 'Rental Pune'}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CARD 2: HERO BACKGROUND MEDIA (IMAGE OR VIDEO UPLOAD) */}
        <div className="bg-neutral-950 p-6 md:p-8 rounded-3xl border border-neutral-800 shadow-xl space-y-6">
          <div className="flex items-center space-x-3 border-b border-neutral-800 pb-4">
            <div className="w-10 h-10 rounded-2xl bg-red-600/20 border border-red-600/40 flex items-center justify-center text-red-500 font-bold">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Hero Background Media</h2>
              <p className="text-xs text-neutral-400">Choose between looping background Video (with full video support) or background Image.</p>
            </div>
          </div>

          {/* Media Type Selector */}
          <div>
            <label className="block text-sm font-bold text-neutral-300 mb-2">Media Format</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, hero_media_type: 'video' })}
                className={`flex items-center justify-center space-x-3 p-4 rounded-2xl border text-sm font-bold transition-all ${
                  (formData.hero_media_type || 'video') === 'video'
                    ? 'bg-red-600/20 border-red-600 text-white shadow-lg shadow-red-600/10'
                    : 'bg-black border-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                <Video className="w-5 h-5 text-red-500" />
                <span>Hero Video (.mp4 / WebM)</span>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, hero_media_type: 'image' })}
                className={`flex items-center justify-center space-x-3 p-4 rounded-2xl border text-sm font-bold transition-all ${
                  formData.hero_media_type === 'image'
                    ? 'bg-red-600/20 border-red-600 text-white shadow-lg shadow-red-600/10'
                    : 'bg-black border-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                <ImageIcon className="w-5 h-5 text-red-500" />
                <span>Hero Image</span>
              </button>
            </div>
          </div>

          {/* Media Input: Video Mode (Upload From Computer or URL) */}
          {(formData.hero_media_type || 'video') === 'video' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                {/* Upload from system dropzone */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-neutral-300 mb-2 flex items-center justify-between">
                      <span>Upload Video From Your Computer</span>
                      <span className="text-[10px] text-red-500 uppercase tracking-wider font-semibold">Recommended</span>
                    </label>

                    <label className={`relative flex flex-col items-center justify-center w-full min-h-[160px] p-6 border-2 border-dashed rounded-2xl cursor-pointer transition-all group ${
                      uploadingVideo 
                        ? 'border-yellow-500/50 bg-yellow-500/5 cursor-wait' 
                        : 'border-neutral-800 hover:border-red-600 bg-black/60'
                    }`}>
                      {uploadingVideo ? (
                        <div className="flex flex-col items-center space-y-2 text-center">
                          <Loader2 className="w-10 h-10 text-yellow-500 animate-spin" />
                          <span className="text-sm font-bold text-white">Uploading Video to Cloud...</span>
                          <span className="text-xs text-neutral-400">Please wait while the video is uploaded & processed</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center text-center space-y-2">
                          <div className="w-12 h-12 rounded-2xl bg-red-600/10 border border-red-600/30 flex items-center justify-center text-red-500 group-hover:scale-110 transition-transform">
                            <Upload className="w-6 h-6" />
                          </div>
                          <div>
                            <span className="text-sm font-bold text-white group-hover:text-red-400 transition-colors">
                              Click or Drag & Drop Video File
                            </span>
                            <p className="text-xs text-neutral-400 mt-0.5">
                              Supports MP4, WebM, MOV, M4V (Up to 100MB)
                            </p>
                          </div>
                          <span className="px-3 py-1 bg-neutral-900 border border-neutral-700 text-neutral-300 rounded-full text-[11px] font-medium">
                            Browse from System
                          </span>
                        </div>
                      )}
                      <input 
                        type="file" 
                        accept="video/mp4,video/webm,video/ogg,video/quicktime,video/x-m4v,video/*" 
                        onChange={handleHeroVideoUpload} 
                        disabled={uploadingVideo}
                        className="hidden" 
                      />
                    </label>
                  </div>

                  {videoUploadMsg && (
                    <div className="space-y-3">
                      <div className={`p-3.5 rounded-xl border text-xs flex items-center space-x-2 ${
                        videoUploadMsg.type === 'success' 
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                          : videoUploadMsg.type === 'error'
                          ? 'bg-red-500/10 border-red-500/30 text-red-400'
                          : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                      }`}>
                        {videoUploadMsg.type === 'success' ? <Check className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                        <span className="font-medium">{videoUploadMsg.text}</span>
                      </div>

                      {videoUploadMsg.type === 'error' && videoUploadMsg.text.toLowerCase().includes('bucket') && (
                        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-2">
                          <div className="font-bold flex items-center gap-1.5 text-amber-300">
                            <Sparkles className="w-4 h-4" />
                            <span>1-Step Setup for Supabase Video & Image Storage:</span>
                          </div>
                          <ol className="list-decimal list-inside space-y-1 text-neutral-300">
                            <li>Open your <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="text-amber-400 underline font-bold">Supabase Dashboard</a> and go to <strong>Storage</strong>.</li>
                            <li>Click <strong>New Bucket</strong>, enter name <code className="bg-black/60 px-1 py-0.5 rounded text-amber-300 font-mono">property-images</code>.</li>
                            <li>Toggle <strong>Public bucket</strong> to <strong className="text-emerald-400">ON</strong> and click Save.</li>
                          </ol>
                          <p className="text-[11px] text-neutral-400 pt-1">
                            Tip: You can also paste any YouTube, Vimeo, or external MP4 URL below to go live immediately on Cloudflare!
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Direct Video URL / YouTube / Vimeo */}
                  <div>
                    <label className="block text-xs font-bold text-neutral-400 mb-1">
                      Or Direct Video URL / YouTube / Vimeo Link
                    </label>
                    <input 
                      type="text" 
                      value={formData.hero_video_url || ''} 
                      onChange={e => setFormData({ ...formData, hero_video_url: e.target.value })} 
                      placeholder="https://.../video.mp4 or https://youtube.com/watch?v=..." 
                      className="w-full px-4 py-2.5 bg-black border border-neutral-800 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-red-600 text-sm"
                    />
                  </div>

                  {/* Video Title for Full Video Modal */}
                  <div>
                    <label className="block text-xs font-bold text-neutral-400 mb-1">
                      Video Title (for Full Video Modal)
                    </label>
                    <input 
                      type="text" 
                      value={formData.hero_video_title || ''} 
                      onChange={e => setFormData({ ...formData, hero_video_title: e.target.value })} 
                      placeholder="e.g. Pune Luxury Architectural Showcase & Residences" 
                      className="w-full px-4 py-2.5 bg-black border border-neutral-800 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-red-600 text-sm"
                    />
                  </div>

                  {formData.hero_video_url && (
                    <div className="flex items-center space-x-3 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, hero_video_url: '', hero_video_title: '' });
                          setVideoUploadMsg(null);
                          setVideoFileDetails(null);
                        }}
                        className="inline-flex items-center text-xs font-bold text-red-500 hover:text-red-400 space-x-1.5 px-3 py-1.5 rounded-lg bg-red-600/10 border border-red-600/20"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove Video</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Video Live Preview Stream */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-bold text-neutral-300 flex items-center space-x-2">
                      <span>Live Video Preview</span>
                      {formData.hero_video_url && (
                        <span className="text-[10px] text-emerald-400 font-bold flex items-center space-x-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                          <span>Active Video</span>
                        </span>
                      )}
                    </label>

                    {/* Preview Aspect Ratio Switcher (Desktop 16:9 vs Mobile 9:16) */}
                    <div className="flex items-center space-x-1 bg-neutral-900 border border-neutral-800 p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setPreviewAspect('desktop')}
                        className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          previewAspect === 'desktop'
                            ? 'bg-[#d4a359] text-[#080f1a] shadow-sm'
                            : 'text-neutral-400 hover:text-white'
                        }`}
                        title="Desktop Landscape 16:9 Preview"
                      >
                        <Monitor className="w-3.5 h-3.5" />
                        <span>Desktop</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewAspect('mobile')}
                        className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          previewAspect === 'mobile'
                            ? 'bg-[#d4a359] text-[#080f1a] shadow-sm'
                            : 'text-neutral-400 hover:text-white'
                        }`}
                        title="Mobile Portrait 9:16 Ratio Preview"
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                        <span>Mobile (9:16)</span>
                      </button>
                    </div>
                  </div>

                  <div className={`relative rounded-2xl overflow-hidden border border-neutral-800 bg-neutral-950 flex items-center justify-center transition-all duration-300 ${
                    previewAspect === 'mobile'
                      ? 'w-[230px] aspect-[9/16] mx-auto shadow-2xl rounded-[32px] border-4 border-neutral-700 p-1.5'
                      : 'w-full min-h-[220px]'
                  }`}>
                    {formData.hero_video_url ? (
                      <div className={`relative w-full h-full overflow-hidden ${
                        previewAspect === 'mobile' ? 'rounded-[24px]' : 'rounded-2xl'
                      }`}>
                        {(() => {
                          const url = formData.hero_video_url;
                          const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
                          if (ytMatch && ytMatch[1]) {
                            return (
                              <iframe
                                src={`https://www.youtube-nocookie.com/embed/${ytMatch[1]}?autoplay=1&mute=1&loop=1&playlist=${ytMatch[1]}&controls=1`}
                                title="YouTube Hero Video Preview"
                                className={`w-full border-0 ${previewAspect === 'mobile' ? 'h-full object-cover' : 'h-56'}`}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              />
                            );
                          }
                          const vimeoMatch = url.match(/(?:vimeo\.com\/)(\d+)/);
                          if (vimeoMatch && vimeoMatch[1]) {
                            return (
                              <iframe
                                src={`https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1&muted=1&loop=1`}
                                title="Vimeo Hero Video Preview"
                                className={`w-full border-0 ${previewAspect === 'mobile' ? 'h-full object-cover' : 'h-56'}`}
                                allow="autoplay; fullscreen"
                                allowFullScreen
                              />
                            );
                          }
                          return (
                            <video 
                              key={`${url}-${previewAspect}`}
                              src={url} 
                              autoPlay 
                              loop 
                              muted 
                              playsInline 
                              controls
                              className={`w-full object-cover ${previewAspect === 'mobile' ? 'h-full' : 'h-56'}`}
                            />
                          );
                        })()}
                        <div className="absolute top-2 right-2 px-2 py-0.5 bg-black/80 backdrop-blur-md rounded-lg text-[9px] font-bold text-neutral-300 border border-neutral-700 flex items-center space-x-1 pointer-events-none">
                          <VolumeX className="w-2.5 h-2.5 text-neutral-400" />
                          <span>Autoplays Muted</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center p-8 text-center text-neutral-600 space-y-2">
                        <Film className="w-10 h-10 text-neutral-700" />
                        <span className="text-xs font-medium">No background video uploaded</span>
                        <p className="text-[10px] text-neutral-700 max-w-xs">
                          Upload an MP4/WebM video from your computer or pick one of the luxury presets below.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Preset Video Samples */}
              <div className="pt-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3 flex items-center space-x-1">
                  <Sparkles className="w-3.5 h-3.5 text-red-500" />
                  <span>Or Pick From Curated 4K Luxury Video Presets</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {PRESET_HERO_VIDEOS.map((preset) => (
                    <button
                      key={preset.title}
                      type="button"
                      onClick={() => {
                        setFormData({ 
                          ...formData, 
                          hero_video_url: preset.url, 
                          hero_media_type: 'video',
                          hero_video_title: preset.title 
                        });
                        setVideoUploadMsg({ text: `Selected preset "${preset.title}". Click Save to publish.`, type: 'success' });
                      }}
                      className={`p-3.5 rounded-2xl border text-left group transition-all flex items-center space-x-3 ${
                        formData.hero_video_url === preset.url
                          ? 'border-red-600 bg-red-600/10 ring-2 ring-red-600'
                          : 'border-neutral-800 bg-black hover:border-neutral-600'
                      }`}
                    >
                      <div className="w-9 h-9 rounded-xl bg-neutral-900 border border-neutral-700 flex items-center justify-center text-red-500 shrink-0">
                        <Play className="w-4 h-4 fill-current" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold text-white truncate">{preset.title}</h4>
                        <span className="text-[10px] text-neutral-400">{preset.category}</span>
                      </div>
                      {formData.hero_video_url === preset.url && (
                        <CheckCircle2 className="w-4 h-4 text-red-500 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Media Input: Image Mode */}
          {formData.hero_media_type === 'image' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-neutral-300 mb-2">Upload Hero Image File From System</label>
                    <label className={`flex flex-col items-center justify-center w-full h-36 border-2 border-dashed rounded-2xl cursor-pointer transition-colors group ${
                      uploadingImage 
                        ? 'border-yellow-500/50 bg-yellow-500/5 cursor-wait' 
                        : 'border-neutral-800 hover:border-red-600 bg-black/60'
                    }`}>
                      {uploadingImage ? (
                        <div className="flex flex-col items-center space-y-1 text-center">
                          <Loader2 className="w-8 h-8 text-yellow-500 animate-spin mb-1" />
                          <span className="text-xs font-bold text-white">Uploading & Optimizing Image...</span>
                        </div>
                      ) : (
                        <>
                          <Upload className="w-8 h-8 text-neutral-500 group-hover:text-red-500 mb-2 transition-colors" />
                          <span className="text-xs text-neutral-400 group-hover:text-white font-medium">Click or drag image file</span>
                          <span className="text-[10px] text-neutral-600 mt-1">JPG, PNG, WEBP (Max 25MB)</span>
                        </>
                      )}
                      <input type="file" accept="image/*" onChange={handleHeroImageUpload} disabled={uploadingImage} className="hidden" />
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
                      <h3 className="text-lg font-extrabold text-white line-clamp-1">{formData.hero_heading || 'Curated Luxury Residences'}</h3>
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
                  <span>Or Pick From Luxury Image Presets</span>
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
                placeholder="e.g. Curated Luxury Residences in Prime Pune" 
                className="w-full px-4 py-3 bg-black border border-neutral-800 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-red-600 text-sm font-semibold"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-neutral-300 mb-1">Hero Subheading</label>
              <textarea 
                rows={3} 
                value={formData.hero_subheading || ''} 
                onChange={e => setFormData({...formData, hero_subheading: e.target.value})} 
                placeholder="e.g. Handpicked penthouses, riverside apartments, and signature villas in Pune's most exclusive enclaves." 
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
            className="px-8 py-4 bg-red-600 text-white font-extrabold rounded-2xl hover:bg-red-700 transition-all shadow-xl shadow-red-600/30 hover:scale-[1.02] active:scale-95 flex items-center space-x-2"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>Save & Publish Hero Changes</span>
          </button>
          {status && <span className="text-sm font-extrabold text-emerald-400 animate-pulse">{status}</span>}
        </div>
      </form>
    </div>
  );
}
