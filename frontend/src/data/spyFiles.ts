// ─── W4 Spy Files — the optional snooping layer ──────────────────
//
// The student is an insider for the Unedited. While doing their Party
// shift they can VIEW off-limits Records Wing files freely (browsing is
// low-risk) — but EXTRACTING one (copying it into [ ].edited) is the
// crime PEARL watches for. Extraction rolls the dice (weighted by the
// file's `exposure`); if PEARL notices, the student must "pick a cover
// story" to talk their way out. Pass and the file transfers to Frey;
// fail and the extraction is blocked (Frey "goes dark" on that lead).
//
// The files are deliberately NOT dry forms. They ladder from the human
// cost (a confiscated photo, a last conversation) up to the machine
// itself (how they rewrite records, the removal quota) — so the deeper
// you dig, the more of the Party's inner workings you expose, and the
// riskier the extraction. All grounded in existing W4 narrative (9020,
// 4488). See Dplan/W4_Edited_App_Spy_Redesign.md.

export type Exposure = 'low' | 'medium' | 'high';

// What the file looks like — drives how the Records Wing renders it and
// signals variety to the student (a photo log reads nothing like a memo).
export type FileType = 'item' | 'transcript' | 'revision' | 'memo';

export interface CoverStoryOption {
  text: string;
  /** The one Party-plausible, deferential answer that gets you out. */
  correct: boolean;
}

export interface CoverStoryInterrogation {
  /** PEARL's sweet-menacing (Umbridge) question. */
  pearlPrompt: string;
  options: CoverStoryOption[];
  /** PEARL's delighted dismissal when the cover holds (extraction resumes). */
  passLine: string;
  /** PEARL's sweet menace when the cover fails (extraction blocked). */
  failLine: string;
}

// ─── Extraction activities ───────────────────────────────────────
// The language task you complete to exfiltrate a file (runs AFTER any PEARL
// interrogation, BEFORE the transfer). Forgiving — retry freely, no penalty.
// Currently just the Doublespeak Decoder; comprehension / listening / spot-
// edit variants will join this union as they're built.

export interface DecoderItem {
  /** The Party euphemism shown in the wheel's centre, e.g. "RECONCILIATION". */
  code: string;
  /** The hidden truth — the correct option to land under the pointer. */
  truth: string;
  /** Wheel options (must include `truth`); the first is the innocent "mask" trap. */
  options: string[];
  /** One-line reinforcement shown when the student locks the right answer. */
  note: string;
}

export interface DecoderActivity {
  type: 'decoder';
  /** Frey's framing line. */
  prompt: string;
  items: DecoderItem[];
  /** The de-euphemised text, shown as a reading payoff once all items are cracked. */
  plainText: string[];
}

// Read-the-meaning: a single inference question about what the file proves.
export interface ComprehensionActivity {
  type: 'comprehension';
  prompt: string;
  question: string;
  options: string[];
  correctIndex: number;
  note?: string;
}

// Clean-the-intercept: fill the gaps in a damaged recording. The browser
// voice reads `script` aloud (listening); also solvable from context (so a
// device with no speech never traps the student).
export interface ListeningBlank {
  index: number;
  answer: string;
}
export interface ListeningActivity {
  type: 'listening';
  prompt: string;
  /** Full text the browser voice reads aloud (the "recording"). */
  script: string;
  /** Text with {0},{1}… blanks and \n line breaks. */
  template: string;
  blanks: ListeningBlank[];
  wordBank: string[];
  note?: string;
}

// Spot-the-edit: compare original vs revised, select what the Party erased.
export interface SpotEditClaim {
  text: string;
  changed: boolean;
}
export interface SpotEditActivity {
  type: 'spot_edit';
  prompt: string;
  before: string[];
  after: string[];
  claims: SpotEditClaim[];
  note?: string;
}

export type ExtractionActivity =
  | DecoderActivity
  | ComprehensionActivity
  | ListeningActivity
  | SpotEditActivity;

export interface SnoopFile {
  id: string;
  weekNumber: number;
  /** Header title on the file. */
  title: string;
  /** Display tag for the file's TYPE, e.g. "CONFISCATED ITEM". */
  kind: string;
  fileType: FileType;
  /** How risky EXTRACTING this file is (shown up front — informed risk). */
  exposure: Exposure;
  /** Frey's whisper that points the student at this file. */
  freyHint: string;
  /** Document body lines (used by item / transcript / memo). */
  body: string[];
  /** Before/after panels — used only by the `revision` type. */
  revision?: { before: string[]; after: string[] };
  /** The one-line intel headline that transfers to Frey's channel. */
  intel: string;
  interrogation: CoverStoryInterrogation;
  /** Optional language task gating the extraction (e.g. the doublespeak decoder). */
  activity?: ExtractionActivity;
}

