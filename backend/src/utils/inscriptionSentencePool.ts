// ─── Sentence pool for hybrid drill mode ─────────────────────────
//
// Each shift has a small library of in-world sentences that use
// TOEIC target words in context. The Inscription Pool drill pairs
// 2-3 individual-word warm-ups (existing behavior) with 4-5 sentences
// from this pool (new) so students practice TOEIC vocab BOTH in
// isolation (for spelling/recall) AND in context (for syntactic use).
//
// Sentences are in-world Party communiqués / official forms. Each is
// flagged with which target word it foregrounds — used by the picker
// to pair sentences with the same words shown in the warm-up rounds,
// reinforcing the just-practiced spelling in immediate context.
//
// CONTENT RULES:
//   - Lowercase throughout. Party communiqués use no caps for emphasis.
//   - 6–14 words. Long enough for syntactic shape, short enough to
//     type in 15–25 seconds.
//   - A2-B1 syntax. Single subject + finite verb + complement. Avoid
//     subordinate clauses with conjunctions students haven't met.
//   - Embed exactly one or two target words per sentence — preferably
//     the one named in `targetWord`.

export interface SentencePrompt {
  /** The sentence the student types. */
  sentence: string;
  /** Which target word this sentence foregrounds (lowercase, single word). */
  targetWord: string;
  /** Week the target word was introduced (for tier matching). */
  sourceWeek: number;
}

const SENTENCES_BY_WEEK: Record<number, SentencePrompt[]> = {
  // ─── Week 1 ─────────────────────────────────────────────────────
  // arrive · follow · check · report · submit · approve · describe ·
  // assign · standard · confirm
  1: [
    { sentence: 'all citizens shall arrive at the filing desk by 0700.',           targetWord: 'arrive',   sourceWeek: 1 },
    { sentence: 'the inspector will check the daily report.',                       targetWord: 'check',    sourceWeek: 1 },
    { sentence: 'submit your report to the supervisor before noon.',                targetWord: 'submit',   sourceWeek: 1 },
    { sentence: 'the supervisor must approve the form before filing.',              targetWord: 'approve',  sourceWeek: 1 },
    { sentence: 'follow the assigned procedure at all times.',                      targetWord: 'follow',   sourceWeek: 1 },
    { sentence: 'please confirm receipt of the standard memo.',                     targetWord: 'confirm',  sourceWeek: 1 },
    { sentence: 'describe the event in your own words and submit it.',              targetWord: 'describe', sourceWeek: 1 },
  ],

  // ─── Week 2 ─────────────────────────────────────────────────────
  // notice · compare · replace · update · request · remove · change ·
  // include · require · inform
  2: [
    { sentence: 'the new directive will replace the previous one.',                 targetWord: 'replace',  sourceWeek: 2 },
    { sentence: 'please compare the original record to the amended version.',       targetWord: 'compare',  sourceWeek: 2 },
    { sentence: 'all changes must be approved before they are filed.',              targetWord: 'change',   sourceWeek: 2 },
    { sentence: 'the office will inform you of the schedule update.',               targetWord: 'inform',   sourceWeek: 2 },
    { sentence: 'do not remove any document from the records wing.',                targetWord: 'remove',   sourceWeek: 2 },
    { sentence: 'include your citizen number on every form.',                       targetWord: 'include',  sourceWeek: 2 },
    { sentence: 'the supervisor will notice if you are late.',                      targetWord: 'notice',   sourceWeek: 2 },
  ],

  // ─── Week 3 ─────────────────────────────────────────────────────
  // process · complete · review · delay · schedule · respond ·
  // identify · separate · maintain · forward
  3: [
    { sentence: 'the team will process all submissions before friday.',             targetWord: 'process',  sourceWeek: 3 },
    { sentence: 'please complete your tasks before the shift ends.',                targetWord: 'complete', sourceWeek: 3 },
    { sentence: 'forward the document to the records office for review.',           targetWord: 'forward',  sourceWeek: 3 },
    { sentence: 'identify the citizen number on each form.',                        targetWord: 'identify', sourceWeek: 3 },
    { sentence: 'maintain the standard format throughout the report.',              targetWord: 'maintain', sourceWeek: 3 },
    { sentence: 'separate the approved forms from the pending ones.',               targetWord: 'separate', sourceWeek: 3 },
    { sentence: 'respond to the supervisor within one hour.',                       targetWord: 'respond',  sourceWeek: 3 },
  ],

  // ─── Week 4 ─────────────────────────────────────────────────────
  // arrange · collect · examine · indicate · locate · organize ·
  // present · record · select · verify
  4: [
    { sentence: 'examine every observation. verify the time. record the action.',   targetWord: 'examine',  sourceWeek: 4 },
    { sentence: 'organize the daily reports by sector and shift.',                  targetWord: 'organize', sourceWeek: 4 },
    { sentence: 'the associate must present a summary at the meeting.',             targetWord: 'present',  sourceWeek: 4 },
    { sentence: 'collect the records and arrange them by date.',                    targetWord: 'collect',  sourceWeek: 4 },
    { sentence: 'locate the missing form and verify its contents.',                 targetWord: 'locate',   sourceWeek: 4 },
    { sentence: 'select the priority case and indicate the next action.',           targetWord: 'select',   sourceWeek: 4 },
    { sentence: 'record the time of every observation in the daily log.',           targetWord: 'record',   sourceWeek: 4 },
  ],
};

/**
 * Pick `count` sentences from the pool, optionally preferring sentences
 * that foreground one of the `preferredWords` (so the warm-up word
 * appears in immediate context). Falls back to other sentences from the
 * same week, then to nearby weeks, if the preferred-word pool runs short.
 */
export function pickSentences(opts: {
  weekNumber: number;
  count: number;
  preferredWords?: string[];
}): SentencePrompt[] {
  const { weekNumber, count, preferredWords = [] } = opts;
  if (count <= 0) return [];

  const wantedLower = new Set(preferredWords.map((w) => w.toLowerCase()));
  const currentPool = SENTENCES_BY_WEEK[weekNumber] ?? [];
  const picked: SentencePrompt[] = [];
  const usedSentences = new Set<string>();

  const consume = (s: SentencePrompt) => {
    if (picked.length >= count) return;
    if (usedSentences.has(s.sentence)) return;
    picked.push(s);
    usedSentences.add(s.sentence);
  };

  // 1. Preferred-word sentences from the current week
  for (const s of shuffleCopy(currentPool)) {
    if (picked.length >= count) break;
    if (wantedLower.has(s.targetWord.toLowerCase())) consume(s);
  }

  // 2. Any other sentences from the current week
  for (const s of shuffleCopy(currentPool)) {
    if (picked.length >= count) break;
    consume(s);
  }

  // 3. Spill into the prior week if still short
  if (picked.length < count) {
    const fallbackPool = SENTENCES_BY_WEEK[weekNumber - 1] ?? [];
    for (const s of shuffleCopy(fallbackPool)) {
      if (picked.length >= count) break;
      consume(s);
    }
  }

  return picked;
}

function shuffleCopy<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
