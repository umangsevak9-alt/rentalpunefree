import { Outlet, Link } from 'react-router-dom';
import { useAppStore } from '../../store/index.js';
import { Phone, MessageCircle, Building2 } from 'lucide-react';
import { getWhatsAppUrl } from '../../utils/whatsapp.js';

export default function PublicLayout() {
  const { settings } = useAppStore();
  const phone = settings.phone || '+91 98765 43210';
  const cleanPhone = phone.replace(/[^0-9+]/g, '');
  const whatsAppUrl = getWhatsAppUrl(settings);

  return (
    <div className="min-h-screen bg-[#080f1a] font-sans text-white flex flex-col selection:bg-[#d4a359] selection:text-[#080f1a]">
      {/* Top Navbar */}
      <header className="fixed top-0 inset-x-0 bg-[#080f1a]/85 backdrop-blur-md z-50 border-b border-white/10 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Brand Logo matching the reference "RENTAL PUNE" */}
          <Link to="/" className="flex items-center space-x-3 group">
            {settings.logo_url ? (
              <img src={settings.logo_url} alt="Rental Pune" className="h-10 w-auto object-contain" />
            ) : (
              <div className="flex flex-col items-center">
                <div className="flex items-center space-x-1">
                  <div className="relative">
                    {/* Architectural roof accent above R */}
                    <svg className="w-5 h-3 text-[#d4a359] mx-auto mb-0.5" viewBox="0 0 24 14" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M2 12L12 2L22 12" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M12 2V12" strokeLinecap="round"/>
                    </svg>
                  </div>
                </div>
                <div className="flex items-baseline tracking-wider">
                  <span className="font-serif text-2xl font-bold tracking-wider text-[#d4a359]">R</span>
                  <span className="font-serif text-xl font-bold tracking-widest text-[#d4a359]">ENTAL</span>
                </div>
                <div className="flex items-center space-x-2 w-full mt-[-2px]">
                  <div className="h-[1px] bg-[#d4a359]/60 flex-1"></div>
                  <span className="text-[9px] font-bold tracking-[0.25em] text-[#d4a359] uppercase">P U N E</span>
                  <div className="h-[1px] bg-[#d4a359]/60 flex-1"></div>
                </div>
              </div>
            )}
          </Link>

          {/* Center Nav Links */}
          <nav className="hidden lg:flex items-center space-x-6">
            <Link to="/#properties" className="text-sm font-semibold text-neutral-300 hover:text-[#d4a359] transition-colors">Properties</Link>
            <Link to="/list-property" className="text-sm font-bold text-[#d4a359] hover:text-[#e5b364] transition-colors flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#d4a359]/10 border border-[#d4a359]/30">
              <Building2 className="w-3.5 h-3.5" />
              <span>List Your Property</span>
            </Link>
            <Link to="/#faqs" className="text-sm font-semibold text-neutral-300 hover:text-[#d4a359] transition-colors">FAQs</Link>
            <Link to="/#why-us" className="text-sm font-semibold text-neutral-300 hover:text-[#d4a359] transition-colors">Why Choose Us</Link>
            <Link to="/#about" className="text-sm font-semibold text-neutral-300 hover:text-[#d4a359] transition-colors">About Pune</Link>
          </nav>

          {/* Right Contact Info & Button */}
          <div className="flex items-center space-x-3 sm:space-x-5">
            {/* Phone with gold icon */}
            <a 
              href={`tel:${cleanPhone}`} 
              className="hidden sm:flex items-center space-x-2 text-sm font-semibold text-white hover:text-[#d4a359] transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-[#d4a359]/15 border border-[#d4a359]/30 flex items-center justify-center">
                <Phone className="w-4 h-4 text-[#d4a359]" />
              </div>
              <span className="tracking-wide font-medium">{phone}</span>
            </a>

            {/* Gold WHATSAPP Button fetching WhatsApp URL from Admin Settings */}
            <a 
              href={whatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center space-x-2 px-4 sm:px-5 py-2.5 text-xs sm:text-sm font-bold uppercase tracking-wider text-[#080f1a] bg-[#d4a359] hover:bg-[#e5b364] active:scale-95 rounded-lg shadow-md shadow-[#d4a359]/20 transition-all cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 text-[#080f1a]" />
              <span>WHATSAPP</span>
            </a>
          </div>

        </div>
      </header>

      {/* Main Page Body */}
      <main className="flex-1 pt-20">
        <Outlet />
      </main>

      {/* Floating WhatsApp Quick Action Button - Full Real WhatsApp Icon */}
      <div className="fixed bottom-6 right-6 z-50 flex items-center">
        <a
          id="floating-whatsapp-icon"
          href={whatsAppUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat on WhatsApp"
          className="block transition-all duration-300 hover:scale-110 active:scale-95 drop-shadow-2xl"
        >
          <svg
            className="w-14 h-14 sm:w-16 sm:h-16"
            viewBox="0 0 60 60"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* WhatsApp Green Background Circle */}
            <circle cx="30" cy="30" r="28" fill="#25D366" />
            
            {/* Soft border ring */}
            <circle cx="30" cy="30" r="28" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />

            {/* Official WhatsApp Handset & Speech Bubble Symbol */}
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M30 13C20.611 13 13 20.611 13 30C13 33.313 13.942 36.411 15.57 39.039L13.9 46.1L21.299 44.452C23.86 45.986 26.83 46.88 30 46.88C39.389 46.88 47 39.269 47 30C47 20.611 39.389 13 30 13ZM25.024 20.706C24.68 19.946 24.316 19.931 23.99 19.916C23.723 19.905 23.415 19.906 23.109 19.906C22.803 19.906 22.305 20.021 21.884 20.48C21.463 20.939 20.277 22.049 20.277 24.306C20.277 26.564 21.922 28.744 22.152 29.05C22.381 29.356 25.328 34.137 29.979 36.013C33.843 37.571 34.629 37.261 35.47 37.185C36.312 37.108 38.187 36.075 38.569 35.004C38.952 33.932 38.952 33.014 38.837 32.823C38.722 32.632 38.416 32.517 37.957 32.287C37.498 32.058 35.24 30.948 34.819 30.795C34.398 30.642 34.092 30.566 33.786 31.025C33.48 31.484 32.6 32.517 32.332 32.823C32.064 33.129 31.796 33.167 31.337 32.938C30.878 32.708 29.4 32.224 27.647 30.662C26.283 29.446 25.362 27.945 25.094 27.486C24.826 27.027 25.066 26.778 25.296 26.549C25.502 26.343 25.756 26.012 25.985 25.744C26.215 25.476 26.291 25.285 26.444 24.979C26.597 24.673 26.521 24.405 26.406 24.175C26.291 23.946 25.419 21.583 25.024 20.706Z"
              fill="white"
            />
          </svg>
        </a>
      </div>

      {/* Footer in Deep Midnight Navy */}
      <footer className="bg-[#050a12] text-white py-16 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="md:col-span-2">
            <div className="mb-4">
              <div className="flex items-baseline tracking-wider">
                <span className="font-serif text-2xl font-bold tracking-wider text-[#d4a359]">R</span>
                <span className="font-serif text-xl font-bold tracking-widest text-[#d4a359]">ENTAL</span>
              </div>
              <div className="flex items-center space-x-2 w-32 mt-[-2px]">
                <div className="h-[1px] bg-[#d4a359]/60 flex-1"></div>
                <span className="text-[9px] font-bold tracking-[0.25em] text-[#d4a359] uppercase">P U N E</span>
                <div className="h-[1px] bg-[#d4a359]/60 flex-1"></div>
              </div>
            </div>
            <p className="text-neutral-400 text-sm leading-relaxed max-w-sm">
              Pune's premier residential & luxury rental agency. Delivering verified premium apartments, penthouses, and modern residences in prime localities.
            </p>
            <div className="mt-4">
              <a
                href={whatsAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-2 text-xs font-bold text-[#d4a359] hover:text-[#e5b364] transition-colors"
              >
                <MessageCircle className="w-4 h-4 text-emerald-400" />
                <span>Instant WhatsApp Inquiries: {settings.whatsapp_number || phone}</span>
              </a>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold uppercase tracking-widest mb-4 text-[#d4a359]">Prime Locations</h3>
            <ul className="space-y-2 text-sm text-neutral-300">
              <li>Baner & Balewadi High Street</li>
              <li>Kothrud & Bavdhan</li>
              <li>Viman Nagar & Kalyani Nagar</li>
              <li>Hinjewadi IT Hub Phase 1 & 2</li>
              <li>Koregaon Park & Camp</li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-bold uppercase tracking-widest mb-4 text-[#d4a359]">Get In Touch</h3>
            <ul className="space-y-2 text-sm text-neutral-300">
              <li>{phone}</li>
              <li>{settings.email || 'contact@rentalpune.com'}</li>
              <li>{settings.address || 'Prime Business Tower, Senapati Bapat Road, Pune'}</li>
            </ul>
            <div className="mt-6 flex flex-wrap gap-2">
              <Link 
                to="/list-property" 
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#d4a359] text-[#080f1a] text-xs font-bold hover:bg-[#e5b364] transition-all shadow-md"
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>List Property</span>
              </Link>
              <a 
                href={whatsAppUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600/20 border border-emerald-500/30 text-xs font-semibold text-emerald-300 hover:bg-emerald-600/30 transition-all"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>WhatsApp Us</span>
              </a>
              <Link 
                to="/login" 
                className="inline-block px-3.5 py-2 rounded-lg bg-white/5 border border-white/15 text-xs font-semibold text-neutral-300 hover:text-white hover:bg-white/10 hover:border-[#d4a359] transition-all"
              >
                Admin Portal →
              </Link>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-500">
          <p>© {new Date().getFullYear()} Rental Pune. All rights reserved.</p>
          <p className="mt-2 sm:mt-0">Crafted for Luxury Real Estate in Pune, Maharashtra.</p>
        </div>
      </footer>
    </div>
  );
}
