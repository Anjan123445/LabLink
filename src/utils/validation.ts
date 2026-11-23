// ============================================================
// LabLink — Security, Input Sanitization & Date Validation Utility
// ============================================================

import type { TimeSlot } from '../types';

/**
 * Sanitizes arbitrary user text:
 * - Strips all HTML and script tags
 * - Removes null bytes and potentially dangerous control characters
 * - Trims whitespace
 * - Enforces an optional maximum character length bound
 */
export function sanitizeText(input: unknown, maxLength: number = 1000): string {
  if (typeof input !== 'string') return '';
  
  // Strip script, style, and HTML tags aggressively
  let clean = input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, '')
    // Strip javascript: or data: URIs if any leaked
    .replace(/javascript:/gi, '')
    .replace(/data:\s*text\/html/gi, '')
    // Strip null bytes and non-printable control characters (except newline, tab, cr)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim();

  if (maxLength > 0 && clean.length > maxLength) {
    clean = clean.slice(0, maxLength);
  }

  return clean;
}

/**
 * Sanitizes an array of string items (e.g. team member names or tags)
 */
export function sanitizeStringArray(items: unknown[], maxItems: number = 20, maxItemLength: number = 100): string[] {
  if (!Array.isArray(items)) return [];
  return items
    .slice(0, maxItems)
    .map(item => sanitizeText(item, maxItemLength))
    .filter(Boolean);
}

export interface SlotValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates a booking time slot:
 * - date format YYYY-MM-DD
 * - startHour < endHour
 * - startHour and endHour between 0 and 24
 * - date must not be in the past
 * - if date is today, startHour must not be in the past
 * - duration must be at least 1 hour and at most maxAllowedHours (default 12)
 */
export function validateBookingSlot(
  slot: TimeSlot,
  maxAllowedHours: number = 12,
  operatingStart: number = 8,
  operatingEnd: number = 20
): SlotValidationResult {
  if (!slot || typeof slot !== 'object') {
    return { isValid: false, error: 'Invalid time slot object.' };
  }

  const { date, startHour, endHour } = slot;

  if (!date || typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { isValid: false, error: 'Booking date must be in YYYY-MM-DD format.' };
  }

  if (typeof startHour !== 'number' || typeof endHour !== 'number') {
    return { isValid: false, error: 'Start and end hours must be numbers.' };
  }

  if (Number.isNaN(startHour) || Number.isNaN(endHour)) {
    return { isValid: false, error: 'Start and end hours cannot be NaN.' };
  }

  if (startHour < 0 || startHour > 23 || endHour < 1 || endHour > 24) {
    return { isValid: false, error: 'Slot hours must be between 0:00 and 24:00.' };
  }

  if (endHour <= startHour) {
    return { isValid: false, error: `End hour (${endHour}:00) must be strictly greater than start hour (${startHour}:00).` };
  }

  const duration = endHour - startHour;
  if (duration > maxAllowedHours) {
    return { isValid: false, error: `Requested duration of ${duration} hours exceeds maximum daily limit of ${maxAllowedHours} hours.` };
  }

  if (startHour < operatingStart || endHour > operatingEnd) {
    return { isValid: false, error: `Bookings are only permitted during lab operating hours (${operatingStart}:00 to ${operatingEnd}:00).` };
  }

  // Date bound validation
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  if (date < todayStr) {
    return { isValid: false, error: 'Cannot book time slots in the past.' };
  }

  if (date === todayStr) {
    const currentHour = now.getHours();
    if (startHour < currentHour) {
      return { isValid: false, error: `Cannot book hour ${startHour}:00 for today as it has already passed.` };
    }
  }

  return { isValid: true };
}

export interface ProjectRequestValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  sanitized?: {
    title: string;
    description: string;
    teamMembers: string[];
    facultyMentor: string;
    deadline: string;
    requiredEquipment: string[];
    requiredHours: number;
    justification: string;
  };
}

/**
 * Validates and sanitizes a multi-resource project access request proposal
 */
export function validateProjectRequest(input: {
  title?: unknown;
  description?: unknown;
  teamMembers?: unknown;
  facultyMentor?: unknown;
  deadline?: unknown;
  requiredEquipment?: unknown;
  requiredHours?: unknown;
  justification?: unknown;
}): ProjectRequestValidationResult {
  const errors: Record<string, string> = {};

  const title = sanitizeText(input.title, 150);
  if (!title) {
    errors.title = 'Project title is required (up to 150 characters).';
  }

  const description = sanitizeText(input.description, 2000);

  let teamMembers: string[] = [];
  if (Array.isArray(input.teamMembers)) {
    teamMembers = sanitizeStringArray(input.teamMembers, 10, 80);
  } else if (typeof input.teamMembers === 'string') {
    teamMembers = input.teamMembers
      .split(',')
      .map(m => sanitizeText(m, 80))
      .filter(Boolean);
  }

  const facultyMentor = sanitizeText(input.facultyMentor, 100);

  const deadline = typeof input.deadline === 'string' ? input.deadline.trim() : '';
  if (!deadline || !/^\d{4}-\d{2}-\d{2}/.test(deadline)) {
    errors.deadline = 'Valid project deadline date is required.';
  } else {
    const todayStr = new Date().toISOString().split('T')[0];
    if (deadline < todayStr) {
      errors.deadline = 'Project deadline cannot be in the past.';
    }
  }

  let requiredEquipment: string[] = [];
  if (Array.isArray(input.requiredEquipment)) {
    requiredEquipment = input.requiredEquipment.filter(id => typeof id === 'string' && id.trim().length > 0);
  }
  if (requiredEquipment.length === 0) {
    errors.requiredEquipment = 'At least one equipment item must be selected.';
  }

  const hours = Number(input.requiredHours);
  if (Number.isNaN(hours) || hours < 1 || hours > 200) {
    errors.requiredHours = 'Required hours must be an integer between 1 and 200.';
  }

  const justification = sanitizeText(input.justification, 1000);

  const isValid = Object.keys(errors).length === 0;

  return {
    isValid,
    errors,
    ...(isValid ? {
      sanitized: {
        title,
        description,
        teamMembers,
        facultyMentor,
        deadline,
        requiredEquipment,
        requiredHours: Math.round(hours),
        justification,
      }
    } : {})
  };
}

/**
 * Sanitizes error messages to prevent leaking API keys, credentials, internal paths, or stack traces
 */
export function sanitizeErrorMessage(error: unknown, fallback: string = 'An unexpected error occurred. Please try again.'): string {
  if (!error) return fallback;

  let msg = '';
  if (error instanceof Error) {
    msg = error.message;
  } else if (typeof error === 'string') {
    msg = error;
  } else {
    msg = String(error);
  }

  // Redact potential API keys (alphanumeric sequences 25+ chars, AIzaSy..., etc.)
  msg = msg.replace(/AIza[0-9A-Za-z_-]{20,60}/g, '[REDACTED_API_KEY]');
  msg = msg.replace(/key=[0-9A-Za-z-_]+/gi, 'key=[REDACTED]');
  msg = msg.replace(/token=[0-9A-Za-z-_]+/gi, 'token=[REDACTED]');
  msg = msg.replace(/https?:\/\/[^\s]+/gi, '[EXTERNAL_URL]');
  msg = msg.replace(/at\s+.*\((?:.*:\d+:\d+|native)\)/gi, ''); // Strip stack trace lines

  const clean = sanitizeText(msg, 300);
  return clean || fallback;
}
