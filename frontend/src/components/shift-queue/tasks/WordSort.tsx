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
  0: { text: 'text-sky-600', border: 'border-sky-200', bg: 'bg-sky-50' },
  1: { text: 'text-amber-600', border: 'border-amber-200', bg: 'bg-amber-50' },
  2: { text: 'text-emerald-600', border: 'border-emerald-200', bg: 'bg-emerald-50' },
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
  // Track the first wrong column a student dropped each word into, so
  // teachers can see which category the student confused the word with.
  const [firstWrongCol, setFirstWrongCol] = useState<Record<string, string>>({});

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
        setFirstWrongCol((prev) => (word in prev ? prev : { ...prev, [word]: colId }));
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
    // Build per-word answer log for the teacher Gradebook. `chosen` shows
    // the student's first wrong column if they missed it, otherwise the
    // (correct) final column they settled into.
    const colLabelById = new Map(columns.map((c) => [c.id, c.label] as const));
    const answerLog = allWords.map((word) => {
      const correctCol = columns.find((c) => c.correctWords.includes(word));
      const correctLabel = correctCol?.label ?? word;
      const firstWrong = firstWrongCol[word];
      const chosenLabel = firstWrong
        ? colLabelById.get(firstWrong) ?? firstWrong
        : correctLabel;
      return {
        questionId: word,
        prompt: `Sort: ${word}`,
        chosen: chosenLabel,
        correct: correctLabel,
        wasCorrect: firstTryCorrect.has(word),
      };
    });
    setTimeout(() => {
      onComplete(score, {
        taskType: 'word_sort',
        itemsCorrect: firstTryCorrect.size,
        itemsTotal: allWords.length,
        category: 'vocab',
        answerLog,
      });
    }, 800);
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center">
        <h3 className="font-ibm-mono text-[10px] text-[#8B8578] tracking-[0.3em] uppercase">
          Archive Classification
        </h3>
        {instruction && (
          <p className="font-ibm-mono text-[11px] text-[#6B7280] mt-1">{instruction}</p>
        )}
      </div>

      {/* Progress */}
      <div className="flex justify-center">
        <span className="font-ibm-mono text-[11px] text-emerald-600">
          {Object.keys(sorted).length} / {allWords.length} classified
        </span>
      </div>

      {/* Unsorted word pool */}
      {unsortedWords.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center p-3 rounded-xl border border-[#E8E4DC] bg-[#FAFAF7]">
          {unsortedWords.map((word) => (
            <div
              key={word}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('text/plain', word);
              }}
              onClick={() => selectItem(word)}
              className={`px-3 py-1.5 rounded-xl border font-ibm-mono text-sm transition-all duration-200 ${
                selectedId === word
                  ? 'border-sky-400 bg-sky-50 text-sky-700 cursor-pointer'
                  : 'border-[#D4CFC6] bg-white text-[#4B5563] cursor-grab hover:border-sky-300 active:scale-[0.98]'
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
              className={`rounded-xl border p-3 min-h-[120px] transition-all duration-200 ${colors.border} ${colors.bg} ${
                selectedId ? 'cursor-pointer hover:brightness-105 active:scale-[0.98]' : ''
              }`}
            >
              <div className={`font-ibm-mono text-[9px] tracking-[0.2em] uppercase mb-2 ${colors.text}`}>
                {col.label}
              </div>
              <div className="space-y-1.5">
                {wordsInCol.map((w) => (
                  <div
                    key={w}
                    className={`px-2 py-1 rounded-lg border text-[12px] font-ibm-mono bg-white ${colors.border} ${colors.text}`}
                  >
                    {w}
                  </div>
                ))}
              </div>
              {wrongFlash?.colId === col.id && (
                <div className="mt-1 text-[10px] text-rose-500 font-ibm-mono animate-fade-in">
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
          <span className="font-ibm-mono text-xs text-emerald-600 tracking-wider">
            Classification complete
          </span>
        </div>
      )}
    </div>
  );
}
