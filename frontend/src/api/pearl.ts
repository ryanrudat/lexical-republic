import client from './client';
import type { BarkContext } from '../hooks/useBarkContext';
import type { BarkType } from '../types/shifts';

export interface PearlMessage {
  id: string;
  text: string;
  category: string;
}

export async function fetchPearlMessages() {
  const { data } = await client.get('/pearl/messages');
  return data.messages as PearlMessage[];
}

export interface GenerateBarkResponse {
  text: string;
  isDegraded: boolean;
}

export async function generateBark(
  barkType: BarkType,
  context?: BarkContext,
): Promise<GenerateBarkResponse> {
  const { data } = await client.post('/pearl/bark', { barkType, context });
  return data as GenerateBarkResponse;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface PearlChatResponse {
  reply: string;
  isDegraded: boolean;
  rateLimited?: boolean;
}

export interface PearlChatContext {
  weekNumber?: number;
  taskType?: string;
  taskLabel?: string;
  grammarTarget?: string;
  targetWords?: string[];
  stepId?: string;
  isWritingNudge?: boolean;
  writingPrompt?: string;
  studentWritingSoFar?: string;
  taskNarrativeContext?: string;
}

export async function sendPearlChat(
  message: string,
  history: ChatMessage[],
  taskContext?: PearlChatContext,
): Promise<PearlChatResponse> {
  const { data } = await client.post('/pearl/chat', { message, history, taskContext });
  return data as PearlChatResponse;
}
