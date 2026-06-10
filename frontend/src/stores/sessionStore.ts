import { create } from 'zustand';
import type { GrammarError } from '../api/ai';
import type {
  RemediationQuestion,
  RemediationResultEntry,
  RemediationTriggerReason,
} from '../api/remediation';
import {
  clawbackRemediation,
  completeRemediation,
  triggerRemediation,
} from '../api/remediation';
import {
  REMEDIATION_CLAWBACK_BARKS,
  REMEDIATION_WARNING_BARKS,
  usePearlStore,
} from './pearlStore';
import { useShiftQueueStore } from './shiftQueueStore';

/**
 * Session store for compliance mechanics.
 * Concern score is hydrated from DB on login; other fields reset on refresh.
 */

/** Remediation Module state. */
export type RemediationStage = 'idle' | 'warned' | 'modal-open' | 'cooling-down';

export interface ActiveRemediation {
  moduleId: string;
  weekNumber: number;
  triggerReason: RemediationTriggerReason;
  questions: RemediationQuestion[];
}

interface RateBufferEntry {
  at: number;
  delta: number;
}

// ─── Rate-trigger thresholds (calibrated for 0–5 score range) ───────────────
const STAGE_A_WINDOW_MS = 30_000;
const STAGE_A_THRESHOLD = 0.4;
const STAGE_B_WINDOW_MS = 60_000;
const STAGE_B_THRESHOLD = 0.7;
const SECOND_TRIP_WINDOW_MS = 90_000;
const ABSOLUTE_BACKSTOP = 3.0;
const COOLDOWN_WINDOW_MS = 60_000;
const RATE_BUFFER_RETENTION_MS = 60_000;

function pickBark(pool: readonly string[]): string {
  return pool[Math.floor(Math.random() * pool.length)] ?? pool[0]!;
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

  /** Remediation Module state machine. */
  remediationStage: RemediationStage;
  activeRemediation: ActiveRemediation | null;

  /** Sliding 60s window of positive concern deltas (ALL deltas, both stores). */
  concernRateBuffer: RateBufferEntry[];

  /** Timestamp when Stage A warning fired (for second-trip detection). */
  warningIssuedAt: number | null;

  /** Timestamp when remediation modal closed (for cooldown / clawback window). */
  modalClosedAt: number | null;

  /** ID of the most recently completed remediation (for clawback target). */
  lastCompletedModuleId: string | null;

  /** Concern shield: while an Inscription drill is active, defer Remediation triggers
   *  and exclude inscription-source events from the rate buffer. */
  inscriptionDrillActive: boolean;

  hydrateConcern: (score: number) => void;
  addConcern: (amount: number) => void;
  resetConcern: () => void;
  /** Clears the remediation rate machine (stage, buffer, timers, drill shield,
   *  active modal) WITHOUT zeroing the DB-backed concernScore. Used on teacher
   *  shift transfer, where the score must persist across the move. */
  resetRateMachine: () => void;
  incrementAttempt: (missionId: string) => number;
  getAttemptCount: (missionId: string) => number;
  setLastGrammarError: (error: GrammarError | null) => void;
  setAuditActive: (active: boolean) => void;
  setInscriptionDrillActive: (active: boolean) => void;

  /** Direct setters used by Unit 2 modal mount. State machine prefers `closeRemediation`. */
  setActiveRemediation: (active: ActiveRemediation | null) => void;
  setRemediationStage: (stage: RemediationStage) => void;

  /**
   * Records a positive delta event in the rate buffer and runs the trigger
   * state machine. Does NOT modify concernScore — score updates are owned by
   * `addConcern` (here) and `shiftQueueStore.addConcern` separately.
   */
  recordRateEvent: (delta: number) => void;

  /** Called by remediation modal (Unit 2) on close — applies server cooldown. */
  closeRemediation: (correctCount: number, results: RemediationResultEntry[]) => Promise<void>;
}

