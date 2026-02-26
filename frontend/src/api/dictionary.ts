import client from './client';
import type { DictionaryWord, DictionaryStats, WordFamily } from '../types/dictionary';

export async function fetchDictionary(): Promise<{ words: DictionaryWord[]; currentWeek: number }> {
  const { data } = await client.get('/dictionary');
  return data;
}

export async function fetchDictionaryWord(wordId: string): Promise<DictionaryWord> {
  const { data } = await client.get(`/dictionary/${wordId}`);
  return data;
}

export async function fetchDictionaryStats(): Promise<DictionaryStats> {
  const { data } = await client.get('/dictionary/stats');
  return data;
}

export async function fetchWordFamilies(): Promise<{ families: WordFamily[] }> {
  const { data } = await client.get('/dictionary/families');
  return data;
}

export async function updateWordNotes(wordId: string, notes: string): Promise<{ id: string; studentNotes: string }> {
  const { data } = await client.patch(`/dictionary/${wordId}/notes`, { notes });
  return data;
}

export async function recordWordEncounter(wordId: string): Promise<void> {
  await client.post(`/dictionary/${wordId}/encounter`);
}

export async function recoverWord(wordId: string): Promise<void> {
  await client.post(`/dictionary/${wordId}/recover`);
}

export async function markWelcomeWatched(): Promise<void> {
  await client.post('/dictionary/welcome-watched');
}

export async function toggleStarred(wordId: string): Promise<{ starred: boolean }> {
  const { data } = await client.patch(`/dictionary/${wordId}/starred`);
  return data;
}

export async function revealChinese(wordId: string): Promise<{ chineseRevealed: boolean }> {
  const { data } = await client.patch(`/dictionary/${wordId}/chinese-revealed`);
  return data;
}

export async function updateTeacherDictionaryWord(
  wordId: string,
  fields: Record<string, unknown>
): Promise<unknown> {
  const { data } = await client.patch(`/teacher/dictionary/${wordId}`, fields);
  return data;
}
