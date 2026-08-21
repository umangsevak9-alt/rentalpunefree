import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../../store/index.js';
import { supabaseService } from '../../services/supabaseService.js';
import { GalleryItem } from '../../types.js';
import {
  Image as ImageIcon,
  Plus,
  Trash2,
  Edit2,
  ArrowUp,
  ArrowDown,
  Upload,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Eye,
  RefreshCw,
  Sliders,
  Layers,
  Save,
  Check,
  Building,
  Star,
  Compass,
  FileImage,
  X
} from 'lucide-react';

const LUXURY_PRESETS = [
  {
    title: 'Tower Exterior & Pool Promenade',
    category: 'Grand Architecture',
    url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1600&q=85',
    description: 'International standard tower facade with manicured landscaped deck and infinity pool promenade view.'
  },
  {
    title: 'Infinity Edge Swimming Pool',
    category: 'Lifestyle',
    url: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1600&q=85',
    description: 'Temperature-controlled infinity lap pool with luxury sun loungers and panoramic sky view.'
  },
  {
    title: 'Grand Living & Dining Hall',
    category: 'Interiors',
    url: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1600&q=85',
    description: 'Double-height Italian marble living room with designer chandeliers and floor-to-ceiling glass.'
  },
  {
    title: 'Presidential Master Bedroom',
    category: 'Suites',
    url: 'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&w=1600&q=85',
    description: 'Spacious master suite featuring wooden flooring, walk-in closet, and private sunset deck.'
  },
  {
    title: 'Executive Clubhouse & Lounge',
    category: 'Amenities',
    url: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1600&q=85',
    description: 'Private resident lounge, business center, and meeting suites for community networking.'
  },
  {
    title: 'High-Tech Fitness Gymnasium',
    category: 'Wellness',
    url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1600&q=85',
    description: 'State-of-the-art cardio and weight training equipment with dedicated yoga studio.'
  },
  {
    title: 'Sky Deck & Sunset Lounge',
    category: 'Lifestyle',
    url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1600&q=85',
    description: 'Breathtaking 360-degree rooftop deck with ambient lighting and private stargazing cabanas.'
  },
  {
    title: 'Landscaped Central Boulevard',
    category: 'Grand Architecture',
    url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=85',
    description: 'Tree-lined cobblestone pathways, dancing fountains, and tranquil Zen meditation groves.'
  }
];

const CATEGORIES = [
  'All',
  'Grand Architecture',
  'Lifestyle',
  'Interiors',
  'Suites',
  'Amenities',
  'Wellness',
  'Clubhouse'
];

