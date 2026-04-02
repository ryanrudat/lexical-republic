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
}));
