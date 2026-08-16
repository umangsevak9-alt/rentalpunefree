import { useState, useEffect } from 'react';
import { useAppStore } from '../../store/index.js';
import { VisitFeedback } from '../../types.js';
import { formatINR } from '../../utils/currency.js';
import { 
  Flame, 
  Search, 
  Filter, 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  Mail, 
  Building, 
  DollarSign,
  IndianRupee,
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp, 
  Sparkles, 
  RefreshCw,
  X,
  FileSpreadsheet,
  LayoutGrid,
  Table as TableIcon,
  Trash2
} from 'lucide-react';

export default function Feedback() {
  const { user, token } = useAppStore();
  const [feedbacks, setFeedbacks] = useState<VisitFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [interestFilter, setInterestFilter] = useState<string>('ALL');
  const [timelineFilter, setTimelineFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [selectedFeedback, setSelectedFeedback] = useState<VisitFeedback | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchFeedbacks = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/feedbacks', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFeedbacks(data);
      }
    } catch (err) {
      console.error('Error fetching feedbacks:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFeedback = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this feedback review?')) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/feedbacks/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setSelectedFeedback(null);
        fetchFeedbacks();
      }
    } catch (err) {
      console.error('Error deleting feedback:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    fetchFeedbacks();
  }, [token]);

  // Calculations for KPI cards
  const totalCount = feedbacks.length;
  const hotCount = feedbacks.filter(f => f.interest_level === 'Hot').length;
  const warmCount = feedbacks.filter(f => f.interest_level === 'Warm').length;
  const coldCount = feedbacks.filter(f => f.interest_level === 'Cold').length;
  const totalBudget = feedbacks.reduce((sum, f) => sum + (f.budget || 0), 0);
  const avgBudget = totalCount > 0 && totalBudget > 0 ? Math.round(totalBudget / feedbacks.filter(f => f.budget).length) : 0;

  // Filtered feedbacks
  const filteredFeedbacks = feedbacks.filter(f => {
    const matchesSearch = 
      (f.lead_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (f.lead_phone || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (f.lead_email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (f.property_title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (f.agent_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (f.customer_feedback || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (f.requirements || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (f.next_action || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesInterest = interestFilter === 'ALL' || f.interest_level === interestFilter;
    const matchesTimeline = timelineFilter === 'ALL' || (f.timeline && f.timeline.includes(timelineFilter));

    return matchesSearch && matchesInterest && matchesTimeline;
  });

  const getInterestBadge = (level: string) => {
    switch (level) {
      case 'Hot':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold bg-red-600/20 text-red-400 border border-red-600/40 space-x-1.5 shadow-sm shadow-red-600/20">
            <Flame className="w-3.5 h-3.5 text-red-500 fill-red-500" />
            <span>Hot Lead</span>
          </span>
        );
      case 'Warm':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/40 space-x-1.5 shadow-sm shadow-amber-500/20">
            <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
            <span>Warm Lead</span>
          </span>
        );
      case 'Cold':
      default:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold bg-blue-500/20 text-blue-300 border border-blue-500/40 space-x-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-blue-400" />
            <span>Cold / Exploring</span>
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-800 pb-6">
        <div>
          <div className="flex items-center space-x-3 mb-1">
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Agent Visit Feedback</h1>
            <span className="px-3 py-0.5 rounded-full bg-red-600/20 text-red-400 border border-red-600/40 text-xs font-bold">
              {totalCount} Total Reviews
            </span>
          </div>
          <p className="text-sm text-neutral-400">
            Review detailed client feedback, budget specifications, and required next actions submitted by field agents.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchFeedbacks}
            className="flex items-center px-4 py-2.5 bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white rounded-xl text-sm font-bold hover:bg-neutral-800 transition-colors shadow-sm cursor-pointer"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin text-red-500' : ''}`} />
            Refresh
          </button>
          
          <div className="flex bg-neutral-900 border border-neutral-800 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('cards')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'cards' ? 'bg-red-600 text-white shadow-sm' : 'text-neutral-400 hover:text-white'}`}
              title="Card View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'table' ? 'bg-red-600 text-white shadow-sm' : 'text-neutral-400 hover:text-white'}`}
              title="Table View"
            >
              <TableIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-neutral-950 p-5 rounded-2xl border border-neutral-800 text-white shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Total Feedback</span>
            <div className="w-8 h-8 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center text-white">
              <CheckCircle2 className="w-4 h-4 text-neutral-300" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-white">{totalCount}</p>
          <p className="text-xs text-neutral-500 mt-1">Completed agent site tours</p>
        </div>

        <div className="bg-neutral-950 p-5 rounded-2xl border border-red-900/40 text-white shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-red-400 flex items-center space-x-1">
              <Flame className="w-3.5 h-3.5 text-red-500 fill-red-500" />
              <span>Hot Prospects</span>
            </span>
            <div className="w-8 h-8 rounded-lg bg-red-950/60 border border-red-600/30 flex items-center justify-center text-red-500">
              <Flame className="w-4 h-4 text-red-500" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-white">{hotCount}</p>
          <p className="text-xs text-red-400/80 mt-1">High conversion intent</p>
        </div>

        <div className="bg-neutral-950 p-5 rounded-2xl border border-amber-900/40 text-white shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Warm Inquiries</span>
            <div className="w-8 h-8 rounded-lg bg-amber-950/60 border border-amber-600/30 flex items-center justify-center text-amber-500">
              <TrendingUp className="w-4 h-4 text-amber-500" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-white">{warmCount}</p>
          <p className="text-xs text-amber-400/80 mt-1">Comparing & evaluating</p>
        </div>

        <div className="bg-neutral-950 p-5 rounded-2xl border border-blue-900/40 text-white shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-400">Cold / Early</span>
            <div className="w-8 h-8 rounded-lg bg-blue-950/60 border border-blue-600/30 flex items-center justify-center text-blue-400">
              <AlertCircle className="w-4 h-4 text-blue-400" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-white">{coldCount}</p>
          <p className="text-xs text-blue-400/80 mt-1">Requires nurture cycle</p>
        </div>

        <div className="bg-neutral-950 p-5 rounded-2xl border border-neutral-800 text-white shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Avg Budget</span>
            <div className="w-8 h-8 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center text-red-500">
              <IndianRupee className="w-4 h-4 text-red-500" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-white truncate">
            {avgBudget > 0 ? formatINR(avgBudget) : 'N/A'}
          </p>
          <p className="text-xs text-neutral-500 mt-1">Target buying power</p>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-neutral-950 p-4 rounded-2xl border border-neutral-800 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-neutral-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by client name, agent, phone, property title, or requirements..."
              className="w-full pl-10 pr-4 py-2.5 bg-black border border-neutral-800 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-red-600"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-3.5 top-3 text-neutral-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Interest Filter Buttons */}
          <div className="flex flex-wrap gap-1.5 items-center bg-black p-1 rounded-xl border border-neutral-800">
            {['ALL', 'Hot', 'Warm', 'Cold'].map((level) => (
              <button
                key={level}
                onClick={() => setInterestFilter(level)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  interestFilter === level 
                    ? 'bg-red-600 text-white shadow-md shadow-red-600/30' 
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                }`}
              >
                {level === 'ALL' ? 'All Leads' : level}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content Rendering */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-neutral-400">Loading agent feedback records...</p>
        </div>
      ) : filteredFeedbacks.length === 0 ? (
        <div className="bg-neutral-950 border border-neutral-800 rounded-3xl p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-neutral-900 border border-neutral-800 mx-auto flex items-center justify-center text-neutral-500">
            <Filter className="w-8 h-8 text-neutral-500" />
          </div>
          <h3 className="text-xl font-bold text-white">No Feedback Found</h3>
          <p className="text-neutral-400 text-sm max-w-md mx-auto">
            {searchTerm || interestFilter !== 'ALL' 
              ? 'No agent feedback matched your current filters. Try resetting your search query.'
              : 'Field agents will appear here once they complete scheduled site visits and submit their tour remarks.'}
          </p>
          {(searchTerm || interestFilter !== 'ALL') && (
            <button
              onClick={() => { setSearchTerm(''); setInterestFilter('ALL'); }}
              className="px-4 py-2 bg-neutral-900 border border-neutral-800 text-white rounded-xl text-xs font-bold hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : viewMode === 'cards' ? (
        /* CARDS VIEW */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredFeedbacks.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedFeedback(item)}
              className="bg-neutral-950 border border-neutral-800 hover:border-red-600/60 rounded-3xl p-6 transition-all duration-200 hover:shadow-2xl hover:shadow-red-600/10 cursor-pointer flex flex-col justify-between space-y-5 group"
            >
              {/* Top Row: Lead & Interest */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-red-500 font-black text-lg group-hover:border-red-600/40 transition-colors flex-shrink-0">
                    {item.lead_name ? item.lead_name.charAt(0).toUpperCase() : 'C'}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-extrabold text-white text-lg group-hover:text-red-400 transition-colors truncate">
                      {item.lead_name || 'Anonymous Client'}
                    </h3>
                    <div className="flex items-center space-x-3 text-xs text-neutral-400 mt-0.5">
                      <span className="flex items-center text-neutral-400">
                        <Phone className="w-3 h-3 mr-1 text-red-500" />
                        {item.lead_phone || 'No phone'}
                      </span>
                      {item.lead_email && (
                        <span className="hidden sm:flex items-center text-neutral-500 truncate">
                          <Mail className="w-3 h-3 mr-1 text-neutral-400" />
                          {item.lead_email}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex-shrink-0">
                  {getInterestBadge(item.interest_level)}
                </div>
              </div>

              {/* Property & Agent Context */}
              <div className="bg-black/60 border border-neutral-900 p-3.5 rounded-2xl space-y-2 text-xs">
                <div className="flex justify-between items-center text-neutral-300">
                  <div className="flex items-center space-x-2 truncate">
                    <Building className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                    <span className="font-bold text-white truncate">{item.property_title || `Property #${item.visit_id}`}</span>
                  </div>
                  {item.property_price && (
                    <span className="font-extrabold text-red-400 flex-shrink-0">{formatINR(Number(item.property_price))}</span>
                  )}
                </div>

                <div className="flex justify-between items-center text-neutral-500 border-t border-neutral-900 pt-2">
                  <span className="flex items-center">
                    <User className="w-3 h-3 mr-1.5 text-neutral-400" />
                    Agent: <strong className="text-neutral-300 ml-1">{item.agent_name || 'Staff Agent'}</strong>
                  </span>
                  <span className="flex items-center">
                    <Calendar className="w-3 h-3 mr-1 text-neutral-400" />
                    {item.visit_date} {item.visit_time ? `• ${item.visit_time}` : ''}
                  </span>
                </div>
              </div>

              {/* Customer Feedback Body */}
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Customer Feedback:</span>
                <p className="text-sm text-neutral-200 bg-neutral-900/80 p-3.5 rounded-2xl border border-neutral-800/80 leading-relaxed italic">
                  "{item.customer_feedback}"
                </p>
              </div>

              {/* Specs & Timeline Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                <div className="bg-black p-2.5 rounded-xl border border-neutral-900">
                  <span className="text-neutral-500 block text-[10px] uppercase font-bold">Client Budget</span>
                  <span className="font-bold text-white">
                    {item.budget ? formatINR(Number(item.budget)) : 'Flexible'}
                  </span>
                </div>

                <div className="bg-black p-2.5 rounded-xl border border-neutral-900">
                  <span className="text-neutral-500 block text-[10px] uppercase font-bold">Timeline</span>
                  <span className="font-bold text-neutral-300 truncate block">
                    {item.timeline || 'Not specified'}
                  </span>
                </div>

                <div className="bg-black p-2.5 rounded-xl border border-neutral-900 col-span-2 sm:col-span-1">
                  <span className="text-neutral-500 block text-[10px] uppercase font-bold">Configuration</span>
                  <span className="font-bold text-neutral-300 truncate block">
                    {item.preferred_configuration || 'Any'}
                  </span>
                </div>
              </div>

              {/* Next Action Box */}
              {item.next_action && (
                <div className="bg-red-950/40 border border-red-600/30 p-3 rounded-2xl flex items-start space-x-2.5 text-xs text-red-300">
                  <ArrowRight className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-white block">Next Action Required:</span>
                    <p className="text-neutral-300 mt-0.5">{item.next_action}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-neutral-950 rounded-3xl border border-neutral-800 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-black border-b border-neutral-800 text-xs font-bold uppercase tracking-wider text-neutral-400">
                  <th className="px-6 py-4">Client / Lead</th>
                  <th className="px-6 py-4">Property</th>
                  <th className="px-6 py-4">Interest</th>
                  <th className="px-6 py-4">Budget</th>
                  <th className="px-6 py-4">Timeline</th>
                  <th className="px-6 py-4">Agent</th>
                  <th className="px-6 py-4">Tour Date</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-900 text-sm">
                {filteredFeedbacks.map((item) => (
                  <tr 
                    key={item.id} 
                    onClick={() => setSelectedFeedback(item)}
                    className="hover:bg-neutral-900/60 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <div className="font-bold text-white">{item.lead_name || 'Client'}</div>
                      <div className="text-xs text-neutral-500">{item.lead_phone}</div>
                    </td>
                    <td className="px-6 py-4 text-neutral-300 font-medium max-w-[200px] truncate">
                      {item.property_title || `Prop #${item.visit_id}`}
                    </td>
                    <td className="px-6 py-4">
                      {getInterestBadge(item.interest_level)}
                    </td>
                    <td className="px-6 py-4 font-bold text-white">
                      {item.budget ? formatINR(Number(item.budget)) : '—'}
                    </td>
                    <td className="px-6 py-4 text-neutral-400 text-xs">
                      {item.timeline || 'Flexible'}
                    </td>
                    <td className="px-6 py-4 text-neutral-300">
                      {item.agent_name || 'Staff Agent'}
                    </td>
                    <td className="px-6 py-4 text-neutral-400 text-xs">
                      {item.visit_date}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFeedback(item);
                        }}
                        className="text-xs font-bold text-red-500 hover:text-red-400 underline"
                      >
                        View Full Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DETAIL MODAL FOR FEEDBACK */}
      {selectedFeedback && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-950 border border-neutral-800 text-white rounded-3xl max-w-2xl w-full p-6 md:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto space-y-6 animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-neutral-800 pb-4">
              <div>
                <div className="flex items-center space-x-3">
                  <h2 className="text-2xl font-black text-white">Site Visit Review</h2>
                  {getInterestBadge(selectedFeedback.interest_level)}
                </div>
                <p className="text-xs text-neutral-400 mt-1">
                  Submitted for Site Visit #{selectedFeedback.visit_id} on {selectedFeedback.created_at ? new Date(selectedFeedback.created_at).toLocaleDateString() : selectedFeedback.visit_date}
                </p>
              </div>
              <button 
                onClick={() => setSelectedFeedback(null)}
                className="p-2 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white hover:border-red-600 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Client & Agent Profiles */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-black p-4 rounded-2xl border border-neutral-900 space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 block">Lead Details</span>
                <p className="font-extrabold text-white text-base">{selectedFeedback.lead_name || 'Client'}</p>
                <div className="space-y-1 text-xs">
                  <a href={`tel:${selectedFeedback.lead_phone}`} className="flex items-center text-neutral-300 hover:text-red-400">
                    <Phone className="w-3.5 h-3.5 mr-2 text-red-500" />
                    {selectedFeedback.lead_phone || 'No phone'}
                  </a>
                  {selectedFeedback.lead_email && (
                    <a href={`mailto:${selectedFeedback.lead_email}`} className="flex items-center text-neutral-400 hover:text-white">
                      <Mail className="w-3.5 h-3.5 mr-2 text-neutral-500" />
                      {selectedFeedback.lead_email}
                    </a>
                  )}
                </div>
              </div>

              <div className="bg-black p-4 rounded-2xl border border-neutral-900 space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 block">Agent & Tour Time</span>
                <p className="font-extrabold text-white text-base">{selectedFeedback.agent_name || 'Staff Agent'}</p>
                <div className="space-y-1 text-xs text-neutral-400">
                  <p className="flex items-center">
                    <Calendar className="w-3.5 h-3.5 mr-2 text-neutral-500" />
                    Visit Date: <strong className="text-neutral-300 ml-1">{selectedFeedback.visit_date} ({selectedFeedback.visit_time || 'N/A'})</strong>
                  </p>
                  {selectedFeedback.agent_email && (
                    <p className="flex items-center">
                      <Mail className="w-3.5 h-3.5 mr-2 text-neutral-500" />
                      {selectedFeedback.agent_email}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Property Card */}
            <div className="bg-neutral-900/60 p-4 rounded-2xl border border-neutral-800 flex justify-between items-center">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block">Property Visited</span>
                <h4 className="text-base font-bold text-white">{selectedFeedback.property_title || `Property #${selectedFeedback.visit_id}`}</h4>
                {selectedFeedback.property_location && (
                  <p className="text-xs text-neutral-400">{selectedFeedback.property_location}</p>
                )}
              </div>
              {selectedFeedback.property_price && (
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block">Listing Price</span>
                  <span className="text-lg font-black text-red-500">{formatINR(Number(selectedFeedback.property_price))}</span>
                </div>
              )}
            </div>

            {/* Feedback Text */}
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Verbatim Client Feedback:</span>
              <div className="bg-black p-4 rounded-2xl border border-neutral-800 text-sm text-neutral-200 leading-relaxed italic">
                "{selectedFeedback.customer_feedback}"
              </div>
            </div>

            {/* Requirements & Budget Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="bg-black p-3.5 rounded-2xl border border-neutral-800">
                <span className="text-neutral-500 block uppercase font-bold text-[10px]">Stated Budget</span>
                <span className="text-base font-black text-white">
                  {selectedFeedback.budget ? formatINR(Number(selectedFeedback.budget)) : 'Flexible'}
                </span>
              </div>
              <div className="bg-black p-3.5 rounded-2xl border border-neutral-800">
                <span className="text-neutral-500 block uppercase font-bold text-[10px]">Purchase Timeline</span>
                <span className="text-sm font-bold text-neutral-200">
                  {selectedFeedback.timeline || 'Flexible'}
                </span>
              </div>
              <div className="bg-black p-3.5 rounded-2xl border border-neutral-800">
                <span className="text-neutral-500 block uppercase font-bold text-[10px]">Preferred Configuration</span>
                <span className="text-sm font-bold text-neutral-200">
                  {selectedFeedback.preferred_configuration || 'Standard'}
                </span>
              </div>
            </div>

            {selectedFeedback.requirements && (
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Specific Requirements:</span>
                <p className="text-xs text-neutral-300 bg-black p-3 rounded-xl border border-neutral-800">
                  {selectedFeedback.requirements}
                </p>
              </div>
            )}

            {/* Action Required */}
            {selectedFeedback.next_action && (
              <div className="bg-red-950/80 border border-red-600/50 p-4 rounded-2xl space-y-1">
                <div className="flex items-center space-x-2 text-red-400 font-bold text-xs uppercase tracking-wider">
                  <ArrowRight className="w-4 h-4 text-red-500" />
                  <span>Action Required / Next Steps</span>
                </div>
                <p className="text-white text-sm font-medium">
                  {selectedFeedback.next_action}
                </p>
              </div>
            )}

            {/* Modal Footer Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-neutral-800">
              <div>
                {(user?.role === 'MAIN_ADMIN' || user?.role === 'ADMIN') && (
                  <button
                    onClick={() => handleDeleteFeedback(selectedFeedback.id)}
                    disabled={isDeleting}
                    className="px-4 py-2.5 bg-red-950/50 hover:bg-red-900/80 border border-red-800/60 text-red-400 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{isDeleting ? 'Deleting...' : 'Delete Review'}</span>
                  </button>
                )}
              </div>

              <div className="flex items-center space-x-3">
                {selectedFeedback.lead_phone && (
                  <a
                    href={`tel:${selectedFeedback.lead_phone}`}
                    className="px-4 py-2.5 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 transition-colors shadow-md shadow-red-600/30 flex items-center space-x-2"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call {selectedFeedback.lead_name || 'Client'}</span>
                  </a>
                )}
                <button
                  onClick={() => setSelectedFeedback(null)}
                  className="px-5 py-2.5 bg-neutral-900 border border-neutral-800 text-white rounded-xl text-xs font-bold hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  Close Review
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
