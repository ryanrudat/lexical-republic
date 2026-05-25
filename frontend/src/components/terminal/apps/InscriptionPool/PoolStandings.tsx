import type { DrillDesk } from '../../../../types/inscription';

// ─── PoolStandings (Racing Track) ─────────────────────────────────
//
// One row per citizen with a horizontal lane that fills left to
// right as they finish words. The student sees at a glance who's
// ahead, how far, and whether they're catching up.
//
// Each lane is a fixed-width row of monospace characters:
//   ▸▸▸▸▸▸▸▶·······   wordsCorrect / wordCount
//
// ▸ marks completed positions, ▶ is the current position, · is
// remaining. The lane width is fixed (LANE_CELLS) regardless of
// wordCount so all citizens' positions are visually comparable.

const LANE_CELLS = 24;

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
  // Compute ranking (most words → highest rank; tiebreaker on finish time)
  const ranked = [...desks]
    .map((d) => {
      const live = liveProgress.get(d.desk);
      return {
        desk: d.desk,
        wordsCorrect: live?.wordsCorrect ?? d.wordsCorrect,
        finishedAt_ms: live?.finishedAt_ms ?? d.finishedAt_ms,
      };
    })
    .sort((a, b) => {
      if (a.wordsCorrect !== b.wordsCorrect) return b.wordsCorrect - a.wordsCorrect;
      const aFin = a.finishedAt_ms ?? Number.MAX_SAFE_INTEGER;
      const bFin = b.finishedAt_ms ?? Number.MAX_SAFE_INTEGER;
      return aFin - bFin;
    });
  const leaderDesk = ranked[0]?.desk ?? null;
  const leaderHasProgress = (ranked[0]?.wordsCorrect ?? 0) > 0;

  return (
    <div className="space-y-1">
      {desks.map((d) => {
        const live = liveProgress.get(d.desk);
        const wordsCorrect = live?.wordsCorrect ?? d.wordsCorrect;
        const isSelf = d.desk === selfDesk;
        const isTyping = typingByDesk?.get(d.desk) ?? false;
        const finished = wordsCorrect >= wordCount;
        const isLeader = d.desk === leaderDesk && leaderHasProgress;

        // Position on the lane: 0..LANE_CELLS
        const ratio = wordCount > 0 ? Math.min(1, wordsCorrect / wordCount) : 0;
        const position = Math.floor(ratio * LANE_CELLS);

        // Color cues — self always bright, leader gets a hint, others dim
        const labelColor = isSelf
          ? 'phosphor-text-bright phosphor-glow'
          : isLeader
          ? 'phosphor-text phosphor-glow'
          : 'phosphor-text-dim';
        const markerColor = isSelf
          ? 'phosphor-text-bright phosphor-glow'
          : 'phosphor-text';
        const trackColor = isSelf
          ? 'phosphor-text'
          : 'phosphor-text-dim';

        return (
          <div
            key={d.desk}
            className="grid grid-cols-[110px_1fr_60px_18px] gap-3 items-center text-[12px] leading-snug"
          >
            {/* Citizen name */}
            <span className={`${labelColor} tracking-wider tabular-nums truncate`}>
              {d.citizenNumber}
              {isSelf && <span className="phosphor-text-dim ml-1">(you)</span>}
            </span>

            {/* Lane visualization — monospace cells */}
            <div className="flex font-mono text-[14px]" aria-label={`${wordsCorrect} of ${wordCount} words`}>
              {Array.from({ length: LANE_CELLS }).map((_, i) => {
                if (finished) {
                  return <span key={i} className={`${trackColor} px-px`}>▸</span>;
                }
                if (i < position) {
                  return <span key={i} className={`${trackColor} px-px`}>▸</span>;
                }
                if (i === position) {
                  return (
                    <span
                      key={i}
                      className={`${markerColor} px-px ${isTyping && !isSelf ? 'animate-pulse' : ''}`}
                    >
                      ▶
                    </span>
                  );
                }
                return <span key={i} className="phosphor-text-faint px-px">·</span>;
              })}
            </div>

            {/* Count */}
            <span className={`${labelColor} tabular-nums text-right tracking-wider`}>
              {wordsCorrect}/{wordCount}
            </span>

            {/* Leader indicator */}
            <span className={`text-right ${isLeader && !isSelf ? 'phosphor-text-bright phosphor-glow' : 'phosphor-text-faint'}`}>
              {finished ? '✓' : isLeader ? '▲' : ' '}
            </span>
          </div>
        );
      })}
    </div>
  );
}
