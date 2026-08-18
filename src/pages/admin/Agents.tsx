import { useState, useEffect } from 'react';
import { useAppStore } from '../../store/index.js';
import { User } from '../../types.js';
import { supabaseService, supabase } from '../../services/supabaseService.js';
import { 
  Users, 
  Plus, 
  Trash2, 
  Edit2, 
  X, 
  Check, 
  AlertTriangle, 
  Lock, 
  Mail, 
  Search, 
  KeyRound,
  ShieldCheck,
  UserX,
  RefreshCw,
  Copy,
  CheckCheck,
  Eye,
  EyeOff,
  Sparkles
} from 'lucide-react';

export default function Agents() {
  const { token, user: currentUser } = useAppStore();
  const [agents, setAgents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<User | null>(null);
  const [deleteConfirmAgent, setDeleteConfirmAgent] = useState<User | null>(null);
  
  // Created agent credentials popup
  const [createdCredentials, setCreatedCredentials] = useState<{
    name: string;
    email: string;
    password?: string;
    agent_id: string;
    phone?: string;
  } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showCreatedPassword, setShowCreatedPassword] = useState(true);

  // Forms
  const [formData, setFormData] = useState({ name: '', email: '', password: '', phone: '', notes: '' });
  const [editFormData, setEditFormData] = useState({ name: '', email: '', password: '', phone: '', notes: '' });
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const copyToClipboard = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const fetchAgents = async (showLoading = false) => {
    if (showLoading && agents.length === 0) setLoading(true);
    try {
      const data = await supabaseService.agents.getAll();
      if (Array.isArray(data) && data.length > 0) {
        setAgents(prev => {
          const map = new Map<string, User>();
          // 1. Put incoming data
          for (const item of data) {
            const key = (item.email || String(item.id || item.user_id || '')).toLowerCase().trim();
            if (key) map.set(key, item);
          }
          // 2. Keep any optimistic/unsynced items from current state
          for (const p of prev) {
            const key = (p.email || String(p.id || p.user_id || '')).toLowerCase().trim();
            if (key && !map.has(key)) {
              map.set(key, p);
            }
          }
          return Array.from(map.values());
        });
      }
    } catch (err) {
      console.error('Error fetching agents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents(agents.length === 0);

    // 1. Instant window event & storage listener
    const handleUpdate = () => {
      fetchAgents(false);
    };
    window.addEventListener('agents_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    // 2. Background sync polling every 10 seconds
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchAgents(false);
      }
    }, 10000);

    // 3. Supabase Realtime channel subscription
    let channel: any = null;
    try {
      channel = supabase
        .channel('agents-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, () => {
          fetchAgents(false);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
          fetchAgents(false);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
          fetchAgents(false);
        })
        .subscribe();
    } catch (e) {
      console.warn('Realtime subscription note:', e);
    }

    return () => {
      window.removeEventListener('agents_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
      clearInterval(interval);
      if (channel) {
        supabase.removeChannel(channel).catch(() => {});
      }
    };
  }, []);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    const generatedId = `AGENT-${Math.floor(1000 + Math.random() * 9000)}`;
    const tempAgent: User = {
      id: `temp-${Date.now()}`,
      agent_id: generatedId,
      name: formData.name,
      email: formData.email.trim().toLowerCase(),
      phone: formData.phone,
      role: 'AGENT',
      status: 'ACTIVE',
      notes: formData.notes,
      created_at: new Date().toISOString()
    };
    
    // Add immediately to UI
    setAgents(prev => [tempAgent, ...prev.filter(a => (a.email || '').toLowerCase() !== tempAgent.email)]);

    try {
      const created = await supabaseService.agents.create(formData);
      setIsAddModalOpen(false);
      
      const savedAgentId = created?.agent_id || (created?.id ? `AGENT-${typeof created.id === 'string' ? created.id.substring(created.id.length - 4) : created.id}` : generatedId);

      // Show credentials popup so admin can copy the created Agent ID and Password
      setCreatedCredentials({
        name: formData.name,
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        agent_id: savedAgentId,
        phone: formData.phone
      });

      const confirmedAgent: User = {
        ...(created || tempAgent),
        agent_id: savedAgentId,
        status: 'ACTIVE'
      };

      setFormData({ name: '', email: '', password: '', phone: '', notes: '' });
      setAgents(prev => [
        confirmedAgent,
        ...prev.filter(a => a.id !== tempAgent.id && (a.email || '').toLowerCase() !== confirmedAgent.email)
      ]);
    } catch (err: any) {
      setAgents(prev => prev.filter(a => a.id !== tempAgent.id));
      setErrorMessage(err?.message || 'Error creating agent account in Supabase Auth.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (agent: User) => {
    setEditingAgent(agent);
    setEditFormData({
      name: agent.name || '',
      email: agent.email || '',
      password: '', // empty means keep existing password
      phone: agent.phone || '',
      notes: agent.notes || ''
    });
    setErrorMessage('');
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAgent) return;
    setErrorMessage('');
    setIsSubmitting(true);

    // Optimistic update
    setAgents(prev => prev.map(a => 
      String(a.id) === String(editingAgent.id) || String(a.user_id) === String(editingAgent.id)
        ? { ...a, ...editFormData }
        : a
    ));

    try {
      await supabaseService.agents.update(editingAgent.id, editFormData);
      setEditingAgent(null);
      fetchAgents(false);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error updating agent.');
      fetchAgents(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAgent = async () => {
    if (!deleteConfirmAgent) return;
    setErrorMessage('');
    setIsDeleting(true);

    const agentToDeleteId = deleteConfirmAgent.id;
    // Optimistic removal
    setAgents(prev => prev.filter(a => String(a.id) !== String(agentToDeleteId) && String(a.user_id) !== String(agentToDeleteId)));

    try {
      await supabaseService.agents.delete(agentToDeleteId);
      setDeleteConfirmAgent(null);
      fetchAgents(false);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error deleting agent.');
      fetchAgents(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredAgents = agents.filter(a => 
    (a.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (a.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (a.agent_id || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-6">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Field Agent Directory</h1>
            <span className="px-3 py-0.5 rounded-full bg-red-600/20 text-red-400 border border-red-600/40 text-xs font-bold">
              {agents.length} Authorized Agents
            </span>
          </div>
          <p className="text-sm text-neutral-400 mt-1">
            Manage field agent credentials, Agent IDs, assign property tours, and control email & password accounts.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button 
            id="btn-refresh-agents"
            onClick={() => fetchAgents(true)}
            disabled={loading}
            className="flex items-center justify-center px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-white rounded-xl font-medium text-sm transition-all shadow-md cursor-pointer disabled:opacity-50"
            title="Sync all agents from database"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin text-red-500' : 'text-neutral-400'}`} />
            <span>{loading ? 'Syncing...' : 'Sync Directory'}</span>
          </button>

          <button 
            id="btn-add-agent"
            onClick={() => {
              setIsAddModalOpen(true);
              setErrorMessage('');
            }}
            className="flex items-center justify-center px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-red-600/30 cursor-pointer"
          >
            <Plus className="w-4 h-4 mr-2" />
            <span>Add New Agent</span>
          </button>
        </div>
      </div>

      {/* Search & Stats Bar */}
      <div className="bg-neutral-950 p-4 rounded-2xl border border-neutral-800 flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-neutral-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search agents by Agent ID, name, or email..."
            className="w-full pl-10 pr-4 py-2 bg-black border border-neutral-800 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-red-600"
          />
        </div>

        <div className="flex items-center space-x-3 text-xs text-neutral-400">
          <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-black border border-neutral-800 rounded-lg">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Supabase Cloud Synced</span>
          </div>
          <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-black border border-neutral-800 rounded-lg">
            <KeyRound className="w-3.5 h-3.5 text-red-400" />
            <span>Supabase Auth & Password Login</span>
          </div>
        </div>
      </div>

      {/* Agents Table */}
      <div className="bg-neutral-950 rounded-3xl border border-neutral-800 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black border-b border-neutral-800 text-xs font-bold uppercase tracking-wider text-neutral-400">
                <th className="px-6 py-4">Agent ID & Identity</th>
                <th className="px-6 py-4">Contact Info</th>
                <th className="px-6 py-4">Role & Status</th>
                <th className="px-6 py-4">Last Activity</th>
                <th className="px-6 py-4">Profile Notes</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-900 text-sm">
              {loading && agents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-neutral-400 font-medium">
                    <div className="w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading agent credentials...
                  </td>
                </tr>
              ) : filteredAgents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-neutral-500">
                    No field agents found. Click "Add New Agent" above to create an agent ID and credentials.
                  </td>
                </tr>
              ) : (
                filteredAgents.map((agent) => {
                  const displayAgentId = agent.agent_id || `AGENT-${typeof agent.id === 'string' ? agent.id.substring(agent.id.length - 4) : agent.id}`;
                  return (
                    <tr key={agent.id} className="hover:bg-neutral-900/60 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-xl bg-red-950/60 border border-red-600/30 flex items-center justify-center font-bold text-red-400 text-sm flex-shrink-0">
                            {agent.name ? agent.name.charAt(0).toUpperCase() : 'A'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-white text-base">{agent.name}</h3>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(displayAgentId, `id-${agent.id}`)}
                                className="px-2 py-0.5 rounded-md bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-[11px] font-mono text-neutral-300 flex items-center gap-1 transition-colors cursor-pointer"
                                title="Click to copy Agent ID"
                              >
                                <span>{displayAgentId}</span>
                                {copiedKey === `id-${agent.id}` ? (
                                  <CheckCheck className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3 text-neutral-500" />
                                )}
                              </button>
                            </div>
                            <span className="text-xs text-neutral-500 font-mono">
                              {agent.user_id ? `${agent.user_id.substring(0, 10)}...` : `ID #${agent.id}`}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center text-neutral-300 font-mono text-xs">
                            <Mail className="w-3.5 h-3.5 mr-1.5 text-neutral-500" />
                            <span>{agent.email}</span>
                          </div>
                          {agent.phone && (
                            <div className="text-xs text-neutral-400 font-mono">
                              📞 {agent.phone}
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center px-2.5 py-0.5 bg-red-950/60 text-red-400 border border-red-800/60 rounded-full text-xs font-bold">
                              <KeyRound className="w-3 h-3 mr-1" />
                              {agent.role || 'AGENT'}
                            </span>
                            <span className="inline-flex items-center px-2 py-0.5 bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 rounded-full text-[10px] font-semibold">
                              Active
                            </span>
                          </div>
                          <div className="text-[10px] text-neutral-400">
                            Supabase Cloud Verified
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-xs text-neutral-400">
                        {agent.last_login ? (
                          <div className="space-y-0.5">
                            <span className="text-emerald-400 font-medium flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                              Logged In
                            </span>
                            <span className="text-[11px] text-neutral-500 font-mono block">
                              {new Date(agent.last_login).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        ) : (
                          <span className="text-neutral-500 text-xs italic">Pending first login</span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-xs text-neutral-400 max-w-xs truncate">
                        {agent.notes || <span className="text-neutral-600 italic">No notes</span>}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            id={`btn-edit-agent-${agent.id}`}
                            onClick={() => openEditModal(agent)}
                            className="p-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-red-600/40 text-neutral-300 hover:text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                            title="Edit Agent Profile"
                          >
                            <Edit2 className="w-4 h-4 text-neutral-300 hover:text-red-400" />
                          </button>
                          <button
                            id={`btn-delete-agent-${agent.id}`}
                            onClick={() => {
                              setDeleteConfirmAgent(agent);
                              setErrorMessage('');
                            }}
                            className="p-2 bg-neutral-900 hover:bg-red-950/60 border border-neutral-800 hover:border-red-600/60 text-neutral-400 hover:text-red-400 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                            title="Delete Agent from Database"
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

      {/* NEW AGENT CREATED CREDENTIALS MODAL */}
      {createdCredentials && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-neutral-950 border border-emerald-500/40 text-white rounded-3xl max-w-md w-full p-6 md:p-8 shadow-2xl relative space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Agent Account Created</h3>
                  <p className="text-xs text-emerald-400 font-medium">Ready for immediate login</p>
                </div>
              </div>
              <button 
                onClick={() => setCreatedCredentials(null)}
                className="p-1.5 rounded-full bg-neutral-900 text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-black rounded-2xl border border-neutral-800 space-y-3">
              <div>
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-0.5">Assigned Agent ID</span>
                <div className="flex items-center justify-between bg-neutral-900/80 px-3 py-2 rounded-xl border border-neutral-700">
                  <span className="text-sm font-mono font-bold text-emerald-400">{createdCredentials.agent_id}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(createdCredentials.agent_id, 'modal-id')}
                    className="text-xs text-neutral-300 hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    {copiedKey === 'modal-id' ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'modal-id' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-0.5">Agent Name & Email</span>
                <div className="bg-neutral-900/80 px-3 py-2 rounded-xl border border-neutral-800 text-xs space-y-1">
                  <p className="font-bold text-white">{createdCredentials.name}</p>
                  <p className="font-mono text-neutral-300">{createdCredentials.email}</p>
                </div>
              </div>

              {createdCredentials.password && (
                <div>
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-0.5">Assigned Password</span>
                  <div className="flex items-center justify-between bg-neutral-900/80 px-3 py-2 rounded-xl border border-neutral-800">
                    <span className="text-xs font-mono font-bold text-neutral-200">
                      {showCreatedPassword ? createdCredentials.password : '••••••••••••'}
                    </span>
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => setShowCreatedPassword(!showCreatedPassword)}
                        className="text-neutral-400 hover:text-white cursor-pointer"
                      >
                        {showCreatedPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(createdCredentials.password || '', 'modal-pass')}
                        className="text-xs text-neutral-300 hover:text-white flex items-center gap-1 cursor-pointer"
                      >
                        {copiedKey === 'modal-pass' ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedKey === 'modal-pass' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-3 bg-neutral-900/60 rounded-xl border border-neutral-800 text-xs text-neutral-300 space-y-1">
              <span className="font-bold text-white block">ℹ️ How the agent logs in:</span>
              <p>• The agent logs in on the Login page using their <strong>Email and Password</strong>.</p>
              <p>• If email confirmation is enabled on your Supabase project, they can confirm their email via the link sent to their inbox.</p>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => {
                  const credsText = `Rental Pune Agent Credentials:\nAgent ID: ${createdCredentials.agent_id}\nName: ${createdCredentials.name}\nEmail: ${createdCredentials.email}\nPassword: ${createdCredentials.password || '(Secured)'}\nLogin URL: ${window.location.origin}/login`;
                  copyToClipboard(credsText, 'modal-all');
                }}
                className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold border border-neutral-700 flex items-center gap-1.5 cursor-pointer"
              >
                {copiedKey === 'modal-all' ? <CheckCheck className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copiedKey === 'modal-all' ? 'All Credentials Copied!' : 'Copy All Credentials'}</span>
              </button>

              <button
                type="button"
                onClick={() => setCreatedCredentials(null)}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD AGENT MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-950 border border-neutral-800 text-white rounded-3xl max-w-md w-full p-6 md:p-8 shadow-2xl relative space-y-5 animate-in fade-in zoom-in duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div>
                <h3 className="text-xl font-bold text-white">Create Agent Account</h3>
                <p className="text-xs text-neutral-400">Generates an Agent ID and links credentials to Supabase Auth.</p>
              </div>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-full bg-neutral-900 text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-950/80 border border-red-600/60 rounded-xl text-xs text-red-300 flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1">Agent Full Name *</label>
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full px-3.5 py-2.5 bg-black border border-neutral-800 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1">Agent Email (Login ID) *</label>
                <input
                  required
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="agent@rentalpunerealty.com"
                  className="w-full px-3.5 py-2.5 bg-black border border-neutral-800 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                  className="w-full px-3.5 py-2.5 bg-black border border-neutral-800 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1">Agent Password *</label>
                <input
                  required
                  type="password"
                  minLength={6}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Min 6 characters"
                  className="w-full px-3.5 py-2.5 bg-black border border-neutral-800 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-600"
                />
                <p className="text-[11px] text-neutral-500 mt-1">Managed securely via Supabase Auth with Email and Password sign-in.</p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1">Profile Info / Assigned Area</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="e.g. Baner, Balewadi & Hinjewadi specialist"
                  className="w-full px-3.5 py-2 bg-black border border-neutral-800 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-neutral-900 text-neutral-300 hover:text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="btn-save-agent"
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md shadow-red-600/30 flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSubmitting ? 'Creating...' : 'Create Agent Account'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT AGENT MODAL */}
      {editingAgent && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-950 border border-neutral-800 text-white rounded-3xl max-w-md w-full p-6 md:p-8 shadow-2xl relative space-y-5 animate-in fade-in zoom-in duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div>
                <h3 className="text-xl font-bold text-white">Edit Agent Profile</h3>
                <p className="text-xs text-neutral-400">Update Supabase profile data or reset credentials.</p>
              </div>
              <button 
                onClick={() => setEditingAgent(null)}
                className="p-1.5 rounded-full bg-neutral-900 text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-950/80 border border-red-600/60 rounded-xl text-xs text-red-300 flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1">Full Name *</label>
                <input
                  required
                  type="text"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-black border border-neutral-800 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1">Email Address (Login ID) *</label>
                <input
                  required
                  type="email"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-black border border-neutral-800 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={editFormData.phone}
                  onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                  className="w-full px-3.5 py-2.5 bg-black border border-neutral-800 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1">
                  Reset Password <span className="text-neutral-500 font-normal">(Leave blank to keep unchanged)</span>
                </label>
                <input
                  type="password"
                  value={editFormData.password}
                  onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                  placeholder="Enter new password if changing"
                  className="w-full px-3.5 py-2.5 bg-black border border-neutral-800 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1">Profile Info / Notes</label>
                <textarea
                  rows={2}
                  value={editFormData.notes}
                  onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                  className="w-full px-3.5 py-2 bg-black border border-neutral-800 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setEditingAgent(null)}
                  className="px-4 py-2 bg-neutral-900 text-neutral-300 hover:text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="btn-update-agent"
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md shadow-red-600/30 flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSubmitting ? 'Saving...' : 'Update Agent'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE AGENT CONFIRMATION DIALOG */}
      {deleteConfirmAgent && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-950 border border-red-900/60 text-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="w-12 h-12 rounded-2xl bg-red-950/80 border border-red-600/40 flex items-center justify-center text-red-500 mx-auto">
              <UserX className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-xl font-bold text-white">Delete Agent Permanently?</h3>
              <p className="text-neutral-400 text-xs leading-relaxed">
                Are you sure you want to delete <strong className="text-white">"{deleteConfirmAgent.name}" ({deleteConfirmAgent.email})</strong>?
              </p>
              <div className="p-3 bg-red-950/40 border border-red-900/60 rounded-xl text-[11px] text-red-300 text-left space-y-1">
                <span className="font-bold block text-red-400">⚠️ Database & Login Impact:</span>
                <p>• The agent user record will be permanently deleted from the database.</p>
                <p>• The agent will immediately be unable to log in with these credentials.</p>
                <p>• Any assigned leads and past site visits will be safely unassigned.</p>
              </div>
            </div>

            {errorMessage && (
              <div className="p-2.5 bg-red-950 border border-red-600/60 rounded-xl text-xs text-red-300">
                {errorMessage}
              </div>
            )}

            <div className="flex items-center justify-center space-x-3 pt-3 border-t border-neutral-900">
              <button
                type="button"
                onClick={() => setDeleteConfirmAgent(null)}
                className="px-5 py-2.5 bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="btn-confirm-delete-agent"
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteAgent}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors shadow-lg shadow-red-600/30 flex items-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeleting ? 'Deleting...' : 'Yes, Delete from Database'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
