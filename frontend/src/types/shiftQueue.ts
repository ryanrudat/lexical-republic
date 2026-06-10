// ─── ShiftQueue Frontend Types ─────────────────────────────────

export type TaskType =
  | "intake_form"
  | "word_match"
  | "cloze_fill"
  | "word_sort"
  | "vocab_clearance"
  | "document_review"
  | "shift_report"
  | "contradiction_report"
  | "priority_briefing"
  | "priority_sort"
  | "evidence_assembly"
  | "custom";

export type TaskStatus = "locked" | "current" | "complete";

export interface TaskProgress {
  taskId: string;
  status: TaskStatus;
  score?: number;
  details?: Record<string, unknown>;
}

export interface BridgingBriefing {
  title: string;
  from: string;
  paragraphs: string[];
}

export interface WeekConfig {
  shiftType: "queue";
  weekNumber: number;
  grammarTarget: string;
  targetWords: string[];
  previousWords: string[];
  tasks: TaskConfig[];
  taskGates?: number[];
  bridgingBriefing?: BridgingBriefing | null;
  harmonyConfig: HarmonyConfig;
  characterMessages: CharacterMessageConfig[];
  narrativeHook: { title: string; body: string; borderColor: string };
  citizen4488Post: Citizen4488Config;
  shiftClosing: ShiftClosingConfig;
  /** Inter-task B moments keyed by the task ID the moment fires AFTER. */
  interTaskMoments?: Record<string, InterTaskMomentConfig>;
  /** Screen-locking pop-up vocab quizzes. Fire at placement points in the shift. */
  clarityChecks?: ClarityCheckConfig[];
}

// ─── Clarity Check (screen-locking pop-up vocab quiz) ─────────────

export type ClarityCheckPlacement =
  | "shift_start"
  | "shift_end"
  | { afterTaskId: string };

export interface ClarityCheckQuestion {
  word: string;
  correctDefinition: string;
  distractors: string[];
}

export interface ClarityCheckConfig {
  id: string;
  placement: ClarityCheckPlacement;
  title: string;
  subtitle?: string;
  questions: ClarityCheckQuestion[];
}

// ─── Inter-Task Moment (B-layer) ──────────────────────────────────

export interface InterTaskMomentReply {
  text: string;
  responseText: string | null;
  value: string;
}

export interface InterTaskMomentConfig {
  id: string;
  type: "character" | "ambient" | "unedited_bridge";
  characterName?: string;
  designation?: string;
  messageText?: string;
  replies?: InterTaskMomentReply[];
  glitchText?: string;
  durationMs?: number;
  /**
   * unedited_bridge variant: Frey pop-up that bridges the official shift
   * flow into the `[ ].edited` app. Renders dark/glitchy chrome with a
   * structured "name/time/place" recall block and a single action button.
   * Tapping the button posts a NarrativeChoice and advances the queue.
   */
  bridge?: UneditedBridgeConfig;
}

export interface UneditedBridgeConfig {
  /** Header label, e.g. "[ ].edited — incoming". */
  cardTitle: string;
  /** Structured recall block. Each line renders as "label: value". */
  lines: { label: string; value: string }[];
  /** Free-text lines below the structured block (lowercase Unedited voice). */
  closingLines: string[];
  /** Signature line, e.g. "— F". */
  signature: string;
  /** Button label, e.g. "Open [ ].edited". */
  actionLabel: string;
  /** Value stored on NarrativeChoice when tapped (e.g. "opened"). */
  choiceValue: string;
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
  triggerType: string;
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
  responseText: string | null;
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

// ─── Character Message (from DB) ──────────────────────────────

export interface ThreadEntry {
  sender: 'teacher' | 'student';
  text: string;
  timestamp: string;
}

export interface CharacterMessage {
  id: string;
  pairId: string;
  characterName: string;
  designation: string;
  messageText: string;
  replyType: string;
  replyOptions: ReplyOption[] | null;
  triggerType: string;
  triggerConfig: Record<string, unknown>;
  weekNumber: number;
  isRead: boolean;
  studentReply: string | null;
  thread: ThreadEntry[] | null;
  createdAt: string;
}

// ─── Task Component Props ─────────────────────────────────────

export interface TaskProps {
  config: Record<string, unknown>;
  weekConfig: WeekConfig;
  /** The DB Mission row backing this task (resolved by ShiftQueue via
   *  missionType — the same lookup completeTask uses). Writing tasks forward
   *  it to WritingEvaluator so server-side eval persistence (writingText /
   *  rubric fields / pearlFeedback on MissionScore) targets the right row. */
  missionId?: string;
  onComplete: (score: number, details?: Record<string, unknown>) => void;
}
