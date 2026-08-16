import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/index.js';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { setAuth } = useAppStore();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }
      
      setAuth(data.user, data.token);
      navigate('/admin');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#080f1a] flex items-center justify-center p-4 selection:bg-[#d4a359] selection:text-[#080f1a]">
      <div className="bg-[#0e1726] rounded-3xl shadow-2xl p-8 w-full max-w-md border border-white/15 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#d4a359]/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="text-center mb-8 relative z-10">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#d4a359] text-[#080f1a] shadow-lg shadow-[#d4a359]/25 mb-3 font-serif font-black text-xl">
            R
          </div>
          <h1 className="text-2xl font-bold font-serif text-white">Rental Pune Portal</h1>
          <p className="text-xs text-[#d4a359] mt-1 font-medium">Real Estate Management & CRM</p>
        </div>
        
        {error && (
          <div className="mb-4 p-3 bg-red-500/15 border border-red-500/30 text-red-300 rounded-xl text-xs font-semibold">
            {error}
          </div>
        )}
        
        <form onSubmit={handleLogin} className="space-y-4 relative z-10">
          <div>
            <label className="block text-xs font-bold text-neutral-300 mb-1.5 uppercase tracking-wider">Email Address</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#080f1a] border border-white/15 text-white placeholder-neutral-500 rounded-xl focus:outline-none focus:border-[#d4a359] text-sm"
              placeholder="admin@admin.com"
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
            className="w-full py-3.5 px-4 bg-[#d4a359] hover:bg-[#e5b364] text-[#080f1a] rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-[#d4a359]/20 cursor-pointer mt-2"
          >
            Sign In to Dashboard
          </button>
        </form>
        
        <div className="mt-6 text-center text-xs text-neutral-300 bg-[#080f1a] p-3 rounded-xl border border-white/10 flex flex-col items-center">
          <p className="text-[#d4a359] font-medium">Default Admin Credentials:</p>
          <p className="text-neutral-300 font-mono mt-0.5 text-xs">admin@admin.com / admin123</p>
          <button
            type="button"
            onClick={() => {
              setEmail('admin@admin.com');
              setPassword('admin123');
            }}
            className="mt-2 text-[11px] font-semibold text-[#d4a359] hover:underline cursor-pointer bg-[#d4a359]/10 px-2.5 py-1 rounded-md border border-[#d4a359]/20"
          >
            Auto-fill Credentials
          </button>
        </div>
      </div>
    </div>
  );
}
