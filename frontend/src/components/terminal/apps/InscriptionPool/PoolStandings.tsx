import { useEffect, useState } from 'react';
import type { DrillDesk } from '../../../../types/inscription';

interface Props {
  desks: DrillDesk[];
  /** wordsCorrect by desk number (live state). Self updates locally, others via socket/ghost ticker. */
  liveProgress: Map<number, { wordsCorrect: number; finishedAt_ms: number | null }>;
  /** Total words in drill (denominator for progress bars). */
  wordCount: number;
  /** Per-desk keystroke pulse state. true = typing, false = idle. */
  typingByDesk?: Map<number, boolean>;
  selfDesk?: number;
}

const PULSE_OPACITY = { active: 1, idle: 0.25 };

export default function PoolStandings({
  desks,
  liveProgress,
  wordCount,
  typingByDesk,
  selfDesk = 1,
}: Props) {
  // Smooth-animate ghost desk progress between completion events
  const [, forceRender] = useState(0);

  useEffect(() => {
    let raf: number;
    const tick = () => {
      // Re-render each frame so ghost interpolation stays smooth.
      forceRender((n) => (n + 1) & 0xff);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Compute ranking for leader pulse
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

  return (
    <section className="rounded-lg border border-[#5BB8B0]/30 bg-[#04181B]/70 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="font-ibm-mono text-[10px] text-[#5BB88C] tracking-[0.3em] uppercase">
          ◀ Pool Standings · live ◀
        </p>
        <span className="font-ibm-mono text-[10px] text-[#82B0B5] tracking-wider">
          {desks.length} desks
        </span>
      </div>

      <ul className="space-y-2">
        {desks.map((d) => {
          const live = liveProgress.get(d.desk);
          const wordsCorrect = live?.wordsCorrect ?? d.wordsCorrect;
          const isLeader = d.desk === leaderDesk && wordsCorrect > 0;
          const isSelf = d.desk === selfDesk;
          const isTyping = typingByDesk?.get(d.desk) ?? false;
          const pct = wordCount > 0 ? Math.min(100, (wordsCorrect / wordCount) * 100) : 0;

          return (
            <li
              key={d.desk}
              className={`flex items-center gap-3 rounded px-2 py-1.5 transition-colors ${
                isLeader ? 'bg-amber-500/10 ring-1 ring-amber-300/30' : ''
              }`}
            >
              <span className="font-ibm-mono text-[9px] text-[#5BB88C] tracking-wider w-7 shrink-0">
                D{d.desk}
              </span>
              <span className="font-ibm-mono text-[11px] text-[#D4E8E5] tracking-wider w-20 shrink-0">
                {d.citizenNumber}
              </span>
              <span
                className="font-mono text-[14px] w-4 shrink-0 transition-opacity"
                style={{ opacity: isTyping ? PULSE_OPACITY.active : PULSE_OPACITY.idle }}
                aria-hidden
              >
                ⌨
              </span>

              {/* Progress bar */}
              <div className="flex-1 h-3 bg-[#0A2A2E] rounded overflow-hidden relative">
                <div
                  className={`h-full transition-all duration-300 ${
                    isSelf ? 'bg-sky-400' : isLeader ? 'bg-amber-400' : 'bg-[#5BB8B0]'
                  }`}
                  style={{ width: `${pct}%` }}
                />
                {d.isGhost && (
                  <div
                    className="absolute inset-0 pointer-events-none opacity-30"
                    style={{
                      background:
                        'repeating-linear-gradient(0deg, rgba(255,255,255,0.05) 0px, transparent 2px)',
                    }}
                  />
                )}
              </div>

              <span className="font-ibm-mono text-[10px] text-[#D4E8E5] tracking-wider w-12 text-right shrink-0">
                {wordsCorrect}/{wordCount}
              </span>
              <span className="font-ibm-mono text-[9px] tracking-wider w-12 text-right shrink-0">
                {isSelf ? (
                  <span className="text-sky-400">(you)</span>
                ) : isLeader ? (
                  <span className="text-amber-400">▲ 1st</span>
                ) : (
                  <span className="text-[#82B0B5]/60">&nbsp;</span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
