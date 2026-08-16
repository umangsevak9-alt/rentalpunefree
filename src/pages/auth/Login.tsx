import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/index.js';
import { supabaseService } from '../../services/supabaseService.js';
import { ShieldCheck, UserPlus, KeyRound, Sparkles, AlertCircle } from 'lucide-react';

export default function Login() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('Administrator');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAppStore();
  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);
    
    try {
      if (mode === 'signin') {
        const result = await supabaseService.auth.login(email, password);
        
        if (!result.success || !result.user || !result.token) {
          throw new Error(result.error || 'Login failed. Please check your credentials or create an admin account below.');
        }
        
        setAuth(result.user, result.token);
        navigate('/admin');
      } else {
        const result = await supabaseService.auth.signUp(email, password, name, 'MAIN_ADMIN');
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to create user in Supabase Auth');
        }

        if (result.user && result.token) {
          setAuth(result.user, result.token);
          navigate('/admin');
        } else {
          setSuccessMsg(result.error || 'Admin account created successfully in Supabase! You can now sign in.');
          setMode('signin');
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080f1a] flex items-center justify-center p-4 selection:bg-[#d4a359] selection:text-[#080f1a]">
      <div className="bg-[#0e1726] rounded-3xl shadow-2xl p-8 w-full max-w-md border border-white/15 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#d4a359]/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="text-center mb-6 relative z-10">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#d4a359] text-[#080f1a] shadow-lg shadow-[#d4a359]/25 mb-3 font-serif font-black text-xl">
            R
          </div>
          <h1 className="text-2xl font-bold font-serif text-white">Rental Pune Portal</h1>
          <p className="text-xs text-[#d4a359] mt-1 font-medium">Supabase-Authenticated Admin CRM</p>
        </div>

        {/* Tab switch */}
        <div className="flex bg-[#080f1a] p-1 rounded-xl border border-white/10 mb-6 relative z-10">
          <button
            type="button"
            onClick={() => { setMode('signin'); setError(''); setSuccessMsg(''); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              mode === 'signin' ? 'bg-[#d4a359] text-[#080f1a] shadow-sm' : 'text-neutral-400 hover:text-white'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
          <button
            type="button"
            onClick={() => { setMode('signup'); setError(''); setSuccessMsg(''); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              mode === 'signup' ? 'bg-[#d4a359] text-[#080f1a] shadow-sm' : 'text-neutral-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Create Admin User</span>
          </button>
        </div>
        
        {error && (
          <div className="mb-4 p-3 bg-red-500/15 border border-red-500/30 text-red-300 rounded-xl text-xs font-semibold flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs font-semibold flex items-start gap-2">
            <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}
        
        <form onSubmit={handleAuth} className="space-y-4 relative z-10">
          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-bold text-neutral-300 mb-1.5 uppercase tracking-wider">Admin Full Name</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#080f1a] border border-white/15 text-white placeholder-neutral-500 rounded-xl focus:outline-none focus:border-[#d4a359] text-sm"
                placeholder="e.g. Administrator"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-neutral-300 mb-1.5 uppercase tracking-wider">Email Address</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#080f1a] border border-white/15 text-white placeholder-neutral-500 rounded-xl focus:outline-none focus:border-[#d4a359] text-sm"
              placeholder="admin@rentalpune.com"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-300 mb-1.5 uppercase tracking-wider">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#080f1a] border border-white/15 text-white placeholder-neutral-500 rounded-xl focus:outline-none focus:border-[#d4a359] text-sm"
              placeholder="••••••••"
              required
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-[#d4a359] hover:bg-[#e5b364] text-[#080f1a] rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-[#d4a359]/20 cursor-pointer mt-2 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <span>Authenticating with Supabase...</span>
            ) : mode === 'signin' ? (
              <>
                <KeyRound className="w-4 h-4" />
                <span>Sign In with Supabase</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Register Supabase Admin</span>
              </>
            )}
          </button>
        </form>
        
        <div className="mt-6 text-center text-xs text-neutral-300 bg-[#080f1a] p-3 rounded-xl border border-white/10 flex flex-col items-center">
          <p className="text-[#d4a359] font-medium">Supabase Auth Integrated:</p>
          <p className="text-neutral-400 text-[11px] mt-1 text-center">
            Secured directly via Supabase Auth with Row Level Security (RLS) policies.
          </p>
        </div>
      </div>
    </div>
  );
}
