import client from './client';
import type {
  DrillStartPayload,
  DrillCompleteResult,
  InscriptionState,
  RollEntry,
  DrillMode,
  PoolStrategy,
} from '../types/inscription';

export async function fetchInscriptionState(): Promise<InscriptionState> {
  const res = await client.get<InscriptionState>('/inscription/state');
  return res.data;
}

export async function startInscriptionDrill(opts: {
  mode: DrillMode;
  weekNumber: number;
  poolStrategy?: PoolStrategy;
  wordCount?: number;
  durationSec?: number;
}): Promise<DrillStartPayload> {
  const res = await client.post<DrillStartPayload>('/inscription/drills', opts);
  return res.data;
}

export async function submitInscriptionWord(opts: {
  drillId: string;
  wordIdx: number;
  finalText: string;
  finishedAt_ms: number;
  errorsRecovered: number;
}): Promise<{ correct: boolean; wordsCorrect?: number; duplicate?: boolean }> {
  const { drillId, ...body } = opts;
  const res = await client.post<{ correct: boolean; wordsCorrect?: number; duplicate?: boolean }>(
    `/inscription/drills/${drillId}/word`,
    body,
  );
  return res.data;
}

export async function completeInscriptionDrill(opts: {
  drillId: string;
  abandoned?: boolean;
}): Promise<DrillCompleteResult> {
  const res = await client.post<DrillCompleteResult>(
    `/inscription/drills/${opts.drillId}/complete`,
    { abandoned: opts.abandoned ?? false },
  );
  return res.data;
}

export async function fetchRollOfDistinction(classId: string): Promise<{ roll: RollEntry[] }> {
  const res = await client.get<{ roll: RollEntry[] }>(`/inscription/roll/${classId}`);
  return res.data;
}
