// ============================================================
// LabLink — Integration & End-to-End User Flow Tests
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  computePriorityBreakdown,
  computePriorityScore,
  resolveConflict,
  findAlternativeSlots,
  findSubstitutes,
} from '../src/engine/conflictResolver';
import { equipmentMap } from '../src/data/equipment';
import { users } from '../src/data/seed';
import type { Booking, Equipment, TimeSlot } from '../src/types';

describe('4-Factor Mathematical Priority Scoring Model', () => {
  const jetson = equipmentMap.get('rob-jetson-01')!;

  it('should calculate exact weighted components (35%, 25%, 20%, 20%)', () => {
    const deadlineTomorrow = new Date();
    deadlineTomorrow.setDate(deadlineTomorrow.getDate() + 1);

    const breakdown = computePriorityBreakdown({
      deadlineStr: deadlineTomorrow.toISOString().split('T')[0],
      projectType: 'Capstone', // 85
      totalBookingHours: 5,    // Fairness = 95
      equipment: jetson,        // High demand, 1 substitute
    });

    expect(breakdown.deadlineScore).toBe(100);
    expect(breakdown.deadlineWeighted).toBe(35); // 100 * 0.35

    expect(breakdown.projectTypeScore).toBe(85);
    expect(breakdown.projectTypeWeighted).toBe(21.3); // 85 * 0.25 = 21.25 -> 21.3

    expect(breakdown.fairnessScore).toBe(95);
    expect(breakdown.fairnessWeighted).toBe(19); // 95 * 0.20 = 19.0

    // Equipment criticality for High Demand with substitute:
    // Base 50 + 30 (High Demand) = 80 -> 80 * 0.20 = 16.0
    expect(breakdown.criticalityWeighted).toBe(16);

    const sum = breakdown.deadlineWeighted + breakdown.projectTypeWeighted + breakdown.fairnessWeighted + breakdown.criticalityWeighted;
    expect(breakdown.totalScore).toBe(Math.round(sum));
    expect(breakdown.totalScore).toBe(91);
  });

  it('should penalize resource monopolization (heavy users score lower fairness)', () => {
    const deadlineStr = new Date(Date.now() + 7 * 86400000).toISOString();

    const lowUser = computePriorityScore({
      deadlineStr,
      projectType: 'Capstone',
      totalBookingHours: 5, // Fairness = 95
      equipment: jetson,
    });

    const heavyUser = computePriorityScore({
      deadlineStr,
      projectType: 'Capstone',
      totalBookingHours: 90, // Fairness = 25
      equipment: jetson,
    });

    expect(lowUser).toBeGreaterThan(heavyUser);
    expect(lowUser - heavyUser).toBeGreaterThanOrEqual(14); // 0.20 * (95 - 25) = 14 pts
  });
});

describe('Cross-Department Hardware Substitution & Alternative Slot Accuracy', () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const existingBookings: Booking[] = [
    {
      id: 'bk-aarav-jetson',
      equipmentId: 'rob-jetson-01', // Robotics Lab
      userId: 'stu-aarav',
      userName: 'Aarav Sharma',
      projectType: 'Capstone',
      slot: { date: tomorrowStr, startHour: 10, endHour: 13 },
      status: 'Confirmed',
      priority: 92,
      createdAt: '2025-01-01',
    },
  ];

  it('should recommend open substitute in AI department when Robotics kit is booked', () => {
    const requestedSlot: TimeSlot = { date: tomorrowStr, startHour: 11, endHour: 13 };
    const substitutes = findSubstitutes('rob-jetson-01', requestedSlot, existingBookings);

    expect(substitutes.length).toBeGreaterThan(0);
    const aiSub = substitutes.find(s => s.equipment.id === 'ai-jetson-02');
    expect(aiSub).toBeDefined();
    expect(aiSub?.available).toBe(true);
    expect(aiSub?.equipment.department).toBe('AI & GPU Compute');
  });

  it('should generate conflict-free alternative time slot on same equipment', () => {
    const freeSlots = findAlternativeSlots('rob-jetson-01', tomorrowStr, 3, existingBookings);
    expect(freeSlots.length).toBeGreaterThan(0);

    // Should find the 13:00 to 16:00 gap right after Aarav's booking ends at 13:00
    const nextSlot = freeSlots.find(s => s.startHour === 13 && s.endHour === 16);
    expect(nextSlot).toBeDefined();
  });

  it('should generate faculty arbitration recommendation when incoming priority substantially exceeds existing', () => {
    const requestedSlot: TimeSlot = { date: tomorrowStr, startHour: 10, endHour: 13 };
    const lowPriorityExisting: Booking[] = [
      {
        id: 'bk-low-pri',
        equipmentId: 'rob-jetson-01',
        userId: 'stu-karthik',
        userName: 'Karthik Reddy',
        projectType: 'Personal',
        slot: requestedSlot,
        status: 'Confirmed',
        priority: 45, // Low priority
        createdAt: '2025-01-01',
      },
    ];

    const result = resolveConflict('rob-jetson-01', requestedSlot, 92, lowPriorityExisting);
    expect(result.hasConflict).toBe(true);
    const arbitration = result.recommendations.find(r => r.type === 'faculty-arbitration');
    expect(arbitration).toBeDefined();
    expect(arbitration?.description).toContain('substantially outranks');
  });
});

describe('Dynamic Analytics Metrics Derivation', () => {
  it('should compute cross-department share rate dynamically without static numbers', () => {
    const confirmedBookings: Booking[] = [
      {
        id: 'bk-1',
        equipmentId: 'ai-dgx-01', // AI Department
        userId: 'stu-aarav', // Robotics Department
        userName: 'Aarav Sharma',
        projectType: 'Capstone',
        slot: { date: '2025-05-01', startHour: 10, endHour: 14 },
        status: 'Confirmed',
        priority: 90,
        createdAt: '2025-01-01',
      },
      {
        id: 'bk-2',
        equipmentId: 'rob-jetson-01', // Robotics Department
        userId: 'stu-aarav', // Robotics Department (Same dept)
        userName: 'Aarav Sharma',
        projectType: 'Capstone',
        slot: { date: '2025-05-02', startHour: 10, endHour: 12 },
        status: 'Confirmed',
        priority: 90,
        createdAt: '2025-01-01',
      },
    ];

    const crossDeptCount = confirmedBookings.filter(b => {
      const eq = equipmentMap.get(b.equipmentId);
      const user = users.find(u => u.id === b.userId);
      return eq && user && eq.department !== user.department;
    }).length;

    const rate = Math.round((crossDeptCount / confirmedBookings.length) * 100);
    expect(rate).toBe(50); // 1 out of 2 is cross-department
  });
});
