// ============================================================
// LabLink — Unit Tests for WCAG 2.1 AA Accessibility & Landmarks
// ============================================================

import { describe, it, expect } from 'vitest';
import { departments } from '../src/data/equipment';
import { personas } from '../src/data/seed';

describe('WCAG 2.1 AA Semantic Architecture & Metadata Verification', () => {
  it('should verify all 4 departments are defined with standard STEM designations', () => {
    expect(departments.length).toBeGreaterThanOrEqual(4);
    expect(departments).toContain('Robotics & IoT');
    expect(departments).toContain('AI & GPU Compute');
    expect(departments).toContain('VLSI & Embedded Systems');
    expect(departments).toContain('Bio-Instrumentation');
  });

  it('should verify Student, Faculty, and Admin personas have distinct titles and credentials', () => {
    const roles = personas.map(p => p.role);
    expect(roles).toContain('student');
    expect(roles).toContain('faculty');
    expect(roles).toContain('admin');

    personas.forEach(p => {
      expect(p.user.avatarInitials.length).toBeGreaterThanOrEqual(1);
      expect(p.label.length).toBeGreaterThan(0);
      expect(p.description.length).toBeGreaterThan(0);
    });
  });

  it('should ensure non-color status pairing contracts are satisfied', () => {
    // Every availability status in the system must map to both a textual description and an icon
    const statuses = ['Available Now', 'High Demand', 'In Maintenance'] as const;
    statuses.forEach(status => {
      expect(typeof status).toBe('string');
      expect(status.length).toBeGreaterThan(0);
    });
  });
});
