// ============================================================
// LabLink — Equipment Discovery Panel with Search & Filters
// ============================================================

import { useState, useMemo } from 'react';
import type { Equipment, Department, EquipmentCategory, AvailabilityStatus } from '../types';
import { departments } from '../data/equipment';

interface EquipmentDiscoveryProps {
  equipment: Equipment[];
  onSelectEquipment: (eq: Equipment) => void;
  onOpenAIMatcher: () => void;
}

const categoryIcons: Record<string, string> = {
  'GPU Workstation': '🖥️',
  'Dev Kit': '🔧',
  'Oscilloscope & Hardware': '📟',
  'Fabrication': '🏭',
  'Sensor & Actuator': '📡',
  'Compute Cluster': '⚡',
  'Measurement & Analysis': '🔬',
};

const statusColors: Record<AvailabilityStatus, { bg: string; text: string; dot: string }> = {
  'Available Now': { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  'High Demand': { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  'In Maintenance': { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
};

export default function EquipmentDiscovery({
  equipment,
  onSelectEquipment,
  onOpenAIMatcher,
}: EquipmentDiscoveryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDept, setFilterDept] = useState<Department | 'All'>('All');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<AvailabilityStatus | 'All'>('All');

  const categories = useMemo(() => {
    const cats = new Set(equipment.map(e => e.category));
    return ['All', ...Array.from(cats)];
  }, [equipment]);

  const filtered = useMemo(() => {
    return equipment.filter(eq => {
      const matchesSearch = searchQuery === '' ||
        eq.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        eq.tags.some(t => t.includes(searchQuery.toLowerCase())) ||
        eq.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
        eq.specs.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDept = filterDept === 'All' || eq.department === filterDept;
      const matchesCat = filterCategory === 'All' || eq.category === filterCategory;
      const matchesStatus = filterStatus === 'All' || eq.status === filterStatus;
      return matchesSearch && matchesDept && matchesCat && matchesStatus;
    });
  }, [equipment, searchQuery, filterDept, filterCategory, filterStatus]);

  return (
    <div className="space-y-6">
      {/* AI Project Matcher CTA */}
      <div className="card p-5 bg-gradient-to-r from-brand-600 to-indigo-700 border-0 text-white">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <span className="text-2xl">✨</span>
              AI-Powered Equipment Matcher
            </h2>
            <p className="text-indigo-100 text-sm mt-1">
              Describe your project in natural language and let our AI recommend the best equipment across all departments.
            </p>
          </div>
          <button
            onClick={onOpenAIMatcher}
            className="inline-flex items-center gap-2 rounded-lg bg-white/20 backdrop-blur px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/30 transition-all focus:outline-none focus:ring-2 focus:ring-white/50 flex-shrink-0"
            aria-label="Open AI Project Matcher"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
            </svg>
            Describe Your Project
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <input
              type="search"
              placeholder="Search equipment, tags, departments..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="input-field pl-10"
              aria-label="Search equipment"
            />
          </div>
          <select
            value={filterDept}
            onChange={e => setFilterDept(e.target.value as Department | 'All')}
            className="input-field sm:w-48"
            aria-label="Filter by department"
          >
            <option value="All">All Departments</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="input-field sm:w-48"
            aria-label="Filter by category"
          >
            {categories.map(c => <option key={c} value={c}>{c === 'All' ? 'All Categories' : c}</option>)}
          </select>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as AvailabilityStatus | 'All')}
            className="input-field sm:w-40"
            aria-label="Filter by status"
          >
            <option value="All">All Status</option>
            <option value="Available Now">Available Now</option>
            <option value="High Demand">High Demand</option>
            <option value="In Maintenance">In Maintenance</option>
          </select>
        </div>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Showing <span className="font-semibold text-slate-700">{filtered.length}</span> of {equipment.length} items
        </p>
      </div>

      {/* Equipment Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(eq => {
          const sc = statusColors[eq.status];
          return (
            <article
              key={eq.id}
              className="card p-5 hover:shadow-md transition-shadow cursor-pointer group focus-within:ring-2 focus-within:ring-brand-500"
              onClick={() => onSelectEquipment(eq)}
              tabIndex={0}
              onKeyDown={e => { if (e.key === 'Enter') onSelectEquipment(eq); }}
              role="button"
              aria-label={`${eq.name} — ${eq.status}`}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{categoryIcons[eq.category] || '🔧'}</span>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${sc.bg} ${sc.text} ring-1 ring-inset ring-current/20`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`}></span>
                    {eq.status}
                  </span>
                </div>
              </div>

              {/* Name & Dept */}
              <h3 className="text-sm font-bold text-slate-900 group-hover:text-brand-600 transition-colors leading-snug">
                {eq.name}
              </h3>
              <p className="text-xs text-slate-500 mt-1">{eq.department} · {eq.location}</p>

              {/* Specs */}
              <p className="text-xs text-slate-600 mt-2 line-clamp-2">{eq.specs}</p>

              {/* Tags */}
              <div className="flex flex-wrap gap-1 mt-3">
                {eq.tags.slice(0, 4).map(tag => (
                  <span key={tag} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600 font-medium">
                    {tag}
                  </span>
                ))}
                {eq.tags.length > 4 && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
                    +{eq.tags.length - 4}
                  </span>
                )}
              </div>

              {/* Prerequisites */}
              {eq.prerequisites.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Prerequisites</p>
                  <div className="flex flex-wrap gap-1">
                    {eq.prerequisites.map(pr => (
                      <span key={pr} className="rounded bg-orange-50 px-1.5 py-0.5 text-[10px] text-orange-700 font-medium">
                        {pr}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">Max {eq.maxDailyHours}h/day</span>
                <span className="text-[11px] text-brand-600 font-semibold group-hover:underline">
                  Book Now →
                </span>
              </div>
            </article>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="card p-12 text-center">
          <p className="text-4xl mb-3">🔍</p>
          <p className="text-slate-600 font-medium">No equipment matches your filters</p>
          <p className="text-sm text-slate-400 mt-1">Try adjusting your search or filters</p>
        </div>
      )}
    </div>
  );
}
