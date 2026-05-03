import { create } from 'zustand';
import type {
  HarmonyPost,
  HarmonyReply,
  CensureItem,
  BulletinResponseResult,
  ArchivesResponse,
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

  // First-visit onboarding banner (set by /posts response, cleared on dismiss)
  isFirstVisit: boolean;

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
  dismissFirstVisit: () => void;
  submitPost: (content: string) => Promise<void>;
  openThread: (postId: string) => Promise<void>;
  closeThread: () => void;
  submitReply: (content: string) => Promise<void>;
  deletePost: (postId: string) => Promise<void>;
  censurePost: (postId: string, action: 'approve' | 'correct' | 'flag', weekNumber: number) => Promise<void>;
  respondToCensure: (postId: string, action: string, selectedIndex: number) => Promise<{ isCorrect: boolean; correction: string | null; explanation: string | null } | null>;
  respondToBulletin: (postId: string, questionIndex: number, selectedIndex: number) => Promise<BulletinResponseResult | null>;
  trackCitizen4488Action: (postId: string, action: string) => void;
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
  isFirstVisit: false,

  recentCensureResults: [],
  pearlAnnotations: [],
  citizen4488Actions: [],

  setTab: (tab) => set({ activeTab: tab }),

  loadPosts: async () => {
    set({ loading: true, error: null });
    try {
      const feed = await fetchHarmonyPosts();
      // First-visit banner: only surface when the server confirms first visit
      // AND the pair has not already dismissed it locally (survives page reloads
      // during a single first-visit session if user somehow double-loads).
      const serverFirstVisit = Boolean(feed.isFirstVisit);
      const localDismissed =
        typeof localStorage !== 'undefined' &&
        localStorage.getItem('harmony_first_visit_dismissed') === '1';
      set({
        posts: feed.posts,
        currentWeekNumber: feed.currentWeekNumber,
        focusWords: feed.focusWords,
        recentWords: feed.recentWords,
        deepReviewWords: feed.deepReviewWords,
        locked: feed.locked,
        lockMessage: feed.lockMessage ?? null,
        isFirstVisit: serverFirstVisit && !localDismissed,
        loading: false,
      });
    } catch {
      set({ loading: false, error: 'Failed to load feed' });
    }
  },

  dismissFirstVisit: () => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('harmony_first_visit_dismissed', '1');
    }
    set({ isFirstVisit: false });
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

  respondToCensure: async (postId, action, selectedIndex) => {
    try {
      const result = await submitCensureResponse(postId, action, selectedIndex);
      // Update local state
      const { censureItems, censureStats, recentCensureResults } = get();
      const updatedResults = [...recentCensureResults, result.isCorrect].slice(-10);
      set({
        censureItems: censureItems.map((item) =>
          item.id === postId
            ? { ...item, reviewed: true, wasCorrect: result.isCorrect, studentAction: 'answer' }
            : item,
        ),
        censureStats: { ...censureStats, completed: censureStats.completed + 1 },
        recentCensureResults: updatedResults,
        pearlAnnotations: computePearlAnnotations(updatedResults, get().citizen4488Actions),
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

  trackCitizen4488Action: (postId, action) => {
    const { citizen4488Actions, recentCensureResults } = get();
    const updated = [...citizen4488Actions, { postId, action }];
    set({
      citizen4488Actions: updated,
      pearlAnnotations: computePearlAnnotations(recentCensureResults, updated),
    });
  },
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

  // Flagged Citizen-4488
  const hasFlagged = citizen4488Actions.some(a => a.action === 'flag');
  if (hasFlagged) {
    annotations.push({
      type: 'flagged_4488',
      message: 'Flag received. Your compliance protects the community.',
    });
  }

  // Approved Citizen-4488
  const hasApproved = citizen4488Actions.some(a => a.action === 'approve');
  if (hasApproved) {
    annotations.push({
      type: 'approved_4488',
      message: 'Noted. Citizens who approve concerning content may receive guidance.',
    });
  }

  return annotations;
}
