// ============================================================
// LabLink — Equipment Discovery Panel (FR1)
// Debounced Real-time Search, Multi-Filter & Rich Detail Modal
// ============================================================

import { useState, useMemo, useEffect, useRef } from 'react';
import type { Equipment, Department, AvailabilityStatus } from '../types';
import { departments } from '../data/equipment';
import { sanitizeText } from '../utils/validation';
import { useInView } from '../utils/useInView';

interface EquipmentDiscoveryProps {
  equipment: Equipment[];
  onSelectEquipment: (eq: Equipment) => void;
  onOpenAIMatcher: () => void;
}

const categoryIcons: Record<string, string> = {
  'GPU Workstation': '🖥️',
  'Dev Kit': '🔧',
  'Oscilloscope & Hardware': '📟',
  Fabrication: '🏭',
  'Sensor & Actuator': '📡',
  'Compute Cluster': '⚡',
  'Measurement & Analysis': '🔬',
};

const statusColors: Record<AvailabilityStatus, { bg: string; text: string; dot: string; ring: string }> = {
  'Available Now': { bg: 'bg-emerald-50', text: 'text-emerald-800', dot: 'bg-emerald-500', ring: 'ring-emerald-600/20' },
  'High Demand': { bg: 'bg-amber-50', text: 'text-amber-800', dot: 'bg-amber-500', ring: 'ring-amber-600/20' },
  'In Maintenance': { bg: 'bg-rose-50', text: 'text-rose-800', dot: 'bg-rose-500', ring: 'ring-rose-600/20' },
};

