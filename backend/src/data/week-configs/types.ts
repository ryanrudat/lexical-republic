// ─── ShiftQueue WeekConfig Type System ───────────────────────────

export type TaskType =
  | "intake_form"
  | "vocab_clearance"
  | "document_review"
  | "shift_report"
  | "contradiction_report"
  | "priority_briefing"
  | "priority_sort"
  | "evidence_assembly"
  | "custom";

export interface WeekConfig {
  shiftType: "queue";
  weekNumber: number;
  grammarTarget: string;
  targetWords: string[];
  previousWords: string[];
  tasks: TaskConfig[];
  harmonyConfig: HarmonyConfig;
  characterMessages: CharacterMessageConfig[];
  narrativeHook: { title: string; body: string; borderColor: string };
  citizen4488Post: Citizen4488Config;
  shiftClosing: ShiftClosingConfig;
}

export interface TaskConfig {
  id: string;
  type: TaskType;
  label: string;
  location: string;
  clipBefore?: string;
  clipAfter?: string;
  config: Record<string, unknown>;
}

export interface HarmonyConfig {
  totalPosts: number;
  cleanPosts: number;
  grammarErrorPosts: number;
  concerningPosts: number;
  propagandaPosts: number;
  aiPromptOverrides?: string;
}

export interface CharacterMessageConfig {
  characterName: string;
  designation: string;
  triggerType:
    | "task_start"
    | "task_complete"
    | "time_delay"
    | "error_threshold"
    | "shift_start"
    | "shift_end"
    | "concern_score_threshold"
    | "harmony_flag_count";
  triggerConfig: {
    taskId?: string;
    delayMs?: number;
    threshold?: number;
    minConcernScore?: number;
    minFlags?: number;
  };
  messageText: string;
  replyType: "canned" | "freetext";
  replyOptions?: ReplyOption[];
}

export interface ReplyOption {
  text: string;
  responseText: string | null; // null = M.K. silent pattern
  isCompliant: boolean;
}

export interface Citizen4488Config {
  content: string;
  type: "concerning";
  grammarError?: { original: string; corrected: string };
}

export interface ShiftClosingConfig {
  clearanceFrom: string;
  clearanceTo: string;
  pearlQuote: string;
  narrativeHook: { title: string; body: string };
}

export interface ConcernRuleConfig {
  trigger: string;
  delta: number;
  description: string;
}

export interface LaneConfig {
  "1": {
    minWords: number;
    sentenceStarters: boolean;
    wordBankChinese: boolean;
    pearlHints?: string[];
  };
  "2": {
    minWords: number;
    wordListVisible: boolean;
  };
  "3": {
    minWords: number;
    requireNegative?: boolean;
    requireQuestion?: boolean;
    bonusQuestion?: string;
  };
}

// ─── Vocab Quiz Item Types ─────────────────────────────────────

export interface VocabQuizItem {
  type: "definition" | "toeic_p5" | "context";
  word: string;
  question: string;
  options: string[];
  correctIndex: number;
  context?: string; // passage for context type
}

// ─── Document Types ────────────────────────────────────────────

export interface DocumentConfig {
  id: string;
  type: "approve" | "error_correction" | "comprehension";
  title: string;
  department?: string;
  classification?: string;
  priority?: string;
  from?: string;
  to?: string;
  re?: string;
  body: string;
  errors?: ErrorConfig[];
  questions?: ComprehensionQuestion[];
  laneHints?: Record<string, string[]>;
}

export interface ErrorConfig {
  sentenceIndex: number;
  wordStart: number;
  wordEnd: number;
  errorText: string;
  options: string[];
  correctIndex: number;
}

export interface ComprehensionQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

// ─── Contradiction Types ───────────────────────────────────────

export interface ContradictionConfig {
  memoA: MemoConfig;
  memoB: MemoConfig;
  differences: DifferenceConfig[];
}

export interface MemoConfig {
  title: string;
  department: string;
  date: string;
  from: string;
  to: string;
  re: string;
  body: string;
  reviewedBy?: string;
}

export interface DifferenceConfig {
  diffId: string;
  label: string;
  memoAText: string;
  memoBText: string;
  classification: "minor_correction" | "information_changed" | "information_removed";
}

// ─── Priority Sort Types ───────────────────────────────────────

export interface PriorityCaseConfig {
  caseId: string;
  title: string;
  description: string;
  correctColumn: "URGENT" | "ROUTINE" | "HOLD";
  disappears?: boolean;
  disappearBark?: string;
  laneHint?: string;
}
