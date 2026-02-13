import client from './client';
import type { SeasonResponse, WeekDetail, Mission, MissionScore } from '../types/shifts';

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
