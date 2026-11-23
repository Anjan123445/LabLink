// ============================================================
// LabLink — Unit Tests for GenAI Assistant & Offline Matcher
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  offlineSemanticMatcher,
  matchProjectToEquipment,
  generateApprovalTriageBrief,
  explainConflictResolution,
  isGeminiConfigured,
} from '../src/services/aiAssistant';
import { resolveConflict } from '../src/engine/conflictResolver';
import type { ProjectRequest, Booking, TimeSlot } from '../src/types';

describe('offlineSemanticMatcher', () => {
  it('should match drone keywords to drone and robotics hardware', () => {
    const res = offlineSemanticMatcher('I want to test autonomous drone navigation with obstacle avoidance');
    const ids = res.matchedEquipment.map(e => e.id);
    expect(ids.some(id => id.includes('drone') || id.includes('jetson') || id.includes('lidar'))).toBe(true);
  });

  it('should match deep learning training keywords to GPU workstations', () => {
    const res = offlineSemanticMatcher('Fine-tuning a PyTorch LLM model on CUDA GPU cluster');
    const ids = res.matchedEquipment.map(e => e.id);
    expect(ids.some(id => id.includes('dgx') || id.includes('rtx'))).toBe(true);
  });

  it('should match FPGA digital design keywords to Artix-7 board', () => {
    const res = offlineSemanticMatcher('Implementing a custom Verilog accelerator on FPGA');
    const ids = res.matchedEquipment.map(e => e.id);
    expect(ids).toContain('vlsi-fpga-01');
  });

  it('should match PCR and bioprinting keywords to biomedical instrumentation', () => {
    const res = offlineSemanticMatcher('Studying gene expression with real-time PCR and tissue printing');
    const ids = res.matchedEquipment.map(e => e.id);
    expect(ids.some(id => id.includes('pcr') || id.includes('bioprint'))).toBe(true);
  });

  it('should adjust suggested hours based on project scope keywords', () => {
    const thesis = offlineSemanticMatcher('Comprehensive capstone thesis model training');
    expect(thesis.suggestedHours).toBe(24);

    const hackathon = offlineSemanticMatcher('Quick hackathon demo prototype');
    expect(hackathon.suggestedHours).toBe(8);

    const quick = offlineSemanticMatcher('Quick signal test');
    expect(quick.suggestedHours).toBe(4);
  });
});

describe('matchProjectToEquipment (Offline Fallback Guarantee)', () => {
  it('should return source: "fallback" when live API key is absent or mock environment', async () => {
    const result = await matchProjectToEquipment('Designing a LoRa IoT sensor node with logic analyzer debugging');
    expect(result.equipment.length).toBeGreaterThan(0);
    expect(result.recommendedKit).toBeDefined();
    expect(result.recommendedKit.requiredEquipment.length).toBeGreaterThan(0);
    expect(result.explanation).toContain('Recommended Equipment');
    expect(['gemini', 'fallback']).toContain(result.source);
  });

  it('should construct a pre-fillable recommendedKit object', async () => {
    const result = await matchProjectToEquipment('Autonomous UAV obstacle mapping using Jetson');
    expect(result.recommendedKit.title).toBeDefined();
    expect(result.recommendedKit.requiredHours).toBeGreaterThan(0);
    expect(result.recommendedKit.justification).toContain('Requires multi-lab equipment');
    expect(Array.isArray(result.recommendedKit.requiredEquipment)).toBe(true);
  });
});

describe('generateApprovalTriageBrief', () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 2);

  const mockRequest: ProjectRequest = {
    id: 'pr-test-1',
    title: 'Urgent Autonomous System Testing',
    description: 'Testing high contention units',
    userId: 'stu-karthik',
    userName: 'Karthik Reddy',
    teamMembers: ['Karthik Reddy'],
    facultyMentor: 'Dr. Meera Nair',
    deadline: tomorrow.toISOString().split('T')[0],
    projectType: 'Hackathon',
    requiredEquipment: ['rob-jetson-01'], // High Demand
    requiredHours: 25,
    justification: 'Critical test',
    approvalStatus: 'Pending',
    createdAt: new Date().toISOString().split('T')[0],
  };

  const mockBookings: Booking[] = [
    {
      id: 'bk-existing',
      equipmentId: 'rob-jetson-01',
      userId: 'stu-aarav',
      userName: 'Aarav Sharma',
      projectType: 'Capstone',
      slot: { date: tomorrow.toISOString().split('T')[0], startHour: 10, endHour: 14 },
      status: 'Confirmed',
      priority: 90,
      createdAt: '2025-01-01',
    },
  ];

  it('should flag CRITICAL urgency for imminent deadlines <= 3 days', () => {
    const brief = generateApprovalTriageBrief(mockRequest, mockBookings);
    expect(brief).toContain('CRITICAL Urgency');
    expect(brief).toContain('High-Demand Notice');
    expect(brief).toContain('Collision Risk');
  });

  it('should suggest staggered allocations when requested hours > 20', () => {
    const brief = generateApprovalTriageBrief(mockRequest, mockBookings);
    expect(brief).toContain('stagger into 4-hour daily caps');
  });
});

describe('explainConflictResolution', () => {
  it('should explain collision and provide the 4 criteria factors', () => {
    const slot: TimeSlot = { date: '2025-10-10', startHour: 10, endHour: 12 };
    const conflictBooking: Booking = {
      id: 'bk-test-overlap',
      equipmentId: 'rob-jetson-01',
      userId: 'stu-aarav',
      userName: 'Aarav Sharma',
      projectType: 'Capstone',
      slot: { date: '2025-10-10', startHour: 11, endHour: 13 },
      status: 'Confirmed',
      priority: 85,
      createdAt: '2025-10-01',
    };

    const conflict = resolveConflict('rob-jetson-01', slot, 75, [conflictBooking]);
    const explanation = explainConflictResolution(conflict, 'rob-jetson-01');

    expect(explanation).toContain('Scheduling Overlap');
    expect(explanation).toContain('Project Deadline Urgency (35%)');
    expect(explanation).toContain('Academic Requirement / Project Type (25%)');
    expect(explanation).toContain('Student Historical Usage Fairness (20%)');
    expect(explanation).toContain('Equipment Criticality & Substitutes (20%)');
  });
});
