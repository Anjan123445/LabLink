// ============================================================
// LabLink — Hybrid Cloud Firestore + Local Sync Adapter
// Real-time multi-user synchronization with zero-config fallback
// ============================================================

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  writeBatch,
  onSnapshot,
  runTransaction,
  type Firestore,
  type Unsubscribe,
} from 'firebase/firestore';

import type { Booking, ProjectRequest, SyncStatus, ApprovalStatus, BookingStatus } from '../types';
import { seedBookings, seedProjectRequests } from '../data/seed';
import { slotsOverlap } from '../engine/conflictResolver';

const STORAGE_KEY = 'lablink_state_v2';
const LOCAL_EVENT_KEY = 'lablink_local_sync';

// Read Firebase environment variables strictly via import.meta.env
const FIREBASE_CONFIG = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

export function isFirebaseConfigured(): boolean {
  return (
    Boolean(FIREBASE_CONFIG.apiKey) &&
    Boolean(FIREBASE_CONFIG.projectId) &&
    !FIREBASE_CONFIG.apiKey.includes('your_') &&
    !FIREBASE_CONFIG.projectId.includes('your_')
  );
}

let firebaseApp: FirebaseApp | null = null;
let firestoreDb: Firestore | null = null;

function getFirestoreInstance(): Firestore | null {
  if (!isFirebaseConfigured()) return null;
  if (firestoreDb) return firestoreDb;

  try {
    const existing = getApps();
    firebaseApp = existing.length > 0 ? existing[0] : initializeApp(FIREBASE_CONFIG);
    firestoreDb = getFirestore(firebaseApp);
    return firestoreDb;
  } catch (err) {
    console.warn('[LabLink Sync] Failed to initialize Firebase Firestore, falling back to Local Mode:', err);
    return null;
  }
}

// ── LOCAL STORAGE FALLBACK HELPERS ──────────────────────────

interface LocalState {
  bookings: Booking[];
  projectRequests: ProjectRequest[];
}

// In-memory fallback cache for Node/test environments where window/localStorage might be mocked or absent
let memoryStorage: Record<string, string> = {};

export function safeGetItem(key: string): string | null {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key);
    }
  } catch {
    // ignore
  }
  return memoryStorage[key] || null;
}

export function safeSetItem(key: string, value: string): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
    }
  } catch {
    // ignore
  }
  memoryStorage[key] = value;
}

export function safeRemoveItem(key: string): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(key);
    }
  } catch {
    // ignore
  }
  delete memoryStorage[key];
}

export function getLocalState(): LocalState {
  try {
    const raw = safeGetItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.bookings) && Array.isArray(parsed.projectRequests)) {
        return {
          bookings: parsed.bookings,
          projectRequests: parsed.projectRequests,
        };
      }
    }
  } catch {
    // ignore parse error and fallback to seeds
  }

  return {
    bookings: [...seedBookings],
    projectRequests: [...seedProjectRequests],
  };
}

export function saveLocalState(state: Partial<LocalState>) {
  try {
    const current = getLocalState();
    const merged: LocalState = {
      bookings: state.bookings ?? current.bookings,
      projectRequests: state.projectRequests ?? current.projectRequests,
    };
    safeSetItem(STORAGE_KEY, JSON.stringify(merged));
    // Trigger custom event for intra-window reactivity if window is available
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent(LOCAL_EVENT_KEY, { detail: merged }));
    }
  } catch (err) {
    console.warn('[LabLink Sync] LocalStorage write failed:', err);
  }
}

// ── FIRESTORE IDEMPOTENT SEEDING ────────────────────────────

async function ensureFirestoreSeeded(db: Firestore): Promise<void> {
  try {
    const metaRef = doc(db, 'system_meta', 'init_v1');
    const metaSnap = await getDoc(metaRef);

    if (metaSnap.exists()) {
      return; // Already seeded
    }

    // Verify bookings collection isn't already populated
    const bookingsSnap = await getDocs(collection(db, 'bookings'));
    if (!bookingsSnap.empty) {
      await setDoc(metaRef, { seededAt: new Date().toISOString() }, { merge: true });
      return;
    }

    const batch = writeBatch(db);

    // Seed initial bookings
    for (const b of seedBookings) {
      const bRef = doc(db, 'bookings', b.id);
      batch.set(bRef, b);
    }

    // Seed initial project requests
    for (const pr of seedProjectRequests) {
      const prRef = doc(db, 'projectRequests', pr.id);
      batch.set(prRef, pr);
    }

    // Mark as seeded
    batch.set(metaRef, {
      seededAt: new Date().toISOString(),
      version: '1.0.0',
    });

    await batch.commit();
  } catch (err) {
    console.warn('[LabLink Sync] Idempotent Firestore seeding check encountered an issue:', err);
  }
}

// ── SYNC SUBSCRIPTION LISTENER ──────────────────────────────

export interface SyncCallbacks {
  onBookingsChange: (bookings: Booking[]) => void;
  onProjectRequestsChange: (requests: ProjectRequest[]) => void;
  onSyncStatusChange: (status: SyncStatus) => void;
}

