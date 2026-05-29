import { create } from 'zustand';
import type {
  HarmonyPost,
  HarmonyReply,
  CensureItem,
  BulletinResponseResult,
  CensureResponseResult,
  ArchivesResponse,
  VerdictResult,
} from '../api/harmony';
import {
  fetchHarmonyPosts,
  createHarmonyPost,
  deleteHarmonyPost,
  fetchReplies,
  createReply,
  censurePost as censurePostApi,
  fetchCensureQueue,
  submitCensureResponse,
  submitBulletinResponse,
  submitVerdict as submitVerdictApi,
  fetchHarmonyArchives,
  checkHarmonyNewContent,
} from '../api/harmony';

type HarmonyTab = 'feed' | 'ministry' | 'sector' | 'censure' | 'archives';

/** PEARL ambient annotation trigger types. */
export type PearlAnnotationType =
  | 'streak_5_correct'
  | 'streak_3_wrong'
  | 'flagged_4488'
  | 'approved_4488'
  | 'new_shift_visit'
  | 'reading_without_acting';

export interface PearlAnnotation {
  type: PearlAnnotationType;
  message: string;
}

interface HarmonyState {
  // Feed
  posts: HarmonyPost[];
  currentWeekNumber: number;
  focusWords: string[];
  recentWords: string[];
  deepReviewWords: string[];
  loading: boolean;
  error: string | null;
  locked: boolean;
  lockMessage: string | null;

  // Thread view
  selectedPostId: string | null;
  replies: HarmonyReply[];
  repliesLoading: boolean;

  // Censure queue
  activeTab: HarmonyTab;
  censureItems: CensureItem[];
  censureStats: { total: number; completed: number };
  censureLoading: boolean;

  // Bulletin comprehension (session-only)
  bulletinAnswers: Record<string, Record<number, boolean>>;

  // Archives
  archives: ArchivesResponse | null;
  archivesLoading: boolean;

  // NEW content tracking
  hasNewContent: boolean;

  // Live class presence — online classmate count from the per-class socket room.
  classOnline: number;

  // Harmony Credits — in-world reward points, persisted per pair in localStorage.
  harmonyCredits: number;
  creditsPairId: string | null;

  // PEARL ambient annotations (session-based)
  recentCensureResults: boolean[];
  pearlAnnotations: PearlAnnotation[];
  citizen4488Actions: Array<{ postId: string; action: string }>;

  // Actions
  setTab: (tab: HarmonyTab) => void;
  loadPosts: () => Promise<void>;
  loadCensureQueue: () => Promise<void>;
  loadArchives: (section?: string) => Promise<void>;
  checkNewContent: () => Promise<void>;
  setHasNewContent: (v: boolean) => void;
  setClassOnline: (n: number) => void;
  submitPost: (content: string) => Promise<void>;
  openThread: (postId: string) => Promise<void>;
  closeThread: () => void;
  submitReply: (content: string) => Promise<void>;
  deletePost: (postId: string) => Promise<void>;
  censurePost: (postId: string, action: 'approve' | 'correct' | 'flag', weekNumber: number) => Promise<void>;
  respondToCensure: (postId: string, action: string, selectedIndex: number, selectedWord?: string) => Promise<CensureResponseResult | null>;
  respondToBulletin: (postId: string, questionIndex: number, selectedIndex: number) => Promise<BulletinResponseResult | null>;
  submitVerdict: (postId: string, verdict: 'approve' | 'flag', details?: { rule?: string; word?: string; replacement?: string }) => Promise<VerdictResult | null>;
  trackCitizen4488Action: (postId: string, action: string) => void;
  loadCredits: (pairId: string | null | undefined) => void;
  awardCredits: (n: number) => void;
  dismissPearlAnnotations: () => void;
}

/** Harmony Credits — in-world reward points awarded for correct review work. */
const CENSURE_CREDIT = 2;
const BULLETIN_CREDIT = 1;
const VERDICT_CREDIT = 3;
function creditsStorageKey(pairId: string): string {
  return `harmony_credits_${pairId}`;
}

