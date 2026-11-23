// ============================================================
// LabLink — Unit Tests for Conflict Resolution Engine
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  computeDeadlineUrgency,
  computeFairnessScore,
  computeEquipmentCriticality,
  computePriorityScore,
  slotsOverlap,
  findConflicts,
  findAlternativeSlots,
  findSubstitutes,
  proposeSplitSlot,
  resolveConflict,
  checkCapacity,
} from '../src/engine/conflictResolver';
import type { Booking, Equipment, TimeSlot } from '../src/types';

// ── HELPERS ──────────────────────────────────────────────────

function futureDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

const mockEquipment: Equipment = {
  id: 'rob-jetson-01',
  name: 'NVIDIA Jetson AGX Orin Dev Kit',
  department: 'Robotics & IoT',
  category: 'Dev Kit',
  status: 'High Demand',
  location: 'Robotics Lab, Room 204-A',
  specs: '275 TOPS AI, 64GB RAM',
  prerequisites: ['ROS2 Basics Certification'],
  substitutes: ['ai-jetson-02'],
  maxDailyHours: 6,
  tags: ['robotics', 'edge-ai'],
};

const mockBookings: Booking[] = [
  {
    id: 'bk-test-1',
    equipmentId: 'rob-jetson-01',
    userId: 'stu-aarav',
    userName: 'Aarav Sharma',
    projectType: 'Capstone',
    slot: { date: futureDate(1), startHour: 10, endHour: 13 },
    status: 'Confirmed',
    priority: 90,
    createdAt: futureDate(-1),
  },
  {
    id: 'bk-test-2',
    equipmentId: 'rob-jetson-01',
    userId: 'stu-priya',
    userName: 'Priya Patel',
    projectType: 'Research',
    slot: { date: futureDate(1), startHour: 15, endHour: 18 },
    status: 'Confirmed',
    priority: 85,
    createdAt: futureDate(-2),
  },
  {
    id: 'bk-test-3',
    equipmentId: 'ai-dgx-01',
    userId: 'stu-priya',
    userName: 'Priya Patel',
    projectType: 'Research',
    slot: { date: futureDate(1), startHour: 9, endHour: 17 },
    status: 'Confirmed',
    priority: 88,
    createdAt: futureDate(-3),
  },
];

// ── DEADLINE URGENCY TESTS ──────────────────────────────────

describe('computeDeadlineUrgency', () => {
  it('should return 100 for deadline tomorrow', () => {
    expect(computeDeadlineUrgency(futureDate(1))).toBe(100);
  });

  it('should return 90 for deadline in 2-3 days', () => {
    const score = computeDeadlineUrgency(futureDate(2));
    expect(score).toBe(90);
  });

  it('should return 70 for deadline in 5 days', () => {
    expect(computeDeadlineUrgency(futureDate(5))).toBe(70);
  });

  it('should return 50 for deadline in 10 days', () => {
    expect(computeDeadlineUrgency(futureDate(10))).toBe(50);
  });

  it('should return 30 for deadline in 20 days', () => {
    expect(computeDeadlineUrgency(futureDate(20))).toBe(30);
  });

  it('should return 20 for deadline in 60 days', () => {
    expect(computeDeadlineUrgency(futureDate(60))).toBe(20);
  });
});

// ── FAIRNESS SCORE TESTS ────────────────────────────────────

describe('computeFairnessScore', () => {
  it('should give highest score to low-usage students', () => {
    expect(computeFairnessScore(5)).toBe(95);
  });

  it('should give lower score to heavy users', () => {
    expect(computeFairnessScore(60)).toBe(40);
  });

  it('should give lowest score to very heavy users', () => {
    expect(computeFairnessScore(100)).toBe(25);
  });

  it('should be monotonically decreasing', () => {
    const scores = [5, 15, 30, 55, 90].map(computeFairnessScore);
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i]).toBeLessThanOrEqual(scores[i - 1]);
    }
  });
});

// ── EQUIPMENT CRITICALITY TESTS ─────────────────────────────

describe('computeEquipmentCriticality', () => {
  it('should score high-demand equipment with no substitutes highest', () => {
    const eq: Equipment = { ...mockEquipment, status: 'High Demand', substitutes: [], maxDailyHours: 3 };
    expect(computeEquipmentCriticality(eq)).toBe(100);
  });

  it('should score available equipment with substitutes lower', () => {
    const eq: Equipment = { ...mockEquipment, status: 'Available Now', substitutes: ['other-01'], maxDailyHours: 10 };
    expect(computeEquipmentCriticality(eq)).toBe(50);
  });
});

// ── PRIORITY SCORING TESTS ──────────────────────────────────

