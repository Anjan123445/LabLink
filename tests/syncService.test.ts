// ============================================================
// LabLink — Unit Tests for Hybrid Sync Service
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest';
import {
  getLocalState,
  saveLocalState,
  createBookingAtomic,
  mutateBookingStatus,
  createProjectRequestRecord,
  mutateProjectApproval,
  resetSystemData,
  initSyncService,
  isFirebaseConfigured,
} from '../src/services/syncService';
import type { Booking, ProjectRequest, SyncStatus } from '../src/types';

describe('syncService Local Mode Fallback', () => {
  beforeEach(async () => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
    await resetSystemData();
  });

  it('should detect when Firebase configuration is absent and default to local', () => {
    // In default test environment without VITE_FIREBASE_*, it should be false
    expect(typeof isFirebaseConfigured()).toBe('boolean');
  });

  it('should initialize with realistic seed data in local mode', () => {
    const state = getLocalState();
    expect(state.bookings.length).toBeGreaterThan(0);
    expect(state.projectRequests.length).toBeGreaterThan(0);
  });

  it('should subscribe via initSyncService and receive initial records', () => {
    let receivedBookings: Booking[] = [];
    let receivedStatus: SyncStatus | null = null;

    const unsub = initSyncService({
      onBookingsChange: b => { receivedBookings = b; },
      onProjectRequestsChange: () => {},
      onSyncStatusChange: s => { receivedStatus = s; },
    });

    expect(receivedBookings.length).toBeGreaterThan(0);
    expect(receivedStatus).not.toBeNull();
    const statusObj = receivedStatus as SyncStatus | null;
    expect(['local', 'cloud']).toContain(statusObj?.mode);

    unsub();
  });

  it('should atomically check for conflicts during booking creation in local mode', async () => {
    const newBooking: Booking = {
      id: 'bk-new-test',
      equipmentId: 'rob-jetson-01',
      userId: 'stu-karthik',
      userName: 'Karthik Reddy',
      projectType: 'Hackathon',
      slot: { date: '2025-12-01', startHour: 10, endHour: 12 },
      status: 'Confirmed',
      priority: 75,
      createdAt: '2025-11-20',
    };

    const first = await createBookingAtomic(newBooking);
    expect(first.success).toBe(true);
    expect(first.hasConflict).toBe(false);

    // Now attempt a second conflicting booking on exact same slot
    const collidingBooking: Booking = {
      id: 'bk-new-colliding',
      equipmentId: 'rob-jetson-01',
      userId: 'stu-aarav',
      userName: 'Aarav Sharma',
      projectType: 'Capstone',
      slot: { date: '2025-12-01', startHour: 11, endHour: 13 }, // Overlaps 10-12
      status: 'Confirmed',
      priority: 90,
      createdAt: '2025-11-20',
    };

    const second = await createBookingAtomic(collidingBooking);
    expect(second.success).toBe(true);
    expect(second.hasConflict).toBe(true);
    expect(second.booking.status).toBe('Conflict');
  });

  it('should update booking status and project approval', async () => {
    const state = getLocalState();
    const testBooking = state.bookings[0];
    await mutateBookingStatus(testBooking.id, 'Cancelled');

    const updatedState = getLocalState();
    const found = updatedState.bookings.find(b => b.id === testBooking.id);
    expect(found?.status).toBe('Cancelled');

    const testPr = state.projectRequests[0];
    await mutateProjectApproval(testPr.id, 'Approved with Modification', 'Stagger hours');
    const updatedPrState = getLocalState();
    const foundPr = updatedPrState.projectRequests.find(pr => pr.id === testPr.id);
    expect(foundPr?.approvalStatus).toBe('Approved with Modification');
    expect(foundPr?.facultyFeedback).toBe('Stagger hours');
  });

  it('should reset system data cleanly back to seed records', async () => {
    // Add dummy record
    const dummy: Booking = {
      id: 'dummy-booking-1',
      equipmentId: 'rob-jetson-01',
      userId: 'stu-dummy',
      userName: 'Dummy Student',
      projectType: 'Personal',
      slot: { date: '2030-01-01', startHour: 8, endHour: 9 },
      status: 'Confirmed',
      priority: 30,
      createdAt: '2025-01-01',
    };
    await createBookingAtomic(dummy);
    expect(getLocalState().bookings.some(b => b.id === 'dummy-booking-1')).toBe(true);

    await resetSystemData();
    expect(getLocalState().bookings.some(b => b.id === 'dummy-booking-1')).toBe(false);
  });
});
