// ============================================================
// LabLink — Intelligent Slot Booking & Conflict Engine (FR3 & FR4)
// Exact Interval Overlap, Transparent Priority Breakdown & Actionable Resolutions
// ============================================================

import { useState, useMemo, useEffect, useRef } from 'react';
import type {
  Equipment,
  Booking,
  TimeSlot,
  ConflictResult,
  Persona,
  ConflictRecommendation,
  PriorityBreakdown,
} from '../types';
import {
  resolveConflict,
  findConflicts,
  formatHour,
  computePriorityBreakdown,
} from '../engine';
import { equipmentMap } from '../data/equipment';
import { explainConflictResolution } from '../services/aiAssistant';
import { validateBookingSlot } from '../utils/validation';

interface SlotBookingProps {
  equipment: Equipment[];
  bookings: Booking[];
  currentPersona: Persona;
  selectedEquipment: Equipment | null;
  onAddBooking: (booking: Omit<Booking, 'id' | 'createdAt' | 'priority'> & { deadlineStr?: string }) => Promise<unknown>;
  onSelectEquipment: (eq: Equipment | null) => void;
  onAcceptRecommendation: (
    rec: ConflictRecommendation,
    incomingBooking: Omit<Booking, 'id' | 'createdAt' | 'priority'> & { deadlineStr?: string }
  ) => Promise<{ success: boolean; message: string }>;
}