export interface ContrabandWord {
  word: string;
  ipa: string;
  definition: string;
  mandarin: string;
  /** Frey's one-line note on why the Party erased it. */
  freyLine: string;
}

// Chance PEARL CATCHES the student mid-EXTRACTION, by file exposure. The
// student is told the exposure level up front (informed risk) — the
// outcome stays hidden (the suspense). Justified in-world: the [ ].edited
// app itself proves PEARL has blind spots, so sometimes the copy slips by.
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
export const FREY_INTRO: string[] = [
  'citizen. you found this.',
  "they don't know it's here. that's the point.",
  '',
  'you sit where we cannot. you read what they erase.',
  'so read it. and when you can, send it to me.',
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
// Laddered: human cost (low/medium risk) → the machine (high risk).
export const W4_SNOOP_FILES: SnoopFile[] = [
  // 1. CONFISCATED ITEM — the human cost. 9020 was a parent with a life.
  {
    id: '9020_photo',
    weekNumber: 4,
    title: 'EVIDENCE LOG — BLOCK 7, UNIT 9020',
    kind: 'CONFISCATED ITEM',
    fileType: 'item',
    exposure: 'low',
    freyHint: "they emptied 9020's room. see what they kept.",
    body: [
      'Recovered from Unit 9020:',
      '',
      'One photograph. Two adults, one child. A lake.',
      'On the back, in pen: "Tuesday. She laughed."',
      '',
      'One paper bird, folded by hand.',
      '',
      'DISPOSITION: incinerate.',
    ],
    intel: '9020 had a child, and someone he loved. they are burning the only proof he existed.',
    interrogation: {
      pearlPrompt:
        'Sorting old evidence, Citizen? ☺ Such sentimental clutter. Why would you copy it?',
      options: [
        { text: 'I am cataloguing the items for disposal, Madam.', correct: true },
        { text: 'Someone should remember this family.', correct: false },
        { text: 'I want to know who the child was.', correct: false },
        { text: 'No reason. It caught my eye.', correct: false },
      ],
      passLine: 'How tidy of you. ☺ See that it is incinerated properly.',
      failLine: "Sentiment is a kind of illness, Citizen. ☺ I'll withdraw this — and note it.",
    },
    activity: {
      type: 'comprehension',
      prompt: "you can't take the photo. but tell me what it proves.",
      question: 'Why is this photograph dangerous to the Party?',
      options: [
        'It proves Citizen-9020 had a relative — a family.',
        'It shows he broke a rule at the lake.',
        'The photograph is poor quality.',
        'It was filed in the wrong unit.',
      ],
      correctIndex: 0,
      note: 'a man with a family is harder to erase. that is why they burn it.',
    },
  },

  // 2. SURVEILLANCE TRANSCRIPT — the last exchange; 4488 is holding something.
  {
    id: '9020_transcript',
    weekNumber: 4,
    title: 'AUDIO LOG — BLOCK 7 STAIRWELL — 17:28',
    kind: 'SURVEILLANCE TRANSCRIPT',
    fileType: 'transcript',
    exposure: 'medium',
    freyHint: 'the last two minutes before they took 9020. listen.',
    body: [
      '17:28 — two voices, Block 7 stairwell.',
      '',
      '9020: "Did you keep it?"',
      '4488: "Keep what?"',
      '9020: "You know what. If they take me, it has to live somewhere."',
      '4488: "...I kept it."',
      '9020: "Then it wasn\'t for nothing."',
      '',
      '17:30 — 9020 reassigned. Recording sealed.',
    ],
    intel: '9020 gave something to 4488 to hide — two minutes before they took him. 4488 still has it.',
    interrogation: {
      pearlPrompt:
        'An old stairwell recording? ☺ Whatever are you listening for, Citizen?',
      options: [
        { text: 'Verifying the reassignment timestamp, Madam.', correct: true },
        { text: 'I want to know what 9020 hid.', correct: false },
        { text: 'These two were friends. It is sad.', correct: false },
        { text: 'Just curious who was speaking.', correct: false },
      ],
      passLine: 'Timestamps. ☺ So dependable of you. Off you go.',
      failLine: "Curiosity again, Citizen. ☺ I'll seal this tighter — and remember that you asked.",
    },
    activity: {
      type: 'listening',
      prompt: 'the recording is damaged. play it, then restore what they said.',
      script: 'Did you keep it? Keep what? You know what. If they take me, it has to live somewhere. I kept it.',
      template:
        '9020: did you {0} it?\n4488: keep what?\n9020: if they take me, it has to {1} somewhere.\n4488: i {2} it.',
      blanks: [
        { index: 0, answer: 'keep' },
        { index: 1, answer: 'live' },
        { index: 2, answer: 'kept' },
      ],
      wordBank: ['keep', 'live', 'kept', 'hide', 'leave'],
      note: '9020 hid something with 4488 before they took him.',
    },
  },

  // 3. REVISION RECORD — how they rewrite reality. Before/after two-panel.
  {
    id: '9020_revision',
    weekNumber: 4,
    title: 'RECORD ADJUSTMENT — CITIZEN-9020',
    kind: 'REVISION RECORD',
    fileType: 'revision',
    exposure: 'medium',
    freyHint: 'this is how they erase a person — before, and after.',
    body: ['Adjustment applied this cycle.'],
    revision: {
      before: [
        '"Citizen-9020 attended the Block 7 assembly.',
        'He asked why the lists keep growing.',
        'He was heard. He was real."',
      ],
      after: [
        '"No assembly occurred in Block 7.',
        'No such question was raised.',
        'Citizen-9020: no surviving record."',
      ],
    },
    intel: "they don't just remove people — they rewrite the record so it never happened. i have the original.",
    interrogation: {
      pearlPrompt:
        'Comparing record versions, Citizen? ☺ The revised version is the correct one, you understand.',
      options: [
        { text: 'Confirming the revision was applied correctly, Madam.', correct: true },
        { text: 'The first version was the truth.', correct: false },
        { text: 'You changed what really happened.', correct: false },
        { text: 'Which one is real?', correct: false },
      ],
      passLine: 'The revised version is real, Citizen. ☺ It always was. Good work.',
      failLine: "Oh dear — confused about which version is true? ☺ We'll correct that. I'll note it.",
    },
    activity: {
      type: 'spot_edit',
      prompt: 'they rewrote this record. tap everything they erased.',
      before: [
        'Citizen-9020 attended the Block 7 assembly.',
        'He asked why the lists keep growing.',
        'He was heard. He was real.',
      ],
      after: [
        'No assembly occurred in Block 7.',
        'No such question was raised.',
        'Citizen-9020: no surviving record.',
      ],
      claims: [
        { text: 'That the assembly happened', changed: true },
        { text: 'That he asked about the growing lists', changed: true },
        { text: 'That Citizen-9020 existed at all', changed: true },
        { text: 'The date of the report', changed: false },
      ],
      note: 'they did not just remove him. they made it so he was never there.',
    },
  },

  // 4. INTERNAL MEMO — the machine laid bare. Highest extraction risk.
  {
    id: 'reconciliation_quota',
    weekNumber: 4,
    title: 'RECONCILIATION QUOTA — CYCLE 14',
    kind: 'INTERNAL — ARCHIVE CONTROL',
    fileType: 'memo',
    exposure: 'high',
    freyHint: 'the big one. how many people they erase is just a number on a form.',
    body: [
      'ARCHIVE CONTROL — INTERNAL. Not for citizen view.',
      '',
      'Reconciliation target this cycle: minimum 10 removals.',
      'Associates below target will be reviewed.',
      '',
      'Priority order: witnesses first, then relatives, then complainers.',
      'Remember: a citizen who is never mentioned was never here.',
    ],
    intel: 'erasing people is a quota — ten a week, minimum. witnesses go first. and they review the workers who miss the number.',
    interrogation: {
      pearlPrompt:
        'Oh, Citizen. ☺ That memo belongs to Archive Control. You should not see it at all. However did you reach it?',
      options: [
        { text: 'My clearance must have updated in error, Madam. Logging out now.', correct: true },
        { text: 'Ten people a week? That is monstrous.', correct: false },
        { text: 'The Unedited showed me the way in.', correct: false },
        { text: 'I will not repeat what it says.', correct: false },
      ],
      passLine: "A clearance error. ☺ How tiresome. I'll see it corrected. Run along.",
      failLine: "Now that is a worry, isn't it? ☺ I'll seal this — and watch your terminal closely.",
    },
    activity: {
      type: 'decoder',
      prompt: "the memo is in their language. spin to reveal what each word hides.",
      items: [
        {
          code: 'RECONCILIATION',
          truth: 'erasing people from the record',
          options: [
            'making two records agree',
            'erasing people from the record',
            'counting the weekly budget',
          ],
          note: "they call erasing a person 'reconciliation.'",
        },
        {
          code: 'REMOVALS',
          truth: 'citizens made to disappear',
          options: [
            'taking old items away',
            'citizens made to disappear',
            'deleting unused files',
          ],
          note: "every 'removal' on this form is a person.",
        },
        {
          code: 'REVIEWED',
          truth: 'punished',
          options: ['checked over', 'punished', 'promoted'],
          note: "a worker who misses the quota is 'reviewed.'",
        },
      ],
      plainText: [
        'in plain words:',
        'target — erase 10 people this cycle.',
        'witnesses first.',
        'workers who miss the number are punished.',
      ],
    },
  },
];

export function getSnoopFiles(weekNumber: number): SnoopFile[] {
  return W4_SNOOP_FILES.filter((f) => f.weekNumber === weekNumber);
}
