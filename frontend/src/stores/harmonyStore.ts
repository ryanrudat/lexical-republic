import { create } from 'zustand';
import type { HarmonyPost, HarmonyReply } from '../api/harmony';
import {
  fetchHarmonyPosts,
  createHarmonyPost,
  fetchReplies,
  createReply,
  censurePost as censurePostApi,
} from '../api/harmony';

interface HarmonyState {
  posts: HarmonyPost[];
  currentWeekNumber: number;
  focusWords: string[];
  reviewWords: string[];
  loading: boolean;
  error: string | null;

  // Thread view
  selectedPostId: string | null;
  replies: HarmonyReply[];
  repliesLoading: boolean;

  loadPosts: () => Promise<void>;
  submitPost: (content: string) => Promise<void>;
  openThread: (postId: string) => Promise<void>;
  closeThread: () => void;
  submitReply: (content: string) => Promise<void>;
  censurePost: (postId: string, action: 'approve' | 'correct' | 'flag', weekNumber: number) => Promise<void>;
}

export const useHarmonyStore = create<HarmonyState>((set, get) => ({
  posts: [],
  currentWeekNumber: 1,
  focusWords: [],
  reviewWords: [],
  loading: false,
  error: null,

  selectedPostId: null,
  replies: [],
  repliesLoading: false,

  loadPosts: async () => {
    set({ loading: true, error: null });
    try {
      const feed = await fetchHarmonyPosts();
      set({
        posts: feed.posts,
        currentWeekNumber: feed.currentWeekNumber,
        focusWords: feed.focusWords,
        reviewWords: feed.reviewWords,
        loading: false,
      });
    } catch {
      set({ loading: false, error: 'Failed to load feed' });
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

      // Update reply count on parent post
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

  censurePost: async (postId, action, weekNumber) => {
    try {
      await censurePostApi(postId, action, weekNumber);
      // If flagged, update local state
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
}));