export default function Gallery() {
  const { settings, setSettings } = useAppStore();
  const [activeTab, setActiveTab] = useState<'gallery' | 'about'>('gallery');
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  // Status notifications
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  
  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<GalleryItem | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Form states for Add/Edit Gallery item
  const [itemForm, setItemForm] = useState({
    title: '',
    category: 'Grand Architecture',
    image_url: '',
    description: '',
    sort_order: 1,
    is_active: 1
  });
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadPercent, setUploadPercent] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state for Tab 2 ("Redefining Luxury" About Section)
  const [aboutForm, setAboutForm] = useState({
    about_luxury_image_url: '',
    about_luxury_badge_number: '35+',
    about_luxury_badge_text: 'Luxury Amenities & Services',
    about_luxury_eyebrow: 'ABOUT THE PROJECT',
    about_luxury_heading: 'Redefining Luxury in Every Detail',
    about_luxury_tagline: 'Rental Pune is a premium residential development that brings together elegant architecture, world-class amenities and a prime location to offer an unmatched lifestyle.',
    about_luxury_point1_title: 'Architectural Excellence',
    about_luxury_point1_desc: 'International standard designs',
    about_luxury_point2_title: 'Spacious Residences',
    about_luxury_point2_desc: 'Airy layouts with private decks',
    about_luxury_point3_title: 'Green & Open Spaces',
    about_luxury_point3_desc: '70% open landscaped parks',
    about_luxury_point4_title: '24/7 Security & Safety',
    about_luxury_point4_desc: 'Multi-tier smart surveillance',
    about_stat1_number: '3.5',
    about_stat1_label: 'Acres of Land',
    about_stat2_number: '4',
    about_stat2_label: 'Towers',
    about_stat3_number: '25+',
    about_stat3_label: 'Lifestyle Amenities',
    about_stat4_number: '500+',
    about_stat4_label: 'Happy Families'
  });
  const [isSavingAbout, setIsSavingAbout] = useState(false);
  const [aboutImageUploading, setAboutImageUploading] = useState(false);
  const aboutFileRef = useRef<HTMLInputElement>(null);

  // Load Gallery Items
  const loadGallery = async () => {
    setLoading(true);
    try {
      const items = await supabaseService.gallery.getAll();
      setGalleryItems(items || []);
    } catch (err: any) {
      console.error('Error fetching gallery:', err);
      showStatus('Failed to load gallery items', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGallery();
  }, []);

  // Initialize About Form from Store Settings
  useEffect(() => {
    if (settings) {
      setAboutForm({
        about_luxury_image_url: settings.about_luxury_image_url || 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=85',
        about_luxury_badge_number: settings.about_luxury_badge_number || '35+',
        about_luxury_badge_text: settings.about_luxury_badge_text || 'Luxury Amenities & Services',
        about_luxury_eyebrow: settings.about_luxury_eyebrow || 'ABOUT THE PROJECT',
        about_luxury_heading: settings.about_luxury_heading || 'Redefining Luxury in Every Detail',
        about_luxury_tagline: settings.about_luxury_tagline || 'Rental Pune is a premium residential development that brings together elegant architecture, world-class amenities and a prime location to offer an unmatched lifestyle.',
        about_luxury_point1_title: settings.about_luxury_point1_title || 'Architectural Excellence',
        about_luxury_point1_desc: settings.about_luxury_point1_desc || 'International standard designs',
        about_luxury_point2_title: settings.about_luxury_point2_title || 'Spacious Residences',
        about_luxury_point2_desc: settings.about_luxury_point2_desc || 'Airy layouts with private decks',
        about_luxury_point3_title: settings.about_luxury_point3_title || 'Green & Open Spaces',
        about_luxury_point3_desc: settings.about_luxury_point3_desc || '70% open landscaped parks',
        about_luxury_point4_title: settings.about_luxury_point4_title || '24/7 Security & Safety',
        about_luxury_point4_desc: settings.about_luxury_point4_desc || 'Multi-tier smart surveillance',
        about_stat1_number: settings.about_stat1_number || '3.5',
        about_stat1_label: settings.about_stat1_label || 'Acres of Land',
        about_stat2_number: settings.about_stat2_number || '4',
        about_stat2_label: settings.about_stat2_label || 'Towers',
        about_stat3_number: settings.about_stat3_number || '25+',
        about_stat3_label: settings.about_stat3_label || 'Lifestyle Amenities',
        about_stat4_number: settings.about_stat4_number || '500+',
        about_stat4_label: settings.about_stat4_label || 'Happy Families'
      });
    }
  }, [settings]);

  const showStatus = (text: string, type: 'success' | 'error' | 'info') => {
    setStatusMsg({ text, type });
    setTimeout(() => setStatusMsg(null), 4000);
  };

  // Upload Photo to Supabase Storage Bucket
  const handleFileUpload = async (file: File, target: 'gallery' | 'about') => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showStatus('Please upload a valid image file (JPG, PNG, WebP)', 'error');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      showStatus('Image size must be under 15MB', 'error');
      return;
    }

    try {
      if (target === 'gallery') {
        setIsUploadingImage(true);
        setUploadPercent(35);
      } else {
        setAboutImageUploading(true);
      }

      const res = await supabaseService.storage.uploadImage(
        file,
        `gallery_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
      );

      if (res && res.url) {
        if (target === 'gallery') {
          setItemForm(prev => ({ ...prev, image_url: res.url }));
          setUploadPercent(100);
          showStatus('Photo uploaded to Supabase successfully!', 'success');
        } else {
          setAboutForm(prev => ({ ...prev, about_luxury_image_url: res.url }));
          showStatus('Luxury showcase image uploaded to Supabase!', 'success');
        }
      }
    } catch (err: any) {
      console.error('Upload failed:', err);
      showStatus(err.message || 'Image upload failed. Check connection.', 'error');
    } finally {
      setIsUploadingImage(false);
      setAboutImageUploading(false);
      setTimeout(() => setUploadPercent(null), 1500);
    }
  };

  // Open Add Modal
  const handleOpenAddModal = () => {
    setEditingItem(null);
    setItemForm({
      title: '',
      category: 'Grand Architecture',
      image_url: '',
      description: '',
      sort_order: galleryItems.length + 1,
      is_active: 1
    });
    setIsAddModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (item: GalleryItem) => {
    setEditingItem(item);
    setItemForm({
      title: item.title,
      category: item.category || 'Lifestyle',
      image_url: item.image_url,
      description: item.description || '',
      sort_order: item.sort_order || 1,
      is_active: item.is_active === false || item.is_active === 0 ? 0 : 1
    });
    setIsAddModalOpen(true);
  };

  // Save Item (Create or Update)
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemForm.title.trim()) {
      showStatus('Please enter a title for the photo', 'error');
      return;
    }
    if (!itemForm.image_url.trim()) {
      showStatus('Please provide or upload an image URL', 'error');
      return;
    }

    try {
      if (editingItem) {
        const updated = await supabaseService.gallery.update(editingItem.id, itemForm);
        if (updated) {
          setGalleryItems(prev => prev.map(g => g.id === editingItem.id ? updated : g));
          showStatus('Gallery photo updated successfully!', 'success');
        }
      } else {
        const created = await supabaseService.gallery.create(itemForm);
        if (created) {
          setGalleryItems(prev => [...prev, created]);
          showStatus('New photo added to homepage gallery!', 'success');
        }
      }
      setIsAddModalOpen(false);
      setEditingItem(null);
    } catch (err: any) {
      console.error('Error saving gallery item:', err);
      showStatus(err.message || 'Failed to save gallery photo', 'error');
    }
  };

  // Delete Item
  const handleDeleteItem = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this photo from the homepage gallery?')) {
      return;
    }
    try {
      await supabaseService.gallery.delete(id);
      setGalleryItems(prev => prev.filter(g => g.id !== id));
      showStatus('Photo deleted from gallery', 'info');
    } catch (err: any) {
      console.error('Delete error:', err);
      showStatus('Failed to delete photo', 'error');
    }
  };

  // Move Order Up or Down
  const handleMoveOrder = async (index: number, direction: 'up' | 'down') => {
    const newItems = [...galleryItems];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newItems.length) return;

    const [moved] = newItems.splice(index, 1);
    newItems.splice(targetIndex, 0, moved);

    const orderIds = newItems.map(item => item.id);
    setGalleryItems(newItems);

    try {
      await supabaseService.gallery.reorder(orderIds);
      showStatus('Gallery display order updated', 'success');
    } catch (err: any) {
      console.error('Reorder error:', err);
      loadGallery();
    }
  };

  // Reset to Defaults
  const handleResetDefaults = async () => {
    if (!window.confirm('Reset gallery to default luxury sample photos? Any custom photos will be replaced.')) {
      return;
    }
    try {
      setLoading(true);
      const defaults = await supabaseService.gallery.resetDefaults();
      setGalleryItems(defaults);
      showStatus('Gallery reset to default luxury presets', 'success');
    } catch (err: any) {
      console.error('Reset error:', err);
      showStatus('Failed to reset gallery', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Save "Redefining Luxury" About Section Settings
  const handleSaveAbout = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingAbout(true);
    try {
      const updatedSettings = await supabaseService.settings.update(aboutForm);
      if (updatedSettings) {
        setSettings(updatedSettings);
      } else {
        setSettings({ ...settings, ...aboutForm });
      }
      showStatus('Redefining Luxury section saved and updated on Homepage!', 'success');
    } catch (err: any) {
      console.error('Save about error:', err);
      showStatus('Failed to save settings to Supabase', 'error');
    } finally {
      setIsSavingAbout(false);
    }
  };

  // Filtered gallery items
  const filteredItems = galleryItems.filter(item => {
    if (selectedCategory === 'All') return true;
    return item.category?.toLowerCase() === selectedCategory.toLowerCase();
  });

  return (
    <div className="space-y-6 pb-20">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-[#0a1220] p-6 rounded-2xl border border-white/10">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[#d4a359] text-xs font-bold uppercase tracking-[0.2em]">HOMEPAGE VISUAL SHOWCASE</span>
            <div className="w-6 h-[1.5px] bg-[#d4a359]"></div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white mt-1">
            Gallery & Luxury Showcase
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1 max-w-2xl">
            Upload and manage photos stored in Supabase for <strong className="text-white">"A Glimpse of Lavish Living"</strong> and configure the <strong className="text-white">"Redefining Luxury"</strong> about section.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-[#050a12] p-1.5 rounded-xl border border-white/10">
          <button
            onClick={() => setActiveTab('gallery')}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center space-x-2 ${
              activeTab === 'gallery'
                ? 'bg-[#d4a359] text-[#080f1a] shadow-md font-black'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Lavish Gallery ({galleryItems.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('about')}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center space-x-2 ${
              activeTab === 'about'
                ? 'bg-[#d4a359] text-[#080f1a] shadow-md font-black'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Redefining Luxury</span>
          </button>
        </div>
      </div>

      {/* Status Alert Notification */}
      {statusMsg && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-sm animate-fade-in ${
            statusMsg.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : statusMsg.type === 'error'
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
          }`}
        >
          <div className="flex items-center space-x-3">
            {statusMsg.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />
            ) : statusMsg.type === 'error' ? (
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
            ) : (
              <Sparkles className="w-5 h-5 flex-shrink-0 text-amber-400" />
            )}
            <span className="font-medium">{statusMsg.text}</span>
          </div>
          <button onClick={() => setStatusMsg(null)} className="text-neutral-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: LAVISH GALLERY MANAGEMENT */}
      {/* ========================================================================= */}
      {activeTab === 'gallery' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0a1220] p-4 rounded-2xl border border-white/10">
            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-wide transition-all whitespace-nowrap cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-[#d4a359] text-[#080f1a]'
                      : 'bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-3 flex-shrink-0">
              <button
                onClick={handleResetDefaults}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 text-neutral-300 border border-white/10 transition-all flex items-center space-x-2 cursor-pointer"
                title="Reset to default luxury photos"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset Defaults</span>
              </button>

              <button
                onClick={handleOpenAddModal}
                className="px-4 py-2 rounded-xl text-xs font-extrabold bg-[#d4a359] hover:bg-[#b88c44] text-[#080f1a] shadow-lg shadow-[#d4a359]/20 transition-all flex items-center space-x-2 cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Upload New Photo</span>
              </button>
            </div>
          </div>

          {/* Gallery Items Grid */}
          {loading ? (
            <div className="bg-[#0a1220] rounded-2xl border border-white/10 p-16 text-center space-y-3">
              <div className="w-10 h-10 border-2 border-[#d4a359] border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-sm text-neutral-400">Loading gallery photos from Supabase...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="bg-[#0a1220] rounded-2xl border border-white/10 p-16 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-[#d4a359]/10 text-[#d4a359] flex items-center justify-center mx-auto">
                <FileImage className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">No Photos Found</h3>
                <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
                  {selectedCategory !== 'All' 
                    ? `No photos categorized under "${selectedCategory}".`
                    : 'Your homepage gallery is empty. Upload your first luxury photo or restore defaults.'}
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={handleResetDefaults}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/15 text-white"
                >
                  Load Sample Photos
                </button>
                <button
                  onClick={handleOpenAddModal}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#d4a359] text-[#080f1a]"
                >
                  Upload First Photo
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredItems.map((item, index) => (
                <div
                  key={item.id}
                  className="group bg-[#0a1220] rounded-2xl border border-white/10 hover:border-[#d4a359]/50 overflow-hidden shadow-lg transition-all flex flex-col"
                >
                  {/* Photo Preview Container */}
                  <div className="relative aspect-[16/10] bg-[#050a12] overflow-hidden">
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e: any) => {
                        e.target.src = 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80';
                      }}
                    />

                    {/* Overlay Badges */}
                    <div className="absolute top-3 left-3 flex items-center space-x-2">
                      <span className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-[#080f1a]/85 backdrop-blur-md text-[#d4a359] border border-[#d4a359]/30">
                        {item.category || 'Lifestyle'}
                      </span>
                      <span className="px-2 py-1 rounded-md text-[10px] font-bold bg-black/60 text-neutral-300">
                        #{item.sort_order || index + 1}
                      </span>
                    </div>

                    {/* View Full Resolution Action */}
                    <button
                      onClick={() => setPreviewImage(item.image_url)}
                      className="absolute top-3 right-3 p-2 rounded-lg bg-[#080f1a]/80 text-white hover:text-[#d4a359] hover:bg-[#080f1a] transition-all opacity-0 group-hover:opacity-100 cursor-pointer shadow-md"
                      title="Preview High-Res Image"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Details & Controls */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <h4 className="text-sm font-bold text-white font-serif line-clamp-1">
                        {item.title}
                      </h4>
                      {item.description ? (
                        <p className="text-xs text-neutral-400 mt-1 line-clamp-2 leading-relaxed">
                          {item.description}
                        </p>
                      ) : (
                        <p className="text-xs text-neutral-500 italic mt-1">No description</p>
                      )}
                    </div>

                    {/* Bottom Action Strip */}
                    <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs">
                      {/* Reorder Buttons */}
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleMoveOrder(index, 'up')}
                          disabled={index === 0}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                          title="Move Up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleMoveOrder(index, 'down')}
                          disabled={index === filteredItems.length - 1}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                          title="Move Down"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Edit & Delete Buttons */}
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleOpenEditModal(item)}
                          className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-[#d4a359]/20 text-neutral-300 hover:text-[#d4a359] font-bold text-xs flex items-center space-x-1.5 cursor-pointer transition-all"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 cursor-pointer transition-all"
                          title="Delete Photo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: "REDEFINING LUXURY" ABOUT SECTION */}
      {/* ========================================================================= */}
      {activeTab === 'about' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Form Settings Column */}
          <form onSubmit={handleSaveAbout} className="lg:col-span-7 space-y-6">
            {/* Primary Showcase Image Upload */}
            <div className="bg-[#0a1220] p-6 rounded-2xl border border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white font-serif flex items-center space-x-2">
                    <ImageIcon className="w-4 h-4 text-[#d4a359]" />
                    <span>Luxury Showcase Photo</span>
                  </h3>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    This high-impact photo appears beside the "Redefining Luxury" narrative on the homepage.
                  </p>
                </div>
              </div>

              {/* Upload Drop Area */}
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <div className="w-32 h-24 rounded-xl bg-[#050a12] border border-white/10 overflow-hidden flex-shrink-0 relative group">
                    <img
                      src={aboutForm.about_luxury_image_url || 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=600&q=80'}
                      alt="Showcase"
                      className="w-full h-full object-cover"
                    />
                    {aboutImageUploading && (
                      <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                        <div className="w-6 h-6 border-2 border-[#d4a359] border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    <input
                      type="file"
                      ref={aboutFileRef}
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file, 'about');
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => aboutFileRef.current?.click()}
                      disabled={aboutImageUploading}
                      className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-[#d4a359] hover:text-[#080f1a] text-white text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{aboutImageUploading ? 'Uploading to Supabase...' : 'Upload Image to Supabase'}</span>
                    </button>
                    <p className="text-[11px] text-neutral-500">
                      Recommended: High resolution 1600x1200 landscape (JPG/PNG/WebP, max 15MB).
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">
                    Or Direct Image URL
                  </label>
                  <input
                    type="url"
                    value={aboutForm.about_luxury_image_url}
                    onChange={(e) => setAboutForm({ ...aboutForm, about_luxury_image_url: e.target.value })}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full bg-[#050a12] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#d4a359]"
                  />
                </div>
              </div>

              {/* Floating Gold Experience Badge */}
              <div className="pt-4 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#d4a359] uppercase tracking-wider mb-1">
                    Gold Badge Number
                  </label>
                  <input
                    type="text"
                    value={aboutForm.about_luxury_badge_number}
                    onChange={(e) => setAboutForm({ ...aboutForm, about_luxury_badge_number: e.target.value })}
                    placeholder="35+"
                    className="w-full bg-[#050a12] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#d4a359] font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#d4a359] uppercase tracking-wider mb-1">
                    Gold Badge Label
                  </label>
                  <input
                    type="text"
                    value={aboutForm.about_luxury_badge_text}
                    onChange={(e) => setAboutForm({ ...aboutForm, about_luxury_badge_text: e.target.value })}
                    placeholder="Luxury Amenities & Services"
                    className="w-full bg-[#050a12] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#d4a359]"
                  />
                </div>
              </div>
            </div>

            {/* Narrative & Headline */}
            <div className="bg-[#0a1220] p-6 rounded-2xl border border-white/10 space-y-4">
              <h3 className="text-base font-bold text-white font-serif flex items-center space-x-2">
                <Sliders className="w-4 h-4 text-[#d4a359]" />
                <span>Headings & Description</span>
              </h3>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">
                    Eyebrow Text
                  </label>
                  <input
                    type="text"
                    value={aboutForm.about_luxury_eyebrow}
                    onChange={(e) => setAboutForm({ ...aboutForm, about_luxury_eyebrow: e.target.value })}
                    className="w-full bg-[#050a12] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#d4a359]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">
                    Main Headline
                  </label>
                  <input
                    type="text"
                    value={aboutForm.about_luxury_heading}
                    onChange={(e) => setAboutForm({ ...aboutForm, about_luxury_heading: e.target.value })}
                    className="w-full bg-[#050a12] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#d4a359] font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">
                    Narrative Story / Tagline
                  </label>
                  <textarea
                    rows={3}
                    value={aboutForm.about_luxury_tagline}
                    onChange={(e) => setAboutForm({ ...aboutForm, about_luxury_tagline: e.target.value })}
                    className="w-full bg-[#050a12] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#d4a359] leading-relaxed"
                  />
                </div>
              </div>
            </div>

            {/* 4 Feature Points */}
            <div className="bg-[#0a1220] p-6 rounded-2xl border border-white/10 space-y-4">
              <h3 className="text-base font-bold text-white font-serif flex items-center space-x-2">
                <Check className="w-4 h-4 text-[#d4a359]" />
                <span>4 Highlights / Feature Points</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Point 1 */}
                <div className="space-y-1.5 p-3 rounded-xl bg-[#050a12] border border-white/5">
                  <span className="text-[10px] font-extrabold text-[#d4a359] uppercase tracking-wider">Highlight #1</span>
                  <input
                    type="text"
                    value={aboutForm.about_luxury_point1_title}
                    onChange={(e) => setAboutForm({ ...aboutForm, about_luxury_point1_title: e.target.value })}
                    placeholder="Title"
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold"
                  />
                  <input
                    type="text"
                    value={aboutForm.about_luxury_point1_desc}
                    onChange={(e) => setAboutForm({ ...aboutForm, about_luxury_point1_desc: e.target.value })}
                    placeholder="Description"
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-neutral-300"
                  />
                </div>

                {/* Point 2 */}
                <div className="space-y-1.5 p-3 rounded-xl bg-[#050a12] border border-white/5">
                  <span className="text-[10px] font-extrabold text-[#d4a359] uppercase tracking-wider">Highlight #2</span>
                  <input
                    type="text"
                    value={aboutForm.about_luxury_point2_title}
                    onChange={(e) => setAboutForm({ ...aboutForm, about_luxury_point2_title: e.target.value })}
                    placeholder="Title"
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold"
                  />
                  <input
                    type="text"
                    value={aboutForm.about_luxury_point2_desc}
                    onChange={(e) => setAboutForm({ ...aboutForm, about_luxury_point2_desc: e.target.value })}
                    placeholder="Description"
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-neutral-300"
                  />
                </div>

                {/* Point 3 */}
                <div className="space-y-1.5 p-3 rounded-xl bg-[#050a12] border border-white/5">
                  <span className="text-[10px] font-extrabold text-[#d4a359] uppercase tracking-wider">Highlight #3</span>
                  <input
                    type="text"
                    value={aboutForm.about_luxury_point3_title}
                    onChange={(e) => setAboutForm({ ...aboutForm, about_luxury_point3_title: e.target.value })}
                    placeholder="Title"
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold"
                  />
                  <input
                    type="text"
                    value={aboutForm.about_luxury_point3_desc}
                    onChange={(e) => setAboutForm({ ...aboutForm, about_luxury_point3_desc: e.target.value })}
                    placeholder="Description"
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-neutral-300"
                  />
                </div>

                {/* Point 4 */}
                <div className="space-y-1.5 p-3 rounded-xl bg-[#050a12] border border-white/5">
                  <span className="text-[10px] font-extrabold text-[#d4a359] uppercase tracking-wider">Highlight #4</span>
                  <input
                    type="text"
                    value={aboutForm.about_luxury_point4_title}
                    onChange={(e) => setAboutForm({ ...aboutForm, about_luxury_point4_title: e.target.value })}
                    placeholder="Title"
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold"
                  />
                  <input
                    type="text"
                    value={aboutForm.about_luxury_point4_desc}
                    onChange={(e) => setAboutForm({ ...aboutForm, about_luxury_point4_desc: e.target.value })}
                    placeholder="Description"
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-neutral-300"
                  />
                </div>
              </div>
            </div>

            {/* 4 Statistics */}
            <div className="bg-[#0a1220] p-6 rounded-2xl border border-white/10 space-y-4">
              <h3 className="text-base font-bold text-white font-serif flex items-center space-x-2">
                <Star className="w-4 h-4 text-[#d4a359]" />
                <span>4 Key Statistics</span>
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-[#050a12] rounded-xl border border-white/5 space-y-1">
                  <input
                    type="text"
                    value={aboutForm.about_stat1_number}
                    onChange={(e) => setAboutForm({ ...aboutForm, about_stat1_number: e.target.value })}
                    placeholder="3.5"
                    className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-sm font-extrabold text-[#d4a359] text-center"
                  />
                  <input
                    type="text"
                    value={aboutForm.about_stat1_label}
                    onChange={(e) => setAboutForm({ ...aboutForm, about_stat1_label: e.target.value })}
                    placeholder="Acres of Land"
                    className="w-full bg-black/40 border border-white/10 rounded px-1.5 py-1 text-[10px] text-neutral-400 text-center"
                  />
                </div>

                <div className="p-3 bg-[#050a12] rounded-xl border border-white/5 space-y-1">
                  <input
                    type="text"
                    value={aboutForm.about_stat2_number}
                    onChange={(e) => setAboutForm({ ...aboutForm, about_stat2_number: e.target.value })}
                    placeholder="4"
                    className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-sm font-extrabold text-[#d4a359] text-center"
                  />
                  <input
                    type="text"
                    value={aboutForm.about_stat2_label}
                    onChange={(e) => setAboutForm({ ...aboutForm, about_stat2_label: e.target.value })}
                    placeholder="Towers"
                    className="w-full bg-black/40 border border-white/10 rounded px-1.5 py-1 text-[10px] text-neutral-400 text-center"
                  />
                </div>

                <div className="p-3 bg-[#050a12] rounded-xl border border-white/5 space-y-1">
                  <input
                    type="text"
                    value={aboutForm.about_stat3_number}
                    onChange={(e) => setAboutForm({ ...aboutForm, about_stat3_number: e.target.value })}
                    placeholder="25+"
                    className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-sm font-extrabold text-[#d4a359] text-center"
                  />
                  <input
                    type="text"
                    value={aboutForm.about_stat3_label}
                    onChange={(e) => setAboutForm({ ...aboutForm, about_stat3_label: e.target.value })}
                    placeholder="Amenities"
                    className="w-full bg-black/40 border border-white/10 rounded px-1.5 py-1 text-[10px] text-neutral-400 text-center"
                  />
                </div>

                <div className="p-3 bg-[#050a12] rounded-xl border border-white/5 space-y-1">
                  <input
                    type="text"
                    value={aboutForm.about_stat4_number}
                    onChange={(e) => setAboutForm({ ...aboutForm, about_stat4_number: e.target.value })}
                    placeholder="500+"
                    className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-sm font-extrabold text-[#d4a359] text-center"
                  />
                  <input
                    type="text"
                    value={aboutForm.about_stat4_label}
                    onChange={(e) => setAboutForm({ ...aboutForm, about_stat4_label: e.target.value })}
                    placeholder="Happy Families"
                    className="w-full bg-black/40 border border-white/10 rounded px-1.5 py-1 text-[10px] text-neutral-400 text-center"
                  />
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="submit"
                disabled={isSavingAbout}
                className="px-6 py-3 rounded-xl bg-[#d4a359] hover:bg-[#b88c44] text-[#080f1a] font-extrabold text-sm shadow-xl shadow-[#d4a359]/20 transition-all flex items-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSavingAbout ? 'Saving to Supabase...' : 'Save Changes to Supabase'}</span>
              </button>
            </div>
          </form>

          {/* Live Preview Column */}
          <div className="lg:col-span-5 space-y-4">
            <div className="sticky top-6">
              <div className="flex items-center space-x-2 mb-3">
                <Eye className="w-4 h-4 text-[#d4a359]" />
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-300">Live Homepage Preview</span>
              </div>

              <div className="bg-white text-neutral-900 p-6 rounded-3xl border border-[#e8e4db] shadow-2xl space-y-6">
                {/* Photo & Floating Badge */}
                <div className="relative rounded-2xl overflow-hidden aspect-[4/3] shadow-md border border-neutral-200">
                  <img
                    src={aboutForm.about_luxury_image_url || 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=800&q=80'}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-3 right-3 bg-[#080f1a] text-white p-3 rounded-xl shadow-xl border border-[#d4a359]/40 max-w-[140px]">
                    <div className="text-xl font-extrabold text-[#d4a359] font-serif">
                      {aboutForm.about_luxury_badge_number || '35+'}
                    </div>
                    <div className="text-[9px] font-bold uppercase tracking-wider mt-0.5 text-neutral-200 leading-tight">
                      {aboutForm.about_luxury_badge_text || 'Amenities & Services'}
                    </div>
                  </div>
                </div>

                {/* Eyebrow & Title */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-[#d4a359] text-[10px] font-bold uppercase tracking-[0.2em]">
                      {aboutForm.about_luxury_eyebrow || 'ABOUT THE PROJECT'}
                    </span>
                    <div className="w-5 h-[1.5px] bg-[#d4a359]"></div>
                  </div>
                  <h4 className="text-xl font-bold font-serif text-neutral-900 leading-snug">
                    {aboutForm.about_luxury_heading || 'Redefining Luxury in Every Detail'}
                  </h4>
                  <p className="text-xs text-neutral-600 leading-relaxed">
                    {aboutForm.about_luxury_tagline}
                  </p>
                </div>

                {/* 4 Points Preview */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-neutral-100">
                  <div className="flex items-start space-x-2">
                    <div className="w-4 h-4 rounded-full bg-[#d4a359]/20 text-[#d4a359] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                    <div>
                      <div className="text-[11px] font-bold text-neutral-900">{aboutForm.about_luxury_point1_title}</div>
                      <div className="text-[9px] text-neutral-500">{aboutForm.about_luxury_point1_desc}</div>
                    </div>
                  </div>

                  <div className="flex items-start space-x-2">
                    <div className="w-4 h-4 rounded-full bg-[#d4a359]/20 text-[#d4a359] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                    <div>
                      <div className="text-[11px] font-bold text-neutral-900">{aboutForm.about_luxury_point2_title}</div>
                      <div className="text-[9px] text-neutral-500">{aboutForm.about_luxury_point2_desc}</div>
                    </div>
                  </div>

                  <div className="flex items-start space-x-2">
                    <div className="w-4 h-4 rounded-full bg-[#d4a359]/20 text-[#d4a359] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                    <div>
                      <div className="text-[11px] font-bold text-neutral-900">{aboutForm.about_luxury_point3_title}</div>
                      <div className="text-[9px] text-neutral-500">{aboutForm.about_luxury_point3_desc}</div>
                    </div>
                  </div>

                  <div className="flex items-start space-x-2">
                    <div className="w-4 h-4 rounded-full bg-[#d4a359]/20 text-[#d4a359] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                    <div>
                      <div className="text-[11px] font-bold text-neutral-900">{aboutForm.about_luxury_point4_title}</div>
                      <div className="text-[9px] text-neutral-500">{aboutForm.about_luxury_point4_desc}</div>
                    </div>
                  </div>
                </div>

                {/* Stats Strip Preview */}
                <div className="bg-[#faf8f5] p-3 rounded-xl border border-[#e8e4db] grid grid-cols-4 gap-2 text-center">
                  <div>
                    <div className="text-sm font-extrabold text-[#d4a359] font-serif">{aboutForm.about_stat1_number}</div>
                    <div className="text-[8px] font-bold uppercase text-neutral-600 truncate">{aboutForm.about_stat1_label}</div>
                  </div>
                  <div>
                    <div className="text-sm font-extrabold text-[#d4a359] font-serif">{aboutForm.about_stat2_number}</div>
                    <div className="text-[8px] font-bold uppercase text-neutral-600 truncate">{aboutForm.about_stat2_label}</div>
                  </div>
                  <div>
                    <div className="text-sm font-extrabold text-[#d4a359] font-serif">{aboutForm.about_stat3_number}</div>
                    <div className="text-[8px] font-bold uppercase text-neutral-600 truncate">{aboutForm.about_stat3_label}</div>
                  </div>
                  <div>
                    <div className="text-sm font-extrabold text-[#d4a359] font-serif">{aboutForm.about_stat4_number}</div>
                    <div className="text-[8px] font-bold uppercase text-neutral-600 truncate">{aboutForm.about_stat4_label}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT GALLERY ITEM */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0a1220] rounded-3xl border border-white/10 w-full max-w-xl shadow-2xl overflow-hidden animate-scale-up">
            {/* Modal Header */}
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <div>
                <span className="text-[#d4a359] text-[10px] font-bold uppercase tracking-[0.2em]">
                  {editingItem ? 'EDIT PHOTO' : 'NEW GALLERY PHOTO'}
                </span>
                <h3 className="text-lg font-bold text-white font-serif mt-0.5">
                  {editingItem ? 'Edit Gallery Item' : 'Upload Photo to Homepage Gallery'}
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveItem} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Image Preview & Upload Dropzone */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider">
                  Photo (Upload to Supabase or Select Preset)
                </label>

                {itemForm.image_url ? (
                  <div className="relative rounded-2xl overflow-hidden aspect-[16/10] bg-[#050a12] border border-white/10 group">
                    <img
                      src={itemForm.image_url}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-lg bg-[#d4a359] text-[#080f1a] font-bold text-xs flex items-center space-x-1"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Replace</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setItemForm({ ...itemForm, image_url: '' })}
                        className="px-3 py-1.5 rounded-lg bg-rose-600 text-white font-bold text-xs"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-white/20 hover:border-[#d4a359] bg-[#050a12] rounded-2xl p-6 text-center cursor-pointer transition-all hover:bg-white/5"
                  >
                    <div className="w-12 h-12 rounded-xl bg-[#d4a359]/10 text-[#d4a359] flex items-center justify-center mx-auto mb-2">
                      <Upload className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-bold text-white">Click to upload photo from your device</p>
                    <p className="text-[10px] text-neutral-400 mt-1">Directly uploaded to Supabase Storage (PNG, JPG, WebP)</p>
                  </div>
                )}

                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, 'gallery');
                  }}
                />

                {/* Upload Progress Bar */}
                {isUploadingImage && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-[#d4a359] font-bold">
                      <span>Uploading to Supabase...</span>
                      <span>{uploadPercent || 50}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#d4a359] transition-all duration-300"
                        style={{ width: `${uploadPercent || 50}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Direct Image URL input */}
                <div>
                  <input
                    type="url"
                    value={itemForm.image_url}
                    onChange={(e) => setItemForm({ ...itemForm, image_url: e.target.value })}
                    placeholder="Or paste external image URL (e.g. https://images.unsplash.com/...)"
                    className="w-full bg-[#050a12] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#d4a359]"
                  />
                </div>

                {/* Quick Luxury Presets Picker */}
                <div>
                  <span className="text-[10px] font-bold uppercase text-neutral-400 tracking-wider block mb-1.5">
                    Or Pick Curated Luxury Preset:
                  </span>
                  <div className="grid grid-cols-4 gap-2">
                    {LUXURY_PRESETS.slice(0, 4).map((preset) => (
                      <button
                        key={preset.title}
                        type="button"
                        onClick={() => {
                          setItemForm({
                            ...itemForm,
                            title: preset.title,
                            category: preset.category,
                            image_url: preset.url,
                            description: preset.description
                          });
                        }}
                        className="p-1.5 rounded-lg bg-[#050a12] border border-white/10 hover:border-[#d4a359] text-left text-[10px] text-neutral-300 truncate"
                        title={preset.title}
                      >
                        {preset.title.split(' ')[0]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Title & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1">
                    Photo Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={itemForm.title}
                    onChange={(e) => setItemForm({ ...itemForm, title: e.target.value })}
                    placeholder="e.g. Infinity Edge Swimming Pool"
                    className="w-full bg-[#050a12] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#d4a359]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1">
                    Category Tag
                  </label>
                  <select
                    value={itemForm.category}
                    onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })}
                    className="w-full bg-[#050a12] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#d4a359]"
                  >
                    <option value="Grand Architecture">Grand Architecture</option>
                    <option value="Lifestyle">Lifestyle</option>
                    <option value="Interiors">Interiors</option>
                    <option value="Suites">Suites</option>
                    <option value="Amenities">Amenities</option>
                    <option value="Wellness">Wellness</option>
                    <option value="Clubhouse">Clubhouse</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1">
                  Description / Caption (Optional)
                </label>
                <textarea
                  rows={2}
                  value={itemForm.description}
                  onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                  placeholder="e.g. Temperature-controlled infinity lap pool with luxury sun loungers."
                  className="w-full bg-[#050a12] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#d4a359]"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-white/10 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 text-neutral-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl text-xs font-extrabold bg-[#d4a359] hover:bg-[#b88c44] text-[#080f1a] shadow-lg shadow-[#d4a359]/20"
                >
                  {editingItem ? 'Save Updates' : 'Add to Homepage Gallery'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* FULL RESOLUTION LIGHTBOX PREVIEW */}
      {/* ========================================================================= */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-5xl max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl">
            <img
              src={previewImage}
              alt="High Resolution Preview"
              className="w-full h-auto max-h-[85vh] object-contain rounded-2xl"
            />
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/60 text-white hover:bg-black transition-all"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
