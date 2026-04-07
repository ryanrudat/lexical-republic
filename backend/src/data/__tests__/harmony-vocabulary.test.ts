import { describe, it, expect } from 'vitest';
import { HARMONY_SEED_POSTS } from '../harmonyFeed';
import { getWeekConfig } from '../week-configs';
import { HARMONY_POST_MAX_LENGTH } from '../harmonyWorldBible';

/**
 * Vocabulary validation for Harmony seed posts.
 *
 * Ensures every static feed post contains enough target words
 * from its week's WeekConfig, and that review words from prior
 * weeks are present where expected (spaced repetition).
 */

const MIN_TARGET_WORDS = 3;

/** Normalize a word for matching: lowercase, strip punctuation. */
function normalize(word: string): string {
  return word.toLowerCase().replace(/[^a-z]/g, '');
}

/** Check if a content string contains a word (handles inflected forms like "arrived", "arrives"). */
function contentContainsWord(content: string, word: string): boolean {
  const normalized = normalize(word);
  const contentLower = content.toLowerCase();
  // Match the word stem — handles common inflections (s, ed, ing, d)
  return new RegExp(`\\b${normalized}[seding]*\\b`, 'i').test(contentLower);
}

/** Get all target words for a given week. */
function getTargetWords(weekNumber: number): string[] {
  const config = getWeekConfig(weekNumber);
  return config?.targetWords ?? [];
}

/** Get review words (all prior weeks' target words). */
function getReviewWords(weekNumber: number): string[] {
  const words: string[] = [];
  for (let w = 1; w < weekNumber; w++) {
    words.push(...getTargetWords(w));
  }
  return words;
}

describe('Harmony seed post vocabulary coverage', () => {
  const feedPosts = HARMONY_SEED_POSTS.filter(p => !p.postType || p.postType === 'feed');

  for (const post of feedPosts) {
    describe(`${post.authorLabel} — Week ${post.weekNumber} (${post.id})`, () => {
      const targetWords = getTargetWords(post.weekNumber);

      it(`contains at least ${MIN_TARGET_WORDS} target words`, () => {
        const found = targetWords.filter(w => contentContainsWord(post.content, w));
        expect(
          found.length,
          `Post has ${found.length} target words (${found.join(', ')}). ` +
          `Expected at least ${MIN_TARGET_WORDS}. Missing: ${targetWords.filter(w => !found.includes(w)).join(', ')}`,
        ).toBeGreaterThanOrEqual(MIN_TARGET_WORDS);
      });

      it(`is within ${HARMONY_POST_MAX_LENGTH} characters`, () => {
        expect(
          post.content.length,
          `Post is ${post.content.length} chars (${post.content.length - HARMONY_POST_MAX_LENGTH} over limit)`,
        ).toBeLessThanOrEqual(HARMONY_POST_MAX_LENGTH);
      });
    });
  }

  // Week 2+ posts should recycle at least some review words
  describe('vocabulary recycling (spaced repetition)', () => {
    for (const post of feedPosts.filter(p => p.weekNumber >= 2)) {
      const reviewWords = getReviewWords(post.weekNumber);

      it(`${post.authorLabel} Week ${post.weekNumber} — contains review words from prior weeks`, () => {
        const found = reviewWords.filter(w => contentContainsWord(post.content, w));
        // Soft check: at least some Week 2+ posts should contain review words.
        // We track but don't fail on individual posts — the aggregate matters.
        // This test documents which posts recycle and which don't.
        if (found.length === 0) {
          console.warn(
            `  ⚠ ${post.authorLabel} (Week ${post.weekNumber}): no review words found. ` +
            `Consider adding 1-2 for spaced repetition.`,
          );
        }
      });
    }

    it('at least half of Week 2+ posts contain review words', () => {
      const week2Plus = feedPosts.filter(p => p.weekNumber >= 2);
      const postsWithReview = week2Plus.filter(post => {
        const reviewWords = getReviewWords(post.weekNumber);
        return reviewWords.some(w => contentContainsWord(post.content, w));
      });

      expect(
        postsWithReview.length,
        `Only ${postsWithReview.length}/${week2Plus.length} Week 2+ posts recycle review words. ` +
        `Posts with review: ${postsWithReview.map(p => p.authorLabel).join(', ')}`,
      ).toBeGreaterThanOrEqual(Math.ceil(week2Plus.length / 2));
    });
  });

  // All 10 target words should appear across the week's posts collectively
  describe('collective week coverage', () => {
    const weekNumbers = [...new Set(feedPosts.map(p => p.weekNumber))];

    for (const weekNum of weekNumbers) {
      it(`Week ${weekNum} — all 10 target words appear across posts`, () => {
        const weekPosts = feedPosts.filter(p => p.weekNumber === weekNum);
        const targetWords = getTargetWords(weekNum);
        const missing = targetWords.filter(
          word => !weekPosts.some(p => contentContainsWord(p.content, word)),
        );

        expect(
          missing,
          `Week ${weekNum} is missing these target words entirely: ${missing.join(', ')}`,
        ).toHaveLength(0);
      });
    }
  });
});
