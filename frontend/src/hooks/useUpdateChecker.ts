// Polls `/version.json` on a schedule and on tab focus. When the fetched
// buildId differs from the running bundle's build ID, `useUpdateStore`
// flips `updateAvailable` to true and the App-root banner appears.
//
// Cache-busting is handled at the server level via `serve.json` (no-cache
// header on `/version.json`); the `?t=` cache-buster here is belt-and-suspenders
// against any intermediate proxy that might still cache the response.

import { useEffect } from 'react';
import { useUpdateStore } from '../stores/updateStore';

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

async function fetchVersion(): Promise<string | null> {
  try {
    const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = (await res.json()) as { buildId?: unknown };
    return typeof data.buildId === 'string' ? data.buildId : null;
  } catch {
    return null;
  }
}

export function useUpdateChecker() {
  const note = useUpdateStore((s) => s.noteLatestBuildId);
  const currentBuildId = useUpdateStore((s) => s.currentBuildId);

  useEffect(() => {
    // Skip in local dev where there's no `version.json` to poll and the
    // running build is the literal string "dev".
    if (currentBuildId === 'dev') return;

    let cancelled = false;
    const check = async () => {
      const id = await fetchVersion();
      if (!cancelled && id) note(id);
    };

    void check();
    const interval = setInterval(check, POLL_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void check();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [currentBuildId, note]);
}
