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

// Load epoch — a season fetch that outlives logout must not restore student
// A's weeks (clockedOut/unlock state routes B's auto-navigation).
let loadEpoch = 0;

export const useSeasonStore = create<SeasonState>((set) => ({
  title: '',
  subtitle: '',
  weeks: [],
  narrativeRoute: 'full',
  loading: false,

  loadSeason: async () => {
    const epoch = ++loadEpoch;
    set({ loading: true });
    try {
      const data = await fetchSeason();
      if (epoch !== loadEpoch) return; // superseded by reset()/newer load
      set({
        title: data.title,
        subtitle: data.subtitle,
        weeks: data.weeks,
        narrativeRoute: data.narrativeRoute ?? 'full',
        loading: false,
      });
    } catch {
      if (epoch !== loadEpoch) return;
      set({ loading: false });
    }
  },

  // Clear on logout so a second student on the same device doesn't inherit the
  // first student's week list / narrative route (loaders self-gate on weeks.length).
  reset: () => {
    loadEpoch++; // invalidate in-flight loads
    set({ title: '', subtitle: '', weeks: [], narrativeRoute: 'full', loading: false });
  },
}));
