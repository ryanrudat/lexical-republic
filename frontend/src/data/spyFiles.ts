// ─── W4 Spy Files — the optional snooping layer ──────────────────
//
// The student is an insider for the Unedited. While doing their Party
// shift, they can choose to open OFF-LIMITS files in the Records Room.
// Each open is a gamble: PEARL might notice (a dice roll weighted by the
// file's `exposure`). If PEARL pounces, the student must "pick a cover
// story" — a short, deferential, Party-pleasing excuse. Pass and they
// keep the intel to funnel to Frey via [ ].edited; fail and the file is
// pulled (Frey "goes dark" on that lead).
//
// All four W4 files are grounded in EXISTING week4.ts content — we're
// surfacing the secret layer the shift already implies, not inventing
// new lore. See Dplan/W4_Edited_App_Spy_Redesign.md.

export type Exposure = 'low' | 'medium' | 'high';

export interface CoverStoryOption {
  text: string;
  /** The one Party-plausible, deferential answer that gets you out. */
  correct: boolean;
}

export interface CoverStoryInterrogation {
  /** PEARL's sweet-menacing (Umbridge) question. */
  pearlPrompt: string;
  options: CoverStoryOption[];
  /** PEARL's delighted dismissal when the cover holds. */
  passLine: string;
  /** PEARL's sweet menace when the cover fails. */
  failLine: string;
}

export interface SnoopFile {
  id: string;
  weekNumber: number;
  /** RESTRICTED header shown on the file. */
  title: string;
  classification: string;
  exposure: Exposure;
  /** Frey's whisper that points the student at this file. */
  freyHint: string;
  /** The sensitive document body the student reads, line by line. */
  body: string[];
  /** The one-line intel headline that gets funneled to Frey. */
  intel: string;
  interrogation: CoverStoryInterrogation;
}

export interface ContrabandWord {
  word: string;
  ipa: string;
  definition: string;
  mandarin: string;
  /** Frey's one-line note on why the Party erased it. */
  freyLine: string;
}

// Chance PEARL CATCHES the student, by file exposure. The student is told
// the exposure level up front (informed risk) — the outcome stays hidden
// (the suspense). Justified in-world: the [ ].edited app itself proves
// PEARL has blind spots, so sometimes you slip by unseen.
export const CATCH_PROBABILITY: Record<Exposure, number> = {
  low: 0.3,
  medium: 0.55,
  high: 0.8,
};

// The NarrativeChoice key a resolved snoop writes (value: 'funneled' | 'dark').
// Read at W5 start to branch the resistance story.
export function snoopChoiceKey(fileId: string): string {
  return `w4_snoop_${fileId}`;
}

// Frey's opening transmission — the recruitment pitch + the standing order.
// Shown at the top of the [ ].edited channel.
export const FREY_INTRO: string[] = [
  'citizen. you found this.',
  "they don't know it's here. that's the point.",
  '',
  'you sit where we cannot. you read what they erase.',
  'so read it. and tell me what they took.',
];

// ─── The contraband words ────────────────────────────────────────
// The 5 Black Words, framed as "the words they took" — Frey's smuggled
// vocabulary, NOT a Party dictionary. TOEIC B1; the L1 bridge for W4.
export const CONTRABAND_WORDS: ContrabandWord[] = [
  {
    word: 'witness',
    ipa: '/ˈwɪtnəs/',
    definition: 'a person who has seen something happen.',
    mandarin: '證人',
    freyLine: 'a witness remembers. that is why they remove them.',
  },
  {
    word: 'relative',
    ipa: '/ˈrɛlətɪv/',
    definition: 'a member of your family.',
    mandarin: '親屬',
    freyLine: 'they gave you a designation so you would forget you had a relative.',
  },
  {
    word: 'individual',
    ipa: '/ˌɪndɪˈvɪdʒuəl/',
    definition: 'a single person, separate from a group.',
    mandarin: '個人',
    freyLine: 'you are an individual. not a number. they prefer the number.',
  },
  {
    word: 'independent',
    ipa: '/ˌɪndɪˈpɛndənt/',
    definition: 'thinking for yourself; not controlled by someone else.',
    mandarin: '獨立',
    freyLine: 'an independent mind is the one thing they cannot reconcile.',
  },
  {
    word: 'private',
    ipa: '/ˈpraɪvət/',
    definition: 'personal; not shared with others.',
    mandarin: '私人',
    freyLine: 'nothing is private here. so we keep our own records.',
  },
];

