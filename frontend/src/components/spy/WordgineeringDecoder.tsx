import { useEffect, useMemo, useRef, useState } from 'react';
import type { DecoderActivity } from '../../data/spyFiles';

// ─── Wordgineering Decoder ───────────────────────────────────────
//
// The extraction activity for files written in Party "wordgineering" —
// language engineered to hide meaning. A
// resistance tool (dark-slate, rose accents — the [ ].edited world): the
// Party euphemism sits at the wheel's centre, the possible meanings sit
// around the ring, and a needle spins to your choice. Land on the hidden
// TRUTH (not the innocent "mask" meaning) to crack each word.
//
// Educational core: vocabulary (real, TOEIC-flavoured words) + euphemism
// inference (the trap option is always the harmless surface meaning, so the
// skill is reading past it). Forgiving — wrong = retry, no penalty. Once all
// words are cracked the text is shown in plain English (reading payoff).

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

interface Props {
  activity: DecoderActivity;
  onComplete: () => void;
}

export default function WordgineeringDecoder({ activity, onComplete }: Props) {
  const [itemIndex, setItemIndex] = useState(0);
  const [pointerIndex, setPointerIndex] = useState(0);
  const [feedback, setFeedback] = useState<'idle' | 'wrong' | 'locked'>('idle');
  const [done, setDone] = useState(false);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const item = activity.items[itemIndex]!;
  const options = useMemo(() => shuffle(item.options), [item.options]);
  const correctIndex = options.indexOf(item.truth);
  const N = options.length;
  const step = 360 / N;
  const R = 92; // px radius for option placement

  useEffect(() => {
    return () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
    };
  }, []);

  if (done) {
    return (
      <div className="font-ibm-mono text-sm text-slate-200">
        <p className="text-rose-400 text-xs tracking-[0.3em] uppercase mb-4">decoded</p>
        <div className="space-y-1 text-slate-200 leading-relaxed mb-6">
          {activity.plainText.map((line, i) => (
            <p key={i} className={i === 0 ? 'text-slate-500 lowercase' : ''}>{line}</p>
          ))}
        </div>
        <button
          onClick={onComplete}
          className="rounded-lg border border-rose-400 bg-rose-500/10 px-4 py-2.5 text-rose-300 tracking-wider uppercase text-xs hover:bg-rose-500/20 active:scale-[0.98] transition-all"
        >
          ▸ send to [ ]
        </button>
        <p className="text-rose-400/70 text-xs mt-6">— F</p>
      </div>
    );
  }

  const rotate = (dir: 1 | -1) => {
    if (feedback === 'locked') return;
    setPointerIndex((p) => (p + dir + N) % N);
    if (feedback === 'wrong') setFeedback('idle');
  };

  const lock = () => {
    if (feedback === 'locked') return;
    if (pointerIndex === correctIndex) {
      setFeedback('locked');
      advanceTimer.current = setTimeout(() => {
        if (itemIndex + 1 >= activity.items.length) {
          setDone(true);
        } else {
          setItemIndex((i) => i + 1);
          setPointerIndex(0);
          setFeedback('idle');
        }
      }, 1700);
    } else {
      setFeedback('wrong');
      setTimeout(() => setFeedback('idle'), 500);
    }
  };

  return (
    <div className="font-ibm-mono text-sm text-slate-200">
      <p className="text-rose-400 text-[10px] tracking-[0.3em] uppercase mb-3">▸ wordgineering</p>
      {/* Prompt + progress */}
      <p className="text-slate-400 leading-relaxed mb-1">
        <span className="text-rose-400/60">&gt;</span> {activity.prompt}
      </p>
      <p className="text-slate-600 text-xs mb-5">
        &gt; word {itemIndex + 1} / {activity.items.length}
      </p>

      {/* The wheel */}
      <div className="flex justify-center mb-4">
        <div
          className={`relative ${feedback === 'wrong' ? 'animate-resist-shake' : ''}`}
          style={{ width: 240, height: 240 }}
        >
          {/* Ring */}
          <div className="absolute inset-2 rounded-full border border-slate-700" />
          <div className="absolute inset-8 rounded-full border border-dashed border-slate-800" />

          {/* Fixed pointer mark at top */}
          <div className="absolute left-1/2 -translate-x-1/2 -top-1 text-rose-400 text-xs">▼</div>

          {/* Needle — spins to the selected option */}
          <div
            className="absolute left-1/2 top-1/2 origin-bottom"
            style={{
              width: 2,
              height: R,
              marginLeft: -1,
              marginTop: -R,
              background: feedback === 'locked' ? '#34d399' : '#fb7185',
              transform: `rotate(${pointerIndex * step}deg)`,
              transition: 'transform 320ms cubic-bezier(0.34, 1.4, 0.64, 1)',
            }}
          />

          {/* Centre: the Party word being decoded */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center w-28">
            <p className="text-[9px] text-slate-500 tracking-[0.25em] uppercase mb-1">they wrote</p>
            <p className="text-rose-300 text-[13px] tracking-wider leading-tight break-words">
              {item.code}
            </p>
          </div>

          {/* Options around the ring */}
          {options.map((opt, i) => {
            const angle = (i * step * Math.PI) / 180;
            const x = Math.sin(angle) * R;
            const y = -Math.cos(angle) * R;
            const selected = i === pointerIndex;
            return (
              <div
                key={opt}
                className="absolute w-24 text-center"
                style={{
                  left: `calc(50% + ${x}px)`,
                  top: `calc(50% + ${y}px)`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <span
                  className={`text-[10px] leading-tight transition-colors ${
                    selected
                      ? feedback === 'locked'
                        ? 'text-emerald-300'
                        : 'text-rose-300'
                      : 'text-slate-500'
                  }`}
                >
                  {opt}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Controls */}
      {feedback === 'locked' ? (
        <p className="text-emerald-300/90 text-xs leading-relaxed text-center min-h-[2.5rem]">
          {item.note}
        </p>
      ) : (
        <>
          <div className="flex items-center justify-center gap-3 mb-3">
            <button
              onClick={() => rotate(-1)}
              className="rounded-lg border border-slate-700 px-4 py-2 text-slate-300 hover:border-rose-400 hover:text-rose-300 active:scale-95 transition-all"
              aria-label="rotate left"
            >
              ◄
            </button>
            <button
              onClick={lock}
              className="rounded-lg border border-rose-400 bg-rose-500/10 px-5 py-2 text-rose-300 tracking-wider uppercase text-xs hover:bg-rose-500/20 active:scale-95 transition-all"
            >
              decode
            </button>
            <button
              onClick={() => rotate(1)}
              className="rounded-lg border border-slate-700 px-4 py-2 text-slate-300 hover:border-rose-400 hover:text-rose-300 active:scale-95 transition-all"
              aria-label="rotate right"
            >
              ►
            </button>
          </div>
          <p className="text-center text-xs min-h-[1.25rem]">
            {feedback === 'wrong' ? (
              <span className="text-rose-400">&gt; that's the mask, not the truth. spin again.</span>
            ) : (
              <span className="text-slate-600">&gt; spin to what they're really hiding.</span>
            )}
          </p>
        </>
      )}
    </div>
  );
}
