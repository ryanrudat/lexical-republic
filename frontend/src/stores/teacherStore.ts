import { create } from 'zustand';
import type { SocketStatus } from '../utils/socket';
import type { CharacterMessage, ThreadEntry } from '../types/shiftQueue';

export type TeacherTab = 'class' | 'grades' | 'writing' | 'shifts' | 'dictionary';

/** A status is "hollow" when the server rebuilt it after a reconnect / restart
 *  (in-memory map entry was gone, so taskId/tasks are empty). Merge the rich
 *  display fields from the prior record; keep fresh connection fields. */
function mergeHollowStatus(
  incoming: OnlineStudent,
  prior: OnlineStudent | undefined,
): OnlineStudent {
  const incomingHollow = incoming.taskId === null && incoming.tasks.length === 0;
  const priorRich = prior && !(prior.taskId === null && prior.tasks.length === 0);
  if (!incomingHollow || !priorRich) return incoming;
  return {
    ...incoming,
    weekNumber: incoming.weekNumber ?? prior.weekNumber,
    stepId: incoming.stepId ?? prior.stepId,
    taskId: prior.taskId,
    taskLabel: prior.taskLabel,
    taskStartedAt: prior.taskStartedAt,
    failCount: prior.failCount,
    taskKind: prior.taskKind,
    progressLabel: prior.progressLabel,
    tasks: prior.tasks,
  };
}

export interface OnlineStudent {
  userId: string;
  socketId: string;
  designation: string | null;
  displayName: string;
  classId?: string | null;
  className?: string | null;
  weekNumber: number | null;
  stepId: string | null;
  connectedAt: string;
  lastActivityAt: string;
  taskId: string | null;
  taskLabel: string | null;
  taskStartedAt: string | null;
  failCount: number;
  /** Task category — drives task-aware ClassMonitor flag thresholds (Writing gets a longer window + higher attempt ceiling). */
  taskKind?: string | null;
  /** Sub-progress text shown next to the task label, e.g. "Writing: 47 words". */
  progressLabel?: string | null;
  tasks: { id: string; label: string }[];
}

interface TeacherState {
  activeTab: TeacherTab;
  setActiveTab: (tab: TeacherTab) => void;

  selectedClassId: string | null;
  setSelectedClassId: (classId: string | null) => void;

  onlineStudents: Map<string, OnlineStudent>;
  /** Preserves last-known status when students disconnect, so teacher can still see where they were */
  lastKnownStatus: Map<string, OnlineStudent>;
  setClassSnapshot: (students: OnlineStudent[]) => void;
  upsertStudent: (student: OnlineStudent) => void;
  removeStudent: (userId: string) => void;
  /** Permanently remove a student from both onlineStudents AND lastKnownStatus (used after deletion) */
  purgeStudent: (userId: string) => void;

  selectedCell: { studentId: string; weekId: string } | null;
  setSelectedCell: (cell: { studentId: string; weekId: string } | null) => void;

  socketStatus: SocketStatus;
  socketError: string | null;
  setSocketStatus: (status: SocketStatus, error?: string) => void;

  /** Incremented when a new student registers — triggers ClassMonitor refresh */
  registrationTick: number;
  bumpRegistrationTick: () => void;

  /** Pause state PER CLASS — keyed by classId. A single global boolean here
   *  desynced multi-class teachers: pausing class A then viewing class B
   *  showed B as paused, and "resuming" B cleared the flag while A stayed
   *  locked server-side with no indicator. */
  pausedClasses: Record<string, boolean>;
  setClassPauseState: (classId: string, paused: boolean) => void;

  /** Clarity Minder: cached threads by pairId */
  clarityThreads: Map<string, CharacterMessage[]>;
  setClarityThreads: (pairId: string, messages: CharacterMessage[]) => void;
  /** Bumped on incoming student replies — drives re-render in ClarityMinderThread */
  clarityReplyTick: number;
  bumpClarityReplyTick: () => void;
  appendClarityEntry: (pairId: string, messageId: string, entry: ThreadEntry) => void;

  /** Remediation Module: per-pair event count + last-3 trigger reasons (most recent first). */
  remediationCounts: Record<string, number>;
  remediationLastTriggers: Record<string, string[]>;
  setRemediationCounts: (counts: Record<string, number>) => void;
  setRemediationLastTriggers: (m: Record<string, string[]>) => void;
  incrementRemediation: (pairId: string, triggerReason: string) => void;
  /** pairId → true once the student clawed back (resumed grinding after a remediation closed). */
  remediationClawback: Record<string, boolean>;
  /** pairId → latest concernScore pushed live by a remediation completed/clawback event. */
  liveConcern: Record<string, number>;
  setRemediationClawback: (m: Record<string, boolean>) => void;
  flagRemediationClawback: (pairId: string) => void;
  setLiveConcern: (pairId: string, score: number) => void;
}

