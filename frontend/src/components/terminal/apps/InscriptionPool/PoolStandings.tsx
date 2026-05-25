import type { DrillDesk } from '../../../../types/inscription';

// ─── PoolStandings ───────────────────────────────────────────────
//
// Single horizontal row of citizen IDs along the bottom of the drill
// screen. Each citizen is shown brighter when actively typing, struck
// through when finished. Replaces the prior multi-row progress-bar
// list. Matches the user's preview mock:
//   C-4488  ||  C-1102  ||  C-7715  ||  C-2840
//
// Renders inside the parent's .crt-amber-monitor + .pixel-mono. Does
// NOT run its own animation loop — relies on parent re-renders driven
// by the 10fps ghost ticker for typing-pulse updates.

interface Props {
  desks: DrillDesk[];
  liveProgress: Map<number, { wordsCorrect: number; finishedAt_ms: number | null }>;
  wordCount: number;
  typingByDesk?: Map<number, boolean>;
  selfDesk?: number;
}

export default function PoolStandings({
  desks,
  liveProgress,
  wordCount,
  typingByDesk,
  selfDesk = 1,
}: Props) {
  return (
    <div>
      <p className="amber-text-dim text-[11px] uppercase tracking-[0.4em] mb-3 text-center">
        — Pool —
      </p>
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
        {desks.map((d, idx) => {
          const live = liveProgress.get(d.desk);
          const wordsCorrect = live?.wordsCorrect ?? d.wordsCorrect;
          const isSelf = d.desk === selfDesk;
          const isTyping = typingByDesk?.get(d.desk) ?? false;
          const finished = wordsCorrect >= wordCount;

          // Visual states (ranked by importance):
          //   finished  → strikethrough, dim
          //   self      → always bright
          //   typing    → bright with subtle glow
          //   idle      → dim
          const colorClass = finished
            ? 'amber-text-faint line-through'
            : isSelf
            ? 'amber-text-bright amber-glow'
            : isTyping
            ? 'amber-text amber-glow'
            : 'amber-text-dim';

          return (
            <span key={d.desk} className="flex items-center gap-3">
              {idx > 0 && (
                <span className="amber-text-faint" aria-hidden>
                  ||
                </span>
              )}
              <span className={`text-base tracking-wider ${colorClass}`}>
                {d.citizenNumber}
                {finished && <span className="ml-1">✓</span>}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
