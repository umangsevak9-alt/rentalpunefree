import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store/index.js';
import { supabaseService } from '../../services/supabaseService.js';
import { 
  MessageSquare, 
  Check, 
  Send, 
  RefreshCw, 
  ShieldCheck, 
  AlertTriangle, 
  HelpCircle, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  XCircle, 
  Zap, 
  Copy, 
  Phone, 
  Globe, 
  Layers, 
  Plus, 
  Building2,
  Sliders,
  FileCode2,
  Activity,
  Lock,
  RotateCcw
} from 'lucide-react';

interface WhatsAppTenantItem {
  tenant_id: string;
  client_name: string;
  phone_number_id?: string;
  admin_phone?: string;
  enabled: boolean;
  has_access_token: boolean;
  last_test_status?: 'CONNECTED' | 'FAILED';
  updated_at?: string;
}

interface WhatsAppConfigState {
  tenant_id: string;
  client_name: string;
  provider: string;
  api_base_url: string;
  graph_version: string;
  phone_number_id: string;
  business_account_id: string;
  access_token: string;
  admin_phone: string;
  enabled: boolean;
  customer_confirmation_enabled: boolean;
  admin_alerts_enabled: boolean;
  template_name_customer: string;
  template_language_customer: string;
  template_name_admin: string;
  template_language_admin: string;
  has_access_token: boolean;
  masked_access_token: string;
  webhook_verify_token: string;
  updated_at?: string;
  last_test_at?: string;
  last_test_status?: 'CONNECTED' | 'FAILED';
  last_test_error?: string;
  last_error?: string;
  last_error_at?: string;
}

interface WhatsAppLogItem {
  id: string | number;
  lead_id?: number | string | null;
  tenant_id?: string;
  recipient_type: 'CUSTOMER' | 'ADMIN' | 'TEST';
  recipient_phone: string;
  message_type: 'CUSTOMER_CONFIRMATION' | 'ADMIN_ALERT' | 'TEST';
  status: 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
  whatsapp_message_id?: string;
  error_message?: string;
  created_at: string;
}