export const useTeacherStore = create<TeacherState>((set) => ({
  activeTab: 'class',
  setActiveTab: (tab) => set({ activeTab: tab }),

  selectedClassId: null,
  setSelectedClassId: (classId) => set({ selectedClassId: classId }),

  onlineStudents: new Map(),
  lastKnownStatus: new Map(),
  setClassSnapshot: (students) =>
    set((state) => {
      const lk = new Map(state.lastKnownStatus);
      const onlineStudents = new Map(
        students.map((s) => {
          const prior = state.onlineStudents.get(s.userId) ?? lk.get(s.userId);
          lk.delete(s.userId);
          return [s.userId, mergeHollowStatus(s, prior)];
        }),
      );
      return { onlineStudents, lastKnownStatus: lk };
    }),
  upsertStudent: (student) =>
    set((state) => {
      const next = new Map(state.onlineStudents);
      // After a >5s disconnect the server rebuilds the status HOLLOW (no
      // taskId, no tasks[]) — merging from the prior record keeps the
      // teacher's task label / elapsed timer / attempts alive instead of
      // blanking the card for the rest of the task.
      const prior = state.onlineStudents.get(student.userId) ?? state.lastKnownStatus.get(student.userId);
      next.set(student.userId, mergeHollowStatus(student, prior));
      // Clear from lastKnown since they're back online (any preserved fields
      // were just merged into the online entry above)
      const lk = new Map(state.lastKnownStatus);
      lk.delete(student.userId);
      return { onlineStudents: next, lastKnownStatus: lk };
    }),
  removeStudent: (userId) =>
    set((state) => {
      const next = new Map(state.onlineStudents);
      // Save last-known status before removing
      const lk = new Map(state.lastKnownStatus);
      const current = state.onlineStudents.get(userId);
      if (current) {
        lk.set(userId, current);
      }
      next.delete(userId);
      return { onlineStudents: next, lastKnownStatus: lk };
    }),
  purgeStudent: (userId) =>
    set((state) => {
      const next = new Map(state.onlineStudents);
      const lk = new Map(state.lastKnownStatus);
      next.delete(userId);
      lk.delete(userId);
      return { onlineStudents: next, lastKnownStatus: lk };
    }),

  selectedCell: null,
  setSelectedCell: (cell) => set({ selectedCell: cell }),

  socketStatus: 'disconnected',
  socketError: null,
  setSocketStatus: (status, error) => set({ socketStatus: status, socketError: error ?? null }),

  registrationTick: 0,
  bumpRegistrationTick: () => set((s) => ({ registrationTick: s.registrationTick + 1 })),

  pausedClasses: {},
  setClassPauseState: (classId, paused) =>
    set((s) => ({ pausedClasses: { ...s.pausedClasses, [classId]: paused } })),

  clarityThreads: new Map(),
  setClarityThreads: (pairId, messages) =>
    set((state) => {
      const next = new Map(state.clarityThreads);
      next.set(pairId, messages);
      return { clarityThreads: next };
    }),
  clarityReplyTick: 0,
  bumpClarityReplyTick: () => set((s) => ({ clarityReplyTick: s.clarityReplyTick + 1 })),
  appendClarityEntry: (pairId, messageId, entry) =>
    set((state) => {
      const threads = state.clarityThreads.get(pairId);
      if (!threads) return state;

      const next = new Map(state.clarityThreads);
      next.set(
        pairId,
        threads.map((m) => {
          if (m.id !== messageId) return m;
          const currentThread = (m.thread ?? []) as ThreadEntry[];
          // Dedup
          if (currentThread.some((e) => e.timestamp === entry.timestamp && e.text === entry.text)) return m;
          return { ...m, thread: [...currentThread, entry] };
        })
      );
      return { clarityThreads: next };
    }),

  remediationCounts: {},
  remediationLastTriggers: {},
  setRemediationCounts: (counts) => set({ remediationCounts: counts }),
  setRemediationLastTriggers: (m) => set({ remediationLastTriggers: m }),
  incrementRemediation: (pairId, triggerReason) =>
    set((state) => {
      const prevCount = state.remediationCounts[pairId] ?? 0;
      const prevTriggers = state.remediationLastTriggers[pairId] ?? [];
      // Most recent first, capped at 3
      const nextTriggers = [triggerReason, ...prevTriggers].slice(0, 3);
      return {
        remediationCounts: { ...state.remediationCounts, [pairId]: prevCount + 1 },
        remediationLastTriggers: { ...state.remediationLastTriggers, [pairId]: nextTriggers },
      };
    }),

  remediationClawback: {},
  liveConcern: {},
  setRemediationClawback: (m) => set({ remediationClawback: m }),
  flagRemediationClawback: (pairId) =>
    set((s) => ({ remediationClawback: { ...s.remediationClawback, [pairId]: true } })),
  setLiveConcern: (pairId, score) =>
    set((s) => ({ liveConcern: { ...s.liveConcern, [pairId]: score } })),
}));
