import { useState, useEffect } from 'react';
import { useAppStore } from '../../store/index.js';
import { FAQ } from '../../types.js';
import HomeFaqSection from '../../components/home/HomeFaqSection.js';
import { 
  HelpCircle, 
  Plus, 
  Trash2, 
  Edit2, 
  MoveUp, 
  MoveDown, 
  Sparkles, 
  Check, 
  X, 
  Eye, 
  RefreshCw, 
  RotateCcw,
  CheckCircle2, 
  AlertCircle,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';

export const DEFAULT_FAQ_CATEGORIES = [
  'Renting Process',
  'Agreements & Deposits',
  'Brokerage & Fees',
  'Society & Move-in',
  'Property Owners',
  'General'
] as const;

export default function Faqs() {
  const { token, settings } = useAppStore();
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [viewMode, setViewMode] = useState<'editor' | 'preview'>('editor');
  const [isResetting, setIsResetting] = useState(false);

  // Add/Edit Form State
  const [editingFaq, setEditingFaq] = useState<FAQ | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    question: '',
    answer: '',
    category: 'Renting Process',
    sort_order: 1,
    is_active: 1
  });

  const fetchFaqs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/faqs/all', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data: FAQ[] = await res.json();
        setFaqs(data);
      }
    } catch (err) {
      console.error('Error fetching FAQs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFaqs();
  }, []);

  const openAddModal = () => {
    setEditingFaq(null);
    setFormData({
      question: '',
      answer: '',
      category: 'Renting Process',
      sort_order: faqs.length + 1,
      is_active: 1
    });
    setIsModalOpen(true);
  };

  const openEditModal = (faq: FAQ) => {
    setEditingFaq(faq);
    setFormData({
      question: faq.question,
      answer: faq.answer,
      category: faq.category || 'Renting Process',
      sort_order: faq.sort_order || 1,
      is_active: faq.is_active !== undefined ? faq.is_active : 1
    });
    setIsModalOpen(true);
  };

  const handleSaveFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.question.trim() || !formData.answer.trim()) return;

    try {
      const url = editingFaq ? `/api/faqs/${editingFaq.id}` : '/api/faqs';
      const method = editingFaq ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        setNotification({
          message: editingFaq ? 'FAQ updated successfully!' : 'New FAQ added to home page!',
          type: 'success'
        });
        setIsModalOpen(false);
        fetchFaqs();
      } else {
        setNotification({
          message: 'Failed to save FAQ. Please check input values.',
          type: 'error'
        });
      }
    } catch (err) {
      console.error('Error saving FAQ:', err);
      setNotification({ message: 'An unexpected error occurred.', type: 'error' });
    }
  };

  const handleDeleteFaq = async (id: number) => {
    if (!confirm('Are you sure you want to delete this FAQ item?')) return;

    try {
      const res = await fetch(`/api/faqs/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        setNotification({ message: 'FAQ deleted successfully.', type: 'success' });
        fetchFaqs();
      }
    } catch (err) {
      console.error('Error deleting FAQ:', err);
    }
  };

  const handleToggleActive = async (faq: FAQ) => {
    const newStatus = faq.is_active === 1 ? 0 : 1;
    try {
      const res = await fetch(`/api/faqs/${faq.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ is_active: newStatus })
      });

      if (res.ok) {
        setFaqs(prev => prev.map(f => f.id === faq.id ? { ...f, is_active: newStatus } : f));
      }
    } catch (err) {
      console.error('Error toggling active status:', err);
    }
  };

  const handleReorder = async (faq: FAQ, direction: 'up' | 'down') => {
    const currentIndex = faqs.findIndex(f => f.id === faq.id);
    if (currentIndex < 0) return;
    if (direction === 'up' && currentIndex === 0) return;
    if (direction === 'down' && currentIndex === faqs.length - 1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const targetFaq = faqs[targetIndex];

    // Swap sort orders
    const currentSortOrder = faq.sort_order || (currentIndex + 1);
    const targetSortOrder = targetFaq.sort_order || (targetIndex + 1);

    try {
      await Promise.all([
        fetch(`/api/faqs/${faq.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ sort_order: targetSortOrder })
        }),
        fetch(`/api/faqs/${targetFaq.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ sort_order: currentSortOrder })
        })
      ]);

      fetchFaqs();
    } catch (err) {
      console.error('Error reordering FAQs:', err);
    }
  };

  const handleResetDefaults = async () => {
    if (!confirm('This will reset all Home Page FAQs to default Pune rental questions. Continue?')) return;
    setIsResetting(true);

    try {
      const res = await fetch('/api/faqs/reset-defaults', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        setNotification({
          message: 'Reset Home Page FAQs to default Pune rental templates!',
          type: 'success'
        });
        fetchFaqs();
      }
    } catch (err) {
      console.error('Error resetting defaults:', err);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 rounded-xl bg-[#d4a359]/20 text-[#d4a359]">
              <HelpCircle className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold font-serif text-white">Home Page FAQs Manager</h1>
          </div>
          <p className="text-neutral-400 text-xs mt-1">
            Manage questions, answers, and categories displayed on the public Home Page FAQ accordion.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* View Mode Toggle */}
          <div className="flex items-center space-x-1 p-1 bg-black/60 border border-white/10 rounded-2xl">
            <button
              type="button"
              onClick={() => setViewMode('editor')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'editor'
                  ? 'bg-[#d4a359] text-[#080f1a]'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              FAQ List
            </button>
            <button
              type="button"
              onClick={() => setViewMode('preview')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                viewMode === 'preview'
                  ? 'bg-[#d4a359] text-[#080f1a]'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Client View</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleResetDefaults}
            disabled={isResetting}
            className="px-3.5 py-2.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
            title="Reset to default Pune rental FAQ pack"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#d4a359]" />
            <span className="hidden sm:inline">Reset Defaults</span>
          </button>

          <button
            type="button"
            onClick={openAddModal}
            className="px-4 py-2.5 bg-[#d4a359] hover:bg-[#e5b364] text-[#080f1a] font-black rounded-xl text-xs uppercase tracking-wider transition-all flex items-center space-x-2 cursor-pointer shadow-lg shadow-[#d4a359]/20"
          >
            <Plus className="w-4 h-4" />
            <span>Add New FAQ</span>
          </button>
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <div className={`p-4 rounded-2xl border text-xs font-semibold flex items-center justify-between space-x-3 animate-in fade-in duration-150 ${
          notification.type === 'success'
            ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
            : 'bg-red-950/60 border-red-500/40 text-red-300'
        }`}>
          <div className="flex items-center space-x-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-neutral-400 hover:text-white cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* Content View */}
      {viewMode === 'preview' ? (
        <div className="bg-[#0e1726] border border-white/10 rounded-3xl p-6 space-y-4">
          <div className="p-3 bg-neutral-900/80 rounded-xl border border-neutral-800 text-xs text-neutral-400 flex items-center space-x-2">
            <Eye className="w-4 h-4 text-[#d4a359]" />
            <span>This is how the FAQ section looks live on your Home Page.</span>
          </div>
          <HomeFaqSection settings={settings} />
        </div>
      ) : (
        <div className="bg-[#0e1726] border border-white/10 rounded-3xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Configured Home Page FAQs ({faqs.length})
            </h3>
            <button
              onClick={fetchFaqs}
              className="p-1.5 text-neutral-400 hover:text-white hover:bg-white/10 rounded-lg cursor-pointer"
              title="Refresh FAQs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {loading ? (
            <div className="py-12 text-center text-neutral-400 text-xs">
              Loading FAQs...
            </div>
          ) : faqs.length === 0 ? (
            <div className="py-12 text-center text-neutral-500 text-xs space-y-3">
              <HelpCircle className="w-8 h-8 mx-auto text-neutral-600" />
              <p>No FAQs configured for the home page.</p>
              <button
                onClick={handleResetDefaults}
                className="px-4 py-2 bg-[#d4a359] text-[#080f1a] font-bold rounded-xl text-xs"
              >
                Load Standard Pune Rental FAQs
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {faqs.map((faq, index) => (
                <div
                  key={faq.id}
                  className={`bg-black/60 border rounded-2xl p-4 transition-colors space-y-3 ${
                    faq.is_active === 1 ? 'border-neutral-800 hover:border-neutral-700' : 'border-neutral-900 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="px-2.5 py-0.5 rounded-md bg-[#d4a359]/15 text-[#d4a359] text-[10px] font-extrabold uppercase tracking-wider border border-[#d4a359]/30">
                          {faq.category || 'General'}
                        </span>
                        <span className="text-[11px] text-neutral-500 font-mono">#{index + 1}</span>
                        {faq.is_active === 0 && (
                          <span className="px-2 py-0.5 rounded bg-red-950 text-red-400 text-[10px] font-bold">
                            Inactive
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-white leading-snug">
                        {faq.question}
                      </h4>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center space-x-1 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(faq)}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          faq.is_active === 1 ? 'text-emerald-400 hover:bg-emerald-950' : 'text-neutral-500 hover:bg-neutral-800'
                        }`}
                        title={faq.is_active === 1 ? 'Deactivate FAQ' : 'Activate FAQ'}
                      >
                        {faq.is_active === 1 ? <ToggleRight className="w-4 h-4 text-emerald-400" /> : <ToggleLeft className="w-4 h-4" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleReorder(faq, 'up')}
                        disabled={index === 0}
                        className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg disabled:opacity-20 cursor-pointer"
                        title="Move Up"
                      >
                        <MoveUp className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleReorder(faq, 'down')}
                        disabled={index === faqs.length - 1}
                        className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg disabled:opacity-20 cursor-pointer"
                        title="Move Down"
                      >
                        <MoveDown className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => openEditModal(faq)}
                        className="p-1.5 text-neutral-400 hover:text-[#d4a359] hover:bg-[#d4a359]/10 rounded-lg cursor-pointer transition-colors"
                        title="Edit FAQ"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteFaq(faq.id)}
                        className="p-1.5 text-neutral-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg cursor-pointer transition-colors"
                        title="Delete FAQ"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-neutral-300 pl-3 border-l-2 border-[#d4a359]/40 leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ADD / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0e1726] border border-[#d4a359]/40 text-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative space-y-5 animate-in zoom-in-95">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white p-2 rounded-full hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-[#d4a359]/20 text-[#d4a359] flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold font-serif text-white">
                  {editingFaq ? 'Edit Home FAQ' : 'Add New Home FAQ'}
                </h3>
                <p className="text-xs text-neutral-400">Configure public question and answer for visitors</p>
              </div>
            </div>

            <form onSubmit={handleSaveFaq} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-neutral-400 mb-1">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 bg-black border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#d4a359]"
                  >
                    {DEFAULT_FAQ_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-neutral-400 mb-1">
                    Sort Order
                  </label>
                  <input
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) => setFormData({ ...formData, sort_order: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-black border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#d4a359]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-neutral-400 mb-1">
                  Question *
                </label>
                <input
                  type="text"
                  required
                  value={formData.question}
                  onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                  placeholder="e.g. How does the rental agreement process work in Pune?"
                  className="w-full px-3 py-2 bg-black border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-[#d4a359]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-neutral-400 mb-1">
                  Answer *
                </label>
                <textarea
                  rows={4}
                  required
                  value={formData.answer}
                  onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                  placeholder="Provide a clear, helpful response..."
                  className="w-full px-3 py-2 bg-black border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-[#d4a359]"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="is_active_check"
                  checked={formData.is_active === 1}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked ? 1 : 0 })}
                  className="rounded border-neutral-800 text-[#d4a359] focus:ring-[#d4a359]"
                />
                <label htmlFor="is_active_check" className="text-xs text-neutral-300 font-semibold cursor-pointer">
                  Publish FAQ immediately on Home Page
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#d4a359] hover:bg-[#e5b364] text-[#080f1a] font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer shadow-lg shadow-[#d4a359]/20"
                >
                  {editingFaq ? 'Save Changes' : 'Add FAQ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
