import type { TaskCategory, TaskResultDetails } from '../types/taskResult';

// ─── Score Aggregator ────────────────────────────────────────────
//
// Pure function that folds an array of per-task results into the
// summary stats ShiftClosing shows the student. No React state,
// no hooks — unit-testable in isolation.

export interface AggregatorInput {
  score: number;
  details?: TaskResultDetails | Record<string, unknown>;
}

export interface AggregatorResult {
  /** Mean per-item accuracy across all vocab tasks, 0-1. Null when no vocab tasks. */
  vocabAccuracy: number | null;
  /** Mean per-item accuracy across all grammar tasks, 0-1. Null when no grammar tasks. */
  grammarAccuracy: number | null;
  /** Mean writing score across all writing tasks, 0-1. Null when no writing tasks. */
  writingScore: number | null;
  /** Sum of errorsFound across tasks that reported error counts. */
  errorsFound: number;
  /** Sum of errorsTotal across tasks that reported error counts. */
  errorsTotal: number;
  /** Mean of every scored task's final score, 0-1. Null when nothing scored. */
  overallScore: number | null;
}

/** Type guard for canonical TaskResultDetails. */
function isCanonical(details: unknown): details is TaskResultDetails {
  if (!details || typeof details !== 'object') return false;
  const d = details as Record<string, unknown>;
  return (
    typeof d.taskType === 'string' &&
    typeof d.itemsCorrect === 'number' &&
    typeof d.itemsTotal === 'number' &&
    typeof d.category === 'string'
  );
}

/**
 * Aggregate a list of task results into the shift summary stats.
 *
 * Key behaviors:
 * - Skipped tasks are excluded from every average.
 * - Categories with zero contributing tasks return null (caller renders "—"),
 *   NOT a bogus "all complete" default.
 * - Accuracy for a bucket is (sum of itemsCorrect) / (sum of itemsTotal)
 *   so a 10-item task contributes more than a 2-item task.
 * - Writing tasks typically don't have itemsCorrect; their `score` is
 *   used directly (WritingEvaluator returns a 0-1 score).
 */
export function aggregateTaskResults(inputs: AggregatorInput[]): AggregatorResult {
  const perCategoryItems: Record<TaskCategory, { correct: number; total: number }> = {
    vocab: { correct: 0, total: 0 },
    grammar: { correct: 0, total: 0 },
    writing: { correct: 0, total: 0 },
    mixed: { correct: 0, total: 0 },
  };
  const writingScores: number[] = [];
  const overallScores: number[] = [];
  let errorsFound = 0;
  let errorsTotal = 0;

  for (const input of inputs) {
    const { score, details } = input;

    if (!isCanonical(details)) {
      // Unknown shape — still contribute to overall so a bare
      // onComplete(1) call doesn't vanish entirely.
      if (Number.isFinite(score)) overallScores.push(score);
      continue;
    }

    if (details.skipped) {
      continue;
    }

    if (typeof details.errorsFound === 'number') {
      errorsFound += details.errorsFound;
    }
    if (typeof details.errorsTotal === 'number') {
      errorsTotal += details.errorsTotal;
    }

    if (Number.isFinite(score)) {
      overallScores.push(score);
    }

    if (details.category === 'writing') {
      // Writing tasks use the raw score directly (rarely have item counts).
      if (Number.isFinite(score)) writingScores.push(score);
      continue;
    }

    const bucket = perCategoryItems[details.category];
    if (bucket && details.itemsTotal > 0) {
      bucket.correct += details.itemsCorrect;
      bucket.total += details.itemsTotal;
    } else if (Number.isFinite(score)) {
      // Category with no item counts (rare) — count the raw score as one item.
      bucket.correct += score;
      bucket.total += 1;
    }
  }

  const vocabAccuracy =
    perCategoryItems.vocab.total > 0
      ? perCategoryItems.vocab.correct / perCategoryItems.vocab.total
      : null;

  // Grammar + mixed share the grammar accuracy bucket — "mixed" tasks
  // (e.g. priority sort that also has writing) contribute to grammar too.
  const grammarCorrect = perCategoryItems.grammar.correct + perCategoryItems.mixed.correct;
  const grammarTotal = perCategoryItems.grammar.total + perCategoryItems.mixed.total;
  const grammarAccuracy = grammarTotal > 0 ? grammarCorrect / grammarTotal : null;

  const writingScore =
    writingScores.length > 0
      ? writingScores.reduce((a, b) => a + b, 0) / writingScores.length
      : null;

  const overallScore =
    overallScores.length > 0
      ? overallScores.reduce((a, b) => a + b, 0) / overallScores.length
      : null;

  return {
    vocabAccuracy,
    grammarAccuracy,
    writingScore,
    errorsFound,
    errorsTotal,
    overallScore,
  };
}

/**
 * Count distinct target-vocab words the student hit across all completed tasks.
 *
 * Reads `details.vocabUsed` (populated by writing tasks via WritingEvaluator)
 * and dedupes case-insensitively. Returns null when no task contributed a
 * vocabUsed array (so ShiftClosing can render "—" instead of a bogus 0).
 */
export function countTargetWordsHit(inputs: AggregatorInput[]): number | null {
  const seen = new Set<string>();
  let anyContributed = false;
  for (const input of inputs) {
    const details = input.details as Record<string, unknown> | undefined;
    const vocab = details?.vocabUsed;
    if (!Array.isArray(vocab)) continue;
    anyContributed = true;
    for (const word of vocab) {
      if (typeof word === 'string' && word.trim()) {
        seen.add(word.trim().toLowerCase());
      }
    }
  }
  return anyContributed ? seen.size : null;
}
