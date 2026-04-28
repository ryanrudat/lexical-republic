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
  | "word_match"
  | "cloze_fill"
  | "word_sort"
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
  /**
   * Inter-task B moments keyed by the task ID the moment fires AFTER.
   * Used for non-skippable character choice-points (narrative-as-activity
   * layer B) that live in the terminal flow between tasks.
   */
  interTaskMoments?: Record<string, InterTaskMomentConfig>;
  /**
   * Clarity Checks — screen-locking pop-up vocabulary verifications.
   * Fire at shift_start, shift_end, or after a specific task (by id).
   * Non-skippable; student must answer all MCQs to proceed.
   */
  clarityChecks?: ClarityCheckConfig[];
}

// ─── Inter-Task Moment (B-layer) ──────────────────────────────────

export interface InterTaskMomentReply {
  text: string;
  /** Character's one-line response after student picks this reply. null = silent. */
  responseText: string | null;
  /** Tag stored on NarrativeChoice.value. Conventional: "compliant" | "curious" | "guarded". */
  value: string;
}

export interface InterTaskMomentConfig {
  /** Unique moment id, e.g. "w4_betty_aftertask1". Used as NarrativeChoice.choiceKey. */
  id: string;
  /** "character" = choice-required. "ambient" = no-choice glitch/atmosphere beat. */
  type: "character" | "ambient";
  // Character variant:
  characterName?: string;
  designation?: string;
  messageText?: string;
  replies?: InterTaskMomentReply[];
  // Ambient variant:
  glitchText?: string;
  /** Minimum display time in ms before the Continue button appears. Default 2000. */
  durationMs?: number;
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

// ─── Clarity Check (screen-locking pop-up vocab quiz) ───────────────

/** Where a Clarity Check fires within the shift flow. */
export type ClarityCheckPlacement =
  | "shift_start"
  | "shift_end"
  | { afterTaskId: string };

export interface ClarityCheckQuestion {
  /** The target word being tested. */
  word: string;
  /** The correct definition (will appear in options, scrambled). */
  correctDefinition: string;
  /** 2-3 distractor definitions. */
  distractors: string[];
}

export interface ClarityCheckConfig {
  /** Unique id, e.g. "clarity-w2-start". */
  id: string;
  /** Where in the shift this check fires. */
  placement: ClarityCheckPlacement;
  /** Short title shown at the top of the lock screen, e.g. "Clarity Check — Vocabulary Verification". */
  title: string;
  /** One-line Ministry framing, e.g. "Standard spot review. Complete all items to continue." */
  subtitle?: string;
  /** 2-4 MCQ items. */
  questions: ClarityCheckQuestion[];
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
  /**
   * Mid-task C choice that fires AFTER this document completes (between the
   * stamp animation and advancing to the next document). Non-skippable — the
   * student must pick an option. Stored as NarrativeChoice.choiceKey = id.
   */
  midTaskChoice?: MidTaskChoiceConfig;
}

export interface MidTaskChoiceOption {
  text: string;
  /** Tag stored on NarrativeChoice.value. Conventional: "compliant" | "curious" | "guarded". */
  value: string;
  /** Optional short follow-up shown in-place after the student picks this option. */
  responseText?: string;
}

export interface MidTaskChoiceConfig {
  /** Unique key, used as NarrativeChoice.choiceKey. */
  id: string;
  /** Short header label (e.g. "RECLASSIFICATION NOTICE"). */
  title: string;
  /** Primary message text (PEARL's dramatic line). */
  message: string;
  options: MidTaskChoiceOption[];
}

export interface ErrorConfig {
  sentenceIndex: number;
  errorWord: string;
  options: Array<{ text: string }>;
  correctIndex: number;
}

export interface ComprehensionQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

// ─── Contradiction Types ───────────────────────────────────────

export interface ContradictionConfig {
  memo: MemoConfig;
  memoRevised: MemoConfig;
  differences: DifferenceConfig[];
  recallQuestions: RecallQuestion[];
  pearlSwapMessage: string;
  writingPrompt: string;
  writingMinWords: number;
  writingLane: Record<string, unknown>;
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
  originalText: string;
  revisedText: string;
  classification: "information_changed" | "information_removed";
}

export interface RecallQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
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

// ─── Word Match Types ─────────────────────────────────────────

export interface WordMatchPair {
  word: string;
  definition: string;
}

export interface WordMatchConfig {
  pairs: WordMatchPair[];
  pearlBarkOnComplete?: string;
  timeLimit?: number;
}

// ─── Cloze Fill Types ─────────────────────────────────────────

export interface ClozeBlank {
  index: number;
  correctWord: string;
}

export interface ClozeFillConfig {
  passage: string;
  blanks: ClozeBlank[];
  wordBank: string[];
  title?: string;
  from?: string;
  pearlBarkOnComplete?: string;
}

// ─── Word Sort Types ──────────────────────────────────────────

export interface WordSortColumn {
  id: string;
  label: string;
  correctWords: string[];
}

export interface WordSortConfig {
  columns: WordSortColumn[];
  words: string[];
  instruction?: string;
  pearlBarkOnComplete?: string;
}
