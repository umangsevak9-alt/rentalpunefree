import React, { useState } from 'react';
import { PropertyFAQ } from '../../types.js';
import { 
  Plus, 
  Trash2, 
  Sparkles, 
  MoveUp, 
  MoveDown, 
  HelpCircle, 
  ShieldCheck, 
  Car, 
  Coins, 
  PawPrint, 
  Info,
  Check,
  Edit2
} from 'lucide-react';

interface PropertyFaqEditorProps {
  faqs: PropertyFAQ[];
  onChange: (faqs: PropertyFAQ[]) => void;
  propertyTitle?: string;
}

export const FAQ_CATEGORIES = [
  'Maintenance',
  'Society Rules',
  'Parking',
  'Deposit & Agreement',
  'Pet Policy',
  'General'
] as const;

export const FAQ_PRESETS = [
  {
    category: 'Maintenance',
    title: 'Maintenance Charges',
    icon: Coins,
    question: 'What are the monthly society maintenance charges & what do they cover?',
    answer: 'The society maintenance is ₹3,500/month, payable directly to the society office. This covers 24/7 security guard patrol, common area lighting, elevator maintenance, daily garbage collection, and access to all clubhouse amenities.'
  },
  {
    category: 'Society Rules',
    title: 'Society Rules & Move-in',
    icon: ShieldCheck,
    question: 'What are the society rules regarding quiet hours, visitors, and move-in formalities?',
    answer: 'The society follows strict peaceful living norms with quiet hours between 10:30 PM and 6:00 AM. Advance intimation of 48 hours is required before moving in. Move-in lift pads are installed by the security team for safe furniture transit.'
  },
  {
    category: 'Parking',
    title: 'Parking Availability',
    icon: Car,
    question: 'What parking availability is allocated with this residence?',
    answer: 'Includes 1 dedicated covered basement car parking space and designated two-wheeler parking. Visitor parking is managed via the digital society gate app.'
  },
  {
    category: 'Deposit & Agreement',
    title: 'Security Deposit & Lock-in',
    icon: Info,
    question: 'What is the security deposit amount and minimum agreement tenure?',
    answer: 'A refundable security deposit of 2 months rent is required upon signing. The standard agreement is a 11-month or 24-month registered rent agreement with a 6-month lock-in period.'
  },
  {
    category: 'Pet Policy',
    title: 'Pet Policy',
    icon: PawPrint,
    question: 'Are pets allowed in the society and apartment building?',
    answer: 'Yes, pets are welcome in the society with standard pet hygiene rules in common spaces and leash etiquette in elevators.'
  }
];

