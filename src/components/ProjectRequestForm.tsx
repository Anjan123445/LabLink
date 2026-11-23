// ============================================================
// LabLink — Project Request Form Modal
// ============================================================

import { useState } from 'react';
import type { Equipment, ProjectType, Persona } from '../types';

interface ProjectRequestFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (request: any) => void;
  equipment: Equipment[];
  currentPersona: Persona;
}

const projectTypes: ProjectType[] = ['Capstone', 'Research', 'Hackathon', 'Course Lab', 'Personal'];

export default function ProjectRequestForm({
  isOpen,
  onClose,
  onSubmit,
  equipment,
  currentPersona,
}: ProjectRequestFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [teamMembers, setTeamMembers] = useState(currentPersona.user.name);
  const [facultyMentor, setFacultyMentor] = useState('');
  const [deadline, setDeadline] = useState('');
  const [projectType, setProjectType] = useState<ProjectType>('Capstone');
  const [requiredEquipment, setRequiredEquipment] = useState<string[]>([]);
  const [requiredHours, setRequiredHours] = useState(10);
  const [justification, setJustification] = useState('');

  if (!isOpen) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !deadline || requiredEquipment.length === 0) return;

    onSubmit({
      title: title.trim(),
      description: description.trim(),
      userId: currentPersona.user.id,
      userName: currentPersona.user.name,
      teamMembers: teamMembers.split(',').map(s => s.trim()).filter(Boolean),
      facultyMentor: facultyMentor.trim(),
      deadline,
      projectType,
      requiredEquipment,
      requiredHours: Math.max(1, requiredHours),
      justification: justification.trim(),
    });

    // Reset form
    setTitle(''); setDescription(''); setTeamMembers(currentPersona.user.name);
    setFacultyMentor(''); setDeadline(''); setProjectType('Capstone');
    setRequiredEquipment([]); setRequiredHours(10); setJustification('');
    onClose();
  }

  function toggleEquipment(id: string) {
    setRequiredEquipment(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="New Project Request">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto">
        <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-slate-200 px-6 py-4 rounded-t-2xl z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">📋 New Project Access Request</h2>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100" aria-label="Close">
              <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label htmlFor="pr-title" className="text-sm font-semibold text-slate-700 mb-1 block">Project Title *</label>
              <input id="pr-title" type="text" value={title} onChange={e => setTitle(e.target.value)} className="input-field" placeholder="e.g., Autonomous Drone Navigation System" required />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="pr-desc" className="text-sm font-semibold text-slate-700 mb-1 block">Description</label>
              <textarea id="pr-desc" value={description} onChange={e => setDescription(e.target.value)} className="input-field min-h-[80px]" placeholder="Brief project description..." />
            </div>

            <div>
              <label htmlFor="pr-type" className="text-sm font-semibold text-slate-700 mb-1 block">Project Type *</label>
              <select id="pr-type" value={projectType} onChange={e => setProjectType(e.target.value as ProjectType)} className="input-field">
                {projectTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div>
              <label htmlFor="pr-deadline" className="text-sm font-semibold text-slate-700 mb-1 block">Deadline *</label>
              <input id="pr-deadline" type="date" value={deadline} onChange={e => setDeadline(e.target.value)} className="input-field" required min={new Date().toISOString().split('T')[0]} />
            </div>

            <div>
              <label htmlFor="pr-team" className="text-sm font-semibold text-slate-700 mb-1 block">Team Members</label>
              <input id="pr-team" type="text" value={teamMembers} onChange={e => setTeamMembers(e.target.value)} className="input-field" placeholder="Comma-separated names" />
            </div>

            <div>
              <label htmlFor="pr-faculty" className="text-sm font-semibold text-slate-700 mb-1 block">Faculty Mentor</label>
              <input id="pr-faculty" type="text" value={facultyMentor} onChange={e => setFacultyMentor(e.target.value)} className="input-field" placeholder="e.g., Dr. Meera Nair" />
            </div>

            <div>
              <label htmlFor="pr-hours" className="text-sm font-semibold text-slate-700 mb-1 block">Required Hours</label>
              <input id="pr-hours" type="number" value={requiredHours} onChange={e => setRequiredHours(Number(e.target.value))} className="input-field" min={1} max={100} />
            </div>
          </div>

          {/* Equipment picker */}
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-2">Required Equipment * <span className="text-xs text-slate-400 font-normal">({requiredEquipment.length} selected)</span></p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto rounded-lg border border-slate-200 p-2">
              {equipment.map(eq => (
                <label
                  key={eq.id}
                  className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                    requiredEquipment.includes(eq.id) ? 'bg-brand-50 ring-1 ring-brand-300' : 'hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={requiredEquipment.includes(eq.id)}
                    onChange={() => toggleEquipment(eq.id)}
                    className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-800 truncate">{eq.name}</p>
                    <p className="text-[10px] text-slate-500">{eq.department}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="pr-justify" className="text-sm font-semibold text-slate-700 mb-1 block">Justification</label>
            <textarea id="pr-justify" value={justification} onChange={e => setJustification(e.target.value)} className="input-field min-h-[80px]" placeholder="Why do you need these resources? What will you accomplish?" />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={!title.trim() || !deadline || requiredEquipment.length === 0} className="btn-primary flex-1">
              Submit Request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
