// ============================================================
// LabLink — Faculty Approval Queue with AI Triage Briefs
// ============================================================

import { useState } from 'react';
import type { ProjectRequest, Booking, ApprovalStatus } from '../types';
import { equipmentMap } from '../data/equipment';
import { generateApprovalTriageBrief } from '../services/aiAssistant';

interface ApprovalQueueProps {
  projectRequests: ProjectRequest[];
  bookings: Booking[];
  onUpdateApproval: (id: string, status: ApprovalStatus, brief?: string) => void;
}

const statusColors: Record<ApprovalStatus, string> = {
  'Pending': 'badge-yellow',
  'Approved': 'badge-green',
  'Approved with Modification': 'badge-blue',
  'Rejected': 'badge-red',
};

const statusIcons: Record<ApprovalStatus, string> = {
  'Pending': '⏳',
  'Approved': '✅',
  'Approved with Modification': '📝',
  'Rejected': '❌',
};

export default function ApprovalQueue({ projectRequests, bookings, onUpdateApproval }: ApprovalQueueProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<ApprovalStatus | 'All'>('All');

  const filtered = filterStatus === 'All'
    ? projectRequests
    : projectRequests.filter(pr => pr.approvalStatus === filterStatus);

  const pendingCount = projectRequests.filter(pr => pr.approvalStatus === 'Pending').length;

  function handleApprove(pr: ProjectRequest) {
    onUpdateApproval(pr.id, 'Approved');
  }

  function handleApproveModified(pr: ProjectRequest) {
    const brief = generateApprovalTriageBrief(pr, bookings);
    onUpdateApproval(pr.id, 'Approved with Modification', brief);
  }

  function handleReject(pr: ProjectRequest) {
    onUpdateApproval(pr.id, 'Rejected');
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Faculty Approval Queue</h2>
          <p className="text-sm text-slate-500">
            {pendingCount > 0 ? (
              <><span className="font-semibold text-amber-600">{pendingCount} pending</span> request{pendingCount > 1 ? 's' : ''} require review</>
            ) : (
              'All requests reviewed'
            )}
          </p>
        </div>
        <div className="flex gap-2">
          {(['All', 'Pending', 'Approved', 'Rejected'] as const).map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filterStatus === status
                  ? 'bg-brand-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-brand-300'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Request cards */}
      <div className="space-y-4">
        {filtered.map(pr => {
          const isExpanded = expandedId === pr.id;
          const daysUntilDeadline = Math.ceil(
            (new Date(pr.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          );
          const urgencyColor = daysUntilDeadline <= 3 ? 'text-red-600' : daysUntilDeadline <= 7 ? 'text-amber-600' : 'text-slate-600';
          const urgencyLabel = daysUntilDeadline <= 3 ? 'CRITICAL' : daysUntilDeadline <= 7 ? 'HIGH' : daysUntilDeadline <= 14 ? 'MODERATE' : 'LOW';

          return (
            <article key={pr.id} className="card overflow-hidden">
              {/* Summary row */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : pr.id)}
                className="w-full p-5 flex items-start gap-4 text-left hover:bg-slate-50/50 transition-colors"
                aria-expanded={isExpanded}
              >
                <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-semibold flex-shrink-0">
                  {pr.userName.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold text-slate-900">{pr.title}</h3>
                    <span className={statusColors[pr.approvalStatus]}>
                      {statusIcons[pr.approvalStatus]} {pr.approvalStatus}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {pr.userName} · {pr.projectType} · 
                    <span className={`font-semibold ${urgencyColor}`}> {urgencyLabel} ({daysUntilDeadline}d to deadline)</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Equipment: {pr.requiredEquipment.map(id => equipmentMap.get(id)?.name ?? id).join(', ')}
                  </p>
                </div>
                <svg className={`w-5 h-5 text-slate-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
                </svg>
              </button>

              {/* Expanded details */}
              {isExpanded && (
                <div className="border-t border-slate-200 p-5 space-y-4 bg-slate-50/50">
                  {/* Project details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Team</p>
                      <p className="text-slate-700">{pr.teamMembers.join(', ')}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Faculty Mentor</p>
                      <p className="text-slate-700">{pr.facultyMentor || 'Not specified'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Hours Requested</p>
                      <p className="text-slate-700">{pr.requiredHours}h total</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Deadline</p>
                      <p className={`font-semibold ${urgencyColor}`}>{new Date(pr.deadline).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                    </div>
                  </div>

                  {/* Justification */}
                  {pr.justification && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Justification</p>
                      <p className="text-sm text-slate-700 bg-white rounded-lg p-3 border border-slate-200">{pr.justification}</p>
                    </div>
                  )}

                  {/* AI Triage Brief */}
                  {pr.aiTriageBrief && (
                    <div className="rounded-xl bg-brand-50 border border-brand-200 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm">🤖</span>
                        <span className="text-xs font-semibold text-brand-700 uppercase tracking-wider">AI Triage Brief</span>
                      </div>
                      <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                        {pr.aiTriageBrief}
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  {pr.approvalStatus === 'Pending' && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      <button onClick={() => handleApprove(pr)} className="btn-success text-sm">
                        ✅ Approve
                      </button>
                      <button onClick={() => handleApproveModified(pr)} className="btn-primary text-sm">
                        📝 Approve with AI-Suggested Modification
                      </button>
                      <button onClick={() => handleReject(pr)} className="btn-danger text-sm">
                        ❌ Request Modification
                      </button>
                    </div>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="card p-12 text-center">
          <p className="text-4xl mb-3">📭</p>
          <p className="text-slate-600 font-medium">No requests matching this filter</p>
        </div>
      )}
    </div>
  );
}
