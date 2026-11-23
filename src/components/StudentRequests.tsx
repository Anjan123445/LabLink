// ============================================================
// LabLink — Student Requests Hub & Fairness Index (FR5)
// Live Project Statuses, Safety Credentials & Dynamic Fairness Score
// ============================================================

import type { ProjectRequest, Booking, Persona, Equipment } from '../types';
import { equipmentMap } from '../data/equipment';
import { formatHour } from '../engine';

interface StudentRequestsProps {
  currentPersona: Persona;
  projectRequests: ProjectRequest[];
  bookings: Booking[];
  equipment: Equipment[];
  onOpenNewRequest: () => void;
  onNavigateToBooking: (eq: Equipment) => void;
  fairnessIndex: number;
  totalUsageHours: number;
}

const statusBadge: Record<string, string> = {
  Approved: 'badge-green',
  'Approved with Modification': 'badge-blue',
  'Changes Requested': 'badge-yellow',
  Pending: 'badge-yellow',
  Rejected: 'badge-red',
};

export default function StudentRequests({
  currentPersona,
  projectRequests,
  bookings,
  onOpenNewRequest,
  onNavigateToBooking,
  fairnessIndex,
  totalUsageHours,
}: StudentRequestsProps) {
  const userRequests = projectRequests.filter(pr => pr.userId === currentPersona.user.id);
  const userBookings = bookings.filter(b => b.userId === currentPersona.user.id && b.status !== 'Cancelled');

  const maxHoursAllowance = 60;
  const usagePct = Math.min(100, Math.round((totalUsageHours / maxHoursAllowance) * 100));

  return (
    <div className="space-y-6">
      {/* Student Profile & Fairness Score Banner */}
      <div className="card p-6 bg-gradient-to-r from-brand-600 via-indigo-600 to-indigo-700 text-white border-0 shadow-md">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-xl font-bold flex-shrink-0">
              {currentPersona.user.avatarInitials}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-bold">{currentPersona.user.name}</h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/20 text-white">
                  {currentPersona.user.department}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-indigo-100 mt-0.5">{currentPersona.user.title}</p>
              <div className="flex flex-wrap gap-1.5 mt-2" aria-label="Completed Safety Certifications">
                {currentPersona.user.completedSafety.map(cert => (
                  <span
                    key={cert}
                    className="inline-flex items-center gap-1 rounded-md bg-emerald-500/30 px-2 py-0.5 text-[11px] font-medium text-emerald-100 border border-emerald-400/30"
                  >
                    ✓ {cert}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onOpenNewRequest}
              className="btn-success w-full sm:w-auto text-xs sm:text-sm font-bold shadow-md"
              aria-label="Create a new project access request proposal"
            >
              + New Project Proposal
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Project Authorizations (2 cols) + Active Bookings & Quota (1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Project Access Proposals (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Project Access Proposals ({userRequests.length})
            </h3>
            <span className="text-xs text-slate-500">Track faculty reviews in real time</span>
          </div>

          {userRequests.map(req => {
            const deadlineTime = new Date(req.deadline).getTime();
            const daysLeft = Math.max(0, Math.ceil((deadlineTime - Date.now()) / (1000 * 60 * 60 * 24)));

            return (
              <article key={req.id} className="card p-5 space-y-3 shadow-sm border-l-4 border-l-brand-600">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-slate-900">{req.title}</h4>
                      <span className={statusBadge[req.approvalStatus] || 'badge-blue'}>
                        {req.approvalStatus}
                      </span>
                      <span className="badge badge-purple text-[10px]">{req.projectType}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Mentor: <span className="font-semibold text-slate-700">{req.facultyMentor || 'Dr. Meera Nair'}</span> · 
                      Deadline: <span className="font-semibold text-rose-600">{daysLeft} days remaining</span> ({req.deadline})
                    </p>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 rounded-xl p-3 border border-slate-100">
                  {req.description}
                </p>

                {/* Requested Equipment List */}
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Authorized Laboratory Hardware
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {req.requiredEquipment.map(eqId => {
                      const eq = equipmentMap.get(eqId);
                      return (
                        <div
                          key={eqId}
                          className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 shadow-2xs"
                        >
                          <span className="font-semibold">{eq?.name ?? eqId}</span>
                          <span className="text-[10px] text-slate-400">({eq?.department})</span>
                          {eq && (
                            <button
                              type="button"
                              onClick={() => onNavigateToBooking(eq)}
                              className="text-[11px] text-brand-600 font-bold hover:underline ml-1"
                              title={`Schedule slot for ${eq.name}`}
                            >
                              Book Slot →
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Faculty Feedback Note (if changes requested or rejected) */}
                {req.facultyFeedback && (
                  <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <span>📝</span>
                      <span>Faculty Reviewer Feedback:</span>
                    </div>
                    <p className="text-amber-800 leading-relaxed font-mono">{req.facultyFeedback}</p>
                  </div>
                )}

                {/* AI Triage Brief */}
                {req.aiTriageBrief && (
                  <div className="rounded-xl bg-brand-50/70 border border-brand-200 p-3 text-xs text-slate-700 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-brand-800">
                      <span>🤖</span>
                      <span>Faculty AI Triage Assessment</span>
                    </div>
                    <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">{req.aiTriageBrief}</p>
                  </div>
                )}
              </article>
            );
          })}

          {userRequests.length === 0 && (
            <div className="card p-10 text-center text-slate-500 space-y-2">
              <p className="text-3xl" aria-hidden="true">📋</p>
              <p className="text-sm font-semibold text-slate-700">No project access proposals submitted</p>
              <p className="text-xs text-slate-400">Submit a proposal to obtain multi-resource approvals from lab coordinators.</p>
              <button
                type="button"
                onClick={onOpenNewRequest}
                className="btn-primary text-xs mt-2"
              >
                Create First Proposal
              </button>
            </div>
          )}
        </div>

        {/* Sidebar: Active Slot Bookings & Live Fairness Quota (1 col) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Upcoming Reservations ({userBookings.length})
            </h3>
            <span className="text-xs text-slate-500">Active slots</span>
          </div>

          <div className="space-y-3">
            {userBookings.map(bk => {
              const eq = equipmentMap.get(bk.equipmentId);
              return (
                <div key={bk.id} className="card p-3.5 space-y-2 border-l-4 border-l-brand-600 shadow-2xs">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h5 className="text-xs font-bold text-slate-900">{eq?.name ?? bk.equipmentId}</h5>
                      <p className="text-[11px] text-slate-500">{eq?.location}</p>
                    </div>
                    <span className={`badge ${bk.status === 'Confirmed' ? 'badge-green' : 'badge-yellow'} text-[10px]`}>
                      {bk.status}
                    </span>
                  </div>

                  <div className="text-xs font-mono bg-slate-50 rounded-lg p-2 border border-slate-200 flex items-center justify-between text-slate-700">
                    <span>{bk.slot.date}</span>
                    <span>{formatHour(bk.slot.startHour)} – {formatHour(bk.slot.endHour)}</span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                    <span>Priority Score: <strong className="text-brand-600 font-mono font-bold">{bk.priority}</strong></span>
                    <span className="text-slate-400">{bk.projectType}</span>
                  </div>
                </div>
              );
            })}

            {userBookings.length === 0 && (
              <div className="card p-6 text-center text-slate-500">
                <p className="text-2xl" aria-hidden="true">📅</p>
                <p className="text-xs font-semibold text-slate-700 mt-1">No active slot reservations</p>
                <p className="text-[11px] text-slate-400">Head to Slot Booking to reserve your hours.</p>
              </div>
            )}
          </div>

          {/* Student Historical Fairness & Quota Metric Card (FR4 & FR5) */}
          <div className="card p-5 bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Fairness Index & Usage Quota
              </h4>
              <span className="badge badge-purple text-[10px] font-mono">
                Index: {fairnessIndex}/100
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>Semester Lab Hours Used:</span>
                <span className="font-bold text-slate-900 font-mono">
                  {totalUsageHours}h / {maxHoursAllowance}h ({usagePct}%)
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-2.5 rounded-full transition-all ${
                    usagePct >= 80 ? 'bg-amber-500' : 'bg-brand-600'
                  }`}
                  style={{ width: `${usagePct}%` }}
                ></div>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              <strong>Fair Scheduling Guarantee:</strong> Students with lower historical utilization automatically receive priority boosts during slot conflict resolution, preventing resource hoarding by single research groups.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
