// ─── Harmony Verdict Posts (Phase D — Junior Compliance Reviewer) ──────────
//
// Hand-authored "pending review" feed posts the student verdicts inline:
// Approve (compliant) or Flag (cite a Party regulation + tap the unapproved
// word + pick the Party-approved replacement). The censor mechanic is the
// surface; cumulative TOEIC vocab + register review is the engine.
//
// Posts span the political spectrum so the board feels alive:
//   • PRAISE  → Approve. Compliant, target-word-rich, collective "we" voice.
//   • FAULT   → Flag. A mild grumble / unapproved word.
//   • CONDEMN → Flag. Open dissent against the Ministry (generic citizen anger).
//
// Three flag rules, each a tap-a-word + replace-with-a-chip move:
//   reg_14c          (W1+) casual word → approved TOEIC target word
//   conduct_s1       (W2+) "I/me/my" → collective "we/us/our"
//   conduct_sentiment(W1+) negative word → Party-approved euphemism. The
//                          euphemism INVERTS reality on purpose ("erased" →
//                          "reassigned") — that satire is the dystopia, and it
//                          teaches Party register vocab.
//
// Inserted as `postType: 'feed_review'` (a feed type, NOT a censure-queue type)
// with the verdict packet in the post's `censureData` JSON — NO schema change.

export type VerdictRule = 'reg_14c' | 'conduct_s1' | 'conduct_sentiment';

export interface VerdictViolation {
  rule: VerdictRule;
  /** The single unapproved word the student must tap inside the post text. */
  forbiddenWord: string;
  /** The Party-approved word the student must pick from the chip bank. */
  approvedWord: string;
  /** Replacement chips shown in the flag modal — includes approvedWord. */
  options: string[];
  /** Shift the approved word was introduced (for the PEARL correction line). */
  weekApproved?: number;
}

export interface VerdictPost {
  authorLabel: string;
  content: string;
  weekNumber: number;
  correctVerdict: 'approve' | 'flag';
  /** Empty for clean (approve) posts. */
  violations: VerdictViolation[];
}

