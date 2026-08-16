import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../../store/index.js';
import { Property } from '../../types.js';
import { convertImageToWebP, formatBytes } from '../../utils/mediaCompressor.js';
import { formatINR } from '../../utils/currency.js';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Building2, 
  Search, 
  X, 
  Check, 
  AlertTriangle, 
  Image as ImageIcon, 
  Video as VideoIcon,
  DollarSign,
  IndianRupee,
  MapPin, 
  Bed, 
  Bath, 
  Maximize2,
  Upload,
  Play,
  Film,
  Sparkles,
  CheckCircle2,
  Layers,
  Star,
  Share2
} from 'lucide-react';
import SharePropertyModal from '../../components/common/SharePropertyModal.js';

const MAX_PHOTOS = 10;
const MAX_VIDEOS = 4;

export default function Properties() {
  const { token, settings } = useAppStore();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [sharingProperty, setSharingProperty] = useState<Property | null>(null);
  const [deleteConfirmProperty, setDeleteConfirmProperty] = useState<Property | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Active tab in modal: 'details' | 'photos' | 'videos'
  const [modalTab, setModalTab] = useState<'details' | 'photos' | 'videos'>('details');

  // Form fields
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    type: 'Penthouse',
    bedrooms: '3',
    bathrooms: '3',
    area: '2500',
    location: '',
    status: 'PUBLISHED',
  });

  // Media arrays
  const [photosList, setPhotosList] = useState<string[]>([]);
  const [videosList, setVideosList] = useState<string[]>([]);
  
  // Custom URL inputs
  const [customPhotoUrl, setCustomPhotoUrl] = useState('');
  const [customVideoUrl, setCustomVideoUrl] = useState('');

  // Upload progress / stats
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [uploadNotification, setUploadNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const photoFileInputRef = useRef<HTMLInputElement>(null);
  const videoFileInputRef = useRef<HTMLInputElement>(null);

  const fetchProperties = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/properties');
      if (res.ok) {
        const data = await res.json();
        setProperties(data);
      }
    } catch (err) {
      console.error('Error fetching properties:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  const openAddModal = () => {
    setEditingProperty(null);
    setModalTab('details');
    setFormData({
      title: '',
      description: '',
      price: '',
      type: 'Penthouse',
      bedrooms: '3',
      bathrooms: '3',
      area: '2500',
      location: '',
      status: 'PUBLISHED',
    });
    setPhotosList([
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80'
    ]);
    setVideosList([]);
    setUploadNotification(null);
    setIsModalOpen(true);
  };

  const openEditModal = (p: Property) => {
    setEditingProperty(p);
    setModalTab('details');
    setFormData({
      title: p.title || '',
      description: p.description || '',
      price: p.price ? String(p.price) : '',
      type: p.type || 'Penthouse',
      bedrooms: p.bedrooms ? String(p.bedrooms) : '',
      bathrooms: p.bathrooms ? String(p.bathrooms) : '',
      area: p.area ? String(p.area) : '',
      location: p.location || '',
      status: p.status || 'PUBLISHED',
    });
    setPhotosList(Array.isArray(p.images) ? p.images.slice(0, MAX_PHOTOS) : []);
    setVideosList(Array.isArray(p.videos) ? p.videos.slice(0, MAX_VIDEOS) : []);
    setUploadNotification(null);
    setIsModalOpen(true);
  };

  // Upload handler for photos with PNG -> WebP auto conversion
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (photosList.length >= MAX_PHOTOS) {
      setUploadNotification({
        message: `Maximum ${MAX_PHOTOS} photos allowed per property. Please remove some photos first.`,
        type: 'error'
      });
      return;
    }

    const availableSlots = MAX_PHOTOS - photosList.length;
    const filesToUpload = Array.from(files).slice(0, availableSlots);

    setIsUploadingPhoto(true);
    setUploadNotification(null);

    let uploadedCount = 0;
    const newUrls: string[] = [];
    let totalSavedPercent = 0;

    for (const file of filesToUpload) {
      try {
        // Pre-convert to WebP on client to save initial upload size
        const { blob, dataUrl } = await convertImageToWebP(file, 0.92);

        // Upload to server
        const uploadFormData = new FormData();
        const webpFilename = `${file.name.replace(/\.[^/.]+$/, '')}.webp`;
        uploadFormData.append('file', blob, webpFilename);

        const res = await fetch('/api/upload/image', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: uploadFormData
        });

        if (res.ok) {
          const data = await res.json();
          if (data.url) {
            newUrls.push(data.url);
            uploadedCount++;
            if (data.savedPercent) {
              totalSavedPercent = Math.max(totalSavedPercent, data.savedPercent);
            }
          }
        } else {
          // Fallback to dataURL if server upload endpoint had an issue
          newUrls.push(dataUrl);
          uploadedCount++;
        }
      } catch (err) {
        console.error('Error converting/uploading image to WebP:', err);
      }
    }

    if (newUrls.length > 0) {
      setPhotosList(prev => [...prev, ...newUrls].slice(0, MAX_PHOTOS));
      setUploadNotification({
        message: `Successfully uploaded ${uploadedCount} photo(s) auto-converted to WebP format (saved storage with high quality).`,
        type: 'success'
      });
    } else {
      setUploadNotification({
        message: 'Failed to upload photo. Please check the file and try again.',
        type: 'error'
      });
    }

    setIsUploadingPhoto(false);
    if (photoFileInputRef.current) photoFileInputRef.current.value = '';
  };

  // Add photo via direct URL
  const handleAddCustomPhotoUrl = () => {
    if (!customPhotoUrl.trim()) return;
    if (photosList.length >= MAX_PHOTOS) {
      setUploadNotification({
        message: `Maximum limit of ${MAX_PHOTOS} photos reached.`,
        type: 'error'
      });
      return;
    }
    setPhotosList(prev => [...prev, customPhotoUrl.trim()].slice(0, MAX_PHOTOS));
    setCustomPhotoUrl('');
    setUploadNotification({
      message: 'Photo URL added to gallery.',
      type: 'success'
    });
  };

  // Remove photo
  const handleRemovePhoto = (index: number) => {
    setPhotosList(prev => prev.filter((_, i) => i !== index));
  };

  // Set as cover photo (move to index 0)
  const handleSetCoverPhoto = (index: number) => {
    if (index === 0) return;
    setPhotosList(prev => {
      const selected = prev[index];
      const rest = prev.filter((_, i) => i !== index);
      return [selected, ...rest];
    });
    setUploadNotification({
      message: 'Cover photo updated.',
      type: 'success'
    });
  };

  // Video Upload Handler
  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (videosList.length >= MAX_VIDEOS) {
      setUploadNotification({
        message: `Maximum ${MAX_VIDEOS} videos allowed per property.`,
        type: 'error'
      });
      return;
    }

    const availableSlots = MAX_VIDEOS - videosList.length;
    const filesToUpload = Array.from(files).slice(0, availableSlots);

    setIsUploadingVideo(true);
    setUploadNotification(null);

    const newUrls: string[] = [];
    for (const file of filesToUpload) {
      try {
        const uploadFormData = new FormData();
        uploadFormData.append('file', file);

        const res = await fetch('/api/upload/video', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: uploadFormData
        });

        if (res.ok) {
          const data = await res.json();
          if (data.url) {
            newUrls.push(data.url);
          }
        }
      } catch (err) {
        console.error('Error uploading video:', err);
      }
    }

    if (newUrls.length > 0) {
      setVideosList(prev => [...prev, ...newUrls].slice(0, MAX_VIDEOS));
      setUploadNotification({
        message: `Successfully uploaded ${newUrls.length} video(s).`,
        type: 'success'
      });
    } else {
      setUploadNotification({
        message: 'Failed to upload video. Please ensure the video format is MP4/WebM.',
        type: 'error'
      });
    }

    setIsUploadingVideo(false);
    if (videoFileInputRef.current) videoFileInputRef.current.value = '';
  };

  // Add custom video URL
  const handleAddCustomVideoUrl = () => {
    if (!customVideoUrl.trim()) return;
    if (videosList.length >= MAX_VIDEOS) {
      setUploadNotification({
        message: `Maximum limit of ${MAX_VIDEOS} videos reached.`,
        type: 'error'
      });
      return;
    }
    setVideosList(prev => [...prev, customVideoUrl.trim()].slice(0, MAX_VIDEOS));
    setCustomVideoUrl('');
    setUploadNotification({
      message: 'Video URL added.',
      type: 'success'
    });
  };

  // Remove video
  const handleRemoveVideo = (index: number) => {
    setVideosList(prev => prev.filter((_, i) => i !== index));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        price: Number(formData.price),
        type: formData.type,
        bedrooms: Number(formData.bedrooms),
        bathrooms: Number(formData.bathrooms),
        area: Number(formData.area),
        location: formData.location,
        status: formData.status,
        images: photosList.slice(0, MAX_PHOTOS),
        videos: videosList.slice(0, MAX_VIDEOS),
      };

      if (editingProperty) {
        // UPDATE PROPERTY
        const res = await fetch(`/api/properties/${editingProperty.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          setIsModalOpen(false);
          fetchProperties();
        }
      } else {
        // CREATE PROPERTY
        const res = await fetch('/api/properties', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          setIsModalOpen(false);
          fetchProperties();
        }
      }
    } catch (err) {
      console.error('Error saving property:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProperty = async () => {
    if (!deleteConfirmProperty) return;
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/properties/${deleteConfirmProperty.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        setDeleteConfirmProperty(null);
        fetchProperties();
      }
    } catch (err) {
      console.error('Error deleting property:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredProperties = properties.filter(p => {
    const matchesSearch = 
      (p.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.location || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.type || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-6">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Property Portfolio</h1>
            <span className="px-3 py-0.5 rounded-full bg-red-600/20 text-red-400 border border-red-600/40 text-xs font-bold">
              {properties.length} Listings
            </span>
          </div>
          <p className="text-sm text-neutral-400 mt-1">
            Manage luxury listings, photos (up to 10 with auto-WebP conversion), videos (up to 4), pricing, and status.
          </p>
        </div>

        <button 
          id="btn-add-property"
          onClick={openAddModal}
          className="flex items-center justify-center px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-red-600/30 cursor-pointer active:scale-95"
        >
          <Plus className="w-4 h-4 mr-2" />
          <span>Add New Property</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-neutral-950 p-4 rounded-2xl border border-neutral-800 flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-neutral-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by title, location, or type..."
            className="w-full pl-10 pr-4 py-2 bg-black border border-neutral-800 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-red-600"
          />
        </div>

        <div className="flex items-center space-x-2 w-full md:w-auto">
          <span className="text-xs font-bold text-neutral-400 uppercase mr-2">Filter:</span>
          {['ALL', 'PUBLISHED', 'DRAFT', 'SOLD'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === status
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                  : 'bg-black border border-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Property Table */}
      <div className="bg-neutral-950 rounded-3xl border border-neutral-800 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black border-b border-neutral-800 text-xs font-bold uppercase tracking-wider text-neutral-400">
                <th className="px-6 py-4">Property</th>
                <th className="px-6 py-4">Media</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Price</th>
                <th className="px-6 py-4">Specs</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-900 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-neutral-400 font-medium">
                    <div className="w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading portfolio...
                  </td>
                </tr>
              ) : filteredProperties.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-neutral-500">
                    No properties match your current criteria.
                  </td>
                </tr>
              ) : (
                filteredProperties.map((p) => {
                  const heroImg = p.images && p.images.length > 0 ? p.images[0] : null;
                  const photoCount = Array.isArray(p.images) ? p.images.length : 0;
                  const videoCount = Array.isArray(p.videos) ? p.videos.length : 0;

                  return (
                    <tr key={p.id} className="hover:bg-neutral-900/60 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          {heroImg ? (
                            <img 
                              src={heroImg} 
                              alt={p.title} 
                              className="w-14 h-14 rounded-xl object-cover border border-neutral-800 flex-shrink-0"
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-500 flex-shrink-0">
                              <Building2 className="w-6 h-6" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <h3 className="font-bold text-white text-base truncate max-w-xs">{p.title}</h3>
                            <div className="flex items-center text-xs text-neutral-400 mt-0.5 truncate">
                              <MapPin className="w-3 h-3 mr-1 text-red-500 flex-shrink-0" />
                              <span className="truncate">{p.location || 'Location upon request'}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex flex-col space-y-1">
                          <span className="inline-flex items-center text-xs font-semibold text-neutral-300">
                            <ImageIcon className="w-3.5 h-3.5 mr-1 text-red-500" />
                            {photoCount} / {MAX_PHOTOS} Photos
                          </span>
                          {videoCount > 0 && (
                            <span className="inline-flex items-center text-xs font-semibold text-emerald-400">
                              <Film className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                              {videoCount} / {MAX_VIDEOS} Videos
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-neutral-300 font-semibold">
                        <span className="px-2.5 py-1 bg-black border border-neutral-800 rounded-lg text-xs">
                          {p.type}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span className="font-extrabold text-white text-base">
                          {p.price ? formatINR(Number(p.price)) : 'Price on Request'}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-xs text-neutral-400">
                        <div className="space-y-1">
                          <span className="block">{p.bedrooms || 0} Beds • {p.bathrooms || 0} Baths</span>
                          <span className="block text-neutral-500">{p.area ? `${p.area.toLocaleString()} sq ft` : 'Spacious'}</span>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold border ${
                          p.status === 'PUBLISHED' 
                            ? 'bg-red-950/60 text-red-400 border-red-600/40' 
                            : p.status === 'SOLD'
                            ? 'bg-neutral-900 text-neutral-400 border-neutral-800'
                            : 'bg-amber-950/60 text-amber-400 border-amber-600/40'
                        }`}>
                          {p.status || 'PUBLISHED'}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            id={`btn-share-property-${p.id}`}
                            onClick={() => setSharingProperty(p)}
                            className="p-2 bg-neutral-900 hover:bg-[#d4a359]/20 border border-neutral-800 hover:border-[#d4a359]/50 text-neutral-300 hover:text-[#d4a359] rounded-xl text-xs font-bold transition-colors cursor-pointer"
                            title="Share specifications & link to WhatsApp"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>
                          <button
                            id={`btn-edit-property-${p.id}`}
                            onClick={() => openEditModal(p)}
                            className="p-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-red-600/40 text-neutral-300 hover:text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                            title="Edit Property & Media"
                          >
                            <Edit2 className="w-4 h-4 text-neutral-300 hover:text-red-400" />
                          </button>
                          <button
                            id={`btn-delete-property-${p.id}`}
                            onClick={() => setDeleteConfirmProperty(p)}
                            className="p-2 bg-neutral-900 hover:bg-red-950/60 border border-neutral-800 hover:border-red-600/60 text-neutral-400 hover:text-red-400 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                            title="Delete Property"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD / EDIT PROPERTY MODAL WITH RICH MEDIA TABS (10 PHOTOS + 4 VIDEOS) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-950 border border-neutral-800 text-white rounded-3xl max-w-3xl w-full p-6 md:p-8 shadow-2xl relative max-h-[92vh] overflow-y-auto space-y-6 animate-in fade-in zoom-in duration-150">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
              <div>
                <h2 className="text-2xl font-black text-white">
                  {editingProperty ? 'Edit Property & Media' : 'Add Luxury Property'}
                </h2>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Manage specifications, up to 10 high-quality photos (auto-WebP), and up to 4 video walkthroughs.
                </p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white hover:border-red-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Notification Banner */}
            {uploadNotification && (
              <div className={`p-4 rounded-2xl border text-xs font-semibold flex items-center justify-between space-x-3 ${
                uploadNotification.type === 'success'
                  ? 'bg-red-950/60 border-red-600/50 text-white'
                  : 'bg-red-950 border-red-800 text-red-300'
              }`}>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <span>{uploadNotification.message}</span>
                </div>
                <button 
                  onClick={() => setUploadNotification(null)}
                  className="text-neutral-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Tab Navigation */}
            <div className="flex space-x-2 border-b border-neutral-800 pb-2">
              <button
                type="button"
                onClick={() => setModalTab('details')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  modalTab === 'details'
                    ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                    : 'bg-neutral-900 text-neutral-400 hover:text-white'
                }`}
              >
                1. Listing Details
              </button>

              <button
                type="button"
                onClick={() => setModalTab('photos')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
                  modalTab === 'photos'
                    ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                    : 'bg-neutral-900 text-neutral-400 hover:text-white'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5 mr-1" />
                <span>2. Photos ({photosList.length}/{MAX_PHOTOS})</span>
              </button>

              <button
                type="button"
                onClick={() => setModalTab('videos')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
                  modalTab === 'videos'
                    ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                    : 'bg-neutral-900 text-neutral-400 hover:text-white'
                }`}
              >
                <VideoIcon className="w-3.5 h-3.5 mr-1" />
                <span>3. Videos ({videosList.length}/{MAX_VIDEOS})</span>
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-6">
              {/* TAB 1: DETAILS */}
              {modalTab === 'details' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                        Property Title *
                      </label>
                      <input
                        required
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="e.g. The Obsidian Sky Penthouse"
                        className="w-full px-4 py-2.5 bg-black border border-neutral-800 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                        Property Type
                      </label>
                      <select
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                        className="w-full px-4 py-2.5 bg-black border border-neutral-800 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-600"
                      >
                        <option value="Penthouse">Penthouse</option>
                        <option value="Villa">Villa</option>
                        <option value="Apartment">Apartment</option>
                        <option value="Mansion">Mansion</option>
                        <option value="Commercial">Commercial</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                        Price (₹ INR) *
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 font-bold">₹</span>
                        <input
                          required
                          type="number"
                          value={formData.price}
                          onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                          placeholder="e.g. 4500000"
                          className="w-full pl-8 pr-4 py-2.5 bg-black border border-neutral-800 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-600 font-mono"
                        />
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                        Location & Address *
                      </label>
                      <input
                        required
                        type="text"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        placeholder="e.g. Beverly Hills, Los Angeles, CA"
                        className="w-full px-4 py-2.5 bg-black border border-neutral-800 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                        Bedrooms
                      </label>
                      <input
                        required
                        type="number"
                        value={formData.bedrooms}
                        onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })}
                        className="w-full px-4 py-2.5 bg-black border border-neutral-800 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                        Bathrooms
                      </label>
                      <input
                        required
                        type="number"
                        value={formData.bathrooms}
                        onChange={(e) => setFormData({ ...formData, bathrooms: e.target.value })}
                        className="w-full px-4 py-2.5 bg-black border border-neutral-800 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                        Area (Square Feet)
                      </label>
                      <input
                        required
                        type="number"
                        value={formData.area}
                        onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                        placeholder="e.g. 4500"
                        className="w-full px-4 py-2.5 bg-black border border-neutral-800 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                        Marketing Status
                      </label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        className="w-full px-4 py-2.5 bg-black border border-neutral-800 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-600"
                      >
                        <option value="PUBLISHED">PUBLISHED (Live on site)</option>
                        <option value="DRAFT">DRAFT (Hidden)</option>
                        <option value="SOLD">SOLD</option>
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                        Description & Highlights
                      </label>
                      <textarea
                        rows={4}
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Describe panoramic views, high-end materials, amenities, pool, security, etc."
                        className="w-full px-4 py-2.5 bg-black border border-neutral-800 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-600"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: PHOTOS (MAX 10 PHOTOS WITH PNG -> WEBP AUTO CONVERSION) */}
              {modalTab === 'photos' && (
                <div className="space-y-6">
                  {/* Photo Auto-WebP notice */}
                  <div className="bg-neutral-900/90 border border-neutral-800 p-4 rounded-2xl flex items-start space-x-3">
                    <Sparkles className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center space-x-2">
                        <span>Smart WebP Photo Optimization</span>
                        <span className="px-2 py-0.5 rounded-md bg-red-600/20 text-red-400 text-[10px] font-bold">WEBP AUTO-CONVERT</span>
                      </h4>
                      <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                        When you upload photos (PNG, JPEG, etc.), our system automatically converts them to <strong>WebP</strong> format. This preserves the original visual quality while drastically reducing storage space. Max <strong>{MAX_PHOTOS} photos</strong> per listing.
                      </p>
                    </div>
                  </div>

                  {/* Upload Drop Zone */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* File Upload Box */}
                    <div 
                      onClick={() => photosList.length < MAX_PHOTOS && photoFileInputRef.current?.click()}
                      className={`p-6 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center transition-all ${
                        photosList.length >= MAX_PHOTOS 
                          ? 'border-neutral-800 bg-neutral-950 opacity-50 cursor-not-allowed'
                          : 'border-neutral-700 hover:border-red-600 bg-black hover:bg-neutral-900/50 cursor-pointer'
                      }`}
                    >
                      <input 
                        ref={photoFileInputRef}
                        type="file" 
                        accept="image/png,image/jpeg,image/webp,image/jpg,image/bmp" 
                        multiple 
                        onChange={handlePhotoUpload} 
                        className="hidden" 
                        disabled={photosList.length >= MAX_PHOTOS || isUploadingPhoto}
                      />
                      <div className="w-12 h-12 rounded-2xl bg-red-600/20 text-red-500 flex items-center justify-center mb-3">
                        {isUploadingPhoto ? (
                          <div className="w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Upload className="w-6 h-6" />
                        )}
                      </div>
                      <p className="text-sm font-bold text-white">
                        {isUploadingPhoto ? 'Converting to WebP & Uploading...' : 'Upload Photos (PNG, JPG)'}
                      </p>
                      <p className="text-xs text-neutral-400 mt-1">
                        {photosList.length >= MAX_PHOTOS 
                          ? 'Maximum 10 photos reached' 
                          : `Select up to ${MAX_PHOTOS - photosList.length} more photos`}
                      </p>
                      <span className="mt-3 px-3 py-1 bg-red-950/60 border border-red-600/40 text-red-400 text-[10px] font-bold rounded-lg">
                        Auto-WebP Compression Enabled
                      </span>
                    </div>

                    {/* Add by URL Box */}
                    <div className="p-6 bg-black border border-neutral-800 rounded-2xl flex flex-col justify-between">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">
                          Add Photo By URL
                        </label>
                        <input 
                          type="url"
                          value={customPhotoUrl}
                          onChange={(e) => setCustomPhotoUrl(e.target.value)}
                          placeholder="https://images.unsplash.com/..."
                          disabled={photosList.length >= MAX_PHOTOS}
                          className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-red-600"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleAddCustomPhotoUrl}
                        disabled={!customPhotoUrl.trim() || photosList.length >= MAX_PHOTOS}
                        className="mt-4 w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-40 cursor-pointer"
                      >
                        + Add Image URL
                      </button>
                    </div>
                  </div>

                  {/* Photos Gallery Grid */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                        Uploaded Photos ({photosList.length} of {MAX_PHOTOS})
                      </h4>
                      <span className="text-xs text-neutral-500">First photo will be used as Main Cover</span>
                    </div>

                    {photosList.length === 0 ? (
                      <div className="p-8 border border-neutral-800 rounded-2xl text-center text-neutral-500 text-xs bg-black">
                        No photos added yet. Upload up to 10 photos to showcase this luxury property.
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                        {photosList.map((url, idx) => (
                          <div 
                            key={idx} 
                            className="group relative aspect-square bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-lg transition-all"
                          >
                            <img src={url} alt={`Property ${idx + 1}`} className="w-full h-full object-cover" />
                            
                            {/* Overlay Controls */}
                            <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-between">
                              <div className="flex justify-between items-center">
                                <span className="px-2 py-0.5 rounded bg-black/80 text-[10px] font-bold text-white border border-neutral-700">
                                  #{idx + 1}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleRemovePhoto(idx)}
                                  className="p-1 rounded-lg bg-red-600/90 text-white hover:bg-red-700 transition-colors"
                                  title="Delete Photo"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              {idx !== 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleSetCoverPhoto(idx)}
                                  className="w-full py-1 bg-neutral-800 hover:bg-red-600 text-white text-[10px] font-bold rounded-lg transition-colors flex items-center justify-center space-x-1"
                                >
                                  <Star className="w-3 h-3" />
                                  <span>Set as Cover</span>
                                </button>
                              )}
                            </div>

                            {/* Cover Badge */}
                            {idx === 0 && (
                              <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-red-600 text-white text-[9px] font-black uppercase tracking-wider shadow-lg">
                                Cover
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: VIDEOS (MAX 4 VIDEOS) */}
              {modalTab === 'videos' && (
                <div className="space-y-6">
                  {/* Videos Header notice */}
                  <div className="bg-neutral-900/90 border border-neutral-800 p-4 rounded-2xl flex items-start space-x-3">
                    <Film className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-white">
                        Property Video Walkthroughs
                      </h4>
                      <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                        Add cinematic property tours, drone footage, or architectural walkthroughs. You can upload video files (MP4, WebM) or paste direct video links. Maximum <strong>{MAX_VIDEOS} videos</strong> per property.
                      </p>
                    </div>
                  </div>

                  {/* Upload or Add Video */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Video File Upload */}
                    <div 
                      onClick={() => videosList.length < MAX_VIDEOS && videoFileInputRef.current?.click()}
                      className={`p-6 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center transition-all ${
                        videosList.length >= MAX_VIDEOS 
                          ? 'border-neutral-800 bg-neutral-950 opacity-50 cursor-not-allowed'
                          : 'border-neutral-700 hover:border-red-600 bg-black hover:bg-neutral-900/50 cursor-pointer'
                      }`}
                    >
                      <input 
                        ref={videoFileInputRef}
                        type="file" 
                        accept="video/mp4,video/webm,video/quicktime,video/ogg" 
                        multiple 
                        onChange={handleVideoUpload} 
                        className="hidden" 
                        disabled={videosList.length >= MAX_VIDEOS || isUploadingVideo}
                      />
                      <div className="w-12 h-12 rounded-2xl bg-red-600/20 text-red-500 flex items-center justify-center mb-3">
                        {isUploadingVideo ? (
                          <div className="w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Film className="w-6 h-6" />
                        )}
                      </div>
                      <p className="text-sm font-bold text-white">
                        {isUploadingVideo ? 'Uploading Video...' : 'Upload Video File'}
                      </p>
                      <p className="text-xs text-neutral-400 mt-1">
                        {videosList.length >= MAX_VIDEOS 
                          ? 'Maximum 4 videos reached' 
                          : `Select up to ${MAX_VIDEOS - videosList.length} more video files (MP4, WebM)`}
                      </p>
                    </div>

                    {/* Video URL Box */}
                    <div className="p-6 bg-black border border-neutral-800 rounded-2xl flex flex-col justify-between">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">
                          Add Video By URL
                        </label>
                        <input 
                          type="url"
                          value={customVideoUrl}
                          onChange={(e) => setCustomVideoUrl(e.target.value)}
                          placeholder="https://assets.mixkit.co/... or /uploads/video.mp4"
                          disabled={videosList.length >= MAX_VIDEOS}
                          className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-red-600"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleAddCustomVideoUrl}
                        disabled={!customVideoUrl.trim() || videosList.length >= MAX_VIDEOS}
                        className="mt-4 w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-40 cursor-pointer"
                      >
                        + Add Video URL
                      </button>
                    </div>
                  </div>

                  {/* Video List Preview */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                        Added Videos ({videosList.length} of {MAX_VIDEOS})
                      </h4>
                    </div>

                    {videosList.length === 0 ? (
                      <div className="p-8 border border-neutral-800 rounded-2xl text-center text-neutral-500 text-xs bg-black">
                        No videos added yet. Add up to 4 video walkthroughs for immersive tours.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {videosList.map((url, idx) => (
                          <div key={idx} className="bg-black border border-neutral-800 rounded-2xl p-3 relative group">
                            <div className="aspect-video bg-neutral-900 rounded-xl overflow-hidden relative mb-2">
                              <video 
                                src={url} 
                                controls 
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-white">Video #{idx + 1}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveVideo(idx)}
                                className="px-2.5 py-1 bg-red-600/20 border border-red-600/40 hover:bg-red-600 text-red-400 hover:text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center space-x-1"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Remove</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Modal Footer Controls */}
              <div className="flex items-center justify-between pt-4 border-t border-neutral-800">
                <div className="flex items-center space-x-2 text-xs text-neutral-400">
                  <span className="font-bold text-white">{photosList.length}/10 Photos</span>
                  <span>•</span>
                  <span className="font-bold text-white">{videosList.length}/4 Videos</span>
                </div>

                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2.5 bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    id="btn-save-property"
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-red-600/30 flex items-center space-x-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <span>Saving...</span>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>{editingProperty ? 'Save Changes' : 'Create Listing'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      {deleteConfirmProperty && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-950 border border-red-900/50 text-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="w-12 h-12 rounded-2xl bg-red-950/80 border border-red-600/40 flex items-center justify-center text-red-500 mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-xl font-bold text-white">Delete Property?</h3>
              <p className="text-neutral-400 text-xs">
                Are you sure you want to permanently delete <strong className="text-white">"{deleteConfirmProperty.title}"</strong>? This will also remove associated site visits and feedback records.
              </p>
            </div>

            <div className="flex items-center justify-center space-x-3 pt-4 border-t border-neutral-900">
              <button
                type="button"
                onClick={() => setDeleteConfirmProperty(null)}
                className="px-5 py-2.5 bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="btn-confirm-delete-property"
                type="button"
                onClick={handleDeleteProperty}
                disabled={isDeleting}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete Property'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* SHARE PROPERTY MODAL */}
      <SharePropertyModal
        property={sharingProperty}
        settings={settings}
        onClose={() => setSharingProperty(null)}
      />
    </div>
  );
}
