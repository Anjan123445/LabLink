// ============================================================
// LabLink — Slot Booking Panel with Live Conflict Detection
// ============================================================

import { useState, useMemo } from 'react';
import type { Equipment, Booking, TimeSlot, ConflictResult, Persona } from '../types';
import { resolveConflict, computePriorityScore, findConflicts, formatHour } from '../engine';
import { equipmentMap } from '../data/equipment';
import { explainConflictResolution } from '../services/aiAssistant';

interface SlotBookingProps {
  equipment: Equipment[];
  bookings: Booking[];
  currentPersona: Persona;
  selectedEquipment: Equipment | null;
  onAddBooking: (booking: any) => void;
  onSelectEquipment: (eq: Equipment | null) => void;
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
}: SlotBookingProps) {
  const [selectedDate, setSelectedDate] = useState(getWeekDates()[1]);
  const [selectedStart, setSelectedStart] = useState<number | null>(null);
  const [selectedEnd, setSelectedEnd] = useState<number | null>(null);
  const [conflictResult, setConflictResult] = useState<ConflictResult | null>(null);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  const weekDates = useMemo(() => getWeekDates(), []);

  // Build utilization heatmap for selected equipment
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

  function handleSlotClick(date: string, hour: number) {
    if (selectedStart === null || selectedDate !== date) {
      setSelectedDate(date);
      setSelectedStart(hour);
      setSelectedEnd(hour + 1);
      setConflictResult(null);
      setBookingSuccess(false);
    } else if (selectedEnd !== null && hour >= selectedStart) {
      setSelectedEnd(hour + 1);
    }
  }

  function handleCheckConflict() {
    if (!selectedEquipment || selectedStart === null || selectedEnd === null) return;

    const slot: TimeSlot = { date: selectedDate, startHour: selectedStart, endHour: selectedEnd };
    const result = resolveConflict(selectedEquipment.id, slot, 75, bookings);
    setConflictResult(result);

    if (result.hasConflict) {
      setShowConflictModal(true);
    }
  }

  function handleBook(slot?: TimeSlot, eqId?: string) {
    if (!selectedEquipment && !eqId) return;
    const finalSlot = slot || { date: selectedDate, startHour: selectedStart!, endHour: selectedEnd! };
    const finalEqId = eqId || selectedEquipment!.id;

    onAddBooking({
      equipmentId: finalEqId,
      userId: currentPersona.user.id,
      userName: currentPersona.user.name,
      projectType: 'Capstone' as const,
      slot: finalSlot,
      status: 'Confirmed' as const,
    });

    setBookingSuccess(true);
    setConflictResult(null);
    setShowConflictModal(false);
    setSelectedStart(null);
    setSelectedEnd(null);

    setTimeout(() => setBookingSuccess(false), 3000);
  }

  function handleSimulateConflict() {
    // Pre-fill a known conflicting scenario
    const jetson = equipment.find(e => e.id === 'rob-jetson-01');
    if (jetson) {
      onSelectEquipment(jetson);
      const tomorrow = weekDates[1];
      setSelectedDate(tomorrow);
      setSelectedStart(11);
      setSelectedEnd(14);

      const slot: TimeSlot = { date: tomorrow, startHour: 11, endHour: 14 };
      const result = resolveConflict('rob-jetson-01', slot, 75, bookings);
      setConflictResult(result);
      setShowConflictModal(true);
    }
  }

  return (
    <div className="space-y-6">
      {/* Equipment selector & Simulate button */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <label htmlFor="eq-select" className="text-sm font-semibold text-slate-700 mb-1 block">
            Select Equipment to Book
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
            }}
            className="input-field"
            aria-label="Select equipment to book"
          >
            <option value="">— Choose equipment —</option>
            {equipment.map(eq => (
              <option key={eq.id} value={eq.id}>
                {eq.name} ({eq.department}) — {eq.status}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <button
            onClick={handleSimulateConflict}
            className="btn-secondary whitespace-nowrap"
            aria-label="Simulate a scheduling conflict demo"
          >
            ⚡ Simulate Conflict Demo
          </button>
        </div>
      </div>

      {bookingSuccess && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 flex items-center gap-3" role="alert">
          <span className="text-2xl">✅</span>
          <div>
            <p className="text-sm font-semibold text-emerald-800">Booking Confirmed!</p>
            <p className="text-xs text-emerald-600">Your slot has been reserved successfully.</p>
          </div>
        </div>
      )}

      {selectedEquipment && (
        <>
          {/* Selected equipment info */}
          <div className="card p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-brand-100 flex items-center justify-center text-2xl">
              🔬
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-slate-900">{selectedEquipment.name}</h3>
              <p className="text-xs text-slate-500">{selectedEquipment.department} · {selectedEquipment.location}</p>
            </div>
            <span className={`badge ${
              selectedEquipment.status === 'Available Now' ? 'badge-green' :
              selectedEquipment.status === 'High Demand' ? 'badge-yellow' : 'badge-red'
            }`}>
              {selectedEquipment.status}
            </span>
          </div>

          {/* Week date tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {weekDates.map(date => (
              <button
                key={date}
                onClick={() => { setSelectedDate(date); setSelectedStart(null); setSelectedEnd(null); setConflictResult(null); }}
                className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedDate === date
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-600 hover:border-brand-300'
                }`}
              >
                {formatDateShort(date)}
              </button>
            ))}
          </div>

          {/* Time slot grid */}
          <div className="card overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-700">Time Slots — {formatDateShort(selectedDate)}</h3>
                <div className="flex items-center gap-4 text-[10px] text-slate-500">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-200"></span> Available</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-100 border border-amber-200"></span> Busy</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-100 border border-red-200"></span> Full</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-brand-100 border border-brand-300"></span> Selected</span>
                </div>
              </div>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-13 gap-1.5">
                {OPERATING_HOURS.map(hour => {
                  const cellData = heatmap[selectedDate]?.[hour];
                  const count = cellData?.count || 0;
                  const isSelected = selectedStart !== null && selectedEnd !== null &&
                    hour >= selectedStart && hour < selectedEnd;
                  const bgColor = isSelected
                    ? 'bg-brand-100 border-brand-400 ring-2 ring-brand-300'
                    : count === 0
                    ? 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                    : count === 1
                    ? 'bg-amber-50 border-amber-200 hover:bg-amber-100'
                    : 'bg-red-50 border-red-200 hover:bg-red-100';

                  return (
                    <button
                      key={hour}
                      onClick={() => handleSlotClick(selectedDate, hour)}
                      className={`aspect-square sm:aspect-auto sm:py-4 rounded-lg border text-center transition-all ${bgColor} focus:outline-none focus:ring-2 focus:ring-brand-500`}
                      title={`${formatHour(hour)} — ${count} booking(s)`}
                      aria-label={`${formatHour(hour)} to ${formatHour(hour + 1)}, ${count} existing bookings`}
                    >
                      <div className="text-[11px] font-semibold text-slate-700">{formatHour(hour).replace(':00', '')}</div>
                      {count > 0 && (
                        <div className="text-[9px] text-slate-500 mt-0.5">{count} booked</div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Selected slot summary */}
          {selectedStart !== null && selectedEnd !== null && (
            <div className="card p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    Selected: {formatHour(selectedStart)} → {formatHour(selectedEnd)} ({selectedEnd - selectedStart}h)
                  </p>
                  <p className="text-xs text-slate-500">{formatDateShort(selectedDate)} · {selectedEquipment.name}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleCheckConflict} className="btn-secondary text-sm">
                    🔍 Check Conflicts
                  </button>
                  {(!conflictResult || !conflictResult.hasConflict) && (
                    <button onClick={() => handleBook()} className="btn-primary text-sm">
                      ✓ Confirm Booking
                    </button>
                  )}
                </div>
              </div>

              {/* Inline conflict result (non-modal) */}
              {conflictResult && !conflictResult.hasConflict && (
                <div className="mt-3 rounded-lg bg-emerald-50 border border-emerald-200 p-3">
                  <p className="text-sm text-emerald-800 font-medium">✅ No conflicts — slot is available!</p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Existing bookings list */}
      <div className="card">
        <div className="p-4 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-700">Current Bookings</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {bookings.filter(b => b.status !== 'Cancelled').slice(0, 10).map(bk => {
            const eq = equipmentMap.get(bk.equipmentId);
            return (
              <div key={bk.id} className="p-4 flex items-center gap-4">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  bk.status === 'Confirmed' ? 'bg-emerald-500' :
                  bk.status === 'Pending' ? 'bg-amber-500' :
                  bk.status === 'Conflict' ? 'bg-red-500' : 'bg-slate-300'
                }`}></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{eq?.name || bk.equipmentId}</p>
                  <p className="text-xs text-slate-500">
                    {bk.userName} · {formatDateShort(bk.slot.date)} · {formatHour(bk.slot.startHour)}-{formatHour(bk.slot.endHour)}
                  </p>
                </div>
                <span className={`badge ${
                  bk.status === 'Confirmed' ? 'badge-green' :
                  bk.status === 'Pending' ? 'badge-yellow' :
                  bk.status === 'Conflict' ? 'badge-red' : 'badge-blue'
                }`}>
                  {bk.status}
                </span>
                <span className="badge badge-purple text-[10px]">{bk.projectType}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Conflict Resolution Modal */}
      {showConflictModal && conflictResult && conflictResult.hasConflict && selectedEquipment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Conflict Resolution">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowConflictModal(false)}></div>
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[85vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 rounded-t-2xl z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-xl">⚠️</span>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Conflict Detected</h2>
                    <p className="text-xs text-slate-500">{selectedEquipment.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowConflictModal(false)}
                  className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                  aria-label="Close conflict modal"
                >
                  <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {/* Conflicting bookings */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Conflicting Bookings</p>
                {conflictResult.conflictingBookings.map(cb => (
                  <div key={cb.id} className="rounded-lg bg-red-50 border border-red-200 p-3 mb-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-red-800">{cb.userName}</p>
                        <p className="text-xs text-red-600">
                          {cb.projectType} · Priority Score: {cb.priority}
                        </p>
                      </div>
                      <p className="text-xs text-red-700 font-mono">
                        {formatHour(cb.slot.startHour)} - {formatHour(cb.slot.endHour)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* AI Explanation */}
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm">🤖</span>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">AI Analysis</span>
                </div>
                <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {explainConflictResolution(conflictResult, selectedEquipment.id)}
                </div>
              </div>

              {/* Recommendations */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                  Smart Recommendations ({conflictResult.recommendations.length})
                </p>
                <div className="space-y-3">
                  {conflictResult.recommendations.map((rec, i) => {
                    const icon = rec.type === 'alternative-slot' ? '🕐' : rec.type === 'cross-department' ? '🔄' : '✂️';
                    const colors = rec.type === 'alternative-slot'
                      ? 'border-emerald-200 bg-emerald-50'
                      : rec.type === 'cross-department'
                      ? 'border-blue-200 bg-blue-50'
                      : 'border-purple-200 bg-purple-50';

                    return (
                      <div key={i} className={`rounded-xl border p-4 ${colors}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-lg">{icon}</span>
                              <h4 className="text-sm font-bold text-slate-800">{rec.title}</h4>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/70 text-slate-600 font-medium">
                                {rec.confidence}% match
                              </span>
                            </div>
                            <p className="text-sm text-slate-600">{rec.description}</p>
                          </div>
                        </div>
                        <div className="mt-3 flex gap-2">
                          <button
                            onClick={() => {
                              handleBook(
                                rec.suggestedSlot,
                                rec.suggestedEquipmentId || selectedEquipment.id,
                              );
                            }}
                            className="btn-primary text-xs py-1.5 px-3"
                          >
                            Accept This Option
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
