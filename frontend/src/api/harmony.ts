import client from './client';

export type HarmonyPostType =
  | 'feed'
  | 'bulletin'
  | 'pearl_tip'
  | 'community_notice'
  | 'sector_report';

export interface BulletinQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

export interface BulletinResponseResult {
  isCorrect: boolean;
  correctIndex: number;
}

export interface HarmonyPost {
  id: string;
  designation: string;
  content: string;
  status: 'pending_review' | 'approved' | 'flagged' | 'redacted';
  pearlNote: string | null;
  replyCount: number;
  createdAt: string;
  isOwn: boolean;
  weekNumber: number | null;
  postType: HarmonyPostType;
  bulletinData: {
    refNumber: string;
    questions: BulletinQuestion[];
  } | null;
}

export interface HarmonyReply {
  id: string;
  designation: string;
  content: string;
  createdAt: string;
}

export interface HarmonyFeedResponse {
  locked: boolean;
  lockMessage?: string;
  posts: HarmonyPost[];
  currentWeekNumber: number;
  focusWords: string[];
  recentWords: string[];
  deepReviewWords: string[];
}

export interface CensureItem {
  id: string;
  designation: string;
  content: string;
  postType: 'censure_grammar' | 'censure_vocab' | 'censure_replace';
  weekNumber: number | null;
  censureData: {
    errorType: string;
    errorWord: string;
    correction: string;
    explanation: string;
    options: string[];
    correctIndex: number;
    blankWord?: string;
  } | null;
  reviewed: boolean;
  wasCorrect: boolean | null;
  studentAction: string | null;
  isReview: boolean;
}

export interface CensureQueueResponse {
  locked: boolean;
  items: CensureItem[];
  stats: { total: number; completed: number };
}

export interface CensureResponseResult {
  id: string;
  isCorrect: boolean;
  correction: string | null;
  explanation: string | null;
}

export async function fetchHarmonyPosts(): Promise<HarmonyFeedResponse> {
  const { data } = await client.get('/harmony/posts');
  return data;
}

export async function fetchCensureQueue(): Promise<CensureQueueResponse> {
  const { data } = await client.get('/harmony/censure-queue');
  return data;
}

export async function submitCensureResponse(
  postId: string,
  action: string,
  selectedIndex: number,
): Promise<CensureResponseResult> {
  const { data } = await client.post(`/harmony/censure-queue/${postId}/respond`, {
    action,
    selectedIndex,
  });
  return data;
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

export async function deleteHarmonyPost(postId: string): Promise<void> {
  await client.delete(`/harmony/posts/${postId}`);
}

export async function censurePost(
  postId: string,
  action: 'approve' | 'correct' | 'flag',
  weekNumber: number,
): Promise<{ success: boolean; action: string }> {
  const { data } = await client.post(`/harmony/posts/${postId}/censure`, { action, weekNumber });
  return data;
}

export async function submitBulletinResponse(
  postId: string,
  questionIndex: number,
  selectedIndex: number,
): Promise<BulletinResponseResult> {
  const { data } = await client.post(`/harmony/bulletins/${postId}/respond`, {
    questionIndex,
    selectedIndex,
  });
  return data;
}
