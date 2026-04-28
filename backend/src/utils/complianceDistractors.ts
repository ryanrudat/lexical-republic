import prisma from './prisma';
import { getWeekConfig } from '../data/week-configs';

export interface ComplianceQuestion {
  word: string;
  correctDefinition: string;
  distractors: string[];
}

const KNOWN_WEEKS = [1, 2, 3, 4];

function shuffle<T>(arr: T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/**
 * Build N Compliance Check questions for the target week.
 *
 * - Picks `count` random words from `weekNumber`'s targetWords
 * - Looks up each word's definition in the DictionaryWord table
 * - Distractors: 3 random definitions from OTHER weeks' words (excluding current word)
 *
 * Falls back gracefully if dictionary entries are missing.
 */
export async function buildComplianceQuestions(
  weekNumber: number,
  count: number,
): Promise<ComplianceQuestion[]> {
  const targetWeek = getWeekConfig(weekNumber);
  if (!targetWeek) return [];

  const targetWords = shuffle(targetWeek.targetWords).slice(0, Math.max(1, Math.min(count, 5)));
  if (targetWords.length === 0) return [];

  const otherWords: string[] = [];
  for (const w of KNOWN_WEEKS) {
    if (w === weekNumber) continue;
    const cfg = getWeekConfig(w);
    if (cfg) otherWords.push(...cfg.targetWords);
  }

  const allLookupWords = Array.from(
    new Set([...targetWords, ...otherWords].map((w) => w.toLowerCase())),
  );

  const dictRows = await prisma.dictionaryWord.findMany({
    where: { word: { in: allLookupWords } },
    select: { word: true, definition: true },
  });

  const defByWord = new Map<string, string>();
  for (const row of dictRows) {
    if (!defByWord.has(row.word.toLowerCase()) && row.definition) {
      defByWord.set(row.word.toLowerCase(), row.definition);
    }
  }

  const questions: ComplianceQuestion[] = [];
  for (const word of targetWords) {
    const correctDef = defByWord.get(word.toLowerCase());
    if (!correctDef) continue;

    const distractorPool = shuffle(
      otherWords.filter((w) => w.toLowerCase() !== word.toLowerCase()),
    );

    const distractors: string[] = [];
    for (const candidate of distractorPool) {
      if (distractors.length >= 3) break;
      const def = defByWord.get(candidate.toLowerCase());
      if (def && def !== correctDef && !distractors.includes(def)) {
        distractors.push(def);
      }
    }

    if (distractors.length < 2) continue;

    questions.push({ word, correctDefinition: correctDef, distractors });
  }

  return questions;
}
