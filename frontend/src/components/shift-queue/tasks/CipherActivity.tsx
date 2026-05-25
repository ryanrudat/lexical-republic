import { useState, useCallback, useRef, useMemo } from 'react';
import { usePearlStore } from '../../../stores/pearlStore';
import { useShiftQueueStore } from '../../../stores/shiftQueueStore';
import { useStudentStore } from '../../../stores/studentStore';
import { useTapOrDrag } from './shared/useTapOrDrag';
import type { TaskProps } from '../../../types/shiftQueue';
import type { TaskAnswerLogEntry } from '../../../types/taskResult';

// ─── Cipher Activity ────────────────────────────────────────────
//
// W4 cipher task (`cloze_fill_w4`) rendered inside the `[ ].edited`
// app's Cipher tab. Same scoring + lifecycle as ClozeFill; different
// visual register — dead-internet / image-board aesthetic, dark slate,
// monospace, `[ ]` brackets where underscores would normally go.
//
// The pearlBarkOnComplete here is treated as an Unedited bark (Frey
// register), not PEARL. Frontend renders accordingly — no PEARL eye,
// no Party chrome.

interface Blank {
  index: number;
  correctWord: string;
}

export default function CipherActivity({ config, onComplete }: TaskProps) {
  const passage = (config.passage as string) || '';
  const blanks = (config.blanks as Blank[]) || [];
  const wordBank = (config.wordBank as string[]) || [];
  const closingBark = config.pearlBarkOnComplete as string | undefined;

  const addConcern = useShiftQueueStore(s => s.addConcern);
  const lane = useStudentStore(s => s.user?.lane ?? 2);

  // Lane-aware attempts mirror ClozeFill: 3 / 2 / 1.
  const maxAttempts = lane === 1 ? 3 : lane === 3 ? 1 : 2;

  const [placements, setPlacements] = useState<Record<number, string>>({});
  const [locked, setLocked] = useState<Set<number>>(new Set());
  const [wrongFlash, setWrongFlash] = useState<number | null>(null);
  const [firstTryCorrect, setFirstTryCorrect] = useState<Set<number>>(new Set());
  const [attempted, setAttempted] = useState<Set<number>>(new Set());
  const [attemptCounts, setAttemptCounts] = useState<Record<number, number>>({});

  const lastWrongPickRef = useRef<Record<number, string>>({});

  const { selectedId, selectItem, clearSelection } = useTapOrDrag();

  const shuffledWordBank = useMemo(() => {
    const a = [...wordBank];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }, [wordBank]);

  const usedBankIndices = useMemo(() => {
    const indices = new Set<number>();
    const bankUsed = new Array(shuffledWordBank.length).fill(false);
    for (const blankIdx of locked) {
      const b = blanks.find((bl) => bl.index === blankIdx);
      if (!b) continue;
      for (let i = 0; i < shuffledWordBank.length; i++) {
        if (!bankUsed[i] && shuffledWordBank[i] === b.correctWord) {
          bankUsed[i] = true;
          indices.add(i);
          break;
        }
      }
    }
    return indices;
  }, [locked, blanks, shuffledWordBank]);

  const segments = useMemo(() => {
    const parts: Array<{ type: 'text'; text: string } | { type: 'blank'; index: number }> = [];
    const regex = /\{(\d+)\}/g;
    let lastEnd = 0;
    let match;
    while ((match = regex.exec(passage)) !== null) {
      if (match.index > lastEnd) {
        parts.push({ type: 'text', text: passage.slice(lastEnd, match.index) });
      }
      parts.push({ type: 'blank', index: parseInt(match[1], 10) });
      lastEnd = regex.lastIndex;
    }
    if (lastEnd < passage.length) {
      parts.push({ type: 'text', text: passage.slice(lastEnd) });
    }
    return parts;
  }, [passage]);

  const tryPlace = useCallback(
    (word: string, blankIndex: number) => {
      if (locked.has(blankIndex)) return;
      const blank = blanks.find((b) => b.index === blankIndex);
      if (!blank) return;

      if (word === blank.correctWord) {
        setPlacements((prev) => ({ ...prev, [blankIndex]: word }));
        setLocked((prev) => new Set(prev).add(blankIndex));
        if (!attempted.has(blankIndex)) {
          setFirstTryCorrect((prev) => new Set(prev).add(blankIndex));
        }
      } else {
        const newCount = (attemptCounts[blankIndex] ?? 0) + 1;
        setAttemptCounts(prev => ({ ...prev, [blankIndex]: newCount }));
        setAttempted((prev) => new Set(prev).add(blankIndex));
        lastWrongPickRef.current[blankIndex] = word;

        if (lane !== 1) addConcern(0.05);

        if (newCount >= maxAttempts) {
          if (lane === 1) addConcern(0.05);
          setWrongFlash(blankIndex);
          setTimeout(() => {
            setWrongFlash(null);
            setPlacements((prev) => ({ ...prev, [blankIndex]: blank.correctWord }));
            setLocked((prev) => new Set(prev).add(blankIndex));
          }, lane === 1 ? 1500 : 800);
        } else {
          setWrongFlash(blankIndex);
          setTimeout(() => setWrongFlash(null), 400);
        }
      }
      clearSelection();
    },
    [blanks, locked, attempted, attemptCounts, maxAttempts, lane, addConcern, clearSelection],
  );

  const handleBlankClick = useCallback(
    (blankIndex: number) => {
      if (locked.has(blankIndex) || !selectedId) return;
      tryPlace(selectedId, blankIndex);
    },
    [selectedId, locked, tryPlace],
  );

  const handleDrop = useCallback(
    (blankIndex: number, word: string) => {
      tryPlace(word, blankIndex);
    },
    [tryPlace],
  );

  const allFilled = locked.size === blanks.length;
  const hasCompleted = useRef(false);

  const buildBlankPrompt = useCallback(
    (blankIndex: number) => {
      const token = `{${blankIndex}}`;
      const fallback = `Blank ${blankIndex + 1}`;
      const tokenPos = passage.indexOf(token);
      if (tokenPos === -1) return fallback;

      const boundaries = ['. ', '! ', '? '];
      const before = passage.slice(0, tokenPos);
      const after = passage.slice(tokenPos + token.length);
      const sentenceStart = Math.max(...boundaries.map((b) => before.lastIndexOf(b)));
      const afterHits = boundaries
        .map((b) => after.indexOf(b))
        .filter((i) => i >= 0);

      const startIdx = sentenceStart >= 0 ? sentenceStart + 2 : 0;
      const endIdx =
        afterHits.length > 0
          ? tokenPos + token.length + Math.min(...afterHits) + 1
          : passage.length;

      const sentence = passage.slice(startIdx, endIdx).replace(token, '[ ]').trim();
      return sentence || fallback;
    },
    [passage],
  );

  if (allFilled && !hasCompleted.current) {
    hasCompleted.current = true;
    const score = firstTryCorrect.size / blanks.length;
    // Bark routes through pearlStore for the moment (same lifecycle hook
    // every task uses) but the closing message itself is Unedited-register
    // text. UI variant separation can come later if PEARL bark surface gets
    // a register flag.
    if (closingBark) {
      usePearlStore.getState().triggerBark('success', closingBark);
    }
    const answerLog: TaskAnswerLogEntry[] = blanks.map((blank) => {
      const wasCorrect = firstTryCorrect.has(blank.index);
      const lastWrong = lastWrongPickRef.current[blank.index];
      const chosen = !wasCorrect && lastWrong ? lastWrong : blank.correctWord;
      return {
        questionId: String(blank.index),
        prompt: buildBlankPrompt(blank.index),
        chosen,
        correct: blank.correctWord,
        wasCorrect,
        attempts: (attemptCounts[blank.index] ?? 0) + 1,
      };
    });
    setTimeout(() => {
      onComplete(score, {
        taskType: 'cloze_fill',
        itemsCorrect: firstTryCorrect.size,
        itemsTotal: blanks.length,
        category: 'vocab',
        answerLog,
      });
    }, 1200);
  }

  return (
    <div className="bg-slate-950 text-slate-200 font-ibm-mono text-sm -mx-4 -my-3 px-6 py-8 rounded-xl">
      {/* App-style header — mirrors the EditedApp shell so the student
          recognizes this surface as part of [ ].edited. */}
      <div className="mb-6">
        <p className="text-rose-400 mb-1">&gt; [ ].edited</p>
        <p className="text-slate-500 text-xs">&gt; unsigned. unfiled. uncurated.</p>
        <hr className="mt-4 border-slate-800" />
      </div>

      {/* Tab row (cipher is the active tab; others present but inert) */}
      <div className="mb-8 flex flex-wrap gap-x-5 gap-y-2">
        <span className="text-slate-500 lowercase tracking-wider">[ lexicon ]</span>
        <span className="text-rose-400 lowercase tracking-wider">[ cipher ]</span>
        <span className="text-slate-500 lowercase tracking-wider">[ drop box ]</span>
      </div>

      {/* Cipher header */}
      <p className="text-slate-500 text-xs mb-2 lowercase">
        &gt; the unedited's restoration.
      </p>
      <p className="text-slate-500 text-xs mb-6 lowercase">
        &gt; {locked.size} / {blanks.length} restored.
      </p>

      {/* Passage with bracketed blanks */}
      <div className="mb-8 leading-relaxed text-slate-200">
        {segments.map((seg, i) => {
          if (seg.type === 'text') {
            return <span key={i}>{seg.text}</span>;
          }
          const isLocked = locked.has(seg.index);
          const isWrong = wrongFlash === seg.index;
          const placement = placements[seg.index];
          return (
            <span
              key={`blank-${seg.index}`}
              onDragOver={(e) => { if (!isLocked) e.preventDefault(); }}
              onDrop={(e) => {
                e.preventDefault();
                handleDrop(seg.index, e.dataTransfer.getData('text/plain'));
              }}
              onClick={() => handleBlankClick(seg.index)}
              className={`inline-block min-w-[60px] mx-0.5 px-1.5 text-center transition-colors duration-200 ${
                isLocked
                  ? 'text-slate-100'
                  : isWrong
                  ? 'text-rose-400 animate-resist-shake'
                  : selectedId
                  ? 'text-rose-300 cursor-pointer'
                  : 'text-slate-500 cursor-pointer'
              }`}
            >
              {isLocked
                ? <>[<span className="px-1">{placement}</span>]</>
                : '[   ]'}
            </span>
          );
        })}
      </div>

      {/* Instruction */}
      <p className="text-slate-500 text-xs mb-4 lowercase">
        {selectedId ? (
          <>&gt; tap a bracket to place <span className="text-rose-400">{selectedId}</span>.</>
        ) : (
          <>&gt; tap a word below. then tap an empty bracket.</>
        )}
      </p>

      {/* Word bank */}
      <div className="flex flex-wrap gap-2 mb-8">
        {shuffledWordBank.map((word, idx) => {
          const isUsed = usedBankIndices.has(idx);
          const isSelected = selectedId === word;
          return (
            <button
              key={idx}
              type="button"
              draggable={!isUsed}
              onDragStart={(e) => {
                e.dataTransfer.setData('text/plain', word);
              }}
              onClick={() => !isUsed && selectItem(word)}
              disabled={isUsed}
              className={`lowercase tracking-wider transition-colors ${
                isUsed
                  ? 'text-slate-700 cursor-default'
                  : isSelected
                  ? 'text-rose-400'
                  : 'text-slate-300 hover:text-rose-300'
              }`}
            >
              [ {word} ]
            </button>
          );
        })}
      </div>

      {/* Completion */}
      {allFilled && (
        <div className="mt-6">
          <hr className="border-slate-800 mb-4" />
          <p className="text-slate-300 lowercase mb-2">
            &gt; restored.
          </p>
          <p className="text-rose-400/70 text-xs">— F</p>
        </div>
      )}
    </div>
  );
}
