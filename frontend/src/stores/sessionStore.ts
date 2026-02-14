import { create } from 'zustand';
import type { GrammarError } from '../api/ai';

/**
 * Session-only store for compliance mechanics.
 * Resets on page refresh — by design for MVP.
 */

interface SessionState {
  /** Cumulative concern score (0-100+). At 100 → System Audit, then reset. */
  concernScore: number;

  /** Per-mission attempt counts (keyed by missionId) */
  attemptCounts: Record<string, number>;

  /** Most recent grammar error (for System Audit micro-learning display) */
  lastGrammarError: GrammarError | null;

  /** Whether a System Audit is currently active */
  isAuditActive: boolean;

  addConcern: (amount: number) => void;
  resetConcern: () => void;
  incrementAttempt: (missionId: string) => number;
  getAttemptCount: (missionId: string) => number;
  setLastGrammarError: (error: GrammarError | null) => void;
  setAuditActive: (active: boolean) => void;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  concernScore: 0,
  attemptCounts: {},
  lastGrammarError: null,
  isAuditActive: false,

  addConcern: (amount) => {
    const newScore = get().concernScore + amount;
    set({ concernScore: newScore });

    // Trigger audit at 100
    if (newScore >= 100) {
      set({ isAuditActive: true });
    }
  },

  resetConcern: () => set({ concernScore: 0, isAuditActive: false }),

  incrementAttempt: (missionId) => {
    const counts = { ...get().attemptCounts };
    counts[missionId] = (counts[missionId] || 0) + 1;
    set({ attemptCounts: counts });
    return counts[missionId];
  },

  getAttemptCount: (missionId) => {
    return get().attemptCounts[missionId] || 0;
  },

  setLastGrammarError: (error) => set({ lastGrammarError: error }),

  setAuditActive: (active) => set({ isAuditActive: active }),
}));
