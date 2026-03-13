import client from './client';
import type { SeasonResponse, WeekDetail, Mission, MissionScore } from '../types/shifts';
import type { WeekConfig } from '../types/shiftQueue';

export async function fetchSeason(): Promise<SeasonResponse> {
  const { data } = await client.get('/shifts/season');
  return data;
}

export async function fetchWeek(weekId: string): Promise<WeekDetail> {
  const { data } = await client.get(`/shifts/weeks/${weekId}`);
  return data;
}

export async function fetchMission(weekId: string, missionId: string): Promise<Mission> {
  const { data } = await client.get(`/shifts/weeks/${weekId}/missions/${missionId}`);
  return data;
}

export async function submitScore(weekId: string, missionId: string, score: number, details?: Record<string, unknown>): Promise<MissionScore> {
  const { data } = await client.post(`/shifts/weeks/${weekId}/missions/${missionId}/score`, { score, details });
  return data;
}

export async function getProgress(): Promise<{ progress: Record<string, unknown[]> }> {
  const { data } = await client.get('/shifts/progress');
  return data;
}

export async function updateStepProgress(weekId: string, stepId: string, status: string, extraData?: Record<string, unknown>): Promise<MissionScore> {
  const { data } = await client.post(`/shifts/progress/${weekId}/${stepId}`, { status, data: extraData });
  return data;
}

export async function fetchWeekConfig(weekId: string): Promise<WeekConfig | null> {
  try {
    const { data } = await client.get(`/shifts/weeks/${weekId}/config`);
    return data;
  } catch (err: unknown) {
    const axiosErr = err as { response?: { status?: number } };
    if (axiosErr.response?.status === 404) return null;
    throw err;
  }
}

export async function postShiftResult(weekId: string, result: Record<string, unknown>): Promise<unknown> {
  const { data } = await client.post(`/shifts/weeks/${weekId}/shift-result`, result);
  return data;
}

export async function patchClearance(clearanceLevel: string): Promise<{ clearanceLevel: string }> {
  const { data } = await client.patch('/shifts/clearance', { clearanceLevel });
  return data;
}

export async function patchConcern(delta: number): Promise<{ concernScore: number }> {
  const { data } = await client.patch('/shifts/concern', { delta });
  return data;
}

export async function resetWeekScores(weekId: string, missionTypes?: string[]): Promise<void> {
  await client.delete(`/shifts/weeks/${weekId}/scores`, {
    data: missionTypes ? { missionTypes } : undefined,
  });
}
