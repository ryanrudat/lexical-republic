// Step definitions — the 7 ordered steps of each Shift
export const STEP_ORDER = [
  { id: 'recap', label: 'Shift Start', location: 'intake' },
  { id: 'briefing', label: 'Briefing', location: 'broadcast' },
  { id: 'grammar', label: 'Language Desk', location: 'language-lab' },
  { id: 'listening', label: 'Evidence', location: 'evidence-desk' },
  { id: 'voice_log', label: 'Voice Booth', location: 'voice-booth' },
  { id: 'case_file', label: 'Case File', location: 'filing-desk' },
  { id: 'clock_out', label: 'Clock-Out', location: 'intake' },
] as const;

export const LOCATIONS = [
  { id: 'intake', label: 'Shift Start', hint: 'Start and close your shift' },
  { id: 'broadcast', label: 'Broadcast', hint: 'Episode video and directives' },
  { id: 'language-lab', label: 'Language Lab', hint: 'Grammar and vocabulary control' },
  { id: 'evidence-desk', label: 'Evidence Desk', hint: 'Listening and proof selection' },
  { id: 'voice-booth', label: 'Voice Booth', hint: 'Speaking rehearsal and recording' },
  { id: 'filing-desk', label: 'Filing Desk', hint: 'Write official case reports' },
] as const;

export type StepId = typeof STEP_ORDER[number]['id'];
export type LocationId = typeof LOCATIONS[number]['id'];
export type StepStatus = 'locked' | 'pending' | 'in_progress' | 'complete';
export type BarkType = 'success' | 'incorrect' | 'hint' | 'concern' | 'notice';

export interface StepProgress {
  stepId: StepId;
  status: StepStatus;
  score?: number;
  data?: Record<string, unknown>;
}

export interface WeekProgress {
  weekId: string;
  steps: StepProgress[];
}

export interface WeekSummary {
  id: string;
  weekNumber: number;
  title: string;
  description: string | null;
  arcId: string;
  arcName: string;
  arcOrder: number;
  totalSteps: number;
  stepsCompleted: number;
  clockedOut: boolean;
  isUnlocked?: boolean;
}

export interface SeasonResponse {
  title: string;
  subtitle: string;
  weeks: WeekSummary[];
}

export interface MissionScore {
  id: string;
  userId: string;
  missionId: string;
  score: number;
  details: Record<string, unknown> | null;
}

export interface Mission {
  id: string;
  orderIndex: number;
  title: string;
  description: string | null;
  missionType: string;
  config: Record<string, unknown>;
  score: MissionScore | null;
}

export interface WeekDetail {
  id: string;
  weekNumber: number;
  title: string;
  description: string | null;
  arcName: string;
  arcOrder: number;
  missions: Mission[];
}

export interface VocabWord {
  id: string;
  word: string;
  tier: 'approved' | 'grey' | 'black';
  source: string;
  weekNumber: number | null;
  mastery: number;
  encounters: number;
}

export interface StudentSummary {
  id: string;
  designation: string | null;
  displayName: string;
  lane: number;
  xp: number;
  streak: number;
  weeksCompleted: number;
  lastLoginAt: string | null;
  classId?: string | null;
  className?: string | null;
}

export type MasteryState = 'new' | 'learning' | 'practicing' | 'mastered' | 'struggling';

export interface GrammarMastery {
  target: string;
  attempts: number;
  correct: number;
  streak: number;
  state: MasteryState;
}

/** Derive mastery state from raw stats */
export function deriveMasteryState(m: { attempts: number; correct: number; streak: number }): MasteryState {
  if (m.attempts === 0) return 'new';
  const accuracy = m.correct / m.attempts;
  // Struggling: 3+ attempts with < 40% accuracy
  if (m.attempts >= 3 && accuracy < 0.4) return 'struggling';
  // Mastered: 5+ attempts with 80%+ accuracy and current streak of 3+
  if (m.attempts >= 5 && accuracy >= 0.8 && m.streak >= 3) return 'mastered';
  // Practicing: 3+ attempts with 60%+ accuracy
  if (m.attempts >= 3 && accuracy >= 0.6) return 'practicing';
  // Learning: at least 1 attempt
  return 'learning';
}

export interface BarkEntry {
  id: string;
  type: BarkType;
  text: string;
  timestamp: number;
}

// Grammar document type (from config)
export interface GrammarDocument {
  id: string;
  type: string;
  prompt: string;
  text: string;
  options: string[];
  correctIndex: number;
  targets: string[];
}

// Check type for briefing/listening
export interface ComprehensionCheck {
  id: string;
  question: string;
  choices: string[];
  answerIndex: number;
}
