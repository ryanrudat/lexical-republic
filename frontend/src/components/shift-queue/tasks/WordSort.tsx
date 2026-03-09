import { useState, useCallback, useRef, useMemo } from 'react';
import { usePearlStore } from '../../../stores/pearlStore';
import { useTapOrDrag } from './shared/useTapOrDrag';
import type { TaskProps } from '../../../types/shiftQueue';

interface Column {
  id: string;
  label: string;
  correctWords: string[];
}

const COLUMN_COLORS: Record<number, { text: string; border: string; bg: string }> = {
  0: { text: 'text-neon-cyan', border: 'border-neon-cyan/30', bg: 'bg-neon-cyan/5' },
  1: { text: 'text-terminal-amber', border: 'border-terminal-amber/30', bg: 'bg-terminal-amber/5' },
  2: { text: 'text-neon-mint', border: 'border-neon-mint/30', bg: 'bg-neon-mint/5' },
};

export default function WordSort({ config, onComplete }: TaskProps) {
  const columns = (config.columns as Column[]) || [];
  const allWords = (config.words as string[]) || [];
  const instruction = config.instruction as string | undefined;
  const pearlBark = config.pearlBarkOnComplete as string | undefined;

  // Shuffle words once
  const shuffledWords = useRef(
    [...allWords].sort(() => Math.random() - 0.5),
  ).current;

  // Track: word → columnId it was placed in (only correct placements lock)
  const [sorted, setSorted] = useState<Record<string, string>>({});
  const [wrongFlash, setWrongFlash] = useState<{ word: string; colId: string } | null>(null);
  const [firstTryCorrect, setFirstTryCorrect] = useState<Set<string>>(new Set());
  const [attempted, setAttempted] = useState<Set<string>>(new Set());

  const { selectedId, selectItem, clearSelection } = useTapOrDrag();

  const unsortedWords = useMemo(
    () => shuffledWords.filter((w) => !sorted[w]),
    [shuffledWords, sorted],
  );

  const trySort = useCallback(
    (word: string, colId: string) => {
      if (sorted[word]) return;
      const col = columns.find((c) => c.id === colId);
      if (!col) return;

      if (col.correctWords.includes(word)) {
        setSorted((prev) => ({ ...prev, [word]: colId }));
        if (!attempted.has(word)) {
          setFirstTryCorrect((prev) => new Set(prev).add(word));
        }
      } else {
        setWrongFlash({ word, colId });
        setAttempted((prev) => new Set(prev).add(word));
        setTimeout(() => setWrongFlash(null), 400);
      }
      clearSelection();
    },
    [columns, sorted, attempted, clearSelection],
  );

  const handleColClick = useCallback(
    (colId: string) => {
      if (!selectedId || sorted[selectedId]) return;
      trySort(selectedId, colId);
    },
    [selectedId, sorted, trySort],
  );

  const handleDrop = useCallback(
    (colId: string, word: string) => {
      trySort(word, colId);
    },
    [trySort],
  );

  // Completion check
  const allSorted = Object.keys(sorted).length === allWords.length;
  const hasCompleted = useRef(false);

  if (allSorted && !hasCompleted.current) {
    hasCompleted.current = true;
    const score = firstTryCorrect.size / allWords.length;
    if (pearlBark) {
      usePearlStore.getState().triggerBark('success', pearlBark);
    }
    setTimeout(() => {
      onComplete(score, {
        type: 'word_sort',
        correct: firstTryCorrect.size,
        total: allWords.length,
      });
    }, 800);
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center">
        <h3 className="font-ibm-mono text-[10px] text-white/30 tracking-[0.3em] uppercase">
          Archive Classification
        </h3>
        {instruction && (
          <p className="font-ibm-mono text-[11px] text-white/50 mt-1">{instruction}</p>
        )}
      </div>

      {/* Progress */}
      <div className="flex justify-center">
        <span className="font-ibm-mono text-[11px] text-neon-mint/70">
          {Object.keys(sorted).length} / {allWords.length} classified
        </span>
      </div>

      {/* Unsorted word pool */}
      {unsortedWords.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center p-3 rounded border border-white/10 bg-white/[0.02]">
          {unsortedWords.map((word) => (
            <div
              key={word}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('text/plain', word);
              }}
              onClick={() => selectItem(word)}
              className={`px-3 py-1.5 rounded border font-ibm-mono text-sm transition-all duration-200 ${
                selectedId === word
                  ? 'border-neon-cyan/60 bg-neon-cyan/10 text-neon-cyan cursor-pointer'
                  : 'border-white/15 bg-white/5 text-white/70 cursor-grab hover:border-white/25'
              }`}
            >
              {word}
            </div>
          ))}
        </div>
      )}

      {/* Columns */}
      <div className={`grid gap-3 ${columns.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
        {columns.map((col, ci) => {
          const colors = COLUMN_COLORS[ci] ?? COLUMN_COLORS[0];
          const wordsInCol = Object.entries(sorted)
            .filter(([, cId]) => cId === col.id)
            .map(([w]) => w);

          return (
            <div
              key={col.id}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleDrop(col.id, e.dataTransfer.getData('text/plain'));
              }}
              onClick={() => handleColClick(col.id)}
              className={`rounded border p-3 min-h-[120px] transition-all duration-200 ${colors.border} ${colors.bg} ${
                selectedId ? 'cursor-pointer hover:brightness-125' : ''
              }`}
            >
              <div className={`font-ibm-mono text-[9px] tracking-[0.2em] uppercase mb-2 ${colors.text}`}>
                {col.label}
              </div>
              <div className="space-y-1.5">
                {wordsInCol.map((w) => (
                  <div
                    key={w}
                    className={`px-2 py-1 rounded border text-[12px] font-ibm-mono ${colors.border} ${colors.text}/80`}
                  >
                    {w}
                  </div>
                ))}
              </div>
              {wrongFlash?.colId === col.id && (
                <div className="mt-1 text-[10px] text-neon-pink/60 font-ibm-mono animate-fade-in">
                  {wrongFlash.word} does not belong here
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Completion */}
      {allSorted && (
        <div className="text-center py-3 animate-fade-in">
          <span className="font-ibm-mono text-xs text-neon-mint tracking-wider">
            CLASSIFICATION COMPLETE
          </span>
        </div>
      )}
    </div>
  );
}
