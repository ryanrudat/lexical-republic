import { create } from 'zustand';
import type { StepId, Mission, WeekDetail, StepProgress, GrammarMastery } from '../types/shifts';
import { STEP_ORDER, deriveMasteryState } from '../types/shifts';
import { fetchWeek, submitScore, updateStepProgress } from '../api/shifts';

interface ShiftState {
  currentWeek: WeekDetail | null;
  currentStepId: StepId;
  missions: Mission[];
  weekProgress: StepProgress[];
  grammarMastery: Record<string, GrammarMastery>;
  loading: boolean;
  error: string | null;

  loadWeek: (weekId: string) => Promise<void>;
  setCurrentStep: (stepId: StepId) => void;
  updateStepStatus: (stepId: StepId, status: 'pending' | 'in_progress' | 'complete', data?: Record<string, unknown>) => void;
  submitMissionScore: (missionId: string, score: number, details?: Record<string, unknown>) => Promise<void>;
  updateGrammarMastery: (target: string, correct: boolean) => GrammarMastery;
  updateMissionConfig: (missionId: string, configUpdates: Record<string, unknown>) => void;
  nextStep: () => void;
  reset: () => void;
}

export const useShiftStore = create<ShiftState>((set, get) => ({
  currentWeek: null,
  currentStepId: 'recap',
  missions: [],
  weekProgress: STEP_ORDER.map(s => ({ stepId: s.id, status: 'pending' as const })),
  grammarMastery: {},
  loading: false,
  error: null,

  loadWeek: async (weekId: string) => {
    set({ loading: true, error: null });
    try {
      const week = await fetchWeek(weekId);

      // Build progress from existing scores
      const progress: StepProgress[] = STEP_ORDER.map(step => {
        const mission = week.missions.find(m => m.missionType === step.id);
        const score = mission?.score;
        const status = score?.details && (score.details as Record<string, unknown>).status === 'complete'
          ? 'complete' as const
          : 'pending' as const;
        return { stepId: step.id, status, score: score?.score, data: score?.details as Record<string, unknown> | undefined };
      });

      // Find first non-complete step
      const firstIncomplete = progress.find(p => p.status !== 'complete');
      const currentStepId = firstIncomplete?.stepId || 'clock_out';

      set({ currentWeek: week, missions: week.missions, weekProgress: progress, currentStepId, loading: false });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load week';
      const axiosError = err as { response?: { data?: { error?: string } } };
      set({ error: axiosError.response?.data?.error || message, loading: false });
    }
  },

  setCurrentStep: (stepId) => set({ currentStepId: stepId }),

  updateStepStatus: (stepId, status, data) => {
    const { weekProgress, currentWeek } = get();
    const updated = weekProgress.map(p =>
      p.stepId === stepId ? { ...p, status, data: data || p.data } : p
    );
    set({ weekProgress: updated });

    // Persist to backend
    if (currentWeek) {
      updateStepProgress(currentWeek.id, stepId, status, data).catch(() => {});
    }
  },

  submitMissionScore: async (missionId, score, details) => {
    const { currentWeek } = get();
    if (!currentWeek) return;
    await submitScore(currentWeek.id, missionId, score, details);
  },

  updateGrammarMastery: (target, correct) => {
    const { grammarMastery } = get();
    const existing: GrammarMastery = grammarMastery[target] || { target, attempts: 0, correct: 0, streak: 0, state: 'new' };
    const updated: GrammarMastery = {
      target,
      attempts: existing.attempts + 1,
      correct: existing.correct + (correct ? 1 : 0),
      streak: correct ? existing.streak + 1 : 0,
      state: 'new',
    };
    updated.state = deriveMasteryState(updated);
    set({
      grammarMastery: {
        ...grammarMastery,
        [target]: updated,
      }
    });
    return updated;
  },

  updateMissionConfig: (missionId, configUpdates) => {
    const { missions } = get();
    const updated = missions.map(m => {
      if (m.id !== missionId) return m;
      const existingConfig = (m.config || {}) as Record<string, unknown>;
      return { ...m, config: { ...existingConfig, ...configUpdates } };
    });
    set({ missions: updated });
  },

  nextStep: () => {
    const { currentStepId } = get();
    const idx = STEP_ORDER.findIndex(s => s.id === currentStepId);
    if (idx < STEP_ORDER.length - 1) {
      set({ currentStepId: STEP_ORDER[idx + 1].id });
    }
  },

  reset: () => set({
    currentWeek: null,
    currentStepId: 'recap',
    missions: [],
    weekProgress: STEP_ORDER.map(s => ({ stepId: s.id, status: 'pending' as const })),
    grammarMastery: {},
    loading: false,
    error: null,
  }),
}));
