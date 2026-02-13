import { create } from 'zustand';
import type { HarmonyPost } from '../api/harmony';
import { fetchHarmonyPosts, createHarmonyPost } from '../api/harmony';

interface HarmonyState {
  posts: HarmonyPost[];
  loading: boolean;
  error: string | null;
  loadPosts: () => Promise<void>;
  submitPost: (content: string) => Promise<void>;
}

export const useHarmonyStore = create<HarmonyState>((set, get) => ({
  posts: [],
  loading: false,
  error: null,

  loadPosts: async () => {
    set({ loading: true, error: null });
    try {
      const posts = await fetchHarmonyPosts();
      set({ posts, loading: false });
    } catch {
      set({ loading: false, error: 'Failed to load feed' });
    }
  },

  submitPost: async (content) => {
    try {
      const result = await createHarmonyPost(content);
      // Optimistically add pending post
      const { posts } = get();
      const pendingPost: HarmonyPost = {
        id: result.id,
        designation: 'YOU',
        content,
        status: 'pending_review',
        pearlNote: null,
        replyCount: 0,
        createdAt: new Date().toISOString(),
        isOwn: true,
      };
      set({ posts: [pendingPost, ...posts] });

      // Refresh after delay to get approved status
      setTimeout(() => {
        get().loadPosts();
      }, 5000);
    } catch {
      set({ error: 'Failed to submit post' });
    }
  },
}));
