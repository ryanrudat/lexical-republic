import { create } from 'zustand';
import type { WeekConfig, TaskProgress, TaskStatus } from '../types/shiftQueue';
import { fetchWeekConfig, patchConcern, resetWeekScores } from '../api/shifts';
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
  taskGates: number[];
  gated: boolean;

  loadWeekConfig: (weekId: string) => Promise<void>;
  completeTask: (taskId: string, score?: number, details?: Record<string, unknown>) => Promise<void>;
  addConcern: (delta: number) => void;
  nextTask: () => void;
  reset: () => void;
  goToTask: (taskId: string) => Promise<void>;
  skipCurrentTask: () => Promise<void>;
  resetCurrentTask: () => void;
  resetShift: () => Promise<void>;
  reloadFromServer: () => Promise<void>;
  setTaskGates: (gates: number[]) => void;
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
  taskGates: [],
  gated: false,

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
      const gates = config.taskGates ?? [];
      const nextIdx = firstIncompleteIdx >= 0 ? firstIncompleteIdx : config.tasks.length - 1;
      const isGated = gates.length > 0 && !allComplete && gates.includes(nextIdx);

      set({
        weekConfig: config,
        taskProgress: progress,
        currentTaskIndex: nextIdx,
        shiftComplete: allComplete && !isGated,
        loading: false,
        taskGates: gates,
        gated: isGated,
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
    const { taskGates } = get();
    const isGated = taskGates.length > 0 && nextIdx >= 0 && !allComplete && taskGates.includes(nextIdx);

    set({
      taskProgress: updated,
      currentTaskIndex: nextIdx >= 0 ? nextIdx : updated.length,
      shiftComplete: allComplete && !isGated,
      gated: isGated,
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
    taskGates: [],
    gated: false,
  }),

  goToTask: async (taskId: string) => {
    const { weekConfig, taskProgress, taskGates } = get();
    if (!weekConfig) return;

    const targetIdx = weekConfig.tasks.findIndex(t => t.id === taskId);
    if (targetIdx < 0) return;

    const shiftState = useShiftStore.getState();
    const weekId = shiftState.currentWeek?.id;

    // Persist: mark all tasks before target as complete (skipped)
    for (let i = 0; i < targetIdx; i++) {
      if (taskProgress[i].status === 'complete') continue;
      const taskConfig = weekConfig.tasks[i];
      const mission = shiftState.missions.find(m => m.missionType === taskConfig.type);
      if (mission) {
        shiftState.submitMissionScore(mission.id, 0, { status: 'complete', skipped: true }).catch(() => {});
      }
    }

    // Persist: clear server scores for target task and all tasks after it
    // so a refresh doesn't show them as already completed
    if (weekId) {
      const typesToClear = weekConfig.tasks.slice(targetIdx).map(t => t.type);
      resetWeekScores(weekId, typesToClear).catch(() => {});
    }

    const updated = taskProgress.map((p, i) => {
      if (i < targetIdx) return { ...p, status: 'complete' as TaskStatus };
      if (i === targetIdx) return { ...p, status: 'current' as TaskStatus, score: undefined, details: undefined };
      return { ...p, status: 'locked' as TaskStatus, score: undefined, details: undefined };
    });

    const isGated = taskGates.length > 0 && taskGates.includes(targetIdx);

    set({
      taskProgress: updated,
      currentTaskIndex: targetIdx,
      shiftComplete: false,
      gated: isGated,
      taskResetKey: get().taskResetKey + 1,
    });
  },

  skipCurrentTask: async () => {
    const { currentTaskIndex, taskProgress, weekConfig, taskGates } = get();
    if (!weekConfig || currentTaskIndex >= taskProgress.length) return;

    // Persist: mark current task as complete (skipped) on server
    const taskConfig = weekConfig.tasks[currentTaskIndex];
    const shiftState = useShiftStore.getState();
    const mission = shiftState.missions.find(m => m.missionType === taskConfig.type);
    if (mission) {
      shiftState.submitMissionScore(mission.id, 0, { status: 'complete', skipped: true }).catch(() => {});
    }

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
    const isGated = taskGates.length > 0 && nextIdx >= 0 && !allComplete && taskGates.includes(nextIdx);

    set({
      taskProgress: updated,
      currentTaskIndex: nextIdx >= 0 ? nextIdx : updated.length,
      shiftComplete: allComplete && !isGated,
      gated: isGated,
    });
  },

  resetCurrentTask: () => {
    set(state => ({ taskResetKey: state.taskResetKey + 1 }));
  },

  resetShift: async () => {
    const { weekConfig } = get();
    if (!weekConfig) return;

    // Persist: delete all mission scores for this week on server
    const shiftState = useShiftStore.getState();
    const weekId = shiftState.currentWeek?.id;
    if (weekId) {
      resetWeekScores(weekId).catch(() => {});
    }

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

  // Reload shift data from server — used after receiving teacher commands
  reloadFromServer: async () => {
    const { weekConfig } = get();
    if (!weekConfig) return;
    const shiftState = useShiftStore.getState();
    const weekId = shiftState.currentWeek?.id;
    if (weekId) {
      // Re-fetch the shift data from server to get updated mission scores
      await shiftState.loadWeek(weekId);
      // Then reload the queue config using the fresh mission data
      await get().loadWeekConfig(weekId);
    }
  },

  setTaskGates: (gates: number[]) => {
    const { currentTaskIndex, taskProgress } = get();
    const allComplete = taskProgress.every(p => p.status === 'complete');
    const isGated = gates.length > 0 && !allComplete && gates.includes(currentTaskIndex);
    set({ taskGates: gates, gated: isGated });
  },
}));
