import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../../store/index.js';
import { 
  Building2, 
  Users, 
  FileText, 
  PhoneCall, 
  MessageSquareQuote, 
  Flame, 
  ArrowRight, 
  TrendingUp,
  Sparkles,
  Calendar,
  UserCheck,
  RefreshCw,
  Activity,
  DollarSign,
  Layers,
  CheckCircle2,
  Clock,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  UserPlus,
  IndianRupee,
  Receipt,
  Plus
} from 'lucide-react';
import { formatINR, formatCompactINR } from '../../utils/currency.js';

export default function Dashboard() {
  const { user, token } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const [stats, setStats] = useState({
    serverTime: new Date().toISOString(),
    properties: {
      total: 0,
      published: 0,
      sold: 0,
      draft: 0,
      totalPortfolioValue: 0,
      publishedPortfolioValue: 0,
      typeBreakdown: [] as { type: string; count: number }[]
    },
    leads: {
      total: 0,
      active: 0,
      converted: 0,
      new: 0,
      stageBreakdown: [] as { status: string; count: number }[],
      recent: [] as any[]
    },
    visits: {
      total: 0,
      scheduled: 0,
      completed: 0
    },
    agents: {
      total: 0
    },
    feedbacks: {
      total: 0,
      hotLeads: 0,
      warmLeads: 0,
      coldLeads: 0,
      averageBudget: 0,
      recent: [] as any[]
    },
    invoices: {
      total: 0,
      paid: 0,
      pending: 0,
      totalInvoiced: 0,
      totalCollected: 0,
      totalDue: 0
    }
  });

  const fetchDashboardStats = async (isManual = false) => {
    if (!token) return;
    if (isManual) setRefreshing(true);

    try {
      const res = await fetch('/api/dashboard/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error('Error fetching live dashboard metrics:', err);
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchDashboardStats();
  }, [token]);

  // Live polling interval every 5 seconds if autoRefresh is enabled
  useEffect(() => {
    if (!autoRefresh || !token) return;

    const interval = setInterval(() => {
      fetchDashboardStats();
    }, 5000);

    return () => clearInterval(interval);
  }, [autoRefresh, token]);

  if (user?.role === 'AGENT') {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-neutral-950 border border-neutral-800 p-8 rounded-3xl text-white">
          <div className="flex items-center space-x-3 mb-2">
            <Sparkles className="w-6 h-6 text-red-500" />
            <h1 className="text-2xl font-black text-white">Welcome back, {user.name}</h1>
          </div>
          <p className="text-neutral-400 text-sm max-w-xl mb-6">
            Access your assigned client property tours, schedule site visits, and log real-time client feedback and buying intent.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link 
              to="/admin/visits" 
              className="px-5 py-3 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 transition-colors shadow-lg shadow-red-600/30 flex items-center space-x-2"
            >
              <Calendar className="w-4 h-4" />
              <span>Go to My Site Visits</span>
            </Link>
            <Link 
              to="/admin/feedback" 
              className="px-5 py-3 bg-neutral-900 border border-neutral-800 text-neutral-200 rounded-xl font-bold text-sm hover:bg-neutral-800 hover:text-white transition-colors flex items-center space-x-2"
            >
              <MessageSquareQuote className="w-4 h-4 text-red-500" />
              <span>View My Feedback History</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Format currency helpers (Strict Indian Rupee ₹ Formatting)
  const formatCurrency = (val: number) => {
    return formatCompactINR(val || 0);
  };

  const getStageColor = (status: string) => {
    switch (status) {
      case 'New': return 'bg-blue-500/20 text-blue-400 border-blue-500/40';
      case 'Contacted': return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
      case 'Interested': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
      case 'Site Visit Scheduled': return 'bg-red-500/20 text-red-400 border-red-500/40';
      case 'Converted': return 'bg-purple-500/20 text-purple-400 border-purple-500/40';
      default: return 'bg-neutral-800 text-neutral-400 border-neutral-700';
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16">
      {/* Top Live Control Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-800 pb-6">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Real-Time Executive Dashboard</h1>
            <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-emerald-950/60 border border-emerald-600/40 rounded-full text-emerald-400 text-xs font-bold shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block -ml-3.5" />
              <span className="ml-1 tracking-wider uppercase text-[10px]">Live Sync</span>
            </div>
          </div>
          <p className="text-sm text-neutral-400 mt-1">
            Real-time live portfolio tracking, active CRM inquiry pipelines, site visit workflows, and touring agent feedback.
          </p>
        </div>

        {/* Live Controls */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center space-x-1.5 ${
              autoRefresh 
                ? 'bg-neutral-900 border-neutral-700 text-emerald-400 hover:border-emerald-500/60' 
                : 'bg-black border-neutral-800 text-neutral-500 hover:text-white'
            }`}
            title={autoRefresh ? 'Live sync every 5s is ON' : 'Live sync paused'}
          >
            <Activity className={`w-3.5 h-3.5 ${autoRefresh ? 'text-emerald-400 animate-pulse' : 'text-neutral-500'}`} />
            <span>{autoRefresh ? 'Auto 5s' : 'Paused'}</span>
          </button>

          <button
            id="btn-refresh-dashboard"
            onClick={() => fetchDashboardStats(true)}
            disabled={refreshing}
            className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-red-600/50 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center space-x-2 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-red-500' : 'text-neutral-400'}`} />
            <span>{refreshing ? 'Syncing...' : 'Refresh Now'}</span>
          </button>

          <Link
            to="/admin/invoices"
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-red-600/30 flex items-center space-x-2"
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Invoice Generator (₹)</span>
          </Link>

          <Link
            to="/admin/feedback"
            className="px-4 py-2 bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold transition-all flex items-center space-x-2"
          >
            <MessageSquareQuote className="w-3.5 h-3.5 text-red-500" />
            <span>Feedback Hub</span>
          </Link>
        </div>
      </div>

      {/* 4 PRIMARY LIVE METRICS PILLARS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* PILLAR 1: PROPERTIES */}
        <div className="bg-neutral-950 p-6 rounded-3xl border border-neutral-800/80 hover:border-neutral-700 transition-all shadow-xl space-y-4 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center space-x-1.5">
              <Building2 className="w-4 h-4 text-red-500" />
              <span>Properties Listed</span>
            </span>
            <Link to="/admin/properties" className="text-neutral-500 hover:text-red-400 transition-colors">
              <ExternalLink className="w-4 h-4" />
            </Link>
          </div>

          <div>
            <div className="flex items-baseline space-x-2">
              <span className="text-4xl font-black text-white">{stats.properties.total}</span>
              <span className="text-xs text-neutral-400 font-semibold">Total Listings</span>
            </div>
            <p className="text-xs font-bold text-red-400 mt-1">
              Valuation: <strong className="text-white">{formatCurrency(stats.properties.totalPortfolioValue)}</strong>
            </p>
          </div>

          <div className="pt-3 border-t border-neutral-900 flex items-center justify-between text-xs">
            <span className="px-2 py-0.5 rounded-md bg-red-950/60 text-red-400 border border-red-800/60 font-bold text-[11px]">
              {stats.properties.published} Published
            </span>
            <span className="text-neutral-400 font-medium">
              {stats.properties.sold} Sold • {stats.properties.draft} Draft
            </span>
          </div>
        </div>

        {/* PILLAR 2: ACTIVE LEADS */}
        <div className="bg-neutral-950 p-6 rounded-3xl border border-neutral-800/80 hover:border-neutral-700 transition-all shadow-xl space-y-4 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center space-x-1.5">
              <PhoneCall className="w-4 h-4 text-blue-500" />
              <span>Active Leads CRM</span>
            </span>
            <Link to="/admin/leads" className="text-neutral-500 hover:text-blue-400 transition-colors">
              <ExternalLink className="w-4 h-4" />
            </Link>
          </div>

          <div>
            <div className="flex items-baseline space-x-2">
              <span className="text-4xl font-black text-white">{stats.leads.active}</span>
              <span className="text-xs text-blue-400 font-semibold">In Pipeline</span>
            </div>
            <p className="text-xs font-bold text-neutral-400 mt-1">
              Total Inquiries: <strong className="text-white">{stats.leads.total}</strong>
            </p>
          </div>

          <div className="pt-3 border-t border-neutral-900 flex items-center justify-between text-xs">
            <span className="px-2 py-0.5 rounded-md bg-blue-950/60 text-blue-400 border border-blue-800/60 font-bold text-[11px]">
              {stats.leads.new} Fresh Inquiries
            </span>
            <span className="text-purple-400 font-bold">
              {stats.leads.converted} Converted
            </span>
          </div>
        </div>

        {/* PILLAR 3: AGENT FEEDBACKS */}
        <div className="bg-neutral-950 p-6 rounded-3xl border border-neutral-800/80 hover:border-neutral-700 transition-all shadow-xl space-y-4 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center space-x-1.5">
              <MessageSquareQuote className="w-4 h-4 text-amber-500" />
              <span>Agent Feedback</span>
            </span>
            <Link to="/admin/feedback" className="text-neutral-500 hover:text-amber-400 transition-colors">
              <ExternalLink className="w-4 h-4" />
            </Link>
          </div>

          <div>
            <div className="flex items-baseline space-x-2">
              <span className="text-4xl font-black text-white">{stats.feedbacks.total}</span>
              <span className="text-xs text-neutral-400 font-semibold">Tour Reviews</span>
            </div>
            <p className="text-xs font-bold text-red-400 mt-1 flex items-center space-x-1">
              <Flame className="w-3.5 h-3.5" />
              <span><strong>{stats.feedbacks.hotLeads} Hot Leads</strong> ready to close</span>
            </p>
          </div>

          <div className="pt-3 border-t border-neutral-900 flex items-center justify-between text-xs">
            <span className="px-2 py-0.5 rounded-md bg-amber-950/60 text-amber-400 border border-amber-800/60 font-bold text-[11px]">
              {stats.feedbacks.warmLeads} Warm Prospects
            </span>
            <span className="text-neutral-400 font-medium">
              Avg Budget: {formatCurrency(stats.feedbacks.averageBudget)}
            </span>
          </div>
        </div>

        {/* PILLAR 4: FIELD VISITS & AGENTS */}
        <div className="bg-neutral-950 p-6 rounded-3xl border border-neutral-800/80 hover:border-neutral-700 transition-all shadow-xl space-y-4 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center space-x-1.5">
              <Calendar className="w-4 h-4 text-emerald-500" />
              <span>Site Tours & Agents</span>
            </span>
            <Link to="/admin/visits" className="text-neutral-500 hover:text-emerald-400 transition-colors">
              <ExternalLink className="w-4 h-4" />
            </Link>
          </div>

          <div>
            <div className="flex items-baseline space-x-2">
              <span className="text-4xl font-black text-white">{stats.visits.total}</span>
              <span className="text-xs text-neutral-400 font-semibold">Scheduled Visits</span>
            </div>
            <p className="text-xs font-bold text-emerald-400 mt-1">
              Completed Tours: <strong className="text-white">{stats.visits.completed}</strong>
            </p>
          </div>

          <div className="pt-3 border-t border-neutral-900 flex items-center justify-between text-xs">
            <Link 
              to="/admin/agents" 
              className="px-2 py-0.5 rounded-md bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 font-bold text-[11px] flex items-center space-x-1"
            >
              <Users className="w-3 h-3 text-red-500" />
              <span>{stats.agents.total} Field Agents</span>
            </Link>
            <span className="text-neutral-500 font-medium">
              {stats.visits.scheduled} Pending
            </span>
          </div>
        </div>
      </div>

      {/* DETAILED LIVE BREAKDOWNS (3-COLUMN SECTION) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 1. Property Portfolio Distribution */}
        <div className="bg-neutral-950 p-6 rounded-3xl border border-neutral-800 space-y-5 shadow-xl">
          <div className="flex items-center justify-between border-b border-neutral-900 pb-3">
            <div className="flex items-center space-x-2">
              <Layers className="w-4 h-4 text-red-500" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Property Portfolio Mix</h3>
            </div>
            <Link to="/admin/properties" className="text-xs text-red-500 hover:text-red-400 font-bold">
              Manage
            </Link>
          </div>

          <div className="space-y-2.5">
            {stats.properties.typeBreakdown && stats.properties.typeBreakdown.length > 0 ? (
              stats.properties.typeBreakdown.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between bg-black p-3 rounded-xl border border-neutral-900">
                  <span className="text-xs font-bold text-neutral-300">{item.type}</span>
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded-md bg-neutral-900 text-white font-mono text-xs font-bold border border-neutral-800">
                      {item.count} units
                    </span>
                    <span className="text-[11px] text-neutral-500">
                      ({Math.round((item.count / (stats.properties.total || 1)) * 100)}%)
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-neutral-500 text-xs">No property breakdown data.</div>
            )}
          </div>

          <div className="p-3 bg-red-950/20 border border-red-900/30 rounded-2xl flex items-center justify-between text-xs">
            <span className="text-neutral-400 font-medium">Published Live Valuation:</span>
            <span className="font-extrabold text-white text-sm">
              {formatCurrency(stats.properties.publishedPortfolioValue)}
            </span>
          </div>
        </div>

        {/* 2. Lead Pipeline Breakdown */}
        <div className="bg-neutral-950 p-6 rounded-3xl border border-neutral-800 space-y-5 shadow-xl">
          <div className="flex items-center justify-between border-b border-neutral-900 pb-3">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Lead Pipeline Stages</h3>
            </div>
            <Link to="/admin/leads" className="text-xs text-blue-400 hover:text-blue-300 font-bold">
              CRM View
            </Link>
          </div>

          <div className="space-y-2.5">
            {stats.leads.stageBreakdown && stats.leads.stageBreakdown.length > 0 ? (
              stats.leads.stageBreakdown.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between bg-black p-3 rounded-xl border border-neutral-900">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStageColor(item.status)}`}>
                    {item.status}
                  </span>
                  <div className="flex items-center space-x-2">
                    <span className="font-extrabold text-white text-xs">{item.count} Leads</span>
                    <span className="text-[11px] text-neutral-500">
                      ({Math.round((item.count / (stats.leads.total || 1)) * 100)}%)
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-neutral-500 text-xs">No active leads logged.</div>
            )}
          </div>

          <div className="p-3 bg-blue-950/20 border border-blue-900/30 rounded-2xl flex items-center justify-between text-xs">
            <span className="text-neutral-400 font-medium">Conversion Rate:</span>
            <span className="font-extrabold text-purple-400 text-sm">
              {stats.leads.total > 0 ? `${Math.round((stats.leads.converted / stats.leads.total) * 100)}%` : '0%'} Converted
            </span>
          </div>
        </div>

        {/* 3. Buying Intent & Field Tour Health */}
        <div className="bg-neutral-950 p-6 rounded-3xl border border-neutral-800 space-y-5 shadow-xl">
          <div className="flex items-center justify-between border-b border-neutral-900 pb-3">
            <div className="flex items-center space-x-2">
              <Flame className="w-4 h-4 text-red-500" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Tour Intent Breakdown</h3>
            </div>
            <Link to="/admin/feedback" className="text-xs text-red-500 hover:text-red-400 font-bold">
              Hub
            </Link>
          </div>

          <div className="space-y-2.5">
            <div className="bg-black p-3.5 rounded-xl border border-neutral-900 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm shadow-red-500/50" />
                <span className="text-xs font-bold text-white">🔥 Hot Prospects (Ready)</span>
              </div>
              <span className="text-base font-black text-red-500">{stats.feedbacks.hotLeads}</span>
            </div>

            <div className="bg-black p-3.5 rounded-xl border border-neutral-900 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50" />
                <span className="text-xs font-bold text-white">⚡ Warm Inquiries</span>
              </div>
              <span className="text-base font-black text-amber-500">{stats.feedbacks.warmLeads}</span>
            </div>

            <div className="bg-black p-3.5 rounded-xl border border-neutral-900 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50" />
                <span className="text-xs font-bold text-white">❄️ Exploring / Cold</span>
              </div>
              <span className="text-base font-black text-blue-400">{stats.feedbacks.coldLeads}</span>
            </div>
          </div>

          <div className="p-3 bg-amber-950/20 border border-amber-900/30 rounded-2xl flex items-center justify-between text-xs">
            <span className="text-neutral-400 font-medium">Average Buyer Budget:</span>
            <span className="font-extrabold text-amber-400 text-sm">
              {formatCurrency(stats.feedbacks.averageBudget)}
            </span>
          </div>
        </div>
      </div>

      {/* LIVE DUAL ACTIVITY STREAMS (AGENT FEEDBACK ON LEFT, RECENT LEADS ON RIGHT) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Feedback Feed (2 Columns) */}
        <div className="lg:col-span-2 bg-neutral-950 p-6 rounded-3xl border border-neutral-800 space-y-5 shadow-xl">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-red-950/60 border border-red-600/30 flex items-center justify-center text-red-500">
                <MessageSquareQuote className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Live Field Agent Feedback Stream</h2>
                <p className="text-xs text-neutral-400">Verbatim client notes, buyer requirements, and actionable next steps</p>
              </div>
            </div>
            <Link 
              to="/admin/feedback" 
              className="text-xs font-bold text-red-500 hover:text-red-400 flex items-center space-x-1 hover:underline"
            >
              <span>Explore All ({stats.feedbacks.total})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {stats.feedbacks.recent && stats.feedbacks.recent.length > 0 ? (
            <div className="space-y-4">
              {stats.feedbacks.recent.map((fb: any) => (
                <div 
                  key={fb.id}
                  className="bg-black border border-neutral-900 hover:border-neutral-800 p-4 rounded-2xl space-y-3 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-extrabold text-white text-sm">{fb.lead_name || 'Client'}</span>
                        {fb.lead_phone && (
                          <span className="text-xs text-neutral-400 font-mono">({fb.lead_phone})</span>
                        )}
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                          fb.interest_level === 'Hot' ? 'bg-red-600/20 text-red-400 border border-red-600/30' :
                          fb.interest_level === 'Warm' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                          'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        }`}>
                          {fb.interest_level} Lead
                        </span>
                      </div>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        Property: <strong className="text-neutral-300">{fb.property_title || 'Listing'}</strong> • Agent: <strong className="text-neutral-300">{fb.agent_name || 'Agent'}</strong>
                      </p>
                    </div>
                    <span className="text-[11px] text-neutral-500 font-medium whitespace-nowrap">
                      {fb.visit_date}
                    </span>
                  </div>

                  <p className="text-xs text-neutral-300 bg-neutral-900/60 p-3 rounded-xl border border-neutral-800/80 italic leading-relaxed">
                    "{fb.customer_feedback}"
                  </p>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    {fb.budget ? (
                      <span className="text-[11px] text-neutral-400">
                        Budget: <strong className="text-white">{formatINR(Number(fb.budget))}</strong>
                      </span>
                    ) : null}

                    {fb.next_action && (
                      <div className="flex items-center space-x-1.5 text-[11px] text-red-400 bg-red-950/40 border border-red-900/40 px-2.5 py-1 rounded-lg">
                        <ArrowRight className="w-3 h-3 text-red-500 flex-shrink-0" />
                        <span className="truncate"><strong>Next:</strong> {fb.next_action}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-neutral-500 text-sm space-y-2">
              <MessageSquareQuote className="w-8 h-8 mx-auto text-neutral-600" />
              <p>No site visit feedback submitted yet.</p>
              <p className="text-xs text-neutral-600">Feedback submitted by field agents will instantly appear here.</p>
            </div>
          )}
        </div>

        {/* Live Recent Inquiries & Quick Actions (1 Column) */}
        <div className="space-y-6">
          {/* Recent Inquiries */}
          <div className="bg-neutral-950 p-6 rounded-3xl border border-neutral-800 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-neutral-900 pb-3">
              <div className="flex items-center space-x-2">
                <PhoneCall className="w-4 h-4 text-blue-500" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Latest Inquiries</h3>
              </div>
              <Link to="/admin/leads" className="text-xs text-blue-400 hover:text-blue-300 font-bold">
                View All
              </Link>
            </div>

            {stats.leads.recent && stats.leads.recent.length > 0 ? (
              <div className="space-y-3">
                {stats.leads.recent.map((lead: any) => (
                  <div key={lead.id} className="bg-black p-3 rounded-xl border border-neutral-900 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{lead.name}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStageColor(lead.status)}`}>
                        {lead.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-400 truncate">
                      {lead.property_title ? `Interest: ${lead.property_title}` : 'General Inquiry'}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-neutral-500 pt-1">
                      <span>{lead.phone}</span>
                      <span>{lead.source || 'Website'}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-neutral-500 text-xs">No recent inquiries.</div>
            )}
          </div>

          {/* Executive Quick Actions */}
          <div className="bg-neutral-950 p-6 rounded-3xl border border-neutral-800 space-y-3 shadow-xl">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2 border-b border-neutral-900 pb-3">
              <UserCheck className="w-4 h-4 text-red-500" />
              <span>Admin Shortcuts</span>
            </h3>
            
            <div className="space-y-2 text-xs">
              <Link 
                to="/admin/invoices" 
                className="flex items-center justify-between p-3 bg-neutral-900/80 rounded-xl border border-red-900/30 hover:border-red-600/60 text-white transition-colors group"
              >
                <div className="flex items-center space-x-2">
                  <Receipt className="w-3.5 h-3.5 text-red-500 group-hover:scale-110 transition-transform" />
                  <span className="font-bold">GST Invoice Generator (₹)</span>
                </div>
                <ChevronRight className="w-4 h-4 text-red-500" />
              </Link>

              <Link 
                to="/admin/properties" 
                className="flex items-center justify-between p-3 bg-black rounded-xl border border-neutral-900 hover:border-neutral-800 text-neutral-300 hover:text-white transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <Plus className="w-3.5 h-3.5 text-red-500" />
                  <span>Add / Edit Properties</span>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-600" />
              </Link>

              <Link 
                to="/admin/agents" 
                className="flex items-center justify-between p-3 bg-black rounded-xl border border-neutral-900 hover:border-neutral-800 text-neutral-300 hover:text-white transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <UserPlus className="w-3.5 h-3.5 text-red-500" />
                  <span>Manage Agent Logins</span>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-600" />
              </Link>

              <Link 
                to="/admin/visits" 
                className="flex items-center justify-between p-3 bg-black rounded-xl border border-neutral-900 hover:border-neutral-800 text-neutral-300 hover:text-white transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <Calendar className="w-3.5 h-3.5 text-red-500" />
                  <span>Site Visit Schedule</span>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-600" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
