import { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '../../store/index.js';
import { Lead, Property, User } from '../../types.js';
import { 
  Users, 
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
  Filter
} from 'lucide-react';

export default function Leads() {
  const { token } = useAppStore();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [agents, setAgents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
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
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [deleteConfirmLead, setDeleteConfirmLead] = useState<Lead | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    status: 'New',
    source: 'Website',
    assigned_agent_id: '',
    property_id: '',
    notes: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [leadsRes, propsRes, agentsRes] = await Promise.all([
        fetch('/api/leads', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/properties'),
        fetch('/api/agents', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      if (leadsRes.ok) setLeads(await leadsRes.json());
      if (propsRes.ok) setProperties(await propsRes.json());
      if (agentsRes.ok) setAgents(await agentsRes.json());
    } catch (err) {
      console.error('Error fetching leads data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const openEditModal = (lead: Lead) => {
    setEditingLead(lead);
    setFormData({
      name: lead.name || '',
      email: lead.email || '',
      phone: lead.phone || '',
      status: lead.status || 'New',
      source: lead.source || 'Website',
      assigned_agent_id: lead.assigned_agent_id ? String(lead.assigned_agent_id) : '',
      property_id: lead.property_id ? String(lead.property_id) : '',
      notes: lead.notes || ''
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLead) return;
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/leads/${editingLead.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          status: formData.status,
          source: formData.source,
          assigned_agent_id: formData.assigned_agent_id ? Number(formData.assigned_agent_id) : null,
          property_id: formData.property_id ? Number(formData.property_id) : null,
          notes: formData.notes
        })
      });

      if (res.ok) {
        setEditingLead(null);
        fetchData();
      }
    } catch (err) {
      console.error('Error updating lead:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteLead = async () => {
    if (!deleteConfirmLead) return;
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/leads/${deleteConfirmLead.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        setSelectedIds(prev => prev.filter(id => id !== deleteConfirmLead.id));
        setDeleteConfirmLead(null);
        fetchData();
      }
    } catch (err) {
      console.error('Error deleting lead:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Bulk Delete Handler
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsBulkDeleting(true);
    try {
      const res = await fetch('/api/leads/bulk-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ids: selectedIds })
      });

      if (res.ok) {
        const data = await res.json();
        setBulkActionMessage(data.message || `Successfully deleted ${selectedIds.length} leads.`);
        setTimeout(() => setBulkActionMessage(null), 4000);
        setSelectedIds([]);
        setShowBulkDeleteModal(false);
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to bulk delete leads');
      }
    } catch (err) {
      console.error('Error in bulk deleting leads:', err);
      alert('Network error while performing bulk delete');
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

  const filteredLeads = useMemo(() => {
    const list = leads.filter(l => {
      const matchesSearch = 
        (l.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (l.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (l.phone || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (l.property_title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (l.source || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'ALL' || l.status === statusFilter;
      const matchesDate = isDateMatching(l.created_at);

      return matchesSearch && matchesStatus && matchesDate;
    });

    return list.sort((a, b) => {
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return sortOrder === 'NEWEST' ? timeB - timeA : timeA - timeB;
    });
  }, [leads, searchTerm, statusFilter, dateFilter, customStartDate, customEndDate, sortOrder]);

  // Selection Helpers
  const isAllSelected = filteredLeads.length > 0 && filteredLeads.every(l => selectedIds.includes(l.id));
  const isSomeSelected = filteredLeads.some(l => selectedIds.includes(l.id)) && !isAllSelected;

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      const filteredLeadIds = new Set(filteredLeads.map(l => l.id));
      setSelectedIds(prev => prev.filter(id => !filteredLeadIds.has(id)));
    } else {
      const filteredLeadIds = filteredLeads.map(l => l.id);
      setSelectedIds(prev => Array.from(new Set([...prev, ...filteredLeadIds])));
    }
  };

  const handleToggleSelectRow = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const exportToCSV = () => {
    const dataToExport = selectedIds.length > 0
      ? leads.filter(l => selectedIds.includes(l.id))
      : (filteredLeads.length > 0 ? filteredLeads : leads);

    if (dataToExport.length === 0) {
      alert('No leads available to export.');
      return;
    }

    const headers = [
      'Lead ID',
      'Client Name',
      'Phone',
      'Email',
      'Property Interest',
      'Status',
      'Source',
      'Assigned Agent',
      'Inquiry Date',
      'Notes'
    ];

    const rows = dataToExport.map(lead => {
      const assignedAgent = agents.find(a => a.id === lead.assigned_agent_id);
      return [
        lead.id,
        `"${(lead.name || '').replace(/"/g, '""')}"`,
        `"${(lead.phone || '').replace(/"/g, '""')}"`,
        `"${(lead.email || '').replace(/"/g, '""')}"`,
        `"${(lead.property_title || 'General Inquiry').replace(/"/g, '""')}"`,
        `"${(lead.status || 'New').replace(/"/g, '""')}"`,
        `"${(lead.source || 'Website').replace(/"/g, '""')}"`,
        `"${(assignedAgent ? assignedAgent.name : 'Unassigned').replace(/"/g, '""')}"`,
        `"${lead.created_at ? new Date(lead.created_at).toLocaleString('en-IN') : ''}"`,
        `"${(lead.notes || '').replace(/"/g, '""')}"`
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `rental_pune_leads_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'New':
        return 'bg-blue-950/60 text-blue-400 border-blue-600/40';
      case 'Contacted':
        return 'bg-amber-950/60 text-amber-400 border-amber-600/40';
      case 'Interested':
        return 'bg-emerald-950/60 text-emerald-400 border-emerald-600/40';
      case 'Site Visit Scheduled':
      case 'Site Visit Completed':
        return 'bg-red-950/60 text-red-400 border-red-600/40';
      case 'Converted':
        return 'bg-purple-950/60 text-purple-400 border-purple-600/40 font-black';
      case 'Lost':
        return 'bg-neutral-900 text-neutral-500 border-neutral-800';
      default:
        return 'bg-neutral-900 text-neutral-300 border-neutral-800';
    }
  };

  const formatDateDisplay = (dateStr?: string) => {
    if (!dateStr) return { date: 'Recent', time: '' };
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return { date: dateStr, time: '' };
      return {
        date: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        time: d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
      };
    } catch {
      return { date: dateStr, time: '' };
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-5">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Leads & Inquiries CRM</h1>
            <span className="px-3 py-0.5 rounded-full bg-red-600/20 text-red-400 border border-red-600/40 text-xs font-bold">
              {leads.length} Total Leads
            </span>
          </div>
          <p className="text-sm text-neutral-400 mt-1">
            Track prospective client enquiries, filter by date, manage pipeline stages, and execute bulk operations.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={exportToCSV}
            className="inline-flex items-center space-x-2 px-4 py-2.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-xl font-bold text-xs transition-all shadow-md cursor-pointer hover:border-emerald-500/60"
            title="Download CSV spreadsheet of inquiries"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>{selectedIds.length > 0 ? `Export Selected (${selectedIds.length})` : 'Export CSV'}</span>
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {bulkActionMessage && (
        <div className="p-3.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold rounded-2xl flex items-center justify-between animate-in fade-in duration-150">
          <div className="flex items-center space-x-2">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{bulkActionMessage}</span>
          </div>
          <button onClick={() => setBulkActionMessage(null)} className="text-emerald-400 hover:text-white">
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
                {selectedIds.length} {selectedIds.length === 1 ? 'Lead' : 'Leads'} Selected
              </p>
              <p className="text-[11px] text-neutral-400">
                You can delete or export selected records in bulk from the database.
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

      {/* Search, Pipeline & Date Filter Controls */}
      <div className="bg-neutral-950 p-4 rounded-3xl border border-neutral-800 space-y-4 shadow-xl">
        {/* Top search & Sort row */}
        <div className="flex flex-col md:flex-row gap-3 justify-between items-center">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-neutral-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search client name, email, phone, source..."
              className="w-full pl-10 pr-4 py-2 bg-black border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-red-600 transition-colors"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-3 top-2.5 text-neutral-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Sort Order */}
          <div className="flex items-center space-x-2 w-full md:w-auto justify-end">
            <span className="text-xs font-bold text-neutral-500 uppercase">Sort Date:</span>
            <button
              onClick={() => setSortOrder(prev => prev === 'NEWEST' ? 'OLDEST' : 'NEWEST')}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-red-500" />
              <span>{sortOrder === 'NEWEST' ? 'Newest First' : 'Oldest First'}</span>
            </button>
          </div>
        </div>

        {/* Pipeline Stage Filter Pills */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1">
          <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider whitespace-nowrap mr-1">Stage:</span>
          {['ALL', 'New', 'Contacted', 'Interested', 'Site Visit Scheduled', 'Converted', 'Lost'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                statusFilter === status
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                  : 'bg-black border border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-900'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Date Range Section */}
        <div className="pt-3 border-t border-neutral-900 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2 overflow-x-auto pb-1">
            <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider flex items-center space-x-1 whitespace-nowrap mr-1">
              <Calendar className="w-3.5 h-3.5 text-red-500" />
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
                className="bg-neutral-950 border border-neutral-800 rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:border-red-600"
              />
              <span className="text-[11px] text-neutral-400 font-bold">To:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={e => setCustomEndDate(e.target.value)}
                className="bg-neutral-950 border border-neutral-800 rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:border-red-600"
              />
            </div>
          )}

          <div className="text-neutral-400 font-mono text-[11px] ml-auto">
            Showing <strong className="text-white">{filteredLeads.length}</strong> of {leads.length} leads
          </div>
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-neutral-950 rounded-3xl border border-neutral-800 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black border-b border-neutral-800 text-xs font-bold uppercase tracking-wider text-neutral-400">
                {/* Select All Checkbox */}
                <th className="px-4 py-4 w-12 text-center">
                  <button
                    onClick={handleToggleSelectAll}
                    className="p-1 rounded text-neutral-400 hover:text-white cursor-pointer transition-colors"
                    title={isAllSelected ? "Deselect all" : "Select all filtered leads"}
                  >
                    {isAllSelected ? (
                      <CheckSquare className="w-4 h-4 text-red-500" />
                    ) : isSomeSelected ? (
                      <div className="w-4 h-4 bg-red-600/30 border border-red-500 rounded flex items-center justify-center">
                        <div className="w-2 h-0.5 bg-white" />
                      </div>
                    ) : (
                      <Square className="w-4 h-4 text-neutral-600" />
                    )}
                  </button>
                </th>
                <th className="px-5 py-4">Lead Information</th>
                <th className="px-5 py-4">Status & Stage</th>
                <th className="px-5 py-4">Property Interest</th>
                <th className="px-5 py-4">Assigned Agent</th>
                <th className="px-5 py-4">Date & Source</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-900 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-neutral-400">
                    <div className="w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading leads database...
                  </td>
                </tr>
              ) : filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-neutral-500">
                    No leads found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => {
                  const isSelected = selectedIds.includes(lead.id);
                  const dateInfo = formatDateDisplay(lead.created_at);

                  return (
                    <tr 
                      key={lead.id} 
                      className={`transition-colors ${isSelected ? 'bg-red-950/20' : 'hover:bg-neutral-900/60'}`}
                    >
                      {/* Selection Checkbox */}
                      <td className="px-4 py-4 text-center">
                        <button
                          onClick={() => handleToggleSelectRow(lead.id)}
                          className="p-1 text-neutral-400 hover:text-white cursor-pointer transition-colors"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-red-500" />
                          ) : (
                            <Square className="w-4 h-4 text-neutral-700 hover:text-neutral-400" />
                          )}
                        </button>
                      </td>

                      <td className="px-5 py-4">
                        <div>
                          <div className="font-bold text-white text-base flex items-center space-x-2">
                            <span>{lead.name}</span>
                            <span className="text-[10px] font-mono text-neutral-500 bg-neutral-900 px-1.5 py-0.5 rounded border border-neutral-800">
                              #{lead.id}
                            </span>
                          </div>
                          <div className="flex flex-col text-xs text-neutral-400 mt-1 space-y-0.5">
                            {lead.email && (
                              <span className="flex items-center">
                                <Mail className="w-3 h-3 mr-1 text-neutral-500" />
                                {lead.email}
                              </span>
                            )}
                            <span className="flex items-center text-neutral-300 font-medium">
                              <Phone className="w-3 h-3 mr-1 text-red-500" />
                              {lead.phone}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusBadge(lead.status)}`}>
                          {lead.status}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-neutral-300">
                        {lead.property_title ? (
                          <div className="flex items-center space-x-1.5">
                            <Building2 className="w-4 h-4 text-red-500 flex-shrink-0" />
                            <span className="font-medium text-white truncate max-w-xs">{lead.property_title}</span>
                          </div>
                        ) : (
                          <span className="text-neutral-500 text-xs italic">General Real Estate Query</span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        {lead.assigned_agent_name ? (
                          <span className="px-2.5 py-1 bg-black border border-neutral-800 rounded-lg text-xs font-bold text-white flex items-center w-fit space-x-1">
                            <UserCheck className="w-3.5 h-3.5 text-red-500" />
                            <span>{lead.assigned_agent_name}</span>
                          </span>
                        ) : (
                          <span className="text-neutral-500 text-xs italic">Unassigned</span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-xs text-neutral-400">
                        <div>
                          <div className="flex items-center space-x-1 text-neutral-200 font-bold">
                            <Calendar className="w-3.5 h-3.5 text-red-400" />
                            <span>{dateInfo.date}</span>
                          </div>
                          {dateInfo.time && (
                            <div className="flex items-center space-x-1 text-neutral-500 text-[11px] mt-0.5">
                              <Clock className="w-3 h-3 text-neutral-600" />
                              <span>{dateInfo.time}</span>
                            </div>
                          )}
                          <span className="text-neutral-500 text-[10px] block mt-0.5 uppercase tracking-wider font-semibold">
                            via {lead.source || 'Website'}
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            id={`btn-edit-lead-${lead.id}`}
                            onClick={() => openEditModal(lead)}
                            className="p-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-red-600/40 text-neutral-300 hover:text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                            title="Edit Lead"
                          >
                            <Edit2 className="w-4 h-4 text-neutral-300 hover:text-red-400" />
                          </button>
                          <button
                            id={`btn-delete-lead-${lead.id}`}
                            onClick={() => setDeleteConfirmLead(lead)}
                            className="p-2 bg-neutral-900 hover:bg-red-950/40 border border-neutral-800 hover:border-red-600 text-neutral-400 hover:text-red-400 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                            title="Delete Lead"
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

      {/* EDIT LEAD MODAL */}
      {editingLead && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-950 border border-neutral-800 text-white rounded-3xl max-w-lg w-full p-6 shadow-2xl relative space-y-4 animate-in fade-in zoom-in duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div>
                <h3 className="text-xl font-bold text-white">Edit Client Lead</h3>
                <p className="text-xs text-neutral-400">Lead ID #{editingLead.id} • Registered via {editingLead.source || 'Website'}</p>
              </div>
              <button 
                onClick={() => setEditingLead(null)}
                className="p-1.5 rounded-full bg-neutral-900 text-neutral-400 hover:text-white hover:border-red-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1">Full Name *</label>
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-black border border-neutral-800 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1">Phone Number *</label>
                  <input
                    required
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-black border border-neutral-800 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-black border border-neutral-800 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1">Pipeline Stage</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-black border border-neutral-800 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-600"
                  >
                    <option value="New">New</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Interested">Interested</option>
                    <option value="Site Visit Scheduled">Site Visit Scheduled</option>
                    <option value="Site Visit Completed">Site Visit Completed</option>
                    <option value="Follow-up">Follow-up</option>
                    <option value="Negotiation">Negotiation</option>
                    <option value="Converted">Converted</option>
                    <option value="Lost">Lost</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1">Assign Agent</label>
                  <select
                    value={formData.assigned_agent_id}
                    onChange={(e) => setFormData({ ...formData, assigned_agent_id: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-black border border-neutral-800 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-600"
                  >
                    <option value="">-- Unassigned --</option>
                    {agents.map((ag) => (
                      <option key={ag.id} value={ag.id}>
                        {ag.name} ({ag.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1">Associated Property</label>
                <select
                  value={formData.property_id}
                  onChange={(e) => setFormData({ ...formData, property_id: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-black border border-neutral-800 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-600"
                >
                  <option value="">-- General Property Inquiry --</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      #{p.id} - {p.title} ({p.price ? `₹${Number(p.price).toLocaleString('en-IN')}` : ''})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1">Internal Notes & History</label>
                <textarea
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="e.g. Looking for high floor unit with skyline view, cash buyer."
                  className="w-full px-3.5 py-2.5 bg-black border border-neutral-800 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setEditingLead(null)}
                  className="px-4 py-2 bg-neutral-900 text-neutral-300 hover:text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="btn-save-lead"
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md shadow-red-600/30 flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSubmitting ? 'Saving...' : 'Update Lead'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SINGLE DELETE CONFIRMATION MODAL */}
      {deleteConfirmLead && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-950 border border-red-900/50 text-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="w-12 h-12 rounded-2xl bg-red-950/80 border border-red-600/40 flex items-center justify-center text-red-500 mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-xl font-bold text-white">Delete Lead?</h3>
              <p className="text-neutral-400 text-xs">
                Are you sure you want to permanently delete lead <strong className="text-white">"{deleteConfirmLead.name}"</strong>? All associated site visit schedules and invoices will also be removed from the database.
              </p>
            </div>

            <div className="flex items-center justify-center space-x-3 pt-4 border-t border-neutral-900">
              <button
                type="button"
                onClick={() => setDeleteConfirmLead(null)}
                className="px-5 py-2.5 bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="btn-confirm-delete-lead"
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteLead}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors shadow-lg shadow-red-600/30 flex items-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeleting ? 'Deleting...' : 'Yes, Delete Lead'}</span>
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
              <h3 className="text-xl font-bold text-white">Bulk Delete {selectedIds.length} Leads?</h3>
              <p className="text-neutral-400 text-xs">
                This will permanently delete the <strong className="text-white">{selectedIds.length} selected leads</strong> along with their site visits, feedback, and invoices from the database. This action cannot be undone.
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
                <span>{isBulkDeleting ? 'Deleting Selected...' : `Yes, Delete ${selectedIds.length} Leads`}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
