import { useState, useEffect } from 'react';
import { useAppStore } from '../../store/index.js';
import { User } from '../../types.js';
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
  ShieldAlert, 
  Search, 
  KeyRound,
  ShieldCheck,
  UserX
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
  
  // Forms
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [editFormData, setEditFormData] = useState({ name: '', email: '', password: '' });
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchAgents = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/agents', { 
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAgents(data);
      }
    } catch (err) {
      console.error('Error fetching agents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, [token]);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to create agent account.');
        return;
      }

      setIsAddModalOpen(false);
      setFormData({ name: '', email: '', password: '' });
      fetchAgents();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Server error creating agent.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (agent: User) => {
    setEditingAgent(agent);
    setEditFormData({
      name: agent.name || '',
      email: agent.email || '',
      password: '' // empty means keep existing password
    });
    setErrorMessage('');
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAgent) return;
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/agents/${editingAgent.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(editFormData)
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to update agent.');
        return;
      }

      setEditingAgent(null);
      fetchAgents();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Server error updating agent.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAgent = async () => {
    if (!deleteConfirmAgent) return;
    setErrorMessage('');
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/agents/${deleteConfirmAgent.id}`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${token}` 
        }
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to delete agent.');
        return;
      }

      setDeleteConfirmAgent(null);
      fetchAgents();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Server error deleting agent.');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredAgents = agents.filter(a => 
    (a.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (a.email || '').toLowerCase().includes(searchTerm.toLowerCase())
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
            Manage field agent access credentials, assign property site tours, and revoke or delete logins permanently.
          </p>
        </div>

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

      {/* Search & Stats Bar */}
      <div className="bg-neutral-950 p-4 rounded-2xl border border-neutral-800 flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-neutral-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search agents by name or email..."
            className="w-full pl-10 pr-4 py-2 bg-black border border-neutral-800 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-red-600"
          />
        </div>

        <div className="flex items-center space-x-3 text-xs text-neutral-400">
          <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-black border border-neutral-800 rounded-lg">
            <ShieldCheck className="w-3.5 h-3.5 text-red-500" />
            <span>Database Synced</span>
          </div>
          <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-black border border-neutral-800 rounded-lg">
            <Lock className="w-3.5 h-3.5 text-neutral-400" />
            <span>Bcrypt Hashed Auth</span>
          </div>
        </div>
      </div>

      {/* Agents Table */}
      <div className="bg-neutral-950 rounded-3xl border border-neutral-800 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black border-b border-neutral-800 text-xs font-bold uppercase tracking-wider text-neutral-400">
                <th className="px-6 py-4">Agent Identity</th>
                <th className="px-6 py-4">Email / Login ID</th>
                <th className="px-6 py-4">Role & Access</th>
                <th className="px-6 py-4">Registered Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-900 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-neutral-400 font-medium">
                    <div className="w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading agent credentials...
                  </td>
                </tr>
              ) : filteredAgents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-neutral-500">
                    No field agents found. Add an agent to grant access to the Site Visit portal.
                  </td>
                </tr>
              ) : (
                filteredAgents.map((agent) => (
                  <tr key={agent.id} className="hover:bg-neutral-900/60 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-red-950/60 border border-red-600/30 flex items-center justify-center font-bold text-red-400 text-sm flex-shrink-0">
                          {agent.name ? agent.name.charAt(0).toUpperCase() : 'A'}
                        </div>
                        <div>
                          <h3 className="font-bold text-white text-base">{agent.name}</h3>
                          <span className="text-xs text-neutral-500">Agent UID #{agent.id}</span>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center text-neutral-300 font-mono text-xs">
                        <Mail className="w-3.5 h-3.5 mr-1.5 text-neutral-500" />
                        <span>{agent.email}</span>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 bg-red-950/60 text-red-400 border border-red-800/60 rounded-full text-xs font-bold">
                        <KeyRound className="w-3 h-3 mr-1" />
                        {agent.role}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-xs text-neutral-400">
                      {agent.created_at ? new Date(agent.created_at).toLocaleDateString() : 'Active'}
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD AGENT MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-950 border border-neutral-800 text-white rounded-3xl max-w-md w-full p-6 md:p-8 shadow-2xl relative space-y-5 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div>
                <h3 className="text-xl font-bold text-white">Create Agent Login</h3>
                <p className="text-xs text-neutral-400">Provision credentials for field staff to log in and submit site visit reviews.</p>
              </div>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-full bg-neutral-900 text-neutral-400 hover:text-white"
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
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1">Full Name *</label>
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. David Miller"
                  className="w-full px-3.5 py-2.5 bg-black border border-neutral-800 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1">Email Address (Login ID) *</label>
                <input
                  required
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="agent@company.com"
                  className="w-full px-3.5 py-2.5 bg-black border border-neutral-800 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1">Password *</label>
                <input
                  required
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Enter strong password"
                  className="w-full px-3.5 py-2.5 bg-black border border-neutral-800 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-neutral-900 text-neutral-300 hover:text-white rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  id="btn-save-agent"
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md shadow-red-600/30 flex items-center space-x-1.5"
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
          <div className="bg-neutral-950 border border-neutral-800 text-white rounded-3xl max-w-md w-full p-6 md:p-8 shadow-2xl relative space-y-5 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div>
                <h3 className="text-xl font-bold text-white">Edit Agent Account</h3>
                <p className="text-xs text-neutral-400">Update agent profile or reset password.</p>
              </div>
              <button 
                onClick={() => setEditingAgent(null)}
                className="p-1.5 rounded-full bg-neutral-900 text-neutral-400 hover:text-white"
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

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setEditingAgent(null)}
                  className="px-4 py-2 bg-neutral-900 text-neutral-300 hover:text-white rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  id="btn-update-agent"
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md shadow-red-600/30 flex items-center space-x-1.5"
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
