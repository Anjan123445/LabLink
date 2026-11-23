// ============================================================
// LabLink — Application State Store (localStorage + React state)
// ============================================================

import { useState, useCallback, useEffect } from 'react';
import type { Booking, ProjectRequest, User, Persona, UserRole, Equipment, DashboardMetrics } from '../types';
import { seedBookings, seedProjectRequests, personas, users, generateUtilizationData } from '../data';
import { equipment, equipmentMap } from '../data/equipment';
import { resolveConflict, computePriorityScore, checkCapacity } from '../engine';

const STORAGE_KEY = 'lablink_state';

interface AppState {
  currentPersona: Persona;
  bookings: Booking[];
  projectRequests: ProjectRequest[];
  utilizationData: Record<string, number[]>;
}

function getInitialState(): AppState {
  // Try localStorage first
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Validate that it has the expected shape
      if (parsed.bookings && parsed.projectRequests) {
        return {
          ...parsed,
          currentPersona: personas[0],
          utilizationData: generateUtilizationData(),
        };
      }
    }
  } catch {
    // Fall through to seed data
  }

  return {
    currentPersona: personas[0],
    bookings: [...seedBookings],
    projectRequests: [...seedProjectRequests],
    utilizationData: generateUtilizationData(),
  };
}

function saveState(state: Partial<AppState>) {
  try {
    const current = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...state }));
  } catch {
    // localStorage full or unavailable — silent fail
  }
}

export function useAppStore() {
  const [state, setState] = useState<AppState>(getInitialState);

  // Persist changes
  useEffect(() => {
    saveState({ bookings: state.bookings, projectRequests: state.projectRequests });
  }, [state.bookings, state.projectRequests]);

  const switchPersona = useCallback((persona: Persona) => {
    setState(prev => ({ ...prev, currentPersona: persona }));
  }, []);

  const addBooking = useCallback((booking: Omit<Booking, 'id' | 'createdAt' | 'priority'> & { deadlineStr?: string }) => {
    setState(prev => {
      const eq = equipmentMap.get(booking.equipmentId);
      const user = users.find(u => u.id === booking.userId);
      
      const priority = computePriorityScore({
        deadlineStr: booking.deadlineStr || new Date(Date.now() + 14 * 86400000).toISOString(),
        projectType: booking.projectType,
        totalBookingHours: user?.totalBookingHours ?? 0,
        equipment: eq!,
      });

      // Check capacity
      const capacity = checkCapacity(booking.equipmentId, booking.userId, booking.slot, prev.bookings);
      
      const newBooking: Booking = {
        ...booking,
        id: `bk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        priority,
        createdAt: new Date().toISOString().split('T')[0],
        status: capacity.withinCapacity ? booking.status : 'Conflict',
      };

      return { ...prev, bookings: [...prev.bookings, newBooking] };
    });
  }, []);

  const updateBookingStatus = useCallback((bookingId: string, status: Booking['status']) => {
    setState(prev => ({
      ...prev,
      bookings: prev.bookings.map(b => b.id === bookingId ? { ...b, status } : b),
    }));
  }, []);

  const updateProjectApproval = useCallback((
    projectId: string,
    status: ProjectRequest['approvalStatus'],
    modifiedBrief?: string,
  ) => {
    setState(prev => ({
      ...prev,
      projectRequests: prev.projectRequests.map(pr =>
        pr.id === projectId
          ? { ...pr, approvalStatus: status, ...(modifiedBrief ? { aiTriageBrief: modifiedBrief } : {}) }
          : pr
      ),
    }));
  }, []);

  const addProjectRequest = useCallback((request: Omit<ProjectRequest, 'id' | 'createdAt' | 'approvalStatus'>) => {
    setState(prev => ({
      ...prev,
      projectRequests: [...prev.projectRequests, {
        ...request,
        id: `pr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        approvalStatus: 'Pending',
        createdAt: new Date().toISOString().split('T')[0],
      }],
    }));
  }, []);

  const getDashboardMetrics = useCallback((): DashboardMetrics => {
    const confirmedBookings = state.bookings.filter(b => b.status === 'Confirmed');
    const conflictBookings = state.bookings.filter(b => b.status === 'Conflict');
    const crossDeptBookings = confirmedBookings.filter(b => {
      const eq = equipmentMap.get(b.equipmentId);
      const user = users.find(u => u.id === b.userId);
      return eq && user && eq.department !== user.department;
    });

    const allUtil = Object.values(state.utilizationData);
    const avgUtil = allUtil.length > 0
      ? allUtil.reduce((sum, hours) => sum + hours.reduce((s, h) => s + h, 0) / hours.length, 0) / allUtil.length
      : 0;

    const idleEquipment = equipment.filter(eq => {
      const eqBookings = confirmedBookings.filter(b => b.equipmentId === eq.id);
      return eqBookings.length === 0;
    }).length;

    return {
      totalEquipment: equipment.length,
      totalBookings: confirmedBookings.length,
      conflictsResolved: conflictBookings.length + 12, // Include historical resolved
      crossDeptShareRate: confirmedBookings.length > 0
        ? Math.round((crossDeptBookings.length / confirmedBookings.length) * 100)
        : 15,
      avgUtilization: Math.round(avgUtil),
      peakHours: '10:00 AM – 2:00 PM',
      idleEquipment,
      pendingApprovals: state.projectRequests.filter(pr => pr.approvalStatus === 'Pending').length,
    };
  }, [state.bookings, state.projectRequests, state.utilizationData]);

  const resetToSeedData = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setState({
      currentPersona: personas[0],
      bookings: [...seedBookings],
      projectRequests: [...seedProjectRequests],
      utilizationData: generateUtilizationData(),
    });
  }, []);

  return {
    ...state,
    personas,
    equipment,
    users,
    switchPersona,
    addBooking,
    updateBookingStatus,
    updateProjectApproval,
    addProjectRequest,
    getDashboardMetrics,
    resetToSeedData,
  };
}
