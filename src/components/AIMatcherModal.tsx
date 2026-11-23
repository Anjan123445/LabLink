// ============================================================
// LabLink — GenAI Project Matcher Modal (FR2)
// Gemini 2.5 Flash + Offline Smart Engine with Pre-filled Request Kit
// ============================================================

import { useState, useEffect, useRef } from 'react';
import type { Equipment } from '../types';
import {
  matchProjectToEquipment,
  isGeminiConfigured,
  type MatchProjectResult,
  type RecommendedKit,
} from '../services/aiAssistant';

interface AIMatcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectEquipment: (eq: Equipment) => void;
  onRequestRecommendedKit: (kit: RecommendedKit) => void;
}

const examplePrompts = [
  'I need to train a computer vision model for drone obstacle detection before my Friday capstone demo',
  'Building an IoT soil moisture monitoring system with LoRa connectivity and edge ML inference',
  'FPGA-based neural network accelerator for real-time image classification and timing verification',
  'Bioprinting GelMA cardiac tissue scaffolds and analyzing cell viability with qPCR gene markers',
  'Fine-tuning a large language model on regional language corpus using QLoRA multi-GPU training',
];

export default function AIMatcherModal({
  isOpen,
  onClose,
  onSelectEquipment,
  onRequestRecommendedKit,
}: AIMatcherModalProps) {
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [teamSize, setTeamSize] = useState(3);
  const [constraints, setConstraints] = useState('');
  const [loading, setLoading] = useState(false);
  const [matchResult, setMatchResult] = useState<MatchProjectResult | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => textareaRef.current?.focus(), 50);
    } else {
      setMatchResult(null);
    }
  }, [isOpen]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) return;

    setLoading(true);
    try {
      const result = await matchProjectToEquipment(description, {
        deadline: deadline || undefined,
        teamSize,
        constraints: constraints || undefined,
      });
      setMatchResult(result);
    } catch {
      // Graceful error fallback
      const fallback = await matchProjectToEquipment(description);
      setMatchResult(fallback);
    } finally {
      setLoading(false);
    }
  }

  function handleRequestKit() {
    if (!matchResult) return;
    onRequestRecommendedKit(matchResult.recommendedKit);
    onClose();
  }

  const isLive = matchResult?.source === 'gemini';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-matcher-title"
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs" onClick={onClose}></div>

      {/* Modal Dialog */}
      <div
        ref={modalRef}
        className="relative bg-white rounded-2xl shadow-elevated border border-slate-200/80 max-w-2xl w-full max-h-[88vh] overflow-y-auto animate-modal-enter"
      >
        {/* Sticky Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-slate-100 px-6 py-4 rounded-t-2xl z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 border border-slate-200/80 flex items-center justify-center text-xl font-bold flex-shrink-0" aria-hidden="true">
              ✨
            </span>
            <div>
              <h2 id="ai-matcher-title" className="text-base font-bold text-slate-900 leading-tight">
                AI Project Matcher & Kit Recommender
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                    isGeminiConfigured()
                      ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-600/20'
                      : 'bg-amber-50 text-amber-800 ring-1 ring-amber-600/20'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isGeminiConfigured() ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                    }`}
                  ></span>
                  {isGeminiConfigured() ? 'Gemini 2.5 Flash Ready' : 'Offline Smart Engine Active'}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Zero-Failure Guarantee</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
            aria-label="Close AI Project Matcher Modal"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Query Form */}
          <form onSubmit={handleAnalyze} className="space-y-4">
            <div>
              <label htmlFor="ai-desc" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Project Goal & Requirements *
              </label>
              <textarea
                id="ai-desc"
                ref={textareaRef}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Describe your research project in plain English (e.g., goals, required computing/sensors, software stack, milestone demo date)..."
                className="input-field min-h-[90px] text-xs sm:text-sm resize-y"
                rows={3}
                required
              />
            </div>

            {/* Optional Constraints Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label htmlFor="ai-deadline" className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Target Deadline
                </label>
                <input
                  id="ai-deadline"
                  type="date"
                  value={deadline}
                  onChange={e => setDeadline(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="input-field text-xs py-2"
                />
              </div>

              <div>
                <label htmlFor="ai-teamsize" className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Team Members Count
                </label>
                <input
                  id="ai-teamsize"
                  type="number"
                  min={1}
                  max={10}
                  value={teamSize}
                  onChange={e => setTeamSize(Number(e.target.value))}
                  className="input-field text-xs py-2 font-mono"
                />
              </div>

              <div>
                <label htmlFor="ai-constraints" className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Specific Constraints
                </label>
                <input
                  id="ai-constraints"
                  type="text"
                  placeholder="e.g., Must have ROS2"
                  value={constraints}
                  onChange={e => setConstraints(e.target.value)}
                  className="input-field text-xs py-2"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !description.trim()}
              className="btn-primary w-full text-xs sm:text-sm py-2.5 font-semibold"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>Synthesizing Tailored Multi-Department Kit...</span>
                </>
              ) : (
                <>
                  <span>✨ Analyze & Recommend Equipment Kit</span>
                </>
              )}
            </button>
          </form>

          {/* Example Prompts Carousel */}
          {!matchResult && (
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Try an Example Campus Project:</p>
              <div className="space-y-1.5">
                {examplePrompts.map((example, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setDescription(example)}
                    className="w-full text-left text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg px-3 py-2 border border-slate-200/80 transition-colors"
                  >
                    "{example}"
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Results Display */}
          {matchResult && (
            <div className="space-y-5 pt-3 border-t border-slate-100 animate-fade-in">
              {/* Telemetry Header Pill */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center gap-2.5">
                  <span className="text-base" aria-hidden="true">🤖</span>
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      Recommendation Generated by{' '}
                      <span className={isLive ? 'text-emerald-800 font-extrabold' : 'text-indigo-800 font-extrabold'}>
                        {isLive ? 'Live Google Gemini AI (gemini-2.5-flash)' : 'Offline Smart Engine'}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500">{matchResult.reasoning}</p>
                  </div>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isLive ? 'bg-emerald-100 text-emerald-800' : 'bg-indigo-100 text-indigo-800'
                  }`}
                >
                  {isLive ? 'Live Gemini AI' : 'Offline Smart Engine'}
                </span>
              </div>

              {/* Analysis Text */}
              <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-4 text-xs text-slate-700 whitespace-pre-wrap leading-relaxed font-sans">
                {matchResult.explanation}
              </div>

              {/* Matched Equipment Cards */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Recommended Multi-Resource Equipment ({matchResult.equipment.length})
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    Suggested allocation: <strong className="font-mono">{matchResult.suggestedDurationHours}h</strong> total
                  </span>
                </div>

                <div className="space-y-2">
                  {matchResult.equipment.map(eq => (
                    <div
                      key={eq.id}
                      className="p-3.5 rounded-xl border border-slate-200/80 bg-white hover:border-slate-300 transition-colors flex items-center justify-between gap-3 shadow-2xs"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">{eq.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                            {eq.department}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 truncate font-mono">{eq.specs}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Location: {eq.location}</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          onSelectEquipment(eq);
                          onClose();
                        }}
                        className="btn-secondary text-xs py-1.5 px-3 flex-shrink-0"
                        aria-label={`Book single slot for ${eq.name}`}
                      >
                        Book Slot →
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* 1-Click Request Recommended Kit Action */}
              <div className="p-4 rounded-xl bg-slate-900 text-white border border-slate-800 space-y-2.5">
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>⚡</span> 1-Click Multi-Resource Request Proposal
                  </h4>
                  <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                    Need multiple items simultaneously for your team? Pre-fill the Faculty Project Request Form with all {matchResult.equipment.length} recommended items.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRequestKit}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 text-xs sm:text-sm font-semibold active:scale-[0.98] transition-colors shadow-sm"
                  aria-label="Request Recommended Kit (Pre-fills Project Access Form)"
                >
                  📋 Request Recommended Kit ({matchResult.equipment.length} Equipment Items)
                </button>
              </div>

              {/* Back to Query Button */}
              <button
                type="button"
                onClick={() => setMatchResult(null)}
                className="btn-ghost w-full text-xs text-slate-500 hover:text-slate-900"
              >
                ← Refine Query or Try Another Description
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
