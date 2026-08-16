import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../../store/index.js';
import { 
  supabaseService, 
  supabaseUrl, 
  supabaseAnonKey, 
  updateSupabaseCredentials, 
  resetSupabaseCredentials 
} from '../../services/supabaseService.js';
import { ShieldCheck, UserPlus, KeyRound, Sparkles, AlertCircle, Settings as SettingsIcon, CheckCircle2, RotateCcw, ExternalLink, Mail, Key, ArrowRight } from 'lucide-react';

export default function Login() {
  const [mode, setMode] = useState<'signin' | 'otp' | 'signup'>('signin');
  const [name, setName] = useState('Administrator');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpNotice, setOtpNotice] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Custom Supabase configuration modal
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [inputUrl, setInputUrl] = useState(supabaseUrl || '');
  const [inputKey, setInputKey] = useState(supabaseAnonKey || '');
  const [configMsg, setConfigMsg] = useState('');

  const { user, session, isAuthLoading, setAuth } = useAppStore();
  const navigate = useNavigate();
  const location = useLocation();

  // If already authenticated with a valid Supabase session, redirect directly to /admin
  useEffect(() => {
    if (!isAuthLoading && session && user) {
      const destination = (location.state as any)?.from?.pathname || '/admin';
      navigate(destination, { replace: true });
    }
  }, [session, user, isAuthLoading, navigate, location]);

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl.trim() || !inputKey.trim()) {
      setConfigMsg('Please enter both Supabase Project URL and Anon Key');
      return;
    }
    updateSupabaseCredentials(inputUrl.trim(), inputKey.trim());
    setConfigMsg('Configuration saved! Reconnecting...');
    setTimeout(() => {
      setShowConfigModal(false);
      setConfigMsg('');
      setError('');
    }, 800);
  };

  const handleResetConfig = () => {
    resetSupabaseCredentials();
    setInputUrl(supabaseUrl);
    setInputKey(supabaseAnonKey);
    setConfigMsg('Reset to default project credentials.');
    setTimeout(() => setConfigMsg(''), 1500);
  };

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your email address first.');
      return;
    }
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const res = await supabaseService.auth.sendOtp(email.trim());
      if (!res.success) {
        throw new Error(res.error || 'Failed to send OTP code');
      }
      setOtpSent(true);
      if (res.otpCode) {
        setOtpNotice(`OTP code: ${res.otpCode} (Valid for 10 mins)`);
        setSuccessMsg(`OTP code generated! You can enter ${res.otpCode} to sign in.`);
      } else {
        setSuccessMsg(res.message || 'OTP verification code sent! Please check your email.');
      }
    } catch (err: any) {
      setError(err?.message || 'Error requesting OTP verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim()) {
      setError('Please enter the 6-digit verification code.');
      return;
    }
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const res = await supabaseService.auth.verifyOtp(email.trim(), otpCode.trim());
      if (!res.success || !res.user) {
        throw new Error(res.error || 'OTP verification failed. Please try again.');
      }

      setAuth(res.user, res.token || null, res.session || null);
      const destination = (location.state as any)?.from?.pathname || '/admin';
      navigate(destination, { replace: true });
    } catch (err: any) {
      setError(err?.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);
    
    try {
      if (mode === 'signin') {
        const result = await supabaseService.auth.login(email, password);
        
        if (!result.success || !result.user) {
          const errMsg = result.error || 'Login failed. Please check your credentials.';
          if (errMsg.toLowerCase().includes('api key') || errMsg.toLowerCase().includes('invalid')) {
            setShowConfigModal(true);
          }
          throw new Error(errMsg);
        }
        
        // Update auth state with verified Supabase session
        setAuth(result.user, result.token || null, result.session || null);
        
        // Immediate clean navigation to /admin
        const destination = (location.state as any)?.from?.pathname || '/admin';
        navigate(destination, { replace: true });
      } else if (mode === 'signup') {
        const result = await supabaseService.auth.signUp(email, password, name, 'MAIN_ADMIN');
        
        if (!result.success) {
          const errMsg = result.error || 'Failed to create user in Supabase Auth';
          if (errMsg.toLowerCase().includes('api key') || errMsg.toLowerCase().includes('invalid')) {
            setShowConfigModal(true);
          }
          throw new Error(errMsg);
        }

        if (result.user && result.session) {
          setAuth(result.user, result.token || null, result.session);
          navigate('/admin', { replace: true });
        } else {
          setSuccessMsg(result.error || 'Admin account created successfully in Supabase! You can now sign in or use OTP login.');
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
            onClick={() => { setMode('signin'); setError(''); setSuccessMsg(''); setOtpSent(false); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              mode === 'signin' ? 'bg-[#d4a359] text-[#080f1a] shadow-sm' : 'text-neutral-400 hover:text-white'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Password</span>
          </button>
          <button
            type="button"
            onClick={() => { setMode('otp'); setError(''); setSuccessMsg(''); setOtpSent(false); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              mode === 'otp' ? 'bg-[#d4a359] text-[#080f1a] shadow-sm' : 'text-neutral-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>OTP Login</span>
          </button>
          <button
            type="button"
            onClick={() => { setMode('signup'); setError(''); setSuccessMsg(''); setOtpSent(false); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              mode === 'signup' ? 'bg-[#d4a359] text-[#080f1a] shadow-sm' : 'text-neutral-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Register</span>
          </button>
        </div>
        
        {error && (
          <div className="mb-4 p-3.5 bg-red-500/15 border border-red-500/30 text-red-300 rounded-xl text-xs font-semibold flex flex-col gap-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
            {/* If email not confirmed or login failed, offer 1-click OTP bypass */}
            {mode === 'signin' && (
              <button
                type="button"
                onClick={() => {
                  setMode('otp');
                  handleSendOtp();
                }}
                className="self-start px-3 py-1.5 bg-[#d4a359]/20 hover:bg-[#d4a359]/30 text-[#d4a359] rounded-lg text-[11px] font-bold border border-[#d4a359]/40 transition-colors flex items-center gap-1.5 cursor-pointer mt-1"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Log In with OTP Code Instead</span>
              </button>
            )}
            {(error.toLowerCase().includes('api key') || error.toLowerCase().includes('invalid')) && (
              <button
                type="button"
                onClick={() => setShowConfigModal(true)}
                className="self-start px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-white rounded-lg text-[11px] font-bold border border-red-500/40 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <SettingsIcon className="w-3.5 h-3.5" />
                <span>Fix Supabase Project Keys</span>
              </button>
            )}
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs font-semibold flex items-start gap-2">
            <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* OTP LOGIN FORM */}
        {mode === 'otp' ? (
          <div className="space-y-4 relative z-10">
            <div>
              <label className="block text-xs font-bold text-neutral-300 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#d4a359]" />
                <span>Agent / Admin Email Address</span>
              </label>
              <div className="flex gap-2">
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 px-4 py-2.5 bg-[#080f1a] border border-white/15 text-white placeholder-neutral-500 rounded-xl focus:outline-none focus:border-[#d4a359] text-sm"
                  placeholder="agent@rentalpune.com"
                  required
                />
                <button
                  type="button"
                  onClick={() => handleSendOtp()}
                  disabled={loading || !email.trim()}
                  className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white border border-white/10 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1 whitespace-nowrap"
                >
                  <span>{otpSent ? 'Resend' : 'Get OTP'}</span>
                </button>
              </div>
            </div>

            {otpSent && (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-300 mb-1.5 uppercase tracking-wider flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-[#d4a359]" />
                      <span>Enter 6-Digit OTP Code</span>
                    </span>
                    {otpNotice && <span className="text-[10px] text-[#d4a359] font-mono">{otpNotice}</span>}
                  </label>
                  <input 
                    type="text" 
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    className="w-full px-4 py-3 bg-[#080f1a] border border-[#d4a359]/50 text-white placeholder-neutral-500 rounded-xl focus:outline-none focus:border-[#d4a359] text-center text-lg font-mono tracking-widest"
                    placeholder="123456"
                    autoFocus
                    required
                  />
                </div>

                <button 
                  type="submit"
                  disabled={loading || otpCode.length < 4}
                  className="w-full py-3.5 px-4 bg-[#d4a359] hover:bg-[#e5b364] text-[#080f1a] rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-[#d4a359]/20 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <span>Verifying OTP...</span>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Verify & Sign In</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {!otpSent && (
              <button 
                type="button"
                onClick={() => handleSendOtp()}
                disabled={loading || !email.trim()}
                className="w-full py-3.5 px-4 bg-[#d4a359] hover:bg-[#e5b364] text-[#080f1a] rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-[#d4a359]/20 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span>Generating OTP Code...</span>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Send Verification Code</span>
                  </>
                )}
              </button>
            )}
          </div>
        ) : (
          /* PASSWORD LOGIN & SIGNUP FORMS */
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
                  <span>Sign In with Password</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Register Supabase Admin</span>
                </>
              )}
            </button>
          </form>
        )}
        
        <div className="mt-6 text-center text-xs text-neutral-300 bg-[#080f1a] p-3 rounded-xl border border-white/10 flex flex-col items-center justify-between gap-2">
          <div className="flex items-center justify-between w-full">
            <span className="text-[#d4a359] font-medium text-[11px] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              Supabase Auth Connected
            </span>
            <button
              type="button"
              onClick={() => setShowConfigModal(!showConfigModal)}
              className="text-[11px] text-neutral-400 hover:text-white flex items-center gap-1 underline cursor-pointer"
            >
              <SettingsIcon className="w-3 h-3" />
              <span>Change Project Keys</span>
            </button>
          </div>
        </div>

        {/* Modal / Card for Custom Supabase URL & Anon Key */}
        {showConfigModal && (
          <div className="mt-4 p-4 bg-[#080f1a] rounded-2xl border border-[#d4a359]/40 space-y-3 relative z-20 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <SettingsIcon className="w-3.5 h-3.5 text-[#d4a359]" />
                <span>Supabase Project Settings</span>
              </span>
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="text-neutral-400 hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-[11px] text-neutral-400">
              Enter your active Supabase Project URL and Anon API key from your <a href="https://supabase.com/dashboard/project/_/settings/api" target="_blank" rel="noopener noreferrer" className="text-[#d4a359] underline inline-flex items-center gap-0.5">Supabase Dashboard Settings &gt; API <ExternalLink className="w-2.5 h-2.5 ml-0.5" /></a>.
            </p>

            <form onSubmit={handleSaveConfig} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-neutral-300 uppercase mb-1">Project URL</label>
                <input
                  type="text"
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  placeholder="https://xyzcompany.supabase.co"
                  className="w-full px-3 py-1.5 bg-[#0e1726] border border-white/15 text-white rounded-lg text-xs font-mono focus:outline-none focus:border-[#d4a359]"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-neutral-300 uppercase mb-1">Anon / Public API Key</label>
                <textarea
                  value={inputKey}
                  onChange={(e) => setInputKey(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  rows={2}
                  className="w-full px-3 py-1.5 bg-[#0e1726] border border-white/15 text-white rounded-lg text-xs font-mono focus:outline-none focus:border-[#d4a359]"
                  required
                />
              </div>

              {configMsg && (
                <p className="text-[11px] text-[#d4a359] font-medium animate-pulse">{configMsg}</p>
              )}

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleResetConfig}
                  className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white rounded-lg text-[11px] font-medium flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Default</span>
                </button>

                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#d4a359] hover:bg-[#e5b364] text-[#080f1a] rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Apply Keys</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
