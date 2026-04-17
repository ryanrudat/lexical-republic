import client from './client';
import type { WordStatus } from '../types/dictionary';

export type WordStatusKey = WordStatus;

export interface ProfileSummaryShiftResult {
  weekNumber: number;
  completedAt: string;
  vocabScore: number;
  grammarAccuracy: number;
  targetWordsUsed: number;
  errorsFound: number;
  errorsTotal: number;
  concernScoreDelta: number;
}

export interface ProfileSummary {
  citizen: {
    designation: string;
    xp: number;
    streak: number;
    lane: number;
    concernScore: number;
    consecutiveQualifyingShifts: number;
    laneLocked: boolean;
    harmonyUnlockedAt: string | null;
    createdAt: string;
  };
  shifts: {
    totalCompleted: number;
    totalAvailable: number;
    recentResults: ProfileSummaryShiftResult[];
  };
  vocabulary: {
    totalWords: number;
    averageMastery: number;
    totalEncounters: number;
    byStatus: Record<WordStatusKey, number>;
    starredCount: number;
  };
  harmony: {
    postsWritten: number;
    censureResponsesTotal: number;
    censureCorrect: number;
    censureCorrectnessRate: number;
  };
  character: {
    narrativeChoicesMade: number;
    citizen4488InteractionsCount: number;
  };
}

export async function fetchProfileSummary(): Promise<ProfileSummary> {
  const { data } = await client.get('/student/profile-summary');
  return data;
}
