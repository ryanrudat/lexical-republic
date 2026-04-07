/**
 * Static PEARL Wellness Tips — 1 per week for weeks 1-3.
 * Grammar rules disguised as Ministry communication policy.
 * Each tip matches the week's grammarTarget.
 */

export interface StaticPearlTip {
  id: string;
  weekNumber: number;
  authorLabel: string;
  content: string;
  tipNumber: number;
  grammarTarget: string;
  pearlNote: string | null;
}

export const STATIC_PEARL_TIPS: Record<number, StaticPearlTip[]> = {
  // ── Week 1: grammarTarget = 'present-simple' ──
  1: [
    {
      id: 'pearl-tip-w1',
      weekNumber: 1,
      authorLabel: 'P.E.A.R.L.',
      tipNumber: 1,
      grammarTarget: 'present-simple',
      content: 'P.E.A.R.L. COMMUNICATION TIP #1\n\nApproved sentence structure reminder: When describing a single citizen\'s actions, the verb requires an "-s" ending. Example: "The associate checks the queue." When describing your own actions or multiple citizens, no "-s" is needed: "I check the queue." "The associates check the queue." Correct verb forms demonstrate linguistic compliance.',
      pearlNote: null,
    },
  ],

  // ── Week 2: grammarTarget = 'past-simple-vs-present' ──
  2: [
    {
      id: 'pearl-tip-w2',
      weekNumber: 2,
      authorLabel: 'P.E.A.R.L.',
      tipNumber: 2,
      grammarTarget: 'past-simple-vs-present',
      content: 'P.E.A.R.L. COMMUNICATION TIP #2\n\nApproved tense guidance: When referencing events from previous shifts, the approved verb form changes to past tense. "Yesterday I noticed the change" (past). "Today I notice the update" (present). Mixing tenses in official communications may trigger a clarity review. Maintain temporal accuracy in all reports.',
      pearlNote: null,
    },
  ],

  // ── Week 3: grammarTarget = 'modals' ──
  3: [
    {
      id: 'pearl-tip-w3',
      weekNumber: 3,
      authorLabel: 'P.E.A.R.L.',
      tipNumber: 3,
      grammarTarget: 'modals',
      content: 'P.E.A.R.L. COMMUNICATION TIP #3\n\nApproved modal usage: After approved modal words (should, must, can, may), the base verb form is required. "Associates should complete their queue" — not "should completes." "Citizens must maintain their schedule" — not "must maintains." Modal compliance reflects institutional awareness.',
      pearlNote: null,
    },
  ],
};
