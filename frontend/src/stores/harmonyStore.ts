import { create } from 'zustand';
import type { HarmonyPost, HarmonyReply, CensureItem, BulletinResponseResult } from '../api/harmony';
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
} from '../api/harmony';

type HarmonyTab = 'feed' | 'censure';

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

  // Actions
  setTab: (tab: HarmonyTab) => void;
  loadPosts: () => Promise<void>;
  loadCensureQueue: () => Promise<void>;
  submitPost: (content: string) => Promise<void>;
  openThread: (postId: string) => Promise<void>;
  closeThread: () => void;
  submitReply: (content: string) => Promise<void>;
  deletePost: (postId: string) => Promise<void>;
  censurePost: (postId: string, action: 'approve' | 'correct' | 'flag', weekNumber: number) => Promise<void>;
  respondToCensure: (postId: string, action: string, selectedIndex: number) => Promise<{ isCorrect: boolean; correction: string | null; explanation: string | null } | null>;
  respondToBulletin: (postId: string, questionIndex: number, selectedIndex: number) => Promise<BulletinResponseResult | null>;
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

  submitPost: async (content) => {
    try {
      const result = await createHarmonyPost(content);
      const { posts, currentWeekNumber } = get();
      const pendingPost: HarmonyPost = {
        id: result.id,
        designation: 'YOU',
        content,
        status: 'pending_review',
        pearlNote: null,
        replyCount: 0,
        createdAt: new Date().toISOString(),
        isOwn: true,
        weekNumber: currentWeekNumber,
        postType: 'feed',
        bulletinData: null,
      };
      set({ posts: [pendingPost, ...posts] });

      setTimeout(() => {
        get().loadPosts();
      }, 5000);
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

  respondToCensure: async (postId, action, selectedIndex) => {
    try {
      const result = await submitCensureResponse(postId, action, selectedIndex);
      // Update local state
      const { censureItems, censureStats } = get();
      set({
        censureItems: censureItems.map((item) =>
          item.id === postId
            ? { ...item, reviewed: true, wasCorrect: result.isCorrect, studentAction: 'answer' }
            : item,
        ),
        censureStats: { ...censureStats, completed: censureStats.completed + 1 },
      });
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
      set({
        bulletinAnswers: {
          ...bulletinAnswers,
          [postId]: {
            ...(bulletinAnswers[postId] ?? {}),
            [questionIndex]: result.isCorrect,
          },
        },
      });
      return result;
    } catch {
      set({ error: 'Failed to submit bulletin response' });
      return null;
    }
  },
}));
