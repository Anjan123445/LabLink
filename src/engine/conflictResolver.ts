// ============================================================
// LabLink — Conflict Resolution & Fair Allocation Engine
// Pure deterministic logic, fully unit-testable
// ============================================================

import type {
  Booking, Equipment, TimeSlot, ConflictResult,
  ConflictRecommendation, ProjectType, PriorityBreakdown
} from '../types';
import { equipmentMap } from '../data/equipment';

// ── PRIORITY SCORING ─────────────────────────────────────────
// Priority Score = w1·DeadlineUrgency + w2·ProjectTypeWeight + w3·FairnessScore + w4·EquipmentCriticality
// All scores normalized to 0-100

export const PROJECT_TYPE_WEIGHTS: Record<ProjectType, number> = {
  Capstone: 85,
  Research: 80,
  Hackathon: 75,
  'Course Lab': 60,
  Personal: 40,
};

export const WEIGHT_DEADLINE = 0.35;
export const WEIGHT_PROJECT_TYPE = 0.25;
export const WEIGHT_FAIRNESS = 0.20;
export const WEIGHT_EQUIPMENT_CRITICALITY = 0.20;

/**
 * Compute deadline urgency score (0-100).
 * Closer deadlines → higher urgency.
 * ≤ 1 day = 100, ≤ 3 days = 90, ≤ 7 days = 70, ≤ 14 days = 50, ≤ 30 days = 30, > 30 days = 20
 */
