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

/** Completed check ids for this pair (optionally one week) — used to hydrate
 *  the one-shot gate so a refresh doesn't replay the screen-locking check. */
export async function fetchCompletedClarityChecks(weekNumber?: number): Promise<string[]> {
  const { data } = await client.get('/clarity-check/completed', {
    params: weekNumber != null ? { weekNumber } : {},
  });
  return (data as { checkIds: string[] }).checkIds ?? [];
}