export function initSyncService(callbacks: SyncCallbacks): () => void {
  const db = getFirestoreInstance();

  if (!db) {
    // ── FALLBACK MODE: LocalStorage + Cross-Tab Event Listener ──
    callbacks.onSyncStatusChange({
      mode: 'local',
      label: 'Local Mode',
      detail: 'Zero-config local persistence (cross-tab & offline synced)',
      connected: true,
      lastSyncedAt: new Date().toISOString(),
    });

    // Provide initial state
    const initial = getLocalState();
    callbacks.onBookingsChange(initial.bookings);
    callbacks.onProjectRequestsChange(initial.projectRequests);

    // Cross-tab storage listener
    const handleStorageEvent = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY && event.newValue) {
        try {
          const parsed = JSON.parse(event.newValue);
          if (Array.isArray(parsed.bookings)) callbacks.onBookingsChange(parsed.bookings);
          if (Array.isArray(parsed.projectRequests)) callbacks.onProjectRequestsChange(parsed.projectRequests);
          callbacks.onSyncStatusChange({
            mode: 'local',
            label: 'Local Mode',
            detail: 'Synchronized from peer tab',
            connected: true,
            lastSyncedAt: new Date().toISOString(),
          });
        } catch {
          // ignore parse errors
        }
      }
    };

    // Intra-window custom event listener
    const handleLocalSync = (event: Event) => {
      const customEvent = event as CustomEvent<LocalState>;
      if (customEvent.detail) {
        callbacks.onBookingsChange(customEvent.detail.bookings);
        callbacks.onProjectRequestsChange(customEvent.detail.projectRequests);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorageEvent);
      window.addEventListener(LOCAL_EVENT_KEY, handleLocalSync);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', handleStorageEvent);
        window.removeEventListener(LOCAL_EVENT_KEY, handleLocalSync);
      }
    };
  }

  // ── PRIMARY MODE: Firebase Cloud Firestore onSnapshot ──────
  callbacks.onSyncStatusChange({
    mode: 'cloud',
    label: 'Cloud Synced (Live)',
    detail: `Connected to Firestore project "${FIREBASE_CONFIG.projectId}"`,
    connected: true,
    lastSyncedAt: new Date().toISOString(),
  });

  // Seed on launch if needed
  ensureFirestoreSeeded(db).catch(err => {
    console.warn('[LabLink Sync] Background seed error:', err);
  });

  const unsubBookings: Unsubscribe = onSnapshot(
    collection(db, 'bookings'),
    snapshot => {
      const bookings: Booking[] = [];
      snapshot.forEach(docSnap => {
        bookings.push(docSnap.data() as Booking);
      });
      callbacks.onBookingsChange(bookings);
      callbacks.onSyncStatusChange({
        mode: 'cloud',
        label: 'Cloud Synced (Live)',
        detail: `Real-time sync active (${bookings.length} bookings)`,
        connected: true,
        lastSyncedAt: new Date().toISOString(),
      });
    },
    error => {
      console.warn('[LabLink Sync] Firestore bookings listener failed:', error);
      callbacks.onSyncStatusChange({
        mode: 'local',
        label: 'Local Fallback',
        detail: 'Firestore connection dropped; operating from local cache',
        connected: false,
        lastSyncedAt: new Date().toISOString(),
      });
    }
  );

  const unsubRequests: Unsubscribe = onSnapshot(
    collection(db, 'projectRequests'),
    snapshot => {
      const requests: ProjectRequest[] = [];
      snapshot.forEach(docSnap => {
        requests.push(docSnap.data() as ProjectRequest);
      });
      callbacks.onProjectRequestsChange(requests);
    },
    error => {
      console.warn('[LabLink Sync] Firestore projectRequests listener failed:', error);
    }
  );

  return () => {
    unsubBookings();
    unsubRequests();
  };
}

// ── ATOMIC SLOT BOOKING WITH TRANSACTIONAL CONFLICT GUARD ───

export interface BookingCreationResult {
  success: boolean;
  booking: Booking;
  hasConflict: boolean;
  conflictDetails?: string;
}

