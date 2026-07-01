// ─── Shift Result Registration (server-side convergence) ──────────────
//
// The canonical "closing grade" for a shift is the ShiftResult row
// (completedAt + aggregate scores). Historically it was written ONLY by the
// frontend ShiftClosing screen's mount-time POST. That POST could be lost
// (a dropped request on classroom Wi-Fi, a transient 5xx) or never reached
// at all (the W4 Drop Box → Recruitment epilogue gates ShiftClosing), leaving
// students who finished the shift with no registered grade on the teacher view.
//
// This helper makes the backend self-heal: the moment a `shift_report` /
// `clock_out` MissionScore is marked complete, we ensure a ShiftResult exists
// with completedAt set and a server-computed aggregate. The frontend POST then
// refines it with the richer client aggregate (words written, concern delta).
// If the frontend POST never lands, this server floor still registers the shift.
//
// The same helper backs `scripts/backfillShiftResults.ts` to recover students
// who got stuck before this change shipped.

import prisma from './prisma';
import { getWeekConfig } from '../data/week-configs';

// Mirror of the frontend `frontend/src/utils/scoreAggregator.ts` categories.
type TaskCategory = 'vocab' | 'grammar' | 'writing' | 'mixed';

export interface ScoreRowInput {
  score: number;
  details?: unknown;
}

interface AggregateResult {
  vocabAccuracy: number | null;
  grammarAccuracy: number | null;
  writingScore: number | null;
  errorsFound: number;
  errorsTotal: number;
  overallScore: number | null;
}

interface CanonicalDetails {
  taskType: string;
  itemsCorrect: number;
  itemsTotal: number;
  category: TaskCategory;
  errorsFound?: number;
  errorsTotal?: number;
  skipped?: boolean;
}

function asRecord(details: unknown): Record<string, unknown> | null {
  if (!details || typeof details !== 'object' || Array.isArray(details)) return null;
  return details as Record<string, unknown>;
}

function isCanonical(details: unknown): details is CanonicalDetails {
  const d = asRecord(details);
  if (!d) return false;
  return (
    typeof d.taskType === 'string' &&
    typeof d.itemsCorrect === 'number' &&
    typeof d.itemsTotal === 'number' &&
    typeof d.category === 'string'
  );
}

/**
 * Server-side mirror of the frontend `aggregateTaskResults`. Keep the two in
 * sync — both fold the SAME per-task result shape into the shift summary so the
 * server floor and the client refinement agree.
 */
export function aggregateMissionScores(inputs: ScoreRowInput[]): AggregateResult {
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
      // Unknown shape — still contribute to overall so a bare onComplete(1)
      // call doesn't vanish entirely.
      if (Number.isFinite(score)) overallScores.push(score);
      continue;
    }

    if (details.skipped) continue;

    if (typeof details.errorsFound === 'number') errorsFound += details.errorsFound;
    if (typeof details.errorsTotal === 'number') errorsTotal += details.errorsTotal;

    if (Number.isFinite(score)) overallScores.push(score);

    if (details.category === 'writing') {
      if (Number.isFinite(score)) writingScores.push(score);
      continue;
    }

    const bucket = perCategoryItems[details.category];
    if (bucket && details.itemsTotal > 0) {
      bucket.correct += details.itemsCorrect;
      bucket.total += details.itemsTotal;
    } else if (bucket && Number.isFinite(score)) {
      bucket.correct += score;
      bucket.total += 1;
    }
  }

  const vocabAccuracy =
    perCategoryItems.vocab.total > 0
      ? perCategoryItems.vocab.correct / perCategoryItems.vocab.total
      : null;

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

  return { vocabAccuracy, grammarAccuracy, writingScore, errorsFound, errorsTotal, overallScore };
}

/** Distinct target-vocab words hit across tasks (mirror of frontend countTargetWordsHit). */
export function countTargetWordsHit(inputs: ScoreRowInput[]): number | null {
  const seen = new Set<string>();
  let anyContributed = false;
  for (const input of inputs) {
    const d = asRecord(input.details);
    const vocab = d?.vocabUsed;
    if (!Array.isArray(vocab)) continue;
    anyContributed = true;
    for (const word of vocab) {
      if (typeof word === 'string' && word.trim()) seen.add(word.trim().toLowerCase());
    }
  }
  return anyContributed ? seen.size : null;
}

