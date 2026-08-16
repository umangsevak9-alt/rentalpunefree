import { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../../store/index.js';
import { 
  Home, 
  Users, 
  Settings, 
  Building, 
  Phone, 
  CalendarDays, 
  LogOut, 
  Menu, 
  Image, 
  Building2, 
  MessageSquareQuote,
  FileText,
  HelpCircle,
  X
} from 'lucide-react';

export default function AdminLayout() {
  const { user, logout, settings } = useAppStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = user?.role === 'AGENT' ? [
    { name: 'Dashboard', path: '/admin', icon: Home },
    { name: 'My Visits', path: '/admin/visits', icon: CalendarDays },
    { name: 'My Feedback', path: '/admin/feedback', icon: MessageSquareQuote },
  ] : [
    { name: 'Dashboard', path: '/admin', icon: Home },
    { name: 'Owner Listings', path: '/admin/owner-submissions', icon: Building2 },
    { name: 'Invoices (₹)', path: '/admin/invoices', icon: FileText },
    { name: 'Agent Feedback', path: '/admin/feedback', icon: MessageSquareQuote },
    { name: 'Site Visits', path: '/admin/visits', icon: CalendarDays },
    { name: 'Properties', path: '/admin/properties', icon: Building },
    { name: 'Property FAQs', path: '/admin/faqs', icon: HelpCircle },
    { name: 'Leads', path: '/admin/leads', icon: Phone },
    { name: 'Agents', path: '/admin/agents', icon: Users },
    { name: 'Hero Section', path: '/admin/hero', icon: Image },
    { name: 'Settings', path: '/admin/settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-[#080f1a] text-white font-sans selection:bg-[#d4a359] selection:text-[#080f1a]">
      <aside className="w-64 bg-[#050a12] border-r border-white/10 hidden md:flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-white/10 space-x-3">
          {settings.logo_url ? (
            <img src={settings.logo_url} alt="Logo" className="h-7 w-auto object-contain" />
          ) : (
            <div className="w-7 h-7 rounded-lg bg-[#d4a359] flex items-center justify-center shadow-sm">
              <Building2 className="w-4 h-4 text-[#080f1a]" />
            </div>
          )}
          <span className="font-serif font-bold text-base tracking-tight text-white">Rental Pune CRM</span>
        </div>
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1.5 px-3">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <li key={item.name}>
                  <Link
                    to={item.path}
                    className={`flex items-center px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                      isActive 
                        ? 'bg-[#d4a359] text-[#080f1a] shadow-lg shadow-[#d4a359]/20 font-black' 
                        : 'text-neutral-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <item.icon className={`w-5 h-5 mr-3 flex-shrink-0 ${isActive ? 'text-[#080f1a]' : 'text-[#d4a359]'}`} />
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="p-4 border-t border-white/10 bg-[#03060c]">
          <div className="flex items-center space-x-3 mb-4 px-2">
            <div className="w-9 h-9 rounded-xl bg-[#d4a359] flex items-center justify-center text-[#080f1a] font-serif font-extrabold uppercase shadow-sm">
              {user?.name?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{user?.name}</p>
              <p className="text-xs text-[#d4a359] font-semibold truncate">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-3.5 py-2.5 text-sm font-bold text-neutral-300 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
          >
            <LogOut className="w-5 h-5 mr-3 flex-shrink-0" />
            Sign Out
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#080f1a]">
        <header className="h-16 bg-[#050a12] border-b border-white/10 flex items-center justify-between px-4 sm:px-6 md:hidden">
          <div className="flex items-center space-x-2">
            {settings.logo_url ? (
              <img src={settings.logo_url} alt="Logo" className="h-6 w-auto" />
            ) : (
              <div className="w-6 h-6 rounded bg-[#d4a359] flex items-center justify-center">
                <Building2 className="w-3.5 h-3.5 text-[#080f1a]" />
              </div>
            )}
            <span className="font-serif font-bold text-base text-white">Rental Pune</span>
          </div>
          <button 
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 -mr-2 text-neutral-300 hover:text-white"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </header>

        {/* Mobile Navigation Dropdown */}
        {mobileOpen && (
          <div className="md:hidden bg-[#050a12] border-b border-white/10 p-4 space-y-2 z-40">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    isActive 
                      ? 'bg-[#d4a359] text-[#080f1a] shadow-lg shadow-[#d4a359]/20 font-black' 
                      : 'text-neutral-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <item.icon className={`w-5 h-5 mr-3 flex-shrink-0 ${isActive ? 'text-[#080f1a]' : 'text-[#d4a359]'}`} />
                  {item.name}
                </Link>
              );
            })}
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-3.5 py-2.5 text-sm font-bold text-neutral-300 hover:text-white rounded-xl hover:bg-white/10 transition-colors pt-2 border-t border-white/10"
            >
              <LogOut className="w-5 h-5 mr-3 flex-shrink-0" />
              Sign Out
            </button>
          </div>
        )}

        <div className="flex-1 overflow-auto p-4 sm:p-6 md:p-8 bg-[#080f1a]">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
