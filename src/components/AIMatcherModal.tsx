// ============================================================
// LabLink — AI Project Matcher Modal
// ============================================================

import { useState } from 'react';
import type { Equipment } from '../types';
import { matchProjectToEquipment, isGeminiConfigured } from '../services/aiAssistant';

interface AIMatcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectEquipment: (eq: Equipment) => void;
}

const examplePrompts = [
  "I need to train a computer vision model for drone obstacle detection before my Friday demo",
  "Building an IoT soil moisture monitoring system with LoRa connectivity and edge ML",
  "FPGA-based neural network accelerator for real-time image classification",
  "Bioprinting cardiac tissue scaffolds and analyzing cell viability with PCR",
  "Fine-tuning a large language model on regional language corpus using QLoRA",
];

export default function AIMatcherModal({ isOpen, onClose, onSelectEquipment }: AIMatcherModalProps) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ equipment: Equipment[]; explanation: string; source: 'gemini' | 'fallback' } | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const res = await matchProjectToEquipment(query);
      setResult(res);
    } catch {
      setResult({ equipment: [], explanation: 'An error occurred. Please try again.', source: 'fallback' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="AI Project Matcher">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}></div>

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-slate-200 px-6 py-4 rounded-t-2xl z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">✨</span>
              <div>
                <h2 className="text-lg font-bold text-slate-900">AI Project Matcher</h2>
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  {isGeminiConfigured() ? (
                    <><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span> Gemini API Connected</>
                  ) : (
                    <><span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block"></span> Smart Fallback Engine Active</>
                  )}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500"
              aria-label="Close modal"
            >
              <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Input */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <label htmlFor="ai-query" className="text-sm font-semibold text-slate-700">
              Describe your project goals and what you need:
            </label>
            <textarea
              id="ai-query"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="e.g., I need to train a computer vision model for drone obstacle detection before my Friday demo..."
              className="input-field min-h-[100px] resize-y"
              rows={3}
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="btn-primary w-full"
            >
              {loading ? (
                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> Analyzing...</>
              ) : (
                <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" /></svg> Find Matching Equipment</>
              )}
            </button>
          </form>

          {/* Example prompts */}
          {!result && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Try these examples:</p>
              <div className="space-y-1.5">
                {examplePrompts.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => setQuery(prompt)}
                    className="w-full text-left text-sm text-slate-600 hover:text-brand-600 hover:bg-brand-50 rounded-lg px-3 py-2 transition-colors"
                  >
                    "{prompt}"
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-4">
              <div className="rounded-xl bg-slate-50 p-4 border border-slate-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm">🤖</span>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">AI Analysis</span>
                  <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    result.source === 'gemini' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'
                  }`}>
                    {result.source === 'gemini' ? 'Gemini' : 'Smart Fallback'}
                  </span>
                </div>
                <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {result.explanation}
                </div>
              </div>

              {result.equipment.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-slate-700 mb-2">Recommended Equipment:</p>
                  <div className="space-y-2">
                    {result.equipment.map(eq => (
                      <button
                        key={eq.id}
                        onClick={() => { onSelectEquipment(eq); onClose(); }}
                        className="w-full card p-4 hover:shadow-md transition-shadow text-left flex items-center gap-4"
                      >
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-bold text-slate-900">{eq.name}</h4>
                          <p className="text-xs text-slate-500">{eq.department} · {eq.location}</p>
                        </div>
                        <span className="text-xs text-brand-600 font-semibold flex-shrink-0">Book →</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => { setResult(null); setQuery(''); }}
                className="btn-ghost w-full text-sm"
              >
                ← Try Another Query
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