export default function PropertyFaqEditor({ faqs, onChange, propertyTitle }: PropertyFaqEditorProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  
  // New FAQ form state
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');
  const [newCategory, setNewCategory] = useState<string>('Maintenance');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('ALL');

  const handleAddFaq = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newQuestion.trim() || !newAnswer.trim()) return;

    const newFaq: PropertyFAQ = {
      id: `faq-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      category: newCategory,
      question: newQuestion.trim(),
      answer: newAnswer.trim()
    };

    onChange([...faqs, newFaq]);
    setNewQuestion('');
    setNewAnswer('');
  };

  const handleApplyPreset = (preset: typeof FAQ_PRESETS[0]) => {
    // Check if question already exists
    const exists = faqs.some(f => f.question.toLowerCase() === preset.question.toLowerCase());
    if (exists) return;

    const newFaq: PropertyFAQ = {
      id: `faq-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      category: preset.category,
      question: preset.question,
      answer: preset.answer
    };

    onChange([...faqs, newFaq]);
  };

  const handleApplyAllStandardPresets = () => {
    const freshFaqs: PropertyFAQ[] = FAQ_PRESETS.map((preset, index) => ({
      id: `faq-${Date.now()}-${index}`,
      category: preset.category,
      question: preset.question,
      answer: preset.answer
    }));

    onChange(freshFaqs);
  };

  const handleRemoveFaq = (index: number) => {
    const updated = faqs.filter((_, i) => i !== index);
    onChange(updated);
    if (editingIndex === index) setEditingIndex(null);
  };

  const handleMoveFaq = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === faqs.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const updated = [...faqs];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    onChange(updated);
  };

  const handleSaveInlineEdit = (index: number, updatedFaq: PropertyFAQ) => {
    const updated = [...faqs];
    updated[index] = updatedFaq;
    onChange(updated);
    setEditingIndex(null);
  };

  const filteredFaqs = activeCategoryFilter === 'ALL' 
    ? faqs 
    : faqs.filter(f => (f.category || 'General').toLowerCase() === activeCategoryFilter.toLowerCase());

  return (
    <div className="space-y-6">
      {/* Top Banner with Presets */}
      <div className="p-4 bg-black border border-neutral-800 rounded-2xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-wider text-[#d4a359] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              1-Click Standard FAQ Presets
            </span>
            <p className="text-xs text-neutral-400 mt-0.5">
              Instantly insert verified FAQs for maintenance charges, society rules, parking, and security deposits.
            </p>
          </div>
          <button
            type="button"
            onClick={handleApplyAllStandardPresets}
            className="px-3 py-1.5 bg-[#d4a359]/20 hover:bg-[#d4a359] text-[#d4a359] hover:text-[#080f1a] border border-[#d4a359]/40 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer flex-shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Apply Full Standard Pack (5 FAQs)</span>
          </button>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {FAQ_PRESETS.map((preset) => {
            const Icon = preset.icon;
            const isAdded = faqs.some(f => f.question.toLowerCase() === preset.question.toLowerCase());
            return (
              <button
                key={preset.title}
                type="button"
                onClick={() => handleApplyPreset(preset)}
                disabled={isAdded}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium border flex items-center space-x-1.5 transition-all cursor-pointer ${
                  isAdded
                    ? 'bg-neutral-900/60 border-neutral-800 text-neutral-500 opacity-60 cursor-not-allowed'
                    : 'bg-neutral-900 hover:bg-neutral-800 border-neutral-700 text-neutral-200 hover:text-white hover:border-[#d4a359]'
                }`}
              >
                <Icon className="w-3 h-3 text-[#d4a359]" />
                <span>+ {preset.title}</span>
                {isAdded && <Check className="w-3 h-3 text-emerald-500 ml-1" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Add Custom FAQ Form */}
      <div className="p-5 bg-neutral-900/80 border border-neutral-800 rounded-2xl space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-white flex items-center space-x-2">
          <HelpCircle className="w-4 h-4 text-[#d4a359]" />
          <span>Add Custom Property FAQ</span>
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-1">
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1">
              Category
            </label>
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="w-full px-3 py-2 bg-black border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-[#d4a359]"
            >
              {FAQ_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1">
              Question *
            </label>
            <input
              type="text"
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              placeholder="e.g. What are the society maintenance charges & inclusions?"
              className="w-full px-3 py-2 bg-black border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-[#d4a359]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1">
            Detailed Answer *
          </label>
          <textarea
            rows={3}
            value={newAnswer}
            onChange={(e) => setNewAnswer(e.target.value)}
            placeholder="e.g. ₹3,500/month payable directly to society office. Covers 24/7 security, backup generator, elevator maintenance, and clubhouse access."
            className="w-full px-3 py-2 bg-black border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-[#d4a359]"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => handleAddFaq()}
            disabled={!newQuestion.trim() || !newAnswer.trim()}
            className="px-4 py-2 bg-[#d4a359] hover:bg-[#e5b364] text-[#080f1a] font-bold text-xs rounded-xl transition-all shadow-md flex items-center space-x-1.5 cursor-pointer disabled:opacity-40"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add FAQ Item</span>
          </button>
        </div>
      </div>

      {/* Existing FAQs List */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
            Configured FAQs ({faqs.length}) {propertyTitle ? `for ${propertyTitle}` : ''}
          </h4>

          {/* Category Filter Pills */}
          {faqs.length > 0 && (
            <div className="flex flex-wrap gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => setActiveCategoryFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  activeCategoryFilter === 'ALL'
                    ? 'bg-white text-black'
                    : 'bg-neutral-900 text-neutral-400 hover:text-white'
                }`}
              >
                All ({faqs.length})
              </button>
              {FAQ_CATEGORIES.map(cat => {
                const count = faqs.filter(f => (f.category || 'General').toLowerCase() === cat.toLowerCase()).length;
                if (count === 0) return null;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveCategoryFilter(cat)}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                      activeCategoryFilter.toLowerCase() === cat.toLowerCase()
                        ? 'bg-[#d4a359] text-black font-bold'
                        : 'bg-neutral-900 text-neutral-400 hover:text-white'
                    }`}
                  >
                    {cat} ({count})
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {faqs.length === 0 ? (
          <div className="p-8 border border-neutral-800 rounded-2xl text-center text-neutral-500 text-xs bg-black/60 space-y-2">
            <HelpCircle className="w-8 h-8 text-neutral-600 mx-auto mb-1" />
            <p className="font-semibold text-neutral-400">No FAQs configured for this property yet.</p>
            <p className="text-neutral-500 max-w-sm mx-auto">
              Add details regarding maintenance fees, society rules, parking spots, and move-in procedures so prospective tenants get quick clarity.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredFaqs.map((faq, originalIndex) => {
              // Find real index in faqs array
              const realIndex = faqs.findIndex(f => f === faq);
              const isEditing = editingIndex === realIndex;

              return (
                <div 
                  key={faq.id || realIndex}
                  className="bg-black border border-neutral-800 hover:border-neutral-700 rounded-2xl p-4 transition-colors space-y-3"
                >
                  {isEditing ? (
                    <InlineFaqEditor 
                      faq={faq} 
                      onSave={(updated) => handleSaveInlineEdit(realIndex, updated)}
                      onCancel={() => setEditingIndex(null)}
                    />
                  ) : (
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md bg-[#d4a359]/15 text-[#d4a359] text-[10px] font-extrabold uppercase tracking-wider border border-[#d4a359]/30">
                              {faq.category || 'General'}
                            </span>
                            <span className="text-[11px] text-neutral-500 font-mono">#{realIndex + 1}</span>
                          </div>
                          <h5 className="text-sm font-bold text-white leading-snug">
                            {faq.question}
                          </h5>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center space-x-1 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => handleMoveFaq(realIndex, 'up')}
                            disabled={realIndex === 0}
                            className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg disabled:opacity-20 cursor-pointer"
                            title="Move Up"
                          >
                            <MoveUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveFaq(realIndex, 'down')}
                            disabled={realIndex === faqs.length - 1}
                            className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg disabled:opacity-20 cursor-pointer"
                            title="Move Down"
                          >
                            <MoveDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingIndex(realIndex)}
                            className="p-1.5 text-neutral-400 hover:text-[#d4a359] hover:bg-[#d4a359]/10 rounded-lg cursor-pointer transition-colors"
                            title="Edit FAQ"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveFaq(realIndex)}
                            className="p-1.5 text-neutral-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg cursor-pointer transition-colors"
                            title="Delete FAQ"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <p className="text-xs text-neutral-300 mt-2 pl-2 border-l-2 border-[#d4a359]/40 leading-relaxed">
                        {faq.answer}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function InlineFaqEditor({ faq, onSave, onCancel }: { faq: PropertyFAQ; onSave: (faq: PropertyFAQ) => void; onCancel: () => void }) {
  const [q, setQ] = useState(faq.question);
  const [a, setA] = useState(faq.answer);
  const [c, setC] = useState(faq.category || 'Maintenance');

  return (
    <div className="space-y-3 p-2 bg-neutral-900 rounded-xl border border-neutral-700">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <select
          value={c}
          onChange={(e) => setC(e.target.value)}
          className="px-3 py-1.5 bg-black border border-neutral-700 rounded-lg text-xs text-white focus:ring-1 focus:ring-[#d4a359]"
        >
          {FAQ_CATEGORIES.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="md:col-span-2 px-3 py-1.5 bg-black border border-neutral-700 rounded-lg text-xs text-white focus:ring-1 focus:ring-[#d4a359]"
          placeholder="Question"
        />
      </div>
      <textarea
        rows={3}
        value={a}
        onChange={(e) => setA(e.target.value)}
        className="w-full px-3 py-1.5 bg-black border border-neutral-700 rounded-lg text-xs text-white focus:ring-1 focus:ring-[#d4a359]"
        placeholder="Answer"
      />
      <div className="flex justify-end space-x-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs rounded-lg cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => onSave({ ...faq, question: q, answer: a, category: c })}
          disabled={!q.trim() || !a.trim()}
          className="px-3 py-1 bg-[#d4a359] hover:bg-[#e5b364] text-[#080f1a] font-bold text-xs rounded-lg cursor-pointer disabled:opacity-50"
        >
          Save
        </button>
      </div>
    </div>
  );
}
