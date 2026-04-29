export interface ClipConfig {
  title: string;
  embedUrl: string | null;
  uploadPath: string | null;
  fallbackText: string;
}

export interface PhaseConfig {
  id: string;
  type: string;
  label: string;
  location: string;
  minutes: number;
  missionId?: string;
  clipBefore?: ClipConfig | null;
  clipAfter?: ClipConfig | null;
  dictionaryLocked?: boolean;
  config: Record<string, unknown>;
}

export interface SessionConfig {
  id: string;
  weekId: string;
  weekNumber: number;
  weekTitle: string;
  phases: PhaseConfig[];
  totalMinutes: number;
  isActive: boolean;
}

export interface PhaseProgress {
  phaseId: string;
  missionId: string | null;
  completed: boolean;
  score: number | null;
}

export type PhaseStatus = 'locked' | 'current' | 'completed';
export type ClipState = 'before' | 'content' | 'after';

export interface EvaluationResult {
  passed: boolean;
  /** True when the writing addresses the assigned prompt. False vetoes the score to 0.0. */
  onTopic: boolean;
  /** One-sentence rationale for onTopic verdict. */
  onTopicReason: string;
  /** Meaningful vocabulary use score (0-1). */
  vocabScore: number;
  vocabUsed: string[];
  vocabMissed: string[];
  /** Non-scoring grammar observation surfaced to the teacher only. */
  grammarAdvisory: string;
  pearlFeedback: string;
  concernScoreChange: number;
  isDegraded: boolean;
  reason?: string;
}