function getWeekDates(): string[] {
  const dates: string[] = [];
  const now = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

const OPERATING_HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // 8 AM to 8 PM

export default function SlotBooking({
  equipment,
  bookings,
  currentPersona,
  selectedEquipment,
  onAddBooking,
  onSelectEquipment,
  onAcceptRecommendation,
}: SlotBookingProps) {
  const weekDates = useMemo(() => getWeekDates(), []);
  const [selectedDate, setSelectedDate] = useState(weekDates[1] || weekDates[0]);
  const [selectedStart, setSelectedStart] = useState<number | null>(null);
  const [selectedEnd, setSelectedEnd] = useState<number | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [conflictResult, setConflictResult] = useState<ConflictResult | null>(null);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const conflictModalRef = useRef<HTMLDivElement>(null);

  // Close conflict modal on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && showConflictModal) {
        setShowConflictModal(false);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showConflictModal]);

  // Build real-time utilization heatmap for selected equipment
  const heatmap = useMemo(() => {
    if (!selectedEquipment) return {};
    const map: Record<string, Record<number, { count: number; bookings: Booking[] }>> = {};
    weekDates.forEach(date => {
      map[date] = {};
      OPERATING_HOURS.forEach(hour => {
        const slot: TimeSlot = { date, startHour: hour, endHour: hour + 1 };
        const conflicts = findConflicts(selectedEquipment.id, slot, bookings);
        map[date][hour] = { count: conflicts.length, bookings: conflicts };
      });
    });
    return map;
  }, [selectedEquipment, bookings, weekDates]);

  // Compute incoming booking priority breakdown
  const incomingBreakdown = useMemo((): PriorityBreakdown | null => {
    if (!selectedEquipment) return null;
    return computePriorityBreakdown({
      deadlineStr: new Date(Date.now() + 5 * 86400000).toISOString(),
      projectType: 'Capstone',
      totalBookingHours: currentPersona.user.totalBookingHours,
      equipment: selectedEquipment,
    });
  }, [selectedEquipment, currentPersona.user.totalBookingHours]);

  function handleSlotClick(date: string, hour: number) {
    setValidationError(null);
    setActionFeedback(null);

    if (selectedStart === null || selectedDate !== date) {
      setSelectedDate(date);
      setSelectedStart(hour);
      setSelectedEnd(hour + 1);
      setConflictResult(null);
    } else if (selectedEnd !== null && hour >= selectedStart) {
      setSelectedEnd(hour + 1);
      setConflictResult(null);
    } else {
      setSelectedStart(hour);
      setSelectedEnd(hour + 1);
      setConflictResult(null);
    }
  }

  function handleCheckConflict() {
    if (!selectedEquipment || selectedStart === null || selectedEnd === null) return;

    const slot: TimeSlot = { date: selectedDate, startHour: selectedStart, endHour: selectedEnd };
    const validation = validateBookingSlot(slot, selectedEquipment.maxDailyHours);
    if (!validation.isValid) {
      setValidationError(validation.error || 'Invalid booking interval');
      return;
    }

    const priority = incomingBreakdown?.totalScore ?? 85;
    const result = resolveConflict(
      selectedEquipment.id,
      slot,
      priority,
      bookings,
      incomingBreakdown || undefined
    );

    setConflictResult(result);

    if (result.hasConflict) {
      setShowConflictModal(true);
    } else {
      setActionFeedback('Slot verified: completely free of conflicts!');
    }
  }

  async function handleConfirmBooking(slot?: TimeSlot, eqId?: string) {
    if (!selectedEquipment && !eqId) return;
    const finalSlot = slot || { date: selectedDate, startHour: selectedStart!, endHour: selectedEnd! };
    const finalEqId = eqId || selectedEquipment!.id;

    const targetEq = equipmentMap.get(finalEqId) || selectedEquipment!;
    const validation = validateBookingSlot(finalSlot, targetEq.maxDailyHours);
    if (!validation.isValid) {
      setValidationError(validation.error || 'Invalid booking interval');
      return;
    }

    setIsSubmitting(true);
    try {
      await onAddBooking({
        equipmentId: finalEqId,
        userId: currentPersona.user.id,
        userName: currentPersona.user.name,
        projectType: 'Capstone',
        slot: finalSlot,
        status: 'Confirmed',
        deadlineStr: new Date(Date.now() + 5 * 86400000).toISOString(),
      });

      setActionFeedback('Booking confirmed and persisted successfully!');
      setConflictResult(null);
      setShowConflictModal(false);
      setSelectedStart(null);
      setSelectedEnd(null);
    } catch (err: unknown) {
      setValidationError(err instanceof Error ? err.message : 'Failed to save booking.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleAcceptRec(rec: ConflictRecommendation) {
    if (!selectedEquipment || selectedStart === null || selectedEnd === null) return;
    setIsSubmitting(true);

    try {
      const incoming = {
        equipmentId: selectedEquipment.id,
        userId: currentPersona.user.id,
        userName: currentPersona.user.name,
        projectType: 'Capstone' as const,
        slot: { date: selectedDate, startHour: selectedStart, endHour: selectedEnd },
        status: 'Confirmed' as const,
        deadlineStr: new Date(Date.now() + 5 * 86400000).toISOString(),
      };

      const res = await onAcceptRecommendation(rec, incoming);
      setActionFeedback(res.message);
      setShowConflictModal(false);
      setConflictResult(null);
      setSelectedStart(null);
      setSelectedEnd(null);
    } catch (err: unknown) {
      setValidationError(err instanceof Error ? err.message : 'Error resolving conflict.');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleSimulateConflict() {
    // Jetson AGX Orin is booked tomorrow 10:00 - 13:00 by Aarav Sharma
    const jetson = equipment.find(e => e.id === 'rob-jetson-01');
    if (jetson) {
      onSelectEquipment(jetson);
      const tomorrow = weekDates[1];
      setSelectedDate(tomorrow);
      setSelectedStart(11);
      setSelectedEnd(14); // Overlaps Aarav 10-13

      const slot: TimeSlot = { date: tomorrow, startHour: 11, endHour: 14 };
      const priority = incomingBreakdown?.totalScore ?? 88;
      const result = resolveConflict(
        'rob-jetson-01',
        slot,
        priority,
        bookings,
        incomingBreakdown || undefined
      );

      setConflictResult(result);
      setShowConflictModal(true);
    }
  }

  return (
    <div className="space-y-6">
      {/* Equipment Selector & 1-Click Simulate Demo */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 card p-4">
        <div className="flex-1">
          <label htmlFor="eq-select" className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 block">
            Select Research Equipment to Book *
          </label>
          <select
            id="eq-select"
            value={selectedEquipment?.id || ''}
            onChange={e => {
              const eq = equipment.find(eq => eq.id === e.target.value);
              onSelectEquipment(eq || null);
              setSelectedStart(null);
              setSelectedEnd(null);
              setConflictResult(null);
              setValidationError(null);
            }}
            className="input-field text-xs sm:text-sm font-medium"
            aria-label="Select laboratory equipment to schedule"
          >
            <option value="">— Choose an instrument from 4 campus departments —</option>
            {equipment.map(eq => (
              <option key={eq.id} value={eq.id}>
                {eq.name} ({eq.department}) — {eq.status}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-shrink-0">
          <button
            type="button"
            onClick={handleSimulateConflict}
            className="btn-secondary w-full sm:w-auto text-xs py-2 font-semibold shadow-2xs border-slate-300 hover:border-slate-400"
            aria-label="1-Click Simulate Scheduling Conflict Demo"
          >
            ⚡ 1-Click Simulate Conflict Demo
          </button>
        </div>
      </div>

      {/* Action feedback / Validation Error */}
      {actionFeedback && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200/90 p-4 flex items-center gap-3 text-xs sm:text-sm text-emerald-800" role="status" aria-live="polite">
          <span className="text-xl">✅</span>
          <span className="font-semibold">{actionFeedback}</span>
        </div>
      )}

      {validationError && (
        <div className="rounded-xl bg-rose-50 border border-rose-200/90 p-4 flex items-center gap-3 text-xs sm:text-sm text-rose-800" role="alert" aria-live="assertive">
          <span className="text-xl">⚠️</span>
          <span className="font-semibold">{validationError}</span>
        </div>
      )}

      {selectedEquipment ? (
        <>
          {/* Selected Equipment Profile Card */}
          <div className="card p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-800 border border-slate-200/80 flex items-center justify-center text-xl font-bold flex-shrink-0">
                🔬
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-bold text-slate-900">{selectedEquipment.name}</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium font-mono">
                    {selectedEquipment.department}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Location: <span className="text-slate-700 font-medium">{selectedEquipment.location}</span> · Quota: <span className="font-mono">Max {selectedEquipment.maxDailyHours}h/day</span>
                </p>
                <p className="text-[11px] text-slate-600 mt-1 font-mono">{selectedEquipment.specs}</p>
              </div>
            </div>

            <span className={`badge ${
              selectedEquipment.status === 'Available Now' ? 'badge-green' :
              selectedEquipment.status === 'High Demand' ? 'badge-yellow' : 'badge-red'
            }`}>
              {selectedEquipment.status}
            </span>
          </div>

          {/* 7-Day Date Tabs */}
          <div className="space-y-1.5">
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Select Calendar Day (7-Day Horizon):</p>
            <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Select date for booking">
              {weekDates.map(date => {
                const isSelected = selectedDate === date;
                return (
                  <button
                    key={date}
                    type="button"
                    onClick={() => {
                      setSelectedDate(date);
                      setSelectedStart(null);
                      setSelectedEnd(null);
                      setConflictResult(null);
                      setValidationError(null);
                    }}
                    className={`flex-shrink-0 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors border ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                        : 'bg-white border-slate-200/90 text-slate-700 hover:border-slate-300'
                    }`}
                    role="tab"
                    aria-selected={isSelected}
                  >
                    {formatDateShort(date)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Visual Utilization Heatmap Matrix */}
          <div className="card overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Hourly Slot Matrix — {formatDateShort(selectedDate)}
                </h4>
                <p className="text-[11px] text-slate-500">Click a start hour, then click an end hour to form an interval</p>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-emerald-50 border border-emerald-300 inline-block"></span> Available</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-amber-50 border border-amber-300 inline-block"></span> Booked (Contention)</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-slate-900 border border-slate-900 inline-block"></span> Your Selection</span>
              </div>
            </div>

            {/* Matrix Cells */}
            <div className="p-4">
              <div className="grid grid-cols-4 sm:grid-cols-7 md:grid-cols-13 gap-1.5" role="grid" aria-label="Operating Hours Slot Grid">
                {OPERATING_HOURS.map(hour => {
                  const cellData = heatmap[selectedDate]?.[hour];
                  const count = cellData?.count || 0;
                  const isSelected = selectedStart !== null && selectedEnd !== null &&
                    hour >= selectedStart && hour < selectedEnd;

                  const cellClass = isSelected
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm ring-2 ring-slate-900/10'
                    : count === 0
                    ? 'bg-emerald-50/70 text-emerald-900 border-emerald-200/90 hover:bg-emerald-100/70'
                    : 'bg-amber-50/70 text-amber-900 border-amber-200/90 hover:bg-amber-100/70';

                  return (
                    <button
                      key={hour}
                      type="button"
                      onClick={() => handleSlotClick(selectedDate, hour)}
                      className={`p-2.5 rounded-xl border text-center transition-colors ${cellClass} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900`}
                      aria-label={`${formatHour(hour)} to ${formatHour(hour + 1)}, ${count > 0 ? `${count} existing booking(s)` : 'Free'}`}
                    >
                      <div className="text-[11px] font-bold font-mono">{formatHour(hour).replace(':00', '')}</div>
                      <div className={`text-[9px] mt-0.5 ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                        {count > 0 ? `${count} active` : 'Free'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Selected Slot Summary Action Bar */}
          {selectedStart !== null && selectedEnd !== null && (
            <div className="card p-4 bg-slate-50/80 border-slate-200/90 space-y-3 animate-fade-in">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-slate-900">
                    Selected Window: <span className="font-mono text-indigo-700">{formatHour(selectedStart)} → {formatHour(selectedEnd)}</span> ({selectedEnd - selectedStart} hours)
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Date: {formatDateShort(selectedDate)} · Priority Score: <strong className="font-mono">{incomingBreakdown?.totalScore ?? 85}/100</strong>
                  </p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleCheckConflict}
                    className="btn-secondary flex-1 sm:flex-none text-xs"
                    disabled={isSubmitting}
                  >
                    🔍 Check Conflicts
                  </button>
                  <button
                    type="button"
                    onClick={() => handleConfirmBooking()}
                    disabled={isSubmitting}
                    className="btn-primary flex-1 sm:flex-none text-xs"
                  >
                    {isSubmitting ? 'Reserving...' : '✓ Confirm Slot Reservation'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="card p-12 text-center text-slate-500 space-y-2">
          <p className="text-3xl" aria-hidden="true">🔬</p>
          <p className="text-sm font-semibold text-slate-800">Select equipment above to load 7-day slot availability</p>
          <p className="text-xs text-slate-400">Or click "Simulate Conflict Demo" to test conflict resolution immediately.</p>
        </div>
      )}

      {/* Confirmed Bookings Feed */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Active Campus Laboratory Bookings ({bookings.filter(b => b.status === 'Confirmed').length})
          </h4>
          <span className="text-[11px] text-slate-500 font-medium">Live multi-user updates</span>
        </div>

        <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
          {bookings
            .filter(b => b.status === 'Confirmed')
            .slice(0, 10)
            .map(bk => {
              const eq = equipmentMap.get(bk.equipmentId);
              return (
                <div key={bk.id} className="p-3.5 flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{eq?.name || bk.equipmentId}</span>
                      <span className="badge badge-purple text-[10px]">{bk.projectType}</span>
                    </div>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      Reserved by: <strong className="text-slate-800">{bk.userName}</strong> · {formatDateShort(bk.slot.date)} ({formatHour(bk.slot.startHour)} – {formatHour(bk.slot.endHour)})
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="badge badge-green text-[10px]">Confirmed</span>
                    <p className="text-[10px] text-indigo-700 font-mono mt-0.5 font-bold">Priority: {bk.priority}</p>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Conflict Resolution Modal (FR4) */}
      {showConflictModal && conflictResult && conflictResult.hasConflict && selectedEquipment && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="conflict-modal-title"
        >
          <div
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs"
            onClick={() => setShowConflictModal(false)}
          ></div>

          <div
            ref={conflictModalRef}
            className="relative bg-white rounded-2xl shadow-elevated border border-slate-200/80 max-w-2xl w-full max-h-[88vh] overflow-y-auto animate-modal-enter"
          >
            {/* Header */}
            <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-slate-100 px-6 py-4 rounded-t-2xl z-10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 border border-amber-200/80 flex items-center justify-center text-xl font-bold flex-shrink-0">
                  ⚠️
                </span>
                <div>
                  <h2 id="conflict-modal-title" className="text-base font-bold text-slate-900 leading-tight">
                    Deterministic Conflict Resolution & Fair Allocation
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5 font-medium">
                    {selectedEquipment.name} ({selectedEquipment.department})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConflictModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                aria-label="Close conflict resolution modal"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Conflicting Booking Details */}
              <div className="p-4 rounded-xl bg-rose-50/80 border border-rose-200/80 space-y-2">
                <p className="text-xs font-bold text-rose-900 uppercase tracking-wider">Colliding Booking on Requested Window</p>
                {conflictResult.conflictingBookings.map(cb => (
                  <div key={cb.id} className="flex items-center justify-between text-xs text-rose-800">
                    <div>
                      <span className="font-bold">{cb.userName}</span> ({cb.projectType})
                      <span className="ml-2 font-mono text-slate-600">
                        {formatHour(cb.slot.startHour)} – {formatHour(cb.slot.endHour)} on {cb.slot.date}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-rose-800 bg-white/90 px-2 py-0.5 rounded border border-rose-200">
                      Existing Priority: {cb.priority}/100
                    </span>
                  </div>
                ))}
              </div>

              {/* Priority Scoring Visual Breakdown (FR4 - Executive Decision Card) */}
              {incomingBreakdown && (
                <div className="p-4 rounded-xl bg-slate-50/90 border border-slate-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Transparent 4-Factor Priority Score Breakdown
                    </p>
                    <span className="text-xs font-mono font-bold text-indigo-800 bg-indigo-50 px-2.5 py-0.5 rounded border border-indigo-200">
                      Total: {incomingBreakdown.totalScore}/100
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                    <div className="p-2.5 bg-white rounded-lg border border-slate-200/80 shadow-2xs">
                      <div className="text-[10px] text-slate-500 font-medium">Deadline (35%)</div>
                      <div className="font-bold text-slate-900 mt-0.5 font-mono text-sm">{incomingBreakdown.deadlineScore}</div>
                      <div className="text-[10px] text-indigo-700 font-mono mt-0.5">+{incomingBreakdown.deadlineWeighted} pts</div>
                      <div className="w-full bg-slate-100 h-1 rounded-full mt-1.5 overflow-hidden">
                        <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${incomingBreakdown.deadlineScore}%` }}></div>
                      </div>
                    </div>

                    <div className="p-2.5 bg-white rounded-lg border border-slate-200/80 shadow-2xs">
                      <div className="text-[10px] text-slate-500 font-medium">Project Type (25%)</div>
                      <div className="font-bold text-slate-900 mt-0.5 font-mono text-sm">{incomingBreakdown.projectTypeScore}</div>
                      <div className="text-[10px] text-indigo-700 font-mono mt-0.5">+{incomingBreakdown.projectTypeWeighted} pts</div>
                      <div className="w-full bg-slate-100 h-1 rounded-full mt-1.5 overflow-hidden">
                        <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${incomingBreakdown.projectTypeScore}%` }}></div>
                      </div>
                    </div>

                    <div className="p-2.5 bg-white rounded-lg border border-slate-200/80 shadow-2xs">
                      <div className="text-[10px] text-slate-500 font-medium">Fairness (20%)</div>
                      <div className="font-bold text-slate-900 mt-0.5 font-mono text-sm">{incomingBreakdown.fairnessScore}</div>
                      <div className="text-[10px] text-indigo-700 font-mono mt-0.5">+{incomingBreakdown.fairnessWeighted} pts</div>
                      <div className="w-full bg-slate-100 h-1 rounded-full mt-1.5 overflow-hidden">
                        <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${incomingBreakdown.fairnessScore}%` }}></div>
                      </div>
                    </div>

                    <div className="p-2.5 bg-white rounded-lg border border-slate-200/80 shadow-2xs">
                      <div className="text-[10px] text-slate-500 font-medium">Criticality (20%)</div>
                      <div className="font-bold text-slate-900 mt-0.5 font-mono text-sm">{incomingBreakdown.criticalityScore}</div>
                      <div className="text-[10px] text-indigo-700 font-mono mt-0.5">+{incomingBreakdown.criticalityWeighted} pts</div>
                      <div className="w-full bg-slate-100 h-1 rounded-full mt-1.5 overflow-hidden">
                        <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${incomingBreakdown.criticalityScore}%` }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Natural Language AI Analysis */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700 whitespace-pre-wrap leading-relaxed font-sans">
                {explainConflictResolution(conflictResult, selectedEquipment.id)}
              </div>

              {/* Actionable Recommendations (FR4) */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Feasible Actionable Resolutions ({conflictResult.recommendations.length} Options)
                </p>

                {conflictResult.recommendations.map((rec, i) => {
                  const badgeColor =
                    rec.type === 'alternative-slot'
                      ? 'bg-emerald-50/70 border-emerald-200/80 text-emerald-900'
                      : rec.type === 'cross-department'
                      ? 'bg-sky-50/70 border-sky-200/80 text-sky-900'
                      : 'bg-indigo-50/70 border-indigo-200/80 text-indigo-900';

                  return (
                    <div key={i} className={`p-4 rounded-xl border ${badgeColor} space-y-2`}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs sm:text-sm">{rec.title}</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/90 border border-current/20 font-mono">
                              {rec.confidence}% Match
                            </span>
                          </div>
                          <p className="text-xs mt-1 leading-relaxed text-slate-700">{rec.description}</p>
                          {rec.reasoning && (
                            <p className="text-[11px] text-slate-500 mt-1 italic">Reasoning: {rec.reasoning}</p>
                          )}
                        </div>
                      </div>

                      <div className="pt-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleAcceptRec(rec)}
                          disabled={isSubmitting}
                          className="btn-primary text-xs py-1.5 px-3 font-semibold"
                          aria-label={`Accept recommendation: ${rec.title}`}
                        >
                          {isSubmitting ? 'Applying...' : 'Accept This Option →'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
