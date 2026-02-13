import client from './client';

export interface HarmonyPost {
  id: string;
  designation: string;
  content: string;
  status: 'pending_review' | 'approved' | 'flagged' | 'redacted';
  pearlNote: string | null;
  replyCount: number;
  createdAt: string;
  isOwn: boolean;
}

export interface HarmonyReply {
  id: string;
  designation: string;
  content: string;
  createdAt: string;
}

export async function fetchHarmonyPosts(): Promise<HarmonyPost[]> {
  const { data } = await client.get('/harmony/posts');
  return data.posts;
}

export async function createHarmonyPost(content: string): Promise<{ id: string; status: string }> {
  const { data } = await client.post('/harmony/posts', { content });
  return data;
}

export async function fetchReplies(postId: string): Promise<HarmonyReply[]> {
  const { data } = await client.get(`/harmony/posts/${postId}/replies`);
  return data.replies;
}

export async function createReply(postId: string, content: string): Promise<{ id: string; status: string }> {
  const { data } = await client.post(`/harmony/posts/${postId}/replies`, { content });
  return data;
}
