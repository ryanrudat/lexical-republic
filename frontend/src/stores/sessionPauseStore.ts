import { create } from 'zustand';

interface SessionPauseState {
  paused: boolean;
  message: string;
  pausedAt: number | null;
  setPaused: (paused: boolean, message?: string) => void;
}

export const useSessionPauseStore = create<SessionPauseState>((set) => ({
  paused: false,
  message: '',
  pausedAt: null,
  setPaused: (paused, message) =>
    set({
      paused,
      message: message ?? '',
      pausedAt: paused ? Date.now() : null,
    }),
}));