export const VERDICT_FEED_POSTS: Record<number, VerdictPost[]> = {
  // ── Week 1 — Regulation 14-C + Approved Sentiment ───────────────────────
  1: [
    {
      authorLabel: 'Citizen-2207',
      content: 'We arrive on time and submit every report by the standard deadline. The Ministry confirms our service with care.',
      weekNumber: 1,
      correctVerdict: 'approve',
      violations: [],
    },
    {
      authorLabel: 'Citizen-2290',
      content: 'We follow the approved routine and check every document twice. Clarity protects us all.',
      weekNumber: 1,
      correctVerdict: 'approve',
      violations: [],
    },
    {
      authorLabel: 'Citizen-2318',
      content: 'We must give the weekly report to Personnel Division before noon.',
      weekNumber: 1,
      correctVerdict: 'flag',
      violations: [
        { rule: 'reg_14c', forbiddenWord: 'give', approvedWord: 'submit', options: ['submit', 'report', 'confirm'], weekApproved: 1 },
      ],
    },
    {
      authorLabel: 'Citizen-2451',
      content: 'Please tell the schedule change to every associate in Block 7.',
      weekNumber: 1,
      correctVerdict: 'flag',
      violations: [
        { rule: 'reg_14c', forbiddenWord: 'tell', approvedWord: 'report', options: ['report', 'submit', 'approve'], weekApproved: 1 },
      ],
    },
    {
      authorLabel: 'Citizen-2566',
      content: 'Filing Desk 2 was a mess and the wait was terrible this morning.',
      weekNumber: 1,
      correctVerdict: 'flag',
      violations: [
        { rule: 'conduct_sentiment', forbiddenWord: 'terrible', approvedWord: 'standard', options: ['standard', 'approved', 'confirmed'], weekApproved: 1 },
      ],
    },
    {
      authorLabel: 'Citizen-2684',
      content: 'The Ministry hides the truth from every citizen.',
      weekNumber: 1,
      correctVerdict: 'flag',
      violations: [
        { rule: 'conduct_sentiment', forbiddenWord: 'hides', approvedWord: 'describes', options: ['describes', 'reports', 'confirms'], weekApproved: 1 },
      ],
    },
  ],

  // ── Week 2 — + Conduct Code §1 (collective voice: I → we) ───────────────
  2: [
    {
      authorLabel: 'Citizen-3104',
      content: 'We noticed the updated schedule and informed the new associates. We will compare the records tomorrow.',
      weekNumber: 2,
      correctVerdict: 'approve',
      violations: [],
    },
    {
      authorLabel: 'Citizen-3221',
      content: 'We compared the two records and removed the duplicate. Everything is in order.',
      weekNumber: 2,
      correctVerdict: 'approve',
      violations: [],
    },
    {
      authorLabel: 'Citizen-3377',
      content: 'Please tell the supervisor about the schedule delay before 14:00.',
      weekNumber: 2,
      correctVerdict: 'flag',
      violations: [
        { rule: 'reg_14c', forbiddenWord: 'tell', approvedWord: 'inform', options: ['inform', 'update', 'request'], weekApproved: 2 },
      ],
    },
    {
      authorLabel: 'Citizen-3260',
      content: 'I requested the new forms and updated the records before the morning briefing.',
      weekNumber: 2,
      correctVerdict: 'flag',
      violations: [
        { rule: 'conduct_s1', forbiddenWord: 'I', approvedWord: 'We', options: ['We', 'They', 'You'], weekApproved: 2 },
      ],
    },
    {
      authorLabel: 'Citizen-3495',
      content: 'The constant rule changes are frustrating and make no sense.',
      weekNumber: 2,
      correctVerdict: 'flag',
      violations: [
        { rule: 'conduct_sentiment', forbiddenWord: 'frustrating', approvedWord: 'necessary', options: ['necessary', 'approved', 'standard'], weekApproved: 2 },
      ],
    },
    {
      authorLabel: 'Citizen-3612',
      content: 'The Ministry controls everyone and punishes anyone who complains.',
      weekNumber: 2,
      correctVerdict: 'flag',
      violations: [
        { rule: 'conduct_sentiment', forbiddenWord: 'punishes', approvedWord: 'guides', options: ['guides', 'informs', 'supports'], weekApproved: 2 },
      ],
    },
  ],

  // ── Week 3 — Reg 14-C + Conduct §1 + Approved Sentiment, cumulative vocab ─
  3: [
    {
      authorLabel: 'Citizen-4102',
      content: 'We completed the review and forwarded the file to Records. We will respond to the request tomorrow.',
      weekNumber: 3,
      correctVerdict: 'approve',
      violations: [],
    },
    {
      authorLabel: 'Citizen-4231',
      content: 'We must finish the monthly report before the compliance audit.',
      weekNumber: 3,
      correctVerdict: 'flag',
      violations: [
        { rule: 'reg_14c', forbiddenWord: 'finish', approvedWord: 'complete', options: ['complete', 'process', 'review'], weekApproved: 3 },
      ],
    },
    {
      authorLabel: 'Citizen-4490',
      content: 'We should send the file to the Records Wing for processing.',
      weekNumber: 3,
      correctVerdict: 'flag',
      violations: [
        { rule: 'reg_14c', forbiddenWord: 'send', approvedWord: 'forward', options: ['forward', 'process', 'separate'], weekApproved: 3 },
      ],
    },
    {
      authorLabel: 'Citizen-4358',
      content: 'I reviewed the schedule and identified two errors before the briefing.',
      weekNumber: 3,
      correctVerdict: 'flag',
      violations: [
        { rule: 'conduct_s1', forbiddenWord: 'I', approvedWord: 'We', options: ['We', 'They', 'You'], weekApproved: 2 },
      ],
    },
    {
      authorLabel: 'Citizen-4477',
      content: 'The endless delays are exhausting and nobody fixes anything.',
      weekNumber: 3,
      correctVerdict: 'flag',
      violations: [
        { rule: 'conduct_sentiment', forbiddenWord: 'exhausting', approvedWord: 'necessary', options: ['necessary', 'scheduled', 'approved'], weekApproved: 3 },
      ],
    },
    {
      authorLabel: 'Citizen-4593',
      content: 'The Ministry erased a citizen from the directory and calls it normal.',
      weekNumber: 3,
      correctVerdict: 'flag',
      violations: [
        { rule: 'conduct_sentiment', forbiddenWord: 'erased', approvedWord: 'reassigned', options: ['reassigned', 'scheduled', 'processed'], weekApproved: 3 },
      ],
    },
  ],
};

/** Human-readable regulation labels (shared shape with the frontend rule picker). */
export const VERDICT_RULE_LABEL: Record<VerdictRule, string> = {
  reg_14c: 'Regulation 14-C — Approved Vocabulary',
  conduct_s1: 'Conduct Code §1 — Collective Voice',
  conduct_sentiment: 'Conduct Code §5 — Approved Sentiment',
};
