import prisma from './prisma';

export interface ComplianceQuestion {
  word: string;
  correctDefinition: string;
  distractors: string[];
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
    select: { word: true, definition: true },
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

  const defByWord = new Map<string, string>();
  for (const r of targetRows) {
    if (r.definition && !defByWord.has(r.word.toLowerCase())) {
      defByWord.set(r.word.toLowerCase(), r.definition);
    }
  }

  const questions: ComplianceQuestion[] = [];
  let distractorIdx = 0;

  for (const word of targetWords) {
    const correctDef = defByWord.get(word.toLowerCase());
    if (!correctDef) continue;

    const distractors: string[] = [];
    while (distractors.length < 3 && distractorIdx < distractorDefs.length) {
      const d = distractorDefs[distractorIdx++]!;
      if (d !== correctDef && !distractors.includes(d)) {
        distractors.push(d);
      }
    }
    if (distractors.length < 2) continue;

    questions.push({ word, correctDefinition: correctDef, distractors });
  }

  // Suppress unused-warning while keeping the variable readable
  void selectedSet;

  return questions;
}