export default function WhatsAppSettings() {
  const { settings } = useAppStore();
  const brandName = settings?.website_name || 'Rental Pune';

  // Multi-tenant state
  const [tenants, setTenants] = useState<WhatsAppTenantItem[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState('rental_pune');
  const [showNewTenantModal, setShowNewTenantModal] = useState(false);
  const [newTenantName, setNewTenantName] = useState('');
  const [newTenantId, setNewTenantId] = useState('');

  const [config, setConfig] = useState<WhatsAppConfigState>({
    tenant_id: 'rental_pune',
    client_name: 'Rental Pune Luxury Real Estate',
    provider: 'META_CLOUD_API',
    api_base_url: 'https://graph.facebook.com',
    graph_version: 'v21.0',
    phone_number_id: '',
    business_account_id: '',
    access_token: '',
    admin_phone: '+919822012345',
    enabled: true,
    customer_confirmation_enabled: true,
    admin_alerts_enabled: true,
    template_name_customer: 'rental_pune_enquiry_customer',
    template_language_customer: 'en',
    template_name_admin: 'rental_pune_admin_alert',
    template_language_admin: 'en',
    has_access_token: false,
    masked_access_token: '',
    webhook_verify_token: 'rental_pune_secure_verify_2026'
  });

  const [showTokenInput, setShowTokenInput] = useState(false);
  const [logs, setLogs] = useState<WhatsAppLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [sendingTestMessage, setSendingTestMessage] = useState(false);
  const [refreshingLogs, setRefreshingLogs] = useState(false);

  // Status banners & feedback
  const [connectionStatus, setConnectionStatus] = useState<{
    tested: boolean;
    connected: boolean;
    message?: string;
    details?: any;
    error?: string;
  }>({ tested: false, connected: false });

  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Test message modal
  const [testRecipientPhone, setTestRecipientPhone] = useState('');
  const [testCustomMessage, setTestCustomMessage] = useState('');
  const [showTestModal, setShowTestModal] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [testConfirmed, setTestConfirmed] = useState(false);

  // Load WhatsApp settings & recent logs for current tenant
  const loadData = async (tenantId = selectedTenantId) => {
    setLoading(true);
    try {
      const [tenantsList, settingsData, logsData] = await Promise.all([
        supabaseService.whatsapp.getTenants(),
        supabaseService.whatsapp.getSettings(tenantId),
        supabaseService.whatsapp.getLogs(40, tenantId)
      ]);

      if (Array.isArray(tenantsList) && tenantsList.length > 0) {
        setTenants(tenantsList);
      } else {
        setTenants([{
          tenant_id: 'rental_pune',
          client_name: 'Rental Pune Luxury Real Estate',
          enabled: true,
          has_access_token: Boolean(settingsData?.has_access_token)
        }]);
      }

      if (settingsData) {
        setConfig({
          tenant_id: settingsData.tenant_id || tenantId,
          client_name: settingsData.client_name || (tenantId === 'rental_pune' ? 'Rental Pune Luxury Real Estate' : tenantId),
          provider: settingsData.provider || 'META_CLOUD_API',
          api_base_url: settingsData.api_base_url || 'https://graph.facebook.com',
          graph_version: settingsData.graph_version || 'v21.0',
          phone_number_id: settingsData.phone_number_id || '',
          business_account_id: settingsData.business_account_id || '',
          access_token: '', // never expose raw token
          admin_phone: settingsData.admin_phone || '+919822012345',
          enabled: settingsData.enabled !== false,
          customer_confirmation_enabled: settingsData.customer_confirmation_enabled !== false,
          admin_alerts_enabled: settingsData.admin_alerts_enabled !== false,
          template_name_customer: settingsData.template_name_customer || 'rental_pune_enquiry_customer',
          template_language_customer: settingsData.template_language_customer || 'en',
          template_name_admin: settingsData.template_name_admin || 'rental_pune_admin_alert',
          template_language_admin: settingsData.template_language_admin || 'en',
          has_access_token: Boolean(settingsData.has_access_token),
          masked_access_token: settingsData.masked_access_token || '',
          webhook_verify_token: settingsData.webhook_verify_token || 'rental_pune_secure_verify_2026',
          updated_at: settingsData.updated_at,
          last_test_at: settingsData.last_test_at,
          last_test_status: settingsData.last_test_status,
          last_test_error: settingsData.last_test_error,
          last_error: settingsData.last_error,
          last_error_at: settingsData.last_error_at
        });

        if (!testRecipientPhone) {
          setTestRecipientPhone(settingsData.admin_phone || '');
        }

        // Auto-check connection if credentials exist
        if (settingsData.phone_number_id && settingsData.has_access_token) {
          checkConnectionSilently(tenantId);
        }
      }

      if (Array.isArray(logsData)) {
        setLogs(logsData);
      }
    } catch (err) {
      console.error('Error loading WhatsApp settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(selectedTenantId);
  }, [selectedTenantId]);

  const checkConnectionSilently = async (tenantId: string) => {
    try {
      const res = await supabaseService.whatsapp.testConnection({ tenant_id: tenantId });
      setConnectionStatus({
        tested: true,
        connected: res.connected,
        message: res.message,
        details: res.details,
        error: res.error
      });
    } catch {
      setConnectionStatus({
        tested: true,
        connected: false,
        error: 'Failed to verify connection with Meta API'
      });
    }
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setStatusMessage(null);
    try {
      const payload: any = {
        tenant_id: selectedTenantId,
        phone_number_id: config.phone_number_id,
        api_base_url: config.api_base_url,
        graph_version: config.graph_version
      };
      if (config.access_token.trim()) {
        payload.access_token = config.access_token.trim();
      }

      const res = await supabaseService.whatsapp.testConnection(payload);
      setConnectionStatus({
        tested: true,
        connected: res.connected,
        message: res.message,
        details: res.details,
        error: res.error
      });

      if (res.connected) {
        setStatusMessage({
          type: 'success',
          text: `Verified with Meta! Connected to phone: ${res.details?.display_phone_number || config.phone_number_id} (${res.details?.verified_name || 'Business Account'})`
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: res.error || res.message || 'Meta API returned error. Check credentials.'
        });
      }
    } catch (err: any) {
      setConnectionStatus({
        tested: true,
        connected: false,
        error: err.message
      });
      setStatusMessage({
        type: 'error',
        text: err.message || 'Connection test failed'
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMessage(null);

    try {
      const payload: any = {
        tenant_id: selectedTenantId,
        client_name: config.client_name,
        provider: 'META_CLOUD_API',
        api_base_url: config.api_base_url,
        graph_version: config.graph_version,
        phone_number_id: config.phone_number_id.trim(),
        business_account_id: config.business_account_id.trim(),
        admin_phone: config.admin_phone.trim(),
        enabled: config.enabled,
        customer_confirmation_enabled: config.customer_confirmation_enabled,
        admin_alerts_enabled: config.admin_alerts_enabled,
        template_name_customer: config.template_name_customer.trim(),
        template_language_customer: config.template_language_customer.trim(),
        template_name_admin: config.template_name_admin.trim(),
        template_language_admin: config.template_language_admin.trim(),
        webhook_verify_token: config.webhook_verify_token.trim()
      };

      if (config.access_token.trim()) {
        payload.access_token = config.access_token.trim();
      }

      const res = await supabaseService.whatsapp.updateSettings(payload);

      if (res.success) {
        setStatusMessage({
          type: 'success',
          text: res.message || 'Configuration saved successfully. Applied immediately to live notifications.'
        });
        setConfig(prev => ({
          ...prev,
          access_token: '',
          has_access_token: res.settings?.has_access_token ?? prev.has_access_token,
          masked_access_token: res.settings?.masked_access_token ?? prev.masked_access_token,
          updated_at: res.settings?.updated_at || new Date().toISOString()
        }));
        setShowTokenInput(false);

        // Refresh connection check
        setTimeout(() => {
          checkConnectionSilently(selectedTenantId);
        }, 500);
      } else {
        setStatusMessage({
          type: 'error',
          text: res.error || 'Failed to save configuration.'
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Network error saving configuration.'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSendTestMessage = async () => {
    if (!testRecipientPhone.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter a test recipient WhatsApp number.' });
      return;
    }
    setSendingTestMessage(true);
    setStatusMessage(null);

    try {
      const res = await supabaseService.whatsapp.sendTestMessage(
        testRecipientPhone.trim(),
        testCustomMessage.trim() || undefined,
        selectedTenantId
      );

      if (res.success) {
        setStatusMessage({
          type: 'success',
          text: res.message || `Test message delivered successfully to ${testRecipientPhone}!`
        });
        setShowTestModal(false);
        setTestConfirmed(false);
        handleRefreshLogs();
      } else {
        setStatusMessage({
          type: 'error',
          text: res.error || 'Failed to send test message via Meta WhatsApp API.'
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Error executing test message dispatch.'
      });
    } finally {
      setSendingTestMessage(false);
    }
  };

  const handleRefreshLogs = async () => {
    setRefreshingLogs(true);
    try {
      const freshLogs = await supabaseService.whatsapp.getLogs(40, selectedTenantId);
      if (Array.isArray(freshLogs)) {
        setLogs(freshLogs);
      }
    } finally {
      setRefreshingLogs(false);
    }
  };

  const handleCreateNewTenant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTenantName.trim()) return;
    const cleanId = (newTenantId.trim() || newTenantName.trim().toLowerCase().replace(/[^a-z0-9]/g, '_'));
    const newTenant: WhatsAppTenantItem = {
      tenant_id: cleanId,
      client_name: newTenantName.trim(),
      enabled: true,
      has_access_token: false
    };

    setTenants(prev => [...prev.filter(t => t.tenant_id !== cleanId), newTenant]);
    setSelectedTenantId(cleanId);
    setShowNewTenantModal(false);
    setNewTenantName('');
    setNewTenantId('');
    setStatusMessage({
      type: 'success',
      text: `Created new client workspace "${newTenantName.trim()}". You can now enter dedicated WhatsApp credentials for this client.`
    });
  };

  const copyWebhookUrl = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const url = `${origin}/api/whatsapp/webhook`;
    navigator.clipboard.writeText(url);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  // Readiness Calculations
  const hasPhoneId = Boolean(config.phone_number_id.trim());
  const hasWabaId = Boolean(config.business_account_id.trim());
  const hasToken = config.has_access_token || Boolean(config.access_token.trim());
  const hasAdminPhone = Boolean(config.admin_phone.trim());
  const hasTemplates = Boolean(config.template_name_customer.trim() && config.template_name_admin.trim());
  
  const checklist = [
    { label: 'WhatsApp Phone Number ID', ready: hasPhoneId },
    { label: 'Business Account ID (WABA ID)', ready: hasWabaId },
    { label: 'Meta System User Access Token', ready: hasToken },
    { label: 'Admin Notification Number', ready: hasAdminPhone },
    { label: 'Utility Templates Configured', ready: hasTemplates }
  ];
  const readyCount = checklist.filter(c => c.ready).length;
  const isFullyConfigured = readyCount === checklist.length;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <span className="p-2.5 rounded-2xl bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30">
              <MessageSquare className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                WhatsApp Cloud API
              </h1>
              <p className="text-xs text-neutral-400">
                Official Meta WhatsApp Business Cloud API & Client Credential Manager
              </p>
            </div>
          </div>
        </div>

        {/* Client Workspace Selector */}
        <div className="flex items-center gap-3">
          <div className="bg-[#0b1320] border border-white/10 rounded-2xl p-1.5 flex items-center space-x-2">
            <Building2 className="w-4 h-4 text-[#d4a359] ml-2" />
            <select
              value={selectedTenantId}
              onChange={(e) => setSelectedTenantId(e.target.value)}
              className="bg-transparent text-xs font-bold text-white pr-4 py-1.5 focus:outline-none cursor-pointer"
            >
              {tenants.map(t => (
                <option key={t.tenant_id} value={t.tenant_id} className="bg-[#080f1a] text-white">
                  {t.client_name} {t.tenant_id === 'rental_pune' ? '(Default)' : ''}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setShowNewTenantModal(true)}
              className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-[#d4a359] hover:text-[#080f1a] text-neutral-300 text-xs font-bold flex items-center space-x-1 transition-all"
              title="Add Client Profile"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Add Client</span>
            </button>
          </div>
        </div>
      </div>

      {/* Status Message Banner */}
      {statusMessage && (
        <div className={`p-4 rounded-2xl border text-xs sm:text-sm flex items-start space-x-3 transition-all ${
          statusMessage.type === 'success'
            ? 'bg-[#10b981]/10 border-[#10b981]/30 text-white'
            : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
        }`}>
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-[#10b981] flex-shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
          )}
          <div className="flex-1 font-medium">{statusMessage.text}</div>
          <button 
            onClick={() => setStatusMessage(null)}
            className="text-neutral-400 hover:text-white text-xs underline ml-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Diagnostics & Connection Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Card 1: Provider & Live Status */}
        <div className="bg-[#050a12] border border-white/10 rounded-3xl p-6 space-y-4 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider flex items-center space-x-1.5">
                <Globe className="w-3.5 h-3.5 text-[#10b981]" />
                <span>Provider Engine</span>
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/30">
                Meta Cloud API
              </span>
            </div>
            <h3 className="text-lg font-bold text-white mb-1">
              Meta WhatsApp Business Platform
            </h3>
            <p className="text-xs text-neutral-400">
              Direct integration via Graph API <code className="text-[#d4a359]">{config.graph_version}</code>. Client: <strong className="text-white">{config.client_name}</strong>
            </p>
          </div>

          <div className="pt-4 border-t border-white/10 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className={`w-2.5 h-2.5 rounded-full ${
                connectionStatus.tested && connectionStatus.connected
                  ? 'bg-[#10b981] animate-pulse'
                  : connectionStatus.tested && !connectionStatus.connected
                  ? 'bg-rose-500'
                  : config.has_access_token
                  ? 'bg-amber-400'
                  : 'bg-neutral-600'
              }`}></span>
              <span className="text-xs font-bold text-white">
                {connectionStatus.tested && connectionStatus.connected
                  ? 'Meta Cloud Connected'
                  : connectionStatus.tested && !connectionStatus.connected
                  ? 'Connection Offline'
                  : config.has_access_token
                  ? 'Configured (Unverified)'
                  : 'Missing Credentials'}
              </span>
            </div>

            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testingConnection}
              className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white flex items-center space-x-1.5 transition-colors disabled:opacity-50"
            >
              <Activity className={`w-3.5 h-3.5 text-[#10b981] ${testingConnection ? 'animate-spin' : ''}`} />
              <span>{testingConnection ? 'Testing...' : 'Test Connection'}</span>
            </button>
          </div>
        </div>

        {/* Card 2: Configuration Readiness */}
        <div className="bg-[#050a12] border border-white/10 rounded-3xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider flex items-center space-x-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#d4a359]" />
              <span>Setup Readiness</span>
            </span>
            <span className="text-xs font-mono font-bold text-[#d4a359]">
              {readyCount} / {checklist.length}
            </span>
          </div>

          <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${isFullyConfigured ? 'bg-[#10b981]' : 'bg-[#d4a359]'}`}
              style={{ width: `${(readyCount / checklist.length) * 100}%` }}
            />
          </div>

          <div className="space-y-1.5 pt-1">
            {checklist.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <span className={item.ready ? 'text-neutral-300' : 'text-neutral-500'}>{item.label}</span>
                {item.ready ? (
                  <Check className="w-3.5 h-3.5 text-[#10b981]" />
                ) : (
                  <span className="text-[10px] text-amber-400 font-bold uppercase">Required</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Card 3: Actionable Error Diagnostics */}
        <div className="bg-[#050a12] border border-white/10 rounded-3xl p-6 space-y-3 shadow-xl">
          <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider flex items-center space-x-1.5">
            <Activity className="w-3.5 h-3.5 text-rose-400" />
            <span>Diagnostics & Last Error</span>
          </span>

          {config.last_error ? (
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-3 text-xs text-rose-300 space-y-1">
              <span className="font-bold block text-rose-200">Last Provider Error:</span>
              <p className="font-mono text-[11px] leading-relaxed break-words">{config.last_error}</p>
              {config.last_error_at && (
                <span className="text-[10px] text-neutral-500 block pt-1">
                  Occurred: {new Date(config.last_error_at).toLocaleString('en-IN')}
                </span>
              )}
            </div>
          ) : (
            <div className="bg-white/5 border border-white/5 rounded-2xl p-4 text-center text-xs text-neutral-400">
              <CheckCircle2 className="w-6 h-6 text-[#10b981] mx-auto mb-1 opacity-80" />
              <p>No provider errors recorded.</p>
              <span className="text-[10px] text-neutral-500">API is operating normally.</span>
            </div>
          )}

          <div className="pt-2 flex items-center justify-between text-[11px] text-neutral-500 border-t border-white/5">
            <span>Last Test: {config.last_test_at ? new Date(config.last_test_at).toLocaleTimeString('en-IN') : 'Never'}</span>
            <span className={config.last_test_status === 'CONNECTED' ? 'text-[#10b981]' : 'text-neutral-400'}>
              {config.last_test_status || 'Unverified'}
            </span>
          </div>
        </div>

      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSaveSettings} className="space-y-8">
        
        {/* Section 1: Master Controls & Notification Rules */}
        <div className="bg-[#050a12] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                <Sliders className="w-5 h-5 text-[#d4a359]" />
                <span>Notification Dispatch Rules</span>
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                Control automated lead dispatches and recipient rules for {config.client_name}.
              </p>
            </div>

            {/* Master Engine Switch */}
            <div className="flex items-center space-x-3 bg-[#080f1a] px-4 py-2.5 rounded-2xl border border-white/10">
              <span className="text-xs font-bold text-white">Master WhatsApp Engine:</span>
              <button
                type="button"
                onClick={() => setConfig({ ...config, enabled: !config.enabled })}
                className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                  config.enabled ? 'bg-[#10b981]' : 'bg-neutral-800'
                }`}
              >
                <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  config.enabled ? 'translate-x-6' : 'translate-x-0'
                }`} />
              </button>
              <span className={`text-[10px] font-bold uppercase tracking-wider ${config.enabled ? 'text-[#10b981]' : 'text-neutral-500'}`}>
                {config.enabled ? 'Active' : 'Disabled'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Rule 1: Customer Confirmation */}
            <div className="bg-[#080f1a] border border-white/10 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white">Customer Enquiry Confirmation</span>
                <button
                  type="button"
                  onClick={() => setConfig({ ...config, customer_confirmation_enabled: !config.customer_confirmation_enabled })}
                  className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                    config.customer_confirmation_enabled ? 'bg-[#10b981]' : 'bg-neutral-800'
                  }`}
                >
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    config.customer_confirmation_enabled ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Sends automated confirmation acknowledgment to prospective clients upon form submission.
              </p>
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-[11px] text-amber-300 flex items-start space-x-2">
                <ShieldCheck className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <span>Requires explicit opt-in checkbox. Unchecked leads skip customer message automatically.</span>
              </div>
            </div>

            {/* Rule 2: Admin Lead Alerts */}
            <div className="bg-[#080f1a] border border-white/10 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white">Admin Lead Alerts</span>
                <button
                  type="button"
                  onClick={() => setConfig({ ...config, admin_alerts_enabled: !config.admin_alerts_enabled })}
                  className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                    config.admin_alerts_enabled ? 'bg-[#10b981]' : 'bg-neutral-800'
                  }`}
                >
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    config.admin_alerts_enabled ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Sends instant lead alert details directly to the designated administrator WhatsApp phone.
              </p>
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-[11px] text-neutral-300 flex items-start space-x-2">
                <Zap className="w-4 h-4 text-[#d4a359] flex-shrink-0 mt-0.5" />
                <span>Dispatches for every verified enquiry, including customer name, phone, property price, and CRM link.</span>
              </div>
            </div>

          </div>
        </div>

        {/* Section 2: Meta Cloud API Credentials & Endpoints */}
        <div className="bg-[#050a12] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
          <div className="border-b border-white/10 pb-4">
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <Lock className="w-5 h-5 text-[#10b981]" />
              <span>Meta WhatsApp Cloud API Credentials</span>
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Obtain these credentials from your Meta Developer Portal under WhatsApp &gt; API Setup.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Field: API Base URL & Version */}
            <div>
              <label className="block text-xs font-bold text-neutral-300 mb-1.5 uppercase tracking-wider">
                Graph API Endpoint Base
              </label>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  value={config.api_base_url}
                  onChange={(e) => setConfig({ ...config, api_base_url: e.target.value })}
                  placeholder="https://graph.facebook.com"
                  className="col-span-2 bg-[#080f1a] border border-white/10 rounded-xl px-4 py-3 text-xs text-white font-mono focus:outline-none focus:border-[#d4a359]"
                />
                <select
                  value={config.graph_version}
                  onChange={(e) => setConfig({ ...config, graph_version: e.target.value })}
                  className="bg-[#080f1a] border border-white/10 rounded-xl px-3 py-3 text-xs text-white font-mono focus:outline-none focus:border-[#d4a359]"
                >
                  <option value="v21.0">v21.0 (Latest)</option>
                  <option value="v20.0">v20.0</option>
                  <option value="v19.0">v19.0</option>
                </select>
              </div>
            </div>

            {/* Field: Admin Phone Number */}
            <div>
              <label className="block text-xs font-bold text-neutral-300 mb-1.5 uppercase tracking-wider flex items-center space-x-1.5">
                <Phone className="w-3.5 h-3.5 text-[#d4a359]" />
                <span>Admin WhatsApp Recipient Number <span className="text-rose-400">*</span></span>
              </label>
              <input
                type="text"
                value={config.admin_phone}
                onChange={(e) => setConfig({ ...config, admin_phone: e.target.value })}
                placeholder="+91 98220 12345 or 919822012345"
                className="w-full bg-[#080f1a] border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-mono placeholder-neutral-600 focus:outline-none focus:border-[#d4a359]"
                required
              />
              <span className="text-[11px] text-neutral-500 block mt-1">Must include country code (e.g. +91 for India).</span>
            </div>

            {/* Field: Phone Number ID */}
            <div>
              <label className="block text-xs font-bold text-neutral-300 mb-1.5 uppercase tracking-wider">
                WhatsApp Phone Number ID <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={config.phone_number_id}
                onChange={(e) => setConfig({ ...config, phone_number_id: e.target.value })}
                placeholder="e.g. 109876543210987"
                className="w-full bg-[#080f1a] border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-mono placeholder-neutral-600 focus:outline-none focus:border-[#d4a359]"
                required
              />
              <span className="text-[11px] text-neutral-500 block mt-1">Meta assigned Phone Number ID (digits only).</span>
            </div>

            {/* Field: Business Account ID */}
            <div>
              <label className="block text-xs font-bold text-neutral-300 mb-1.5 uppercase tracking-wider">
                WhatsApp Business Account ID (WABA ID)
              </label>
              <input
                type="text"
                value={config.business_account_id}
                onChange={(e) => setConfig({ ...config, business_account_id: e.target.value })}
                placeholder="e.g. 209876543210987"
                className="w-full bg-[#080f1a] border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-mono placeholder-neutral-600 focus:outline-none focus:border-[#d4a359]"
              />
              <span className="text-[11px] text-neutral-500 block mt-1">Identifies your Meta WhatsApp Business portfolio.</span>
            </div>

            {/* Field: System User Permanent Access Token */}
            <div className="md:col-span-2 border-t border-white/10 pt-4">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center space-x-1.5">
                  <Lock className="w-3.5 h-3.5 text-[#10b981]" />
                  <span>Meta System User Access Token <span className="text-rose-400">*</span></span>
                </label>
                {config.has_access_token && (
                  <span className="text-[11px] text-[#10b981] font-mono flex items-center space-x-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Saved: {config.masked_access_token}</span>
                  </span>
                )}
              </div>

              {!showTokenInput && config.has_access_token ? (
                <div className="flex items-center space-x-3 bg-[#080f1a] border border-white/10 rounded-xl p-3">
                  <div className="flex-1 font-mono text-xs text-neutral-400">
                    Token is securely stored server-side ({config.masked_access_token})
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowTokenInput(true)}
                    className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white transition-colors"
                  >
                    Replace Token
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <input
                    type="password"
                    value={config.access_token}
                    onChange={(e) => setConfig({ ...config, access_token: e.target.value })}
                    placeholder="EAAB... (Paste new System User Access Token)"
                    className="w-full bg-[#080f1a] border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-mono placeholder-neutral-600 focus:outline-none focus:border-[#d4a359] pr-20"
                  />
                  {config.has_access_token && (
                    <button
                      type="button"
                      onClick={() => { setShowTokenInput(false); setConfig({ ...config, access_token: '' }); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white text-xs underline"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              )}
              <span className="text-[11px] text-neutral-500 block mt-1.5">
                System User token must have <code className="text-[#d4a359]">whatsapp_business_messaging</code> permission. Never logged or exposed to clients.
              </span>
            </div>

          </div>
        </div>

        {/* Section 3: Approved Meta Templates Configuration */}
        <div className="bg-[#050a12] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
          <div className="border-b border-white/10 pb-4">
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <FileCode2 className="w-5 h-5 text-[#d4a359]" />
              <span>Approved Meta WhatsApp Templates</span>
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Meta requires pre-approved Utility templates for business-initiated dispatches.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Customer Template */}
            <div className="bg-[#080f1a] border border-white/10 rounded-2xl p-5 space-y-3">
              <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider block">
                Customer Enquiry Confirmation Template
              </span>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  value={config.template_name_customer}
                  onChange={(e) => setConfig({ ...config, template_name_customer: e.target.value })}
                  placeholder="rental_pune_enquiry_customer"
                  className="col-span-2 bg-[#050a12] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#d4a359]"
                />
                <input
                  type="text"
                  value={config.template_language_customer}
                  onChange={(e) => setConfig({ ...config, template_language_customer: e.target.value })}
                  placeholder="en"
                  className="bg-[#050a12] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#d4a359]"
                />
              </div>
              <div className="p-3 bg-black/40 rounded-xl text-[11px] text-neutral-400 space-y-1 font-mono">
                <span className="text-[#d4a359] font-bold block">Body Parameter Order:</span>
                <div>1: customer_name</div>
                <div>2: property_title</div>
                <div>3: property_location</div>
              </div>
            </div>

            {/* Admin Alert Template */}
            <div className="bg-[#080f1a] border border-white/10 rounded-2xl p-5 space-y-3">
              <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider block">
                Admin Lead Alert Template
              </span>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  value={config.template_name_admin}
                  onChange={(e) => setConfig({ ...config, template_name_admin: e.target.value })}
                  placeholder="rental_pune_admin_alert"
                  className="col-span-2 bg-[#050a12] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#d4a359]"
                />
                <input
                  type="text"
                  value={config.template_language_admin}
                  onChange={(e) => setConfig({ ...config, template_language_admin: e.target.value })}
                  placeholder="en"
                  className="bg-[#050a12] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#d4a359]"
                />
              </div>
              <div className="p-3 bg-black/40 rounded-xl text-[11px] text-neutral-400 space-y-1 font-mono">
                <span className="text-[#d4a359] font-bold block">Body Parameter Order:</span>
                <div>1: customer_name | 2: customer_phone | 3: property_title</div>
                <div>4: property_location | 5: property_price | 6: enquiry_message | 7: submission_datetime</div>
              </div>
            </div>

          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setShowTestModal(true)}
              className="w-full sm:w-auto px-5 py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition-colors cursor-pointer"
            >
              <Send className="w-4 h-4 text-[#10b981]" />
              <span>Send Test Message</span>
            </button>
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testingConnection}
              className="w-full sm:w-auto px-5 py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Activity className={`w-4 h-4 text-[#d4a359] ${testingConnection ? 'animate-spin' : ''}`} />
              <span>Test Connection</span>
            </button>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-[#d4a359] hover:bg-[#c2934a] text-[#080f1a] font-black text-sm uppercase tracking-wider shadow-lg shadow-[#d4a359]/20 flex items-center justify-center space-x-2 transition-all cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-[#080f1a]" />
                <span>Saving Configuration...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4 text-[#080f1a]" />
                <span>Save Configuration</span>
              </>
            )}
          </button>
        </div>

      </form>

      {/* Webhook Configuration Card */}
      <div className="bg-[#050a12] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl">
        <div className="flex items-center space-x-2">
          <Zap className="w-5 h-5 text-[#d4a359]" />
          <h3 className="text-base font-bold text-white uppercase tracking-wider">
            Meta Webhook Delivery Endpoint
          </h3>
        </div>
        <p className="text-xs text-neutral-400 max-w-2xl">
          Configure this Webhook Callback URL in your Meta WhatsApp App Dashboard under <strong>Configuration &gt; Webhook</strong> to receive delivery receipts (Delivered / Read).
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="text-[11px] font-bold text-neutral-400 block mb-1 uppercase tracking-wider">
              Callback URL
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                readOnly
                value={`${typeof window !== 'undefined' ? window.location.origin : ''}/api/whatsapp/webhook`}
                className="w-full bg-[#080f1a] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-neutral-300 font-mono select-all"
              />
              <button
                type="button"
                onClick={copyWebhookUrl}
                className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white transition-colors flex-shrink-0"
                title="Copy Callback URL"
              >
                {copiedWebhook ? <Check className="w-4 h-4 text-[#10b981]" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-neutral-400 block mb-1 uppercase tracking-wider">
              Verify Token
            </label>
            <input
              type="text"
              readOnly
              value={config.webhook_verify_token}
              className="w-full bg-[#080f1a] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-neutral-300 font-mono select-all"
            />
          </div>
        </div>
      </div>

      {/* Recent Delivery Audit Logs Table */}
      <div className="bg-[#050a12] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <Activity className="w-5 h-5 text-[#10b981]" />
              <span>Notification Audit Logs</span>
            </h2>
            <p className="text-xs text-neutral-400">
              Audit log of WhatsApp dispatches. Secrets and tokens are redacted.
            </p>
          </div>

          <button
            type="button"
            onClick={handleRefreshLogs}
            disabled={refreshingLogs}
            className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white flex items-center space-x-1.5 transition-colors self-start sm:self-auto cursor-pointer"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${refreshingLogs ? 'animate-spin' : ''}`} />
            <span>Refresh Logs</span>
          </button>
        </div>

        {logs.length === 0 ? (
          <div className="text-center py-10 text-xs text-neutral-500">
            No notification logs recorded yet. Send a test message or submit a website enquiry to generate records.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-neutral-400 uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3 font-bold">Time (IST)</th>
                  <th className="py-2.5 px-3 font-bold">Recipient</th>
                  <th className="py-2.5 px-3 font-bold">Phone</th>
                  <th className="py-2.5 px-3 font-bold">Status</th>
                  <th className="py-2.5 px-3 font-bold">Lead ID</th>
                  <th className="py-2.5 px-3 font-bold">Provider Info / Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono text-[11px]">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 px-3 text-neutral-400 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded font-bold uppercase text-[9px] ${
                        log.recipient_type === 'CUSTOMER' ? 'bg-sky-500/20 text-sky-300' :
                        log.recipient_type === 'ADMIN' ? 'bg-[#d4a359]/20 text-[#d4a359]' :
                        'bg-purple-500/20 text-purple-300'
                      }`}>
                        {log.recipient_type}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-white whitespace-nowrap">{log.recipient_phone}</td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded font-bold uppercase text-[9px] inline-flex items-center space-x-1 ${
                        log.status === 'SENT' || log.status === 'DELIVERED' || log.status === 'READ'
                          ? 'bg-[#10b981]/20 text-[#10b981]'
                          : 'bg-rose-500/20 text-rose-300'
                      }`}>
                        <span>{log.status}</span>
                      </span>
                    </td>
                    <td className="py-3 px-3 text-neutral-400 whitespace-nowrap">
                      {log.lead_id ? `#${log.lead_id}` : '—'}
                    </td>
                    <td className="py-3 px-3 text-neutral-300 max-w-xs truncate">
                      {log.error_message ? (
                        <span className="text-rose-400" title={log.error_message}>
                          {log.error_message}
                        </span>
                      ) : log.whatsapp_message_id ? (
                        <span className="text-neutral-500 font-mono" title={log.whatsapp_message_id}>
                          ID: {log.whatsapp_message_id.substring(0, 18)}...
                        </span>
                      ) : 'Success'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Send Test Message */}
      {showTestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#050a12] border border-white/20 rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-6 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center space-x-2">
                <Send className="w-5 h-5 text-[#10b981]" />
                <h3 className="text-lg font-bold text-white">Send WhatsApp Test Message</h3>
              </div>
              <button
                type="button"
                onClick={() => { setShowTestModal(false); setTestConfirmed(false); }}
                className="text-neutral-400 hover:text-white text-lg p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-1.5 uppercase tracking-wider">
                  Target Recipient Phone <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={testRecipientPhone}
                  onChange={(e) => setTestRecipientPhone(e.target.value)}
                  placeholder="e.g. +91 98220 12345 or 919822012345"
                  className="w-full bg-[#080f1a] border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-mono placeholder-neutral-600 focus:outline-none focus:border-[#d4a359]"
                />
                <span className="text-[11px] text-neutral-500 block mt-1">
                  Ensure phone is registered with WhatsApp. (If using Meta Sandbox, add it to Allowed Test Numbers).
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-1.5 uppercase tracking-wider">
                  Custom Test Message (Optional)
                </label>
                <textarea
                  rows={3}
                  value={testCustomMessage}
                  onChange={(e) => setTestCustomMessage(e.target.value)}
                  placeholder={`Leave empty to send default verified ${brandName} greeting.`}
                  className="w-full bg-[#080f1a] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-[#d4a359]"
                />
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 space-y-1">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={testConfirmed}
                    onChange={(e) => setTestConfirmed(e.target.checked)}
                    className="rounded border-amber-500/40 text-[#d4a359] focus:ring-0"
                  />
                  <span className="font-semibold text-white">Confirm Authorization:</span>
                </label>
                <p className="text-[11px] text-neutral-400 pl-6">
                  I confirm that the recipient number belongs to our internal admin/testing team.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 border-t border-white/10 pt-4">
              <button
                type="button"
                onClick={() => { setShowTestModal(false); setTestConfirmed(false); }}
                className="px-4 py-2.5 rounded-xl text-neutral-400 hover:text-white text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendTestMessage}
                disabled={sendingTestMessage || !testRecipientPhone.trim() || !testConfirmed}
                className="px-5 py-2.5 rounded-xl bg-[#10b981] hover:bg-[#0ea5e9] text-white font-bold text-xs uppercase tracking-wider flex items-center space-x-2 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {sendingTestMessage ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Dispatching...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Authorize & Send Now</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add New Client Workspace */}
      {showNewTenantModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <form onSubmit={handleCreateNewTenant} className="bg-[#050a12] border border-white/20 rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-6 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center space-x-2">
                <Building2 className="w-5 h-5 text-[#d4a359]" />
                <h3 className="text-lg font-bold text-white">Add New Client Profile</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowNewTenantModal(false)}
                className="text-neutral-400 hover:text-white text-lg p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-1.5 uppercase tracking-wider">
                  Client Business Display Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={newTenantName}
                  onChange={(e) => setNewTenantName(e.target.value)}
                  placeholder="e.g. Apex Realty Partners"
                  className="w-full bg-[#080f1a] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#d4a359]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-1.5 uppercase tracking-wider">
                  Tenant Slug / ID (Optional)
                </label>
                <input
                  type="text"
                  value={newTenantId}
                  onChange={(e) => setNewTenantId(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                  placeholder="e.g. apex_realty"
                  className="w-full bg-[#080f1a] border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-mono focus:outline-none focus:border-[#d4a359]"
                />
                <span className="text-[11px] text-neutral-500 block mt-1">
                  Unique identifier for tenant-isolated credentials and audit logs.
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 border-t border-white/10 pt-4">
              <button
                type="button"
                onClick={() => setShowNewTenantModal(false)}
                className="px-4 py-2.5 rounded-xl text-neutral-400 hover:text-white text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-[#d4a359] hover:bg-[#c2934a] text-[#080f1a] font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
              >
                Create Workspace
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
