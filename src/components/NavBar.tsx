// ============================================================
// LabLink — Top Navigation Bar with Role & Persona Switcher
// ============================================================

import { useState, useRef, useEffect } from 'react';
import type { Persona, UserRole } from '../types';

interface NavBarProps {
  currentPersona: Persona;
  personas: Persona[];
  onSwitchPersona: (persona: Persona) => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onReset: () => void;
}

const roleIcons: Record<UserRole, string> = {
  student: '🎓',
  faculty: '👩‍🔬',
  admin: '📊',
};

const roleBadgeColors: Record<UserRole, string> = {
  student: 'bg-blue-100 text-blue-700 ring-blue-600/20',
  faculty: 'bg-purple-100 text-purple-700 ring-purple-600/20',
  admin: 'bg-amber-100 text-amber-700 ring-amber-600/20',
};

export default function NavBar({
  currentPersona,
  personas,
  onSwitchPersona,
  activeTab,
  onTabChange,
  onReset,
}: NavBarProps) {
  const [showSwitcher, setShowSwitcher] = useState(false);
  const switcherRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (switcherRef.current && !switcherRef.current.contains(event.target as Node)) {
        setShowSwitcher(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    <nav className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-50" role="navigation" aria-label="Main navigation">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Top bar */}
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-brand-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 20V4h4v14h8v2H6z" />
                <circle cx="18" cy="8" r="3" />
                <path d="M18 7v2h2" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-tight">LabLink</h1>
              <p className="text-[10px] text-slate-500 leading-tight -mt-0.5">Smart Lab Access</p>
            </div>
          </div>

          {/* Right: Persona Switcher */}
          <div className="flex items-center gap-3">
            <button
              onClick={onReset}
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors px-2 py-1 rounded"
              title="Reset to seed data"
              aria-label="Reset data to initial state"
            >
              ↺ Reset
            </button>

            <div className="relative" ref={switcherRef}>
              <button
                onClick={() => setShowSwitcher(!showSwitcher)}
                className="flex items-center gap-2.5 pl-3 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-all focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
                aria-expanded={showSwitcher}
                aria-haspopup="listbox"
                aria-label="Switch user persona"
              >
                <span className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-semibold">
                  {currentPersona.user.avatarInitials}
                </span>
                <div className="text-left hidden sm:block">
                  <div className="text-sm font-semibold text-slate-800">{currentPersona.user.name}</div>
                  <div className="text-[11px] text-slate-500">{currentPersona.user.title}</div>
                </div>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${roleBadgeColors[currentPersona.role]}`}>
                  {roleIcons[currentPersona.role]} {currentPersona.role.charAt(0).toUpperCase() + currentPersona.role.slice(1)}
                </span>
                <svg className={`w-4 h-4 text-slate-400 transition-transform ${showSwitcher ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown */}
              {showSwitcher && (
                <div
                  className="absolute right-0 mt-2 w-80 rounded-xl bg-white border border-slate-200 shadow-xl py-2 z-50"
                  role="listbox"
                  aria-label="Select persona"
                >
                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Switch Persona</p>
                  </div>
                  {personas.map(persona => (
                    <button
                      key={persona.user.id}
                      onClick={() => { onSwitchPersona(persona); setShowSwitcher(false); }}
                      className={`w-full flex items-center gap-3 px-3 py-3 hover:bg-slate-50 transition-colors text-left ${
                        persona.user.id === currentPersona.user.id ? 'bg-brand-50 border-l-2 border-brand-500' : ''
                      }`}
                      role="option"
                      aria-selected={persona.user.id === currentPersona.user.id}
                    >
                      <span className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-semibold flex-shrink-0">
                        {persona.user.avatarInitials}
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-800">{persona.label}</div>
                        <div className="text-xs text-slate-500 truncate">{persona.description}</div>
                      </div>
                      <span className={`ml-auto inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset flex-shrink-0 ${roleBadgeColors[persona.role]}`}>
                        {roleIcons[persona.role]}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 -mb-px overflow-x-auto" role="tablist">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`panel-${tab.id}`}
            >
              <span className="text-base">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}
