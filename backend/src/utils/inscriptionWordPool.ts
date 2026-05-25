import { prisma } from './prisma';
import { getWeekConfig } from '../data/week-configs';
import { getRouteWeeks } from '../data/narrative-routes';
import type { PoolStrategy } from './inscriptionConstants';
import { pickSentences } from './inscriptionSentencePool';

export interface InscriptionWord {
  word: string;
  /** English definition for prompt rendering (Lane 2/3). */
  definition: string;
  /** IPA phonetic notation. May be empty if missing in DictionaryWord. */
  phonetic: string;
  /** Mandarin gloss (Lane 1). May be null if missing. */
  translationZhTw: string | null;
  /** Example sentence — surfaced post-drill or via study card. */
  exampleSentence: string;
  /** Source week the word was introduced (for tier highlighting). */
  sourceWeek: number;
  /**
   * Optional sentence prompt. When present, the student types this full
   * sentence (which embeds `word`) instead of typing the word in isolation.
   * Hybrid drills produce a mix: first prompts are word-only (warm-up),
   * later prompts carry sentences using the same words.
   */
  sentence?: string;
}

interface PickWordsOpts {
  classId: string;
  weekNumber: number;
  count: number;
  pairId: string;
  poolStrategy: PoolStrategy;
}

/**
 * Pick TOEIC words for an inscription drill.
 *
 * Honors poolStrategy:
 *   current:    100% current-week targetWords
 *   recent:     60% current, 30% prior two route-weeks, 10% deeper
 *   cumulative: even distribution across all route-weeks ≤ current
 *
 * Anti-fatigue: skips words that the pair has mastered (100% correct)
 * across their last 3 completed drills.
 */
export async function pickInscriptionWords(opts: PickWordsOpts): Promise<InscriptionWord[]> {
  const { classId, weekNumber, count, pairId, poolStrategy } = opts;

  // 1. Resolve the narrative route to determine which prior weeks count
  const cls = await prisma.class.findUnique({
    where: { id: classId },
    select: { narrativeRoute: true },
  });
  const routeWeeks = getRouteWeeks(cls?.narrativeRoute ?? 'full');
  const routeIndex = routeWeeks.indexOf(weekNumber);
  const priorWeeks: number[] = routeIndex > 0 ? routeWeeks.slice(0, routeIndex) : [];
  const recentPrior: number[] = priorWeeks.slice(-2);
  const deeperPrior: number[] = priorWeeks.slice(0, -2);

  // 2. Resolve poolStrategy → per-tier counts
  let currentCount: number;
  let recentCount: number;
  let deeperCount: number;
  if (poolStrategy === 'current' || priorWeeks.length === 0) {
    currentCount = count;
    recentCount = 0;
    deeperCount = 0;
  } else if (poolStrategy === 'cumulative') {
    const totalWeeks = priorWeeks.length + 1;
    currentCount = Math.max(1, Math.round(count / totalWeeks));
    const remainder = count - currentCount;
    const splitForPriors = priorWeeks.length > 0 ? Math.floor(remainder / 2) : 0;
    recentCount = recentPrior.length > 0 ? splitForPriors : 0;
    deeperCount = remainder - recentCount;
  } else {
    // recent (default): 60 / 30 / 10
    currentCount = Math.round(count * 0.6);
    recentCount = recentPrior.length > 0 ? Math.round(count * 0.3) : 0;
    deeperCount = count - currentCount - recentCount;
    if (deeperPrior.length === 0) {
      currentCount += deeperCount;
      deeperCount = 0;
    }
  }

  // 3. Build TOEIC target words per tier from WeekConfig
  const currentTargets = wordsForWeek(weekNumber);
  const recentTargets = recentPrior.flatMap(wordsForWeek);
  const deeperTargets = deeperPrior.flatMap(wordsForWeek);

  // 4. Anti-fatigue: words the pair has 100% mastery in their last 3 drills.
  // Simpler proxy: skip words whose `mastery >= 0.95` in PairDictionaryProgress.
  const mastered = await prisma.pairDictionaryProgress.findMany({
    where: { pairId, mastery: { gte: 0.95 } },
    select: { word: { select: { word: true } } },
  });
  const masteredSet = new Set(
    mastered.map((m) => m.word.word.toLowerCase()).filter(Boolean),
  );

  const filterUnmastered = (words: string[]): string[] =>
    words.filter((w) => !masteredSet.has(w.toLowerCase()));

  // 5. Sample per tier — shuffle then take. If a tier runs short, spill over.
  const picked: { word: string; sourceWeek: number }[] = [];
  const usedWords = new Set<string>();

  const sampleFromTier = (
    pool: string[],
    weeks: number[],
    want: number,
  ) => {
    if (want <= 0 || pool.length === 0) return;
    const filtered = filterUnmastered(pool).filter((w) => !usedWords.has(w.toLowerCase()));
    shuffle(filtered);
    for (const w of filtered) {
      if (picked.length >= count) break;
      if (usedWords.has(w.toLowerCase())) continue;
      const sourceWeek = findSourceWeek(w, weeks) ?? weekNumber;
      picked.push({ word: w, sourceWeek });
      usedWords.add(w.toLowerCase());
      if (
        picked.filter((p) => weeks.includes(p.sourceWeek)).length >= want
      ) break;
    }
  };

  sampleFromTier(currentTargets, [weekNumber], currentCount);
  sampleFromTier(recentTargets, recentPrior, recentCount);
  sampleFromTier(deeperTargets, deeperPrior, deeperCount);

  // 6. Spill: if we're under quota, top up from any tier ignoring source quotas
  if (picked.length < count) {
    const allCandidates = [...currentTargets, ...recentTargets, ...deeperTargets];
    const fallbackPool = filterUnmastered(allCandidates).filter(
      (w) => !usedWords.has(w.toLowerCase()),
    );
    shuffle(fallbackPool);
    for (const w of fallbackPool) {
      if (picked.length >= count) break;
      const sourceWeek =
        findSourceWeek(w, [weekNumber, ...recentPrior, ...deeperPrior]) ?? weekNumber;
      picked.push({ word: w, sourceWeek });
      usedWords.add(w.toLowerCase());
    }
  }

  // 7. Last-ditch: relax anti-fatigue to fill quota
  if (picked.length < count) {
    const allCandidates = [...currentTargets, ...recentTargets, ...deeperTargets];
    const relaxed = allCandidates.filter((w) => !usedWords.has(w.toLowerCase()));
    shuffle(relaxed);
    for (const w of relaxed) {
      if (picked.length >= count) break;
      const sourceWeek =
        findSourceWeek(w, [weekNumber, ...recentPrior, ...deeperPrior]) ?? weekNumber;
      picked.push({ word: w, sourceWeek });
      usedWords.add(w.toLowerCase());
    }
  }

  // 8. Enrich with DictionaryWord data
  const wordStrings = picked.map((p) => p.word);
  const dictRows = await prisma.dictionaryWord.findMany({
    where: { word: { in: wordStrings } },
    select: {
      word: true,
      phonetic: true,
      definition: true,
      exampleSentence: true,
      translationZhTw: true,
    },
  });
  const dictByWord = new Map(dictRows.map((r) => [r.word.toLowerCase(), r]));

  const result: InscriptionWord[] = picked.map((p) => {
    const dict = dictByWord.get(p.word.toLowerCase());
    return {
      word: p.word,
      definition: dict?.definition ?? p.word,
      phonetic: dict?.phonetic ?? '',
      translationZhTw: dict?.translationZhTw ?? null,
      exampleSentence: dict?.exampleSentence ?? '',
      sourceWeek: p.sourceWeek,
    };
  });

  // 9. Shuffle the final queue
  shuffle(result);
  return result.slice(0, count);
}

