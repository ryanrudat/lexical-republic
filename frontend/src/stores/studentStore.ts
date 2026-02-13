import { create } from 'zustand';
import type { User } from '../api/auth';
import { loginStudent, loginTeacher as apiLoginTeacher, registerStudent as apiRegister, logout as apiLogout, getMe } from '../api/auth';

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
  register: (studentNumber: string, pin: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
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

  register: async (studentNumber, pin, displayName) => {
    set({ loading: true, error: null });
    try {
      const user = await apiRegister(studentNumber, pin, displayName);
      set({ user, loading: false });
    } catch (err: unknown) {
      const message = getApiErrorMessage(err, 'Registration failed');
      set({ error: message, loading: false });
      throw err;
    }
  },

  logout: async () => {
    try {
      await apiLogout();
    } finally {
      set({ user: null, loading: false, error: null });
    }
  },

  refresh: async () => {
    set({ loading: true });
    try {
      const user = await getMe();
      set({ user, loading: false });
    } catch {
      set({ user: null, loading: false });
    }
  },
}));
