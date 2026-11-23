// ============================================================
// LabLink — Faculty Approval Queue & AI Triage (FR6)
// Automated Risk Telemetry, AI Triage Briefs & Working Action Modals
// ============================================================

import { useState } from 'react';
import type { ProjectRequest, Booking, ApprovalStatus } from '../types';
import { equipmentMap } from '../data/equipment';
import { generateApprovalTriageBrief } from '../services/aiAssistant';

interface ApprovalQueueProps {
  projectRequests: ProjectRequest[];
  bookings: Booking[];
  onUpdateApproval: (
    id: string,
    status: ApprovalStatus,
    feedback?: string,
    brief?: string
  ) => Promise<void>;
}

const statusColors: Record<ApprovalStatus, string> = {
  Pending: 'badge-yellow',
  Approved: 'badge-green',
  'Approved with Modification': 'badge-blue',
  'Changes Requested': 'badge-yellow',
  Rejected: 'badge-red',
};

const statusIcons: Record<ApprovalStatus, string> = {
  Pending: '⏳',
  Approved: '✅',
  'Approved with Modification': '📝',
  'Changes Requested': '✏️',
  Rejected: '❌',
};

export default function ApprovalQueue({
  projectRequests,
  bookings,
  onUpdateApproval,
}: ApprovalQueueProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<ApprovalStatus | 'All'>('All');
  const [feedbackModalRequest, setFeedbackModalRequest] = useState<{
    request: ProjectRequest;
    targetStatus: 'Changes Requested' | 'Rejected' | 'Approved with Modification';
  } | null>(null);
  const [facultyFeedbackNote, setFacultyFeedbackNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filtered = filterStatus === 'All'
    ? projectRequests
    : projectRequests.filter(pr => pr.approvalStatus === filterStatus);

  const pendingCount = projectRequests.filter(pr => pr.approvalStatus === 'Pending').length;

  async function handleApproveDirect(pr: ProjectRequest) {
    setIsSubmitting(true);
    try {
      await onUpdateApproval(pr.id, 'Approved');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleOpenFeedback(
    pr: ProjectRequest,
    targetStatus: 'Changes Requested' | 'Rejected' | 'Approved with Modification'
  ) {
    const defaultNote =
      targetStatus === 'Changes Requested'
        ? 'Please stagger your required hours into 4-hour morning slots to avoid peak afternoon congestion.'
        : targetStatus === 'Approved with Modification'
        ? generateApprovalTriageBrief(pr, bookings)
        : 'Requested hours exceed available lab capacity for this project cycle. Consider cross-department alternatives.';

    setFacultyFeedbackNote(defaultNote);
    setFeedbackModalRequest({ request: pr, targetStatus });
  }

  async function handleSubmitFeedback() {
    if (!feedbackModalRequest) return;
    setIsSubmitting(true);
    try {
      await onUpdateApproval(
        feedbackModalRequest.request.id,
        feedbackModalRequest.targetStatus,
        facultyFeedbackNote.trim() || undefined,
        feedbackModalRequest.targetStatus === 'Approved with Modification' ? facultyFeedbackNote : undefined
      );
      setFeedbackModalRequest(null);
      setFacultyFeedbackNote('');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header & Status Filter Pills */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 card p-5">
        <div>
          <h2 className="text-base font-bold text-slate-900 leading-tight">Faculty Review & AI Triage Queue</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {pendingCount > 0 ? (
              <>
                <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded mr-1">
                  {pendingCount} Pending Triage
                </span>{' '}
                require coordinator review
              </>
            ) : (
              'All student research proposals reviewed'
            )}
          </p>
        </div>

        <div className="flex gap-1.5 flex-wrap" role="group" aria-label="Filter proposals by status">
          {(['All', 'Pending', 'Approved', 'Changes Requested', 'Rejected'] as const).map(status => (
            <button
              key={status}
              type="button"
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                filterStatus === status
                  ? 'bg-brand-600 text-white border-brand-600 shadow-2xs'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-brand-300'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Proposals Feed */}
      <div className="space-y-4" role="feed" aria-label="Faculty Approval Requests Feed">
        {filtered.map(pr => {
          const isExpanded = expandedId === pr.id;
          const deadlineTime = new Date(pr.deadline).getTime();
          const daysUntilDeadline = Math.max(0, Math.ceil((deadlineTime - Date.now()) / (1000 * 60 * 60 * 24)));
          const urgencyColor =
            daysUntilDeadline <= 3 ? 'text-red-600 font-extrabold' :
            daysUntilDeadline <= 7 ? 'text-amber-600 font-bold' :
            'text-slate-600';
          const urgencyLabel =
            daysUntilDeadline <= 3 ? 'CRITICAL DEADLINE' :
            daysUntilDeadline <= 7 ? 'HIGH URGENCY' :
            daysUntilDeadline <= 14 ? 'MODERATE' : 'FLEXIBLE';

          return (
            <article key={pr.id} className="card overflow-hidden shadow-sm">
              {/* Request Summary Row (Clickable) */}
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : pr.id)}
                className="w-full p-5 flex items-start gap-4 text-left hover:bg-slate-50/50 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500"
                aria-expanded={isExpanded}
                aria-label={`Toggle details for ${pr.title} by ${pr.userName}`}
              >
                <div className="w-10 h-10 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold flex-shrink-0" aria-hidden="true">
                  {pr.userName.split(' ').map(n => n[0]).join('')}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold text-slate-900 leading-tight">{pr.title}</h3>
                    <span className={statusColors[pr.approvalStatus]}>
                      {statusIcons[pr.approvalStatus]} {pr.approvalStatus}
                    </span>
                    <span className="badge badge-purple text-[10px]">{pr.projectType}</span>
                  </div>

                  <p className="text-xs text-slate-500 mt-1">
                    Student: <strong className="text-slate-800">{pr.userName}</strong> ·{' '}
                    <span className={urgencyColor}>{urgencyLabel} ({daysUntilDeadline}d remaining)</span> ·{' '}
                    <span>{pr.requiredHours}h requested</span>
                  </p>

                  <p className="text-xs text-slate-600 mt-1 truncate">
                    Equipment: {pr.requiredEquipment.map(id => equipmentMap.get(id)?.name ?? id).join(', ')}
                  </p>
                </div>

                <svg
                  className={`w-5 h-5 text-slate-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
                </svg>
              </button>

              {/* Expanded Inspection Section */}
              {isExpanded && (
                <div className="border-t border-slate-200 p-5 space-y-4 bg-slate-50/60 animate-fade-in">
                  {/* Proposal Metadata Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 bg-white rounded-lg border border-slate-200">
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">Research Team</span>
                      <span className="font-semibold text-slate-800 mt-0.5 block">{pr.teamMembers.join(', ')}</span>
                    </div>

                    <div className="p-3 bg-white rounded-lg border border-slate-200">
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">Faculty Mentor</span>
                      <span className="font-semibold text-slate-800 mt-0.5 block">{pr.facultyMentor || 'Dr. Meera Nair'}</span>
                    </div>

                    <div className="p-3 bg-white rounded-lg border border-slate-200">
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">Lab Hours Quota</span>
                      <span className="font-semibold text-slate-800 mt-0.5 block">{pr.requiredHours} Hours Total</span>
                    </div>

                    <div className="p-3 bg-white rounded-lg border border-slate-200">
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">Milestone Deadline</span>
                      <span className={`font-semibold mt-0.5 block ${urgencyColor}`}>{pr.deadline}</span>
                    </div>
                  </div>

                  {/* Student Technical Justification */}
                  {pr.justification && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Student Academic Justification:
                      </span>
                      <p className="text-xs text-slate-700 bg-white rounded-xl p-3 border border-slate-200 leading-relaxed">
                        {pr.justification}
                      </p>
                    </div>
                  )}

                  {/* AI Triage Brief (FR6) */}
                  <div className="rounded-xl bg-brand-50 border border-brand-200 p-4 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-brand-900">
                        <span aria-hidden="true">🤖</span>
                        <span>AI Triage Decision Support (Google Gemini / Smart Engine)</span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-100 text-brand-800">
                        Automated Risk Matrix
                      </span>
                    </div>
                    <div className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed font-sans">
                      {pr.aiTriageBrief || generateApprovalTriageBrief(pr, bookings)}
                    </div>
                  </div>

                  {/* Previous Feedback Note if changes requested */}
                  {pr.facultyFeedback && (
                    <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">
                      <strong>Current Faculty Feedback:</strong> {pr.facultyFeedback}
                    </div>
                  )}

                  {/* Faculty Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => handleApproveDirect(pr)}
                      disabled={isSubmitting || pr.approvalStatus === 'Approved'}
                      className="btn-success text-xs py-2 px-3.5 font-bold"
                      aria-label={`Approve request for ${pr.title}`}
                    >
                      ✅ Approve Proposal
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenFeedback(pr, 'Changes Requested')}
                      disabled={isSubmitting}
                      className="btn-secondary text-xs py-2 px-3.5 font-bold border-amber-300 text-amber-800 hover:bg-amber-50"
                      aria-label={`Request modifications with feedback for ${pr.title}`}
                    >
                      ✏️ Request Changes (with note)
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenFeedback(pr, 'Approved with Modification')}
                      disabled={isSubmitting}
                      className="btn-primary text-xs py-2 px-3.5 font-bold"
                      aria-label={`Approve with AI-Suggested modification for ${pr.title}`}
                    >
                      📝 Approve with AI Modification
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenFeedback(pr, 'Rejected')}
                      disabled={isSubmitting || pr.approvalStatus === 'Rejected'}
                      className="btn-danger text-xs py-2 px-3.5 font-bold"
                      aria-label={`Reject proposal for ${pr.title}`}
                    >
                      ❌ Reject
                    </button>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="card p-12 text-center text-slate-500 space-y-2">
          <p className="text-3xl" aria-hidden="true">📭</p>
          <p className="text-sm font-semibold text-slate-700">No project proposals match the selected filter</p>
          <p className="text-xs text-slate-400">Select "All" to inspect historical approvals and triaged requests.</p>
        </div>
      )}

      {/* Feedback Note Modal Dialog */}
      {feedbackModalRequest && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="feedback-modal-title"
        >
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setFeedbackModalRequest(null)}
          ></div>

          <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 id="feedback-modal-title" className="text-base font-bold text-slate-900">
                {feedbackModalRequest.targetStatus === 'Changes Requested'
                  ? '✏️ Request Modifications with Feedback'
                  : feedbackModalRequest.targetStatus === 'Approved with Modification'
                  ? '📝 Approve with Modification Instructions'
                  : '❌ Reject Proposal with Explanation'}
              </h3>
              <button
                type="button"
                onClick={() => setFeedbackModalRequest(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
                aria-label="Close feedback modal"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Project: <strong>{feedbackModalRequest.request.title}</strong> ({feedbackModalRequest.request.userName})
            </p>

            <div>
              <label htmlFor="fb-note" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Faculty Instructions / Feedback Note for Student *
              </label>
              <textarea
                id="fb-note"
                value={facultyFeedbackNote}
                onChange={e => setFacultyFeedbackNote(e.target.value)}
                rows={4}
                className="input-field text-xs sm:text-sm font-mono leading-relaxed"
                placeholder="Specify required changes, slot shifts, or prerequisite safety steps..."
                required
              />
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setFeedbackModalRequest(null)}
                className="btn-secondary flex-1 text-xs"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitFeedback}
                disabled={isSubmitting || !facultyFeedbackNote.trim()}
                className={`flex-1 text-xs font-bold ${
                  feedbackModalRequest.targetStatus === 'Rejected'
                    ? 'btn-danger'
                    : feedbackModalRequest.targetStatus === 'Approved with Modification'
                    ? 'btn-primary'
                    : 'btn-success'
                }`}
              >
                {isSubmitting ? 'Updating Status...' : 'Submit Decision & Notify Student'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
