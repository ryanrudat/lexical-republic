import { create } from 'zustand';
import type { DictionaryWord, DictionaryFilter, WordFamily } from '../types/dictionary';
import {
  fetchDictionary,
  fetchWordFamilies,
  updateWordNotes as apiUpdateNotes,
  recordWordEncounter as apiRecordEncounter,
  recoverWord as apiRecoverWord,
  toggleStarred as apiToggleStarred,
  revealChinese as apiRevealChinese,
} from '../api/dictionary';

interface DictionaryState {
  words: DictionaryWord[];
  families: WordFamily[];
  currentWeek: number;
  loading: boolean;
  error: string | null;
  isOpen: boolean;
  searchQuery: string;
  filter: DictionaryFilter;
  selectedWordId: string | null;

  loadDictionary: () => Promise<void>;
  loadFamilies: () => Promise<void>;
  open: () => void;
  close: () => void;
  toggle: () => void;
  setSearch: (query: string) => void;
  setFilter: (filter: DictionaryFilter) => void;
  selectWord: (wordId: string | null) => void;
  updateNotes: (wordId: string, notes: string) => Promise<void>;
  recordEncounter: (wordId: string) => Promise<void>;
  recoverWord: (wordId: string) => Promise<void>;
  toggleStarred: (wordId: string) => Promise<void>;
  revealChinese: (wordId: string) => Promise<void>;
}

export const useDictionaryStore = create<DictionaryState>((set, get) => ({
  words: [],
  families: [],
  currentWeek: 1,
  loading: false,
  error: null,
  isOpen: false,
  searchQuery: '',
  filter: 'all',
  selectedWordId: null,

  loadDictionary: async () => {
    if (get().loading) return;
    set({ loading: true, error: null });
    try {
      const { words, currentWeek } = await fetchDictionary();
      set({ words, currentWeek, loading: false });
    } catch {
      set({ error: 'Failed to load dictionary', loading: false });
    }
  },

  loadFamilies: async () => {
    try {
      const { families } = await fetchWordFamilies();
      set({ families });
    } catch {
      // Non-critical — don't set error state
    }
  },

  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false, selectedWordId: null }),
  toggle: () => {
    const { isOpen } = get();
    if (isOpen) {
      set({ isOpen: false, selectedWordId: null });
    } else {
      set({ isOpen: true });
    }
  },

  setSearch: (searchQuery) => set({ searchQuery }),
  setFilter: (filter) => set({ filter }),

  selectWord: (selectedWordId) => set({ selectedWordId }),

  updateNotes: async (wordId, notes) => {
    try {
      await apiUpdateNotes(wordId, notes);
      set({
        words: get().words.map((w) =>
          w.id === wordId ? { ...w, studentNotes: notes } : w
        ),
      });
    } catch {
      // Silently fail — notes are non-critical
    }
  },

  recordEncounter: async (wordId) => {
    try {
      await apiRecordEncounter(wordId);
      set({
        words: get().words.map((w) =>
          w.id === wordId
            ? { ...w, encounters: w.encounters + 1, mastery: Math.min(1.0, w.mastery + 0.1) }
            : w
        ),
      });
    } catch {
      // Silently fail
    }
  },

  recoverWord: async (wordId) => {
    try {
      await apiRecoverWord(wordId);
      set({
        words: get().words.map((w) =>
          w.id === wordId ? { ...w, isRecovered: true, status: 'recovered' } : w
        ),
      });
    } catch {
      // Silently fail
    }
  },

  toggleStarred: async (wordId) => {
    // Optimistic update
    const prev = get().words.find((w) => w.id === wordId);
    if (!prev) return;
    set({
      words: get().words.map((w) =>
        w.id === wordId ? { ...w, starred: !w.starred } : w
      ),
    });
    try {
      await apiToggleStarred(wordId);
    } catch {
      // Revert on failure
      set({
        words: get().words.map((w) =>
          w.id === wordId ? { ...w, starred: prev.starred } : w
        ),
      });
    }
  },

  revealChinese: async (wordId) => {
    // Optimistic update — one-way, cannot un-reveal
    set({
      words: get().words.map((w) =>
        w.id === wordId ? { ...w, chineseRevealed: true } : w
      ),
    });
    try {
      await apiRevealChinese(wordId);
    } catch {
      // DB persist failed, but keep local state revealed for UX
    }
  },
}));
