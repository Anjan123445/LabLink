// ============================================================
// LabLink — Main Application Component
// Principal Integration: WCAG 2.1 AA, Hybrid Sync, Error Boundary & State
// ============================================================

import { useState } from 'react';
import { useAppStore } from './store/useAppStore';
import type { Equipment, Persona } from './types';
import type { RecommendedKit } from './services/aiAssistant';

// Components
import ErrorBoundary from './components/ErrorBoundary';
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
    syncStatus,
    currentPersona,
    personas,
    equipment,
    bookings,
    projectRequests,
    utilizationData,
    switchPersona,
    addBooking,
    updateBookingStatus,
    acceptConflictRecommendation,
    addProjectRequest,
    updateProjectApproval,
    getDashboardMetrics,
    crossDeptAllocations,
    optimizationInsights,
    getStudentFairnessIndex,
    resetToSeedData,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState('discover');
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [isAIMatcherOpen, setIsAIMatcherOpen] = useState(false);
  const [isProjectRequestOpen, setIsProjectRequestOpen] = useState(false);
  const [prefilledKit, setPrefilledKit] = useState<RecommendedKit | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const metrics = getDashboardMetrics();
  const studentFairness = getStudentFairnessIndex(currentPersona.user.id);

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
    showToast(`Switched persona to ${persona.label}`);
  }

  async function handleReset() {
    await resetToSeedData();
    setSelectedEquipment(null);
    showToast('Reset system to default campus seed data');
  }

  function handleRequestRecommendedKit(kit: RecommendedKit) {
    setPrefilledKit(kit);
    setIsProjectRequestOpen(true);
    showToast('Multi-resource kit pre-filled from AI recommendations!');
  }

  return (
    <ErrorBoundary>
      {/* Skip to Main Content Link for WCAG Keyboard Navigation */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2.5 focus:bg-brand-600 focus:text-white focus:font-bold focus:rounded-xl focus:shadow-xl focus:outline-none focus:ring-2 focus:ring-white"
      >
        Skip to main content
      </a>

      <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
        {/* Dynamic Toast Notification (Accessible Live Region) */}
        {toastMessage && (
          <div
            className="fixed bottom-5 right-5 z-50 bg-slate-950 text-white px-4 py-2.5 rounded-xl shadow-elevated border border-slate-800 text-xs sm:text-sm flex items-center gap-2.5 animate-toast"
            role="status"
            aria-live="polite"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" aria-hidden="true"></span>
            <span className="font-medium text-slate-100">{toastMessage}</span>
          </div>
        )}

        {/* Navigation & Persona Switcher */}
        <NavBar
          currentPersona={currentPersona}
          personas={personas}
          onSwitchPersona={handlePersonaSwitch}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onReset={handleReset}
          syncStatus={syncStatus}
        />

        {/* Persona Context Sub-banner */}
        <div className="bg-white/70 backdrop-blur border-b border-slate-200/70 py-1.5 px-4 sm:px-6">
          <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-slate-600">
            <div className="flex items-center gap-2 truncate">
              <span className="font-semibold text-slate-500">Active Persona:</span>
              <span className="text-slate-900 font-semibold">{currentPersona.label}</span>
              <span className="text-slate-300 hidden sm:inline">|</span>
              <span className="text-slate-500 hidden sm:inline text-[11px]">{currentPersona.description}</span>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <span className="text-slate-400 font-mono text-[11px] hidden md:inline">git: main</span>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full ring-1 ring-emerald-600/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" aria-hidden="true"></span> Zero Auth Wall
              </span>
            </div>
          </div>
        </div>

        {/* Main Application Landmark */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6" id="main-content" tabIndex={-1}>
          {activeTab === 'discover' && (
            <section id="panel-discover" aria-labelledby="tab-discover">
              <EquipmentDiscovery
                equipment={equipment}
                onSelectEquipment={handleSelectEquipmentForBooking}
                onOpenAIMatcher={() => setIsAIMatcherOpen(true)}
              />
            </section>
          )}

          {activeTab === 'booking' && (
            <section id="panel-booking" aria-labelledby="tab-booking">
              <SlotBooking
                equipment={equipment}
                bookings={bookings}
                currentPersona={currentPersona}
                selectedEquipment={selectedEquipment}
                onSelectEquipment={setSelectedEquipment}
                onAddBooking={async booking => {
                  const res = await addBooking(booking);
                  showToast('Booking successfully recorded and synced!');
                  return res;
                }}
                onAcceptRecommendation={async (rec, incoming) => {
                  const res = await acceptConflictRecommendation(rec, incoming);
                  showToast(res.message);
                  return res;
                }}
              />
            </section>
          )}

          {activeTab === 'requests' && (
            <section id="panel-requests" aria-labelledby="tab-requests">
              <StudentRequests
                currentPersona={currentPersona}
                projectRequests={projectRequests}
                bookings={bookings}
                equipment={equipment}
                onOpenNewRequest={() => {
                  setPrefilledKit(null);
                  setIsProjectRequestOpen(true);
                }}
                onNavigateToBooking={handleSelectEquipmentForBooking}
                fairnessIndex={studentFairness.fairnessIndex}
                totalUsageHours={studentFairness.totalHours}
              />
            </section>
          )}

          {activeTab === 'approvals' && (
            <section id="panel-approvals" aria-labelledby="tab-approvals">
              <ApprovalQueue
                projectRequests={projectRequests}
                bookings={bookings}
                onUpdateApproval={async (id, status, feedback, brief) => {
                  await updateProjectApproval(id, status, feedback, brief);
                  showToast(`Request updated to ${status}`);
                }}
              />
            </section>
          )}

          {activeTab === 'dashboard' && (
            <section id="panel-dashboard" aria-labelledby="tab-dashboard">
              <Dashboard
                metrics={metrics}
                equipment={equipment}
                bookings={bookings}
                projectRequests={projectRequests}
                utilizationData={utilizationData}
                crossDeptAllocations={crossDeptAllocations}
                optimizationInsights={optimizationInsights}
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
          onRequestRecommendedKit={handleRequestRecommendedKit}
        />

        {/* Project Request Form Modal */}
        <ProjectRequestForm
          isOpen={isProjectRequestOpen}
          onClose={() => {
            setIsProjectRequestOpen(false);
            setPrefilledKit(null);
          }}
          onSubmit={async req => {
            await addProjectRequest(req);
            showToast('Project access request submitted for faculty triage!');
          }}
          equipment={equipment}
          currentPersona={currentPersona}
          initialKit={prefilledKit}
        />

        {/* Accessible Footer Landmark */}
        <footer className="bg-white border-t border-slate-200 mt-12 py-6 text-center text-xs text-slate-500" role="contentinfo">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800">LabLink</span>
              <span>— Higher Education STEM & Research Laboratory Access Platform</span>
            </div>
            <div className="flex items-center gap-4 text-slate-400">
              <span>WCAG 2.1 AA Compliant</span>
              <span>·</span>
              <span>Deterministic Fair Allocation Engine</span>
              <span>·</span>
              <span>Hybrid Cloud / Local Sync</span>
            </div>
          </div>
        </footer>
      </div>
    </ErrorBoundary>
  );
}