export const useSessionStore = create<SessionState>((set, get) => {
  // Module-scoped timer for cooling-down → idle auto-transition. Cleared on
  // every state change that exits cooling-down (clawback or stage move).
  let cooldownTimer: ReturnType<typeof setTimeout> | null = null;

  // Module-scoped guard: only one clawback POST in flight at a time. The server
  // is idempotent, but this saves a wasted round-trip when multiple deltas
  // arrive within milliseconds (e.g. two task completions in quick succession).
  let clawbackInFlight = false;

  function clearCooldownTimer() {
    if (cooldownTimer !== null) {
      clearTimeout(cooldownTimer);
      cooldownTimer = null;
    }
  }

  function startCooldownTimer() {
    clearCooldownTimer();
    cooldownTimer = setTimeout(() => {
      cooldownTimer = null;
      // Only transition if we're still in cooling-down — guards against
      // clawback or other state changes that already moved us along.
      if (get().remediationStage === 'cooling-down') {
        set({ remediationStage: 'idle', modalClosedAt: null, lastCompletedModuleId: null });
      }
    }, COOLDOWN_WINDOW_MS);
  }

  function resolveWeekNumber(): number | null {
    const wn = useShiftQueueStore.getState().weekConfig?.weekNumber;
    return typeof wn === 'number' && Number.isFinite(wn) ? wn : null;
  }

  async function fireTrigger(reason: RemediationTriggerReason) {
    const weekNumber = resolveWeekNumber();
    if (weekNumber === null) {
      // Student isn't in a shift — skip trigger entirely. State stays as-is.
      return;
    }

    // Snapshot stage so we can detect concurrent state changes by the time the
    // promise resolves (e.g. teacher reset, refresh, another trigger flushed).
    const expectedStage = get().remediationStage;

    let response;
    try {
      response = await triggerRemediation(weekNumber, reason);
    } catch (err) {
      // Network / 5xx — leave stage where it was so retries can happen on next delta.
      console.error('Remediation trigger failed:', err);
      return;
    }

    // If state moved on under us, ignore the result (stale).
    if (get().remediationStage !== expectedStage) return;

    if (response.debounced) {
      // Server says "too soon" — stay in current stage; do not retry.
      return;
    }
    if (response.noQuestionsAvailable) {
      // Dictionary wasn't deep enough — silently drop. Stay where we are.
      return;
    }
    if (!response.moduleId || !response.questions || !response.triggerReason || response.weekNumber === undefined) {
      // Defensive: incomplete payload.
      return;
    }

    set({
      activeRemediation: {
        moduleId: response.moduleId,
        weekNumber: response.weekNumber,
        triggerReason: response.triggerReason,
        questions: response.questions,
      },
      remediationStage: 'modal-open',
      // Clear warning markers — modal supersedes them.
      warningIssuedAt: null,
    });
  }

  function fireWarning() {
    usePearlStore.getState().triggerBark('notice', pickBark(REMEDIATION_WARNING_BARKS));
    set({ remediationStage: 'warned', warningIssuedAt: Date.now() });
  }

  /** Called from `recordRateEvent` for stages 'idle' and 'warned' only. */
  function evaluateStateMachine() {
    const { remediationStage, concernRateBuffer, warningIssuedAt, concernScore } = get();
    const now = Date.now();

    let sum30 = 0;
    let sum60 = 0;
    for (const entry of concernRateBuffer) {
      const age = now - entry.at;
      if (age <= STAGE_B_WINDOW_MS) sum60 += entry.delta;
      if (age <= STAGE_A_WINDOW_MS) sum30 += entry.delta;
    }

    if (remediationStage === 'idle') {
      // Backstop takes priority: absolute concern at/above 3.0 → Stage B.
      if (concernScore >= ABSOLUTE_BACKSTOP) {
        void fireTrigger('absolute_3');
        return;
      }
      // Stage B route (a): +0.7 within 60s.
      if (sum60 >= STAGE_B_THRESHOLD) {
        void fireTrigger('rate_warned');
        return;
      }
      // Stage A: +0.4 within 30s.
      if (sum30 >= STAGE_A_THRESHOLD) {
        fireWarning();
      }
      return;
    }

    if (remediationStage === 'warned') {
      // Continued grinding past +0.7 in the 60s window also escalates.
      if (sum60 >= STAGE_B_THRESHOLD) {
        void fireTrigger('rate_warned');
        return;
      }
      // Stage B route (b): second Stage-A trip within 90s of the first warning.
      if (
        sum30 >= STAGE_A_THRESHOLD &&
        warningIssuedAt !== null &&
        now - warningIssuedAt <= SECOND_TRIP_WINDOW_MS
      ) {
        void fireTrigger('rate_double');
      }
    }
  }

  return {
    concernScore: 0,
    attemptCounts: {},
    lastGrammarError: null,
    isAuditActive: false,

    remediationStage: 'idle',
    activeRemediation: null,
    concernRateBuffer: [],
    warningIssuedAt: null,
    modalClosedAt: null,
    lastCompletedModuleId: null,
    inscriptionDrillActive: false,

    hydrateConcern: (score) => set({ concernScore: score }),

    addConcern: (amount) => {
      const newScore = get().concernScore + amount;
      set({ concernScore: newScore });

      if (newScore >= 100) {
        set({ isAuditActive: true });
      }

      // Positive deltas feed the rate-trigger machine; negative/zero (resets,
      // server-side cooldown writes) skip the buffer.
      if (amount > 0) {
        get().recordRateEvent(amount);
      }
    },

    resetRateMachine: () => {
      clearCooldownTimer();
      clawbackInFlight = false;
      set({
        concernRateBuffer: [],
        warningIssuedAt: null,
        modalClosedAt: null,
        lastCompletedModuleId: null,
        remediationStage: 'idle',
        activeRemediation: null,
        inscriptionDrillActive: false,
      });
    },

    resetConcern: () => {
      get().resetRateMachine();
      set({ concernScore: 0, isAuditActive: false });
    },

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

    setInscriptionDrillActive: (active) => set({ inscriptionDrillActive: active }),

    setActiveRemediation: (active) => set({ activeRemediation: active }),
    setRemediationStage: (stage) => set({ remediationStage: stage }),

    recordRateEvent: (delta) => {
      if (!Number.isFinite(delta) || delta <= 0) return;

      // Concern shield: while an Inscription drill is active, the student is
      // doing TOEIC retrieval practice — not grinding. Events DO add to score
      // (via `addConcern`) but do NOT feed the rate-trigger state machine.
      // Stage A / B / backstop modals stay deferred until the drill ends.
      if (get().inscriptionDrillActive) return;

      const now = Date.now();

      // 1. Append + evict. Keep retention generous (60s) since Stage B reads 60s.
      const buffer = get()
        .concernRateBuffer.filter((e) => now - e.at <= RATE_BUFFER_RETENTION_MS);
      buffer.push({ at: now, delta });
      set({ concernRateBuffer: buffer });

      const stage = get().remediationStage;

      // Cooling-down clawback path: any positive delta within 60s of close
      // restores the cooldown server-side and bounces stage back to idle.
      if (stage === 'cooling-down') {
        const { modalClosedAt: closedAt, lastCompletedModuleId: completedId } = get();
        if (
          !clawbackInFlight &&
          closedAt !== null &&
          completedId &&
          now - closedAt <= COOLDOWN_WINDOW_MS
        ) {
          clawbackInFlight = true;
          clawbackRemediation(completedId)
            .then((response) => {
              // Only apply if we're still in cooling-down with the same module.
              if (
                get().remediationStage !== 'cooling-down' ||
                get().lastCompletedModuleId !== completedId
              ) {
                return;
              }
              if (
                typeof response.newConcernScore === 'number' &&
                Number.isFinite(response.newConcernScore)
              ) {
                set({ concernScore: response.newConcernScore });
              }
              usePearlStore.getState().triggerBark('concern', pickBark(REMEDIATION_CLAWBACK_BARKS));
              clearCooldownTimer();
              set({
                remediationStage: 'idle',
                modalClosedAt: null,
                lastCompletedModuleId: null,
              });
            })
            .catch((err) => {
              console.error('Clawback failed:', err);
            })
            .finally(() => {
              clawbackInFlight = false;
            });
        }
        return;
      }

      // While modal is open, buffer fills for telemetry but we don't re-trigger.
      if (stage === 'modal-open') return;

      evaluateStateMachine();
    },

    closeRemediation: async (correctCount, results) => {
      const active = get().activeRemediation;
      if (!active) return;

      let response;
      try {
        response = await completeRemediation(active.moduleId, correctCount, results);
      } catch (err) {
        console.error('Remediation complete failed:', err);
        // Best-effort: clear modal so the student isn't stuck. Cooldown not applied.
        set({ activeRemediation: null, remediationStage: 'idle' });
        return;
      }

      const newScore = response.newConcernScore;
      set({
        concernScore: typeof newScore === 'number' && Number.isFinite(newScore) ? newScore : get().concernScore,
        activeRemediation: null,
        remediationStage: 'cooling-down',
        modalClosedAt: Date.now(),
        lastCompletedModuleId: active.moduleId,
        // Clear rate buffer so post-modal grinding starts a fresh window.
        concernRateBuffer: [],
        warningIssuedAt: null,
      });
      startCooldownTimer();
    },
  };
});
