import { create } from 'zustand';
import type { GrammarError } from '../api/ai';
import type { RemediationQuestion, RemediationTriggerReason } from '../api/remediation';

/**
 * Session store for compliance mechanics.
 * Concern score is hydrated from DB on login; other fields reset on refresh.
 */

/** Remediation Module state. The full rate-trigger state machine lands in Phase 1 Unit 1. */
export type RemediationStage = 'idle' | 'warned' | 'modal-open' | 'cooling-down';

export interface ActiveRemediation {
  moduleId: string;
  weekNumber: number;
  triggerReason: RemediationTriggerReason;
  questions: RemediationQuestion[];
}

interface SessionState {
  /** Cumulative concern score (0-100+). At 100 → System Audit, then reset. */
  concernScore: number;

  /** Per-mission attempt counts (keyed by missionId) */
  attemptCounts: Record<string, number>;

  /** Most recent grammar error (for System Audit micro-learning display) */
  lastGrammarError: GrammarError | null;

  /** Whether a System Audit is currently active */
  isAuditActive: boolean;

  /**
   * Remediation Module state machine. The state machine logic lands in Phase 1 Unit 1.
   * Foundation only declares the shape so the modal mount (Phase 1 Unit 2) can read it.
   */
  remediationStage: RemediationStage;
  activeRemediation: ActiveRemediation | null;

  hydrateConcern: (score: number) => void;
  addConcern: (amount: number) => void;
  resetConcern: () => void;
  incrementAttempt: (missionId: string) => number;
  getAttemptCount: (missionId: string) => number;
  setLastGrammarError: (error: GrammarError | null) => void;
  setAuditActive: (active: boolean) => void;

  /** Stubs used by Phase 1 Unit 2; full state-machine wiring lands in Unit 1. */
  setActiveRemediation: (active: ActiveRemediation | null) => void;
  setRemediationStage: (stage: RemediationStage) => void;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  concernScore: 0,
  attemptCounts: {},
  lastGrammarError: null,
  isAuditActive: false,

  hydrateConcern: (score) => set({ concernScore: score }),

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

  remediationStage: 'idle',
  activeRemediation: null,

  setActiveRemediation: (active) => set({ activeRemediation: active }),
  setRemediationStage: (stage) => set({ remediationStage: stage }),
}));
