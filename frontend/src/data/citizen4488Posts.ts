// ─── Citizen-4488 Closing Snippets ───────────────────────────────
//
// Mirrors the weekly Citizen-4488 posts from
// backend/src/data/harmonyFeed.ts so the ShiftClosing screen can
// show a Case File Update card without an extra API round trip.
// Keep this list in sync with the backend seed when new weeks ship.
//
// Each week has a primary excerpt (the "anchor" narrative moment) and a
// secondary excerpt (a quieter/escalation post) so the arc is more catchable.
// `grammarWatchNote` is an observational language note — ambient, not preachy.

export interface Citizen4488ClosingPost {
  weekNumber: number;
  title: string;
  excerpt: string;
  secondaryExcerpt?: string;
  grammarWatchNote?: string;
}

export const CITIZEN_4488_CLOSING_POSTS: Citizen4488ClosingPost[] = [
  {
    weekNumber: 1,
    title: 'Citizen-4488 — Week 1 community posts',
    excerpt:
      "My neighbor kept herbs on her windowsill and a small gray cat. She always arrive at the standard time for Tuesday calligraphy. Her chair was empty this week. The herbs are dying. The cat still waits by her door. I should not worry.",
    secondaryExcerpt:
      "Tuesday quiet today. No calligraphy class assigned to my block. My neighbor's cat still sit on her step by the empty door. I bring water in the small dish. I follow the approved path back. I did not report this. It is standard.",
    grammarWatchNote:
      "Note the phrasing: \u201cshe always arrive\u201d and \u201ccat still sit.\u201d Approved writing uses \u201carrives\u201d and \u201csits.\u201d Small errors.",
  },
  {
    weekNumber: 2,
    title: 'Citizen-4488 — Week 2 community posts',
    excerpt:
      "I noticed the community center updated its schedule. Tuesday calligraphy was removed. My neighbor used to attend — her ink stones are still on the shelf. I requested information but heard nothing. The cat follows me home now. Everything is fine.",
    secondaryExcerpt:
      "I noticed — I mean, observed — a detail. The knitting circle replaced cream yarn with gray. My former neighbor used to attend. The supply list was updated. I changed my request. No one informed me. The cat follows standard routes now.",
    grammarWatchNote:
      "Last shift, Citizen-4488 wrote \u201carrive.\u201d This shift, every verb agrees. The writing has improved.",
  },
  {
    weekNumber: 3,
    title: 'Citizen-4488 — Week 3 community posts',
    excerpt:
      "The schedule was updated again. Thursday activities also removed. I cannot identify who approved these changes. My neighbor's cat sleeps at my door now. I completed the adoption form but no one has responded. Everything is fine.",
    secondaryExcerpt:
      "Thank you, Ministry, for the updated schedule. I have completed all required forms. My morning routine processes efficiently. I respond to every notice in the standard timeframe. I maintain my desk. I review each memo. Change is normal.",
    grammarWatchNote:
      "Three shifts in. The grammar is now perfect. The voice is different.",
  },
];

export function getCitizen4488PostForWeek(
  weekNumber: number,
): Citizen4488ClosingPost | null {
  return CITIZEN_4488_CLOSING_POSTS.find(p => p.weekNumber === weekNumber) ?? null;
}