/**
 * Hybrid picker: produces a mixed list of word and sentence prompts.
 *
 * Returns `count` total prompts. The first `wordsBeforeSentences` items
 * are word-only (warm-up). Remaining slots are filled with sentence
 * prompts (drawn from inscriptionSentencePool) — each sentence ALSO
 * carries dictionary metadata for the embedded target word, so frontend
 * lane handling (Mandarin gloss, IPA, etc.) still works.
 *
 * Sentences are preferentially chosen to use words that just appeared
 * in the warm-up rounds, reinforcing the just-practiced spelling in
 * immediate context.
 */
export async function pickInscriptionPrompts(opts: PickWordsOpts & {
  /** How many of the `count` total prompts should be sentences. */
  sentenceCount?: number;
  /** Where in the queue the sentences start (defaults to after warm-up words). */
  wordsBeforeSentences?: number;
}): Promise<InscriptionWord[]> {
  const sentenceCount = Math.max(0, Math.min(opts.sentenceCount ?? 0, opts.count));
  const warmUpCount = opts.count - sentenceCount;

  // Pick warm-up words via the existing single-word path
  const warmUpWords: InscriptionWord[] = warmUpCount > 0
    ? await pickInscriptionWords({ ...opts, count: warmUpCount })
    : [];

  if (sentenceCount === 0) return warmUpWords;

  // Pick sentences — prefer ones using a warm-up word
  const sentences = pickSentences({
    weekNumber: opts.weekNumber,
    count: sentenceCount,
    preferredWords: warmUpWords.map((w) => w.word),
  });

  if (sentences.length === 0) return warmUpWords;

  // Look up dictionary metadata for the sentence target words
  const targetWords = Array.from(new Set(sentences.map((s) => s.targetWord)));
  const dictRows = await prisma.dictionaryWord.findMany({
    where: { word: { in: targetWords } },
    select: {
      word: true,
      phonetic: true,
      definition: true,
      exampleSentence: true,
      translationZhTw: true,
    },
  });
  const dictByWord = new Map(dictRows.map((r) => [r.word.toLowerCase(), r]));

  // Also try to inherit metadata from any warm-up word that matches
  // (saves a lookup miss for words not yet in DictionaryWord — W4's
  // target words are not seeded there yet, per backlog).
  const warmUpByWord = new Map(warmUpWords.map((w) => [w.word.toLowerCase(), w]));

  const sentencePrompts: InscriptionWord[] = sentences.map((s) => {
    const key = s.targetWord.toLowerCase();
    const dict = dictByWord.get(key);
    const fallback = warmUpByWord.get(key);
    return {
      word: s.targetWord,
      definition: dict?.definition ?? fallback?.definition ?? s.targetWord,
      phonetic: dict?.phonetic ?? fallback?.phonetic ?? '',
      translationZhTw: dict?.translationZhTw ?? fallback?.translationZhTw ?? null,
      exampleSentence: dict?.exampleSentence ?? fallback?.exampleSentence ?? s.sentence,
      sourceWeek: s.sourceWeek,
      sentence: s.sentence,
    };
  });

  // Concat in the order the player sees them: warm-up words then sentences
  return [...warmUpWords, ...sentencePrompts];
}

function wordsForWeek(weekNumber: number): string[] {
  const cfg = getWeekConfig(weekNumber);
  if (!cfg) return [];
  return cfg.targetWords;
}

function findSourceWeek(word: string, candidates: number[]): number | null {
  for (const wk of candidates) {
    const list = wordsForWeek(wk).map((w) => w.toLowerCase());
    if (list.includes(word.toLowerCase())) return wk;
  }
  return null;
}

function shuffle<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
