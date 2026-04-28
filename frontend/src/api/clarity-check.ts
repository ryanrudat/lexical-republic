import client from './client';

export interface ClarityCheckCompletionResult {
  success: boolean;
  correctCount: number;
  masteryUpdates: number;
}

export async function submitClarityCheck(params: {
  checkId: string;
  weekNumber: number;
  words: Array<{ word: string; correct: boolean }>;
}): Promise<ClarityCheckCompletionResult> {
  const { data } = await client.post('/clarity-check/complete', params);
  return data as ClarityCheckCompletionResult;
}
