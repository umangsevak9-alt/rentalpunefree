import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ArrowLeft, MessageCircle, Phone, Clock } from 'lucide-react';
import { useAppStore } from '../../store/index.js';
import { getWhatsAppUrl } from '../../utils/whatsapp.js';

export default function ThankYou() {
  const { settings } = useAppStore();
  const phone = settings.phone || '+91 98765 43210';
  const cleanPhone = phone.replace(/[^0-9+]/g, '');
  const whatsAppUrl = getWhatsAppUrl(settings, { 
    customMessage: 'Hi Rental Pune, I just submitted an enquiry on your website and would like to proceed with finding a luxury rental.' 
  });

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-[#080f1a] text-white px-4 py-16 selection:bg-[#d4a359] selection:text-[#080f1a]">
      <div className="relative max-w-lg w-full bg-[#0e1726] border border-white/10 rounded-3xl p-8 sm:p-12 shadow-2xl overflow-hidden text-center space-y-6">
        
        {/* Decorative architectural layout background element */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#d4a359]/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#d4a359]/5 rounded-full blur-3xl"></div>

        {/* Success Icon */}
        <div className="relative mx-auto w-16 h-16 rounded-full bg-[#d4a359]/15 border border-[#d4a359]/30 flex items-center justify-center text-[#d4a359] animate-bounce">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        {/* Headings */}
        <div className="space-y-2">
          <span className="text-[#d4a359] text-xs font-bold uppercase tracking-[0.2em] block">
            Enquiry Received
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold font-serif text-white tracking-tight">
            Thank You!
          </h1>
        </div>

        <p className="text-sm sm:text-base text-neutral-300 leading-relaxed max-w-md mx-auto">
          Your enquiry has been received successfully. Our team of luxury rental advisors will contact you within <strong className="text-white">2 hours</strong>.
        </p>

        {/* Reassurance points */}
        <div className="bg-[#080f1a] border border-white/5 rounded-2xl p-4 text-left space-y-3 max-w-sm mx-auto text-xs text-neutral-400">
          <div className="flex items-center space-x-3">
            <Clock className="w-4 h-4 text-[#d4a359] flex-shrink-0" />
            <span>Guaranteed call-back in 2 hours (9 AM - 8 PM).</span>
          </div>
          <div className="flex items-center space-x-3">
            <Phone className="w-4 h-4 text-[#d4a359] flex-shrink-0" />
            <span>Please keep your phone available for our connection.</span>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="pt-4 flex flex-col gap-3 max-w-sm mx-auto">
          {/* Instant WhatsApp */}
          <a
            href={whatsAppUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3.5 px-6 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-emerald-950/30 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
          >
            <MessageCircle className="w-4.5 h-4.5" />
            <span>Connect on WhatsApp</span>
          </a>

          {/* Back to Home */}
          <Link
            to="/"
            className="w-full py-3.5 px-6 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </Link>
        </div>

      </div>
    </div>
  );
}
