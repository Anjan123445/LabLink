// ============================================================
// LabLink — Unit Tests for Validation & Sanitization Utility
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  sanitizeText,
  sanitizeStringArray,
  validateBookingSlot,
  validateProjectRequest,
  sanitizeErrorMessage,
} from '../src/utils/validation';
import type { TimeSlot } from '../src/types';

describe('sanitizeText', () => {
  it('should strip script tags and content', () => {
    const malicious = '<script>alert("pwned")</script>Hello World';
    expect(sanitizeText(malicious)).toBe('Hello World');
  });

  it('should strip nested and partial HTML tags', () => {
    const html = '<div class="alert"><b onclick="doBad()">Warning:</b> System <img src="x" onerror="alert(1)"/>Ready</div>';
    expect(sanitizeText(html)).toBe('Warning: System Ready');
  });

  it('should strip javascript: pseudoprotocol', () => {
    const input = 'Click here: javascript:alert(document.cookie)';
    expect(sanitizeText(input)).not.toContain('javascript:');
  });

  it('should remove null bytes and ASCII control characters', () => {
    const dirty = 'Hello\x00\x08World\x1F!';
    expect(sanitizeText(dirty)).toBe('HelloWorld!');
  });

  it('should enforce maxLength boundary', () => {
    const long = 'A'.repeat(500);
    expect(sanitizeText(long, 50).length).toBe(50);
  });

  it('should handle non-string gracefully', () => {
    expect(sanitizeText(null)).toBe('');
    expect(sanitizeText(undefined)).toBe('');
    expect(sanitizeText(12345)).toBe('');
  });
});

describe('sanitizeStringArray', () => {
  it('should sanitize each item in array and trim', () => {
    const raw = ['<b>Alice</b>', '  Bob  ', '<script>bad()</script>Charlie'];
    const result = sanitizeStringArray(raw);
    expect(result).toEqual(['Alice', 'Bob', 'Charlie']);
  });

  it('should cap array length and item length', () => {
    const raw = Array.from({ length: 30 }, (_, i) => `Student ${i}`);
    const result = sanitizeStringArray(raw, 5, 10);
    expect(result.length).toBe(5);
  });
});

describe('validateBookingSlot', () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  it('should accept valid future booking slot within operating hours', () => {
    const slot: TimeSlot = { date: tomorrowStr, startHour: 10, endHour: 12 };
    const res = validateBookingSlot(slot, 6);
    expect(res.isValid).toBe(true);
    expect(res.error).toBeUndefined();
  });

  it('should reject inverted time intervals where endHour <= startHour', () => {
    const slot: TimeSlot = { date: tomorrowStr, startHour: 14, endHour: 12 };
    const res = validateBookingSlot(slot, 6);
    expect(res.isValid).toBe(false);
    expect(res.error).toContain('strictly greater than start hour');
  });

  it('should reject equal startHour and endHour (zero duration)', () => {
    const slot: TimeSlot = { date: tomorrowStr, startHour: 10, endHour: 10 };
    const res = validateBookingSlot(slot, 6);
    expect(res.isValid).toBe(false);
  });

  it('should reject bookings outside operating hours (8:00 to 20:00)', () => {
    const earlySlot: TimeSlot = { date: tomorrowStr, startHour: 6, endHour: 9 };
    expect(validateBookingSlot(earlySlot, 6).isValid).toBe(false);

    const lateSlot: TimeSlot = { date: tomorrowStr, startHour: 19, endHour: 22 };
    expect(validateBookingSlot(lateSlot, 6).isValid).toBe(false);
  });

  it('should reject past dates', () => {
    const pastSlot: TimeSlot = { date: '2020-01-01', startHour: 10, endHour: 12 };
    const res = validateBookingSlot(pastSlot, 6);
    expect(res.isValid).toBe(false);
    expect(res.error).toContain('past');
  });

  it('should reject bookings that exceed equipment daily limit', () => {
    const slot: TimeSlot = { date: tomorrowStr, startHour: 9, endHour: 17 }; // 8 hours
    const res = validateBookingSlot(slot, 4); // max 4h
    expect(res.isValid).toBe(false);
    expect(res.error).toContain('exceeds maximum daily limit');
  });
});

describe('validateProjectRequest', () => {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 14);
  const futureStr = futureDate.toISOString().split('T')[0];

  it('should validate and sanitize valid project proposal', () => {
    const input = {
      title: '  <b>Autonomous Robot Drone</b>  ',
      description: 'Vision stack for <script>alert(1)</script>landing',
      teamMembers: 'Aarav Sharma, Sneha Gupta',
      facultyMentor: 'Dr. Meera Nair',
      deadline: futureStr,
      requiredEquipment: ['rob-jetson-01', 'rob-drone-01'],
      requiredHours: 20,
      justification: 'Critical capstone validation',
    };

    const res = validateProjectRequest(input);
    expect(res.isValid).toBe(true);
    expect(res.sanitized?.title).toBe('Autonomous Robot Drone');
    expect(res.sanitized?.description).toBe('Vision stack for landing');
    expect(res.sanitized?.teamMembers).toEqual(['Aarav Sharma', 'Sneha Gupta']);
    expect(res.sanitized?.requiredHours).toBe(20);
  });

  it('should reject request missing title or equipment', () => {
    const res = validateProjectRequest({
      title: '',
      deadline: futureStr,
      requiredEquipment: [],
      requiredHours: 10,
    });
    expect(res.isValid).toBe(false);
    expect(res.errors.title).toBeDefined();
    expect(res.errors.requiredEquipment).toBeDefined();
  });

  it('should reject past deadline', () => {
    const res = validateProjectRequest({
      title: 'Valid Project Title',
      deadline: '2021-05-10',
      requiredEquipment: ['rob-jetson-01'],
      requiredHours: 10,
    });
    expect(res.isValid).toBe(false);
    expect(res.errors.deadline).toContain('past');
  });
});

describe('sanitizeErrorMessage', () => {
  it('should redact raw Gemini and Firebase API keys', () => {
    const rawError = 'Error connecting to Gemini with key AIzaSyD3x9ZqW8V7uP2mK1jH4tG6sF5aL0eR8y';
    const sanitized = sanitizeErrorMessage(rawError);
    expect(sanitized).not.toContain('AIzaSyD3x9ZqW8V7uP2mK1jH4tG6sF5aL0eR8y');
    expect(sanitized).toContain('[REDACTED_API_KEY]');
  });

  it('should redact external URLs and query parameters', () => {
    const rawError = 'Failed to fetch https://generativelanguage.googleapis.com/v1beta/models?key=secret_123';
    const sanitized = sanitizeErrorMessage(rawError);
    expect(sanitized).not.toContain('https://');
    expect(sanitized).not.toContain('secret_123');
  });

  it('should return fallback if input is null or empty', () => {
    expect(sanitizeErrorMessage(null)).toBe('An unexpected error occurred. Please try again.');
  });
});
