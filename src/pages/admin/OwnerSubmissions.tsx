import React, { useEffect, useState, useMemo } from 'react';
import { 
  Building2, 
  Search, 
  Filter, 
  Phone, 
  Mail, 
  MessageCircle, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Eye, 
  Trash2, 
  Sparkles, 
  Check, 
  X, 
  ExternalLink, 
  MapPin, 
  IndianRupee,
  User,
  Plus,
  Calendar,
  CheckSquare,
  Square,
  ArrowUpDown,
  FileSpreadsheet,
  AlertTriangle
} from 'lucide-react';
import { useAppStore } from '../../store/index.js';
import { getWhatsAppUrl } from '../../utils/whatsapp.js';

export interface OwnerSubmission {
  id: number;
  owner_name: string;
  owner_phone: string;
  owner_email?: string;
  owner_type?: string;
  property_title: string;
  property_type: string;
  bhk_config: string;
  location: string;
  address?: string;
  expected_rent?: number;
  security_deposit?: number;
  furnishing?: string;
  available_from?: string;
  preferred_tenants?: string;
  amenities?: string;
  images?: string;
  notes?: string;
  status: 'PENDING' | 'CONTACTED' | 'APPROVED' | 'REJECTED';
  admin_notes?: string;
  created_at: string;
}

