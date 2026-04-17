// ─── Canonical Task Result Shape ─────────────────────────────────
//
// Every ShiftQueue task component emits its completion via
// onComplete(score, details). The `details` argument MUST conform
// to TaskResultDetails so ShiftClosing can aggregate accurately
// (vocab vs grammar vs writing, error counts, etc.) without the
// per-task branching it used to do.

export type TaskCategory = 'vocab' | 'grammar' | 'writing' | 'mixed';

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
  /** True when teacher or student skipped the task — should not pull the averages down. */
  skipped?: boolean;
}
