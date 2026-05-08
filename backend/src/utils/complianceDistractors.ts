import prisma from './prisma';

export interface ComplianceQuestion {
  word: string;
  correctDefinition: string;
  distractors: string[];
  /** IPA pronunciation, displayed on study cards (lane-aware). */
  phonetic?: string;
  /** Mandarin gloss for Lane 1 / Lane 2 study cards; null for Lane 3. */
  translationZhTw?: string | null;
  /** Example sentence shown on Lane 1 / Lane 2 study cards. */
  exampleSentence?: string;
}

function shuffle<T>(arr: T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/**
 * Build N Compliance Check questions from a teacher-curated word list.
 *
 * - Picks `questionCount` random words from `selectedWords`
 * - Looks up each word's definition in DictionaryWord
 * - Distractors: 3 random definitions from words NOT in `selectedWords`
 *   (deliberate — the student isn't being tested on those, so they're
 *    valid foils that don't double-test)
 */
export async function buildComplianceQuestions(
  selectedWords: string[],
  questionCount: number,
): Promise<ComplianceQuestion[]> {
  const cleaned = Array.from(
    new Set(
      selectedWords
        .map((w) => (typeof w === 'string' ? w.trim().toLowerCase() : ''))
        .filter((w) => w.length > 0),
    ),
  );
  if (cleaned.length === 0) return [];

  const targetCount = Math.max(1, Math.min(questionCount, cleaned.length, 5));
  const targetWords = shuffle(cleaned).slice(0, targetCount);

  const targetRows = await prisma.dictionaryWord.findMany({
    where: { word: { in: targetWords } },
    select: {
      word: true,
      definition: true,
      phonetic: true,
      translationZhTw: true,
      exampleSentence: true,
    },
  });

  const selectedSet = new Set(cleaned);
  const distractorPool = await prisma.dictionaryWord.findMany({
    where: {
      word: { notIn: cleaned },
      definition: { not: '' },
    },
    select: { word: true, definition: true },
    take: 200,
  });

  const distractorDefs = shuffle(
    distractorPool
      .map((d) => d.definition)
      .filter((d): d is string => typeof d === 'string' && d.trim().length > 0),
  );

  type EnrichedRow = {
    definition: string;
    phonetic?: string;
    translationZhTw?: string | null;
    exampleSentence?: string;
  };
  const rowByWord = new Map<string, EnrichedRow>();
  for (const r of targetRows) {
    const key = r.word.toLowerCase();
    if (r.definition && !rowByWord.has(key)) {
      rowByWord.set(key, {
        definition: r.definition,
        phonetic: r.phonetic ?? undefined,
        translationZhTw: r.translationZhTw,
        exampleSentence: r.exampleSentence ?? undefined,
      });
    }
  }

  const questions: ComplianceQuestion[] = [];
  let distractorIdx = 0;

  for (const word of targetWords) {
    const row = rowByWord.get(word.toLowerCase());
    if (!row) continue;
    const correctDef = row.definition;

    const distractors: string[] = [];
    while (distractors.length < 3 && distractorIdx < distractorDefs.length) {
      const d = distractorDefs[distractorIdx++]!;
      if (d !== correctDef && !distractors.includes(d)) {
        distractors.push(d);
      }
    }
    if (distractors.length < 2) continue;

    questions.push({
      word,
      correctDefinition: correctDef,
      distractors,
      phonetic: row.phonetic,
      translationZhTw: row.translationZhTw,
      exampleSentence: row.exampleSentence,
    });
  }

  // Suppress unused-warning while keeping the variable readable
  void selectedSet;

  return questions;
}
