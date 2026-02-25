import { create } from 'zustand';
import type { SessionConfig, PhaseConfig, PhaseProgress, ClipState } from '../types/sessions';
import {
  fetchSessionConfig,
  fetchSessionProgress,
  completePhase as apiCompletePhase,
} from '../api/sessions';

interface SessionConfigState {
  session: SessionConfig | null;
  phaseProgress: PhaseProgress[];
  currentPhaseIndex: number;
  clipState: ClipState;
  loading: boolean;
  error: string | null;

  loadSession: (weekId: string) => Promise<boolean>;
  getCurrentPhase: () => PhaseConfig | null;
  setClipState: (state: ClipState) => void;
  completeCurrentPhase: (score?: number, details?: Record<string, unknown>) => Promise<void>;
  nextPhase: () => void;
  reset: () => void;
}

export const useSessionConfigStore = create<SessionConfigState>((set, get) => ({
  session: null,
  phaseProgress: [],
  currentPhaseIndex: 0,
  clipState: 'before',
  loading: false,
  error: null,

  loadSession: async (weekId: string) => {
    set({ loading: true, error: null });
    try {
      const config = await fetchSessionConfig(weekId);
      if (!config) {
        set({ session: null, loading: false });
        return false;
      }

      const { phases: progress } = await fetchSessionProgress(weekId);

      // Find first incomplete phase
      let startIndex = 0;
      for (let i = 0; i < config.phases.length; i++) {
        const prog = progress.find((p) => p.phaseId === config.phases[i].id);
        if (!prog?.completed) {
          startIndex = i;
          break;
        }
        if (i === config.phases.length - 1) {
          startIndex = i; // All complete, show last
        }
      }

      set({
        session: config,
        phaseProgress: progress,
        currentPhaseIndex: startIndex,
        clipState: 'before',
        loading: false,
      });
      return true;
    } catch {
      set({ error: 'Failed to load session', loading: false });
      return false;
    }
  },

  getCurrentPhase: () => {
    const { session, currentPhaseIndex } = get();
    if (!session) return null;
    return session.phases[currentPhaseIndex] || null;
  },

  setClipState: (clipState) => set({ clipState }),

  completeCurrentPhase: async (score, details) => {
    const { session, currentPhaseIndex, phaseProgress } = get();
    if (!session) return;

    const phase = session.phases[currentPhaseIndex];
    if (!phase) return;

    try {
      await apiCompletePhase(session.weekId, phase.id, score, details);

      // Update local progress
      const updated = [...phaseProgress];
      const existingIdx = updated.findIndex((p) => p.phaseId === phase.id);
      const newProg: PhaseProgress = {
        phaseId: phase.id,
        missionId: phase.missionId || null,
        completed: true,
        score: score ?? 1.0,
      };
      if (existingIdx >= 0) {
        updated[existingIdx] = newProg;
      } else {
        updated.push(newProg);
      }
      set({ phaseProgress: updated, clipState: 'after' });
    } catch {
      // Non-fatal — still allow navigation
      set({ clipState: 'after' });
    }
  },

  nextPhase: () => {
    const { session, currentPhaseIndex } = get();
    if (!session) return;

    const nextIndex = currentPhaseIndex + 1;
    if (nextIndex < session.phases.length) {
      set({ currentPhaseIndex: nextIndex, clipState: 'before' });
    }
  },

  reset: () =>
    set({
      session: null,
      phaseProgress: [],
      currentPhaseIndex: 0,
      clipState: 'before',
      loading: false,
      error: null,
    }),
}));
