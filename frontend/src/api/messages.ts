import client from './client';
import type { CharacterMessage } from '../types/shiftQueue';

export async function fetchMessages(weekNumber?: number): Promise<{ messages: CharacterMessage[] }> {
  const params = weekNumber ? { weekNumber } : {};
  const { data } = await client.get('/messages', { params });
  return data;
}

export async function createMessage(payload: {
  characterName: string;
  designation: string;
  messageText: string;
  replyType: string;
  replyOptions?: unknown[];
  triggerType: string;
  triggerConfig: Record<string, unknown>;
  weekNumber: number;
}): Promise<CharacterMessage> {
  const { data } = await client.post('/messages', payload);
  return data;
}

export async function markRead(id: string): Promise<CharacterMessage> {
  const { data } = await client.patch(`/messages/${id}/read`);
  return data;
}

export async function submitReply(id: string, reply: string): Promise<CharacterMessage> {
  const { data } = await client.patch(`/messages/${id}/reply`, { reply });
  return data;
}

export async function getUnreadCount(): Promise<{ count: number }> {
  const { data } = await client.get('/messages/unread-count');
  return data;
}

// ─── Clarity Minder (teacher↔student direct messaging) ──────

export async function sendDirectMessage(
  pairId: string,
  text: string,
  weekNumber: number
): Promise<CharacterMessage> {
  const { data } = await client.post('/messages/direct', { pairId, text, weekNumber });
  return data;
}

export async function appendToThread(
  messageId: string,
  text: string
): Promise<CharacterMessage> {
  const { data } = await client.post(`/messages/${messageId}/thread`, { text });
  return data;
}

export async function fetchDirectMessages(
  pairId: string
): Promise<{ messages: CharacterMessage[] }> {
  const { data } = await client.get(`/messages/direct/${pairId}`);
  return data;
}
