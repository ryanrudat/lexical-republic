import client from './client';

export type RemediationTriggerReason = 'rate_warned' | 'rate_double' | 'absolute_3';

export interface RemediationQuestion {
  word: string;
  correctDefinition: string;
  distractors: string[];
  /** IPA pronunciation, displayed on the lane-aware study card. */
  phonetic?: string;
  /** Mandarin gloss for Lane 1 / Lane 2 study cards; null/missing for Lane 3. */
  translationZhTw?: string | null;
  /** Example sentence shown on Lane 1 / Lane 2 study cards. */
  exampleSentence?: string;
}

export interface RemediationResultEntry {
  word: string;
  correct: boolean;
}

export interface TriggerRemediationResponse {
  /** Set when the remediation was successfully created or resumed. */
  moduleId?: string;
  weekNumber?: number;
  triggerReason?: RemediationTriggerReason;
  questions?: RemediationQuestion[];
  /** True when the existing in-flight remediation is being resumed (refresh-safe). */
  resumed?: boolean;
  /** True when the trigger is debounced because of recent prior remediations. */
  debounced?: boolean;
  retryInSeconds?: number;
  /** True when the dictionary did not have enough words to build 3 questions. */
  noQuestionsAvailable?: boolean;
}

export interface CompleteRemediationResponse {
  success: boolean;
  newConcernScore: number;
  cooldownApplied: number;
  correctCount: number;
  totalCount: number;
  alreadyCompleted?: boolean;
}

export interface ClawbackRemediationResponse {
  success: boolean;
  newConcernScore: number | null;
  restoredAmount: number;
  alreadyClawedBack?: boolean;
}

export interface PendingRemediation {
  moduleId: string;
  weekNumber: number;
  triggerReason: RemediationTriggerReason;
  questions: RemediationQuestion[];
  totalCount: number;
  triggeredAt: string;
}

export interface PendingRemediationResponse {
  pending: PendingRemediation | null;
}

export async function triggerRemediation(
  weekNumber: number,
  triggerReason: RemediationTriggerReason,
): Promise<TriggerRemediationResponse> {
  const { data } = await client.post('/remediation/trigger', { weekNumber, triggerReason });
  return data as TriggerRemediationResponse;
}

export async function completeRemediation(
  moduleId: string,
  correctCount: number,
  results: RemediationResultEntry[],
): Promise<CompleteRemediationResponse> {
  const { data } = await client.post(`/remediation/${moduleId}/complete`, {
    correctCount,
    results,
  });
  return data as CompleteRemediationResponse;
}

export async function clawbackRemediation(
  moduleId: string,
): Promise<ClawbackRemediationResponse> {
  const { data } = await client.post(`/remediation/${moduleId}/clawback`);
  return data as ClawbackRemediationResponse;
}

export async function fetchPendingRemediation(): Promise<PendingRemediationResponse> {
  const { data } = await client.get('/remediation/pending');
  return data as PendingRemediationResponse;
}
