// ─── ShiftQueue Frontend Types ─────────────────────────────────

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

export type TaskStatus = "locked" | "current" | "complete";

export interface TaskProgress {
  taskId: string;
  status: TaskStatus;
  score?: number;
  details?: Record<string, unknown>;
}

export interface WeekConfig {
  shiftType: "queue";
  weekNumber: number;
  grammarTarget: string;
  targetWords: string[];
  previousWords: string[];
  tasks: TaskConfig[];
  taskGates?: number[];
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
  onComplete: (score: number, details?: Record<string, unknown>) => void;
}
