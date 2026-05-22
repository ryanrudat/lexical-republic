// Cold-start ghost recordings for the Inscription Pool.
// Used when a class has no real prior recordings in the matching lane bucket.
// Each ghost simulates a Ministry-issued NPC with calibrated typing pace.
//
// Doctrine: these NPCs are the legendary inscribers — fictional Party
// exemplars whose pace the Ministry promotes. Beating one earns a special
// commendation memo from PEARL.

export interface MinistryStenographerGhost {
  /** Citizen-XXXX number rendered in race. Reserved 0000–0099 for Ministry NPCs. */
  citizenNumber: string;
  /** Display title (not rendered in race, used in commendations) */
  title: string;
  /** Lane this ghost is calibrated for. */
  lane: number;
  /** Average seconds per word — total drill time = perWordSec * wordCount */
  perWordSec: number;
  /** Standard deviation factor (0–1). 0.2 = ±20% variance per word. */
  variance: number;
  /** Whether this ghost ever fails to complete (DNF probability for narrative). */
  dnfChance?: number;
}

const FAST_PER_WORD_BY_LANE: Record<number, number> = {
  1: 6.0,
  2: 4.0,
  3: 3.0,
};
const STEADY_PER_WORD_BY_LANE: Record<number, number> = {
  1: 8.5,
  2: 6.0,
  3: 4.5,
};
const STRUGGLING_PER_WORD_BY_LANE: Record<number, number> = {
  1: 12.0,
  2: 9.0,
  3: 6.5,
};

export function getStenographerTemplates(lane: number): MinistryStenographerGhost[] {
  return [
    {
      citizenNumber: 'C-0000',
      title: 'Senior Inscription Officer',
      lane,
      perWordSec: FAST_PER_WORD_BY_LANE[lane] ?? FAST_PER_WORD_BY_LANE[2],
      variance: 0.1,
    },
    {
      citizenNumber: 'C-0001',
      title: 'Compliance Inscription Specialist',
      lane,
      perWordSec: STEADY_PER_WORD_BY_LANE[lane] ?? STEADY_PER_WORD_BY_LANE[2],
      variance: 0.18,
    },
    {
      citizenNumber: 'C-0002',
      title: 'Junior Inscription Officer',
      lane,
      perWordSec: STRUGGLING_PER_WORD_BY_LANE[lane] ?? STRUGGLING_PER_WORD_BY_LANE[2],
      variance: 0.25,
      dnfChance: 0.05,
    },
  ];
}

/** Materialize a stenographer ghost into a synthetic timing log for a drill. */
export function synthesizeStenographerTimings(
  ghost: MinistryStenographerGhost,
  wordCount: number,
  drillDurationSec: number,
): { wordTimings: Array<{ wordIdx: number; finishedAt_ms: number; correct: boolean; errorsRecovered: number }>; finishedAt_ms: number | null; wordsCorrect: number } {
  const wordTimings: Array<{
    wordIdx: number;
    finishedAt_ms: number;
    correct: boolean;
    errorsRecovered: number;
  }> = [];

  // Probability of DNF (rare, for narrative texture)
  const willDnf = ghost.dnfChance && Math.random() < ghost.dnfChance;
  const wordsToComplete = willDnf
    ? Math.floor(wordCount * (0.4 + Math.random() * 0.4))
    : wordCount;

  let cumulativeMs = 0;
  for (let i = 0; i < wordsToComplete; i++) {
    const drift = 1 + (Math.random() * 2 - 1) * ghost.variance;
    const wordMs = ghost.perWordSec * 1000 * drift;
    cumulativeMs += wordMs;
    if (cumulativeMs > drillDurationSec * 1000) {
      // Drill timer cut them off
      break;
    }
    wordTimings.push({
      wordIdx: i,
      finishedAt_ms: Math.round(cumulativeMs),
      correct: true,
      errorsRecovered: Math.random() < 0.15 ? 1 : 0,
    });
  }

  const wordsCorrect = wordTimings.length;
  const finishedAt_ms = wordTimings.length === wordCount ? wordTimings[wordTimings.length - 1].finishedAt_ms : null;

  return { wordTimings, finishedAt_ms, wordsCorrect };
}
