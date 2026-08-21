import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/index.js';
import { 
  Phone, 
  MessageCircle, 
  Building2, 
  Send, 
  Mail, 
  MapPin, 
  ArrowUpRight,
  Clock,
  Menu,
  X,
  Sparkles,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { getWhatsAppUrl } from '../../utils/whatsapp.js';

export default function PublicLayout() {
  const { settings } = useAppStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isContactHighlighted, setIsContactHighlighted] = useState(false);

  const phone = settings.phone || '+91 98220 12345';
  const phoneSecondary = settings.phone_secondary;
  const phoneTagline = settings.phone_tagline || 'Direct Advisor Connect';
  const cleanPhone = phone.replace(/[^0-9+]/g, '');
  const whatsAppUrl = getWhatsAppUrl(settings);
  const address = settings.address || 'Balewadi High Street, Near Baner';
  const officeCity = settings.office_city || 'Pune, Maharashtra - 411045, India';
  const email = settings.email || 'concierge@rentalpune.com';
  const emailTagline = settings.email_tagline || 'Fast 2-hour response time';
  const workingHours = settings.working_hours || 'Mon - Sun: 9:00 AM – 8:30 PM';
  const workingDaysNote = settings.working_days_note || 'Site visits open all 7 days';
  const deskStatus = settings.desk_status || 'Desk Active (9 AM - 8:30 PM)';
  const contactHeading = settings.contact_heading || 'Reach Out to Our Luxury Real Estate Advisors';
  const contactSubtitle = settings.contact_subtitle || 'Have questions about residential leases, high-end commercial spaces, society guidelines, or scheduling private site visits? Contact our Pune head office directly.';

  // Smooth scroll handler for in-page anchors
  const handleScrollToSection = (targetId: string, e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    setIsMobileMenuOpen(false);

    if (location.pathname === '/') {
      if (targetId === 'top') {
        window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
        window.history.pushState(null, '', '/');
      } else {
        const target = document.getElementById(targetId);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          window.history.pushState(null, '', `#${targetId}`);
          if (targetId === 'contact' || targetId === 'contact-info') {
            setIsContactHighlighted(true);
            setTimeout(() => setIsContactHighlighted(false), 2500);
          }
        }
      }
    } else {
      navigate(targetId === 'top' ? '/' : `/#${targetId}`);
    }
  };

  const handleScrollToContact = (e?: React.MouseEvent) => {
    handleScrollToSection('contact', e);
  };

  return (
    <div className="min-h-screen bg-white font-sans text-[#1a202c] flex flex-col selection:bg-[#b8863b] selection:text-white">
      {/* Top Luxury Navbar */}
      <header className="fixed top-0 inset-x-0 bg-white/95 backdrop-blur-md z-50 border-b border-[#ece7dc] shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Brand Logo matching the reference "LAVISH / RENTAL PUNE" */}
          <Link to="/" className="flex items-center space-x-3 group">
            {settings.logo_url ? (
              <img src={settings.logo_url} alt="Rental Pune" className="h-10 w-auto object-contain" />
            ) : (
              <div className="flex items-center space-x-2.5">
                {/* Architectural Building Icon in Gold */}
                <div className="w-9 h-9 rounded-lg bg-[#b8863b]/10 border border-[#b8863b]/30 flex items-center justify-center text-[#b8863b]">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4M9 9h1M9 13h1M9 17h1M15 13h1M15 17h1" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="flex flex-col">
                  <div className="flex items-baseline tracking-wider">
                    <span className="font-serif text-xl font-bold tracking-widest text-[#1a202c]">RENTAL</span>
                    <span className="font-serif text-xl font-bold tracking-widest text-[#b8863b] ml-1">PUNE</span>
                  </div>
                  <span className="text-[8.5px] font-bold tracking-[0.28em] text-[#b8863b] uppercase">LUXURY LIVING</span>
                </div>
              </div>
            )}
          </Link>

          {/* Center Nav Links - Uppercase tracking as in reference */}
          <nav className="hidden lg:flex items-center space-x-7">
            <button 
              type="button"
              onClick={(e) => handleScrollToSection('top', e)}
              className={`text-xs font-bold uppercase tracking-wider transition-colors relative py-2 cursor-pointer ${
                location.pathname === '/' && !location.hash ? 'text-[#b8863b]' : 'text-[#1a202c] hover:text-[#b8863b]'
              }`}
            >
              <span>HOME</span>
              {location.pathname === '/' && !location.hash && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#b8863b] rounded-full"></span>
              )}
            </button>

            {/* ABOUT US -> Scrolls to About Project Section */}
            <button 
              type="button"
              onClick={(e) => handleScrollToSection('about-project', e)}
              className="text-xs font-bold uppercase tracking-wider text-[#1a202c] hover:text-[#b8863b] transition-colors cursor-pointer"
            >
              ABOUT US
            </button>

            <button 
              type="button"
              onClick={(e) => handleScrollToSection('amenities', e)}
              className="text-xs font-bold uppercase tracking-wider text-[#1a202c] hover:text-[#b8863b] transition-colors cursor-pointer"
            >
              AMENITIES
            </button>
            <button 
              type="button"
              onClick={(e) => handleScrollToSection('properties', e)}
              className="text-xs font-bold uppercase tracking-wider text-[#1a202c] hover:text-[#b8863b] transition-colors cursor-pointer"
            >
              PROPERTIES
            </button>
            <button 
              type="button"
              onClick={(e) => handleScrollToSection('gallery', e)}
              className="text-xs font-bold uppercase tracking-wider text-[#1a202c] hover:text-[#b8863b] transition-colors cursor-pointer"
            >
              GALLERY
            </button>
            <button 
              type="button"
              onClick={(e) => handleScrollToSection('location', e)}
              className="text-xs font-bold uppercase tracking-wider text-[#1a202c] hover:text-[#b8863b] transition-colors cursor-pointer"
            >
              LOCATION
            </button>
            <Link 
              to="/list-property" 
              className={`text-xs font-bold uppercase tracking-wider transition-colors relative py-2 ${
                location.pathname === '/list-property' ? 'text-[#b8863b]' : 'text-[#1a202c] hover:text-[#b8863b]'
              }`}
            >
              <span>LIST PROPERTY</span>
              {location.pathname === '/list-property' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#b8863b] rounded-full"></span>
              )}
            </Link>

            {/* FAQS -> Scrolls to FAQs Section */}
            <button 
              type="button"
              onClick={(e) => handleScrollToSection('faqs', e)}
              className="text-xs font-bold uppercase tracking-wider text-[#1a202c] hover:text-[#b8863b] transition-colors cursor-pointer"
            >
              FAQS
            </button>
          </nav>

          {/* Right Gold "ENQUIRE NOW" Button & Mobile Toggle */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            <a 
              href={`tel:${cleanPhone}`} 
              className="hidden xl:flex items-center space-x-2 text-xs font-bold uppercase text-[#1a202c] hover:text-[#b8863b] transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-[#b8863b]/10 flex items-center justify-center text-[#b8863b]">
                <Phone className="w-3.5 h-3.5" />
              </div>
              <span>{phone}</span>
            </a>

            <a 
              href={whatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center justify-center space-x-2 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white bg-[#b8863b] hover:bg-[#a6752d] active:scale-95 rounded-lg shadow-sm shadow-[#b8863b]/20 transition-all cursor-pointer"
            >
              <Phone className="w-3.5 h-3.5 text-white" />
              <span>ENQUIRE NOW</span>
            </a>

            {/* Mobile Menu Toggle Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-neutral-700 hover:text-[#b8863b] hover:bg-neutral-100 transition-colors"
              aria-label="Toggle navigation menu"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>

        {/* Mobile Dropdown Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden bg-white border-b border-[#ece7dc] px-4 py-5 shadow-xl animate-in slide-in-from-top-2 duration-200">
            <nav className="flex flex-col space-y-3.5">
              <button 
                type="button"
                onClick={(e) => handleScrollToSection('top', e)}
                className="text-left text-sm font-bold uppercase tracking-wider text-neutral-800 hover:text-[#b8863b] py-1 border-b border-neutral-100 cursor-pointer"
              >
                HOME
              </button>
              <button 
                type="button"
                onClick={(e) => handleScrollToSection('about-project', e)}
                className="text-left text-sm font-bold uppercase tracking-wider text-neutral-800 hover:text-[#b8863b] py-1 border-b border-neutral-100 cursor-pointer flex items-center justify-between"
              >
                <span>ABOUT US</span>
                <span className="text-[10px] font-normal text-[#b8863b] bg-[#b8863b]/10 px-2 py-0.5 rounded">overview</span>
              </button>
              <button 
                type="button"
                onClick={(e) => handleScrollToSection('amenities', e)}
                className="text-left text-sm font-bold uppercase tracking-wider text-neutral-800 hover:text-[#b8863b] py-1 border-b border-neutral-100 cursor-pointer"
              >
                AMENITIES
              </button>
              <button 
                type="button"
                onClick={(e) => handleScrollToSection('properties', e)}
                className="text-left text-sm font-bold uppercase tracking-wider text-neutral-800 hover:text-[#b8863b] py-1 border-b border-neutral-100 cursor-pointer"
              >
                PROPERTIES
              </button>
              <button 
                type="button"
                onClick={(e) => handleScrollToSection('gallery', e)}
                className="text-left text-sm font-bold uppercase tracking-wider text-neutral-800 hover:text-[#b8863b] py-1 border-b border-neutral-100 cursor-pointer"
              >
                GALLERY
              </button>
              <button 
                type="button"
                onClick={(e) => handleScrollToSection('location', e)}
                className="text-left text-sm font-bold uppercase tracking-wider text-neutral-800 hover:text-[#b8863b] py-1 border-b border-neutral-100 cursor-pointer"
              >
                LOCATION
              </button>
              <Link 
                to="/list-property" 
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-sm font-bold uppercase tracking-wider text-neutral-800 hover:text-[#b8863b] py-1 border-b border-neutral-100"
              >
                LIST PROPERTY
              </Link>
              <button 
                type="button"
                onClick={(e) => handleScrollToSection('faqs', e)}
                className="text-left text-sm font-bold uppercase tracking-wider text-neutral-800 hover:text-[#b8863b] py-1 border-b border-neutral-100 cursor-pointer flex items-center justify-between"
              >
                <span>FAQS</span>
                <span className="text-[10px] font-normal text-[#b8863b] bg-[#b8863b]/10 px-2 py-0.5 rounded">inquiries</span>
              </button>
              
              <div className="pt-2 flex flex-col gap-2">
                <a 
                  href={`tel:${cleanPhone}`}
                  className="flex items-center justify-center space-x-2 py-2.5 rounded-lg bg-neutral-100 text-neutral-800 font-bold text-xs uppercase"
                >
                  <Phone className="w-3.5 h-3.5 text-[#b8863b]" />
                  <span>Call {phone}</span>
                </a>
                <a 
                  href={whatsAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center space-x-2 py-2.5 rounded-lg bg-[#b8863b] text-white font-bold text-xs uppercase shadow-sm"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp Luxury Desk</span>
                </a>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* Main Page Body */}
      <main className="flex-1 pt-20">
        <Outlet />
      </main>

      {/* Floating WhatsApp Quick Action Button */}
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
            <circle cx="30" cy="30" r="28" fill="#25D366" />
            <circle cx="30" cy="30" r="28" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M30 13C20.611 13 13 20.611 13 30C13 33.313 13.942 36.411 15.57 39.039L13.9 46.1L21.299 44.452C23.86 45.986 26.83 46.88 30 46.88C39.389 46.88 47 39.269 47 30C47 20.611 39.389 13 30 13ZM25.024 20.706C24.68 19.946 24.316 19.931 23.99 19.916C23.723 19.905 23.415 19.906 23.109 19.906C22.803 19.906 22.305 20.021 21.884 20.48C21.463 20.939 20.277 22.049 20.277 24.306C20.277 26.564 21.922 28.744 22.152 29.05C22.381 29.356 25.328 34.137 29.979 36.013C33.843 37.571 34.629 37.261 35.47 37.185C36.312 37.108 38.187 36.075 38.569 35.004C38.952 33.932 38.952 33.014 38.837 32.823C38.722 32.632 38.416 32.517 37.957 32.287C37.498 32.058 35.24 30.948 34.819 30.795C34.398 30.642 34.092 30.566 33.786 31.025C33.48 31.484 32.6 32.517 32.332 32.823C32.064 33.129 31.796 33.167 31.337 32.938C30.878 32.708 29.4 32.224 27.647 30.662C26.283 29.446 25.362 27.945 25.094 27.486C24.826 27.027 25.066 26.778 25.296 26.549C25.502 26.343 25.756 26.012 25.985 25.744C26.215 25.476 26.291 25.285 26.444 24.979C26.597 24.673 26.521 24.405 26.406 24.175C26.291 23.946 25.419 21.583 25.024 20.706Z"
            fill="white"
          />
        </svg>
      </a>
    </div>

      {/* Footer matching reference image (Crisp White with Gold Architecture Logo) */}
      <footer className="bg-[#faf8f5] text-[#1a202c] pt-14 pb-16 border-t border-[#ece7dc]">
        
        {/* DEDICATED CONTACT INFO SECTION & INQUIRIES DESK */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-14">
          <div 
            id="contact-info"
            className={`rounded-3xl p-6 sm:p-10 border transition-all duration-700 ${
              isContactHighlighted 
                ? 'bg-[#080f1a] text-white border-[#d4a359] shadow-2xl ring-4 ring-[#d4a359]/40 scale-[1.01]' 
                : 'bg-[#ffffff] text-[#1a202c] border-[#ece7dc] shadow-lg'
            }`}
          >
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 pb-8 border-b border-neutral-200/60 dark:border-white/10">
              <div>
                <div className="flex items-center space-x-2.5">
                  <span className="px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-widest bg-[#b8863b]/15 text-[#b8863b] border border-[#b8863b]/30">
                    CONTACT INFO & HEAD DESK
                  </span>
                  <div className="flex items-center text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
                    {deskStatus}
                  </div>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold font-serif mt-2.5 text-neutral-900 leading-tight">
                  {contactHeading}
                </h2>
                <p className="text-sm sm:text-base font-medium text-neutral-800 mt-2 max-w-2xl leading-relaxed">
                  {contactSubtitle}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <a 
                  href={`tel:${cleanPhone}`}
                  className="px-5 py-3 rounded-xl bg-[#080f1a] text-white hover:bg-neutral-800 font-bold text-xs uppercase tracking-wider transition-all flex items-center space-x-2 shadow-sm"
                >
                  <Phone className="w-4 h-4 text-[#d4a359]" />
                  <span>Call Direct</span>
                </a>
                <a 
                  href={whatsAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-3 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center space-x-2 shadow-sm"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>WhatsApp Desk</span>
                </a>
              </div>
            </div>

            {/* 4 Essential Contact Points Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 pt-8">
              
              {/* Office Address */}
              <div className="flex items-start space-x-3.5 p-5 rounded-2xl bg-white border-2 border-[#e8e2d5] shadow-sm hover:border-[#b8863b] transition-all">
                <div className="w-11 h-11 rounded-xl bg-[#b8863b]/15 text-[#a6752d] flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-extrabold uppercase tracking-wider text-[#a6752d]">Head Office</div>
                  <div className="text-sm font-bold text-neutral-900 mt-1 leading-snug">
                    {address}
                  </div>
                  <div className="text-xs text-neutral-600 font-medium mt-1.5">{officeCity}</div>
                </div>
              </div>

              {/* Phone Direct */}
              <div className="flex items-start space-x-3.5 p-5 rounded-2xl bg-white border-2 border-[#e8e2d5] shadow-sm hover:border-[#b8863b] transition-all">
                <div className="w-11 h-11 rounded-xl bg-[#b8863b]/15 text-[#a6752d] flex items-center justify-center flex-shrink-0">
                  <Phone className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-extrabold uppercase tracking-wider text-[#a6752d]">Phone Support</div>
                  <a 
                    href={`tel:${cleanPhone}`}
                    className="text-base font-extrabold text-neutral-900 hover:text-[#b8863b] mt-1 block transition-colors tracking-wide"
                  >
                    {phone}
                  </a>
                  {phoneSecondary && (
                    <a 
                      href={`tel:${phoneSecondary.replace(/[^0-9+]/g, '')}`}
                      className="text-xs text-neutral-600 hover:text-[#b8863b] font-medium block mt-0.5"
                    >
                      Alt: {phoneSecondary}
                    </a>
                  )}
                  <div className="text-xs text-emerald-700 font-semibold mt-1.5 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                    {phoneTagline}
                  </div>
                </div>
              </div>

              {/* Email Support */}
              <div className="flex items-start space-x-3.5 p-5 rounded-2xl bg-white border-2 border-[#e8e2d5] shadow-sm hover:border-[#b8863b] transition-all">
                <div className="w-11 h-11 rounded-xl bg-[#b8863b]/15 text-[#a6752d] flex items-center justify-center flex-shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-extrabold uppercase tracking-wider text-[#a6752d]">Email Inquiries</div>
                  <a 
                    href={`mailto:${email}`}
                    className="text-sm font-bold text-neutral-900 hover:text-[#b8863b] mt-1 block transition-colors break-all"
                  >
                    {email}
                  </a>
                  <div className="text-xs text-neutral-600 font-medium mt-1.5">{emailTagline}</div>
                </div>
              </div>

              {/* Operating Hours */}
              <div className="flex items-start space-x-3.5 p-5 rounded-2xl bg-white border-2 border-[#e8e2d5] shadow-sm hover:border-[#b8863b] transition-all">
                <div className="w-11 h-11 rounded-xl bg-[#b8863b]/15 text-[#a6752d] flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-extrabold uppercase tracking-wider text-[#a6752d]">Working Hours</div>
                  <div className="text-sm font-bold text-neutral-900 mt-1">
                    {workingHours}
                  </div>
                  <div className="text-xs text-neutral-600 font-medium mt-1.5">{workingDaysNote}</div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Standard Footer Columns */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          
          {/* Logo & Tagline */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-lg bg-[#b8863b]/15 border border-[#b8863b]/30 flex items-center justify-center text-[#b8863b]">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4M9 9h1M9 13h1M9 17h1M15 13h1M15 17h1" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="flex flex-col">
                <div className="flex items-baseline tracking-wider">
                  <span className="font-serif text-xl font-bold tracking-widest text-[#1a202c]">RENTAL</span>
                  <span className="font-serif text-xl font-bold tracking-widest text-[#b8863b] ml-1">PUNE</span>
                </div>
                <span className="text-[8.5px] font-bold tracking-[0.28em] text-[#b8863b] uppercase">LUXURY LIVING</span>
              </div>
            </div>

            <p className="text-neutral-600 text-xs leading-relaxed max-w-sm">
              Crafting spaces that reflect elegance, comfort and sophistication. Pune's premier real estate portal for residential rentals, commercial IT offices, and outright luxury residences.
            </p>

            {/* Social Icons */}
            <div className="flex items-center space-x-3 pt-2">
              <a href="#" className="w-8 h-8 rounded-full border border-[#ece7dc] flex items-center justify-center text-neutral-600 hover:text-[#b8863b] hover:border-[#b8863b] transition-colors" title="Facebook">
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              </a>
              <a href="#" className="w-8 h-8 rounded-full border border-[#ece7dc] flex items-center justify-center text-neutral-600 hover:text-[#b8863b] hover:border-[#b8863b] transition-colors" title="Instagram">
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
              </a>
              <a href="#" className="w-8 h-8 rounded-full border border-[#ece7dc] flex items-center justify-center text-neutral-600 hover:text-[#b8863b] hover:border-[#b8863b] transition-colors" title="YouTube">
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
              </a>
              <a href="#" className="w-8 h-8 rounded-full border border-[#ece7dc] flex items-center justify-center text-neutral-600 hover:text-[#b8863b] hover:border-[#b8863b] transition-colors" title="LinkedIn">
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider mb-4 text-[#1a202c]">Quick Links</h3>
            <ul className="space-y-2.5 text-xs text-neutral-600">
              <li><Link to="/" className="hover:text-[#b8863b] transition-colors">Home</Link></li>
              <li>
                <a 
                  href="/#contact-info" 
                  onClick={handleScrollToContact}
                  className="hover:text-[#b8863b] transition-colors cursor-pointer"
                >
                  About Us (Contact Info)
                </a>
              </li>
              <li><a href="/#amenities" className="hover:text-[#b8863b] transition-colors">Amenities</a></li>
              <li><a href="/#properties" className="hover:text-[#b8863b] transition-colors">Floor Plans & Units</a></li>
              <li><a href="/#gallery" className="hover:text-[#b8863b] transition-colors">Gallery</a></li>
              <li><a href="/#location" className="hover:text-[#b8863b] transition-colors">Location</a></li>
              <li><Link to="/list-property" className="hover:text-[#b8863b] transition-colors">Owner Listing Portal</Link></li>
            </ul>
          </div>

          {/* Project Portfolio */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider mb-4 text-[#1a202c]">Categories</h3>
            <ul className="space-y-2.5 text-xs text-neutral-600">
              <li><a href="/#properties" className="hover:text-[#b8863b] transition-colors">Rent (Residential)</a></li>
              <li><a href="/#properties" className="hover:text-[#b8863b] transition-colors">Commercial IT Offices</a></li>
              <li><a href="/#properties" className="hover:text-[#b8863b] transition-colors">Retail Showrooms</a></li>
              <li><a href="/#properties" className="hover:text-[#b8863b] transition-colors">Buy & Sell Residences</a></li>
              <li><a href="/#properties" className="hover:text-[#b8863b] transition-colors">Luxury Penthouses</a></li>
              <li><Link to="/login" className="hover:text-[#b8863b] font-semibold text-[#b8863b] transition-colors flex items-center gap-1">Admin Portal <ArrowUpRight className="w-3 h-3" /></Link></li>
            </ul>
          </div>

          {/* Register Your Interest Newsletter */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider mb-2 text-[#1a202c]">Register Your Interest</h3>
            <p className="text-[11px] text-neutral-500 mb-3">Get the latest updates and exclusive property alerts.</p>
            <form onSubmit={(e) => { e.preventDefault(); alert('Thank you for registering your interest! Our luxury advisor will be in touch.'); }} className="flex items-center">
              <input 
                type="email" 
                required
                placeholder="Enter your email" 
                className="w-full px-3.5 py-2.5 text-xs bg-white border border-[#ece7dc] rounded-l-lg text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:border-[#b8863b]"
              />
              <button 
                type="submit" 
                className="px-3.5 py-2.5 bg-[#b8863b] hover:bg-[#a6752d] text-white rounded-r-lg transition-colors flex items-center justify-center cursor-pointer"
                title="Submit Email"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>

        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 pt-6 border-t border-[#ece7dc] flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-500">
          <p>© {new Date().getFullYear()} Rental Pune. All Rights Reserved.</p>
          <div className="flex items-center space-x-4 mt-2 sm:mt-0 text-[11px]">
            <a href="#" className="hover:text-[#b8863b]">Privacy Policy</a>
            <span>•</span>
            <a href="#" className="hover:text-[#b8863b]">Terms & Conditions</a>
            <span>•</span>
            <a href="#" className="hover:text-[#b8863b]">RERA Compliance</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

