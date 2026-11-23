// ============================================================
// LabLink — Project Request Form Modal (FR5)
// Multi-Resource Access Proposals with AI Kit Pre-fill Support
// ============================================================

import { useState, useEffect, useRef } from 'react';
import type { Equipment, ProjectType, Persona, ProjectRequest } from '../types';
import type { RecommendedKit } from '../services/aiAssistant';
import { validateProjectRequest } from '../utils/validation';

interface ProjectRequestFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (request: Omit<ProjectRequest, 'id' | 'createdAt' | 'approvalStatus'>) => Promise<void>;
  equipment: Equipment[];
  currentPersona: Persona;
  initialKit?: RecommendedKit | null;
}

const projectTypes: ProjectType[] = ['Capstone', 'Research', 'Hackathon', 'Course Lab', 'Personal'];

export default function ProjectRequestForm({
  isOpen,
  onClose,
  onSubmit,
  equipment,
  currentPersona,
  initialKit,
}: ProjectRequestFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [teamMembers, setTeamMembers] = useState(currentPersona.user.name);
  const [facultyMentor, setFacultyMentor] = useState('Dr. Meera Nair');
  const [deadline, setDeadline] = useState('');
  const [projectType, setProjectType] = useState<ProjectType>('Capstone');
  const [requiredEquipment, setRequiredEquipment] = useState<string[]>([]);
  const [requiredHours, setRequiredHours] = useState(16);
  const [justification, setJustification] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Pre-fill if an initialKit was provided by AI Matcher
  useEffect(() => {
    if (initialKit) {
      setTitle(initialKit.title);
      setRequiredEquipment(initialKit.requiredEquipment);
      setRequiredHours(initialKit.requiredHours);
      setJustification(initialKit.justification);
      setProjectType(initialKit.projectType);
    }
  }, [initialKit]);

  // Set default deadline ~14 days out if empty
  useEffect(() => {
    if (isOpen) {
      if (!deadline) {
        const d = new Date();
        d.setDate(d.getDate() + 14);
        setDeadline(d.toISOString().split('T')[0]);
      }
      setTimeout(() => titleInputRef.current?.focus(), 50);
    } else {
      setErrorMsg(null);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    const validation = validateProjectRequest({
      title,
      description,
      teamMembers,
      facultyMentor,
      deadline,
      requiredEquipment,
      requiredHours,
      justification,
    });

    if (!validation.isValid) {
      const firstError = Object.values(validation.errors)[0];
      setErrorMsg(firstError || 'Validation error. Please check form fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        title,
        description,
        userId: currentPersona.user.id,
        userName: currentPersona.user.name,
        teamMembers: Array.isArray(validation.sanitized?.teamMembers)
          ? validation.sanitized!.teamMembers
          : [currentPersona.user.name],
        facultyMentor,
        deadline,
        projectType,
        requiredEquipment,
        requiredHours,
        justification,
      });

      // Reset form
      setTitle('');
      setDescription('');
      setRequiredEquipment([]);
      setJustification('');
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to submit proposal.');
    } finally {
      setIsSubmitting(false);
    }
  }

  function toggleEquipment(id: string) {
    setRequiredEquipment(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="request-form-title"
    >
      <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs" onClick={onClose}></div>

      <div
        ref={modalRef}
        className="relative bg-white rounded-2xl shadow-elevated border border-slate-200/80 max-w-2xl w-full max-h-[88vh] overflow-y-auto animate-modal-enter"
      >
        {/* Sticky Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-slate-100 px-6 py-4 rounded-t-2xl z-10 flex items-center justify-between">
          <div>
            <h2 id="request-form-title" className="text-base font-bold text-slate-900 leading-tight">
              📋 Multi-Resource Project Access Proposal
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Submit structured requests for simultaneous cross-department equipment reservations
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
            aria-label="Close project request form"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200/90 text-xs text-rose-800 font-semibold" role="alert">
              ⚠️ {errorMsg}
            </div>
          )}

          {initialKit && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200/90 text-xs text-emerald-800 flex items-center gap-2">
              <span>✨</span>
              <span>Pre-filled from GenAI Project Matcher recommendation!</span>
            </div>
          )}

          {/* Title */}
          <div>
            <label htmlFor="pr-title" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Project Title *
            </label>
            <input
              id="pr-title"
              ref={titleInputRef}
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g., Vision-Based Drone Obstacle Avoidance Pipeline"
              className="input-field text-xs sm:text-sm"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="pr-desc" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Project Description & Goals
            </label>
            <textarea
              id="pr-desc"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Explain project architecture, technical scope, and expected laboratory deliverables..."
              className="input-field min-h-[70px] text-xs sm:text-sm"
              rows={2}
            />
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="pr-type" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Project Milestone Type *
              </label>
              <select
                id="pr-type"
                value={projectType}
                onChange={e => setProjectType(e.target.value as ProjectType)}
                className="input-field text-xs"
              >
                {projectTypes.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="pr-deadline" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Final Submission Deadline *
              </label>
              <input
                id="pr-deadline"
                type="date"
                value={deadline}
                onChange={e => setDeadline(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="input-field text-xs"
                required
              />
            </div>

            <div>
              <label htmlFor="pr-team" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Team Members (Comma-Separated)
              </label>
              <input
                id="pr-team"
                type="text"
                value={teamMembers}
                onChange={e => setTeamMembers(e.target.value)}
                placeholder="e.g., Aarav Sharma, Sneha Gupta, Vikram Singh"
                className="input-field text-xs"
              />
            </div>

            <div>
              <label htmlFor="pr-mentor" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Faculty Mentor / Lab Coordinator
              </label>
              <input
                id="pr-mentor"
                type="text"
                value={facultyMentor}
                onChange={e => setFacultyMentor(e.target.value)}
                placeholder="e.g., Dr. Meera Nair"
                className="input-field text-xs"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="pr-hours" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Total Estimated Lab Hours Required (<span className="font-mono text-indigo-700">{requiredHours} hours</span>)
              </label>
              <input
                id="pr-hours"
                type="range"
                min={2}
                max={60}
                step={2}
                value={requiredHours}
                onChange={e => setRequiredHours(Number(e.target.value))}
                className="w-full accent-slate-900 cursor-pointer"
              />
            </div>
          </div>

          {/* Multi-Equipment Selection Checklist */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Select Equipment from Across Departments *
              </label>
              <span className="text-[11px] font-bold font-mono text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                {requiredEquipment.length} Selected
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto rounded-xl border border-slate-200/90 p-2.5 bg-slate-50/50">
              {equipment.map(eq => {
                const isChecked = requiredEquipment.includes(eq.id);
                return (
                  <label
                    key={eq.id}
                    className={`flex items-start gap-2.5 p-2 rounded-lg cursor-pointer transition-colors border text-xs ${
                      isChecked
                        ? 'bg-indigo-50/70 border-indigo-300 ring-1 ring-indigo-300'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleEquipment(eq.id)}
                      className="mt-0.5 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900 leading-tight truncate">{eq.name}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{eq.department} · {eq.location}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Academic Justification */}
          <div>
            <label htmlFor="pr-justify" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Resource Justification for Faculty Review
            </label>
            <textarea
              id="pr-justify"
              value={justification}
              onChange={e => setJustification(e.target.value)}
              placeholder="Why are these specific pieces of equipment critical? What testing or data collection will be completed?"
              className="input-field min-h-[60px] text-xs sm:text-sm"
              rows={2}
            />
          </div>

          {/* Form Actions */}
          <div className="flex gap-2.5 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1 text-xs"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim() || requiredEquipment.length === 0}
              className="btn-primary flex-1 text-xs sm:text-sm font-semibold"
            >
              {isSubmitting ? 'Submitting Proposal...' : 'Submit Proposal for Faculty Triage →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
