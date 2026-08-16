import { useState } from 'react';
import { Property, PropertyFAQ, Settings } from '../../types.js';
import { 
  ChevronDown, 
  HelpCircle, 
  ShieldCheck, 
  Car, 
  Coins, 
  PawPrint, 
  FileText, 
  MessageCircle,
  Sparkles,
  Info
} from 'lucide-react';
import { getWhatsAppUrl } from '../../utils/whatsapp.js';

interface PropertyFaqSectionProps {
  property: Property;
  settings: Settings;
}

export default function PropertyFaqSection({ property, settings }: PropertyFaqSectionProps) {
  const faqs = property.faqs && property.faqs.length > 0 ? property.faqs : [];
  const [openIndex, setOpenIndex] = useState<number | null>(0); // First item open by default
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  if (faqs.length === 0) {
    return null;
  }

  // Extract unique categories
  const categories = Array.from(new Set(faqs.map(f => f.category || 'General')));

  const filteredFaqs = selectedCategory === 'ALL'
    ? faqs
    : faqs.filter(f => (f.category || 'General').toLowerCase() === selectedCategory.toLowerCase());

  const getCategoryIcon = (category?: string) => {
    const cat = (category || '').toLowerCase();
    if (cat.includes('maint')) return Coins;
    if (cat.includes('rule') || cat.includes('societ')) return ShieldCheck;
    if (cat.includes('park')) return Car;
    if (cat.includes('pet')) return PawPrint;
    if (cat.includes('deposit') || cat.includes('agree')) return FileText;
    return Info;
  };

  const handleAskFaqWhatsApp = (faq: PropertyFAQ) => {
    const customText = `Hi Rental Pune, I have a question regarding "${faq.question}" for ${property.title} in ${property.location}. Could you share more details?`;
    const url = getWhatsAppUrl(settings, { customMessage: customText });
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-5 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-lg bg-[#d4a359]/20 text-[#d4a359]">
              <HelpCircle className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-[#d4a359]">
              Society FAQs & Key Details
            </span>
          </div>
          <h4 className="text-lg font-serif font-bold text-white">
            Maintenance, Rules & Amenities
          </h4>
        </div>

        {/* Highlight badge */}
        <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-neutral-300">
          <Sparkles className="w-3.5 h-3.5 text-[#d4a359]" />
          <span>Verified Society Guidelines</span>
        </div>
      </div>

      {/* Category Pills */}
      {categories.length > 1 && (
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === 'ALL'
                ? 'bg-[#d4a359] text-[#080f1a] shadow-md shadow-[#d4a359]/20'
                : 'bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10'
            }`}
          >
            All Questions ({faqs.length})
          </button>
          {categories.map((cat) => {
            const Icon = getCategoryIcon(cat);
            const count = faqs.filter(f => (f.category || 'General').toLowerCase() === cat.toLowerCase()).length;
            const isSelected = selectedCategory.toLowerCase() === cat.toLowerCase();

            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center space-x-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-[#d4a359] text-[#080f1a] shadow-md shadow-[#d4a359]/20'
                    : 'bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-[#080f1a]' : 'text-[#d4a359]'}`} />
                <span>{cat}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-black/20 text-[#080f1a]' : 'bg-white/10 text-neutral-400'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Accordion list */}
      <div className="space-y-2.5">
        {filteredFaqs.map((faq, idx) => {
          const isOpen = openIndex === idx;
          const Icon = getCategoryIcon(faq.category);

          return (
            <div
              key={faq.id || idx}
              className={`rounded-xl border transition-all overflow-hidden ${
                isOpen
                  ? 'bg-black/40 border-[#d4a359]/40 shadow-lg shadow-black/40'
                  : 'bg-white/[0.02] border-white/5 hover:border-white/15'
              }`}
            >
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? null : idx)}
                className="w-full px-4 py-3.5 flex items-center justify-between text-left transition-colors cursor-pointer"
              >
                <div className="flex items-start space-x-3 pr-2">
                  <div className={`p-1.5 rounded-lg flex-shrink-0 mt-0.5 ${
                    isOpen ? 'bg-[#d4a359] text-[#080f1a]' : 'bg-white/5 text-[#d4a359]'
                  }`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#d4a359]">
                        {faq.category || 'General'}
                      </span>
                    </div>
                    <span className="text-xs sm:text-sm font-bold text-white leading-snug">
                      {faq.question}
                    </span>
                  </div>
                </div>

                <div className={`p-1 rounded-full flex-shrink-0 transition-transform duration-200 ${
                  isOpen ? 'rotate-180 text-[#d4a359]' : 'text-neutral-400'
                }`}>
                  <ChevronDown className="w-4 h-4" />
                </div>
              </button>

              {isOpen && (
                <div className="px-4 pb-4 pt-1 border-t border-white/5 space-y-3 animate-in fade-in duration-200">
                  <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed pl-8 border-l-2 border-[#d4a359]/30">
                    {faq.answer}
                  </p>

                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => handleAskFaqWhatsApp(faq)}
                      className="inline-flex items-center space-x-1.5 px-3 py-1 bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 hover:text-white rounded-lg text-xs font-semibold transition-all cursor-pointer"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Ask More on WhatsApp</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom info helper */}
      <div className="p-3.5 rounded-xl bg-[#d4a359]/10 border border-[#d4a359]/20 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2 text-neutral-300">
          <Info className="w-4 h-4 text-[#d4a359] flex-shrink-0" />
          <span>Have specific questions regarding lease terms or move-in dates?</span>
        </div>
        <a
          href={getWhatsAppUrl(settings, { 
            customMessage: `Hi Rental Pune, I have a society inquiry regarding ${property.title} in ${property.location}.` 
          })}
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold text-[#d4a359] hover:text-white whitespace-nowrap transition-colors flex items-center gap-1"
        >
          <span>Ask Agent</span>
          <span>→</span>
        </a>
      </div>
    </div>
  );
}
