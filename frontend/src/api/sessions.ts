import client from './client';
import type { SessionConfig, PhaseProgress, EvaluationResult } from '../types/sessions';

export async function fetchSessionConfig(weekId: string): Promise<SessionConfig | null> {
  try {
    const { data } = await client.get(`/sessions/week/${weekId}`);
    return data;
  } catch (err: unknown) {
    const error = err as { response?: { status?: number } };
    if (error.response?.status === 404) return null;
    throw err;
  }
}

export async function fetchSessionProgress(
  weekId: string
): Promise<{ phases: PhaseProgress[] }> {
  const { data } = await client.get(`/sessions/week/${weekId}/progress`);
  return data;
}

export async function completePhase(
  weekId: string,
  phaseId: string,
  score?: number,
  details?: Record<string, unknown>
): Promise<{ completed: boolean; phaseId: string; score?: number }> {
  const { data } = await client.post(
    `/sessions/week/${weekId}/phase/${phaseId}/complete`,
    { score, details }
  );
  return data;
}

export async function submitForEvaluation(body: {
  weekNumber: number;
  phaseId: string;
  activityType: string;
  content: string;
  metadata?: {
    grammarTarget?: string;
    targetVocab?: string[];
    missionId?: string;
    lane?: number;
  };
}): Promise<EvaluationResult> {
  const { data } = await client.post('/submissions/evaluate', body);
  return data;
}
