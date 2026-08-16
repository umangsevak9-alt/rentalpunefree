import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../../store/index.js';
import { Visit, Lead, Property, User } from '../../types.js';
import { formatINR } from '../../utils/currency.js';
import { 
  Plus, 
  Trash2, 
  Calendar, 
  Clock, 
  User as UserIcon, 
  Building, 
  AlertTriangle, 
  X, 
  Search, 
  Filter, 
  ArrowRight, 
  Flame, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2,
  RefreshCw,
  Phone,
  Edit2,
  CheckSquare,
  Square,
  ArrowUpDown,
  FileSpreadsheet,
  Check
} from 'lucide-react';

export default function Visits() {
  const { user, token } = useAppStore();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [agents, setAgents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter, Search and Date states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<string>('ALL');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'NEWEST' | 'OLDEST'>('NEWEST');

  // Multi-Selection State for Bulk Actions
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [bulkActionMessage, setBulkActionMessage] = useState<string | null>(null);

  // Add / Edit Modal state
  const [isAdding, setIsAdding] = useState(false);
  const [editingVisit, setEditingVisit] = useState<Visit | null>(null);
  const [formData, setFormData] = useState({ 
    lead_id: '', 
    property_id: '', 
    agent_id: '', 
    visit_date: '', 
    visit_time: '', 
    status: 'Scheduled',
    notes: '' 
  });

  // Delete modal state
  const [deleteConfirmVisit, setDeleteConfirmVisit] = useState<Visit | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Feedback modal state
  const [selectedVisitId, setSelectedVisitId] = useState<number | null>(null);
  const [viewingFeedbackVisit, setViewingFeedbackVisit] = useState<Visit | null>(null);
  const [feedbackForm, setFeedbackForm] = useState({ 
    interest_level: 'Hot', 
    customer_feedback: '', 
    requirements: '', 
    budget: '', 
    preferred_configuration: '', 
    timeline: 'Immediate (0-1 month)', 
    next_action: '' 
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [visitsRes, leadsRes, propsRes, agentsRes] = await Promise.all([
        fetch('/api/visits', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/leads', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/properties'),
        fetch('/api/agents', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      if (visitsRes.ok) setVisits(await visitsRes.json());
      if (leadsRes.ok) setLeads(await leadsRes.json());
      if (propsRes.ok) setProperties(await propsRes.json());
      if (agentsRes.ok) setAgents(await agentsRes.json());
    } catch (err) {
      console.error('Error fetching site visits data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const openAddModal = () => {
    setEditingVisit(null);
    setFormData({
      lead_id: leads[0] ? String(leads[0].id) : '',
      property_id: properties[0] ? String(properties[0].id) : '',
      agent_id: agents[0] ? String(agents[0].id) : '',
      visit_date: new Date().toISOString().split('T')[0],
      visit_time: '11:00 AM',
      status: 'Scheduled',
      notes: ''
    });
    setIsAdding(true);
  };

  const openEditModal = (visit: Visit) => {
    setEditingVisit(visit);
    setFormData({
      lead_id: visit.lead_id ? String(visit.lead_id) : '',
      property_id: visit.property_id ? String(visit.property_id) : '',
      agent_id: visit.agent_id ? String(visit.agent_id) : '',
      visit_date: visit.visit_date || '',
      visit_time: visit.visit_time || '',
      status: visit.status || 'Scheduled',
      notes: visit.notes || ''
    });
    setIsAdding(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingVisit) {
        await fetch(`/api/visits/${editingVisit.id}`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
          },
          body: JSON.stringify(formData)
        });
      } else {
        await fetch('/api/visits', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
          },
          body: JSON.stringify(formData)
        });
      }
      setIsAdding(false);
      setEditingVisit(null);
      fetchData();
    } catch (err) {
      console.error('Error saving site visit:', err);
    }
  };

  const handleDeleteVisit = async () => {
    if (!deleteConfirmVisit) return;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      const res = await fetch(`/api/visits/${deleteConfirmVisit.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        setSelectedIds(prev => prev.filter(id => id !== deleteConfirmVisit.id));
        setDeleteConfirmVisit(null);
        fetchData();
      } else {
        const errorData = await res.json();
        setDeleteError(errorData?.error || 'Failed to delete site visit.');
      }
    } catch (err) {
      console.error('Error deleting site visit:', err);
      setDeleteError('Network error while deleting site visit.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Bulk Delete Site Visits Handler
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsBulkDeleting(true);
    try {
      const res = await fetch('/api/visits/bulk-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ids: selectedIds })
      });

      if (res.ok) {
        const data = await res.json();
        setBulkActionMessage(data.message || `Successfully deleted ${selectedIds.length} site visits.`);
        setTimeout(() => setBulkActionMessage(null), 4000);
        setSelectedIds([]);
        setShowBulkDeleteModal(false);
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to bulk delete site visits');
      }
    } catch (err) {
      console.error('Error in bulk deleting site visits:', err);
      alert('Network error while performing bulk delete');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVisitId) return;
    try {
      await fetch(`/api/visits/${selectedVisitId}/feedback`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(feedbackForm)
      });
      setSelectedVisitId(null);
      fetchData();
    } catch (err) {
      console.error('Error submitting feedback:', err);
    }
  };

  // Check if date string matches filter criteria
  const isDateMatching = (visitDateStr?: string) => {
    if (!visitDateStr || dateFilter === 'ALL') return true;
    const itemDate = new Date(visitDateStr);
    if (isNaN(itemDate.getTime())) return true;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrowStart = new Date(todayStart.getTime() + 86400000);
    const yesterdayStart = new Date(todayStart.getTime() - 86400000);

    if (dateFilter === 'TODAY') {
      return itemDate >= todayStart && itemDate < tomorrowStart;
    }
    if (dateFilter === 'YESTERDAY') {
      return itemDate >= yesterdayStart && itemDate < todayStart;
    }
    if (dateFilter === 'LAST_7_DAYS') {
      const sevenDaysAgo = new Date(todayStart.getTime() - 7 * 86400000);
      return itemDate >= sevenDaysAgo && itemDate < tomorrowStart;
    }
    if (dateFilter === 'THIS_MONTH') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return itemDate >= startOfMonth && itemDate < tomorrowStart;
    }
    if (dateFilter === 'CUSTOM') {
      if (customStartDate) {
        const start = new Date(customStartDate + 'T00:00:00');
        if (itemDate < start) return false;
      }
      if (customEndDate) {
        const end = new Date(customEndDate + 'T23:59:59');
        if (itemDate > end) return false;
      }
      return true;
    }
    return true;
  };

  // Filtered & Sorted Visits
  const filteredVisits = useMemo(() => {
    const list = visits.filter(v => {
      const matchesSearch = 
        (v.lead_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (v.lead_phone || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (v.property_title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (v.agent_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (v.visit_date || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (v.notes || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'ALL' || v.status === statusFilter;
      const matchesDate = isDateMatching(v.visit_date);

      return matchesSearch && matchesStatus && matchesDate;
    });

    return list.sort((a, b) => {
      const timeA = a.visit_date ? new Date(a.visit_date).getTime() : 0;
      const timeB = b.visit_date ? new Date(b.visit_date).getTime() : 0;
      return sortOrder === 'NEWEST' ? timeB - timeA : timeA - timeB;
    });
  }, [visits, searchTerm, statusFilter, dateFilter, customStartDate, customEndDate, sortOrder]);

  // Selection Helpers
  const isAllSelected = filteredVisits.length > 0 && filteredVisits.every(v => selectedIds.includes(v.id));
  const isSomeSelected = filteredVisits.some(v => selectedIds.includes(v.id)) && !isAllSelected;

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      const filteredVisitIds = new Set(filteredVisits.map(v => v.id));
      setSelectedIds(prev => prev.filter(id => !filteredVisitIds.has(id)));
    } else {
      const filteredVisitIds = filteredVisits.map(v => v.id);
      setSelectedIds(prev => Array.from(new Set([...prev, ...filteredVisitIds])));
    }
  };

  const handleToggleSelectRow = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const exportToCSV = () => {
    const dataToExport = selectedIds.length > 0
      ? visits.filter(v => selectedIds.includes(v.id))
      : (filteredVisits.length > 0 ? filteredVisits : visits);

    if (dataToExport.length === 0) {
      alert('No site visits available to export.');
      return;
    }

    const headers = [
      'Visit ID',
      'Client Name',
      'Client Phone',
      'Property',
      'Visit Date',
      'Visit Time',
      'Assigned Agent',
      'Status',
      'Interest Level',
      'Feedback'
    ];

    const rows = dataToExport.map(v => [
      v.id,
      `"${(v.lead_name || `Lead #${v.lead_id}`).replace(/"/g, '""')}"`,
      `"${(v.lead_phone || '').replace(/"/g, '""')}"`,
      `"${(v.property_title || `Property #${v.property_id}`).replace(/"/g, '""')}"`,
      `"${v.visit_date || ''}"`,
      `"${v.visit_time || ''}"`,
      `"${(v.agent_name || 'Unassigned').replace(/"/g, '""')}"`,
      `"${v.status || 'Scheduled'}"`,
      `"${v.interest_level || 'Pending Review'}"`,
      `"${(v.customer_feedback || v.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `rental_pune_site_visits_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalVisits = visits.length;
  const scheduledCount = visits.filter(v => v.status === 'Scheduled').length;
  const completedCount = visits.filter(v => v.status === 'Completed').length;
  const hotCount = visits.filter(v => v.interest_level === 'Hot').length;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header & Main Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-5">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Site Visits Management</h1>
            <span className="px-3 py-0.5 rounded-full bg-[#d4a359]/20 text-[#d4a359] border border-[#d4a359]/30 text-xs font-bold">
              {totalVisits} Total
            </span>
          </div>
          <p className="text-sm text-neutral-400 mt-1">
            Manage scheduled walkthroughs, filter by visit dates, assign field agents, and execute bulk operations.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={exportToCSV}
            className="inline-flex items-center space-x-2 px-4 py-2.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-xl font-bold text-xs transition-all shadow-md cursor-pointer hover:border-emerald-500/60"
            title="Download CSV spreadsheet of site visits"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>{selectedIds.length > 0 ? `Export Selected (${selectedIds.length})` : 'Export CSV'}</span>
          </button>

          <button
            onClick={fetchData}
            className="flex items-center px-4 py-2.5 bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white rounded-xl text-xs font-bold hover:bg-neutral-800 transition-colors shadow-sm cursor-pointer"
            title="Refresh list"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-2 ${loading ? 'animate-spin text-[#d4a359]' : ''}`} />
            Refresh
          </button>

          {(user?.role === 'MAIN_ADMIN' || user?.role === 'ADMIN') && (
            <button 
              onClick={openAddModal}
              className="flex items-center px-5 py-2.5 bg-[#d4a359] hover:bg-[#e5b364] text-[#080f1a] rounded-xl font-bold text-xs uppercase tracking-wider shadow-lg shadow-[#d4a359]/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              <span>Schedule Visit</span>
            </button>
          )}
        </div>
      </div>

      {/* Success Notification Banner */}
      {bulkActionMessage && (
        <div className="p-3.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold rounded-2xl flex items-center justify-between animate-in fade-in duration-150">
          <div className="flex items-center space-x-2">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{bulkActionMessage}</span>
          </div>
          <button onClick={() => setBulkActionMessage(null)} className="text-emerald-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Floating / Sticky Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="p-4 bg-red-950/40 border border-red-600/40 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-2xl animate-in slide-in-from-top duration-200">
          <div className="flex items-center space-x-3">
            <span className="flex items-center justify-center w-7 h-7 rounded-xl bg-red-600 text-white font-black text-xs">
              {selectedIds.length}
            </span>
            <div>
              <p className="text-xs font-bold text-white">
                {selectedIds.length} {selectedIds.length === 1 ? 'Site Visit' : 'Site Visits'} Selected
              </p>
              <p className="text-[11px] text-neutral-400">
                You can delete or export selected visit records in bulk from the database.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setSelectedIds([])}
              className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white rounded-xl text-xs font-bold transition-all border border-neutral-800 cursor-pointer"
            >
              Clear Selection
            </button>
            <button
              onClick={() => setShowBulkDeleteModal(true)}
              className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-red-600/30 flex items-center space-x-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected ({selectedIds.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* KPI Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-neutral-950 p-5 rounded-2xl border border-neutral-800 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Total Visits</span>
            <div className="w-8 h-8 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center text-white">
              <Calendar className="w-4 h-4 text-neutral-300" />
            </div>
          </div>
          <p className="text-3xl font-black text-white">{totalVisits}</p>
          <p className="text-xs text-neutral-500 mt-1">Total visits booked</p>
        </div>

        <div className="bg-neutral-950 p-5 rounded-2xl border border-blue-900/40 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-400">Upcoming / Scheduled</span>
            <div className="w-8 h-8 rounded-lg bg-blue-950/60 border border-blue-600/30 flex items-center justify-center text-blue-400">
              <Clock className="w-4 h-4 text-blue-400" />
            </div>
          </div>
          <p className="text-3xl font-black text-blue-400">{scheduledCount}</p>
          <p className="text-xs text-blue-300/80 mt-1">Pending walkthroughs</p>
        </div>

        <div className="bg-neutral-950 p-5 rounded-2xl border border-emerald-900/40 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Completed Tours</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-950/60 border border-emerald-600/30 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
          <p className="text-3xl font-black text-emerald-400">{completedCount}</p>
          <p className="text-xs text-emerald-300/80 mt-1">Conducted with clients</p>
        </div>

        <div className="bg-neutral-950 p-5 rounded-2xl border border-[#d4a359]/40 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#d4a359] flex items-center space-x-1">
              <Flame className="w-3.5 h-3.5 text-[#d4a359] fill-[#d4a359]" />
              <span>Hot Interest</span>
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#d4a359]/20 border border-[#d4a359]/30 flex items-center justify-center text-[#d4a359]">
              <Flame className="w-4 h-4 text-[#d4a359]" />
            </div>
          </div>
          <p className="text-3xl font-black text-[#d4a359]">{hotCount}</p>
          <p className="text-xs text-[#d4a359]/80 mt-1">High conversion potential</p>
        </div>
      </div>

      {/* Filter, Search and Date Section */}
      <div className="bg-neutral-950 p-4 rounded-3xl border border-neutral-800 space-y-4 shadow-xl">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <input
              type="text"
              placeholder="Search by client, property, agent, or notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-black border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#d4a359] transition-colors"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2 w-full md:w-auto justify-end">
            <span className="text-xs font-bold text-neutral-500 uppercase">Sort Date:</span>
            <button
              onClick={() => setSortOrder(prev => prev === 'NEWEST' ? 'OLDEST' : 'NEWEST')}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-[#d4a359]" />
              <span>{sortOrder === 'NEWEST' ? 'Newest First' : 'Oldest First'}</span>
            </button>
          </div>
        </div>

        {/* Status Filter Pills */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1">
          <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider mr-2 whitespace-nowrap">
            Status:
          </span>
          {['ALL', 'Scheduled', 'Completed', 'Cancelled'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                statusFilter === status
                  ? 'bg-[#d4a359] text-[#080f1a] shadow-md shadow-[#d4a359]/20'
                  : 'bg-neutral-900 text-neutral-400 hover:text-white hover:bg-neutral-800 border border-neutral-800'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Date Filter Section */}
        <div className="pt-3 border-t border-neutral-900 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2 overflow-x-auto pb-1">
            <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider flex items-center space-x-1 whitespace-nowrap mr-1">
              <Calendar className="w-3.5 h-3.5 text-[#d4a359]" />
              <span>Date Filter:</span>
            </span>

            {[
              { id: 'ALL', label: 'All Dates' },
              { id: 'TODAY', label: 'Today' },
              { id: 'YESTERDAY', label: 'Yesterday' },
              { id: 'LAST_7_DAYS', label: 'Last 7 Days' },
              { id: 'THIS_MONTH', label: 'This Month' },
              { id: 'CUSTOM', label: 'Custom Range' },
            ].map(df => (
              <button
                key={df.id}
                onClick={() => setDateFilter(df.id)}
                className={`px-3 py-1.2 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer ${
                  dateFilter === df.id
                    ? 'bg-neutral-800 text-white border border-neutral-700'
                    : 'bg-black text-neutral-400 border border-neutral-900 hover:text-white'
                }`}
              >
                {df.label}
              </button>
            ))}
          </div>

          {dateFilter === 'CUSTOM' && (
            <div className="flex items-center space-x-2 bg-black p-1.5 rounded-xl border border-neutral-800">
              <span className="text-[11px] text-neutral-400 font-bold">From:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={e => setCustomStartDate(e.target.value)}
                className="bg-neutral-950 border border-neutral-800 rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:border-[#d4a359]"
              />
              <span className="text-[11px] text-neutral-400 font-bold">To:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={e => setCustomEndDate(e.target.value)}
                className="bg-neutral-950 border border-neutral-800 rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:border-[#d4a359]"
              />
            </div>
          )}

          <div className="text-neutral-400 font-mono text-[11px] ml-auto">
            Showing <strong className="text-white">{filteredVisits.length}</strong> of {visits.length} visits
          </div>
        </div>
      </div>

      {/* Main Visits Table View */}
      <div className="bg-neutral-950 rounded-3xl border border-neutral-800 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black/90 border-b border-neutral-800">
                {/* Select All Checkbox */}
                <th className="px-4 py-4 w-12 text-center">
                  <button
                    onClick={handleToggleSelectAll}
                    className="p-1 rounded text-neutral-400 hover:text-white cursor-pointer transition-colors"
                    title={isAllSelected ? "Deselect all" : "Select all filtered visits"}
                  >
                    {isAllSelected ? (
                      <CheckSquare className="w-4 h-4 text-[#d4a359]" />
                    ) : isSomeSelected ? (
                      <div className="w-4 h-4 bg-[#d4a359]/30 border border-[#d4a359] rounded flex items-center justify-center">
                        <div className="w-2 h-0.5 bg-white" />
                      </div>
                    ) : (
                      <Square className="w-4 h-4 text-neutral-600" />
                    )}
                  </button>
                </th>
                <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-neutral-400">Date & Time</th>
                <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-neutral-400">Client / Lead</th>
                <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-neutral-400">Property</th>
                <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-neutral-400">Assigned Agent</th>
                <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-neutral-400">Status & Intent</th>
                <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-neutral-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-900">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-neutral-400">
                    <div className="w-6 h-6 border-2 border-[#d4a359] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading visits...
                  </td>
                </tr>
              ) : filteredVisits.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-neutral-500">
                    <Calendar className="w-10 h-10 mx-auto text-neutral-700 mb-2" />
                    <p className="text-sm font-bold text-neutral-400">No site visits found</p>
                    <p className="text-xs text-neutral-600 mt-1">Try adjusting your date filters or search query.</p>
                  </td>
                </tr>
              ) : (
                filteredVisits.map(visit => {
                  const isSelected = selectedIds.includes(visit.id);

                  return (
                    <tr 
                      key={visit.id} 
                      className={`transition-colors ${isSelected ? 'bg-[#d4a359]/10' : 'hover:bg-neutral-900/60'}`}
                    >
                      {/* Row Checkbox */}
                      <td className="px-4 py-4 text-center">
                        <button
                          onClick={() => handleToggleSelectRow(visit.id)}
                          className="p-1 text-neutral-400 hover:text-white cursor-pointer transition-colors"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-[#d4a359]" />
                          ) : (
                            <Square className="w-4 h-4 text-neutral-700 hover:text-neutral-400" />
                          )}
                        </button>
                      </td>
                      
                      <td className="px-5 py-4 text-xs font-medium text-white">
                        <div className="flex items-center space-x-1.5 text-white font-bold">
                          <Calendar className="w-3.5 h-3.5 text-[#d4a359]" />
                          <span>{visit.visit_date}</span>
                        </div>
                        <div className="flex items-center space-x-1.5 text-neutral-400 mt-0.5">
                          <Clock className="w-3 h-3 text-neutral-500" />
                          <span>{visit.visit_time}</span>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-xs text-neutral-300">
                        <div className="flex items-center space-x-2">
                          <p className="font-bold text-white text-sm">{visit.lead_name || `Lead #${visit.lead_id}`}</p>
                          <span className="text-[10px] font-mono text-neutral-500 bg-neutral-900 px-1.5 py-0.5 rounded border border-neutral-800">
                            #{visit.id}
                          </span>
                        </div>
                        {visit.lead_phone && (
                          <a 
                            href={`tel:${visit.lead_phone}`}
                            className="text-neutral-400 hover:text-[#d4a359] text-xs flex items-center space-x-1 mt-0.5"
                          >
                            <Phone className="w-3 h-3 text-neutral-500" />
                            <span>{visit.lead_phone}</span>
                          </a>
                        )}
                      </td>

                      <td className="px-5 py-4 text-xs text-neutral-300">
                        <div className="flex items-center space-x-1.5 text-white font-bold">
                          <Building className="w-3.5 h-3.5 text-neutral-500" />
                          <span className="truncate max-w-[180px]">{visit.property_title || `Property #${visit.property_id}`}</span>
                        </div>
                        {visit.property_location && (
                          <p className="text-neutral-500 text-[11px] mt-0.5">{visit.property_location}</p>
                        )}
                      </td>

                      <td className="px-5 py-4 text-xs text-neutral-300">
                        <div className="flex items-center space-x-1.5">
                          <UserIcon className="w-3.5 h-3.5 text-neutral-500" />
                          <span>{visit.agent_name || (visit.agent_id ? `Agent #${visit.agent_id}` : 'Unassigned')}</span>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-xs">
                        <div className="space-y-1">
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                            visit.status === 'Completed' 
                              ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60' 
                              : visit.status === 'Cancelled'
                              ? 'bg-neutral-900 text-neutral-500 border-neutral-800'
                              : 'bg-blue-950/60 text-blue-400 border-blue-800/60'
                          }`}>
                            {visit.status || 'Scheduled'}
                          </span>
                          {visit.interest_level && (
                            <span className={`block text-[10px] font-extrabold ${
                              visit.interest_level === 'Hot' 
                                ? 'text-red-400' 
                                : visit.interest_level === 'Warm' 
                                ? 'text-amber-400' 
                                : 'text-blue-400'
                            }`}>
                              🔥 {visit.interest_level} Lead
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-xs text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {visit.status !== 'Completed' && user?.role === 'AGENT' && (
                            <button 
                              onClick={() => setSelectedVisitId(visit.id)}
                              className="px-3 py-1.5 bg-[#d4a359] hover:bg-[#e5b364] text-[#080f1a] rounded-lg font-bold text-xs shadow-md transition-colors cursor-pointer"
                            >
                              Submit Review
                            </button>
                          )}

                          {visit.customer_feedback && (
                            <button
                              onClick={() => setViewingFeedbackVisit(visit)}
                              className="px-2.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-[#d4a359] hover:text-white rounded-lg font-bold text-xs transition-colors cursor-pointer"
                              title="View Agent Review"
                            >
                              Review
                            </button>
                          )}

                          {(user?.role === 'MAIN_ADMIN' || user?.role === 'ADMIN') && (
                            <>
                              <button
                                onClick={() => openEditModal(visit)}
                                className="p-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                                title="Edit Site Visit"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              {/* DELETE SITE VISIT BUTTON */}
                              <button
                                onClick={() => setDeleteConfirmVisit(visit)}
                                className="p-1.5 bg-red-950/40 hover:bg-red-900/60 border border-red-800/40 text-red-400 hover:text-red-300 rounded-lg transition-colors cursor-pointer"
                                title="Delete Site Visit"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
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

      {/* Schedule / Edit Visit Modal */}
      {isAdding && (user?.role === 'MAIN_ADMIN' || user?.role === 'ADMIN') && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-950 rounded-2xl shadow-2xl border border-neutral-800 text-white w-full max-w-2xl overflow-hidden p-6 space-y-6 animate-in fade-in zoom-in duration-150">
            <div className="flex justify-between items-center border-b border-neutral-800 pb-4">
              <h2 className="text-lg font-bold text-white">
                {editingVisit ? `Edit Visit #${editingVisit.id}` : 'Schedule New Site Visit'}
              </h2>
              <button 
                onClick={() => { setIsAdding(false); setEditingVisit(null); }}
                className="text-neutral-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Lead Selector */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                    Select Lead / Client *
                  </label>
                  <select 
                    required 
                    value={formData.lead_id} 
                    onChange={e => setFormData({...formData, lead_id: e.target.value})} 
                    className="w-full px-3.5 py-2.5 bg-black border border-neutral-800 text-white rounded-xl text-xs focus:outline-none focus:border-[#d4a359]"
                  >
                    <option value="">-- Choose Client --</option>
                    {leads.map(lead => (
                      <option key={lead.id} value={lead.id}>
                        {lead.name} ({lead.phone})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Property Selector */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                    Select Property *
                  </label>
                  <select 
                    required 
                    value={formData.property_id} 
                    onChange={e => setFormData({...formData, property_id: e.target.value})} 
                    className="w-full px-3.5 py-2.5 bg-black border border-neutral-800 text-white rounded-xl text-xs focus:outline-none focus:border-[#d4a359]"
                  >
                    <option value="">-- Choose Property --</option>
                    {properties.map(property => (
                      <option key={property.id} value={property.id}>
                        {property.title} - {property.location}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Agent Selector */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                    Assigned Field Agent
                  </label>
                  <select 
                    value={formData.agent_id} 
                    onChange={e => setFormData({...formData, agent_id: e.target.value})} 
                    className="w-full px-3.5 py-2.5 bg-black border border-neutral-800 text-white rounded-xl text-xs focus:outline-none focus:border-[#d4a359]"
                  >
                    <option value="">-- Unassigned --</option>
                    {agents.map(agent => (
                      <option key={agent.id} value={agent.id}>
                        {agent.name} ({agent.email})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status Selector */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                    Visit Status
                  </label>
                  <select 
                    value={formData.status} 
                    onChange={e => setFormData({...formData, status: e.target.value})} 
                    className="w-full px-3.5 py-2.5 bg-black border border-neutral-800 text-white rounded-xl text-xs focus:outline-none focus:border-[#d4a359]"
                  >
                    <option value="Scheduled">Scheduled</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>

                {/* Date */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                    Visit Date *
                  </label>
                  <input 
                    required 
                    type="date" 
                    value={formData.visit_date} 
                    onChange={e => setFormData({...formData, visit_date: e.target.value})} 
                    className="w-full px-3.5 py-2.5 bg-black border border-neutral-800 text-white rounded-xl text-xs focus:outline-none focus:border-[#d4a359]" 
                  />
                </div>

                {/* Time */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                    Visit Time *
                  </label>
                  <input 
                    required 
                    type="text" 
                    placeholder="e.g. 11:30 AM or 03:00 PM"
                    value={formData.visit_time} 
                    onChange={e => setFormData({...formData, visit_time: e.target.value})} 
                    className="w-full px-3.5 py-2.5 bg-black border border-neutral-800 text-white rounded-xl text-xs focus:outline-none focus:border-[#d4a359]" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                  Internal Notes & Special Instructions
                </label>
                <textarea 
                  rows={3} 
                  placeholder="Key details, client gate pass requirements, or preferred walkthrough points..."
                  value={formData.notes} 
                  onChange={e => setFormData({...formData, notes: e.target.value})} 
                  className="w-full px-3.5 py-2.5 bg-black border border-neutral-800 text-white rounded-xl text-xs focus:outline-none focus:border-[#d4a359]"
                ></textarea>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-neutral-800">
                <button 
                  type="button" 
                  onClick={() => { setIsAdding(false); setEditingVisit(null); }}
                  className="px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-2.5 bg-[#d4a359] hover:bg-[#e5b364] text-[#080f1a] font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-[#d4a359]/20 cursor-pointer"
                >
                  {editingVisit ? 'Save Changes' : 'Schedule Visit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SINGLE DELETE CONFIRMATION MODAL */}
      {deleteConfirmVisit && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-950 rounded-2xl shadow-2xl border border-red-900/40 text-white w-full max-w-md overflow-hidden p-6 space-y-5 animate-in fade-in zoom-in duration-150">
            <div className="w-12 h-12 rounded-2xl bg-red-950/60 border border-red-600/30 flex items-center justify-center text-red-500 mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-black text-white">Delete Site Visit?</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Are you sure you want to permanently delete Site Visit <strong className="text-white">#{deleteConfirmVisit.id}</strong> for <strong className="text-white">{deleteConfirmVisit.lead_name || 'Client'}</strong>?
              </p>
            </div>

            <div className="bg-black/60 p-3.5 rounded-xl border border-neutral-900 text-xs space-y-1.5">
              <div className="flex justify-between text-neutral-400">
                <span>Date & Time:</span>
                <span className="font-bold text-white">{deleteConfirmVisit.visit_date} ({deleteConfirmVisit.visit_time})</span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>Property:</span>
                <span className="font-bold text-white truncate max-w-[200px]">{deleteConfirmVisit.property_title || `#${deleteConfirmVisit.property_id}`}</span>
              </div>
              {deleteConfirmVisit.customer_feedback && (
                <div className="pt-1 text-[11px] text-red-400 border-t border-neutral-900">
                  ⚠️ Note: Associated agent visit review & feedback will also be removed.
                </div>
              )}
            </div>

            {deleteError && (
              <div className="p-3 bg-red-950/80 border border-red-800 text-red-300 rounded-xl text-xs">
                {deleteError}
              </div>
            )}

            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => { setDeleteConfirmVisit(null); setDeleteError(null); }}
                disabled={isDeleting}
                className="flex-1 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteVisit}
                disabled={isDeleting}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors shadow-lg shadow-red-600/30 flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Permanently</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BULK DELETE CONFIRMATION MODAL */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-950 border border-red-900/50 text-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="w-12 h-12 rounded-2xl bg-red-950/80 border border-red-600/40 flex items-center justify-center text-red-500 mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-xl font-bold text-white">Bulk Delete {selectedIds.length} Site Visits?</h3>
              <p className="text-neutral-400 text-xs">
                This will permanently delete the <strong className="text-white">{selectedIds.length} selected site visits</strong> and all associated agent reviews and feedback from the database. This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center justify-center space-x-3 pt-4 border-t border-neutral-900">
              <button
                type="button"
                onClick={() => setShowBulkDeleteModal(false)}
                className="px-5 py-2.5 bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isBulkDeleting}
                onClick={handleBulkDelete}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors shadow-lg shadow-red-600/30 flex items-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isBulkDeleting ? 'Deleting Selected...' : `Yes, Delete ${selectedIds.length} Visits`}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FEEDBACK INPUT MODAL (For Agents) */}
      {selectedVisitId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-950 rounded-2xl shadow-2xl border border-neutral-800 text-white w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-neutral-800 flex justify-between items-center bg-neutral-950 sticky top-0 z-10">
              <h2 className="text-xl font-bold text-white">Submit Visit Feedback</h2>
              <button onClick={() => setSelectedVisitId(null)} className="text-neutral-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <form id="feedbackForm" onSubmit={handleFeedbackSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-neutral-300">Interest Level</label>
                    <select 
                      value={feedbackForm.interest_level} 
                      onChange={e => setFeedbackForm({...feedbackForm, interest_level: e.target.value})} 
                      className="w-full px-3 py-2 bg-black border border-neutral-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4a359]"
                    >
                      <option>Hot</option>
                      <option>Warm</option>
                      <option>Cold</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-neutral-300">Budget (₹ INR)</label>
                    <input 
                      type="number" 
                      required 
                      value={feedbackForm.budget} 
                      onChange={e => setFeedbackForm({...feedbackForm, budget: e.target.value})} 
                      className="w-full px-3 py-2 bg-black border border-neutral-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4a359]" 
                      placeholder="e.g. 5000000" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-neutral-300">Timeline</label>
                    <select 
                      value={feedbackForm.timeline} 
                      onChange={e => setFeedbackForm({...feedbackForm, timeline: e.target.value})} 
                      className="w-full px-3 py-2 bg-black border border-neutral-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4a359]"
                    >
                      <option>Immediate (0-1 month)</option>
                      <option>1-3 months</option>
                      <option>3-6 months</option>
                      <option>6+ months</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-neutral-300">Preferred Config</label>
                    <input 
                      required 
                      value={feedbackForm.preferred_configuration} 
                      onChange={e => setFeedbackForm({...feedbackForm, preferred_configuration: e.target.value})} 
                      className="w-full px-3 py-2 bg-black border border-neutral-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4a359]" 
                      placeholder="e.g. 3BHK high floor" 
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-neutral-300">Customer Feedback</label>
                  <textarea 
                    required 
                    rows={3} 
                    value={feedbackForm.customer_feedback} 
                    onChange={e => setFeedbackForm({...feedbackForm, customer_feedback: e.target.value})} 
                    className="w-full px-3 py-2 bg-black border border-neutral-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4a359]"
                  ></textarea>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-neutral-300">Next Action Required</label>
                  <input 
                    required 
                    value={feedbackForm.next_action} 
                    onChange={e => setFeedbackForm({...feedbackForm, next_action: e.target.value})} 
                    className="w-full px-3 py-2 bg-black border border-neutral-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4a359]" 
                    placeholder="e.g. Follow up on Monday with floor plans" 
                  />
                </div>
              </form>
            </div>
            <div className="p-6 border-t border-neutral-800 bg-black flex justify-end">
              <button 
                form="feedbackForm" 
                type="submit" 
                className="px-6 py-2 bg-[#d4a359] hover:bg-[#e5b364] text-[#080f1a] font-bold rounded-lg transition-colors shadow-md shadow-[#d4a359]/20 cursor-pointer"
              >
                Submit Feedback
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUICK VIEW FEEDBACK MODAL */}
      {viewingFeedbackVisit && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-950 rounded-2xl shadow-2xl border border-neutral-800 text-white w-full max-w-lg overflow-hidden p-6 space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex justify-between items-start border-b border-neutral-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white">Agent Visit Feedback</h3>
                <p className="text-xs text-neutral-400">Client: {viewingFeedbackVisit.lead_name} • Property: {viewingFeedbackVisit.property_title}</p>
              </div>
              <button onClick={() => setViewingFeedbackVisit(null)} className="text-neutral-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between bg-black p-3 rounded-xl border border-neutral-900">
                <span className="text-xs text-neutral-400 font-bold uppercase">Interest Level:</span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  viewingFeedbackVisit.interest_level === 'Hot' ? 'bg-red-600/20 text-red-400 border border-red-600/40' :
                  viewingFeedbackVisit.interest_level === 'Warm' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' :
                  'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                }`}>
                  {viewingFeedbackVisit.interest_level || 'Warm'}
                </span>
              </div>

              <div className="bg-neutral-900/60 p-3 rounded-xl border border-neutral-800">
                <span className="text-xs font-bold text-neutral-400 uppercase block mb-1">Customer Feedback:</span>
                <p className="text-neutral-200 text-xs italic">"{viewingFeedbackVisit.customer_feedback}"</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-black p-2.5 rounded-xl border border-neutral-900">
                  <span className="text-neutral-500 block text-[10px] uppercase font-bold">Budget:</span>
                  <span className="font-bold text-white">{viewingFeedbackVisit.budget ? formatINR(Number(viewingFeedbackVisit.budget)) : 'N/A'}</span>
                </div>
                <div className="bg-black p-2.5 rounded-xl border border-neutral-900">
                  <span className="text-neutral-500 block text-[10px] uppercase font-bold">Timeline:</span>
                  <span className="font-bold text-white">{viewingFeedbackVisit.timeline || 'Flexible'}</span>
                </div>
              </div>

              {viewingFeedbackVisit.next_action && (
                <div className="bg-[#d4a359]/10 border border-[#d4a359]/30 p-3 rounded-xl text-xs text-[#d4a359]">
                  <span className="font-bold block text-white">Next Action:</span>
                  <p className="mt-0.5">{viewingFeedbackVisit.next_action}</p>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-neutral-800">
              <Link 
                to="/admin/feedback" 
                className="text-xs font-bold text-[#d4a359] hover:text-[#e5b364] flex items-center space-x-1"
                onClick={() => setViewingFeedbackVisit(null)}
              >
                <span>Go to Full Feedback Hub</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <button
                onClick={() => setViewingFeedbackVisit(null)}
                className="px-4 py-2 bg-neutral-900 text-white rounded-lg text-xs font-bold hover:bg-neutral-800 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
