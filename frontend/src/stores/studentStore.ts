import { create } from 'zustand';
import type { User } from '../api/auth';
import { loginStudent, loginTeacher as apiLoginTeacher, registerStudent as apiRegister, registerTeacher as apiRegisterTeacher, logout as apiLogout, getMe } from '../api/auth';
import { disconnectSocket } from '../utils/socket';
import { useSessionStore } from './sessionStore';
import { useSpyStore } from './spyStore';
import { useShiftQueueStore } from './shiftQueueStore';
import { useShiftStore } from './shiftStore';
import { useSeasonStore } from './seasonStore';
import { useDictionaryStore } from './dictionaryStore';
import { useSessionPauseStore } from './sessionPauseStore';
import { useAudioStore } from './audioStore';
import { usePearlStore } from './pearlStore';
import { useMessagingStore } from './messagingStore';
import { useHarmonyStore } from './harmonyStore';
import { useInscriptionStore } from './inscriptionStore';

// Full session-store hygiene. Pairs share a Chromebook and student B logs in
// after A with NO page reload, so EVERY session-scoped store must be cleared
// or A's state bleeds into B (open remediation modal, private dictionary
// notes, wrong narrative route, a stuck pause overlay, unread message toast,
// Harmony credits under A's key, an in-flight Word Pool drill, PEARL's
// "allocation exhausted" lock, …). login() re-hydrates B's own data.
// Called from logout() AND from refresh()'s genuine-401 path — any session
// teardown must run the SAME cascade.
function resetSessionStores(): void {
  useSpyStore.getState().reset();
  useSessionStore.getState().resetConcern(); // score + rate machine + timers + drill shield
  useShiftQueueStore.getState().reset();
  useShiftStore.getState().reset();
  useSeasonStore.getState().reset();
  useDictionaryStore.getState().reset();
  useMessagingStore.getState().reset();
  useHarmonyStore.getState().reset();
  useInscriptionStore.getState().reset();
  useSessionPauseStore.getState().setPaused(false);
  useAudioStore.getState().reset();
  usePearlStore.getState().reset();
}

interface ApiErrorShape {
  response?: {
    data?: {
      error?: string;
    };
  };
}

function getApiErrorMessage(err: unknown, fallback: string): string {
  if (typeof err === 'object' && err !== null) {
    const apiError = err as ApiErrorShape;
    return apiError.response?.data?.error || fallback;
  }
  return fallback;
}

interface StudentState {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (designation: string, pin: string) => Promise<void>;
  loginTeacher: (username: string, password: string) => Promise<void>;
  register: (studentNumber: string, pin: string, displayName?: string, classCode?: string, studentAName?: string, studentBName?: string) => Promise<void>;
  registerTeacher: (username: string, password: string, displayName: string, registrationCode: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  setLane: (lane: number) => void;
}

export const useStudentStore = create<StudentState>((set) => ({
  user: null,
  loading: true,
  error: null,

  login: async (designation, pin) => {
    set({ loading: true, error: null });
    try {
      console.log('[LOGIN] Calling API with', designation);
      const user = await loginStudent(designation, pin);
      console.log('[LOGIN] Success:', user);
      if (user.concernScore != null) {
        useSessionStore.getState().hydrateConcern(user.concernScore);
      }
      set({ user, loading: false });
    } catch (err: unknown) {
      console.error('[LOGIN] Failed:', err);
      const message = getApiErrorMessage(err, 'Login failed');
      set({ error: message, loading: false });
      throw err;
    }
  },

  loginTeacher: async (username, password) => {
    set({ loading: true, error: null });
    try {
      const user = await apiLoginTeacher(username, password);
      set({ user, loading: false });
    } catch (err: unknown) {
      const message = getApiErrorMessage(err, 'Login failed');
      set({ error: message, loading: false });
      throw err;
    }
  },

  register: async (studentNumber, pin, displayName, classCode, studentAName, studentBName) => {
    set({ loading: true, error: null });
    try {
      const user = await apiRegister(studentNumber, pin, displayName, classCode, studentAName, studentBName);
      if (user.concernScore != null) {
        useSessionStore.getState().hydrateConcern(user.concernScore);
      }
      set({ user, loading: false });
    } catch (err: unknown) {
      const message = getApiErrorMessage(err, 'Registration failed');
      set({ error: message, loading: false });
      throw err;
    }
  },

  registerTeacher: async (username, password, displayName, registrationCode) => {
    set({ loading: true, error: null });
    try {
      const user = await apiRegisterTeacher(username, password, displayName, registrationCode);
      set({ user, loading: false });
    } catch (err: unknown) {
      const message = getApiErrorMessage(err, 'Registration failed');
      set({ error: message, loading: false });
      throw err;
    }
  },

  logout: async () => {
    try {
      disconnectSocket();
      await apiLogout();
    } finally {
      resetSessionStores();
      set({ user: null, loading: false, error: null });
    }
  },

  setLane: (lane) =>
    set((state) => {
      if (!state.user) return state;
      return { user: { ...state.user, lane } };
    }),

  refresh: async () => {
    // Only show loading screen on initial load (user not yet known).
    // Re-validating an existing session should NOT set loading=true,
    // because that unmounts the entire UI (including teacher socket).
    const currentUser = useStudentStore.getState().user;
    if (!currentUser) {
      set({ loading: true });
    }
    try {
      const user = await getMe();
      if (user.concernScore != null) {
        useSessionStore.getState().hydrateConcern(user.concernScore);
      }
      set({ user, loading: false });
    } catch (err: unknown) {
      // Only clear the session on a GENUINE auth failure (401/403). A transient
      // network error (offline, timeout, 5xx) must NOT log the student out — the
      // visibility/focus handler that calls refresh() fires exactly when a
      // Chromebook wakes from sleep, which is when Wi-Fi is most likely momentarily
      // down. Nuking the user here would redirect mid-shift and drop unsaved input.
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401 || status === 403) {
        disconnectSocket();
        // Same hygiene cascade as logout() — a 401 here means the session is
        // dead, and the next login may be a DIFFERENT student on this device.
        resetSessionStores();
        set({ user: null, loading: false });
      } else {
        set({ loading: false });
      }
    }
  },
}));
