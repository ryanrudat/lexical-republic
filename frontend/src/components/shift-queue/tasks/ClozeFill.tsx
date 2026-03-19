import { useState, useCallback, useRef, useMemo } from 'react';
import { usePearlStore } from '../../../stores/pearlStore';
import { useTapOrDrag } from './shared/useTapOrDrag';
import type { TaskProps } from '../../../types/shiftQueue';

interface Blank {
  index: number;
  correctWord: string;
}

export default function ClozeFill({ config, onComplete }: TaskProps) {
  const passage = (config.passage as string) || '';
  const blanks = (config.blanks as Blank[]) || [];
  const wordBank = (config.wordBank as string[]) || [];
  const title = config.title as string | undefined;
  const from = config.from as string | undefined;
  const pearlBark = config.pearlBarkOnComplete as string | undefined;

  const [placements, setPlacements] = useState<Record<number, string>>({});
  const [locked, setLocked] = useState<Set<number>>(new Set());
  const [wrongFlash, setWrongFlash] = useState<number | null>(null);
  const [firstTryCorrect, setFirstTryCorrect] = useState<Set<number>>(new Set());
  const [attempted, setAttempted] = useState<Set<number>>(new Set());

  const { selectedId, selectItem, clearSelection } = useTapOrDrag();

  const shuffledWordBank = useMemo(() => {
    const a = [...wordBank];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }, [wordBank]);

  // Track which word bank chip indices have been consumed (supports duplicate words)
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
        setWrongFlash(blankIndex);
        setAttempted((prev) => new Set(prev).add(blankIndex));
        setTimeout(() => setWrongFlash(null), 400);
      }
      clearSelection();
    },
    [blanks, locked, attempted, clearSelection],
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

  if (allFilled && !hasCompleted.current) {
    hasCompleted.current = true;
    const score = firstTryCorrect.size / blanks.length;
    if (pearlBark) {
      usePearlStore.getState().triggerBark('success', pearlBark);
    }
    setTimeout(() => {
      onComplete(score, {
        type: 'cloze_fill',
        correct: firstTryCorrect.size,
        total: blanks.length,
      });
    }, 800);
  }

  return (
    <div className="space-y-4">
      {/* Document header */}
      {title && (
        <div className="border border-[#E8E4DC] rounded-xl p-3 bg-[#FAFAF7]">
          <div className="font-ibm-mono text-[10px] text-sky-600 tracking-[0.15em] uppercase">
            {title}
          </div>
          {from && (
            <div className="text-[10px] text-[#9CA3AF] mt-0.5">
              From: {from}
            </div>
          )}
        </div>
      )}

      {/* Progress */}
      <div className="flex justify-center">
        <span className="font-ibm-mono text-[11px] text-[#8B8578]">
          {locked.size} / {blanks.length} completed
        </span>
      </div>

      {/* Passage with blanks */}
      <div className="border border-[#E8E4DC] rounded-xl p-4 bg-[#FAFAF7] leading-relaxed text-[13px] text-[#4B5563]">
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
              className={`inline-block min-w-[80px] mx-1 px-2 py-0.5 rounded-lg border text-center text-sm font-medium transition-all duration-200 align-baseline ${
                isLocked
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                  : isWrong
                  ? 'border-rose-300 bg-rose-50 text-rose-600 animate-resist-shake'
                  : selectedId
                  ? 'border-sky-300 bg-sky-50 text-[#6B7280] cursor-pointer hover:border-sky-400 active:bg-sky-100'
                  : 'border-dashed border-[#D4CFC6] bg-white text-[#B8B3AA]'
              }`}
            >
              {isLocked ? placement : '___'}
            </span>
          );
        })}
      </div>

      {/* Instruction */}
      <p className="text-[10px] text-[#9CA3AF] text-center tracking-wider">
        {selectedId
          ? <>Tap a blank to place <span className="font-semibold text-sky-600">{selectedId}</span></>
          : 'Tap a word below, then tap a blank to fill it in.'}
      </p>

      {/* Word bank */}
      <div className="flex flex-wrap gap-2 justify-center">
        {shuffledWordBank.map((word, idx) => {
          const isUsed = usedBankIndices.has(idx);
          return (
            <div
              key={idx}
              draggable={!isUsed}
              onDragStart={(e) => {
                e.dataTransfer.setData('text/plain', word);
              }}
              onClick={() => !isUsed && selectItem(word)}
              className={`px-3 py-1.5 rounded-xl border text-sm font-medium transition-all duration-200 ${
                isUsed
                  ? 'border-[#E8E4DC] bg-[#FAFAF7] text-[#D4CFC6] cursor-default'
                  : selectedId === word
                  ? 'border-sky-400 bg-sky-50 text-sky-700 shadow-sm'
                  : 'border-[#D4CFC6] bg-white text-[#4B5563] cursor-pointer hover:border-sky-300 hover:shadow-sm active:bg-sky-100 active:scale-[0.98]'
              }`}
            >
              {word}
            </div>
          );
        })}
      </div>

      {/* Completion */}
      {allFilled && (
        <div className="text-center py-3">
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50">
            <span className="text-emerald-500">&#10003;</span>
            <span className="font-ibm-mono text-xs text-emerald-700 tracking-wider font-medium">
              Document Verified
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
