import { create } from 'zustand';

export type TeacherTab = 'class' | 'grades' | 'shifts';

export interface OnlineStudent {
  userId: string;
  socketId: string;
  designation: string | null;
  displayName: string;
  weekNumber: number | null;
  stepId: string | null;
  connectedAt: string;
  lastActivityAt: string;
}

interface TeacherState {
  activeTab: TeacherTab;
  setActiveTab: (tab: TeacherTab) => void;

  onlineStudents: Map<string, OnlineStudent>;
  setClassSnapshot: (students: OnlineStudent[]) => void;
  upsertStudent: (student: OnlineStudent) => void;
  removeStudent: (userId: string) => void;

  selectedCell: { studentId: string; weekId: string } | null;
  setSelectedCell: (cell: { studentId: string; weekId: string } | null) => void;
}

export const useTeacherStore = create<TeacherState>((set) => ({
  activeTab: 'class',
  setActiveTab: (tab) => set({ activeTab: tab }),

  onlineStudents: new Map(),
  setClassSnapshot: (students) =>
    set({
      onlineStudents: new Map(students.map((s) => [s.userId, s])),
    }),
  upsertStudent: (student) =>
    set((state) => {
      const next = new Map(state.onlineStudents);
      next.set(student.userId, student);
      return { onlineStudents: next };
    }),
  removeStudent: (userId) =>
    set((state) => {
      const next = new Map(state.onlineStudents);
      next.delete(userId);
      return { onlineStudents: next };
    }),

  selectedCell: null,
  setSelectedCell: (cell) => set({ selectedCell: cell }),
}));
