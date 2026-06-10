import { create } from 'zustand';
import type {
  DrillCompleteResult,
  DrillDesk,
  DrillMode,
  DrillStartPayload,
  InscriptionState,
  InscriptionWord,
  PersonalBreakdown,
  PoolStrategy,
  RollEntry,
  StandingsRow,
} from '../types/inscription';
import {
  completeInscriptionDrill,
  fetchInscriptionState,
  fetchRollOfDistinction,
  startInscriptionDrill,
  submitInscriptionWord,
} from '../api/inscription';
import { connectSocket } from '../utils/socket';

export type InscriptionScreen = 'lobby' | 'shift-gate' | 'queue' | 'drill' | 'results' | 'paused';

export interface PoolFormedPayload {
  drillId: string;
  lobbyId: string;
  mode: DrillMode;
  durationSec: number;
  wordCount: number;
  lane: number;
  weekNumber: number;
  words: InscriptionWord[];
  desks: DrillDesk[];
  startAt_ms: number;
}

interface ActiveDrill {
  drillId: string;
  /** Set for live Open Pool drills (links sibling players); null for solo/trial. */
  lobbyId: string | null;
  mode: DrillMode;
  durationSec: number;
  wordCount: number;
  lane: number;
  weekNumber: number;
  words: InscriptionWord[];
  desks: DrillDesk[];
  startedAt_ms: number;
  currentWordIdx: number;
  /** Per-desk live word completion (real desks only — ghosts replay from baked timings). */
  liveDeskState: Map<number, { wordsCorrect: number; finishedAt_ms: number | null }>;
  /** Pause time accumulated when class-paused; used to extend the timer math. */
  totalPausedMs: number;
  pausedAt_ms: number | null;
}

interface InscriptionStoreState {
  // Lobby / pre-drill state
  screen: InscriptionScreen;
  citizenNumber: string;
  classId: string | null;
  cooldownRemainingSec: number;
  soloUsedToday: number;
  soloCap: number;
  loading: boolean;
  error: string | null;

  // Live Open Pool matchmaking
  queueInfo: { count: number; max: number; designations: string[]; formsAt_ms?: number | null } | null;
  /** Week the student queued with — kept so a reconnect can re-emit
   *  inscription:join-queue (queue entries are socketId-keyed server-side
   *  and evicted on disconnect; see the App.tsx connect handler). */
  queueWeekNumber: number | null;

  // Active drill state
  drill: ActiveDrill | null;
  result: DrillCompleteResult | null;

  // Roll of Distinction
  roll: RollEntry[];
  rollLoading: boolean;

  // Pending teacher actions queued during active drill (e.g. send-to-task)
  pendingTeacherAction: { action: string; taskId?: string } | null;

  // Trial dispatch from teacher
  pendingTrial: {
    classId: string;
    trialId: string | null;
    startsAt_ms: number;
    durationSec: number;
    wordCount: number;
  } | null;

  // Actions
  refreshState: () => Promise<void>;
  startDrill: (opts: {
    mode: DrillMode;
    weekNumber: number;
    poolStrategy?: PoolStrategy;
    wordCount?: number;
    durationSec?: number;
  }) => Promise<void>;
  submitWord: (text: string, errorsRecovered: number) => Promise<{ correct: boolean }>;
  completeDrill: (opts?: { abandoned?: boolean }) => Promise<void>;
  backToLobby: () => void;
  loadRoll: (classId: string) => Promise<void>;

  // Live Open Pool matchmaking
  joinQueue: (weekNumber: number) => void;
  leaveQueue: () => void;
  applyQueueUpdate: (info: { count: number; max: number; designations: string[]; formsAt_ms?: number | null }) => void;
  applyPoolFormed: (payload: PoolFormedPayload) => void;
  applyParticipantProgress: (data: { lobbyId: string; pairId: string; wordsCorrect: number; finishedAt_ms: number | null }) => void;
  applyQueueError: (data: { error: string; message: string; drillId?: string }) => void;

  // Pause / resume (from socket)
  applyServerPaused: (drillId: string, pausedAt_ms: number) => void;
  applyServerResumed: (drillId: string, totalPausedMs: number) => void;

  // Ghost-side live event (other real students racing — Phase 2 live)
  applyDeskWordComplete: (drillId: string, desk: number, wordIdx: number, finishedAt_ms: number) => void;

  // Teacher action queue
  queueTeacherAction: (action: string, taskId?: string) => void;
  consumePendingTeacherAction: () => { action: string; taskId?: string } | null;

  // Trial dispatch
  setPendingTrial: (trial: InscriptionStoreState['pendingTrial']) => void;
  clearPendingTrial: () => void;

  // Direct setters (for App.tsx socket listener housekeeping)
  setScreen: (screen: InscriptionScreen) => void;
  reset: () => void;
}

const initialDrill = null;

