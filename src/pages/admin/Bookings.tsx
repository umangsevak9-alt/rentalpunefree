import { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '../../store/index.js';
import { PropertyBooking, Property, User } from '../../types.js';
import { supabaseService, supabase } from '../../services/supabaseService.js';
import { formatDateDDMMYYYY, formatDateTimeDDMMYYYY, formatDateComponents } from '../../utils/dateFormatter.js';
import { 
  BookmarkCheck, 
  Search, 
  Trash2, 
  Edit2, 
  X, 
  Check, 
  AlertTriangle, 
  Phone, 
  Mail, 
  Calendar, 
  Building2, 
  UserCheck, 
  FileSpreadsheet,
  CheckSquare,
  Square,
  Clock,
  ArrowUpDown,
  Filter,
  DollarSign,
  MessageCircle,
  Eye,
  RefreshCw
} from 'lucide-react';

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  'NEW': { label: 'New Booking', bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
  'VISIT_SCHEDULED': { label: 'Visit Scheduled', bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
  'TOKEN_RECEIVED': { label: 'Token Received', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  'AGREEMENT_IN_PROGRESS': { label: 'Agreement In Progress', bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30' },
  'COMPLETED': { label: 'Completed / Handover', bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/30' },
  'CANCELLED': { label: 'Cancelled', bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' }
};

export default function Bookings() {
  const { token, user } = useAppStore();
  const [bookings, setBookings] = useState<PropertyBooking[]>(() => supabaseService.getLocal<PropertyBooking[]>('property_bookings', []));
  const [properties, setProperties] = useState<Property[]>(() => supabaseService.getLocal<Property[]>('properties', []));
  const [agents, setAgents] = useState<User[]>(() => supabaseService.getLocal<User[]>('agents', []));
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Date Filter & Sort States
  const [dateFilter, setDateFilter] = useState<string>('ALL');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'NEWEST' | 'OLDEST'>('NEWEST');

  // Selection state for Bulk actions
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [bulkActionMessage, setBulkActionMessage] = useState<string | null>(null);

  // Modals
  const [editingBooking, setEditingBooking] = useState<PropertyBooking | null>(null);
  const [deleteConfirmBooking, setDeleteConfirmBooking] = useState<PropertyBooking | null>(null);
  const [viewingBooking, setViewingBooking] = useState<PropertyBooking | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Edit Form State
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    status: 'NEW',
    token_amount: 0,
    preferred_date: '',
    preferred_time: '',
    move_in_timeline: '',
    occupancy_type: '',
    assigned_agent_id: '',
    notes: ''
  });

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchData = async (showLoading = false) => {
    if (showLoading && bookings.length === 0) setLoading(true);
    setIsRefreshing(true);
    setErrorMsg(null);
    try {
      const [bookingsData, propsData, agentsData] = await Promise.all([
        supabaseService.bookings.getAll(),
        supabaseService.properties.getAll(),
        supabaseService.agents.getAll()
      ]);

      if (Array.isArray(bookingsData)) setBookings(bookingsData);
      if (Array.isArray(propsData)) setProperties(propsData);
      if (Array.isArray(agentsData)) setAgents(agentsData);
    } catch (err: any) {
      console.error('Error fetching bookings data:', err);
      if (showLoading) setErrorMsg('Failed to load bookings.');
    } finally {
      if (showLoading) setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData(false);

    const handleUpdate = () => {
      fetchData(false);
    };
    window.addEventListener('bookings_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    // Live background sync so newly placed bookings reflect in ~2.5 seconds
    const interval = setInterval(() => {
      fetchData(false);
    }, 2500);

    return () => {
      window.removeEventListener('bookings_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
      clearInterval(interval);
    };
  }, [token, user]);

  const openEditModal = (booking: PropertyBooking) => {
    setEditingBooking(booking);
    setFormData({
      customer_name: booking.customer_name || '',
      customer_email: booking.customer_email || '',
      customer_phone: booking.customer_phone || '',
      status: booking.status || 'NEW',
      token_amount: booking.token_amount || 0,
      preferred_date: booking.preferred_date || '',
      preferred_time: booking.preferred_time || '',
      move_in_timeline: booking.move_in_timeline || '',
      occupancy_type: booking.occupancy_type || '',
      assigned_agent_id: booking.assigned_agent_id ? String(booking.assigned_agent_id) : '',
      notes: booking.notes || ''
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBooking) return;
    setIsSubmitting(true);

    const updatedData = {
      customer_name: formData.customer_name,
      customer_email: formData.customer_email,
      customer_phone: formData.customer_phone,
      status: formData.status as any,
      token_amount: Number(formData.token_amount) || 0,
      preferred_date: formData.preferred_date,
      preferred_time: formData.preferred_time,
      move_in_timeline: formData.move_in_timeline,
      occupancy_type: formData.occupancy_type,
      assigned_agent_id: formData.assigned_agent_id ? (isNaN(Number(formData.assigned_agent_id)) ? (formData.assigned_agent_id as any) : Number(formData.assigned_agent_id)) : undefined,
      notes: formData.notes
    };

    // Optimistic update
    setBookings(prev => prev.map(b => b.id === editingBooking.id ? { ...b, ...updatedData } : b));

    try {
      await supabaseService.bookings.update(editingBooking.id, updatedData);
      setEditingBooking(null);
      fetchData(false);
    } catch (err) {
      console.error('Error updating booking:', err);
      fetchData(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickStatusChange = async (bookingId: number, newStatus: string) => {
    setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: newStatus as any } : b));
    try {
      await supabaseService.bookings.update(bookingId, { status: newStatus as any });
      fetchData(false);
    } catch (err) {
      console.error('Quick status update error:', err);
      fetchData(false);
    }
  };

  const handleDeleteBooking = async () => {
    if (!deleteConfirmBooking) return;
    setIsDeleting(true);
    const idToDelete = deleteConfirmBooking.id;

    // Optimistic update
    setBookings(prev => prev.filter(b => b.id !== idToDelete));
    setSelectedIds(prev => prev.filter(id => id !== idToDelete));
    setDeleteConfirmBooking(null);

    try {
      await supabaseService.bookings.delete(idToDelete);
      fetchData(false);
    } catch (err) {
      console.error('Error deleting booking:', err);
      fetchData(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsBulkDeleting(true);
    const idsToDelete = [...selectedIds];

    // Optimistic update
    setBookings(prev => prev.filter(b => !idsToDelete.includes(b.id)));
    setSelectedIds([]);
    setShowBulkDeleteModal(false);

    try {
      await supabaseService.bookings.bulkDelete(idsToDelete);
      setBulkActionMessage(`Successfully deleted ${idsToDelete.length} property bookings.`);
      setTimeout(() => setBulkActionMessage(null), 4000);
      fetchData(false);
    } catch (err) {
      console.error('Error bulk deleting bookings:', err);
      fetchData(false);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // Check if date string is within filter criteria
  const isDateMatching = (dateStr?: string) => {
    if (!dateStr || dateFilter === 'ALL') return true;
    const itemDate = new Date(dateStr);
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

  const filteredBookings = useMemo(() => {
    const list = bookings.filter(b => {
      const matchesSearch = 
        (b.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (b.customer_email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (b.customer_phone || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (b.property_title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (b.property_location || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (b.notes || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'ALL' || b.status === statusFilter;
      const matchesDate = isDateMatching(b.created_at || b.preferred_date);

      return matchesSearch && matchesStatus && matchesDate;
    });

    return list.sort((a, b) => {
      const timeA = new Date(a.created_at || 0).getTime();
      const timeB = new Date(b.created_at || 0).getTime();
      return sortOrder === 'NEWEST' ? timeB - timeA : timeA - timeB;
    });
  }, [bookings, searchTerm, statusFilter, dateFilter, customStartDate, customEndDate, sortOrder]);

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredBookings.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredBookings.map(b => b.id));
    }
  };

  const toggleSelectOne = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Export Bookings to CSV
  const exportToCSV = () => {
    if (filteredBookings.length === 0) return;

    const headers = ['ID', 'Property Title', 'Property Location', 'Customer Name', 'Phone', 'Email', 'Status', 'Token Amount (INR)', 'Preferred Date', 'Preferred Time', 'Move-in Timeline', 'Notes', 'Booking Date'];
    const rows = filteredBookings.map(b => [
      b.id,
      `"${(b.property_title || '').replace(/"/g, '""')}"`,
      `"${(b.property_location || '').replace(/"/g, '""')}"`,
      `"${(b.customer_name || '').replace(/"/g, '""')}"`,
      `"${b.customer_phone || ''}"`,
      `"${b.customer_email || ''}"`,
      `"${b.status || 'NEW'}"`,
      b.token_amount || 0,
      `"${formatDateDDMMYYYY(b.preferred_date)}"`,
      `"${b.preferred_time || ''}"`,
      `"${(b.move_in_timeline || '').replace(/"/g, '""')}"`,
      `"${(b.notes || '').replace(/"/g, '""')}"`,
      `"${formatDateTimeDDMMYYYY(b.created_at)}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Property_Booked_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-[#d4a359]/15 border border-[#d4a359]/30 flex items-center justify-center text-[#d4a359] shadow-inner">
              <BookmarkCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-serif text-white tracking-tight flex items-center gap-2">
                <span>Property Booked</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#d4a359]/20 text-[#d4a359] font-sans font-bold border border-[#d4a359]/30">
                  {bookings.length} Bookings
                </span>
              </h1>
              <p className="text-xs text-neutral-400">
                Direct booking reservations, walkthrough requests & token payments
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => fetchData(false)}
            disabled={isRefreshing}
            className="flex items-center space-x-2 px-3 py-2 bg-white/5 hover:bg-white/10 text-neutral-300 rounded-xl text-xs font-bold border border-white/10 transition-colors cursor-pointer"
            title="Refresh Bookings"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#d4a359]' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={exportToCSV}
            className="flex items-center space-x-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-neutral-200 rounded-xl text-xs font-bold border border-white/10 transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {bulkActionMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center justify-between animate-in fade-in">
          <span>{bulkActionMessage}</span>
          <button onClick={() => setBulkActionMessage(null)} className="text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-[#0e1726] border border-white/10 space-y-1">
          <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Total Bookings</span>
          <p className="text-2xl font-black text-white">{bookings.length}</p>
        </div>
        <div className="p-4 rounded-2xl bg-[#0e1726] border border-amber-500/20 space-y-1">
          <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">New Requests</span>
          <p className="text-2xl font-black text-amber-400">{bookings.filter(b => b.status === 'NEW').length}</p>
        </div>
        <div className="p-4 rounded-2xl bg-[#0e1726] border border-emerald-500/20 space-y-1">
          <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Tokens Received</span>
          <p className="text-2xl font-black text-emerald-400">
            {bookings.filter(b => b.status === 'TOKEN_RECEIVED' || (b.token_amount && b.token_amount > 0)).length}
          </p>
        </div>
        <div className="p-4 rounded-2xl bg-[#0e1726] border border-[#d4a359]/20 space-y-1">
          <span className="text-[11px] font-bold text-[#d4a359] uppercase tracking-wider">Total Tokens (₹)</span>
          <p className="text-2xl font-black text-[#d4a359]">
            ₹{bookings.reduce((sum, b) => sum + (Number(b.token_amount) || 0), 0).toLocaleString('en-IN')}
          </p>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="bg-[#0e1726] p-4 rounded-2xl border border-white/10 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search by customer, property, phone, or locality..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#080f1a] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#d4a359] transition-colors"
            />
          </div>

          {/* Quick Sort Toggle */}
          <button
            onClick={() => setSortOrder(prev => prev === 'NEWEST' ? 'OLDEST' : 'NEWEST')}
            className="flex items-center space-x-1.5 px-3 py-2.5 bg-[#080f1a] border border-white/10 rounded-xl text-xs font-bold text-neutral-300 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-[#d4a359]" />
            <span>{sortOrder === 'NEWEST' ? 'Newest First' : 'Oldest First'}</span>
          </button>
        </div>

        {/* Status and Date Filters */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/5">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            {['ALL', 'NEW', 'VISIT_SCHEDULED', 'TOKEN_RECEIVED', 'AGREEMENT_IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map((st) => {
              const active = statusFilter === st;
              const count = st === 'ALL' ? bookings.length : bookings.filter(b => b.status === st).length;
              return (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                    active 
                      ? 'bg-[#d4a359] text-[#080f1a] shadow-md font-black' 
                      : 'bg-white/5 text-neutral-300 hover:bg-white/10 hover:text-white border border-white/5'
                  }`}
                >
                  <span>{st === 'ALL' ? 'All Status' : (STATUS_CONFIG[st]?.label || st)}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${active ? 'bg-[#080f1a]/20 text-[#080f1a]' : 'bg-white/10 text-neutral-400'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Date Filter Select */}
          <div className="flex items-center gap-2 ml-auto">
            <Filter className="w-3.5 h-3.5 text-neutral-400" />
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-[#080f1a] border border-white/10 text-neutral-300 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-[#d4a359]"
            >
              <option value="ALL">All Dates</option>
              <option value="TODAY">Today</option>
              <option value="YESTERDAY">Yesterday</option>
              <option value="LAST_7_DAYS">Last 7 Days</option>
              <option value="THIS_MONTH">This Month</option>
              <option value="CUSTOM">Custom Range</option>
            </select>

            {dateFilter === 'CUSTOM' && (
              <div className="flex items-center gap-1.5 animate-in fade-in">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="bg-[#080f1a] border border-white/10 text-white text-xs rounded-xl px-2.5 py-1.5"
                />
                <span className="text-neutral-500 text-xs">to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-[#080f1a] border border-white/10 text-white text-xs rounded-xl px-2.5 py-1.5"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bulk Action Controls */}
      {selectedIds.length > 0 && (
        <div className="bg-[#d4a359]/10 border border-[#d4a359]/30 p-3.5 rounded-2xl flex items-center justify-between animate-in slide-in-from-top-2">
          <div className="flex items-center space-x-2 text-xs font-bold text-[#d4a359]">
            <CheckSquare className="w-4 h-4" />
            <span>{selectedIds.length} bookings selected</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowBulkDeleteModal(true)}
              className="px-3.5 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected</span>
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-neutral-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Bookings Table / List */}
      <div className="bg-[#0e1726] rounded-2xl border border-white/10 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-neutral-300">
            <thead className="bg-[#080f1a] text-neutral-400 uppercase text-[10px] font-black tracking-wider border-b border-white/10">
              <tr>
                <th className="p-4 w-10">
                  <button onClick={toggleSelectAll} className="cursor-pointer text-neutral-400 hover:text-white">
                    {selectedIds.length > 0 && selectedIds.length === filteredBookings.length ? (
                      <CheckSquare className="w-4 h-4 text-[#d4a359]" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="py-4 px-3">Property Details</th>
                <th className="py-4 px-3">Customer Information</th>
                <th className="py-4 px-3">Booking & Move-in</th>
                <th className="py-4 px-3">Token & Status</th>
                <th className="py-4 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-sans">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-16">
                    <div className="w-8 h-8 border-2 border-[#d4a359] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                    <p className="text-xs text-neutral-400">Loading Property Bookings...</p>
                  </td>
                </tr>
              ) : filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16">
                    <BookmarkCheck className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
                    <p className="text-base font-bold text-white mb-1">No Property Bookings Found</p>
                    <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                      {searchTerm || statusFilter !== 'ALL' || dateFilter !== 'ALL'
                        ? 'No bookings match your selected search or filter criteria.'
                        : 'Bookings submitted through "Book Property" on any property will appear here in real time.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredBookings.map((b) => {
                  const isSelected = selectedIds.includes(b.id);
                  const stConfig = STATUS_CONFIG[b.status || 'NEW'] || STATUS_CONFIG['NEW'];

                  return (
                    <tr 
                      key={b.id} 
                      className={`hover:bg-white/[0.02] transition-colors ${isSelected ? 'bg-[#d4a359]/5' : ''}`}
                    >
                      {/* Checkbox */}
                      <td className="p-4">
                        <button onClick={() => toggleSelectOne(b.id)} className="cursor-pointer text-neutral-400 hover:text-white">
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-[#d4a359]" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      {/* Property Details */}
                      <td className="py-4 px-3 min-w-[220px]">
                        <div className="flex items-center space-x-3">
                          {b.property_image ? (
                            <img
                              src={b.property_image}
                              alt={b.property_title || 'Property'}
                              className="w-12 h-12 rounded-xl object-cover border border-white/10 flex-shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-neutral-500 flex-shrink-0">
                              <Building2 className="w-5 h-5" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <h4 className="text-sm font-bold text-white truncate max-w-[200px]" title={b.property_title}>
                              {b.property_title || 'Luxury Property'}
                            </h4>
                            <p className="text-xs text-neutral-400 truncate max-w-[200px]">
                              {b.property_location || 'Pune'} • {b.property_type || 'Residential'}
                            </p>
                            {b.property_price ? (
                              <p className="text-xs font-bold text-[#d4a359]">
                                ₹{b.property_price?.toLocaleString('en-IN')}/mo
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </td>

                      {/* Customer Details */}
                      <td className="py-4 px-3 min-w-[200px]">
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-white flex items-center gap-1.5">
                            <span>{b.customer_name || 'Guest User'}</span>
                          </p>
                          <div className="flex items-center gap-2 text-xs text-neutral-300">
                            <a 
                              href={`tel:${b.customer_phone}`} 
                              className="hover:text-[#d4a359] flex items-center gap-1 text-xs"
                            >
                              <Phone className="w-3 h-3 text-[#d4a359]" />
                              <span>{b.customer_phone}</span>
                            </a>
                            {b.customer_phone && (
                              <a
                                href={`https://wa.me/${b.customer_phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hello ${b.customer_name}, thank you for booking ${b.property_title || 'property'} on Rental Pune. Our executive is ready to assist you.`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 rounded-md bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                                title="Chat on WhatsApp"
                              >
                                <MessageCircle className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                          {b.customer_email && (
                            <p className="text-xs text-neutral-400 flex items-center gap-1 truncate max-w-[180px]">
                              <Mail className="w-3 h-3 text-neutral-500" />
                              <span>{b.customer_email}</span>
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Booking & Move-in Details */}
                      <td className="py-4 px-3 min-w-[180px]">
                        <div className="space-y-1 text-xs">
                          {b.preferred_date ? (
                            <p className="text-white font-semibold flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-[#d4a359]" />
                              <span>{formatDateDDMMYYYY(b.preferred_date)} {b.preferred_time ? `(${b.preferred_time})` : ''}</span>
                            </p>
                          ) : (
                            <p className="text-neutral-500 italic">Date: Flexible</p>
                          )}
                          {b.move_in_timeline && (
                            <p className="text-neutral-400 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-neutral-500" />
                              <span>{b.move_in_timeline}</span>
                            </p>
                          )}
                          {b.created_at && (
                            <p className="text-[10px] text-neutral-500 font-mono">
                              Booked: {formatDateTimeDDMMYYYY(b.created_at)}
                            </p>
                          )}
                          {b.notes && (
                            <p className="text-[11px] text-neutral-400 italic truncate max-w-[170px]" title={b.notes}>
                              "{b.notes}"
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Token & Status */}
                      <td className="py-4 px-3 min-w-[160px]">
                        <div className="space-y-2">
                          {/* Status Dropdown */}
                          <select
                            value={b.status || 'NEW'}
                            onChange={(e) => handleQuickStatusChange(b.id, e.target.value)}
                            className={`text-xs font-bold rounded-xl px-2.5 py-1 border transition-colors cursor-pointer ${stConfig.bg} ${stConfig.text} ${stConfig.border}`}
                          >
                            <option value="NEW" className="bg-[#080f1a] text-white">New</option>
                            <option value="VISIT_SCHEDULED" className="bg-[#080f1a] text-white">Visit Scheduled</option>
                            <option value="TOKEN_RECEIVED" className="bg-[#080f1a] text-white">Token Received</option>
                            <option value="AGREEMENT_IN_PROGRESS" className="bg-[#080f1a] text-white">Agreement In Progress</option>
                            <option value="COMPLETED" className="bg-[#080f1a] text-white">Completed</option>
                            <option value="CANCELLED" className="bg-[#080f1a] text-white">Cancelled</option>
                          </select>

                          {/* Token Amount Badge */}
                          <div>
                            {b.token_amount && b.token_amount > 0 ? (
                              <span className="text-[11px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg inline-block">
                                Token: ₹{b.token_amount.toLocaleString('en-IN')}
                              </span>
                            ) : (
                              <span className="text-[10px] text-neutral-500">No token paid yet</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-3 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => setViewingBooking(b)}
                            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                            title="View Full Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEditModal(b)}
                            className="p-2 rounded-xl text-neutral-400 hover:text-[#d4a359] hover:bg-[#d4a359]/10 transition-colors cursor-pointer"
                            title="Edit Booking"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmBooking(b)}
                            className="p-2 rounded-xl text-neutral-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                            title="Delete Booking"
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

      {/* EDIT BOOKING MODAL */}
      {editingBooking && (
        <div className="fixed inset-0 bg-[#080f1a]/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0e1726] border border-[#d4a359]/30 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative animate-in zoom-in-95">
            <button
              onClick={() => setEditingBooking(null)}
              className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-white rounded-full hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-[#d4a359]/15 border border-[#d4a359]/30 flex items-center justify-center text-[#d4a359]">
                <Edit2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold font-serif text-white">Edit Property Booking</h3>
                <p className="text-xs text-neutral-400">{editingBooking.property_title || 'Manage booking details'}</p>
              </div>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Customer Name</label>
                  <input
                    type="text"
                    required
                    value={formData.customer_name}
                    onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                    className="w-full px-3.5 py-2 bg-[#080f1a] border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-[#d4a359]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={formData.customer_phone}
                    onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                    className="w-full px-3.5 py-2 bg-[#080f1a] border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-[#d4a359]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={formData.customer_email}
                    onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                    className="w-full px-3.5 py-2 bg-[#080f1a] border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-[#d4a359]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3.5 py-2 bg-[#080f1a] border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-[#d4a359]"
                  >
                    <option value="NEW">New</option>
                    <option value="VISIT_SCHEDULED">Visit Scheduled</option>
                    <option value="TOKEN_RECEIVED">Token Received</option>
                    <option value="AGREEMENT_IN_PROGRESS">Agreement In Progress</option>
                    <option value="COMPLETED">Completed / Handover</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Token Amount (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={formData.token_amount}
                    onChange={(e) => setFormData({ ...formData, token_amount: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 bg-[#080f1a] border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-[#d4a359]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Assigned Agent</label>
                  <select
                    value={formData.assigned_agent_id}
                    onChange={(e) => setFormData({ ...formData, assigned_agent_id: e.target.value })}
                    className="w-full px-3.5 py-2 bg-[#080f1a] border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-[#d4a359]"
                  >
                    <option value="">Unassigned</option>
                    {agents.map(a => (
                      <option key={a.id || a.user_id} value={a.id || a.user_id}>
                        {a.name} ({a.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Preferred Date</label>
                  <input
                    type="date"
                    value={formData.preferred_date}
                    onChange={(e) => setFormData({ ...formData, preferred_date: e.target.value })}
                    className="w-full px-3.5 py-2 bg-[#080f1a] border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-[#d4a359]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Preferred Time</label>
                  <input
                    type="text"
                    placeholder="e.g. 11:00 AM"
                    value={formData.preferred_time}
                    onChange={(e) => setFormData({ ...formData, preferred_time: e.target.value })}
                    className="w-full px-3.5 py-2 bg-[#080f1a] border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-[#d4a359]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">Internal Notes</label>
                <textarea
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Add details on token terms, agreements, client background..."
                  className="w-full px-3.5 py-2 bg-[#080f1a] border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-[#d4a359]"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingBooking(null)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-neutral-300 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-[#d4a359] hover:bg-[#e5b364] text-[#080f1a] rounded-xl text-xs font-bold cursor-pointer"
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW BOOKING DETAILS MODAL */}
      {viewingBooking && (
        <div className="fixed inset-0 bg-[#080f1a]/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0e1726] border border-[#d4a359]/30 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative animate-in zoom-in-95 space-y-4">
            <button
              onClick={() => setViewingBooking(null)}
              className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-white rounded-full hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 border-b border-white/10 pb-4">
              <div className="w-12 h-12 rounded-xl bg-[#d4a359]/15 border border-[#d4a359]/30 flex items-center justify-center text-[#d4a359]">
                <BookmarkCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold font-serif text-white">{viewingBooking.property_title || 'Property Booking'}</h3>
                <p className="text-xs text-neutral-400">Booking ID #{viewingBooking.id} • {viewingBooking.property_location}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-[#080f1a] rounded-xl border border-white/5">
                <span className="text-neutral-400 block mb-0.5">Customer Name</span>
                <span className="text-white font-bold text-sm">{viewingBooking.customer_name}</span>
              </div>
              <div className="p-3 bg-[#080f1a] rounded-xl border border-white/5">
                <span className="text-neutral-400 block mb-0.5">Phone Number</span>
                <a href={`tel:${viewingBooking.customer_phone}`} className="text-[#d4a359] font-bold text-sm hover:underline">
                  {viewingBooking.customer_phone}
                </a>
              </div>
              <div className="p-3 bg-[#080f1a] rounded-xl border border-white/5">
                <span className="text-neutral-400 block mb-0.5">Preferred Date / Time</span>
                <span className="text-white font-semibold">
                  {viewingBooking.preferred_date ? formatDateDDMMYYYY(viewingBooking.preferred_date) : 'Flexible'} {viewingBooking.preferred_time ? `• ${viewingBooking.preferred_time}` : ''}
                </span>
              </div>
              <div className="p-3 bg-[#080f1a] rounded-xl border border-white/5">
                <span className="text-neutral-400 block mb-0.5">Token Paid</span>
                <span className="text-emerald-400 font-bold text-sm">
                  {viewingBooking.token_amount ? `₹${viewingBooking.token_amount.toLocaleString('en-IN')}` : '₹0 (None)'}
                </span>
              </div>
            </div>

            {viewingBooking.created_at && (
              <div className="p-3 bg-[#080f1a] rounded-xl border border-white/5 text-xs flex items-center justify-between">
                <span className="text-neutral-400 font-medium">Booking Received On:</span>
                <span className="text-white font-mono font-bold">{formatDateTimeDDMMYYYY(viewingBooking.created_at)}</span>
              </div>
            )}

            {viewingBooking.notes && (
              <div className="p-3.5 bg-[#080f1a] rounded-xl border border-white/5 text-xs">
                <span className="text-neutral-400 block mb-1 font-semibold">Notes / Requirements:</span>
                <p className="text-neutral-200 leading-relaxed">{viewingBooking.notes}</p>
              </div>
            )}

            <div className="flex items-center space-x-2 pt-2">
              <a
                href={`https://wa.me/${viewingBooking.customer_phone?.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hi ${viewingBooking.customer_name}, regarding your booking for ${viewingBooking.property_title || 'property'}:`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp Client</span>
              </a>
              <button
                onClick={() => {
                  const b = viewingBooking;
                  setViewingBooking(null);
                  openEditModal(b);
                }}
                className="px-4 py-2.5 bg-[#d4a359] hover:bg-[#e5b364] text-[#080f1a] font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Edit Booking
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SINGLE DELETE CONFIRM MODAL */}
      {deleteConfirmBooking && (
        <div className="fixed inset-0 bg-[#080f1a]/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0e1726] border border-red-500/30 rounded-3xl max-w-md w-full p-6 text-center space-y-4 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold font-serif text-white">Delete Property Booking?</h3>
            <p className="text-xs text-neutral-300">
              Are you sure you want to delete the booking for <strong className="text-white">{deleteConfirmBooking.customer_name}</strong> on <strong className="text-white">{deleteConfirmBooking.property_title}</strong>? This action cannot be undone.
            </p>
            <div className="flex items-center justify-center space-x-3 pt-2">
              <button
                onClick={() => setDeleteConfirmBooking(null)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-neutral-300 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteBooking}
                disabled={isDeleting}
                className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BULK DELETE CONFIRM MODAL */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 bg-[#080f1a]/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0e1726] border border-red-500/30 rounded-3xl max-w-md w-full p-6 text-center space-y-4 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold font-serif text-white">Bulk Delete {selectedIds.length} Bookings?</h3>
            <p className="text-xs text-neutral-300">
              This will permanently delete {selectedIds.length} selected property booking records from the database.
            </p>
            <div className="flex items-center justify-center space-x-3 pt-2">
              <button
                onClick={() => setShowBulkDeleteModal(false)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-neutral-300 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={isBulkDeleting}
                className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                {isBulkDeleting ? 'Deleting...' : 'Delete All Selected'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
