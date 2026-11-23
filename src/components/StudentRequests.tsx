// ============================================================
// LabLink — Student Requests & Access Hub ("My Requests")
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
}

const statusBadge: Record<string, string> = {
  'Approved': 'badge-green',
  'Approved with Modification': 'badge-blue',
  'Pending': 'badge-yellow',
  'Rejected': 'badge-red',
};

export default function StudentRequests({
  currentPersona,
  projectRequests,
  bookings,
  equipment,
  onOpenNewRequest,
  onNavigateToBooking,
}: StudentRequestsProps) {
  const userRequests = projectRequests.filter(pr => pr.userId === currentPersona.user.id);
  const userBookings = bookings.filter(b => b.userId === currentPersona.user.id && b.status !== 'Cancelled');

  return (
    <div className="space-y-6">
      {/* Student Profile & Quick Stats Header */}
      <div className="card p-6 bg-gradient-to-r from-brand-600 to-indigo-700 text-white border-0 shadow-md">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-2xl font-bold">
              {currentPersona.user.avatarInitials}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold">{currentPersona.user.name}</h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/20 text-white">
                  {currentPersona.user.department}
                </span>
              </div>
              <p className="text-sm text-indigo-100 mt-0.5">{currentPersona.user.title}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {currentPersona.user.completedSafety.map(cert => (
                  <span key={cert} className="inline-flex items-center gap-1 rounded bg-emerald-500/30 px-2 py-0.5 text-[11px] font-medium text-emerald-100 border border-emerald-400/30">
                    ✓ {cert}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onOpenNewRequest}
              className="inline-flex items-center gap-2 rounded-lg bg-white text-brand-700 font-semibold px-4 py-2.5 text-sm shadow hover:bg-brand-50 transition-all focus:outline-none focus:ring-2 focus:ring-white"
            >
              <span className="text-base font-bold">+</span>
              New Project Request
            </button>
          </div>
        </div>
      </div>

      {/* Two Column Grid: Project Requests & Current Bookings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Project Access Requests (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">Project Access Authorizations</h3>
            <span className="text-xs text-slate-500">{userRequests.length} submitted</span>
          </div>

          {userRequests.map(req => {
            const daysLeft = Math.ceil((new Date(req.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            return (
              <div key={req.id} className="card p-5 space-y-3">
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
                      Deadline: <span className="font-semibold text-rose-600">{daysLeft} days remaining</span>
                    </p>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 rounded-lg p-3 border border-slate-100">
                  {req.description}
                </p>

                {/* Equipment tag pills */}
                <div>
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Authorized Equipment</p>
                  <div className="flex flex-wrap gap-2">
                    {req.requiredEquipment.map(eqId => {
                      const eq = equipmentMap.get(eqId);
                      return (
                        <div
                          key={eqId}
                          className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-white border border-slate-200 text-xs text-slate-700"
                        >
                          <span className="font-medium">{eq?.name ?? eqId}</span>
                          <span className="text-[10px] text-slate-400">({eq?.department})</span>
                          {eq && (
                            <button
                              onClick={() => onNavigateToBooking(eq)}
                              className="text-[10px] text-brand-600 font-bold hover:underline ml-1"
                              title="Book this equipment"
                            >
                              Book →
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* AI Triage Brief */}
                {req.aiTriageBrief && (
                  <div className="rounded-xl bg-brand-50 border border-brand-200 p-3.5 text-xs text-slate-700 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-brand-800">
                      <span>🤖</span>
                      <span>Faculty Review & AI Triage Summary</span>
                    </div>
                    <p className="text-slate-600 leading-relaxed">{req.aiTriageBrief}</p>
                  </div>
                )}
              </div>
            );
          })}

          {userRequests.length === 0 && (
            <div className="card p-8 text-center text-slate-500 space-y-2">
              <p className="text-3xl">📋</p>
              <p className="font-medium text-slate-700">No project access requests yet</p>
              <p className="text-xs text-slate-400">Submit a project access request to gain authorization for high-demand lab equipment.</p>
              <button onClick={onOpenNewRequest} className="btn-primary text-xs mt-2">
                Create First Request
              </button>
            </div>
          )}
        </div>

        {/* Right Sidebar: Active Slot Bookings (1 col) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">Upcoming Reservations</h3>
            <span className="text-xs text-slate-500">{userBookings.length} slots</span>
          </div>

          <div className="space-y-3">
            {userBookings.map(bk => {
              const eq = equipmentMap.get(bk.equipmentId);
              return (
                <div key={bk.id} className="card p-4 space-y-2 border-l-4 border-l-brand-600">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h5 className="text-xs font-bold text-slate-900">{eq?.name ?? bk.equipmentId}</h5>
                      <p className="text-[11px] text-slate-500">{eq?.location}</p>
                    </div>
                    <span className={`badge ${
                      bk.status === 'Confirmed' ? 'badge-green' : 'badge-yellow'
                    } text-[10px]`}>
                      {bk.status}
                    </span>
                  </div>

                  <div className="text-xs text-slate-700 font-mono bg-slate-50 rounded p-1.5 border border-slate-200 flex items-center justify-between">
                    <span>{bk.slot.date}</span>
                    <span>{formatHour(bk.slot.startHour)} – {formatHour(bk.slot.endHour)}</span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                    <span>Priority Score: <strong className="text-brand-600 font-mono">{bk.priority}</strong></span>
                    <span className="text-slate-400">{bk.projectType}</span>
                  </div>
                </div>
              );
            })}

            {userBookings.length === 0 && (
              <div className="card p-6 text-center text-slate-500">
                <p className="text-2xl mb-1">📅</p>
                <p className="text-xs font-medium text-slate-700">No active bookings</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Reserve equipment from the Slot Booking tab.</p>
              </div>
            )}
          </div>

          {/* Fairness & Quota card */}
          <div className="card p-4 bg-slate-50 border border-slate-200 space-y-2">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Utilization & Fairness Balance</h4>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600">Hours Used This Term:</span>
              <span className="font-bold text-slate-800">{currentPersona.user.totalBookingHours}h / 60h</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div
                className="bg-brand-600 h-2 rounded-full"
                style={{ width: `${Math.min(100, (currentPersona.user.totalBookingHours / 60) * 100)}%` }}
              ></div>
            </div>
            <p className="text-[10px] text-slate-500 leading-tight">
              Fair scheduling bonus: students with lower historical hours receive priority boost during slot conflict resolution.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
