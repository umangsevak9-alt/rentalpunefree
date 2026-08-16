import { useState, useEffect } from 'react';
import { FAQ, Settings } from '../../types.js';
import { 
  HelpCircle, 
  ChevronDown, 
  MessageCircle, 
  Sparkles, 
  Search,
  CheckCircle2
} from 'lucide-react';
import { getWhatsAppUrl } from '../../utils/whatsapp.js';

interface HomeFaqSectionProps {
  settings?: Settings | null;
}

export default function HomeFaqSection({ settings }: HomeFaqSectionProps) {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function fetchFaqs() {
      try {
        const res = await fetch('/api/faqs');
        if (res.ok) {
          const data: FAQ[] = await res.json();
          setFaqs(data);
          if (data.length > 0) {
            setOpenId(data[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load home FAQs:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchFaqs();
  }, []);

  if (loading) {
    return (
      <section id="faqs" className="bg-[#080f1a] text-white py-20 px-4 sm:px-6 lg:px-8 border-t border-white/10">
        <div className="max-w-4xl mx-auto text-center py-10 text-neutral-400 text-xs">
          Loading Frequently Asked Questions...
        </div>
      </section>
    );
  }

  if (faqs.length === 0) {
    return null;
  }

  // Categories list
  const categories = Array.from(new Set(faqs.map(f => f.category || 'General')));

  const filteredFaqs = faqs.filter(f => {
    const matchesCategory = activeCategory === 'ALL' || (f.category || 'General').toLowerCase() === activeCategory.toLowerCase();
    const matchesSearch = searchQuery.trim() === '' || 
      f.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
      f.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleAskWhatsApp = (faq: FAQ) => {
    const msg = `Hi Rental Pune, I have a question regarding: "${faq.question}". Could you please help me with more details?`;
    const url = getWhatsAppUrl(settings, { customMessage: msg });
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <section id="faqs" className="bg-[#080f1a] text-white py-20 px-4 sm:px-6 lg:px-8 border-t border-white/10">
      <div className="max-w-4xl mx-auto space-y-10">
        
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#d4a359]/15 border border-[#d4a359]/30 text-[#d4a359] text-xs font-extrabold uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Got Questions? We Have Answers</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold font-serif text-white">
            Frequently Asked Questions
          </h2>
          <p className="text-sm text-neutral-400 max-w-xl mx-auto leading-relaxed">
            Everything you need to know about renting residential properties, Leave & License agreements, security deposits, and society rules in Pune.
          </p>
        </div>

        {/* Filters & Search */}
        <div className="space-y-4">
          <div className="relative max-w-md mx-auto">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search questions (e.g. deposit, agreement, bachelors)..."
              className="w-full pl-10 pr-4 py-3 bg-[#0e1726] border border-white/15 rounded-2xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#d4a359]"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-3 text-xs text-neutral-400 hover:text-white"
              >
                Clear
              </button>
            )}
          </div>

          {/* Category Pills */}
          {categories.length > 1 && (
            <div className="flex items-center justify-center flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => setActiveCategory('ALL')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeCategory === 'ALL'
                    ? 'bg-[#d4a359] text-[#080f1a] shadow-lg shadow-[#d4a359]/20'
                    : 'bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10'
                }`}
              >
                All FAQs ({faqs.length})
              </button>
              {categories.map(cat => {
                const isSelected = activeCategory.toLowerCase() === cat.toLowerCase();
                const count = faqs.filter(f => (f.category || 'General').toLowerCase() === cat.toLowerCase()).length;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveCategory(cat)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                      isSelected
                        ? 'bg-[#d4a359] text-[#080f1a] shadow-lg shadow-[#d4a359]/20'
                        : 'bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <span>{cat}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-black/20 text-[#080f1a]' : 'bg-white/10 text-neutral-400'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Accordion List */}
        {filteredFaqs.length === 0 ? (
          <div className="p-8 text-center bg-[#0e1726] border border-white/10 rounded-2xl text-neutral-400 text-xs space-y-2">
            <HelpCircle className="w-8 h-8 text-neutral-600 mx-auto" />
            <p>No questions found matching your search query "{searchQuery}".</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredFaqs.map((faq) => {
              const isOpen = openId === faq.id;

              return (
                <div
                  key={faq.id}
                  className={`rounded-2xl border transition-all overflow-hidden ${
                    isOpen
                      ? 'bg-[#0e1726] border-[#d4a359]/50 shadow-xl shadow-black/50'
                      : 'bg-[#0e1726]/60 border-white/10 hover:border-white/20'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setOpenId(isOpen ? null : faq.id)}
                    className="w-full px-5 py-4 flex items-center justify-between text-left transition-colors cursor-pointer"
                  >
                    <div className="flex items-start space-x-3.5 pr-4">
                      <div className={`p-2 rounded-xl flex-shrink-0 mt-0.5 ${
                        isOpen ? 'bg-[#d4a359] text-[#080f1a]' : 'bg-white/5 text-[#d4a359]'
                      }`}>
                        <HelpCircle className="w-4 h-4" />
                      </div>
                      <div>
                        {faq.category && (
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#d4a359] block mb-0.5">
                            {faq.category}
                          </span>
                        )}
                        <span className="text-sm sm:text-base font-bold text-white leading-snug">
                          {faq.question}
                        </span>
                      </div>
                    </div>

                    <div className={`p-1.5 rounded-full flex-shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180 text-[#d4a359]' : 'text-neutral-400'
                    }`}>
                      <ChevronDown className="w-5 h-5" />
                    </div>
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 pt-2 border-t border-white/10 space-y-4">
                      <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed pl-10 border-l-2 border-[#d4a359]/40">
                        {faq.answer}
                      </p>

                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => handleAskWhatsApp(faq)}
                          className="inline-flex items-center space-x-2 px-3.5 py-1.5 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
                        >
                          <MessageCircle className="w-4 h-4 text-emerald-400" />
                          <span>Ask More Details on WhatsApp</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Footer Prompt */}
        <div className="p-6 bg-[#0e1726] border border-[#d4a359]/30 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-2xl bg-[#d4a359]/20 text-[#d4a359] flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Have a specific question about Pune rentals?</h4>
              <p className="text-xs text-neutral-400 mt-0.5">Our dedicated rental advisors are available 7 days a week.</p>
            </div>
          </div>

          <a
            href={getWhatsAppUrl(settings, { customMessage: 'Hi Rental Pune, I have a specific question about renting a property in Pune.' })}
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-2.5 bg-[#d4a359] hover:bg-[#e5b364] text-[#080f1a] font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center space-x-2 cursor-pointer flex-shrink-0"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Chat With Advisor</span>
          </a>
        </div>

      </div>
    </section>
  );
}