export const useHarmonyStore = create<HarmonyState>((set, get) => ({
  posts: [],
  currentWeekNumber: 1,
  focusWords: [],
  recentWords: [],
  deepReviewWords: [],
  loading: false,
  error: null,
  locked: false,
  lockMessage: null,

  selectedPostId: null,
  replies: [],
  repliesLoading: false,

  activeTab: 'feed',
  bulletinAnswers: {},
  censureItems: [],
  censureStats: { total: 0, completed: 0 },
  censureLoading: false,

  archives: null,
  archivesLoading: false,

  hasNewContent: false,
  classOnline: 0,

  harmonyCredits: 0,
  creditsPairId: null,

  recentCensureResults: [],
  pearlAnnotations: [],
  citizen4488Actions: [],

  setTab: (tab) => set({ activeTab: tab }),

  loadPosts: async () => {
    set({ loading: true, error: null });
    try {
      const feed = await fetchHarmonyPosts();
      set({
        posts: feed.posts,
        currentWeekNumber: feed.currentWeekNumber,
        focusWords: feed.focusWords,
        recentWords: feed.recentWords,
        deepReviewWords: feed.deepReviewWords,
        locked: feed.locked,
        lockMessage: feed.lockMessage ?? null,
        loading: false,
      });
    } catch {
      set({ loading: false, error: 'Failed to load feed' });
    }
  },

  loadCensureQueue: async () => {
    set({ censureLoading: true });
    try {
      const queue = await fetchCensureQueue();
      set({
        censureItems: queue.items,
        censureStats: queue.stats,
        censureLoading: false,
      });
    } catch {
      set({ censureLoading: false, error: 'Failed to load censure queue' });
    }
  },

  loadArchives: async (section) => {
    set({ archivesLoading: true });
    try {
      const data = await fetchHarmonyArchives(section);
      set({ archives: data, archivesLoading: false });
    } catch {
      set({ archivesLoading: false, error: 'Failed to load archives' });
    }
  },

  checkNewContent: async () => {
    try {
      const hasNew = await checkHarmonyNewContent();
      set({ hasNewContent: hasNew });
    } catch {
      // Silently fail
    }
  },

  setHasNewContent: (v) => set({ hasNewContent: v }),

  setClassOnline: (n) => set({ classOnline: Math.max(0, n) }),

  submitPost: async (content) => {
    try {
      const result = await createHarmonyPost(content);
      const { posts, currentWeekNumber } = get();
      const newPost: HarmonyPost = {
        id: result.id,
        designation: 'YOU',
        content,
        status: result.status,
        pearlNote: result.pearlNote,
        replyCount: 0,
        createdAt: result.createdAt,
        isOwn: true,
        weekNumber: result.weekNumber ?? currentWeekNumber,
        postType: 'feed',
        bulletinData: null,
      };
      set({ posts: [newPost, ...posts] });
    } catch {
      set({ error: 'Failed to submit post' });
    }
  },

  openThread: async (postId) => {
    set({ selectedPostId: postId, replies: [], repliesLoading: true });
    try {
      const replies = await fetchReplies(postId);
      set({ replies, repliesLoading: false });
    } catch {
      set({ repliesLoading: false });
    }
  },

  closeThread: () => {
    set({ selectedPostId: null, replies: [], repliesLoading: false });
  },

  submitReply: async (content) => {
    const { selectedPostId, replies, posts } = get();
    if (!selectedPostId) return;

    try {
      const result = await createReply(selectedPostId, content);
      const pendingReply: HarmonyReply = {
        id: result.id,
        designation: 'YOU',
        content,
        createdAt: new Date().toISOString(),
      };
      set({ replies: [...replies, pendingReply] });

      set({
        posts: posts.map((p) =>
          p.id === selectedPostId
            ? { ...p, replyCount: p.replyCount + 1 }
            : p,
        ),
      });
    } catch {
      set({ error: 'Failed to submit reply' });
    }
  },

  deletePost: async (postId) => {
    try {
      await deleteHarmonyPost(postId);
      const { posts } = get();
      set({ posts: posts.filter((p) => p.id !== postId) });
    } catch {
      set({ error: 'Failed to delete post' });
    }
  },

  censurePost: async (postId, action, weekNumber) => {
    try {
      await censurePostApi(postId, action, weekNumber);
      if (action === 'flag') {
        const { posts } = get();
        set({
          posts: posts.map((p) =>
            p.id === postId
              ? { ...p, status: 'flagged' as const, pearlNote: 'Flag received. Forwarded for Wellness Review.' }
              : p,
          ),
        });
      }
    } catch {
      set({ error: 'Failed to process action' });
    }
  },

  respondToCensure: async (postId, action, selectedIndex, selectedWord) => {
    try {
      const result = await submitCensureResponse(postId, action, selectedIndex, selectedWord);
      // Update local state
      const { censureItems, censureStats, recentCensureResults } = get();
      const wasAlreadyReviewed = censureItems.find((i) => i.id === postId)?.reviewed ?? false;
      const updatedResults = [...recentCensureResults, result.isCorrect].slice(-10);
      const updatedItems = censureItems.map((item) =>
        item.id === postId
          ? { ...item, reviewed: true, wasCorrect: result.isCorrect, studentAction: 'answer' }
          : item,
      );
      // Derive `completed` from how many items are now reviewed (clamped to total)
      // instead of blindly incrementing. Re-answering a spaced-repetition item used
      // to double-count and push the progress bar past 100% (e.g. "6/5 reviewed").
      const completed = Math.min(
        censureStats.total,
        updatedItems.filter((i) => i.reviewed).length,
      );
      set({
        censureItems: updatedItems,
        censureStats: { ...censureStats, completed },
        recentCensureResults: updatedResults,
        pearlAnnotations: computePearlAnnotations(updatedResults, get().citizen4488Actions),
      });
      // Reward a first correct verdict with Harmony Credits (no farming on re-answer).
      if (result.isCorrect && !wasAlreadyReviewed) get().awardCredits(CENSURE_CREDIT);
      return result;
    } catch {
      set({ error: 'Failed to submit response' });
      return null;
    }
  },

  respondToBulletin: async (postId, questionIndex, selectedIndex) => {
    try {
      const result = await submitBulletinResponse(postId, questionIndex, selectedIndex);
      const { bulletinAnswers } = get();
      const alreadyAnswered = bulletinAnswers[postId]?.[questionIndex] !== undefined;
      set({
        bulletinAnswers: {
          ...bulletinAnswers,
          [postId]: {
            ...(bulletinAnswers[postId] ?? {}),
            [questionIndex]: result.isCorrect,
          },
        },
      });
      // Reward a first correct comprehension answer (no farming on re-answer).
      if (result.isCorrect && !alreadyAnswered) get().awardCredits(BULLETIN_CREDIT);
      return result;
    } catch {
      set({ error: 'Failed to submit bulletin response' });
      return null;
    }
  },

  submitVerdict: async (postId, verdict, details) => {
    try {
      const result = await submitVerdictApi(postId, verdict, details);
      const { posts } = get();
      set({
        posts: posts.map((p) =>
          p.id === postId
            ? {
                ...p,
                pendingReview: false,
                verdict,
                verdictCorrect: result.isCorrect,
                correctVerdict: result.correctVerdict,
                violations: result.violations,
              }
            : p,
        ),
      });
      if (result.isCorrect) get().awardCredits(VERDICT_CREDIT);
      return result;
    } catch {
      set({ error: 'Failed to submit verdict' });
      return null;
    }
  },

  trackCitizen4488Action: (postId, action) => {
    const { citizen4488Actions, recentCensureResults } = get();
    const updated = [...citizen4488Actions, { postId, action }];
    set({
      citizen4488Actions: updated,
      pearlAnnotations: computePearlAnnotations(recentCensureResults, updated),
    });
  },

  loadCredits: (pairId) => {
    if (!pairId) {
      set({ harmonyCredits: 0, creditsPairId: null });
      return;
    }
    let stored = 0;
    try {
      const raw = localStorage.getItem(creditsStorageKey(pairId));
      stored = raw ? Math.max(0, parseInt(raw, 10) || 0) : 0;
    } catch {
      stored = 0;
    }
    set({ harmonyCredits: stored, creditsPairId: pairId });
  },

  awardCredits: (n) => {
    if (n <= 0) return;
    const { harmonyCredits, creditsPairId } = get();
    const next = harmonyCredits + n;
    set({ harmonyCredits: next });
    if (creditsPairId) {
      try {
        localStorage.setItem(creditsStorageKey(creditsPairId), String(next));
      } catch {
        /* localStorage unavailable — keep the in-memory value */
      }
    }
  },

  dismissPearlAnnotations: () => set({ pearlAnnotations: [] }),
}));