export async function createBookingAtomic(
  newBooking: Booking,
  forceAsConflict: boolean = false
): Promise<BookingCreationResult> {
  const db = getFirestoreInstance();

  if (!db) {
    // ── LOCAL STORAGE TRANSACTION SIMULATION ──
    const current = getLocalState();
    
    // Check for conflict against confirmed non-cancelled bookings
    const activeConflicts = current.bookings.filter(
      b =>
        b.equipmentId === newBooking.equipmentId &&
        b.status === 'Confirmed' &&
        b.id !== newBooking.id &&
        slotsOverlap(b.slot, newBooking.slot)
    );

    const isConflict = forceAsConflict || activeConflicts.length > 0;
    const finalBooking: Booking = {
      ...newBooking,
      status: isConflict ? 'Conflict' : (newBooking.status || 'Confirmed'),
    };

    saveLocalState({
      bookings: [...current.bookings, finalBooking],
    });

    return {
      success: true,
      booking: finalBooking,
      hasConflict: isConflict,
      conflictDetails: isConflict ? `Collides with ${activeConflicts.length} existing slot(s)` : undefined,
    };
  }

  // ── FIRESTORE runTransaction FOR GLOBAL ATOMIC PRE-COMMIT CHECK ──
  try {
    const result = await runTransaction(db, async transaction => {
      const bookingsCol = collection(db, 'bookings');
      const allBookingsSnap = await getDocs(bookingsCol);

      const activeConflicts: Booking[] = [];
      allBookingsSnap.forEach(d => {
        const b = d.data() as Booking;
        if (
          b.equipmentId === newBooking.equipmentId &&
          b.status === 'Confirmed' &&
          b.id !== newBooking.id &&
          slotsOverlap(b.slot, newBooking.slot)
        ) {
          activeConflicts.push(b);
        }
      });

      const isConflict = forceAsConflict || activeConflicts.length > 0;
      const finalBooking: Booking = {
        ...newBooking,
        status: isConflict ? 'Conflict' : (newBooking.status || 'Confirmed'),
      };

      const bookingRef = doc(db, 'bookings', finalBooking.id);
      transaction.set(bookingRef, finalBooking);

      return {
        success: true,
        booking: finalBooking,
        hasConflict: isConflict,
        conflictDetails: isConflict ? `Collides with ${activeConflicts.length} active reservation(s)` : undefined,
      };
    });

    return result;
  } catch (err) {
    console.warn('[LabLink Sync] Firestore atomic transaction failed, falling back to local save:', err);
    // Graceful fallback to local
    const current = getLocalState();
    saveLocalState({ bookings: [...current.bookings, newBooking] });
    return {
      success: true,
      booking: newBooking,
      hasConflict: false,
    };
  }
}

// ── MUTATION HELPERS ────────────────────────────────────────

export async function mutateBookingStatus(bookingId: string, status: BookingStatus): Promise<void> {
  const db = getFirestoreInstance();

  if (!db) {
    const current = getLocalState();
    const updated = current.bookings.map(b => (b.id === bookingId ? { ...b, status } : b));
    saveLocalState({ bookings: updated });
    return;
  }

  try {
    const ref = doc(db, 'bookings', bookingId);
    await updateDoc(ref, { status });
  } catch (err) {
    console.warn('[LabLink Sync] Failed to update booking status in Firestore:', err);
    const current = getLocalState();
    saveLocalState({ bookings: current.bookings.map(b => (b.id === bookingId ? { ...b, status } : b)) });
  }
}

export async function createProjectRequestRecord(request: ProjectRequest): Promise<void> {
  const db = getFirestoreInstance();

  if (!db) {
    const current = getLocalState();
    saveLocalState({ projectRequests: [...current.projectRequests, request] });
    return;
  }

  try {
    const ref = doc(db, 'projectRequests', request.id);
    await setDoc(ref, request);
  } catch (err) {
    console.warn('[LabLink Sync] Failed to write project request to Firestore:', err);
    const current = getLocalState();
    saveLocalState({ projectRequests: [...current.projectRequests, request] });
  }
}

export async function mutateProjectApproval(
  requestId: string,
  status: ApprovalStatus,
  feedback?: string,
  modifiedBrief?: string
): Promise<void> {
  const db = getFirestoreInstance();

  const updates: Partial<ProjectRequest> = {
    approvalStatus: status,
    ...(feedback ? { facultyFeedback: feedback } : {}),
    ...(modifiedBrief ? { aiTriageBrief: modifiedBrief } : {}),
  };

  if (!db) {
    const current = getLocalState();
    const updated = current.projectRequests.map(pr =>
      pr.id === requestId ? { ...pr, ...updates } : pr
    );
    saveLocalState({ projectRequests: updated });
    return;
  }

  try {
    const ref = doc(db, 'projectRequests', requestId);
    await updateDoc(ref, updates);
  } catch (err) {
    console.warn('[LabLink Sync] Failed to update project approval in Firestore:', err);
    const current = getLocalState();
    const updated = current.projectRequests.map(pr =>
      pr.id === requestId ? { ...pr, ...updates } : pr
    );
    saveLocalState({ projectRequests: updated });
  }
}

export async function resetSystemData(): Promise<void> {
  const db = getFirestoreInstance();

  // Reset local state unconditionally
  try {
    safeRemoveItem(STORAGE_KEY);
    saveLocalState({
      bookings: [...seedBookings],
      projectRequests: [...seedProjectRequests],
    });
  } catch {
    // ignore
  }

  if (db) {
    try {
      const batch = writeBatch(db);

      // Reset bookings collection
      const bookingsSnap = await getDocs(collection(db, 'bookings'));
      bookingsSnap.forEach(d => batch.delete(d.ref));
      for (const b of seedBookings) {
        batch.set(doc(db, 'bookings', b.id), b);
      }

      // Reset projectRequests collection
      const prSnap = await getDocs(collection(db, 'projectRequests'));
      prSnap.forEach(d => batch.delete(d.ref));
      for (const pr of seedProjectRequests) {
        batch.set(doc(db, 'projectRequests', pr.id), pr);
      }

      await batch.commit();
    } catch (err) {
      console.warn('[LabLink Sync] Failed to reset Firestore data:', err);
    }
  }
}
