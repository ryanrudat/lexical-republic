// ─── Citizen-4488 Closing Snippets ───────────────────────────────
//
// Mirrors the weekly Citizen-4488 posts from
// backend/src/data/harmonyFeed.ts so the ShiftClosing screen can
// show a Case File Update card without an extra API round trip.
// Keep this list in sync with the backend seed when new weeks ship.

export interface Citizen4488ClosingPost {
  weekNumber: number;
  title: string;
  excerpt: string;
}

export const CITIZEN_4488_CLOSING_POSTS: Citizen4488ClosingPost[] = [
  {
    weekNumber: 1,
    title: 'Citizen-4488 — Week 1 community post',
    excerpt:
      "My neighbor kept herbs on her windowsill and a small gray cat. She always arrive at the standard time for Tuesday calligraphy. Her chair was empty this week. The herbs are dying. The cat still waits by her door. I should not worry.",
  },
  {
    weekNumber: 2,
    title: 'Citizen-4488 — Week 2 community post',
    excerpt:
      "I noticed the community center updated its schedule. Tuesday calligraphy was removed. My neighbor used to attend — her ink stones are still on the shelf. I requested information but heard nothing. The cat follows me home now. Everything is fine.",
  },
  {
    weekNumber: 3,
    title: 'Citizen-4488 — Week 3 community post',
    excerpt:
      "The schedule was updated again. Thursday activities also removed. I cannot identify who approved these changes. My neighbor's cat sleeps at my door now. I completed the adoption form but no one has responded. Everything is fine.",
  },
];

export function getCitizen4488PostForWeek(
  weekNumber: number,
): Citizen4488ClosingPost | null {
  return CITIZEN_4488_CLOSING_POSTS.find(p => p.weekNumber === weekNumber) ?? null;
}