// ─── The four W4 snoop files ─────────────────────────────────────
export const W4_SNOOP_FILES: SnoopFile[] = [
  // 1. 9020's reassignment — confirms the erased visitor was disappeared.
  {
    id: '9020_transfer',
    weekNumber: 4,
    title: 'PERSONNEL REASSIGNMENT — CITIZEN-9020',
    classification: 'RESTRICTED',
    exposure: 'medium',
    freyHint: 'you saw the name they pulled. now find out where he went.',
    body: [
      'SUBJECT: Citizen-9020',
      'STATUS: Reassigned — Sector [ ]',
      'EFFECTIVE: today, 16:00',
      '',
      'NOTE: The guest entry logged at 17:30 is in error.',
      'Citizen-9020 was reassigned before that time.',
      'All prior records are to be reconciled.',
      'Citizen-9020 has no surviving file.',
    ],
    intel: "they reassigned 9020 at 16:00 — an hour before he was 'seen' at 17:30. they are erasing him backwards.",
    interrogation: {
      pearlPrompt:
        "Oh — Citizen. ☺ Citizen-9020's file is sealed. Whatever drew your eye to a reassignment notice?",
      options: [
        { text: 'I was confirming the reassignment was filed correctly, Madam.', correct: true },
        { text: 'I wanted to know what happened to him.', correct: false },
        { text: 'Ivan told me to look.', correct: false },
        { text: 'I opened it by mistake.', correct: false },
      ],
      passLine: 'How conscientious. ☺ Do close it now — there is nothing there to keep.',
      failLine: "Hm. That is not quite an answer, is it? ☺ I'll have the file withdrawn. For your protection.",
    },
  },

  // 2. 4488's old informant report — the wheel: the informer is now the subject.
  {
    id: '4488_report',
    weekNumber: 4,
    title: 'PRIOR SUBMISSION — CITIZEN-4488 (INFORMANT)',
    classification: 'RESTRICTED',
    exposure: 'low',
    freyHint: "the citizen you're reconciling today — read what he did before.",
    body: [
      'INFORMANT: Citizen-4488',
      'RE: Neighbor, Block 7 — irregular schedule',
      '',
      'She arrived every Tuesday. Then she stopped coming.',
      'I reported the change, as instructed.',
      '',
      'OUTCOME: Subject removed from directory. Reassigned.',
      'Citizen-4488 was commended for his vigilance.',
    ],
    intel: '4488 informed on his own neighbor — and she was disappeared. now they are reconciling him. it is a wheel.',
    interrogation: {
      pearlPrompt:
        "Reviewing Citizen-4488's history, are we? ☺ For the report, I'm sure.",
      options: [
        { text: 'Yes, Madam — context ensures an accurate reconciliation.', correct: true },
        { text: 'I wanted to see if he had done anything wrong.', correct: false },
        { text: 'I feel sorry for his neighbor.', correct: false },
        { text: 'No reason. I was just curious.', correct: false },
      ],
      passLine: 'A thorough associate. ☺ The Party notices diligence like yours.',
      failLine: "Curiosity is such a restless habit, Citizen. ☺ Let me take that file before it troubles you.",
    },
  },

  // 3. The Archive's weekly deletion ledger — the scope of erasure (scanning task).
  {
    id: 'archive_list',
    weekNumber: 4,
    title: 'ARCHIVE CONTROL — WEEKLY RECONCILIATION LEDGER',
    classification: 'RESTRICTED // ARCHIVE EYES ONLY',
    exposure: 'high',
    freyHint: "this is the big one — the whole week's deletions. they watch this file closely.",
    body: [
      'Observations reclassified RESTRICTED this cycle:',
      '',
      'Citizen-9020 — guest entry — removed',
      'Citizen-3371 — correspondence — removed',
      'Citizen-0148 — assembly — removed',
      'Citizen-9020 — relative inquiry — removed',
      'Citizen-7756 — directory listing — removed',
      '',
      'Net record adjustments this cycle: 11',
    ],
    intel: 'eleven people were erased this week. and someone made a "relative inquiry" about 9020 — his family is looking for him.',
    interrogation: {
      pearlPrompt:
        "Oh, Citizen. ☺ That ledger belongs to Archive Control alone. You should not be able to see it at all. However did you find your way in?",
      options: [
        { text: 'My clearance must have updated in error, Madam. I will log out at once.', correct: true },
        { text: 'The Unedited showed me the way in.', correct: false },
        { text: 'I was looking for Citizen-9020.', correct: false },
        { text: "I won't tell anyone what I saw.", correct: false },
      ],
      passLine: 'A clearance error. ☺ How tiresome for you. I\'ll see it corrected. Off you go.',
      failLine: 'Now that is a worry, isn\'t it? ☺ I think we had best seal this one. And note the time.',
    },
  },

  // 4. 4488's pending flag — the darkest: he's next, for doing what YOU are doing.
  {
    id: '4488_pending',
    weekNumber: 4,
    title: 'RECONCILIATION FLAG — CITIZEN-4488 (PENDING)',
    classification: 'RESTRICTED',
    exposure: 'medium',
    freyHint: "you spent all day fixing his record. read the line at the bottom.",
    body: [
      'SUBJECT: Citizen-4488',
      'FLAG: Pending reassignment review',
      '',
      'REASON: Excessive inquiries into reclassified records.',
      'See: Records Wing access, 14:30.',
      '',
      'RECOMMENDATION: Reconcile current record. Issue reassignment after filing.',
      'The associate completing today\'s reconciliation is not to be informed.',
    ],
    intel: 'they are erasing 4488 next — for looking into reclassified records. for doing exactly what i am doing now. and they are using me to tidy him up first.',
    interrogation: {
      pearlPrompt:
        "That flag is for supervisor eyes, Citizen. ☺ Curious about your subject's future, are we?",
      options: [
        { text: 'I only need today\'s record, Madam. I will close it now.', correct: true },
        { text: 'Are you going to disappear him?', correct: false },
        { text: 'This is not right.', correct: false },
        { text: 'Will I be flagged too?', correct: false },
      ],
      passLine: 'Just today\'s record. ☺ That is the spirit. Eyes on your own work, Citizen.',
      failLine: 'Such questions, Citizen. ☺ I\'ll close this for you — and I\'ll remember that you asked.',
    },
  },
];

export function getSnoopFiles(weekNumber: number): SnoopFile[] {
  return W4_SNOOP_FILES.filter((f) => f.weekNumber === weekNumber);
}
