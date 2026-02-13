import { create } from 'zustand';
import type { WeekSummary } from '../types/shifts';
import { fetchSeason } from '../api/shifts';

interface SeasonState {
  title: string;
  subtitle: string;
  weeks: WeekSummary[];
  loading: boolean;
  loadSeason: () => Promise<void>;
}

export const useSeasonStore = create<SeasonState>((set) => ({
  title: '',
  subtitle: '',
  weeks: [],
  loading: false,

  loadSeason: async () => {
    set({ loading: true });
    try {
      const data = await fetchSeason();
      set({ title: data.title, subtitle: data.subtitle, weeks: data.weeks, loading: false });
    } catch {
      set({ loading: false });
    }
  },
}));
