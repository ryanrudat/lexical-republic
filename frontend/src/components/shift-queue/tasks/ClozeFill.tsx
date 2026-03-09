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

  // Track placed words: blankIndex → word placed
  const [placements, setPlacements] = useState<Record<number, string>>({});
  const [locked, setLocked] = useState<Set<number>>(new Set());
  const [wrongFlash, setWrongFlash] = useState<number | null>(null);
  const [firstTryCorrect, setFirstTryCorrect] = useState<Set<number>>(new Set());
  const [attempted, setAttempted] = useState<Set<number>>(new Set());

  const { selectedId, selectItem, clearSelection } = useTapOrDrag();

  // Words currently placed (used to dim them in the bank)
  const placedWords = useMemo(() => {
    const s = new Set<string>();
    for (const idx of locked) {
      const b = blanks.find((bl) => bl.index === idx);
      if (b) s.add(b.correctWord);
    }
    return s;
  }, [locked, blanks]);

  // Split passage into segments around {0}, {1}, etc.
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

  // Check completion
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
        <div className="border border-white/10 rounded p-3 bg-white/[0.02]">
          <div className="font-ibm-mono text-[10px] text-neon-cyan/60 tracking-[0.2em] uppercase">
            {title}
          </div>
          {from && (
            <div className="font-ibm-mono text-[10px] text-white/30 mt-0.5">
              From: {from}
            </div>
          )}
        </div>
      )}

      {/* Progress */}
      <div className="flex justify-center">
        <span className="font-ibm-mono text-[11px] text-neon-mint/70">
          {locked.size} / {blanks.length} completed
        </span>
      </div>

      {/* Passage with blanks */}
      <div className="border border-white/10 rounded p-4 bg-white/[0.02] leading-relaxed text-[13px] text-white/70">
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
              className={`inline-block min-w-[80px] mx-1 px-2 py-0.5 rounded border text-center font-ibm-mono text-sm transition-all duration-200 align-baseline ${
                isLocked
                  ? 'border-neon-mint/40 bg-neon-mint/10 text-neon-mint'
                  : isWrong
                  ? 'border-neon-pink/50 bg-neon-pink/10 text-neon-pink'
                  : selectedId
                  ? 'border-neon-cyan/40 bg-neon-cyan/5 text-white/40 cursor-pointer hover:border-neon-cyan/60'
                  : 'border-dashed border-neon-cyan/30 bg-neon-cyan/5 text-white/30'
              }`}
            >
              {isLocked ? placement : '___'}
            </span>
          );
        })}
      </div>

      {/* Instruction */}
      <p className="font-ibm-mono text-[10px] text-white/30 text-center tracking-wider">
        Complete this document using approved vocabulary.
      </p>

      {/* Word bank */}
      <div className="flex flex-wrap gap-2 justify-center">
        {wordBank.map((word) => {
          const isUsed = placedWords.has(word);
          return (
            <div
              key={word}
              draggable={!isUsed}
              onDragStart={(e) => {
                e.dataTransfer.setData('text/plain', word);
              }}
              onClick={() => !isUsed && selectItem(word)}
              className={`px-3 py-1.5 rounded border font-ibm-mono text-sm transition-all duration-200 ${
                isUsed
                  ? 'border-white/5 bg-white/[0.02] text-white/15 cursor-default'
                  : selectedId === word
                  ? 'border-neon-cyan/60 bg-neon-cyan/10 text-neon-cyan cursor-pointer'
                  : 'border-white/15 bg-white/5 text-neon-cyan/70 cursor-grab hover:border-white/25'
              }`}
            >
              {word}
            </div>
          );
        })}
      </div>

      {/* Completion stamp */}
      {allFilled && (
        <div className="text-center py-3 animate-fade-in">
          <span className="font-ibm-mono text-xs text-neon-mint tracking-wider">
            DOCUMENT VERIFIED
          </span>
        </div>
      )}
    </div>
  );
}
