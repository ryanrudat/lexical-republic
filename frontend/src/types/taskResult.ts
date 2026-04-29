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

  // ── Writing rubric (post-2026-04-29 redesign) ──────────────────
  // Grammar is no longer scored on open writing (too noisy at A2-B1, not
  // worth the OpenAI cost). The rubric is now: on-topic veto + meaningful
  // vocab use. Grammar still surfaces as advisory text only.
  /** True when the student's writing addresses the assigned prompt. False vetoes the score to 0.0. */
  onTopic?: boolean;
  /** One-sentence rationale for onTopic verdict — visible to teacher in Gradebook/Writing Review. */
  onTopicReason?: string;
  /** Meaningful vocabulary use score (0-1). On-topic vetoes this to 0.0; otherwise the writing's score is this value. */
  vocabScore?: number;
  /** Words the student missed from the target list (already on this list pre-redesign; retained for teacher review). */
  vocabMissed?: string[];
  /** Non-scoring grammar observation for the teacher. Replaces the old grammarNotes[] — short text instead of a list. */
  grammarAdvisory?: string;
  /** True when the student forced submission via "Submit Anyway" after a failed eval. Off-topic submissions cannot bypass via Submit Anyway. */
  submittedAnyway?: boolean;
}