export default function OwnerSubmissions() {
  const { token, settings } = useAppStore();
  const [submissions, setSubmissions] = useState<OwnerSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  // Search, Status and Date Filtering
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('ALL');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [sortOrder, setSortOrder] = useState<'NEWEST' | 'OLDEST'>('NEWEST');

  // Multi-Selection State for Bulk Actions
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Modals & Actions
  const [selectedSub, setSelectedSub] = useState<OwnerSubmission | null>(null);
  const [deleteConfirmSub, setDeleteConfirmSub] = useState<OwnerSubmission | null>(null);
  const [actionMessage, setActionMessage] = useState('');
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/owner-submissions', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSubmissions(data || []);
      }
    } catch (e) {
      console.error('Error fetching submissions:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, [token]);

  const handleUpdateStatus = async (id: number, status: string, adminNotes?: string) => {
    try {
      const res = await fetch(`/api/owner-submissions/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status, admin_notes: adminNotes })
      });

      if (res.ok) {
        setActionMessage(`Status updated to ${status}`);
        setTimeout(() => setActionMessage(''), 3000);
        fetchSubmissions();
        if (selectedSub && selectedSub.id === id) {
          setSelectedSub({ ...selectedSub, status: status as any, admin_notes: adminNotes || selectedSub.admin_notes });
        }
      }
    } catch (e) {
      console.error('Failed to update status:', e);
    }
  };

  const handleApproveAndPublish = async (id: number) => {
    setApprovingId(id);
    try {
      const res = await fetch(`/api/owner-submissions/${id}/approve`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage(data.message || 'Property approved and published to website!');
        setTimeout(() => setActionMessage(''), 4000);
        fetchSubmissions();
        if (selectedSub) setSelectedSub(null);
      } else {
        alert(data.error || 'Failed to approve submission');
      }
    } catch (e) {
      alert('Error approving property submission');
    } finally {
      setApprovingId(null);
    }
  };

  const executeDelete = async (id: number) => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/owner-submissions/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setActionMessage('Property submission deleted successfully');
        setTimeout(() => setActionMessage(''), 3000);
        setSelectedIds(prev => prev.filter(item => item !== id));
        fetchSubmissions();
        if (selectedSub && selectedSub.id === id) setSelectedSub(null);
        setDeleteConfirmSub(null);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete submission');
      }
    } catch (e) {
      console.error('Error deleting submission:', e);
      alert('Network error while deleting submission');
    } finally {
      setIsDeleting(false);
    }
  };

  // Bulk Delete Handler
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsBulkDeleting(true);
    try {
      const res = await fetch('/api/owner-submissions/bulk-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ids: selectedIds })
      });

      if (res.ok) {
        const data = await res.json();
        setActionMessage(data.message || `Successfully deleted ${selectedIds.length} listings.`);
        setTimeout(() => setActionMessage(''), 4000);
        setSelectedIds([]);
        setShowBulkDeleteModal(false);
        fetchSubmissions();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to bulk delete submissions');
      }
    } catch (err) {
      console.error('Error in bulk delete:', err);
      alert('Network error while performing bulk delete');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // Check if date string matches filter criteria
  const isDateMatching = (createdStr?: string) => {
    if (!createdStr || dateFilter === 'ALL') return true;
    const itemDate = new Date(createdStr);
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

  // Filtered & Sorted Submissions
  const filtered = useMemo(() => {
    const list = submissions.filter(s => {
      const matchesSearch = 
        (s.owner_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (s.owner_phone || '').toLowerCase().includes(search.toLowerCase()) ||
        (s.owner_email || '').toLowerCase().includes(search.toLowerCase()) ||
        (s.property_title || '').toLowerCase().includes(search.toLowerCase()) ||
        (s.location || '').toLowerCase().includes(search.toLowerCase()) ||
        (s.notes || '').toLowerCase().includes(search.toLowerCase());

      const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;
      const matchesDate = isDateMatching(s.created_at);

      return matchesSearch && matchesStatus && matchesDate;
    });

    return list.sort((a, b) => {
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return sortOrder === 'NEWEST' ? timeB - timeA : timeA - timeB;
    });
  }, [submissions, search, statusFilter, dateFilter, customStartDate, customEndDate, sortOrder]);

  // Selection Helpers
  const isAllSelected = filtered.length > 0 && filtered.every(s => selectedIds.includes(s.id));
  const isSomeSelected = filtered.some(s => selectedIds.includes(s.id)) && !isAllSelected;

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      const filteredIds = new Set(filtered.map(s => s.id));
      setSelectedIds(prev => prev.filter(id => !filteredIds.has(id)));
    } else {
      const filteredIds = filtered.map(s => s.id);
      setSelectedIds(prev => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const handleToggleSelectRow = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const exportToCSV = () => {
    const dataToExport = selectedIds.length > 0
      ? submissions.filter(s => selectedIds.includes(s.id))
      : (filtered.length > 0 ? filtered : submissions);

    if (dataToExport.length === 0) {
      alert('No submissions available to export.');
      return;
    }

    const headers = [
      'Submission ID',
      'Owner Name',
      'Owner Type',
      'Phone',
      'Email',
      'Property Title',
      'Type',
      'BHK',
      'Location',
      'Expected Rent',
      'Deposit',
      'Furnishing',
      'Status',
      'Date Submitted'
    ];

    const rows = dataToExport.map(s => [
      s.id,
      `"${(s.owner_name || '').replace(/"/g, '""')}"`,
      `"${(s.owner_type || 'OWNER').replace(/"/g, '""')}"`,
      `"${(s.owner_phone || '').replace(/"/g, '""')}"`,
      `"${(s.owner_email || '').replace(/"/g, '""')}"`,
      `"${(s.property_title || '').replace(/"/g, '""')}"`,
      `"${(s.property_type || '').replace(/"/g, '""')}"`,
      `"${(s.bhk_config || '').replace(/"/g, '""')}"`,
      `"${(s.location || '').replace(/"/g, '""')}"`,
      s.expected_rent || 0,
      s.security_deposit || 0,
      `"${(s.furnishing || '').replace(/"/g, '""')}"`,
      `"${s.status}"`,
      `"${s.created_at || ''}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `rental_pune_owner_listings_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const pendingCount = submissions.filter(s => s.status === 'PENDING').length;
  const contactedCount = submissions.filter(s => s.status === 'CONTACTED').length;
  const approvedCount = submissions.filter(s => s.status === 'APPROVED').length;
  const rejectedCount = submissions.filter(s => s.status === 'REJECTED').length;

  return (
    <div className="space-y-6 selection:bg-[#d4a359] selection:text-[#080f1a] pb-12">
      
      {/* Top Page Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <div className="w-9 h-9 rounded-xl bg-[#d4a359]/20 flex items-center justify-center text-[#d4a359]">
              <Building2 className="w-5 h-5" />
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Owner Property Submissions</h1>
            <span className="px-3 py-0.5 rounded-full bg-[#d4a359]/20 text-[#d4a359] border border-[#d4a359]/30 text-xs font-bold font-mono">
              {submissions.length} Total
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            Review landlord listing requests, filter by submission dates, bulk delete listings from DB, and approve 1-click publishing.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={exportToCSV}
            className="inline-flex items-center space-x-2 px-4 py-2.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-xl font-bold text-xs transition-all shadow-md cursor-pointer hover:border-emerald-500/60"
            title="Download CSV spreadsheet of owner listings"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>{selectedIds.length > 0 ? `Export Selected (${selectedIds.length})` : 'Export CSV'}</span>
          </button>

          <a
            href="/list-property"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-2 px-4 py-2.5 bg-[#d4a359] hover:bg-[#e5b364] text-[#080f1a] font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Open Public Form</span>
          </a>
        </div>
      </div>

      {actionMessage && (
        <div className="p-3.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold rounded-2xl flex items-center justify-between animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{actionMessage}</span>
          </div>
          <button onClick={() => setActionMessage('')} className="text-emerald-400 hover:text-white cursor-pointer">
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
                {selectedIds.length} {selectedIds.length === 1 ? 'Submission' : 'Submissions'} Selected
              </p>
              <p className="text-[11px] text-neutral-400">
                Bulk delete listings and synchronize changes directly with the database.
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

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div 
          onClick={() => setStatusFilter('ALL')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-lg ${
            statusFilter === 'ALL' ? 'bg-[#d4a359]/20 border-[#d4a359]' : 'bg-[#050a12] border-white/10 hover:border-white/20'
          }`}
        >
          <p className="text-[11px] font-semibold text-neutral-400 uppercase">Total Received</p>
          <p className="text-2xl font-black text-white mt-1">{submissions.length}</p>
        </div>

        <div 
          onClick={() => setStatusFilter('PENDING')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-lg ${
            statusFilter === 'PENDING' ? 'bg-amber-500/20 border-amber-500' : 'bg-[#050a12] border-white/10 hover:border-white/20'
          }`}
        >
          <p className="text-[11px] font-semibold text-amber-400 uppercase">Pending Review</p>
          <p className="text-2xl font-black text-amber-300 mt-1">{pendingCount}</p>
        </div>

        <div 
          onClick={() => setStatusFilter('CONTACTED')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-lg ${
            statusFilter === 'CONTACTED' ? 'bg-sky-500/20 border-sky-500' : 'bg-[#050a12] border-white/10 hover:border-white/20'
          }`}
        >
          <p className="text-[11px] font-semibold text-sky-400 uppercase">Contacted</p>
          <p className="text-2xl font-black text-sky-300 mt-1">{contactedCount}</p>
        </div>

        <div 
          onClick={() => setStatusFilter('APPROVED')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-lg ${
            statusFilter === 'APPROVED' ? 'bg-emerald-500/20 border-emerald-500' : 'bg-[#050a12] border-white/10 hover:border-white/20'
          }`}
        >
          <p className="text-[11px] font-semibold text-emerald-400 uppercase">Approved / Published</p>
          <p className="text-2xl font-black text-emerald-300 mt-1">{approvedCount}</p>
        </div>

        <div 
          onClick={() => setStatusFilter('REJECTED')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-lg ${
            statusFilter === 'REJECTED' ? 'bg-red-500/20 border-red-500' : 'bg-[#050a12] border-white/10 hover:border-white/20'
          }`}
        >
          <p className="text-[11px] font-semibold text-red-400 uppercase">Rejected</p>
          <p className="text-2xl font-black text-red-300 mt-1">{rejectedCount}</p>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-[#050a12] p-4 rounded-3xl border border-white/10 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-neutral-400" />
            <input
              type="text"
              placeholder="Search by owner name, phone, title, notes..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#080f1a] border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-[#d4a359]"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <span className="text-xs font-bold text-neutral-500 uppercase">Sort Date:</span>
            <button
              onClick={() => setSortOrder(prev => prev === 'NEWEST' ? 'OLDEST' : 'NEWEST')}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#080f1a] border border-white/15 text-neutral-300 hover:text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-[#d4a359]" />
              <span>{sortOrder === 'NEWEST' ? 'Newest First' : 'Oldest First'}</span>
            </button>
          </div>
        </div>

        {/* Status Filter Buttons */}
        <div className="flex items-center space-x-1.5 overflow-x-auto w-full pb-1">
          <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider mr-1 whitespace-nowrap">
            Status:
          </span>
          {['ALL', 'PENDING', 'CONTACTED', 'APPROVED', 'REJECTED'].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                statusFilter === st
                  ? 'bg-[#d4a359] text-[#080f1a] shadow-md shadow-[#d4a359]/20'
                  : 'text-neutral-400 hover:text-white bg-white/5 border border-white/10'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Date Filter Section */}
        <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
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
            Showing <strong className="text-white">{filtered.length}</strong> of {submissions.length} listings
          </div>
        </div>
      </div>

      {/* Submissions List Table */}
      {loading ? (
        <div className="p-12 text-center text-neutral-400 text-xs font-mono">
          <div className="w-6 h-6 border-2 border-[#d4a359] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Loading owner property submissions...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-[#050a12] rounded-3xl border border-white/10 p-12 text-center space-y-3 shadow-xl">
          <Building2 className="w-10 h-10 text-neutral-500 mx-auto" />
          <p className="text-sm font-bold text-neutral-300">No Property Submissions Found</p>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
            {search || statusFilter !== 'ALL' || dateFilter !== 'ALL'
              ? 'Try adjusting your search query, status filter, or date range.'
              : 'When landlords or NRI property owners fill out the "List Your Property" form, their submissions will appear right here.'}
          </p>
        </div>
      ) : (
        <div className="bg-[#050a12] rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#080f1a] text-neutral-400 font-semibold uppercase tracking-wider border-b border-white/10">
                <tr>
                  {/* Select All Checkbox */}
                  <th className="px-4 py-4 w-12 text-center">
                    <button
                      onClick={handleToggleSelectAll}
                      className="p-1 rounded text-neutral-400 hover:text-white cursor-pointer transition-colors"
                      title={isAllSelected ? "Deselect all" : "Select all filtered submissions"}
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
                  <th className="px-4 py-4">Owner & Contact</th>
                  <th className="px-4 py-4">Property Details</th>
                  <th className="px-4 py-4">Rent & Deposit</th>
                  <th className="px-4 py-4">Submission Date</th>
                  <th className="px-4 py-4">Status</th>
                  <th className="px-4 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-neutral-300 font-medium">
                {filtered.map(s => {
                  const cleanPhone = s.owner_phone ? s.owner_phone.replace(/[^0-9]/g, '') : '';
                  const waUrl = `https://wa.me/${cleanPhone}?text=Hello%20${encodeURIComponent(s.owner_name)},%20I%20am%20calling%20from%20Rental%20Pune%20regarding%20your%20property%20listing%20"${encodeURIComponent(s.property_title)}".`;
                  const isSelected = selectedIds.includes(s.id);

                  return (
                    <tr 
                      key={s.id} 
                      className={`transition-colors ${isSelected ? 'bg-[#d4a359]/10' : 'hover:bg-white/[0.02]'}`}
                    >
                      {/* Row Checkbox */}
                      <td className="px-4 py-4 text-center">
                        <button
                          onClick={() => handleToggleSelectRow(s.id)}
                          className="p-1 text-neutral-400 hover:text-white cursor-pointer transition-colors"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-[#d4a359]" />
                          ) : (
                            <Square className="w-4 h-4 text-neutral-700 hover:text-neutral-400" />
                          )}
                        </button>
                      </td>

                      <td className="px-4 py-4 space-y-1">
                        <div className="font-bold text-white text-sm flex items-center gap-1.5">
                          <span>{s.owner_name}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-white/10 text-neutral-300 font-mono">
                            {s.owner_type || 'OWNER'}
                          </span>
                          <span className="text-[10px] font-mono text-neutral-500 bg-neutral-900 px-1.5 py-0.5 rounded border border-neutral-800">
                            #{s.id}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-neutral-400">
                          <a href={`tel:${s.owner_phone}`} className="hover:text-[#d4a359] flex items-center gap-1">
                            <Phone className="w-3 h-3 text-[#d4a359]" />
                            <span>{s.owner_phone}</span>
                          </a>
                          <a href={waUrl} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300">
                            <MessageCircle className="w-3.5 h-3.5" />
                          </a>
                        </div>
                        {s.owner_email && (
                          <p className="text-[10px] text-neutral-500 truncate max-w-[180px]">{s.owner_email}</p>
                        )}
                      </td>

                      <td className="px-4 py-4 space-y-1">
                        <p className="font-bold text-white text-sm max-w-xs truncate">{s.property_title}</p>
                        <p className="text-[11px] text-neutral-400 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-[#d4a359]" />
                          <span>{s.location} • {s.bhk_config} ({s.furnishing || 'Semi-Furnished'})</span>
                        </p>
                      </td>

                      <td className="px-4 py-4 font-mono">
                        <p className="text-sm font-bold text-[#d4a359]">
                          ₹{Number(s.expected_rent || 0).toLocaleString('en-IN')}<span className="text-[10px] font-normal text-neutral-400">/mo</span>
                        </p>
                        {s.security_deposit && (
                          <p className="text-[10px] text-neutral-500">
                            Dep: ₹{Number(s.security_deposit).toLocaleString('en-IN')}
                          </p>
                        )}
                      </td>

                      <td className="px-4 py-4 text-neutral-300 text-[11px] font-mono">
                        <div className="flex items-center space-x-1.5 text-white font-bold">
                          <Calendar className="w-3.5 h-3.5 text-[#d4a359]" />
                          <span>
                            {s.created_at ? new Date(s.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recently'}
                          </span>
                        </div>
                        {s.created_at && (
                          <div className="flex items-center space-x-1 text-neutral-500 text-[10px] mt-0.5">
                            <Clock className="w-3 h-3 text-neutral-600" />
                            <span>{new Date(s.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider font-mono border ${
                          s.status === 'APPROVED' ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/30' :
                          s.status === 'CONTACTED' ? 'bg-sky-950/80 text-sky-400 border-sky-500/30' :
                          s.status === 'REJECTED' ? 'bg-red-950/80 text-red-400 border-red-500/30' :
                          'bg-amber-950/80 text-amber-300 border-amber-500/30 animate-pulse'
                        }`}>
                          {s.status}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-right space-x-1.5">
                        <button
                          onClick={() => setSelectedSub(s)}
                          className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all cursor-pointer"
                        >
                          View Details
                        </button>

                        {s.status !== 'APPROVED' && (
                          <button
                            onClick={() => handleApproveAndPublish(s.id)}
                            disabled={approvingId === s.id}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
                          >
                            {approvingId === s.id ? 'Publishing...' : 'Approve & Publish'}
                          </button>
                        )}

                        <button
                          onClick={() => setDeleteConfirmSub(s)}
                          className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors cursor-pointer"
                          title="Delete Submission"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Inspector Modal */}
      {selectedSub && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#050a12] border border-white/20 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-6 shadow-2xl relative text-white">
            
            <div className="flex items-start justify-between border-b border-white/10 pb-4">
              <div>
                <span className="text-xs font-mono uppercase text-[#d4a359] tracking-wider">Owner Submission #{selectedSub.id}</span>
                <h3 className="text-lg font-bold text-white">{selectedSub.property_title}</h3>
              </div>
              <button 
                onClick={() => setSelectedSub(null)}
                className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Details */}
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-[#080f1a] border border-white/10">
                <div>
                  <span className="text-neutral-500 block">Owner Name</span>
                  <span className="font-bold text-white">{selectedSub.owner_name} ({selectedSub.owner_type || 'OWNER'})</span>
                </div>
                <div>
                  <span className="text-neutral-500 block">Phone</span>
                  <a href={`tel:${selectedSub.owner_phone}`} className="font-bold text-[#d4a359]">{selectedSub.owner_phone}</a>
                </div>
                <div>
                  <span className="text-neutral-500 block">Email</span>
                  <span className="font-bold text-neutral-300 truncate block">{selectedSub.owner_email || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-neutral-500 block">Expected Rent</span>
                  <span className="font-bold text-emerald-400">₹{Number(selectedSub.expected_rent || 0).toLocaleString('en-IN')}/mo</span>
                </div>
                <div>
                  <span className="text-neutral-500 block">Deposit</span>
                  <span className="font-bold text-white">₹{Number(selectedSub.security_deposit || 0).toLocaleString('en-IN')}</span>
                </div>
                <div>
                  <span className="text-neutral-500 block">Configuration</span>
                  <span className="font-bold text-white">{selectedSub.bhk_config}</span>
                </div>
                <div>
                  <span className="text-neutral-500 block">Furnishing</span>
                  <span className="font-bold text-white">{selectedSub.furnishing || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-neutral-500 block">Preferred Tenant</span>
                  <span className="font-bold text-white">{selectedSub.preferred_tenants || 'Any'}</span>
                </div>
                <div>
                  <span className="text-neutral-500 block">Available From</span>
                  <span className="font-bold text-white">{selectedSub.available_from || 'Immediate'}</span>
                </div>
              </div>

              {selectedSub.address && (
                <p className="text-neutral-300">
                  <strong className="text-neutral-400">Address:</strong> {selectedSub.address}
                </p>
              )}

              {selectedSub.notes && (
                <div className="bg-[#080f1a] p-3 rounded-xl border border-white/10 leading-relaxed">
                  <strong className="text-neutral-400 block mb-1">Owner Notes:</strong>
                  <p className="text-neutral-200">{selectedSub.notes}</p>
                </div>
              )}
            </div>

            {/* Status Change & Approve Actions */}
            <div className="pt-4 border-t border-white/10 space-y-3">
              <label className="block text-xs font-bold text-neutral-300">
                Change Status & Take Action:
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => handleUpdateStatus(selectedSub.id, 'CONTACTED')}
                  className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition-all cursor-pointer"
                >
                  Mark as Contacted
                </button>
                <button
                  onClick={() => handleUpdateStatus(selectedSub.id, 'PENDING')}
                  className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition-all cursor-pointer"
                >
                  Mark Pending
                </button>
                <button
                  onClick={() => handleUpdateStatus(selectedSub.id, 'REJECTED')}
                  className="px-3.5 py-2 rounded-xl bg-red-900/60 hover:bg-red-800 text-red-300 font-bold text-xs transition-all cursor-pointer border border-red-700/50"
                >
                  Reject Submission
                </button>
                <button
                  onClick={() => setDeleteConfirmSub(selectedSub)}
                  className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition-all cursor-pointer flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>

                {selectedSub.status !== 'APPROVED' && (
                  <button
                    onClick={() => handleApproveAndPublish(selectedSub.id)}
                    disabled={approvingId === selectedSub.id}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs transition-all shadow-lg shadow-emerald-950/50 cursor-pointer ml-auto flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{approvingId === selectedSub.id ? 'Publishing...' : 'Approve & Publish Live'}</span>
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* SINGLE DELETE CONFIRMATION MODAL */}
      {deleteConfirmSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0b1626] border border-red-500/30 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center space-x-3 text-red-400">
              <div className="p-3 bg-red-500/10 rounded-full">
                <Trash2 className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Delete Listing Submission?</h3>
                <p className="text-xs text-neutral-400">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-sm text-neutral-300 bg-[#080f1a] p-3.5 rounded-xl border border-white/5">
              Are you sure you want to permanently delete the listing for <strong className="text-white">"{deleteConfirmSub.property_title}"</strong> submitted by <strong className="text-white">{deleteConfirmSub.owner_name}</strong>?
            </p>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmSub(null)}
                disabled={isDeleting}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-neutral-300 rounded-xl text-sm font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => executeDelete(deleteConfirmSub.id)}
                disabled={isDeleting}
                className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-red-950/50 transition-all flex items-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Confirm Delete</span>
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
          <div className="bg-[#0b1626] border border-red-500/30 text-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="w-12 h-12 rounded-2xl bg-red-950/80 border border-red-600/40 flex items-center justify-center text-red-500 mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-xl font-bold text-white">Bulk Delete {selectedIds.length} Owner Submissions?</h3>
              <p className="text-neutral-400 text-xs">
                This will permanently delete the <strong className="text-white">{selectedIds.length} selected listings</strong> from the database. This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center justify-center space-x-3 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowBulkDeleteModal(false)}
                className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
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
                <span>{isBulkDeleting ? 'Deleting Selected...' : `Yes, Delete ${selectedIds.length} Listings`}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
