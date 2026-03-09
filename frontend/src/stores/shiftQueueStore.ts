import { create } from 'zustand';
import type { WeekConfig, TaskProgress, TaskStatus } from '../types/shiftQueue';
import { fetchWeekConfig, patchConcern } from '../api/shifts';
import { useShiftStore } from './shiftStore';

interface ShiftQueueState {
  weekConfig: WeekConfig | null;
  taskProgress: TaskProgress[];
  currentTaskIndex: number;
  concernScoreDelta: number;
  concernScorePersisted: number;
  shiftComplete: boolean;
  loading: boolean;
  error: string | null;
  taskResetKey: number;

  loadWeekConfig: (weekId: string) => Promise<void>;
  completeTask: (taskId: string, score?: number, details?: Record<string, unknown>) => Promise<void>;
  addConcern: (delta: number) => void;
  nextTask: () => void;
  reset: () => void;
  goToTask: (taskId: string) => void;
  skipCurrentTask: () => void;
  resetCurrentTask: () => void;
  resetShift: () => void;
}

export const useShiftQueueStore = create<ShiftQueueState>((set, get) => ({
  weekConfig: null,
  taskProgress: [],
  currentTaskIndex: 0,
  concernScoreDelta: 0,
  concernScorePersisted: 0,
  shiftComplete: false,
  loading: false,
  error: null,
  taskResetKey: 0,

  loadWeekConfig: async (weekId: string) => {
    set({ loading: true, error: null });
    try {
      const config = await fetchWeekConfig(weekId);
      if (!config) {
        set({ weekConfig: null, loading: false });
        return;
      }

      // Build task progress from existing mission scores
      const shiftState = useShiftStore.getState();
      const missions = shiftState.missions;

      const progress: TaskProgress[] = config.tasks.map((task, idx) => {
        // Find matching mission by type
        const mission = missions.find(m => m.missionType === task.type);
        const score = mission?.score;
        const isComplete = score?.details && (score.details as Record<string, unknown>).status === 'complete';

        let status: TaskStatus = 'locked';
        if (isComplete) {
          status = 'complete';
        } else if (idx === 0) {
          // First incomplete task is current
          status = 'current';
        }

        return {
          taskId: task.id,
          status,
          score: score?.score,
          details: score?.details as Record<string, unknown> | undefined,
        };
      });

      // Find first non-complete task and set it as current
      const firstIncompleteIdx = progress.findIndex(p => p.status !== 'complete');
      if (firstIncompleteIdx >= 0) {
        progress.forEach((p, i) => {
          if (p.status !== 'complete') {
            p.status = i === firstIncompleteIdx ? 'current' : 'locked';
          }
        });
      }

      const allComplete = progress.every(p => p.status === 'complete');

      set({
        weekConfig: config,
        taskProgress: progress,
        currentTaskIndex: firstIncompleteIdx >= 0 ? firstIncompleteIdx : config.tasks.length - 1,
        shiftComplete: allComplete,
        loading: false,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load week config';
      set({ error: message, loading: false });
    }
  },

  completeTask: async (taskId: string, score = 1, details?: Record<string, unknown>) => {
    const { weekConfig, taskProgress } = get();
    if (!weekConfig) return;

    // Find the mission for this task
    const shiftState = useShiftStore.getState();
    const taskConfig = weekConfig.tasks.find(t => t.id === taskId);
    if (!taskConfig) return;

    const mission = shiftState.missions.find(m => m.missionType === taskConfig.type);
    if (mission) {
      await shiftState.submitMissionScore(mission.id, score, { status: 'complete', ...details });
    }

    // Update local progress
    const updated = taskProgress.map(p =>
      p.taskId === taskId ? { ...p, status: 'complete' as TaskStatus, score, details } : p
    );

    // Find next incomplete task
    const nextIdx = updated.findIndex(p => p.status !== 'complete');
    if (nextIdx >= 0) {
      updated[nextIdx].status = 'current';
    }

    const allComplete = updated.every(p => p.status === 'complete');

    set({
      taskProgress: updated,
      currentTaskIndex: nextIdx >= 0 ? nextIdx : updated.length,
      shiftComplete: allComplete,
    });

    // Persist only the unpersisted concern delta
    const { concernScoreDelta, concernScorePersisted } = get();
    const unpersisted = concernScoreDelta - concernScorePersisted;
    if (unpersisted > 0) {
      patchConcern(unpersisted).catch(() => {});
      set({ concernScorePersisted: concernScoreDelta });
    }
  },

  addConcern: (delta: number) => {
    set(state => ({ concernScoreDelta: state.concernScoreDelta + delta }));
  },

  nextTask: () => {
    const { currentTaskIndex, taskProgress } = get();
    if (currentTaskIndex < taskProgress.length - 1) {
      set({ currentTaskIndex: currentTaskIndex + 1 });
    }
  },

  reset: () => set({
    weekConfig: null,
    taskProgress: [],
    currentTaskIndex: 0,
    concernScoreDelta: 0,
    concernScorePersisted: 0,
    shiftComplete: false,
    loading: false,
    error: null,
    taskResetKey: 0,
  }),

  goToTask: (taskId: string) => {
    const { weekConfig, taskProgress } = get();
    if (!weekConfig) return;

    const targetIdx = weekConfig.tasks.findIndex(t => t.id === taskId);
    if (targetIdx < 0) return;

    const updated = taskProgress.map((p, i) => {
      if (i < targetIdx) return { ...p, status: 'complete' as TaskStatus };
      if (i === targetIdx) return { ...p, status: 'current' as TaskStatus, score: undefined, details: undefined };
      return { ...p, status: 'locked' as TaskStatus, score: undefined, details: undefined };
    });

    set({
      taskProgress: updated,
      currentTaskIndex: targetIdx,
      shiftComplete: false,
      taskResetKey: get().taskResetKey + 1,
    });
  },

  skipCurrentTask: () => {
    const { currentTaskIndex, taskProgress } = get();
    if (currentTaskIndex >= taskProgress.length) return;

    const updated = [...taskProgress];
    updated[currentTaskIndex] = {
      ...updated[currentTaskIndex],
      status: 'complete' as TaskStatus,
      score: 0,
      details: { skipped: true },
    };

    const nextIdx = updated.findIndex((p, i) => i > currentTaskIndex && p.status !== 'complete');
    if (nextIdx >= 0) {
      updated[nextIdx] = { ...updated[nextIdx], status: 'current' as TaskStatus };
    }

    const allComplete = updated.every(p => p.status === 'complete');

    set({
      taskProgress: updated,
      currentTaskIndex: nextIdx >= 0 ? nextIdx : updated.length,
      shiftComplete: allComplete,
    });
  },

  resetCurrentTask: () => {
    set(state => ({ taskResetKey: state.taskResetKey + 1 }));
  },

  resetShift: () => {
    const { weekConfig } = get();
    if (!weekConfig) return;

    const progress: TaskProgress[] = weekConfig.tasks.map((task, idx) => ({
      taskId: task.id,
      status: (idx === 0 ? 'current' : 'locked') as TaskStatus,
      score: undefined,
      details: undefined,
    }));

    set({
      taskProgress: progress,
      currentTaskIndex: 0,
      shiftComplete: false,
      taskResetKey: get().taskResetKey + 1,
    });
  },
}));
