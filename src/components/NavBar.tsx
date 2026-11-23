// ============================================================
// LabLink — Top Navigation Bar with Role & Persona Switcher
// WCAG 2.1 AA Compliant with Hybrid Cloud/Local Sync Badge
// ============================================================

import { useState, useRef, useEffect } from 'react';
import type { Persona, UserRole, SyncStatus } from '../types';

interface NavBarProps {
  currentPersona: Persona;
  personas: Persona[];
  onSwitchPersona: (persona: Persona) => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onReset: () => void;
  syncStatus: SyncStatus;
}

const roleIcons: Record<UserRole, string> = {
  student: '🎓',
  faculty: '👩‍🔬',
  admin: '📊',
};

const roleBadgeColors: Record<UserRole, string> = {
  student: 'bg-indigo-50 text-indigo-800 ring-1 ring-indigo-600/20',
  faculty: 'bg-purple-50 text-purple-800 ring-1 ring-purple-600/20',
  admin: 'bg-amber-50 text-amber-800 ring-1 ring-amber-600/20',
};

export default function NavBar({
  currentPersona,
  personas,
  onSwitchPersona,
  activeTab,
  onTabChange,
  onReset,
  syncStatus,
}: NavBarProps) {
  const [showSwitcher, setShowSwitcher] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showSyncInfo, setShowSyncInfo] = useState(false);
  const switcherRef = useRef<HTMLDivElement>(null);
  const switcherBtnRef = useRef<HTMLButtonElement>(null);

  // Close dropdown on outside click or Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (switcherRef.current && !switcherRef.current.contains(event.target as Node)) {
        setShowSwitcher(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        if (showSwitcher) {
          setShowSwitcher(false);
          switcherBtnRef.current?.focus();
        }
        if (showResetConfirm) setShowResetConfirm(false);
        if (showSyncInfo) setShowSyncInfo(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showSwitcher, showResetConfirm, showSyncInfo]);

  const tabs = currentPersona.role === 'student'
    ? [
        { id: 'discover', label: 'Equipment Discovery', icon: '🔬' },
        { id: 'booking', label: 'Slot Booking', icon: '📅' },
        { id: 'requests', label: 'My Requests', icon: '📋' },
        { id: 'dashboard', label: 'Lab Analytics', icon: '📊' },
      ]
    : currentPersona.role === 'faculty'
    ? [
        { id: 'approvals', label: 'Approval Queue', icon: '✅' },
        { id: 'discover', label: 'Equipment', icon: '🔬' },
        { id: 'booking', label: 'All Bookings', icon: '📅' },
        { id: 'dashboard', label: 'Lab Analytics', icon: '📊' },
      ]
    : [
        { id: 'dashboard', label: 'Analytics Dashboard', icon: '📊' },
        { id: 'discover', label: 'Equipment', icon: '🔬' },
        { id: 'approvals', label: 'Approvals', icon: '✅' },
        { id: 'booking', label: 'All Bookings', icon: '📅' },
      ];

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-40">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6" role="navigation" aria-label="Main Navigation">
        {/* Top bar */}
        <div className="flex items-center justify-between h-16">
          {/* Logo & Sync Status Badge */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-900 flex items-center justify-center text-white shadow-sm flex-shrink-0 ring-1 ring-black/5">
              <svg className="w-5 h-5 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M6 20V4h4v14h8v2H6z" />
                <circle cx="18" cy="8" r="3" />
                <path d="M18 7v2h2" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg font-bold tracking-tight text-slate-900 leading-tight">LabLink</span>
                {/* Hybrid Sync Badge */}
                <button
                  type="button"
                  onClick={() => setShowSyncInfo(true)}
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border transition-colors ${
                    syncStatus.mode === 'cloud'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200/90 hover:bg-emerald-100'
                      : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200/80'
                  }`}
                  title={`${syncStatus.label}: ${syncStatus.detail} (Click for details)`}
                  aria-label={`Sync Status: ${syncStatus.label}`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      syncStatus.connected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                    }`}
                  ></span>
                  <span>{syncStatus.label}</span>
                </button>
              </div>
              <p className="text-[10px] text-slate-500 font-medium leading-tight">Campus STEM Laboratory Resource Sharing</p>
            </div>
          </div>

          {/* Right actions: Reset Demo + Persona Switcher */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              className="text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors px-2.5 py-1.5 rounded-lg border border-slate-200/90 bg-white hover:bg-slate-50 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
              title="Reset all demo bookings & requests to default seed state"
              aria-label="Reset demo data to initial state"
            >
              <span className="inline-block mr-1 font-mono text-slate-400">↺</span>
              <span className="hidden sm:inline">Reset Demo</span>
            </button>

            {/* Persona Switcher Dropdown */}
            <div className="relative" ref={switcherRef}>
              <button
                ref={switcherBtnRef}
                type="button"
                onClick={() => setShowSwitcher(!showSwitcher)}
                className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl border border-slate-200/90 bg-slate-50/80 hover:bg-slate-100/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 active:scale-[0.98]"
                aria-expanded={showSwitcher}
                aria-haspopup="listbox"
                aria-label={`Active persona: ${currentPersona.label}. Click to switch role.`}
              >
                <span className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center text-xs font-semibold shadow-2xs font-mono">
                  {currentPersona.user.avatarInitials}
                </span>
                <div className="text-left hidden md:block">
                  <div className="text-xs font-semibold text-slate-800 leading-tight">{currentPersona.user.name}</div>
                  <div className="text-[10px] text-slate-500 truncate max-w-[120px]">{currentPersona.user.title}</div>
                </div>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${roleBadgeColors[currentPersona.role]}`}>
                  <span className="mr-0.5" aria-hidden="true">{roleIcons[currentPersona.role]}</span>
                  {currentPersona.role.charAt(0).toUpperCase() + currentPersona.role.slice(1)}
                </span>
                <svg
                  className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-fast ${showSwitcher ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
                </svg>
              </button>

              {/* Persona Switcher Dropdown Menu */}
              {showSwitcher && (
                <div
                  className="absolute right-0 mt-2 w-80 rounded-xl bg-white border border-slate-200 shadow-elevated py-1.5 z-50 animate-modal-enter"
                  role="listbox"
                  aria-label="Switch User Persona"
                >
                  <div className="px-3.5 py-2 border-b border-slate-100 flex items-center justify-between">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Instant Persona Switcher</p>
                    <span className="text-[10px] text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded font-semibold ring-1 ring-emerald-600/20">Zero Login Wall</span>
                  </div>
                  {personas.map(persona => {
                    const isSelected = persona.user.id === currentPersona.user.id;
                    return (
                      <button
                        key={persona.user.id}
                        type="button"
                        onClick={() => {
                          onSwitchPersona(persona);
                          setShowSwitcher(false);
                        }}
                        className={`w-full flex items-center gap-3 px-3.5 py-2.5 hover:bg-slate-50 transition-colors text-left ${
                          isSelected ? 'bg-slate-50/80 border-l-2 border-slate-900' : ''
                        }`}
                        role="option"
                        aria-selected={isSelected}
                      >
                        <span className="w-8 h-8 rounded-lg bg-slate-100 text-slate-800 border border-slate-200/80 flex items-center justify-center text-xs font-bold flex-shrink-0 font-mono">
                          {persona.user.avatarInitials}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-slate-900">{persona.label}</div>
                          <div className="text-[11px] text-slate-500 truncate">{persona.description}</div>
                        </div>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold flex-shrink-0 ${roleBadgeColors[persona.role]}`}>
                          {roleIcons[persona.role]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="flex gap-1 -mb-px overflow-x-auto border-t border-slate-100 pt-1" role="tablist" aria-label="Application Tabs">
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                id={`tab-${tab.id}`}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1 rounded-t-md ${
                  isActive
                    ? 'border-slate-900 text-slate-900 bg-slate-50/60'
                    : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
                }`}
                role="tab"
                aria-selected={isActive}
                aria-controls={`panel-${tab.id}`}
              >
                <span className="text-sm" aria-hidden="true">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Sync Status Explainer Modal */}
      {showSyncInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="sync-modal-title">
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs" onClick={() => setShowSyncInfo(false)}></div>
          <div className="relative bg-white rounded-2xl shadow-elevated border border-slate-200/80 max-w-md w-full p-6 space-y-4 animate-modal-enter">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">🔄</span>
                <h2 id="sync-modal-title" className="text-base font-bold text-slate-900">Hybrid Real-Time Sync Status</h2>
              </div>
              <button
                onClick={() => setShowSyncInfo(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                aria-label="Close sync status modal"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                <p className="font-semibold text-slate-900">Current Operating Mode: <span className="text-indigo-700">{syncStatus.label}</span></p>
                <p className="text-slate-500">{syncStatus.detail}</p>
              </div>
              <p>
                <strong>Primary Mode (Firebase Cloud Firestore):</strong> Activates automatically when <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-slate-800">VITE_FIREBASE_API_KEY</code> and <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-slate-800">VITE_FIREBASE_PROJECT_ID</code> are present in your environment. Pushes slot bookings and faculty approvals across global browsers in real time with atomic transactional conflict checks.
              </p>
              <p>
                <strong>Zero-Config Local Mode (Active by Default):</strong> Automatically falls back to reactive <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-slate-800">localStorage</code> + cross-tab listeners when running without cloud credentials, ensuring 100% demo functionality on any machine without setup.
              </p>
            </div>
            <button
              onClick={() => setShowSyncInfo(false)}
              className="btn-primary w-full text-xs py-2.5"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Reset Confirmation Dialog */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="reset-modal-title">
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs" onClick={() => setShowResetConfirm(false)}></div>
          <div className="relative bg-white rounded-2xl shadow-elevated border border-slate-200/80 max-w-sm w-full p-6 text-center space-y-4 animate-modal-enter">
            <div className="w-12 h-12 mx-auto rounded-full bg-amber-50 text-amber-700 border border-amber-200/80 flex items-center justify-center text-2xl">
              ⚠️
            </div>
            <div>
              <h2 id="reset-modal-title" className="text-base font-bold text-slate-900">Reset Demo Data?</h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                This will restore initial campus bookings, project requests, and realistic conflict scenarios across all personas.
              </p>
            </div>
            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="btn-secondary flex-1 text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onReset();
                  setShowResetConfirm(false);
                }}
                className="btn-danger flex-1 text-xs font-semibold"
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