/** Compute PEARL ambient annotations from session state. */
function computePearlAnnotations(
  censureResults: boolean[],
  citizen4488Actions: Array<{ postId: string; action: string }>,
): PearlAnnotation[] {
  const annotations: PearlAnnotation[] = [];

  // 5 correct censure in a row
  if (censureResults.length >= 5 && censureResults.slice(-5).every(Boolean)) {
    annotations.push({
      type: 'streak_5_correct',
      message: 'Exceptional language accuracy. This has been added to your file.',
    });
  }

  // 3 wrong in a row
  if (censureResults.length >= 3 && censureResults.slice(-3).every(r => !r)) {
    annotations.push({
      type: 'streak_3_wrong',
      message: 'Additional review has been scheduled for your benefit, Citizen.',
    });
  }

  // Citizen-4488 — reflect ONLY the most recent action. A session-wide `.some()`
  // used to pin "Flag received…" forever after a single flag and let approve+flag
  // contradictions stack. The student can also dismiss the strip outright.
  const last4488 = citizen4488Actions[citizen4488Actions.length - 1];
  if (last4488?.action === 'flag') {
    annotations.push({
      type: 'flagged_4488',
      message: 'Flag received. Your compliance protects the community.',
    });
  } else if (last4488?.action === 'approve') {
    annotations.push({
      type: 'approved_4488',
      message: 'Noted. Citizens who approve concerning content may receive guidance.',
    });
  }

  return annotations;
}
