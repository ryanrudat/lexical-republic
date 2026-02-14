import client from './client';

export interface GrammarError {
  word: string;
  startIndex: number;
  endIndex: number;
  rule: string;
  suggestion: string;
  explanation: string;
}

export interface GrammarCheckResult {
  errors: GrammarError[];
  errorCount: number;
  isClean: boolean;
  isDegraded: boolean;
}

export async function checkGrammar(
  text: string,
  weekNumber?: number,
  grammarTargets?: string[],
  knownWords?: string[],
  newWords?: string[],
): Promise<GrammarCheckResult> {
  const { data } = await client.post<GrammarCheckResult>('/ai/grammar-check', {
    text,
    weekNumber,
    grammarTargets,
    knownWords,
    newWords,
  });
  return data;
}

export async function transcribeRecording(
  recordingId: string,
  blob: Blob,
): Promise<{ transcript: string | null; isDegraded: boolean }> {
  const formData = new FormData();
  formData.append('audio', blob, 'recording.webm');

  const { data } = await client.post(`/recordings/${recordingId}/transcribe`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}
