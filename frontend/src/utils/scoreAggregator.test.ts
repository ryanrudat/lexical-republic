import { describe, it, expect } from 'vitest';
import { aggregateTaskResults, countTargetWordsHit } from './scoreAggregator';
import type { TaskResultDetails } from '../types/taskResult';

// Helper: build a canonical result entry inline.
function task(
  score: number,
  details: TaskResultDetails,
) {
  return { score, details };
}

describe('aggregateTaskResults', () => {
  it('returns all null categories when no tasks were completed', () => {
    const result = aggregateTaskResults([]);
    expect(result.vocabAccuracy).toBeNull();
    expect(result.grammarAccuracy).toBeNull();
    expect(result.writingScore).toBeNull();
    expect(result.overallScore).toBeNull();
    expect(result.errorsFound).toBe(0);
    expect(result.errorsTotal).toBe(0);
  });

  it('averages a single vocab task correctly', () => {
    const result = aggregateTaskResults([
      task(0.8, {
        taskType: 'word_match',
        itemsCorrect: 8,
        itemsTotal: 10,
        category: 'vocab',
      }),
    ]);
    expect(result.vocabAccuracy).toBeCloseTo(0.8);
    expect(result.grammarAccuracy).toBeNull();
    expect(result.writingScore).toBeNull();
  });

  it('weights vocab tasks by item count when multiple are present', () => {
    // A 10-item task at 50% and a 2-item task at 100% should give 12 correct
    // out of 12 total = 6/12 = 0.5 (since 5+2 correct out of 10+2 = 7/12 ≈ 0.583).
    const result = aggregateTaskResults([
      task(0.5, {
        taskType: 'vocab_clearance',
        itemsCorrect: 5,
        itemsTotal: 10,
        category: 'vocab',
      }),
      task(1.0, {
        taskType: 'word_match',
        itemsCorrect: 2,
        itemsTotal: 2,
        category: 'vocab',
      }),
    ]);
    expect(result.vocabAccuracy).toBeCloseTo(7 / 12);
  });

  it('buckets grammar-category results separately from vocab', () => {
    const result = aggregateTaskResults([
      task(1, {
        taskType: 'word_match',
        itemsCorrect: 5,
        itemsTotal: 5,
        category: 'vocab',
      }),
      task(0.75, {
        taskType: 'contradiction_report',
        itemsCorrect: 3,
        itemsTotal: 4,
        category: 'grammar',
        errorsFound: 3,
        errorsTotal: 4,
      }),
    ]);
    expect(result.vocabAccuracy).toBeCloseTo(1.0);
    expect(result.grammarAccuracy).toBeCloseTo(0.75);
    expect(result.errorsFound).toBe(3);
    expect(result.errorsTotal).toBe(4);
  });

  it('averages writing category using raw score, not item counts', () => {
    const result = aggregateTaskResults([
      task(1, {
        taskType: 'shift_report',
        itemsCorrect: 1,
        itemsTotal: 1,
        category: 'writing',
        wordCount: 45,
      }),
    ]);
    expect(result.writingScore).toBe(1);
    expect(result.vocabAccuracy).toBeNull();
    expect(result.grammarAccuracy).toBeNull();
  });

  it('sums errorsFound and errorsTotal across multiple document tasks', () => {
    const result = aggregateTaskResults([
      task(0.8, {
        taskType: 'document_review',
        itemsCorrect: 4,
        itemsTotal: 5,
        category: 'grammar',
        errorsFound: 4,
        errorsTotal: 5,
      }),
      task(0.5, {
        taskType: 'document_review',
        itemsCorrect: 1,
        itemsTotal: 2,
        category: 'grammar',
        errorsFound: 1,
        errorsTotal: 2,
      }),
    ]);
    expect(result.errorsFound).toBe(5);
    expect(result.errorsTotal).toBe(7);
    // (4+1) / (5+2) = 5/7
    expect(result.grammarAccuracy).toBeCloseTo(5 / 7);
  });

  it('returns null for categories with no tasks instead of defaulting to completedTasks/totalTasks', () => {
    // Only writing task provided — vocab and grammar must be null, NOT
    // something like 1.0 from "everything complete" or "total tasks" fallback.
    const result = aggregateTaskResults([
      task(1, {
        taskType: 'shift_report',
        itemsCorrect: 1,
        itemsTotal: 1,
        category: 'writing',
      }),
    ]);
    expect(result.vocabAccuracy).toBeNull();
    expect(result.grammarAccuracy).toBeNull();
    expect(result.writingScore).toBe(1);
  });

  it('treats category="mixed" as contributing to grammar accuracy', () => {
    const result = aggregateTaskResults([
      task(0.5, {
        taskType: 'priority_sort',
        itemsCorrect: 1,
        itemsTotal: 2,
        category: 'mixed',
      }),
      task(1, {
        taskType: 'contradiction_report',
        itemsCorrect: 2,
        itemsTotal: 2,
        category: 'grammar',
      }),
    ]);
    // (1 mixed + 2 grammar correct) / (2 mixed + 2 grammar total) = 3/4
    expect(result.grammarAccuracy).toBeCloseTo(0.75);
    expect(result.vocabAccuracy).toBeNull();
  });

  it('excludes skipped tasks from the averages but does not crash', () => {
    const result = aggregateTaskResults([
      task(0.9, {
        taskType: 'word_match',
        itemsCorrect: 9,
        itemsTotal: 10,
        category: 'vocab',
      }),
      task(0, {
        taskType: 'vocab_clearance',
        itemsCorrect: 0,
        itemsTotal: 0,
        category: 'vocab',
        skipped: true,
      }),
    ]);
    expect(result.vocabAccuracy).toBeCloseTo(0.9);
  });

  it('falls back to overall score for non-canonical details shapes without crashing', () => {
    // Simulates a legacy task that still passes old { correct, total } fields.
    const result = aggregateTaskResults([
      { score: 0.75, details: { correct: 3, total: 4 } as unknown as TaskResultDetails },
    ]);
    // Legacy shape has no category, so every bucket must be null...
    expect(result.vocabAccuracy).toBeNull();
    expect(result.grammarAccuracy).toBeNull();
    // ...but the overall score still reflects the raw score.
    expect(result.overallScore).toBeCloseTo(0.75);
  });

  it('combines all shift components from a typical Week 1 run', () => {
    // Simulates: intake_form + word_match + contradiction_report + document_review + shift_report
    const result = aggregateTaskResults([
      task(1, {
        taskType: 'intake_form',
        itemsCorrect: 1,
        itemsTotal: 1,
        category: 'mixed',
      }),
      task(0.9, {
        taskType: 'word_match',
        itemsCorrect: 9,
        itemsTotal: 10,
        category: 'vocab',
      }),
      task(0.75, {
        taskType: 'contradiction_report',
        itemsCorrect: 3,
        itemsTotal: 4,
        category: 'grammar',
        errorsFound: 3,
        errorsTotal: 4,
      }),
      task(0.8, {
        taskType: 'document_review',
        itemsCorrect: 4,
        itemsTotal: 5,
        category: 'grammar',
        errorsFound: 4,
        errorsTotal: 5,
      }),
      task(1, {
        taskType: 'shift_report',
        itemsCorrect: 1,
        itemsTotal: 1,
        category: 'writing',
      }),
    ]);
    expect(result.vocabAccuracy).toBeCloseTo(0.9);
    // grammar (3+4)=7 / (4+5)=9, mixed intake adds 1/1 => 8/10 = 0.8
    expect(result.grammarAccuracy).toBeCloseTo(0.8);
    expect(result.writingScore).toBe(1);
    expect(result.errorsFound).toBe(7);
    expect(result.errorsTotal).toBe(9);
  });
});

