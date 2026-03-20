import { create } from 'zustand';
import type { SocketStatus } from '../utils/socket';
import type { CharacterMessage, ThreadEntry } from '../types/shiftQueue';

export type TeacherTab = 'class' | 'grades' | 'shifts' | 'dictionary';

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

  selectedCell: { studentId: string; weekId: string } | null;
  setSelectedCell: (cell: { studentId: string; weekId: string } | null) => void;

  socketStatus: SocketStatus;
  socketError: string | null;
  setSocketStatus: (status: SocketStatus, error?: string) => void;

  /** Incremented when a new student registers — triggers ClassMonitor refresh */
  registrationTick: number;
  bumpRegistrationTick: () => void;

  classPaused: boolean;
  setClassPaused: (paused: boolean) => void;

  /** Clarity Minder: cached threads by pairId */
  clarityThreads: Map<string, CharacterMessage[]>;
  setClarityThreads: (pairId: string, messages: CharacterMessage[]) => void;
  /** Bumped on incoming student replies — drives re-render in ClarityMinderThread */
  clarityReplyTick: number;
  bumpClarityReplyTick: () => void;
  appendClarityEntry: (pairId: string, messageId: string, entry: ThreadEntry) => void;
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
      const onlineStudents = new Map(students.map((s) => [s.userId, s]));
      // Clear lastKnownStatus for students that are now in the snapshot (back online)
      const lk = new Map(state.lastKnownStatus);
      for (const s of students) {
        lk.delete(s.userId);
      }
      return { onlineStudents, lastKnownStatus: lk };
    }),
  upsertStudent: (student) =>
    set((state) => {
      const next = new Map(state.onlineStudents);
      next.set(student.userId, student);
      // Clear from lastKnown since they're back online
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

  selectedCell: null,
  setSelectedCell: (cell) => set({ selectedCell: cell }),

  socketStatus: 'disconnected',
  socketError: null,
  setSocketStatus: (status, error) => set({ socketStatus: status, socketError: error ?? null }),

  registrationTick: 0,
  bumpRegistrationTick: () => set((s) => ({ registrationTick: s.registrationTick + 1 })),

  classPaused: false,
  setClassPaused: (paused) => set({ classPaused: paused }),

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
}));
