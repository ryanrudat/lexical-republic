// Tracks whether the running JS bundle is older than the deployed one.
// Set by `useUpdateChecker`, read by the App-root `UpdateBanner`.

import { create } from 'zustand';

interface UpdateState {
  /** Build ID baked into the running bundle at compile time. */
  currentBuildId: string;
  /** Build ID returned by the most recent `/version.json` poll, when different. */
  latestBuildId: string | null;
  /** True when latestBuildId !== currentBuildId. The banner reads this. */
  updateAvailable: boolean;
  /** Idempotent setter so the polling hook can call it without flicker. */
  noteLatestBuildId: (id: string) => void;
}

const RUNNING_BUILD_ID =
  typeof __BUILD_ID__ !== 'undefined' && __BUILD_ID__ ? __BUILD_ID__ : 'dev';

export const useUpdateStore = create<UpdateState>((set, get) => ({
  currentBuildId: RUNNING_BUILD_ID,
  latestBuildId: null,
  updateAvailable: false,
  noteLatestBuildId: (id: string) => {
    if (!id) return;
    const cur = get().currentBuildId;
    // Don't flag in dev — the running build is "dev", any real build looks newer
    // and would constantly suggest reload during local development.
    if (cur === 'dev') return;
    if (id === cur) return;
    if (get().latestBuildId === id) return;
    set({ latestBuildId: id, updateAvailable: true });
  },
}));
