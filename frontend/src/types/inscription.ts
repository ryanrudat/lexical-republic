// Inscription Pool domain types — shared between API/store/components.

export type DrillMode = 'solo' | 'open' | 'trial';
export type CommendationTier = 'bronze' | 'silver' | 'gold';
export type PoolStrategy = 'current' | 'recent' | 'cumulative';

export interface InscriptionWord {
  word: string;
  definition: string;
  phonetic: string;
  translationZhTw: string | null;
  exampleSentence: string;
  sourceWeek: number;
  /**
   * Optional sentence prompt. When present, the student types this full
   * sentence (which embeds `word`) instead of the word in isolation.
   * Hybrid drills produce a mix: first prompts are word-only (warm-up),
   * later prompts carry sentences using the same words.
   */
  sentence?: string;
}

export interface DrillDesk {
  desk: number;
  citizenNumber: string;
  isGhost: boolean;
  /** Live Open Pool: the real classmate this desk represents (opponent desks). Null for self + ghosts. */
  pairId?: string | null;
  wordTimings: Array<{
    wordIdx: number;
    finishedAt_ms: number;
    correct: boolean;
    errorsRecovered: number;
  }>;
  keystrokeLog: Array<{ wordIdx: number; charIdx: number; t_ms: number }>;
  wordsCorrect: number;
  finishedAt_ms: number | null;
}

export interface DrillStartPayload {
  drillId: string;
  mode: DrillMode;
  durationSec: number;
  wordCount: number;
  lane: number;
  weekNumber: number;
  words: InscriptionWord[];
  desks: DrillDesk[];
}

export interface StandingsRow {
  desk: number;
  citizenNumber: string;
  isGhost: boolean;
  wordsCorrect: number;
  finishedAt_ms: number | null;
  rank: number | null;
}

export interface PersonalBreakdown {
  wordsCorrect: number;
  wordsTotal: number;
  averagePerWordSec: number | null;
  fastestWord: { word: string; secs: number } | null;
  slowestWord: { word: string; secs: number } | null;
}

export interface DrillCompleteResult {
  drillId: string;
  finalRank: number | null;
  piAwarded: number;
  piCapped: boolean;
  commendationTier: CommendationTier | null;
  standings: StandingsRow[];
  personalBreakdown: PersonalBreakdown | null;
}

export interface InscriptionState {
  citizenNumber: string;
  classId: string | null;
  cooldownRemainingSec: number;
  soloUsedToday: number;
  soloCap: number;
  activeDrill: {
    id: string;
    mode: DrillMode;
    weekNumber: number;
    durationSec: number;
    wordCount: number;
    startedAt: string;
  } | null;
}

export interface RollEntry {
  citizenNumber: string;
  piTotal: number;
}
