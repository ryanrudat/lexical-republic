import { useState, useCallback, useRef } from 'react';
import { usePearlStore } from '../../../stores/pearlStore';
import { useTapOrDrag } from './shared/useTapOrDrag';
import type { TaskProps } from '../../../types/shiftQueue';

interface Pair {
  word: string;
  definition: string;
}

interface MatchState {
  matched: Set<string>;       // words that are correctly matched
  wrongFlash: string | null;  // definition id currently flashing red
  firstTryCorrect: Set<string>;
  attempted: Set<string>;     // words that have been attempted at least once
}

export default function WordMatch({ config, onComplete }: TaskProps) {
  const pairs = (config.pairs as Pair[]) || [];
  const pearlBark = config.pearlBarkOnComplete as string | undefined;

  // Shuffle definitions once on mount
  const shuffledDefs = useRef(
    [...pairs].sort(() => Math.random() - 0.5),
  ).current;

  const [state, setState] = useState<MatchState>({
    matched: new Set(),
    wrongFlash: null,
    firstTryCorrect: new Set(),
    attempted: new Set(),
  });

  const { selectedId, selectItem, clearSelection } = useTapOrDrag();

  const tryMatch = useCallback(
    (word: string, defWord: string) => {
      if (state.matched.has(word)) return;

      const pair = pairs.find((p) => p.word === word);
      if (!pair) return;

      const isCorrect = pair.definition === pairs.find((p) => p.word === defWord)?.definition
        ? false // this shouldn't happen
        : defWord === word; // match by word key

      if (isCorrect) {
        setState((prev) => {
          const matched = new Set(prev.matched);
          matched.add(word);
          const firstTryCorrect = new Set(prev.firstTryCorrect);
          if (!prev.attempted.has(word)) firstTryCorrect.add(word);
          return { ...prev, matched, firstTryCorrect };
        });
      } else {
        setState((prev) => ({
          ...prev,
          wrongFlash: defWord,
          attempted: new Set(prev.attempted).add(word),
        }));
        setTimeout(() => setState((prev) => ({ ...prev, wrongFlash: null })), 400);
      }
    },
    [pairs, state.matched],
  );

  const handleDefClick = useCallback(
    (defWord: string) => {
      if (state.matched.has(defWord)) return;
      if (selectedId) {
        tryMatch(selectedId, defWord);
        clearSelection();
      }
    },
    [selectedId, tryMatch, clearSelection, state.matched],
  );

  const handleDrop = useCallback(
    (defWord: string, draggedWord: string) => {
      tryMatch(draggedWord, defWord);
    },
    [tryMatch],
  );

  // Check completion
  const allMatched = state.matched.size === pairs.length;
  const hasCompleted = useRef(false);

  if (allMatched && !hasCompleted.current) {
    hasCompleted.current = true;
    const score = state.firstTryCorrect.size / pairs.length;
    if (pearlBark) {
      usePearlStore.getState().triggerBark('success', pearlBark);
    }
    setTimeout(() => {
      onComplete(score, {
        type: 'word_match',
        correct: state.firstTryCorrect.size,
        total: pairs.length,
      });
    }, 800);
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center">
        <h3 className="font-ibm-mono text-[10px] text-white/30 tracking-[0.3em] uppercase">
          Language Authorization Check
        </h3>
        <p className="font-ibm-mono text-[11px] text-white/50 mt-1">
          Match each term to its approved definition to activate file access.
        </p>
      </div>

      {/* Progress */}
      <div className="flex justify-center">
        <span className="font-ibm-mono text-[11px] text-neon-mint/70">
          {state.matched.size} / {pairs.length} matched
        </span>
      </div>

      {/* Match grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Words column */}
        <div className="space-y-2">
          <div className="font-ibm-mono text-[9px] text-neon-cyan/50 tracking-[0.2em] uppercase mb-1">
            Terms
          </div>
          {pairs.map((pair) => {
            const isMatched = state.matched.has(pair.word);
            const isSelected = selectedId === pair.word;
            return (
              <div
                key={pair.word}
                draggable={!isMatched}
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', pair.word);
                }}
                onClick={() => !isMatched && selectItem(pair.word)}
                className={`px-3 py-2 rounded border font-ibm-mono text-sm transition-all duration-200 ${
                  isMatched
                    ? 'border-neon-mint/40 bg-neon-mint/5 text-neon-mint cursor-default'
                    : isSelected
                    ? 'border-neon-cyan/60 bg-neon-cyan/10 text-neon-cyan cursor-pointer'
                    : 'border-white/10 bg-white/5 text-neon-cyan/80 cursor-grab hover:border-white/20'
                }`}
              >
                {isMatched && <span className="mr-1.5 text-neon-mint">&#10003;</span>}
                {pair.word}
              </div>
            );
          })}
        </div>

        {/* Definitions column */}
        <div className="space-y-2">
          <div className="font-ibm-mono text-[9px] text-white/30 tracking-[0.2em] uppercase mb-1">
            Definitions
          </div>
          {shuffledDefs.map((pair) => {
            const isMatched = state.matched.has(pair.word);
            const isWrongFlash = state.wrongFlash === pair.word;
            return (
              <div
                key={`def-${pair.word}`}
                onDragOver={(e) => {
                  if (!isMatched) e.preventDefault();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const draggedWord = e.dataTransfer.getData('text/plain');
                  handleDrop(pair.word, draggedWord);
                }}
                onClick={() => handleDefClick(pair.word)}
                className={`px-3 py-2 rounded border text-[12px] leading-relaxed transition-all duration-200 ${
                  isMatched
                    ? 'border-neon-mint/40 bg-neon-mint/5 text-neon-mint/80 cursor-default'
                    : isWrongFlash
                    ? 'border-neon-pink/50 bg-neon-pink/10 text-white/70'
                    : selectedId
                    ? 'border-white/20 bg-white/5 text-white/70 cursor-pointer hover:border-neon-cyan/30'
                    : 'border-white/10 bg-white/5 text-white/60'
                }`}
              >
                {isMatched && (
                  <span className="font-ibm-mono text-[9px] text-neon-mint/60 block mb-0.5">
                    {pair.word}
                  </span>
                )}
                {pair.definition}
              </div>
            );
          })}
        </div>
      </div>

      {/* Completion */}
      {allMatched && (
        <div className="text-center py-3 animate-fade-in">
          <span className="font-ibm-mono text-xs text-neon-mint tracking-wider">
            AUTHORIZATION VERIFIED
          </span>
        </div>
      )}
    </div>
  );
}