/** Sum of words physically written across writing tasks (details.wordCount). */
export function sumWordsWritten(inputs: ScoreRowInput[]): number {
  let total = 0;
  for (const input of inputs) {
    const wc = asRecord(input.details)?.wordCount;
    if (typeof wc === 'number') total += wc;
  }
  return total;
}

export type EnsureShiftResultAction =
  | 'created'
  | 'updated-marker'
  | 'skipped-already-registered'
  | 'skipped-no-scores';

export interface EnsureShiftResultResult {
  action: EnsureShiftResultAction;
  overallScore: number | null;
}

/**
 * Ensure a completed ShiftResult exists for (pairId, weekNumber), computing the
 * aggregate from the pair's MissionScore rows for that week.
 *
 * - If a ShiftResult already has completedAt set, do nothing (never clobber the
 *   richer client-written aggregate / recorded concernScoreDelta).
 * - If only a completedAt:null marker exists (teacher move/reset anchor), flip
 *   it to completed without touching concernScoreDelta.
 * - Otherwise create a fresh completed row.
 *
 * `completedAt` defaults to now (live convergence); the backfill passes the
 * closing task's createdAt so recovered rows carry a realistic timestamp.
 */
export async function ensureShiftResultRegistered(opts: {
  pairId: string;
  weekNumber: number;
  completedAt?: Date;
}): Promise<EnsureShiftResultResult> {
  const { pairId, weekNumber } = opts;
  const completedAt = opts.completedAt ?? new Date();

  const existing = await prisma.shiftResult.findUnique({
    where: { pairId_weekNumber: { pairId, weekNumber } },
    select: { completedAt: true },
  });
  if (existing?.completedAt) {
    return { action: 'skipped-already-registered', overallScore: null };
  }

  const scores = await prisma.missionScore.findMany({
    where: { pairId, mission: { week: { weekNumber } } },
    select: { score: true, details: true },
  });
  if (scores.length === 0) {
    return { action: 'skipped-no-scores', overallScore: null };
  }

  const inputs: ScoreRowInput[] = scores.map((s) => ({ score: s.score, details: s.details }));
  const agg = aggregateMissionScores(inputs);
  const completedCount = scores.filter(
    (s) => (asRecord(s.details)?.status) === 'complete',
  ).length;
  const totalTasks = getWeekConfig(weekNumber)?.tasks.length ?? completedCount;
  const wordsWritten = sumWordsWritten(inputs);
  const targetWordsHit = countTargetWordsHit(inputs);

  // taskResults JSON catch-all — only include finite numbers (matches the
  // shift-result POST endpoint's payload shape).
  const taskResults: Record<string, number> = {};
  if (typeof agg.writingScore === 'number') taskResults.writingScore = agg.writingScore;
  if (typeof agg.overallScore === 'number') taskResults.overallScore = agg.overallScore;
  if (typeof targetWordsHit === 'number') taskResults.targetWordsHit = targetWordsHit;
  taskResults.wordsWritten = wordsWritten;

  // NOTE: concernScoreDelta is intentionally omitted from `data` so the UPDATE
  // branch never stomps a marker's recorded delta with 0; the live frontend
  // POST is the authority for concern. A freshly created row defaults to 0.
  const data = {
    documentsProcessed: completedCount,
    documentsTotal: totalTasks,
    errorsFound: agg.errorsFound,
    errorsTotal: agg.errorsTotal,
    vocabScore: agg.vocabAccuracy ?? 0,
    grammarAccuracy: agg.grammarAccuracy ?? 0,
    targetWordsUsed: wordsWritten,
    taskResults,
  };

  await prisma.shiftResult.upsert({
    where: { pairId_weekNumber: { pairId, weekNumber } },
    update: { ...data, completedAt },
    create: { pairId, weekNumber, ...data, completedAt },
  });

  return {
    action: existing ? 'updated-marker' : 'created',
    overallScore: agg.overallScore,
  };
}
