import client from './client';

export interface NarrativeChoiceRecord {
  id: string;
  choiceKey: string;
  value: string;
  context: Record<string, unknown> | null;
  createdAt: string;
}

export async function postNarrativeChoice(params: {
  choiceKey: string;
  value: string;
  weekNumber?: number;
  context?: Record<string, unknown>;
}): Promise<{ id: string }> {
  const { data } = await client.post('/narrative-choices', params);
  return data;
}

export async function fetchNarrativeChoices(
  weekNumber?: number,
): Promise<NarrativeChoiceRecord[]> {
  const { data } = await client.get('/narrative-choices', {
    params: weekNumber !== undefined ? { weekNumber } : undefined,
  });
  return data.choices;
}
