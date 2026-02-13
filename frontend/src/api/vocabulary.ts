import client from './client';
import type { VocabWord } from '../types/shifts';

export async function fetchVocabulary(): Promise<VocabWord[]> {
  const { data } = await client.get('/vocabulary');
  return data.words;
}

export async function recordEncounter(vocabId: string) {
  const { data } = await client.post(`/vocabulary/${vocabId}/encounter`);
  return data;
}