export function computeDeadlineUrgency(deadlineStr: string): number {
  const now = new Date();
  const deadline = new Date(deadlineStr);
  const daysUntil = Math.max(0, Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  if (daysUntil <= 1) return 100;
  if (daysUntil <= 3) return 90;
  if (daysUntil <= 7) return 70;
  if (daysUntil <= 14) return 50;
  if (daysUntil <= 30) return 30;
  return 20;
}

/**
 * Compute fairness score based on historical utilization.
 * Students who have used less total hours get higher scores (more fair to give them access).
 */
export function computeFairnessScore(totalBookingHours: number): number {
  if (totalBookingHours <= 10) return 95;
  if (totalBookingHours <= 25) return 80;
  if (totalBookingHours <= 50) return 60;
  if (totalBookingHours <= 80) return 40;
  return 25;
}

/**
 * Compute equipment criticality score.
 * High-demand + few substitutes = high criticality.
 */
export function computeEquipmentCriticality(eq: Equipment): number {
  let score = 50;
  if (eq.status === 'High Demand') score += 30;
  if (eq.substitutes.length === 0) score += 20;
  if (eq.maxDailyHours <= 4) score += 10;
  return Math.min(100, score);
}

/**
 * Computes a detailed transparent breakdown of the priority score
 */
export function computePriorityBreakdown(params: {
  deadlineStr: string;
  projectType: ProjectType;
  totalBookingHours: number;
  equipment: Equipment;
}): PriorityBreakdown {
  const deadlineScore = computeDeadlineUrgency(params.deadlineStr);
  const projectTypeScore = PROJECT_TYPE_WEIGHTS[params.projectType];
  const fairnessScore = computeFairnessScore(params.totalBookingHours);
  const criticalityScore = computeEquipmentCriticality(params.equipment);

  const deadlineWeighted = Number((WEIGHT_DEADLINE * deadlineScore).toFixed(1));
  const projectTypeWeighted = Number((WEIGHT_PROJECT_TYPE * projectTypeScore).toFixed(1));
  const fairnessWeighted = Number((WEIGHT_FAIRNESS * fairnessScore).toFixed(1));
  const criticalityWeighted = Number((WEIGHT_EQUIPMENT_CRITICALITY * criticalityScore).toFixed(1));

  const totalScore = Math.round(
    deadlineWeighted + projectTypeWeighted + fairnessWeighted + criticalityWeighted
  );

  return {
    deadlineScore,
    deadlineWeighted,
    projectTypeScore,
    projectTypeWeighted,
    fairnessScore,
    fairnessWeighted,
    criticalityScore,
    criticalityWeighted,
    totalScore,
  };
}

/**
 * Compute overall priority score for a booking request.
 */
export function computePriorityScore(params: {
  deadlineStr: string;
  projectType: ProjectType;
  totalBookingHours: number;
  equipment: Equipment;
}): number {
  return computePriorityBreakdown(params).totalScore;
}

// ── TIME SLOT OVERLAP DETECTION ──────────────────────────────

/**
 * Check if two time slots overlap.
 * Exactly adheres to: startA < endB && endA > startB.
 * Slots on different dates or adjacent slots (e.g. 10-11 and 11-12) NEVER conflict.
 */
export function slotsOverlap(a: TimeSlot, b: TimeSlot): boolean {
  if (!a || !b || a.date !== b.date) return false;
  return a.startHour < b.endHour && b.startHour < a.endHour;
}

/**
 * Find all bookings that conflict with the given slot on the given equipment.
 */
export function findConflicts(
  equipmentId: string,
  slot: TimeSlot,
  existingBookings: Booking[],
  excludeBookingId?: string,
): Booking[] {
  return existingBookings.filter(b =>
    b.equipmentId === equipmentId &&
    b.status !== 'Cancelled' &&
    b.id !== excludeBookingId &&
    slotsOverlap(b.slot, slot)
  );
}

// ── ALTERNATIVE SLOT GENERATION ──────────────────────────────

/**
 * Find the best alternative time slots on the same equipment.
 * Looks for gaps of at least `durationHours` length in the same day.
 */
export function findAlternativeSlots(
  equipmentId: string,
  date: string,
  durationHours: number,
  existingBookings: Booking[],
  operatingHoursStart = 8,
  operatingHoursEnd = 20,
): TimeSlot[] {
  // Get all confirmed bookings for this equipment on this date
  const dayBookings = existingBookings
    .filter(b => b.equipmentId === equipmentId && b.slot.date === date && b.status !== 'Cancelled')
    .sort((a, b) => a.slot.startHour - b.slot.startHour);

  const freeSlots: TimeSlot[] = [];
  let currentStart = operatingHoursStart;

  for (const booking of dayBookings) {
    const gapDuration = booking.slot.startHour - currentStart;
    if (gapDuration >= durationHours) {
      freeSlots.push({
        date,
        startHour: currentStart,
        endHour: currentStart + durationHours,
      });
    }
    currentStart = Math.max(currentStart, booking.slot.endHour);
  }

  // Check gap after last booking
  const finalGap = operatingHoursEnd - currentStart;
  if (finalGap >= durationHours) {
    freeSlots.push({
      date,
      startHour: currentStart,
      endHour: currentStart + durationHours,
    });
  }

  return freeSlots;
}

// ── CROSS-DEPARTMENT SUBSTITUTION ────────────────────────────

/**
 * Find available substitute equipment in other departments.
 */
export function findSubstitutes(
  equipmentId: string,
  slot: TimeSlot,
  existingBookings: Booking[],
): Array<{ equipment: Equipment; available: boolean }> {
  const eq = equipmentMap.get(equipmentId);
  if (!eq) return [];

  return eq.substitutes.map(subId => {
    const subEq = equipmentMap.get(subId);
    if (!subEq) return null;

    const conflicts = findConflicts(subId, slot, existingBookings);
    return {
      equipment: subEq,
      available: conflicts.length === 0,
    };
  }).filter((x): x is { equipment: Equipment; available: boolean } => x !== null);
}

// ── SPLIT-SLOT PROPOSALS ─────────────────────────────────────

/**
 * Propose a split-slot arrangement when two bookings conflict.
 * The booking with higher priority gets the earlier chunk or larger chunk.
 */
export function proposeSplitSlot(
  existingBooking: Booking,
  requestedSlot: TimeSlot,
  requestPriority: number,
): { existingSlot: TimeSlot; requestSlot: TimeSlot } | null {
  if (!slotsOverlap(existingBooking.slot, requestedSlot)) return null;

  const overlapStart = Math.max(existingBooking.slot.startHour, requestedSlot.startHour);
  const overlapEnd = Math.min(existingBooking.slot.endHour, requestedSlot.endHour);
  const overlapDuration = overlapEnd - overlapStart;

  if (overlapDuration < 2) return null; // Too small to split

  const midpoint = overlapStart + Math.floor(overlapDuration / 2);

  if (requestPriority > existingBooking.priority) {
    return {
      requestSlot: { date: requestedSlot.date, startHour: overlapStart, endHour: midpoint },
      existingSlot: { date: existingBooking.slot.date, startHour: midpoint, endHour: overlapEnd },
    };
  } else {
    return {
      existingSlot: { date: existingBooking.slot.date, startHour: overlapStart, endHour: midpoint },
      requestSlot: { date: requestedSlot.date, startHour: midpoint, endHour: overlapEnd },
    };
  }
}

// ── FULL CONFLICT RESOLUTION ─────────────────────────────────

/**
 * Main conflict resolution function.
 * Evaluates collision and generates 3 ranked recommendations:
 * 1. Best alternative time slot (same equipment)
 * 2. Cross-department equivalent kit (hardware substitution)
 * 3. Smart split-slot / priority reallocation
 */
export function resolveConflict(
  equipmentId: string,
  requestedSlot: TimeSlot,
  requestPriority: number,
  existingBookings: Booking[],
  incomingBreakdown?: PriorityBreakdown,
): ConflictResult {
  const conflicts = findConflicts(equipmentId, requestedSlot, existingBookings);

  if (conflicts.length === 0) {
    return {
      hasConflict: false,
      conflictingBookings: [],
      recommendations: [],
      incomingBreakdown,
    };
  }

  const eq = equipmentMap.get(equipmentId);
  const recommendations: ConflictRecommendation[] = [];
  const duration = requestedSlot.endHour - requestedSlot.startHour;
  const highestConflict = conflicts.slice().sort((a, b) => b.priority - a.priority)[0];

  // ── Recommendation 1: Alternative Time Slot (Same equipment) ──
  const altSlots = findAlternativeSlots(equipmentId, requestedSlot.date, duration, existingBookings);
  if (altSlots.length > 0) {
    const bestAlt = altSlots[0];
    recommendations.push({
      type: 'alternative-slot',
      title: 'Best Alternative Time Window',
      description: `${eq?.name ?? 'Equipment'} is completely open from ${formatHour(bestAlt.startHour)} to ${formatHour(bestAlt.endHour)} on the same day (${bestAlt.date}) with zero scheduling collisions.`,
      priority: 1,
      suggestedSlot: bestAlt,
      suggestedEquipmentId: equipmentId,
      confidence: 96,
      reasoning: 'Off-peak operating window with matching requested duration.',
    });
  } else {
    // Check next day
    const nextDate = getNextDate(requestedSlot.date);
    const nextDaySlots = findAlternativeSlots(equipmentId, nextDate, duration, existingBookings);
    if (nextDaySlots.length > 0) {
      const bestAlt = nextDaySlots[0];
      recommendations.push({
        type: 'alternative-slot',
        title: 'Next Available Day Window',
        description: `No same-day gaps fit ${duration}h. ${eq?.name ?? 'Equipment'} is available on ${bestAlt.date} from ${formatHour(bestAlt.startHour)} to ${formatHour(bestAlt.endHour)}.`,
        priority: 1,
        suggestedSlot: bestAlt,
        suggestedEquipmentId: equipmentId,
        confidence: 88,
        reasoning: 'Next-day open slot before project submission deadlines.',
      });
    }
  }

  // ── Recommendation 2: Cross-Department Substitute ──
  const substitutes = findSubstitutes(equipmentId, requestedSlot, existingBookings);
  const availableSubs = substitutes.filter(s => s.available);
  if (availableSubs.length > 0) {
    const bestSub = availableSubs[0];
    recommendations.push({
      type: 'cross-department',
      title: 'Cross-Department Equivalent Kit',
      description: `${bestSub.equipment.name} in ${bestSub.equipment.department} (${bestSub.equipment.location}) is fully available for your requested window. Specs: ${bestSub.equipment.specs}.`,
      priority: 2,
      suggestedEquipmentId: bestSub.equipment.id,
      suggestedEquipmentName: bestSub.equipment.name,
      suggestedSlot: requestedSlot,
      confidence: 92,
      reasoning: `Load-balances campus resources across departments (${eq?.department} → ${bestSub.equipment.department}).`,
    });
  }

  // ── Recommendation 3: Priority Escalation or Split-Slot ──
  const priorityDiff = requestPriority - highestConflict.priority;
  if (priorityDiff >= 15) {
    // Significant priority superiority → Faculty arbitration / priority reallocation
    recommendations.push({
      type: 'faculty-arbitration',
      title: 'Priority Reallocation / Faculty Fast-Track',
      description: `Your priority score (${requestPriority}) substantially outranks current booking by ${highestConflict.userName} (${highestConflict.priority}). You qualify for faculty-authorized priority preemption or supervised slot sharing.`,
      priority: 3,
      targetBookingId: highestConflict.id,
      suggestedSlot: requestedSlot,
      confidence: 84,
      reasoning: `Urgent academic thesis/deadline milestone outweighs flexible booking (+${priorityDiff} score margin).`,
    });
  } else {
    // Propose fair split-slot
    const splitProposal = proposeSplitSlot(highestConflict, requestedSlot, requestPriority);
    if (splitProposal) {
      const isRequesterHigher = requestPriority > highestConflict.priority;
      recommendations.push({
        type: 'split-slot',
        title: 'Smart Split-Slot Allocation',
        description: isRequesterHigher
          ? `Fair time-sharing proposed: You receive ${formatHour(splitProposal.requestSlot.startHour)}–${formatHour(splitProposal.requestSlot.endHour)}, while ${highestConflict.userName} shifts to ${formatHour(splitProposal.existingSlot.startHour)}–${formatHour(splitProposal.existingSlot.endHour)}.`
          : `Fair time-sharing proposed: ${highestConflict.userName} retains ${formatHour(splitProposal.existingSlot.startHour)}–${formatHour(splitProposal.existingSlot.endHour)} (priority ${highestConflict.priority}), and you receive ${formatHour(splitProposal.requestSlot.startHour)}–${formatHour(splitProposal.requestSlot.endHour)}.`,
        priority: 3,
        suggestedSlot: splitProposal.requestSlot,
        targetBookingId: highestConflict.id,
        adjustedExistingSlot: splitProposal.existingSlot,
        confidence: 76,
        reasoning: 'Fair division of overlapping window ensuring both researchers make progress.',
      });
    }
  }

  // Sort by priority rank (1 = best)
  recommendations.sort((a, b) => a.priority - b.priority);

  return {
    hasConflict: true,
    conflictingBookings: conflicts,
    recommendations,
    incomingBreakdown,
  };
}

// ── CAPACITY CONSTRAINTS ─────────────────────────────────────

/**
 * Check if adding a booking would exceed the equipment's daily max hours for a user.
 */
export function checkCapacity(
  equipmentId: string,
  userId: string,
  slot: TimeSlot,
  existingBookings: Booking[],
): { withinCapacity: boolean; currentHours: number; maxHours: number; requestedHours: number } {
  const eq = equipmentMap.get(equipmentId);
  if (!eq) return { withinCapacity: false, currentHours: 0, maxHours: 0, requestedHours: 0 };

  const userDayBookings = existingBookings.filter(
    b => b.equipmentId === equipmentId &&
      b.userId === userId &&
      b.slot.date === slot.date &&
      b.status !== 'Cancelled'
  );

  const currentHours = userDayBookings.reduce(
    (sum, b) => sum + (b.slot.endHour - b.slot.startHour), 0
  );
  const requestedHours = slot.endHour - slot.startHour;

  return {
    withinCapacity: currentHours + requestedHours <= eq.maxDailyHours,
    currentHours,
    maxHours: eq.maxDailyHours,
    requestedHours,
  };
}

// ── HELPERS ──────────────────────────────────────────────────

export function formatHour(hour: number): string {
  if (hour === 0 || hour === 24) return '12:00 AM';
  if (hour === 12) return '12:00 PM';
  if (hour < 12) return `${hour}:00 AM`;
  return `${hour - 12}:00 PM`;
}

export function getNextDate(dateStr: string): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}
