// ─── Harmony Verdict Posts (Phase D — Junior Compliance Reviewer) ──────────
//
// Hand-authored "pending review" feed posts the student verdicts inline:
// Approve (clean) or Flag (cite a Party regulation + tap the unapproved word +
// pick the Party-approved replacement). The censor mechanic is the surface;
// cumulative TOEIC vocab + register review is the engine.
//
// These are inserted as `postType: 'feed_review'` posts (a feed type, NOT a
// censure-queue type) with the verdict packet stored in the post's `censureData`
// JSON column — so NO schema migration is required. `postType` is a plain String
// in Prisma. See Dplan/Harmony_Updated.md §1-4, §13.
//
// Rule scope (v1): reg_14c (W1+) and conduct_s1 we/us (W2+). Both fit the
// tap-a-word + replace-with-a-chip flow. Conduct Code §2 (declarative form) is a
// sentence-rewrite interaction and is deferred.

export type VerdictRule = 'reg_14c' | 'conduct_s1';

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
  // ── Week 1 — Regulation 14-C only ──────────────────────────────────────
  1: [
    {
      authorLabel: 'Citizen-2207',
      content: 'We arrive at Filing Hall on time and submit every report by the standard deadline. The Ministry confirms our service.',
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
      authorLabel: 'Citizen-3260',
      content: 'I requested the new forms and updated the records before the morning briefing.',
      weekNumber: 2,
      correctVerdict: 'flag',
      violations: [
        { rule: 'conduct_s1', forbiddenWord: 'I', approvedWord: 'We', options: ['We', 'They', 'You'], weekApproved: 2 },
      ],
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
      authorLabel: 'Citizen-3489',
      content: 'I will compare the two records and remove the duplicate before noon.',
      weekNumber: 2,
      correctVerdict: 'flag',
      violations: [
        { rule: 'conduct_s1', forbiddenWord: 'I', approvedWord: 'We', options: ['We', 'They', 'You'], weekApproved: 2 },
      ],
    },
  ],

  // ── Week 3 — Reg 14-C + Conduct Code §1, cumulative vocab ───────────────
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
      authorLabel: 'Citizen-4358',
      content: 'I reviewed the schedule and identified two errors before the briefing.',
      weekNumber: 3,
      correctVerdict: 'flag',
      violations: [
        { rule: 'conduct_s1', forbiddenWord: 'I', approvedWord: 'We', options: ['We', 'They', 'You'], weekApproved: 2 },
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
  ],
};

/** Human-readable regulation labels (shared shape with the frontend rule picker). */
export const VERDICT_RULE_LABEL: Record<VerdictRule, string> = {
  reg_14c: 'Regulation 14-C — Approved Vocabulary',
  conduct_s1: 'Conduct Code §1 — Collective Voice',
};
