import { useEffect, useState } from 'react';
import type { DrillDesk } from '../../../../types/inscription';

interface UseGhostTickerOpts {
  desks: DrillDesk[];
  wordCount: number;
  drillStartedAt_ms: number | null;
  totalPausedMs: number;
  pausedAt_ms: number | null;
}

interface TickerState {
  /** Map<deskNumber, { wordsCorrect, finishedAt_ms } > — live progress for ghosts */
  ghostProgress: Map<number, { wordsCorrect: number; finishedAt_ms: number | null }>;
  /** Map<deskNumber, boolean> — true if ghost is "actively typing" right now */
  ghostTyping: Map<number, boolean>;
}

/**
 * Replay ghost timings client-side using requestAnimationFrame.
 *
 * For each ghost desk:
 *   - Read pre-baked wordTimings from the drill payload
 *   - Compute "elapsed since drill start" each frame (accounting for pause time)
 *   - Mark words completed where finishedAt_ms <= elapsed
 *   - Synthesize a typing pulse from keystrokeLog if available; otherwise
 *     presume typing between word boundaries with a small idle gap before each completion.
 */
export function useGhostTicker(opts: UseGhostTickerOpts): TickerState {
  const { desks, wordCount, drillStartedAt_ms, totalPausedMs, pausedAt_ms } = opts;
  const [tick, setTick] = useState(0);

  // 10fps via setInterval — plenty for the "is this ghost typing?" pulse
  // (humans can't perceive faster updates on a small indicator). The prior
  // requestAnimationFrame loop ran at 60fps, which cascaded re-renders into
  // the parent drill subtree (including the text input) and made keystrokes
  // queue up behind paints, causing the input to feel frozen on longer drills.
  useEffect(() => {
    if (!drillStartedAt_ms) return;
    const id = setInterval(() => {
      setTick((n) => (n + 1) & 0xffff);
    }, 100);
    return () => clearInterval(id);
  }, [drillStartedAt_ms]);

  if (!drillStartedAt_ms) {
    return { ghostProgress: new Map(), ghostTyping: new Map() };
  }

  const now = Date.now();
  const pausedExtra = pausedAt_ms ? now - pausedAt_ms : 0;
  const elapsedMs = Math.max(0, now - drillStartedAt_ms - totalPausedMs - pausedExtra);

  const ghostProgress = new Map<number, { wordsCorrect: number; finishedAt_ms: number | null }>();
  const ghostTyping = new Map<number, boolean>();

  for (const d of desks) {
    if (!d.isGhost) continue;
    let completed = 0;
    let lastFinished = 0;
    for (const t of d.wordTimings) {
      if (t.finishedAt_ms <= elapsedMs && t.correct) {
        completed += 1;
        lastFinished = t.finishedAt_ms;
      } else break;
    }
    const finishedAt_ms =
      completed === wordCount && d.wordTimings[wordCount - 1]
        ? d.wordTimings[wordCount - 1].finishedAt_ms
        : null;
    ghostProgress.set(d.desk, { wordsCorrect: completed, finishedAt_ms });

    // Typing pulse: synthesize from keystrokeLog if present, otherwise
    // presume typing in the 70% interval before the next word completion.
    let typing = false;
    if (d.keystrokeLog && d.keystrokeLog.length > 0) {
      typing = d.keystrokeLog.some(
        (k) => Math.abs(k.t_ms - elapsedMs) < 600,
      );
    } else if (completed < wordCount && d.wordTimings[completed]) {
      const nextFinish = d.wordTimings[completed].finishedAt_ms;
      const wordStart = lastFinished;
      const window = nextFinish - wordStart;
      if (window > 0) {
        // Typing during 30%..95% of the window; idle in the first 30%
        const into = (elapsedMs - wordStart) / window;
        typing = into > 0.3 && into < 0.95;
      }
    }
    ghostTyping.set(d.desk, typing);
  }

  // Discourage "tick" being marked unused — React requires the state for re-render
  void tick;

  return { ghostProgress, ghostTyping };
}
