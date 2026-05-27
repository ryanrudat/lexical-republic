import { useMemo, useState } from 'react';
import type { ListeningActivity as Activity } from '../../data/spyFiles';
import { useSpeech } from '../../hooks/useSpeech';

// ─── Clean the Intercept ─────────────────────────────────────────
//
// A damaged "recording": the browser voice reads the full script aloud
// (listening practice, on-theme synthetic playback), and the student fills
// the gaps from a word bank. Also solvable from context + grammar, so a
// device with no speech never traps anyone. Forgiving — wrong placement
// bounces back, no penalty.

type Segment = { type: 'text'; text: string } | { type: 'blank'; index: number };

function parseLine(line: string): Segment[] {
  const segs: Segment[] = [];
  const regex = /\{(\d+)\}/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(line)) !== null) {
    if (m.index > last) segs.push({ type: 'text', text: line.slice(last, m.index) });
    segs.push({ type: 'blank', index: parseInt(m[1]!, 10) });
    last = regex.lastIndex;
  }
  if (last < line.length) segs.push({ type: 'text', text: line.slice(last) });
  return segs;
}

interface Props {
  activity: Activity;
  onComplete: () => void;
}

export default function ListeningActivity({ activity, onComplete }: Props) {
  const { speak, supported } = useSpeech();
  const [placements, setPlacements] = useState<Record<number, string>>({});
  const [locked, setLocked] = useState<Set<number>>(new Set());
  const [selected, setSelected] = useState<string | null>(null);
  const [wrongBlank, setWrongBlank] = useState<number | null>(null);

  const lines = useMemo(
    () => activity.template.split('\n').map(parseLine),
    [activity.template],
  );

  const answerFor = (blankIndex: number) =>
    activity.blanks.find((b) => b.index === blankIndex)?.answer;
  const usedWords = useMemo(
    () => new Set(Object.values(placements)),
    [placements],
  );
  const allLocked = locked.size === activity.blanks.length;

  const tryPlace = (blankIndex: number) => {
    if (locked.has(blankIndex) || !selected) return;
    if (selected === answerFor(blankIndex)) {
      setPlacements((p) => ({ ...p, [blankIndex]: selected }));
      setLocked((l) => new Set(l).add(blankIndex));
      setSelected(null);
    } else {
      setWrongBlank(blankIndex);
      setTimeout(() => setWrongBlank(null), 400);
      setSelected(null);
    }
  };

  return (
    <div className="font-ibm-mono text-sm text-slate-200">
      <p className="text-slate-400 leading-relaxed mb-3">
        <span className="text-rose-400/60">&gt;</span> {activity.prompt}
      </p>

      {supported && (
        <button
          onClick={() => speak(activity.script)}
          className="mb-4 inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2 text-[11px] text-slate-300 tracking-wider uppercase hover:border-rose-400 hover:text-rose-300 active:scale-95 transition-all"
        >
          ▶ play recording
        </button>
      )}

      {/* Transcript with gaps */}
      <div className="space-y-1.5 mb-5 leading-relaxed">
        {lines.map((segs, li) => (
          <p key={li} className="text-slate-300">
            {segs.map((seg, si) =>
              seg.type === 'text' ? (
                <span key={si}>{seg.text}</span>
              ) : locked.has(seg.index) ? (
                <span key={si} className="text-emerald-300">[ {placements[seg.index]} ]</span>
              ) : (
                <button
                  key={si}
                  onClick={() => tryPlace(seg.index)}
                  className={`mx-0.5 px-1 transition-colors ${
                    wrongBlank === seg.index
                      ? 'text-rose-400 animate-resist-shake'
                      : selected
                      ? 'text-rose-300'
                      : 'text-slate-500'
                  }`}
                >
                  [ ___ ]
                </button>
              ),
            )}
          </p>
        ))}
      </div>

      {!allLocked && (
        <>
          <p className="text-slate-500 text-xs mb-3 lowercase">
            {selected ? (
              <>&gt; tap a gap to drop <span className="text-rose-400">{selected}</span>.</>
            ) : (
              <>&gt; tap a word, then a gap.</>
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            {activity.wordBank.map((word) => {
              const used = usedWords.has(word);
              const isSel = selected === word;
              return (
                <button
                  key={word}
                  onClick={() => !used && setSelected(word)}
                  disabled={used}
                  className={`lowercase tracking-wider transition-colors px-1 ${
                    used
                      ? 'text-slate-700 cursor-default'
                      : isSel
                      ? 'text-rose-400'
                      : 'text-slate-300 hover:text-rose-300'
                  }`}
                >
                  [ {word} ]
                </button>
              );
            })}
          </div>
        </>
      )}

      {allLocked && (
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
      )}
    </div>
  );
}
