import { useMemo, useState } from 'react';
import type { ComprehensionActivity as Activity } from '../../data/spyFiles';

// ─── Read the Meaning ────────────────────────────────────────────
//
// One inference question about what a file proves (e.g. the confiscated
// photo → it proves 9020 had a relative). Forgiving: a wrong pick is
// nudged, not penalised; the student keeps choosing until it's right.

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

interface Props {
  activity: Activity;
  onComplete: () => void;
}

export default function ComprehensionActivity({ activity, onComplete }: Props) {
  // Shuffle which original option sits at each displayed position.
  const order = useMemo(
    () => shuffle(activity.options.map((_, i) => i)),
    [activity.options],
  );
  const [wrong, setWrong] = useState<Set<number>>(new Set());
  const [solved, setSolved] = useState(false);

  const choose = (displayIdx: number) => {
    if (solved) return;
    const originalIdx = order[displayIdx]!;
    if (originalIdx === activity.correctIndex) {
      setSolved(true);
    } else {
      setWrong((prev) => new Set(prev).add(displayIdx));
    }
  };

  return (
    <div className="font-ibm-mono text-sm text-slate-200">
      <p className="text-slate-400 leading-relaxed mb-1">
        <span className="text-rose-400/60">&gt;</span> {activity.prompt}
      </p>
      <p className="text-slate-100 leading-relaxed mb-5">{activity.question}</p>

      <div className="space-y-2.5 mb-5">
        {order.map((originalIdx, displayIdx) => {
          const isCorrect = solved && originalIdx === activity.correctIndex;
          const isWrong = wrong.has(displayIdx);
          return (
            <button
              key={displayIdx}
              onClick={() => choose(displayIdx)}
              disabled={solved || isWrong}
              className={`block w-full text-left px-4 py-3 rounded-xl border text-[13px] leading-snug transition-all active:scale-[0.99] ${
                isCorrect
                  ? 'border-emerald-400 bg-emerald-500/10 text-emerald-200'
                  : isWrong
                  ? 'border-slate-800 bg-slate-900 text-slate-600 line-through'
                  : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-rose-400/60'
              }`}
            >
              {activity.options[originalIdx]}
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
        <p className="text-center text-xs min-h-[1.25rem]">
          {wrong.size > 0 ? (
            <span className="text-rose-400">&gt; not that. look at the photo again.</span>
          ) : (
            <span className="text-slate-600">&gt; choose what it proves.</span>
          )}
        </p>
      )}
    </div>
  );
}