export const useInscriptionStore = create<InscriptionStoreState>((set, get) => ({
  screen: 'lobby',
  citizenNumber: '',
  classId: null,
  cooldownRemainingSec: 0,
  soloUsedToday: 0,
  soloCap: 3,
  loading: false,
  error: null,

  queueInfo: null,
  queueWeekNumber: null,

  drill: initialDrill,
  result: null,

  roll: [],
  rollLoading: false,

  pendingTeacherAction: null,
  pendingTrial: null,

  refreshState: async () => {
    try {
      set({ loading: true, error: null });
      const s: InscriptionState = await fetchInscriptionState();
      set({
        citizenNumber: s.citizenNumber,
        classId: s.classId,
        cooldownRemainingSec: s.cooldownRemainingSec,
        soloUsedToday: s.soloUsedToday,
        soloCap: s.soloCap,
        loading: false,
      });
    } catch (err) {
      console.error('[inscription] refreshState', err);
      set({ loading: false, error: 'Failed to load Inscription state' });
    }
  },

  startDrill: async (opts) => {
    set({ loading: true, error: null, result: null });
    try {
      const payload: DrillStartPayload = await startInscriptionDrill(opts);
      const liveDeskState = new Map<number, { wordsCorrect: number; finishedAt_ms: number | null }>();
      for (const d of payload.desks) {
        liveDeskState.set(d.desk, {
          wordsCorrect: d.wordsCorrect,
          finishedAt_ms: d.finishedAt_ms,
        });
      }
      set({
        drill: {
          drillId: payload.drillId,
          lobbyId: null,
          mode: payload.mode,
          durationSec: payload.durationSec,
          wordCount: payload.wordCount,
          lane: payload.lane,
          weekNumber: payload.weekNumber,
          words: payload.words,
          desks: payload.desks,
          startedAt_ms: Date.now(),
          currentWordIdx: 0,
          liveDeskState,
          totalPausedMs: 0,
          pausedAt_ms: null,
        },
        screen: 'drill',
        loading: false,
      });
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string; error?: string } } }).response
        ?.data?.message
        || (err as { response?: { data?: { error?: string } } }).response?.data?.error
        || 'Failed to start drill';
      console.error('[inscription] startDrill', err);
      set({ loading: false, error: msg });
    }
  },

  submitWord: async (text, errorsRecovered) => {
    const drill = get().drill;
    if (!drill) return { correct: false };
    const idx = drill.currentWordIdx;
    if (idx < 0 || idx >= drill.words.length) return { correct: false };

    const elapsed = Date.now() - drill.startedAt_ms - drill.totalPausedMs;
    try {
      const res = await submitInscriptionWord({
        drillId: drill.drillId,
        wordIdx: idx,
        finalText: text,
        finishedAt_ms: elapsed,
        errorsRecovered,
      });

      // Advance local pointer + live desk state
      set((s) => {
        if (!s.drill) return s;
        const updated = new Map(s.drill.liveDeskState);
        const self = updated.get(1);
        if (self) {
          updated.set(1, {
            wordsCorrect: res.correct ? self.wordsCorrect + 1 : self.wordsCorrect,
            finishedAt_ms:
              res.correct && (self.wordsCorrect + 1) === s.drill.wordCount ? elapsed : self.finishedAt_ms,
          });
        }
        return {
          ...s,
          drill: {
            ...s.drill,
            currentWordIdx: s.drill.currentWordIdx + 1,
            liveDeskState: updated,
          },
        };
      });
      return { correct: res.correct };
    } catch (err) {
      console.error('[inscription] submitWord', err);
      return { correct: false };
    }
  },

  completeDrill: async (opts) => {
    const drill = get().drill;
    if (!drill) return;
    set({ loading: true });
    try {
      const result: DrillCompleteResult = await completeInscriptionDrill({
        drillId: drill.drillId,
        abandoned: opts?.abandoned ?? false,
      });
      set({
        result,
        screen: 'results',
        loading: false,
      });
      // Refresh state to update cooldown + cap counters
      void get().refreshState();
    } catch (err) {
      console.error('[inscription] completeDrill', err);
      set({ loading: false, error: 'Failed to finalize drill' });
    }
  },

  backToLobby: () => {
    set({ screen: 'lobby', drill: null, result: null, queueInfo: null });
    void get().refreshState();
  },

  joinQueue: (weekNumber) => {
    const sock = connectSocket();
    if (!sock) {
      set({ error: 'No connection — cannot join the pool.' });
      return;
    }
    set({ screen: 'queue', queueInfo: { count: 1, max: 5, designations: [], formsAt_ms: null }, error: null, result: null });
    sock.emit('inscription:join-queue', { weekNumber });
  },

  leaveQueue: () => {
    connectSocket()?.emit('inscription:leave-queue');
    set({ screen: 'lobby', queueInfo: null });
  },

  applyQueueUpdate: (info) => {
    set((s) => (s.screen === 'queue' ? { ...s, queueInfo: info } : s));
  },

  applyPoolFormed: (payload) => {
    const liveDeskState = new Map<number, { wordsCorrect: number; finishedAt_ms: number | null }>();
    for (const d of payload.desks) {
      liveDeskState.set(d.desk, { wordsCorrect: d.wordsCorrect, finishedAt_ms: d.finishedAt_ms });
    }
    set({
      drill: {
        drillId: payload.drillId,
        lobbyId: payload.lobbyId,
        mode: payload.mode,
        durationSec: payload.durationSec,
        wordCount: payload.wordCount,
        lane: payload.lane,
        weekNumber: payload.weekNumber,
        words: payload.words,
        desks: payload.desks,
        // Race begins at startAt_ms (a few seconds out). Elapsed math floors at
        // 0 until then; InscriptionDrill shows a countdown overlay meanwhile.
        startedAt_ms: payload.startAt_ms,
        currentWordIdx: 0,
        liveDeskState,
        totalPausedMs: 0,
        pausedAt_ms: null,
      },
      screen: 'drill',
      queueInfo: null,
      queueWeekNumber: null,
      loading: false,
      error: null,
    });
  },

  applyParticipantProgress: (data) => {
    set((s) => {
      if (!s.drill || s.drill.lobbyId !== data.lobbyId) return s;
      const entry = s.drill.desks.find((d) => d.pairId === data.pairId);
      if (!entry || entry.desk === 1) return s; // ignore self + unknown pairs
      const updated = new Map(s.drill.liveDeskState);
      updated.set(entry.desk, { wordsCorrect: data.wordsCorrect, finishedAt_ms: data.finishedAt_ms });
      return { ...s, drill: { ...s.drill, liveDeskState: updated } };
    });
  },

  applyQueueError: (data) => {
    // e.g. active_drill: surface the message and return to the lobby.
    set({ screen: 'lobby', queueInfo: null, queueWeekNumber: null, error: data.message });
  },

  loadRoll: async (classId) => {
    set({ rollLoading: true });
    try {
      const { roll } = await fetchRollOfDistinction(classId);
      set({ roll, rollLoading: false });
    } catch (err) {
      console.error('[inscription] loadRoll', err);
      set({ rollLoading: false });
    }
  },

  applyServerPaused: (drillId, pausedAt_ms) => {
    set((s) => {
      if (!s.drill || s.drill.drillId !== drillId) return s;
      return {
        ...s,
        screen: 'paused',
        drill: { ...s.drill, pausedAt_ms },
      };
    });
  },

  applyServerResumed: (drillId, totalPausedMs) => {
    set((s) => {
      if (!s.drill || s.drill.drillId !== drillId) return s;
      return {
        ...s,
        screen: 'drill',
        drill: { ...s.drill, pausedAt_ms: null, totalPausedMs },
      };
    });
  },

  applyDeskWordComplete: (drillId, desk, wordIdx, finishedAt_ms) => {
    set((s) => {
      if (!s.drill || s.drill.drillId !== drillId) return s;
      if (desk === 1) return s; // self updates locally
      const updated = new Map(s.drill.liveDeskState);
      const prev = updated.get(desk) ?? { wordsCorrect: 0, finishedAt_ms: null };
      const newCount = Math.max(prev.wordsCorrect, wordIdx + 1);
      updated.set(desk, {
        wordsCorrect: newCount,
        finishedAt_ms: newCount === s.drill.wordCount ? finishedAt_ms : prev.finishedAt_ms,
      });
      return { ...s, drill: { ...s.drill, liveDeskState: updated } };
    });
  },

  queueTeacherAction: (action, taskId) => {
    set({ pendingTeacherAction: { action, taskId } });
  },

  consumePendingTeacherAction: () => {
    const action = get().pendingTeacherAction;
    set({ pendingTeacherAction: null });
    return action;
  },

  setPendingTrial: (trial) => set({ pendingTrial: trial }),
  clearPendingTrial: () => set({ pendingTrial: null }),

  setScreen: (screen) => set({ screen }),

  // Clear on logout — an in-flight drill, queue slot, results screen, or a
  // pending teacher trial must not carry to the next student on a shared
  // device. Server-side drill rows are reconciled by the boot recovery sweep.
  reset: () =>
    set({
      screen: 'lobby',
      citizenNumber: '',
      classId: null,
      cooldownRemainingSec: 0,
      soloUsedToday: 0,
      loading: false,
      error: null,
      queueInfo: null,
      queueWeekNumber: null,
      drill: null,
      result: null,
      roll: [],
      rollLoading: false,
      pendingTeacherAction: null,
      pendingTrial: null,
    }),
}));

// Convenience selectors
export const selectInscriptionElapsedMs = (s: InscriptionStoreState): number => {
  if (!s.drill) return 0;
  const now = Date.now();
  const pausedExtra = s.drill.pausedAt_ms ? now - s.drill.pausedAt_ms : 0;
  return Math.max(0, now - s.drill.startedAt_ms - s.drill.totalPausedMs - pausedExtra);
};

export const selectInscriptionRemainingSec = (s: InscriptionStoreState): number => {
  if (!s.drill) return 0;
  const elapsedMs = selectInscriptionElapsedMs(s);
  const totalMs = s.drill.durationSec * 1000;
  return Math.max(0, Math.ceil((totalMs - elapsedMs) / 1000));
};

export type StandingsForRender = StandingsRow;
export type { PersonalBreakdown };