describe('countTargetWordsHit', () => {
  it('returns null when no task contributed a vocabUsed array', () => {
    expect(countTargetWordsHit([])).toBeNull();
    expect(
      countTargetWordsHit([
        task(0.8, {
          taskType: 'word_match',
          itemsCorrect: 8,
          itemsTotal: 10,
          category: 'vocab',
        }),
      ]),
    ).toBeNull();
  });

  it('returns the count from a single task with vocabUsed', () => {
    const result = countTargetWordsHit([
      task(1, {
        taskType: 'shift_report',
        itemsCorrect: 1,
        itemsTotal: 1,
        category: 'writing',
        vocabUsed: ['comply', 'approve'],
      }),
    ]);
    expect(result).toBe(2);
  });

  it('dedupes overlapping words across multiple tasks (case-insensitive)', () => {
    const result = countTargetWordsHit([
      task(1, {
        taskType: 'priority_briefing',
        itemsCorrect: 1,
        itemsTotal: 1,
        category: 'writing',
        vocabUsed: ['Comply', 'approve'],
      }),
      task(1, {
        taskType: 'shift_report',
        itemsCorrect: 1,
        itemsTotal: 1,
        category: 'writing',
        vocabUsed: ['comply', 'record'],
      }),
    ]);
    // Comply/comply merge; approve + record stay distinct => 3 unique.
    expect(result).toBe(3);
  });

  it('returns 0 when a task explicitly reports an empty vocabUsed array', () => {
    // Student submitted writing but hit zero target words — distinct from "no writing task at all".
    const result = countTargetWordsHit([
      task(0.5, {
        taskType: 'shift_report',
        itemsCorrect: 1,
        itemsTotal: 1,
        category: 'writing',
        vocabUsed: [],
      }),
    ]);
    expect(result).toBe(0);
  });
});
