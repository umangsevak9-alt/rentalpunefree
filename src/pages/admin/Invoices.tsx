import React, { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '../../store/index.js';
import { Invoice, InvoiceItem, Property, Lead } from '../../types.js';
import { formatINR, numberToWordsINR } from '../../utils/currency.js';
import {
  FileText,
  Plus,
  Search,
  Printer,
  Trash2,
  Edit3,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Download,
  IndianRupee,
  Building2,
  User,
  Calendar,
  X,
  CreditCard,
  Building,
  Check,
  RefreshCw,
  Eye,
  SlidersHorizontal,
  ChevronDown,
  QrCode,
  Copy,
  ShieldCheck
} from 'lucide-react';

const PRESET_LINE_ITEMS = [
  { description: 'Booking Token & Advance Application Fee', category: 'Booking', rate: 100000 },
  { description: 'Base Property Unit Consideration', category: 'Property Value', rate: 4500000 },
  { description: 'Floor Rise & Preferred Location Premium (PLC)', category: 'Premium', rate: 250000 },
  { description: 'Covered Stilt / Basement Parking Slot', category: 'Parking', rate: 300000 },
  { description: 'Clubhouse, Gym & Infrastructure Development Charges', category: 'Amenities', rate: 150000 },
  { description: 'Advance Common Area Maintenance (12 Months)', category: 'Maintenance', rate: 60000 },
  { description: 'Legal, Drafting & Agreement Charges', category: 'Legal', rate: 25000 },
  { description: 'Stamp Duty & Registration Assistance Fee', category: 'Government', rate: 35000 },
];

export default function Invoices() {
  const { token, settings } = useAppStore();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [editingInvoiceId, setEditingInvoiceId] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // Quick Payment Update state
  const [paymentAmountInput, setPaymentAmountInput] = useState<string>('');
  const [paymentModeInput, setPaymentModeInput] = useState<string>('Bank Transfer / NEFT / RTGS');

  // Form State
  const [formData, setFormData] = useState({
    invoice_number: '',
    lead_id: '',
    property_id: '',
    client_name: '',
    client_email: '',
    client_phone: '',
    client_address: '',
    client_pan: '',
    client_gstin: '',
    property_title: '',
    tax_type: 'GST_18',
    tax_rate: 18,
    discount: 0,
    amount_paid: 0,
    status: 'Pending',
    payment_mode: 'Bank Transfer / NEFT / RTGS',
    issue_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
    notes: 'Thank you for choosing us for your real estate journey. Please make payments via RTGS/NEFT to the bank account details mentioned.',
    terms: '1. All payments must be made in Indian Rupees (₹ INR).\n2. Applicable GST is charged as per prevailing Government of India norms.\n3. Delayed payments beyond the due date may attract interest @ 1.5% per month.\n4. Cheques / Drafts subject to realization.',
    // Payment Receiving Coordinates
    bank_name: '',
    account_holder: '',
    account_number: '',
    ifsc_code: '',
    branch_name: '',
    account_type: 'Current Account',
    upi_id: '',
    payment_instructions: 'Please mention Invoice Number in payment remarks/narration and share screenshot via WhatsApp or email once transferred.'
  });

  const [copiedUpi, setCopiedUpi] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleAutofillBankingFromSettings = () => {
    setFormData(prev => ({
      ...prev,
      bank_name: settings.bank_name || prev.bank_name || 'HDFC Bank Ltd.',
      account_holder: settings.account_holder || settings.company_name || prev.account_holder || 'Serene Estates Pvt. Ltd.',
      account_number: settings.account_number || prev.account_number || '50200088991122',
      ifsc_code: settings.ifsc_code || prev.ifsc_code || 'HDFC0000240',
      branch_name: settings.branch_name || prev.branch_name || 'Bandra Kurla Complex, Mumbai',
      account_type: settings.account_type || prev.account_type || 'Current Account',
      upi_id: settings.upi_id || prev.upi_id || 'sereneestates@hdfcbank',
      payment_instructions: settings.payment_instructions || prev.payment_instructions || 'Please mention Invoice Number in payment remarks/narration and share screenshot via WhatsApp or email once transferred.'
    }));
  };

  const [items, setItems] = useState<InvoiceItem[]>([
    {
      description: 'Booking Advance / Property Consideration',
      category: 'Property',
      quantity: 1,
      rate: 500000,
      amount: 500000
    }
  ]);

  // Load Invoices, Properties & Leads
  const fetchData = async () => {
    setLoading(true);
    try {
      const [invRes, propRes, leadRes] = await Promise.all([
        fetch('/api/invoices', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/properties'),
        fetch('/api/leads', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      if (invRes.ok) {
        const invData = await invRes.json();
        setInvoices(invData);
      }
      if (propRes.ok) {
        const propData = await propRes.json();
        setProperties(propData);
      }
      if (leadRes.ok) {
        const leadData = await leadRes.json();
        setLeads(leadData);
      }
    } catch (err) {
      console.error('Error loading invoices data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  // Calculations for Form
  const subtotal = useMemo(() => {
    return items.reduce((acc, it) => acc + (Number(it.amount) || 0), 0);
  }, [items]);

  const taxAmount = useMemo(() => {
    if (formData.tax_type === 'NONE') return 0;
    const rate = Number(formData.tax_rate) || 0;
    return Math.round((subtotal * rate) / 100);
  }, [subtotal, formData.tax_type, formData.tax_rate]);

  const totalAmount = useMemo(() => {
    const disc = Number(formData.discount) || 0;
    return Math.max(0, subtotal + taxAmount - disc);
  }, [subtotal, taxAmount, formData.discount]);

  const balanceDue = useMemo(() => {
    const paid = Number(formData.amount_paid) || 0;
    return Math.max(0, totalAmount - paid);
  }, [totalAmount, formData.amount_paid]);

  // Summary Metrics (in INR ₹)
  const stats = useMemo(() => {
    let totalInvoiced = 0;
    let totalCollected = 0;
    let totalDue = 0;
    let paidCount = 0;
    let pendingCount = 0;

    invoices.forEach(inv => {
      totalInvoiced += Number(inv.total) || 0;
      totalCollected += Number(inv.amount_paid) || 0;
      totalDue += Number(inv.balance_due) || 0;
      if (inv.status === 'Paid') paidCount++;
      if (inv.status === 'Pending' || inv.status === 'Partially Paid' || inv.status === 'Overdue') pendingCount++;
    });

    return {
      totalInvoiced,
      totalCollected,
      totalDue,
      paidCount,
      pendingCount,
      count: invoices.length
    };
  }, [invoices]);

  // Filtered list
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const matchSearch =
        inv.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.client_phone?.includes(searchTerm) ||
        inv.property_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.client_email?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchStatus = statusFilter === 'ALL' || inv.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [invoices, searchTerm, statusFilter]);

  // Handlers for Items
  const handleItemChange = (index: number, field: keyof InvoiceItem, val: any) => {
    setItems(prev => {
      const copy = [...prev];
      const target = { ...copy[index], [field]: val };
      if (field === 'quantity' || field === 'rate') {
        const qty = field === 'quantity' ? Number(val) : Number(target.quantity);
        const rate = field === 'rate' ? Number(val) : Number(target.rate);
        target.amount = Math.round(qty * rate);
      }
      copy[index] = target;
      return copy;
    });
  };

  const addItem = (preset?: { description: string; category?: string; rate: number }) => {
    setItems(prev => [
      ...prev,
      {
        description: preset ? preset.description : 'Custom Real Estate Service / Fee',
        category: preset ? preset.category : 'General',
        quantity: 1,
        rate: preset ? preset.rate : 50000,
        amount: preset ? preset.rate : 50000
      }
    ]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  // Open Create Form
  const handleOpenCreate = () => {
    const year = new Date().getFullYear();
    const count = invoices.length + 1;
    const autoNumber = `INV-${year}-${String(count).padStart(4, '0')}`;

    setEditingInvoiceId(null);
    setFormData({
      invoice_number: autoNumber,
      lead_id: '',
      property_id: '',
      client_name: '',
      client_email: '',
      client_phone: '',
      client_address: '',
      client_pan: '',
      client_gstin: '',
      property_title: '',
      tax_type: 'GST_18',
      tax_rate: 18,
      discount: 0,
      amount_paid: 0,
      status: 'Pending',
      payment_mode: 'Bank Transfer / NEFT / RTGS',
      issue_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
      notes: 'Thank you for choosing us for your real estate journey. Please make payments via RTGS/NEFT to the bank account details mentioned.',
      terms: '1. All payments must be made in Indian Rupees (₹ INR).\n2. Applicable GST is charged as per prevailing Government of India norms.\n3. Delayed payments beyond the due date may attract interest @ 1.5% per month.\n4. Cheques / Drafts subject to realization.',
      // Default to Global Settings Bank & UPI
      bank_name: settings.bank_name || 'HDFC Bank Ltd.',
      account_holder: settings.account_holder || settings.company_name || 'Serene Estates Pvt. Ltd.',
      account_number: settings.account_number || '50200088991122',
      ifsc_code: settings.ifsc_code || 'HDFC0000240',
      branch_name: settings.branch_name || 'Bandra Kurla Complex, Mumbai',
      account_type: settings.account_type || 'Current Account',
      upi_id: settings.upi_id || 'sereneestates@hdfcbank',
      payment_instructions: settings.payment_instructions || 'Please mention Invoice Number in payment remarks/narration and share screenshot via WhatsApp or email once transferred.'
    });

    setItems([
      {
        description: 'Booking Advance / Property Consideration',
        category: 'Property',
        quantity: 1,
        rate: 500000,
        amount: 500000
      }
    ]);
    setIsFormOpen(true);
  };

  // Open Edit Form
  const handleOpenEdit = (inv: Invoice) => {
    setEditingInvoiceId(inv.id);
    let parsedItems: InvoiceItem[] = [];
    if (Array.isArray(inv.items)) {
      parsedItems = inv.items;
    } else if (typeof inv.items === 'string') {
      try {
        parsedItems = JSON.parse(inv.items);
      } catch (e) {
        parsedItems = [];
      }
    }

    if (parsedItems.length === 0) {
      parsedItems = [{ description: 'Property Consideration', quantity: 1, rate: inv.subtotal, amount: inv.subtotal }];
    }

    setFormData({
      invoice_number: inv.invoice_number || '',
      lead_id: inv.lead_id ? String(inv.lead_id) : '',
      property_id: inv.property_id ? String(inv.property_id) : '',
      client_name: inv.client_name || '',
      client_email: inv.client_email || '',
      client_phone: inv.client_phone || '',
      client_address: inv.client_address || '',
      client_pan: inv.client_pan || '',
      client_gstin: inv.client_gstin || '',
      property_title: inv.property_title || '',
      tax_type: inv.tax_type || 'GST_18',
      tax_rate: inv.tax_rate !== undefined ? inv.tax_rate : 18,
      discount: inv.discount || 0,
      amount_paid: inv.amount_paid || 0,
      status: inv.status || 'Pending',
      payment_mode: inv.payment_mode || 'Bank Transfer / NEFT / RTGS',
      issue_date: inv.issue_date || new Date().toISOString().split('T')[0],
      due_date: inv.due_date || '',
      notes: inv.notes || '',
      terms: inv.terms || '',
      bank_name: inv.bank_name || settings.bank_name || '',
      account_holder: inv.account_holder || settings.account_holder || settings.company_name || '',
      account_number: inv.account_number || settings.account_number || '',
      ifsc_code: inv.ifsc_code || settings.ifsc_code || '',
      branch_name: inv.branch_name || settings.branch_name || '',
      account_type: inv.account_type || settings.account_type || 'Current Account',
      upi_id: inv.upi_id || settings.upi_id || '',
      payment_instructions: inv.payment_instructions || settings.payment_instructions || ''
    });

    setItems(parsedItems);
    setIsFormOpen(true);
  };

  // Autofill Lead
  const handleSelectLead = (leadIdStr: string) => {
    const lead = leads.find(l => String(l.id) === leadIdStr);
    if (lead) {
      setFormData(prev => ({
        ...prev,
        lead_id: String(lead.id),
        client_name: lead.name || prev.client_name,
        client_email: lead.email || prev.client_email,
        client_phone: lead.phone || prev.client_phone,
        property_id: lead.property_id ? String(lead.property_id) : prev.property_id
      }));

      if (lead.property_id) {
        const prop = properties.find(p => p.id === lead.property_id);
        if (prop) {
          setFormData(prev => ({
            ...prev,
            property_title: prop.title
          }));
        }
      }
    } else {
      setFormData(prev => ({ ...prev, lead_id: '' }));
    }
  };

  // Autofill Property
  const handleSelectProperty = (propIdStr: string) => {
    const prop = properties.find(p => String(p.id) === propIdStr);
    if (prop) {
      setFormData(prev => ({
        ...prev,
        property_id: String(prop.id),
        property_title: prop.title
      }));
      // Set default base rate from property price if items are basic
      if (items.length === 1 && items[0].description.includes('Consideration')) {
        setItems([{
          description: `Unit Consideration - ${prop.title} (${prop.type})`,
          category: 'Base Unit',
          quantity: 1,
          rate: prop.price || 5000000,
          amount: prop.price || 5000000
        }]);
      }
    } else {
      setFormData(prev => ({ ...prev, property_id: '', property_title: '' }));
    }
  };

  // Save Invoice (Create or Update)
  const handleSubmitInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.client_name.trim()) {
      alert('Please enter client/buyer name.');
      return;
    }

    const payload = {
      ...formData,
      items,
      subtotal,
      tax: taxAmount,
      total: totalAmount,
      balance_due: balanceDue,
      status: formData.status
    };

    try {
      if (editingInvoiceId) {
        const res = await fetch(`/api/invoices/${editingInvoiceId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('Failed to update invoice');
      } else {
        const res = await fetch('/api/invoices', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('Failed to create invoice');
      }

      setIsFormOpen(false);
      fetchData();
    } catch (err) {
      console.error('Invoice submit error:', err);
      alert('Failed to save invoice. Please try again.');
    }
  };

  // Delete Invoice
  const handleDeleteInvoice = async (id: number) => {
    try {
      const res = await fetch(`/api/invoices/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setInvoices(prev => prev.filter(inv => inv.id !== id));
        setDeleteConfirmId(null);
      }
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete invoice.');
    }
  };

  // Record Quick Payment
  const handleQuickPaymentSubmit = async () => {
    if (!selectedInvoice) return;
    const paid = Number(paymentAmountInput);
    if (isNaN(paid) || paid < 0) {
      alert('Please enter a valid amount.');
      return;
    }

    try {
      const res = await fetch(`/api/invoices/${selectedInvoice.id}/payment`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount_paid: paid,
          payment_mode: paymentModeInput
        })
      });

      if (res.ok) {
        setIsPaymentModalOpen(false);
        fetchData();
      }
    } catch (err) {
      console.error('Payment update error:', err);
      alert('Failed to record payment.');
    }
  };

  // Print Invoice Function
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 text-white">
      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-neutral-800 pb-5">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-red-600/10 border border-red-600/30 text-red-500">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                Real Estate Invoice Generator
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-red-600/20 text-red-400 border border-red-600/30">
                  ₹ INR Currency
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-neutral-400">
                Generate, manage and print Indian GST compliant property sales, booking tokens & legal invoices in Rupees (₹).
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchData}
            title="Refresh Invoices"
            className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-red-500' : ''}`} />
          </button>
          <button
            id="btn-create-invoice"
            onClick={handleOpenCreate}
            className="flex items-center px-4 py-2.5 rounded-xl bg-red-600 text-white font-bold text-sm hover:bg-red-700 shadow-lg shadow-red-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 mr-2" />
            Generate New Invoice
          </button>
        </div>
      </div>

      {/* Summary KPI Cards (In Rupees ₹) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-neutral-950 border border-neutral-800/80 rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between text-neutral-400 text-xs font-bold uppercase tracking-wider mb-2">
            <span>Total Invoiced (₹)</span>
            <IndianRupee className="w-4 h-4 text-neutral-500" />
          </div>
          <div className="text-2xl font-black text-white tracking-tight">
            {formatINR(stats.totalInvoiced)}
          </div>
          <div className="mt-2 text-xs text-neutral-500 flex items-center justify-between">
            <span>{stats.count} Invoices issued</span>
            <span className="text-neutral-400 font-semibold">{numberToWordsINR(stats.totalInvoiced).slice(0, 24)}...</span>
          </div>
        </div>

        <div className="bg-neutral-950 border border-neutral-800/80 rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
            <span>Total Collected (₹)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-400 tracking-tight">
            {formatINR(stats.totalCollected)}
          </div>
          <div className="mt-2 text-xs text-neutral-500 flex items-center justify-between">
            <span className="text-emerald-500/90 font-bold">{stats.paidCount} Fully Paid</span>
            <span>Realized to Bank</span>
          </div>
        </div>

        <div className="bg-neutral-950 border border-neutral-800/80 rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">
            <span>Outstanding Balance (₹)</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-400 tracking-tight">
            {formatINR(stats.totalDue)}
          </div>
          <div className="mt-2 text-xs text-neutral-500 flex items-center justify-between">
            <span className="text-amber-500/90 font-bold">{stats.pendingCount} Pending / Overdue</span>
            <span>Receivables</span>
          </div>
        </div>

        <div className="bg-neutral-950 border border-neutral-800/80 rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between text-neutral-400 text-xs font-bold uppercase tracking-wider mb-2">
            <span>Tax Framework</span>
            <Building2 className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-xl font-extrabold text-white tracking-tight flex items-center space-x-1.5">
            <span>GST India Compliant</span>
          </div>
          <div className="mt-2 text-xs text-neutral-500">
            <span>SAC: 9972 Real Estate Services</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-neutral-950 border border-neutral-800 p-3.5 rounded-2xl">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            placeholder="Search by invoice #, client, phone, property..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-red-500"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center space-x-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {['ALL', 'Paid', 'Partially Paid', 'Pending', 'Overdue', 'Cancelled'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                statusFilter === st
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
                  : 'bg-neutral-900 text-neutral-400 hover:text-white hover:bg-neutral-800 border border-neutral-800'
              }`}
            >
              {st === 'ALL' ? 'All Invoices' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Invoice List Table */}
      <div className="bg-neutral-950 border border-neutral-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="py-20 text-center">
            <RefreshCw className="w-8 h-8 animate-spin text-red-500 mx-auto mb-3" />
            <p className="text-sm font-semibold text-neutral-400">Loading invoices from database...</p>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="py-20 text-center px-4">
            <FileText className="w-12 h-12 text-neutral-700 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white mb-1">No Invoices Found</h3>
            <p className="text-xs text-neutral-500 max-w-sm mx-auto mb-5">
              {searchTerm || statusFilter !== 'ALL'
                ? 'No invoices match your current search or filter criteria.'
                : 'You have not generated any property sale or booking token invoices yet.'}
            </p>
            <button
              onClick={handleOpenCreate}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              Generate First Invoice
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-neutral-900/60 border-b border-neutral-800 text-neutral-400 font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Invoice # & Date</th>
                  <th className="py-3.5 px-4">Buyer / Client</th>
                  <th className="py-3.5 px-4">Property</th>
                  <th className="py-3.5 px-4 text-right">Total Amount (₹)</th>
                  <th className="py-3.5 px-4 text-right">Paid (₹)</th>
                  <th className="py-3.5 px-4 text-right">Balance Due (₹)</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60">
                {filteredInvoices.map((inv) => {
                  const itemsCount = Array.isArray(inv.items) ? inv.items.length : 1;
                  return (
                    <tr key={inv.id} className="hover:bg-neutral-900/40 transition-colors group">
                      {/* Invoice Number & Date */}
                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-white flex items-center space-x-1.5">
                          <FileText className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                          <span>{inv.invoice_number}</span>
                        </div>
                        <div className="text-[11px] text-neutral-500 mt-0.5 flex items-center space-x-1">
                          <Calendar className="w-3 h-3 text-neutral-600" />
                          <span>{inv.issue_date || inv.created_at?.split(' ')[0]}</span>
                        </div>
                      </td>

                      {/* Buyer Details */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white">{inv.client_name}</div>
                        <div className="text-[11px] text-neutral-400 mt-0.5">
                          {inv.client_phone && <span>{inv.client_phone}</span>}
                          {inv.client_email && <span className="text-neutral-500"> • {inv.client_email}</span>}
                        </div>
                      </td>

                      {/* Property */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-neutral-300 truncate max-w-[200px]">
                          {inv.property_title || 'General Real Estate Service'}
                        </div>
                        <div className="text-[11px] text-neutral-500">
                          {itemsCount} item{itemsCount > 1 ? 's' : ''} included
                        </div>
                      </td>

                      {/* Total Amount in Rupees */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="font-black text-white text-sm">
                          {formatINR(inv.total)}
                        </div>
                        <div className="text-[10px] text-neutral-500">
                          Incl. GST ({inv.tax_rate || 18}%)
                        </div>
                      </td>

                      {/* Paid */}
                      <td className="py-3.5 px-4 text-right font-bold text-emerald-400">
                        {formatINR(inv.amount_paid || 0)}
                      </td>

                      {/* Balance Due */}
                      <td className="py-3.5 px-4 text-right font-bold text-amber-400">
                        {formatINR(inv.balance_due !== undefined ? inv.balance_due : (inv.total - (inv.amount_paid || 0)))}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wide uppercase border ${
                            inv.status === 'Paid'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : inv.status === 'Partially Paid'
                              ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                              : inv.status === 'Overdue'
                              ? 'bg-red-500/10 text-red-400 border-red-500/30'
                              : inv.status === 'Cancelled'
                              ? 'bg-neutral-800 text-neutral-400 border-neutral-700'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {/* Quick Payment Button */}
                          <button
                            onClick={() => {
                              setSelectedInvoice(inv);
                              setPaymentAmountInput(String(inv.amount_paid || 0));
                              setPaymentModeInput(inv.payment_mode || 'Bank Transfer / NEFT / RTGS');
                              setIsPaymentModalOpen(true);
                            }}
                            title="Record Payment"
                            className="p-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-emerald-400 hover:border-emerald-500/40 transition-colors"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                          </button>

                          {/* Print / View Tax Invoice */}
                          <button
                            id={`btn-view-invoice-${inv.id}`}
                            onClick={() => {
                              setSelectedInvoice(inv);
                              setIsPreviewOpen(true);
                            }}
                            title="Preview / Print Tax Invoice"
                            className="p-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-red-400 hover:border-red-500/40 transition-colors"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit */}
                          <button
                            id={`btn-edit-invoice-${inv.id}`}
                            onClick={() => handleOpenEdit(inv)}
                            title="Edit Invoice"
                            className="p-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white hover:border-neutral-700 transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            id={`btn-delete-invoice-${inv.id}`}
                            onClick={() => setDeleteConfirmId(inv.id)}
                            title="Delete Invoice"
                            className="p-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-red-500 hover:border-red-500/30 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL: CREATE / EDIT INVOICE                                              */}
      {/* ========================================================================= */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-neutral-950 border border-neutral-800 rounded-3xl w-full max-w-4xl max-h-[92vh] overflow-y-auto flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-800 sticky top-0 bg-neutral-950 z-10">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-red-600/10 border border-red-600/30 text-red-500">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white">
                    {editingInvoiceId ? 'Edit Real Estate Invoice' : 'Generate Real Estate Tax Invoice'}
                  </h2>
                  <p className="text-xs text-neutral-400">
                    Indian Rupee (₹ INR) & GST Compliant Sales Invoice
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitInvoice} className="p-6 space-y-6">
              {/* Top Row: Invoice Number, Dates, Quick Autofills */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
                    Invoice Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.invoice_number}
                    onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-red-500 font-mono font-bold"
                    placeholder="INV-2026-0001"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
                    Invoice Issue Date
                  </label>
                  <input
                    type="date"
                    value={formData.issue_date}
                    onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
                    Payment Due Date
                  </label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              {/* Autofill / Link Lead & Property Section */}
              <div className="p-4 bg-neutral-900/50 border border-neutral-800/80 rounded-2xl space-y-3">
                <div className="text-xs font-extrabold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-red-500" />
                  <span>Quick Link: Select Existing Client Lead or Property</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] text-neutral-400 mb-1">
                      Select Lead (Autofill Buyer Details)
                    </label>
                    <select
                      value={formData.lead_id}
                      onChange={(e) => handleSelectLead(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                    >
                      <option value="">-- Choose Registered Lead / Client --</option>
                      {leads.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name} {l.phone ? `(${l.phone})` : ''} - {l.status}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-neutral-400 mb-1">
                      Link Property
                    </label>
                    <select
                      value={formData.property_id}
                      onChange={(e) => handleSelectProperty(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                    >
                      <option value="">-- Choose Listed Property --</option>
                      {properties.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.title} ({p.type}) - {formatINR(p.price)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Buyer / Client Billing Details */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                  Buyer / Client Billing Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <input
                      type="text"
                      required
                      placeholder="Buyer Full Name *"
                      value={formData.client_name}
                      onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-red-500"
                    />
                  </div>
                  <div>
                    <input
                      type="tel"
                      placeholder="Phone / Mobile Number"
                      value={formData.client_phone}
                      onChange={(e) => setFormData({ ...formData, client_phone: e.target.value })}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-red-500"
                    />
                  </div>
                  <div>
                    <input
                      type="email"
                      placeholder="Email Address"
                      value={formData.client_email}
                      onChange={(e) => setFormData({ ...formData, client_email: e.target.value })}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-red-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-1">
                    <input
                      type="text"
                      placeholder="Buyer PAN Number (e.g. ABCDE1234F)"
                      value={formData.client_pan}
                      onChange={(e) => setFormData({ ...formData, client_pan: e.target.value.toUpperCase() })}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-red-500 uppercase font-mono"
                    />
                  </div>
                  <div className="md:col-span-1">
                    <input
                      type="text"
                      placeholder="Buyer GSTIN (if applicable)"
                      value={formData.client_gstin}
                      onChange={(e) => setFormData({ ...formData, client_gstin: e.target.value.toUpperCase() })}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-red-500 uppercase font-mono"
                    />
                  </div>
                  <div className="md:col-span-1">
                    <input
                      type="text"
                      placeholder="Unit / Floor / Property Title"
                      value={formData.property_title}
                      onChange={(e) => setFormData({ ...formData, property_title: e.target.value })}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-red-500"
                    />
                  </div>
                </div>

                <div>
                  <textarea
                    rows={2}
                    placeholder="Billing / Permanent Postal Address"
                    value={formData.client_address}
                    onChange={(e) => setFormData({ ...formData, client_address: e.target.value })}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              {/* Line Items Section */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                    Invoice Line Items (in Rupees ₹)
                  </h3>
                  {/* Preset quick item adder */}
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => addItem()}
                      className="text-xs font-bold text-red-400 hover:text-red-300 flex items-center space-x-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Custom Line</span>
                    </button>
                  </div>
                </div>

                {/* Quick Real Estate Presets */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] text-neutral-500 font-semibold mr-1">Quick Presets:</span>
                  {PRESET_LINE_ITEMS.slice(0, 5).map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => addItem(preset)}
                      className="text-[11px] bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 hover:border-neutral-700 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                    >
                      + {preset.category} ({formatINR(preset.rate)})
                    </button>
                  ))}
                </div>

                {/* Items Table */}
                <div className="space-y-2">
                  {items.map((item, idx) => (
                    <div key={idx} className="p-3 bg-neutral-900/60 border border-neutral-800 rounded-2xl flex flex-col md:flex-row md:items-center gap-3">
                      <div className="flex-1">
                        <input
                          type="text"
                          required
                          placeholder="Item Description (e.g. Booking Advance / Base Unit Consideration)"
                          value={item.description}
                          onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                        />
                      </div>

                      <div className="w-24">
                        <input
                          type="number"
                          min="1"
                          placeholder="Qty"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500 text-center"
                        />
                      </div>

                      <div className="w-36">
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 text-xs">₹</span>
                          <input
                            type="number"
                            min="0"
                            placeholder="Rate"
                            value={item.rate}
                            onChange={(e) => handleItemChange(idx, 'rate', e.target.value)}
                            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-7 pr-3 py-2 text-xs text-white focus:outline-none focus:border-red-500 font-mono text-right"
                          />
                        </div>
                      </div>

                      <div className="w-36 text-right font-mono font-bold text-xs text-white px-2 py-2 bg-neutral-950 rounded-xl border border-neutral-800/80">
                        {formatINR(item.amount)}
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        disabled={items.length <= 1}
                        className="p-2 text-neutral-500 hover:text-red-500 disabled:opacity-30 disabled:hover:text-neutral-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bank Account & UPI Payment Section */}
              <div className="p-5 bg-neutral-900/60 border border-neutral-800/90 rounded-2xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800 pb-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-lg bg-red-600/10 border border-red-500/20 flex items-center justify-center text-red-500">
                      <Building className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                        Payment Receiving Details (Bank Account & UPI)
                      </h3>
                      <p className="text-[11px] text-neutral-400">
                        These payment coordinates will be stamped on this invoice for the buyer to transfer funds.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleAutofillBankingFromSettings}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white text-xs font-bold transition-colors cursor-pointer border border-neutral-700/60"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-red-400" />
                    <span>Auto-Fill from Settings</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-400 mb-1">
                      Bank Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. HDFC Bank Ltd. / ICICI / SBI"
                      value={formData.bank_name}
                      onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-400 mb-1">
                      Beneficiary / Account Holder Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Serene Estates Real Estate Pvt. Ltd."
                      value={formData.account_holder}
                      onChange={(e) => setFormData({ ...formData, account_holder: e.target.value })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-400 mb-1">
                      Bank Account Number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 50200088991122"
                      value={formData.account_number}
                      onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-400 mb-1">
                      IFSC Code
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. HDFC0000240"
                      value={formData.ifsc_code}
                      onChange={(e) => setFormData({ ...formData, ifsc_code: e.target.value.toUpperCase() })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white font-mono uppercase focus:outline-none focus:border-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-400 mb-1">
                      Branch & City
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. BKC Branch, Mumbai"
                      value={formData.branch_name}
                      onChange={(e) => setFormData({ ...formData, branch_name: e.target.value })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-400 mb-1">
                      Account Type
                    </label>
                    <select
                      value={formData.account_type}
                      onChange={(e) => setFormData({ ...formData, account_type: e.target.value })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                    >
                      <option value="Current Account">Current Account</option>
                      <option value="Escrow Account (RERA Designated)">Escrow Account (RERA Designated)</option>
                      <option value="Savings Account">Savings Account</option>
                      <option value="OD / CC Account">OD / CC Account</option>
                    </select>
                  </div>
                </div>

                {/* UPI & Instructions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-400 mb-1">
                      UPI ID / Virtual Payment Address (VPA)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="e.g. sereneestates@hdfcbank"
                        value={formData.upi_id}
                        onChange={(e) => setFormData({ ...formData, upi_id: e.target.value })}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-3 pr-20 py-2 text-xs text-white font-mono focus:outline-none focus:border-red-500"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-neutral-500 uppercase">
                        UPI VPA
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-400 mb-1">
                      Payment Remittance Instructions
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Please mention invoice number in transfer narration"
                      value={formData.payment_instructions}
                      onChange={(e) => setFormData({ ...formData, payment_instructions: e.target.value })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                    />
                  </div>
                </div>
              </div>

              {/* Tax, Discount & Totals Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-neutral-800">
                {/* Left: GST Type, Payment Mode, Terms */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">
                        GST Tax Rate
                      </label>
                      <select
                        value={formData.tax_type}
                        onChange={(e) => {
                          const val = e.target.value;
                          let r = 18;
                          if (val === 'GST_12') r = 12;
                          if (val === 'GST_5') r = 5;
                          if (val === 'NONE') r = 0;
                          setFormData({ ...formData, tax_type: val, tax_rate: r });
                        }}
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                      >
                        <option value="GST_18">GST 18% (Commercial / Standard)</option>
                        <option value="GST_12">GST 12% (Under Construction)</option>
                        <option value="GST_5">GST 5% (Affordable Residential)</option>
                        <option value="NONE">Exempt / 0% Tax</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">
                        Payment Mode
                      </label>
                      <select
                        value={formData.payment_mode}
                        onChange={(e) => setFormData({ ...formData, payment_mode: e.target.value })}
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                      >
                        <option value="Bank Transfer / NEFT / RTGS">Bank Transfer / NEFT / RTGS</option>
                        <option value="UPI / QR Code">UPI / QR Code</option>
                        <option value="Cheque / Demand Draft">Cheque / Demand Draft</option>
                        <option value="Credit / Debit Card">Credit / Debit Card</option>
                        <option value="Cash">Cash</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">
                      Invoice Status
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {['Pending', 'Partially Paid', 'Paid', 'Overdue'].map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setFormData({ ...formData, status: st })}
                          className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                            formData.status === st
                              ? 'bg-red-600 text-white border-red-500'
                              : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">
                      Notes / Payment Instructions
                    </label>
                    <textarea
                      rows={2}
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-red-500"
                    />
                  </div>
                </div>

                {/* Right: Calculations Breakdown in Rupees */}
                <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-5 space-y-3 font-mono text-xs">
                  <div className="flex items-center justify-between text-neutral-400">
                    <span>Subtotal:</span>
                    <span className="text-white font-bold">{formatINR(subtotal)}</span>
                  </div>

                  <div className="flex items-center justify-between text-neutral-400">
                    <span>GST Tax ({formData.tax_rate}%):</span>
                    <span className="text-white font-bold">+ {formatINR(taxAmount)}</span>
                  </div>

                  <div className="flex items-center justify-between text-neutral-400">
                    <span>Special Discount (₹):</span>
                    <div className="w-32">
                      <input
                        type="number"
                        min="0"
                        value={formData.discount}
                        onChange={(e) => setFormData({ ...formData, discount: Number(e.target.value) || 0 })}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2 py-1 text-right text-xs text-amber-400 font-mono focus:outline-none focus:border-red-500"
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-neutral-800 flex items-center justify-between text-sm">
                    <span className="font-bold text-white font-sans">Grand Total (₹):</span>
                    <span className="font-black text-red-500 text-base">{formatINR(totalAmount)}</span>
                  </div>

                  {/* Amount in words */}
                  <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800/80 font-sans text-[11px] text-neutral-400">
                    <span className="font-bold text-neutral-300">In Words: </span>
                    <span className="italic text-red-400 font-medium">{numberToWordsINR(totalAmount)}</span>
                  </div>

                  <div className="pt-2 border-t border-neutral-800 flex items-center justify-between text-neutral-400">
                    <span>Amount Received / Paid (₹):</span>
                    <div className="w-36">
                      <input
                        type="number"
                        min="0"
                        value={formData.amount_paid}
                        onChange={(e) => setFormData({ ...formData, amount_paid: Number(e.target.value) || 0 })}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2 py-1 text-right text-xs text-emerald-400 font-mono focus:outline-none focus:border-red-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-neutral-400">
                    <span>Balance Due (₹):</span>
                    <span className="text-amber-400 font-extrabold">{formatINR(balanceDue)}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 font-bold text-xs hover:bg-neutral-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-red-600 text-white font-extrabold text-xs hover:bg-red-700 shadow-lg shadow-red-600/30 transition-all cursor-pointer flex items-center space-x-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingInvoiceId ? 'Update Invoice' : 'Generate & Save Invoice'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: PRINTABLE TAX INVOICE PREVIEW                                      */}
      {/* ========================================================================= */}
      {isPreviewOpen && selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto print:p-0 print:bg-white">
          <div className="bg-white text-neutral-900 rounded-3xl w-full max-w-4xl max-h-[95vh] overflow-y-auto flex flex-col shadow-2xl print:shadow-none print:max-h-full print:rounded-none print:border-none">
            {/* Action Bar on top (Hidden during printing) */}
            <div className="flex items-center justify-between px-6 py-4 bg-neutral-900 text-white rounded-t-3xl print:hidden">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-red-500" />
                <span className="font-bold text-sm">Tax Invoice: {selectedInvoice.invoice_number}</span>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={handlePrint}
                  className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-colors cursor-pointer shadow-md"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print / Save as PDF</span>
                </button>
                <button
                  onClick={() => setIsPreviewOpen(false)}
                  className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Document Body */}
            <div id="printable-tax-invoice" className="p-8 sm:p-12 space-y-8 bg-white text-neutral-900 font-sans">
              {/* Header: Company & Tax Invoice Badge */}
              <div className="flex flex-col sm:flex-row justify-between items-start border-b-2 border-neutral-900 pb-6 gap-4">
                <div>
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center text-white font-black text-xl">
                      SE
                    </div>
                    <div>
                      <h2 className="text-2xl font-black tracking-tight text-neutral-900">
                        {settings.company_name || 'Serene Estates Pvt. Ltd.'}
                      </h2>
                      <p className="text-xs text-neutral-500 font-semibold">Premium Luxury & Commercial Properties</p>
                    </div>
                  </div>
                  <div className="text-xs text-neutral-600 space-y-0.5 mt-2">
                    <p>{settings.address || 'Tower 4, Level 18, Apex Financial District, Bandra Kurla Complex'}</p>
                    <p>Phone: {settings.phone || '+91 98765 43210'} | Email: {settings.email || 'billing@sereneestates.in'}</p>
                    <p className="font-semibold text-neutral-800">
                      GSTIN: {settings.gstin || '27AABCS1429B1Z8'} | PAN: {settings.pan || 'AABCS1429B'}
                    </p>
                  </div>
                </div>

                <div className="text-right flex flex-col sm:items-end">
                  <span className="inline-block px-3 py-1 bg-neutral-900 text-white text-xs font-black tracking-widest uppercase rounded-lg mb-2">
                    TAX INVOICE
                  </span>
                  <div className="text-xs space-y-1">
                    <p><span className="font-bold text-neutral-500">Invoice No:</span> <span className="font-mono font-extrabold text-neutral-900">{selectedInvoice.invoice_number}</span></p>
                    <p><span className="font-bold text-neutral-500">Date of Issue:</span> <span className="font-bold text-neutral-800">{selectedInvoice.issue_date || selectedInvoice.created_at?.split(' ')[0]}</span></p>
                    <p><span className="font-bold text-neutral-500">Due Date:</span> <span className="font-bold text-neutral-800">{selectedInvoice.due_date || 'Immediate'}</span></p>
                    <p><span className="font-bold text-neutral-500">Place of Supply:</span> <span className="font-semibold">Maharashtra (27)</span></p>
                  </div>
                </div>
              </div>

              {/* Billed To (Buyer Information) & Property Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-neutral-50 p-5 rounded-2xl border border-neutral-200 text-xs">
                <div>
                  <h4 className="font-bold text-neutral-400 uppercase tracking-wider mb-2 text-[10px]">
                    BILLED TO (BUYER DETAILS):
                  </h4>
                  <p className="text-sm font-black text-neutral-900">{selectedInvoice.client_name}</p>
                  {selectedInvoice.client_phone && <p className="text-neutral-700 mt-0.5">Phone: {selectedInvoice.client_phone}</p>}
                  {selectedInvoice.client_email && <p className="text-neutral-700">Email: {selectedInvoice.client_email}</p>}
                  {selectedInvoice.client_address && <p className="text-neutral-600 mt-1 max-w-xs">{selectedInvoice.client_address}</p>}
                  <div className="mt-2 pt-2 border-t border-neutral-200 space-y-0.5">
                    {selectedInvoice.client_pan && <p className="font-mono"><span className="text-neutral-500 font-sans">PAN:</span> {selectedInvoice.client_pan}</p>}
                    {selectedInvoice.client_gstin && <p className="font-mono"><span className="text-neutral-500 font-sans">GSTIN:</span> {selectedInvoice.client_gstin}</p>}
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-neutral-400 uppercase tracking-wider mb-2 text-[10px]">
                    PROPERTY & TRANSACTION DETAILS:
                  </h4>
                  <p className="text-sm font-black text-neutral-900">
                    {selectedInvoice.property_title || 'Residential Property Consideration'}
                  </p>
                  {selectedInvoice.property_location && (
                    <p className="text-neutral-600 mt-0.5">{selectedInvoice.property_location}</p>
                  )}
                  <div className="mt-2 pt-2 border-t border-neutral-200 space-y-1">
                    <p><span className="text-neutral-500">Payment Mode:</span> <span className="font-semibold text-neutral-800">{selectedInvoice.payment_mode || 'NEFT / RTGS'}</span></p>
                    <p><span className="text-neutral-500">Payment Status:</span> <span className="font-bold uppercase text-red-600">{selectedInvoice.status}</span></p>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-neutral-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-neutral-900 text-white font-bold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4">#</th>
                      <th className="py-3 px-4">Description of Service / Goods</th>
                      <th className="py-3 px-4 text-center">SAC Code</th>
                      <th className="py-3 px-4 text-center">Qty</th>
                      <th className="py-3 px-4 text-right">Unit Rate (₹)</th>
                      <th className="py-3 px-4 text-right">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {(Array.isArray(selectedInvoice.items) ? selectedInvoice.items : []).map((item, idx) => (
                      <tr key={idx} className="hover:bg-neutral-50">
                        <td className="py-3 px-4 font-bold text-neutral-500">{idx + 1}</td>
                        <td className="py-3 px-4">
                          <p className="font-bold text-neutral-900">{item.description}</p>
                          {item.category && <p className="text-[10px] text-neutral-500">{item.category}</p>}
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-neutral-600">9972</td>
                        <td className="py-3 px-4 text-center font-bold text-neutral-700">{item.quantity || 1}</td>
                        <td className="py-3 px-4 text-right font-mono text-neutral-800">{formatINR(item.rate)}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-neutral-900">{formatINR(item.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals & Calculations in Rupees */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pt-2">
                {/* Bank Account Details & UPI QR Code Section */}
                <div className="w-full sm:w-7/12 p-4 bg-neutral-50 rounded-2xl border border-neutral-200 text-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
                    <h4 className="font-extrabold text-neutral-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5 text-red-600" />
                      <span>Official Bank Remittance & Payment Details</span>
                    </h4>
                    <span className="text-[10px] font-bold text-neutral-500 uppercase">
                      INR (₹) Accepted
                    </span>
                  </div>

                  {/* Bank Grid & QR Code */}
                  <div className="flex flex-col sm:flex-row gap-4 items-start">
                    {/* Bank Details */}
                    <div className="flex-1 grid grid-cols-2 gap-y-1.5 gap-x-2 text-[11px]">
                      <span className="text-neutral-500">Bank Name:</span>
                      <span className="font-bold text-neutral-900">{selectedInvoice.bank_name || settings.bank_name || 'HDFC Bank Ltd.'}</span>
                      
                      <span className="text-neutral-500">Account Holder:</span>
                      <span className="font-bold text-neutral-900">{selectedInvoice.account_holder || settings.account_holder || settings.company_name || 'Serene Estates Pvt. Ltd.'}</span>

                      <span className="text-neutral-500">Account No:</span>
                      <span className="font-mono font-extrabold text-neutral-900">{selectedInvoice.account_number || settings.account_number || '50200088991122'}</span>

                      <span className="text-neutral-500">IFSC Code:</span>
                      <span className="font-mono font-bold text-neutral-900">{selectedInvoice.ifsc_code || settings.ifsc_code || 'HDFC0000240'}</span>

                      <span className="text-neutral-500">Branch & City:</span>
                      <span className="font-medium text-neutral-800">{selectedInvoice.branch_name || settings.branch_name || 'Bandra Kurla Complex, Mumbai'}</span>

                      <span className="text-neutral-500">Account Type:</span>
                      <span className="font-semibold text-neutral-800">{selectedInvoice.account_type || settings.account_type || 'Current Account'}</span>

                      <span className="text-neutral-500">UPI ID / VPA:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-neutral-900">{selectedInvoice.upi_id || settings.upi_id || 'sereneestates@hdfcbank'}</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(selectedInvoice.upi_id || settings.upi_id || 'sereneestates@hdfcbank')}
                          className="print:hidden text-neutral-400 hover:text-neutral-900"
                          title="Copy UPI ID"
                        >
                          {copiedUpi ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>

                    {/* QR Code Container */}
                    <div className="flex flex-col items-center justify-center p-2.5 bg-white rounded-xl border border-neutral-200 shadow-sm shrink-0 w-32">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(
                          `upi://pay?pa=${selectedInvoice.upi_id || settings.upi_id || 'sereneestates@hdfcbank'}&pn=${encodeURIComponent(
                            selectedInvoice.account_holder || settings.account_holder || settings.company_name || 'Serene Estates'
                          )}&am=${selectedInvoice.balance_due || selectedInvoice.total}&cu=INR&tn=${encodeURIComponent('Invoice ' + selectedInvoice.invoice_number)}`
                        )}&margin=1`}
                        alt="UPI Payment QR Code"
                        className="w-24 h-24 object-contain rounded-md"
                        referrerPolicy="no-referrer"
                      />
                      <span className="text-[9px] font-bold text-neutral-600 mt-1 uppercase text-center flex items-center gap-0.5">
                        <QrCode className="w-2.5 h-2.5 text-red-600" />
                        <span>Scan & Pay UPI</span>
                      </span>
                      <span className="text-[8px] text-neutral-400 text-center leading-tight">
                        GPay • PhonePe • BHIM
                      </span>
                    </div>
                  </div>

                  {(selectedInvoice.payment_instructions || settings.payment_instructions) && (
                    <div className="pt-2 border-t border-neutral-200 text-[10px] text-neutral-600 flex items-start gap-1">
                      <span className="font-bold text-neutral-700 uppercase">Note:</span>
                      <span>{selectedInvoice.payment_instructions || settings.payment_instructions}</span>
                    </div>
                  )}
                </div>

                {/* Calculations Summary */}
                <div className="w-full sm:w-5/12 space-y-2 text-xs font-mono">
                  <div className="flex justify-between text-neutral-600">
                    <span>Taxable Subtotal:</span>
                    <span className="font-bold text-neutral-900">{formatINR(selectedInvoice.subtotal)}</span>
                  </div>

                  <div className="flex justify-between text-neutral-600">
                    <span>Goods & Services Tax (GST {selectedInvoice.tax_rate || 18}%):</span>
                    <span className="font-bold text-neutral-900">+ {formatINR(selectedInvoice.tax)}</span>
                  </div>

                  {selectedInvoice.discount > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>Discount / Rebate:</span>
                      <span className="font-bold">- {formatINR(selectedInvoice.discount)}</span>
                    </div>
                  )}

                  <div className="pt-2 border-t-2 border-neutral-900 flex justify-between text-sm">
                    <span className="font-sans font-black text-neutral-900">Total Payable Amount (₹):</span>
                    <span className="font-black text-red-600 text-base">{formatINR(selectedInvoice.total)}</span>
                  </div>

                  <div className="flex justify-between text-emerald-600 pt-1">
                    <span>Amount Realized / Paid:</span>
                    <span className="font-bold">{formatINR(selectedInvoice.amount_paid || 0)}</span>
                  </div>

                  <div className="flex justify-between text-neutral-900 font-bold border-t border-neutral-200 pt-1">
                    <span>Balance Outstanding Due:</span>
                    <span className="text-amber-600 font-extrabold">{formatINR(selectedInvoice.balance_due || 0)}</span>
                  </div>
                </div>
              </div>

              {/* Amount in Words (Rupees) */}
              <div className="p-4 rounded-xl bg-neutral-900 text-white text-xs">
                <span className="font-bold text-neutral-400">Total Amount in Words: </span>
                <span className="font-bold text-white tracking-wide">{numberToWordsINR(selectedInvoice.total)}</span>
              </div>

              {/* Terms & Signatures */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-6 border-t border-neutral-200 text-xs">
                <div>
                  <h5 className="font-bold text-neutral-700 uppercase tracking-wider mb-1.5 text-[10px]">Terms & Conditions:</h5>
                  <p className="text-[11px] text-neutral-500 whitespace-pre-line leading-relaxed">
                    {selectedInvoice.terms || '1. All payments must be made in Indian Rupees (₹).\n2. Applicable GST is charged as per Government of India guidelines.'}
                  </p>
                </div>

                <div className="text-right flex flex-col justify-between items-end">
                  <div>
                    <p className="font-bold text-neutral-900">For {settings.company_name || 'Serene Estates Pvt. Ltd.'}</p>
                    <p className="text-[10px] text-neutral-500">Authorized Real Estate Signatory</p>
                  </div>
                  <div className="pt-10">
                    <div className="w-44 border-b border-neutral-400 mb-1"></div>
                    <p className="text-[10px] text-neutral-500 font-semibold">Authorized Signature & Stamp</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: QUICK RECORD PAYMENT                                               */}
      {/* ========================================================================= */}
      {isPaymentModalOpen && selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-950 border border-neutral-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <CreditCard className="w-5 h-5 text-emerald-500" />
                <h3 className="font-black text-white text-base">Record Payment (₹ INR)</h3>
              </div>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs space-y-1.5 text-neutral-400 bg-neutral-900/60 p-3 rounded-2xl border border-neutral-800">
              <div className="flex justify-between">
                <span className="font-bold text-neutral-300">Invoice:</span>
                <span className="font-mono text-white">{selectedInvoice.invoice_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold text-neutral-300">Buyer:</span>
                <span className="text-white">{selectedInvoice.client_name}</span>
              </div>
              <div className="flex justify-between border-t border-neutral-800 pt-1">
                <span className="font-bold text-neutral-300">Total Invoiced:</span>
                <span className="font-mono text-white font-bold">{formatINR(selectedInvoice.total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold text-neutral-300">Outstanding Balance:</span>
                <span className="font-mono text-amber-400 font-bold">{formatINR(selectedInvoice.balance_due)}</span>
              </div>
              {(selectedInvoice.bank_name || selectedInvoice.upi_id || settings.upi_id) && (
                <div className="pt-1.5 border-t border-neutral-800 flex items-center justify-between text-[11px] text-neutral-400">
                  <span className="flex items-center gap-1"><Building className="w-3 h-3 text-red-500" /> {selectedInvoice.bank_name || settings.bank_name}</span>
                  <span className="font-mono text-neutral-300">UPI: {selectedInvoice.upi_id || settings.upi_id}</span>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
                  Total Amount Paid in Rupees (₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 font-mono">₹</span>
                  <input
                    type="number"
                    min="0"
                    max={selectedInvoice.total}
                    value={paymentAmountInput}
                    onChange={(e) => setPaymentAmountInput(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-8 pr-4 py-2.5 text-xs text-emerald-400 font-mono font-bold focus:outline-none focus:border-red-500"
                  />
                </div>
                <div className="flex justify-between text-[11px] text-neutral-500 mt-1">
                  <button
                    type="button"
                    onClick={() => setPaymentAmountInput(String(selectedInvoice.total))}
                    className="text-emerald-400 hover:underline font-bold"
                  >
                    Mark 100% Fully Paid ({formatINR(selectedInvoice.total)})
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
                  Payment Mode
                </label>
                <select
                  value={paymentModeInput}
                  onChange={(e) => setPaymentModeInput(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-red-500"
                >
                  <option value="Bank Transfer / NEFT / RTGS">Bank Transfer / NEFT / RTGS</option>
                  <option value="UPI / QR Code">UPI / QR Code</option>
                  <option value="Cheque / Demand Draft">Cheque / Demand Draft</option>
                  <option value="Credit / Debit Card">Credit / Debit Card</option>
                  <option value="Cash">Cash</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-neutral-900 text-neutral-300 text-xs font-bold hover:bg-neutral-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleQuickPaymentSubmit}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-lg shadow-emerald-600/20"
              >
                Update Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DELETE CONFIRMATION MODAL                                                 */}
      {/* ========================================================================= */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-950 border border-neutral-800 rounded-3xl w-full max-w-sm p-6 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-600/10 border border-red-600/30 text-red-500 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Delete Invoice?</h3>
              <p className="text-xs text-neutral-400 mt-1">
                Are you sure you want to permanently delete this invoice record from the database? This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-center space-x-3 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-xl bg-neutral-900 text-neutral-300 text-xs font-bold hover:bg-neutral-800"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteInvoice(deleteConfirmId)}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-lg shadow-red-600/20"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