describe('computePriorityScore', () => {
  it('should give capstone with imminent deadline highest score', () => {
    const score = computePriorityScore({
      deadlineStr: futureDate(1),
      projectType: 'Capstone',
      totalBookingHours: 5,
      equipment: mockEquipment,
    });
    expect(score).toBeGreaterThan(80);
  });

  it('should give personal project with distant deadline lowest score', () => {
    const score = computePriorityScore({
      deadlineStr: futureDate(60),
      projectType: 'Personal',
      totalBookingHours: 100,
      equipment: { ...mockEquipment, status: 'Available Now', substitutes: ['sub'] },
    });
    expect(score).toBeLessThan(40);
  });

  it('should rank capstone higher than personal for same deadline', () => {
    const capstone = computePriorityScore({
      deadlineStr: futureDate(7),
      projectType: 'Capstone',
      totalBookingHours: 20,
      equipment: mockEquipment,
    });
    const personal = computePriorityScore({
      deadlineStr: futureDate(7),
      projectType: 'Personal',
      totalBookingHours: 20,
      equipment: mockEquipment,
    });
    expect(capstone).toBeGreaterThan(personal);
  });
});

// ── SLOT OVERLAP TESTS ──────────────────────────────────────

describe('slotsOverlap', () => {
  it('should detect overlapping slots on same day', () => {
    const a: TimeSlot = { date: '2025-01-15', startHour: 10, endHour: 13 };
    const b: TimeSlot = { date: '2025-01-15', startHour: 12, endHour: 15 };
    expect(slotsOverlap(a, b)).toBe(true);
  });

  it('should not detect overlap for adjacent slots', () => {
    const a: TimeSlot = { date: '2025-01-15', startHour: 10, endHour: 12 };
    const b: TimeSlot = { date: '2025-01-15', startHour: 12, endHour: 14 };
    expect(slotsOverlap(a, b)).toBe(false);
  });

  it('should not detect overlap on different days', () => {
    const a: TimeSlot = { date: '2025-01-15', startHour: 10, endHour: 13 };
    const b: TimeSlot = { date: '2025-01-16', startHour: 10, endHour: 13 };
    expect(slotsOverlap(a, b)).toBe(false);
  });

  it('should detect when one slot fully contains another', () => {
    const a: TimeSlot = { date: '2025-01-15', startHour: 9, endHour: 17 };
    const b: TimeSlot = { date: '2025-01-15', startHour: 11, endHour: 13 };
    expect(slotsOverlap(a, b)).toBe(true);
  });

  it('should handle identical slots', () => {
    const a: TimeSlot = { date: '2025-01-15', startHour: 10, endHour: 13 };
    expect(slotsOverlap(a, a)).toBe(true);
  });
});

// ── CONFLICT DETECTION TESTS ─────────────────────────────────

describe('findConflicts', () => {
  it('should find conflicts for overlapping bookings', () => {
    const slot: TimeSlot = { date: futureDate(1), startHour: 11, endHour: 14 };
    const conflicts = findConflicts('rob-jetson-01', slot, mockBookings);
    expect(conflicts.length).toBe(1);
    expect(conflicts[0].id).toBe('bk-test-1');
  });

  it('should return empty for non-overlapping slot', () => {
    const slot: TimeSlot = { date: futureDate(1), startHour: 13, endHour: 15 };
    const conflicts = findConflicts('rob-jetson-01', slot, mockBookings);
    expect(conflicts.length).toBe(0);
  });

  it('should not include cancelled bookings', () => {
    const cancelledBookings = [
      { ...mockBookings[0], status: 'Cancelled' as const },
    ];
    const slot: TimeSlot = { date: futureDate(1), startHour: 11, endHour: 14 };
    const conflicts = findConflicts('rob-jetson-01', slot, cancelledBookings);
    expect(conflicts.length).toBe(0);
  });

  it('should only find conflicts for specified equipment', () => {
    const slot: TimeSlot = { date: futureDate(1), startHour: 10, endHour: 15 };
    const conflicts = findConflicts('ai-dgx-01', slot, mockBookings);
    expect(conflicts.length).toBe(1);
    expect(conflicts[0].equipmentId).toBe('ai-dgx-01');
  });
});

// ── ALTERNATIVE SLOT TESTS ──────────────────────────────────

describe('findAlternativeSlots', () => {
  it('should find gaps between bookings', () => {
    const slots = findAlternativeSlots('rob-jetson-01', futureDate(1), 2, mockBookings);
    expect(slots.length).toBeGreaterThan(0);
    // Should find the 8-10 AM gap and the 13-15 gap
    expect(slots.some(s => s.startHour === 8 && s.endHour === 10)).toBe(true);
    expect(slots.some(s => s.startHour === 13 && s.endHour === 15)).toBe(true);
  });

  it('should return empty when no gap fits requested duration', () => {
    // Book entire day
    const fullDayBookings: Booking[] = [{
      ...mockBookings[0],
      slot: { date: futureDate(5), startHour: 8, endHour: 20 },
    }];
    const slots = findAlternativeSlots('rob-jetson-01', futureDate(5), 2, fullDayBookings);
    expect(slots.length).toBe(0);
  });

  it('should find slots on empty days', () => {
    const slots = findAlternativeSlots('rob-jetson-01', futureDate(10), 3, []);
    expect(slots.length).toBeGreaterThan(0);
    expect(slots[0].startHour).toBe(8); // First available from opening
  });
});

