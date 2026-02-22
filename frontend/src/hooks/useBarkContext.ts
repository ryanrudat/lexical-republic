import { useMemo } from 'react';
import { useShiftStore } from '../stores/shiftStore';
import type { StoryBeatConfig } from '../components/shift/shared/StoryBeatCard';

export interface BarkContext {
  weekNumber?: number;
  stepId?: string;
  grammarTarget?: string;
  masteryState?: string;
  learningFocus?: string;
  newWords?: string[];
  location?: string;
  customDetail?: string;
}

/**
 * Assembles base PEARL bark context from the current shift state.
 * Step components merge in specifics (grammarTarget, masteryState, etc).
 */
export function useBarkContext(): BarkContext {
  const currentWeek = useShiftStore(s => s.currentWeek);
  const currentStepId = useShiftStore(s => s.currentStepId);
  const missions = useShiftStore(s => s.missions);

  return useMemo(() => {
    const ctx: BarkContext = {
      weekNumber: currentWeek?.weekNumber,
      stepId: currentStepId,
    };

    // Find current step's mission to extract storyBeat context
    const stepMission = missions.find(m => {
      const type = m.missionType;
      // Map mission types to step ids
      if (currentStepId === 'grammar' && type === 'grammar') return true;
      if (currentStepId === 'listening' && type === 'listening') return true;
      if (currentStepId === 'voice_log' && type === 'voice_log') return true;
      if (currentStepId === 'case_file' && type === 'case_file') return true;
      if (currentStepId === 'briefing' && type === 'briefing') return true;
      return false;
    });

    if (stepMission?.config) {
      const config = stepMission.config as { storyBeat?: StoryBeatConfig };
      if (config.storyBeat) {
        ctx.learningFocus = config.storyBeat.learningFocus;
        ctx.newWords = config.storyBeat.newWords;
        ctx.location = config.storyBeat.location;
      }
    }

    return ctx;
  }, [currentWeek, currentStepId, missions]);
}
