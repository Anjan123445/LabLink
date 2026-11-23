// ============================================================
// LabLink — Main Application Component
// Cross-Department Academic Lab Access & Intelligent Scheduling
// ============================================================

import { useState } from 'react';
import { useAppStore } from './store/useAppStore';
import type { Equipment, Persona } from './types';

// Components
import NavBar from './components/NavBar';
import EquipmentDiscovery from './components/EquipmentDiscovery';
import SlotBooking from './components/SlotBooking';
import ApprovalQueue from './components/ApprovalQueue';
import Dashboard from './components/Dashboard';
import StudentRequests from './components/StudentRequests';
import AIMatcherModal from './components/AIMatcherModal';
import ProjectRequestForm from './components/ProjectRequestForm';

export default function App() {
  const {
    currentPersona,
    personas,
    equipment,
    bookings,
    projectRequests,
    utilizationData,
    switchPersona,
    addBooking,
    updateProjectApproval,
    addProjectRequest,
    getDashboardMetrics,
    resetToSeedData,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState('discover');
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [isAIMatcherOpen, setIsAIMatcherOpen] = useState(false);
  const [isProjectRequestOpen, setIsProjectRequestOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const metrics = getDashboardMetrics();

  function showToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }

  function handleSelectEquipmentForBooking(eq: Equipment) {
    setSelectedEquipment(eq);
    setActiveTab('booking');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handlePersonaSwitch(persona: Persona) {
    switchPersona(persona);
    if (persona.role === 'admin') {
      setActiveTab('dashboard');
    } else if (persona.role === 'faculty') {
      setActiveTab('approvals');
    } else {
      setActiveTab('discover');
    }
    showToast(`Switched to ${persona.label}`);
  }

  function handleReset() {
    resetToSeedData();
    setSelectedEquipment(null);
    showToast('Reset system to default campus seed data');
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl text-sm flex items-center gap-2 border border-slate-700 animate-fade-in" role="status">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          {toastMessage}
        </div>
      )}

      {/* Navigation & Role Switcher */}
      <NavBar
        currentPersona={currentPersona}
        personas={personas}
        onSwitchPersona={handlePersonaSwitch}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onReset={handleReset}
      />

      {/* Persona Context Banner */}
      <div className="bg-slate-100/80 border-b border-slate-200 py-2 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-2 truncate">
            <span className="font-semibold text-slate-700">Active Persona:</span>
            <span className="text-brand-700 font-medium">{currentPersona.label}</span>
            <span className="text-slate-400 hidden sm:inline">|</span>
            <span className="text-slate-500 hidden sm:inline">{currentPersona.description}</span>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className="text-slate-400 hidden md:inline">Single Branch: main</span>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full ring-1 ring-emerald-600/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Zero Auth / Instant Switcher
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6" id="main-content">
        {activeTab === 'discover' && (
          <section id="panel-discover" aria-label="Equipment Discovery">
            <EquipmentDiscovery
              equipment={equipment}
              onSelectEquipment={handleSelectEquipmentForBooking}
              onOpenAIMatcher={() => setIsAIMatcherOpen(true)}
            />
          </section>
        )}

        {activeTab === 'booking' && (
          <section id="panel-booking" aria-label="Slot Booking & Conflict Resolution">
            <SlotBooking
              equipment={equipment}
              bookings={bookings}
              currentPersona={currentPersona}
              selectedEquipment={selectedEquipment}
              onSelectEquipment={setSelectedEquipment}
              onAddBooking={booking => {
                addBooking(booking);
                showToast('Booking successfully recorded!');
              }}
            />
          </section>
        )}

        {activeTab === 'requests' && (
          <section id="panel-requests" aria-label="Student Requests">
            <StudentRequests
              currentPersona={currentPersona}
              projectRequests={projectRequests}
              bookings={bookings}
              equipment={equipment}
              onOpenNewRequest={() => setIsProjectRequestOpen(true)}
              onNavigateToBooking={handleSelectEquipmentForBooking}
            />
          </section>
        )}

        {activeTab === 'approvals' && (
          <section id="panel-approvals" aria-label="Faculty Approval Queue">
            <ApprovalQueue
              projectRequests={projectRequests}
              bookings={bookings}
              onUpdateApproval={(id, status, brief) => {
                updateProjectApproval(id, status, brief);
                showToast(`Request ${status.toLowerCase()} successfully`);
              }}
            />
          </section>
        )}

        {activeTab === 'dashboard' && (
          <section id="panel-dashboard" aria-label="Cross-Department Analytics">
            <Dashboard
              metrics={metrics}
              equipment={equipment}
              bookings={bookings}
              projectRequests={projectRequests}
              utilizationData={utilizationData}
              onSelectEquipment={handleSelectEquipmentForBooking}
            />
          </section>
        )}
      </main>

      {/* AI Project Matcher Modal */}
      <AIMatcherModal
        isOpen={isAIMatcherOpen}
        onClose={() => setIsAIMatcherOpen(false)}
        onSelectEquipment={handleSelectEquipmentForBooking}
      />

      {/* Project Request Form Modal */}
      <ProjectRequestForm
        isOpen={isProjectRequestOpen}
        onClose={() => setIsProjectRequestOpen(false)}
        onSubmit={req => {
          addProjectRequest(req);
          showToast('Project access request submitted for faculty triage');
        }}
        equipment={equipment}
        currentPersona={currentPersona}
      />

      {/* Accessible Footer */}
      <footer className="bg-white border-t border-slate-200 mt-12 py-6 text-center text-xs text-slate-500" role="contentinfo">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">LabLink</span>
            <span>— Higher Education STEM & Research Lab Access Platform</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>WCAG 2.1 AA Compliant</span>
            <span>·</span>
            <span>Deterministic Fair Allocation Engine</span>
            <span>·</span>
            <span>Google Gemini AI</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