export default function EquipmentDiscovery({
  equipment,
  onSelectEquipment,
  onOpenAIMatcher,
}: EquipmentDiscoveryProps) {
  const [searchInput, setSearchInput] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [filterDept, setFilterDept] = useState<Department | 'All'>('All');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<AvailabilityStatus | 'All'>('All');
  const [filterPrereq, setFilterPrereq] = useState<'All' | 'HasPrereq' | 'NoPrereq'>('All');
  const [detailEquipment, setDetailEquipment] = useState<Equipment | null>(null);

  const detailModalRef = useRef<HTMLDivElement>(null);
  const [gridRef, isGridInView] = useInView<HTMLDivElement>();

  // Debounce search input (180ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(sanitizeText(searchInput, 100));
    }, 180);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Close modal on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && detailEquipment) {
        setDetailEquipment(null);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [detailEquipment]);

  const categories = useMemo(() => {
    const cats = new Set(equipment.map(e => e.category));
    return ['All', ...Array.from(cats)];
  }, [equipment]);

  const filtered = useMemo(() => {
    const q = debouncedQuery.toLowerCase();
    return equipment.filter(eq => {
      const matchesSearch =
        q === '' ||
        eq.name.toLowerCase().includes(q) ||
        eq.tags.some(t => t.includes(q)) ||
        eq.department.toLowerCase().includes(q) ||
        eq.specs.toLowerCase().includes(q) ||
        eq.location.toLowerCase().includes(q);

      const matchesDept = filterDept === 'All' || eq.department === filterDept;
      const matchesCat = filterCategory === 'All' || eq.category === filterCategory;
      const matchesStatus = filterStatus === 'All' || eq.status === filterStatus;
      const matchesPrereq =
        filterPrereq === 'All' ||
        (filterPrereq === 'HasPrereq' && eq.prerequisites.length > 0) ||
        (filterPrereq === 'NoPrereq' && eq.prerequisites.length === 0);

      return matchesSearch && matchesDept && matchesCat && matchesStatus && matchesPrereq;
    });
  }, [equipment, debouncedQuery, filterDept, filterCategory, filterStatus, filterPrereq]);

  return (
    <div className="space-y-6">
      {/* AI Matcher Engineering Console Banner */}
      <div className="card p-6 bg-slate-900 border border-slate-800 text-white shadow-sm ring-1 ring-white/10 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 text-[11px] font-medium text-slate-300 border border-white/10">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" aria-hidden="true"></span>
              <span>GenAI Assistant · Google Gemini 2.5 Flash + Smart Engine</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">
              Need Specialized STEM Hardware for Your Research?
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
              Describe your project goal, deadline, and team constraints in natural language. Our AI synthesizes cross-department kits and pre-fills your multi-resource access request in 1 click.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenAIMatcher}
            className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-xs sm:text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-100 active:scale-[0.98] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white flex-shrink-0"
            aria-label="Open AI Project Matcher Assistant"
          >
            <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
            </svg>
            Describe Your Project
          </button>
        </div>
      </div>

      {/* Real-time Search & Multi-filter Controls */}
      <div className="card p-4 space-y-3">
        <div className="flex flex-col md:flex-row gap-2.5">
          {/* Debounced Search */}
          <div className="flex-1 relative">
            <svg
              className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <input
              type="search"
              placeholder="Search by instrument name, specs, location, or research tags..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              className="input-field pl-10 text-xs sm:text-sm"
              aria-label="Search laboratory equipment catalog"
            />
          </div>

          {/* Department Filter */}
          <select
            value={filterDept}
            onChange={e => setFilterDept(e.target.value as Department | 'All')}
            className="input-field text-xs sm:w-44"
            aria-label="Filter by academic department"
          >
            <option value="All">All 4 Departments</option>
            {departments.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          {/* Category Filter */}
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="input-field text-xs sm:w-40"
            aria-label="Filter by equipment category"
          >
            {categories.map(c => (
              <option key={c} value={c}>{c === 'All' ? 'All Categories' : c}</option>
            ))}
          </select>

          {/* Availability Status Filter */}
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as AvailabilityStatus | 'All')}
            className="input-field text-xs sm:w-36"
            aria-label="Filter by availability status"
          >
            <option value="All">All Statuses</option>
            <option value="Available Now">Available Now</option>
            <option value="High Demand">High Demand</option>
            <option value="In Maintenance">In Maintenance</option>
          </select>

          {/* Safety & Prerequisite Filter */}
          <select
            value={filterPrereq}
            onChange={e => setFilterPrereq(e.target.value as 'All' | 'HasPrereq' | 'NoPrereq')}
            className="input-field text-xs sm:w-40"
            aria-label="Filter by prerequisite safety requirement"
          >
            <option value="All">All Requirements</option>
            <option value="NoPrereq">Open Access (No Certs)</option>
            <option value="HasPrereq">Requires Safety Induction</option>
          </select>
        </div>
      </div>

      {/* Results Telemetry Header */}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <p>
          Displaying <span className="font-bold text-slate-900 font-mono">{filtered.length}</span> of {equipment.length} specialized lab instruments
        </p>
        <span className="hidden sm:inline font-medium text-slate-400">Click any instrument card to inspect technical specifications</span>
      </div>

      {/* Equipment Grid */}
      <div
        ref={gridRef}
        className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 reveal-wrapper ${isGridInView ? 'is-visible' : ''}`}
        role="region"
        aria-label="Equipment Catalog Grid"
      >
        {filtered.map(eq => {
          const sc = statusColors[eq.status];
          return (
            <article
              key={eq.id}
              className="card p-5 hover:border-slate-300 transition-colors flex flex-col justify-between group focus-within:ring-2 focus-within:ring-slate-900"
              tabIndex={0}
              onKeyDown={e => {
                if (e.key === 'Enter') setDetailEquipment(eq);
              }}
              aria-label={`${eq.name}, ${eq.department}, status: ${eq.status}`}
            >
              <div>
                {/* Header: Icon + Category + Status Badge */}
                <div className="flex items-start justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xl" aria-hidden="true">{categoryIcons[eq.category] || '🔬'}</span>
                    <span className="text-[11px] font-medium text-slate-500 font-mono">{eq.category}</span>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${sc.bg} ${sc.text} ring-1 ring-inset ${sc.ring}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} aria-hidden="true"></span>
                    {eq.status}
                  </span>
                </div>

                {/* Name & Location */}
                <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors leading-snug">
                  {eq.name}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                  {eq.department} · <span className="text-slate-700">{eq.location}</span>
                </p>

                {/* Technical Specifications */}
                <p className="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100 font-mono text-[11px]">
                  {eq.specs}
                </p>

                {/* Research Tags */}
                <div className="flex flex-wrap gap-1 mt-3" aria-label="Research Tags">
                  {eq.tags.slice(0, 4).map(tag => (
                    <span key={tag} className="rounded-md bg-slate-100/90 px-2 py-0.5 text-[10px] text-slate-600 font-medium font-mono">
                      #{tag}
                    </span>
                  ))}
                  {eq.tags.length > 4 && (
                    <span className="rounded-md bg-slate-100/90 px-1.5 py-0.5 text-[10px] text-slate-400 font-mono">
                      +{eq.tags.length - 4}
                    </span>
                  )}
                </div>

                {/* Safety Prerequisites */}
                {eq.prerequisites.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-slate-100">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Safety Prerequisites</p>
                    <div className="flex flex-wrap gap-1">
                      {eq.prerequisites.map(pr => (
                        <span key={pr} className="rounded bg-amber-50 border border-amber-200/80 px-1.5 py-0.5 text-[10px] text-amber-800 font-medium">
                          ✓ {pr}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Card Footer Actions */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setDetailEquipment(eq)}
                  className="text-xs text-slate-500 hover:text-slate-900 font-medium transition-colors"
                  aria-label={`View full technical specifications for ${eq.name}`}
                >
                  Specs & Details ↗
                </button>
                <button
                  type="button"
                  onClick={() => onSelectEquipment(eq)}
                  className="btn-primary text-xs py-1.5 px-3"
                  aria-label={`Book slot for ${eq.name}`}
                >
                  Book Slot →
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="card p-12 text-center space-y-2">
          <p className="text-3xl" aria-hidden="true">🔍</p>
          <p className="text-sm font-semibold text-slate-800">No equipment matches current search & filter criteria</p>
          <p className="text-xs text-slate-400">Try clearing one or more filters or searching for alternative research tags.</p>
          <button
            type="button"
            onClick={() => {
              setSearchInput('');
              setFilterDept('All');
              setFilterCategory('All');
              setFilterStatus('All');
              setFilterPrereq('All');
            }}
            className="btn-secondary text-xs mt-2"
          >
            Reset All Filters
          </button>
        </div>
      )}

      {/* Equipment Rich Detail Modal */}
      {detailEquipment && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="eq-detail-title"
        >
          <div
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs"
            onClick={() => setDetailEquipment(null)}
          ></div>

          <div
            ref={detailModalRef}
            className="relative bg-white rounded-2xl shadow-elevated border border-slate-200/80 max-w-xl w-full p-6 space-y-5 max-h-[85vh] overflow-y-auto animate-modal-enter"
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <span className="w-12 h-12 rounded-xl bg-slate-100 text-slate-800 border border-slate-200/80 flex items-center justify-center text-2xl flex-shrink-0" aria-hidden="true">
                  {categoryIcons[detailEquipment.category] || '🔬'}
                </span>
                <div>
                  <h2 id="eq-detail-title" className="text-base font-bold text-slate-900 leading-tight">
                    {detailEquipment.name}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5 font-medium">
                    {detailEquipment.department} · {detailEquipment.location}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDetailEquipment(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                aria-label="Close detail modal"
              >
                ✕
              </button>
            </div>

            {/* Status & Daily Limit */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80">
                <span className="text-slate-500 block">Availability Status</span>
                <span className="font-bold text-slate-800 text-sm mt-0.5 block">{detailEquipment.status}</span>
              </div>
              <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80">
                <span className="text-slate-500 block">Daily Quota Limit</span>
                <span className="font-bold text-slate-800 text-sm mt-0.5 block font-mono">Max {detailEquipment.maxDailyHours}h / student</span>
              </div>
            </div>

            {/* Technical Specs */}
            <div className="space-y-1.5">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Detailed Specifications</h3>
              <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200/80 font-mono">
                {detailEquipment.specs}
              </p>
            </div>

            {/* Safety & Prerequisite Certifications */}
            <div className="space-y-1.5">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Mandatory Safety Induction</h3>
              {detailEquipment.prerequisites.length > 0 ? (
                <ul className="space-y-1">
                  {detailEquipment.prerequisites.map(pr => (
                    <li key={pr} className="text-xs text-slate-700 flex items-center gap-2">
                      <span className="text-emerald-600 font-bold">✓</span>
                      <span>{pr}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-500">Standard campus laboratory induction required; no specialized certs needed.</p>
              )}
            </div>

            {/* Cross-Department Substitutes */}
            {detailEquipment.substitutes.length > 0 && (
              <div className="space-y-1.5">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Registered Cross-Department Substitutes</h3>
                <p className="text-xs text-slate-600">
                  Equivalent equipment in other labs for automated load balancing:
                  <span className="font-semibold text-indigo-700 ml-1">
                    {detailEquipment.substitutes.join(', ')}
                  </span>
                </p>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDetailEquipment(null)}
                className="btn-secondary flex-1 text-xs"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const eq = detailEquipment;
                  setDetailEquipment(null);
                  onSelectEquipment(eq);
                }}
                className="btn-primary flex-1 text-xs"
              >
                Proceed to Slot Booking →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
