import { useMemo, useState } from 'react';
import type { SpotEditActivity as Activity } from '../../data/spyFiles';

// ─── Spot the Edit ───────────────────────────────────────────────
//
// Compare the original (recovered) record against the Party's revised
// (official) version, then select everything they erased. Reading-
// comparison practice. Forgiving — a wrong selection is nudged, and the
// student adjusts and re-checks freely.

interface Props {
  activity: Activity;
  onComplete: () => void;
}

export default function SpotEditActivity({ activity, onComplete }: Props) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [tried, setTried] = useState(false);
  const [solved, setSolved] = useState(false);

  const correctCount = useMemo(
    () => activity.claims.filter((c) => c.changed).length,
    [activity.claims],
  );

  const toggle = (i: number) => {
    if (solved) return;
    setTried(false);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const check = () => {
    const right =
      activity.claims.every((c, i) => c.changed === selected.has(i));
    if (right) setSolved(true);
    else setTried(true);
  };

  return (
    <div className="font-ibm-mono text-sm text-slate-200">
      <p className="text-slate-400 leading-relaxed mb-4">
        <span className="text-rose-400/60">&gt;</span> {activity.prompt}
      </p>

      {/* Original vs revised */}
      <div className="space-y-2 mb-5">
        <Panel label="ORIGINAL · recovered" tone="truth" lines={activity.before} />
        <Panel label="REVISED · official" tone="lie" lines={activity.after} />
      </div>

      {/* Claims to select */}
      <div className="space-y-2 mb-4">
        {activity.claims.map((claim, i) => {
          const on = selected.has(i);
          return (
            <button
              key={i}
              onClick={() => toggle(i)}
              disabled={solved}
              className={`flex w-full items-center gap-2.5 text-left px-3 py-2.5 rounded-lg border text-[12px] leading-snug transition-all active:scale-[0.99] ${
                on
                  ? 'border-rose-400 bg-rose-500/10 text-rose-200'
                  : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-rose-400/50'
              }`}
            >
              <span className={on ? 'text-rose-400' : 'text-slate-600'}>
                {on ? '☒' : '☐'}
              </span>
              {claim.text}
            </button>
          );
        })}
      </div>

      {solved ? (
        <div>
          {activity.note && (
            <p className="text-emerald-300/90 text-xs leading-relaxed mb-4">
              {activity.note}
            </p>
          )}
          <button
            onClick={onComplete}
            className="rounded-lg border border-rose-400 bg-rose-500/10 px-4 py-2.5 text-rose-300 tracking-wider uppercase text-xs hover:bg-rose-500/20 active:scale-[0.98] transition-all"
          >
            ▸ send to [ ]
          </button>
        </div>
      ) : (
        <>
          <button
            onClick={check}
            disabled={selected.size === 0}
            className="rounded-lg border border-rose-400 bg-rose-500/10 px-5 py-2 text-rose-300 tracking-wider uppercase text-xs hover:bg-rose-500/20 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            confirm
          </button>
          <p className="text-center text-xs mt-3 min-h-[1.25rem]">
            {tried ? (
              <span className="text-rose-400">
                &gt; not quite. they erased {correctCount} things — look again.
              </span>
            ) : (
              <span className="text-slate-600">&gt; select what the revised version removed.</span>
            )}
          </p>
        </>
      )}
    </div>
  );
}

function Panel({
  label,
  tone,
  lines,
}: {
  label: string;
  tone: 'truth' | 'lie';
  lines: string[];
}) {
  const truth = tone === 'truth';
  return (
    <div
      className={`rounded-lg border px-3 py-2.5 ${
        truth ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-slate-700 bg-slate-900'
      }`}
    >
      <p
        className={`text-[9px] tracking-[0.2em] uppercase mb-1.5 ${
          truth ? 'text-emerald-400/80' : 'text-slate-500'
        }`}
      >
        {label}
      </p>
      <div className="space-y-0.5 text-[12px] text-slate-300 leading-relaxed">
        {lines.map((line, i) => (
          <p key={i}>{line}</p>
        ))}
      </div>
    </div>
  );
}
