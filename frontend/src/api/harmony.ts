import client from './client';

export type HarmonyPostType =
  | 'feed'
  | 'bulletin'
  | 'pearl_tip'
  | 'community_notice'
  | 'sector_report'
  | 'feed_review';

// ─── Verdict loop (Junior Compliance Reviewer) ─────────────────────
export type VerdictRule = 'reg_14c' | 'conduct_s1' | 'conduct_sentiment';

export interface VerdictViolation {
  rule: VerdictRule;
  forbiddenWord: string;
  approvedWord: string;
  options: string[];
  weekApproved?: number;
}

export interface VerdictResult {
  isCorrect: boolean;
  correctVerdict: 'approve' | 'flag';
  violations: VerdictViolation[];
  pearlNote: string;
}

export interface BulletinQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  /** Traditional Chinese gloss of the question stem (Lane 1 visible, Lane 2 tap-to-reveal). */
  translationZhTw?: string;
}

export interface BulletinResponseResult {
  isCorrect: boolean;
  correctIndex: number;
}

/** Lane-aware study aid attached to a censure response. Optional — not every word resolves. */
export interface CensureStudyCard {
  word: string;
  phonetic: string | null;
  translationZhTw: string | null;
  exampleSentence: string | null;
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
  isNew?: boolean;

  // feed_review verdict fields (present only on pending/answered review posts)
  pendingReview?: boolean;
  flagOptions?: string[];
  /** The viewer's prior verdict, if already judged. */
  verdict?: 'approve' | 'flag' | null;
  verdictCorrect?: boolean | null;
  /** Answer key — only sent once the post has been answered. */
  correctVerdict?: 'approve' | 'flag' | null;
  violations?: VerdictViolation[] | null;
}

export interface HarmonyReply {
  id: string;
  designation: string;
  content: string;
  createdAt: string;
}

export interface AuditPair {
  word: string;
  definition: string;
}

export interface HarmonyFeedResponse {
  locked: boolean;
  lockMessage?: string;
  posts: HarmonyPost[];
  currentWeekNumber: number;
  focusWords: string[];
  recentWords: string[];
  deepReviewWords: string[];
  auditPairs?: AuditPair[];
}

export interface CensureItem {
  id: string;
  designation: string;
  content: string;
  postType:
    | 'censure_grammar'
    | 'censure_vocab'
    | 'censure_replace'
    | 'censure_redact'
    | 'censure_triage';
  weekNumber: number | null;
  censureData: {
    errorType: string;
    errorWord: string;
    correction: string;
    explanation: string;
    options: string[];
    correctIndex: number;
    blankWord?: string;
    /** Redact items: the word the censor should have used instead. */
    approvedWord?: string;
    /** Redact/triage items: in-world regulation cited. */
    regulation?: string;
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
  studyCard?: CensureStudyCard | null;
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
  /** For censure_redact only: the word the student tapped in the post text. */
  selectedWord?: string,
): Promise<CensureResponseResult> {
  const { data } = await client.post(`/harmony/censure-queue/${postId}/respond`, {
    action,
    selectedIndex,
    selectedWord,
  });
  return data;
}

export async function submitVerdict(
  postId: string,
  verdict: 'approve' | 'flag',
  details?: { rule?: string; word?: string; replacement?: string },
): Promise<VerdictResult> {
  const { data } = await client.post(`/harmony/posts/${postId}/verdict`, { verdict, ...details });
  return data;
}

export interface CreatePostResult {
  id: string;
  status: 'approved' | 'flagged' | 'pending_review';
  pearlNote: string | null;
  moderation?: { verdict: 'approved' | 'flagged'; reason: string | null };
  createdAt: string;
  weekNumber: number | null;
}

export async function createHarmonyPost(content: string): Promise<CreatePostResult> {
  const { data } = await client.post('/harmony/posts', { content });
  return data as CreatePostResult;
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

// ─── Archives ─────────────────────────────────────────────────────

export interface ArchiveWord {
  word: string;
  definition: string;
  exampleSentence: string;
  /** Traditional Chinese meaning (Lane 1 always shown, Lane 2 tap-to-reveal, Lane 3 hidden). */
  translationZhTw: string | null;
  phonetic: string | null;
  mastery: number;
  encounters: number;
}

export interface ArchiveWeekVocab {
  weekNumber: number;
  words: ArchiveWord[];
}

export interface ArchiveTimelineEntry {
  id: string;
  weekNumber: number | null;
  content: string;
  authorLabel: string;
  createdAt: string;
  studentAction: string | null;
}

export interface ArchiveBulletin {
  id: string;
  weekNumber: number | null;
  content: string;
  authorLabel: string;
  createdAt: string;
  bulletinData: {
    refNumber: string;
    questions: BulletinQuestion[];
  } | null;
}

export interface ArchivesResponse {
  locked: boolean;
  vocabulary?: ArchiveWeekVocab[];
  timeline?: ArchiveTimelineEntry[];
  bulletins?: ArchiveBulletin[];
}

export async function fetchHarmonyArchives(section?: string): Promise<ArchivesResponse> {
  const params = section ? { section } : {};
  const { data } = await client.get('/harmony/archives', { params });
  return data;
}

export async function checkHarmonyNewContent(): Promise<boolean> {
  const { data } = await client.get('/harmony/has-new');
  return data.hasNew;
}