// ── SUBSTITUTE TESTS ────────────────────────────────────────

describe('findSubstitutes', () => {
  it('should find substitute equipment', () => {
    const slot: TimeSlot = { date: futureDate(1), startHour: 10, endHour: 13 };
    const subs = findSubstitutes('rob-jetson-01', slot, mockBookings);
    expect(subs.length).toBeGreaterThan(0);
    expect(subs[0].equipment.id).toBe('ai-jetson-02');
  });

  it('should mark substitute availability correctly', () => {
    const slot: TimeSlot = { date: futureDate(1), startHour: 10, endHour: 13 };
    const subs = findSubstitutes('rob-jetson-01', slot, mockBookings);
    // ai-jetson-02 has no bookings at this time
    expect(subs[0].available).toBe(true);
  });
});

// ── SPLIT-SLOT TESTS ────────────────────────────────────────

describe('proposeSplitSlot', () => {
  it('should propose a split when slots overlap sufficiently', () => {
    const slot: TimeSlot = { date: futureDate(1), startHour: 11, endHour: 15 };
    const result = proposeSplitSlot(mockBookings[0], slot, 70);
    expect(result).not.toBeNull();
    if (result) {
      // Lower priority requester should get later chunk
      expect(result.requestSlot.startHour).toBeGreaterThanOrEqual(result.existingSlot.startHour);
    }
  });

  it('should return null for non-overlapping slots', () => {
    const slot: TimeSlot = { date: futureDate(1), startHour: 14, endHour: 16 };
    const result = proposeSplitSlot(mockBookings[0], slot, 70);
    expect(result).toBeNull();
  });

  it('should give higher priority requester the first part', () => {
    const slot: TimeSlot = { date: futureDate(1), startHour: 10, endHour: 14 };
    const result = proposeSplitSlot(mockBookings[0], slot, 95); // Higher than 90
    expect(result).not.toBeNull();
    if (result) {
      expect(result.requestSlot.startHour).toBeLessThanOrEqual(result.existingSlot.startHour);
    }
  });
});

// ── FULL CONFLICT RESOLUTION TESTS ──────────────────────────

describe('resolveConflict', () => {
  it('should return no conflict for available slots', () => {
    const slot: TimeSlot = { date: futureDate(1), startHour: 13, endHour: 15 };
    const result = resolveConflict('rob-jetson-01', slot, 80, mockBookings);
    expect(result.hasConflict).toBe(false);
    expect(result.recommendations.length).toBe(0);
  });

  it('should return recommendations for conflicting slots', () => {
    const slot: TimeSlot = { date: futureDate(1), startHour: 11, endHour: 14 };
    const result = resolveConflict('rob-jetson-01', slot, 75, mockBookings);
    expect(result.hasConflict).toBe(true);
    expect(result.recommendations.length).toBeGreaterThan(0);
  });

  it('should include all 3 recommendation types when possible', () => {
    const slot: TimeSlot = { date: futureDate(1), startHour: 10, endHour: 14 };
    const result = resolveConflict('rob-jetson-01', slot, 75, mockBookings);
    const types = result.recommendations.map(r => r.type);
    // Should have at least alternative-slot and cross-department
    expect(types).toContain('alternative-slot');
    expect(types).toContain('cross-department');
  });

  it('recommendations should be sorted by priority', () => {
    const slot: TimeSlot = { date: futureDate(1), startHour: 10, endHour: 14 };
    const result = resolveConflict('rob-jetson-01', slot, 75, mockBookings);
    for (let i = 1; i < result.recommendations.length; i++) {
      expect(result.recommendations[i].priority).toBeGreaterThanOrEqual(
        result.recommendations[i - 1].priority
      );
    }
  });
});

// ── CAPACITY CONSTRAINT TESTS ────────────────────────────────

describe('checkCapacity', () => {
  it('should allow booking within daily limit', () => {
    const slot: TimeSlot = { date: futureDate(1), startHour: 14, endHour: 16 };
    const result = checkCapacity('rob-jetson-01', 'stu-aarav', slot, mockBookings);
    expect(result.withinCapacity).toBe(true);
  });

  it('should reject booking exceeding daily limit', () => {
    const slot: TimeSlot = { date: futureDate(1), startHour: 14, endHour: 20 };
    const result = checkCapacity('rob-jetson-01', 'stu-aarav', slot, mockBookings);
    // Aarav already has 3h (10-13) + requesting 6h = 9h > maxDailyHours(6)
    expect(result.withinCapacity).toBe(false);
  });

  it('should track current hours correctly', () => {
    const slot: TimeSlot = { date: futureDate(1), startHour: 14, endHour: 15 };
    const result = checkCapacity('rob-jetson-01', 'stu-aarav', slot, mockBookings);
    expect(result.currentHours).toBe(3); // 10-13 = 3 hours
    expect(result.requestedHours).toBe(1);
  });
});
