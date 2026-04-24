// ─── Canonical Task Result Shape ─────────────────────────────────
//
// Every ShiftQueue task component emits its completion via
// onComplete(score, details). The `details` argument MUST conform
// to TaskResultDetails so ShiftClosing can aggregate accurately
// (vocab vs grammar vs writing, error counts, etc.) without the
// per-task branching it used to do.

export type TaskCategory = 'vocab' | 'grammar' | 'writing' | 'mixed';

/**
 * Per-question log entry persisted by every multi-choice / matching task so
 * teachers can see exactly which option the student picked on each item,
 * not just the aggregate score. Read by the teacher Gradebook / Writing
 * Review UI — the frontend score aggregator intentionally ignores it.
 */
export interface TaskAnswerLogEntry {
  /** Stable ID for this question/item (pair index, blank index, diff ID, etc.). */
  questionId: string;
  /** Short human-readable prompt (e.g. "Match: notice" or "Blank 2: We must ___ the document"). */
  prompt: string;
  /** The student's final selected answer. If they got it correct (including after retries before a max-attempt lock), this is the correct answer; otherwise it's their last wrong pick (or the auto-resolved correct answer on max-attempt lock). */
  chosen: string;
  /** The correct answer for this question. */
  correct: string;
  /** Did they end up correct on their first try? Retry-tolerant tasks treat any retry / auto-resolve as !wasCorrect so teachers can spot struggling students. */
  wasCorrect: boolean;
  /** How many tries before reaching the final state. 1 = got it on first try. Omit for single-attempt tasks. */
  attempts?: number;
}

export interface TaskResultDetails {
  /** Stable task type identifier (e.g. 'word_match', 'contradiction_report'). */
  taskType: string;
  /** Number of items the student got correct. */
  itemsCorrect: number;
  /** Total items the task scored. */
  itemsTotal: number;
  /** Bucket for averaging into the shift summary. */
  category: TaskCategory;

  // ── Optional display fields ────────────────────────────────────
  /** For document/grammar tasks: how many errors the student actually corrected. */
  errorsFound?: number;
  /** For document/grammar tasks: total errors present in the document(s). */
  errorsTotal?: number;
  /** Preserve the student's writing submission so downstream code (e.g. ShiftReport details) can display or re-use it. */
  writingText?: string;
  /** Word count of writing output, where applicable. */
  wordCount?: number;
  /** Target-vocab words the student actually hit in writing output (from WritingEvaluator). Used by ShiftClosing "Target Words Hit" card. */
  vocabUsed?: string[];
  /** True when teacher or student skipped the task — should not pull the averages down. */
  skipped?: boolean;
  /** Per-question answer trail for the teacher Gradebook / Writing Review UI. Additive — legacy details shapes without this field still aggregate correctly. */
  answerLog?: TaskAnswerLogEntry[];
}
