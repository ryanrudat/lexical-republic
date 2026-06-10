import { create } from 'zustand';
import type { WeekSummary } from '../types/shifts';
import { fetchSeason } from '../api/shifts';

interface SeasonState {
  title: string;
  subtitle: string;
  weeks: WeekSummary[];
  narrativeRoute: string;
  loading: boolean;
  loadSeason: () => Promise<void>;
  reset: () => void;
}

export const useSeasonStore = create<SeasonState>((set) => ({
  title: '',
  subtitle: '',
  weeks: [],
  narrativeRoute: 'full',
  loading: false,

  loadSeason: async () => {
    set({ loading: true });
    try {
      const data = await fetchSeason();
      set({
        title: data.title,
        subtitle: data.subtitle,
        weeks: data.weeks,
        narrativeRoute: data.narrativeRoute ?? 'full',
        loading: false,
      });
    } catch {
      set({ loading: false });
    }
  },

  // Clear on logout so a second student on the same device doesn't inherit the
  // first student's week list / narrative route (loaders self-gate on weeks.length).
  reset: () =>
    set({ title: '', subtitle: '', weeks: [], narrativeRoute: 'full', loading: false }),
}));
