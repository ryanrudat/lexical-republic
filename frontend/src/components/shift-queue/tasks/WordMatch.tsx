import { useState, useCallback, useRef } from 'react';
import { usePearlStore } from '../../../stores/pearlStore';
import type { TaskProps } from '../../../types/shiftQueue';

interface Pair {
  word: string;
  definition: string;
}

export default function WordMatch({ config, onComplete }: TaskProps) {
  const pairs = (config.pairs as Pair[]) || [];
  const pearlBark = config.pearlBarkOnComplete as string | undefined;

  // Shuffle definitions once on mount
  const shuffledDefs = useRef(
    [...pairs].sort(() => Math.random() - 0.5),
  ).current;

  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [wrongFlash, setWrongFlash] = useState<string | null>(null);
  const [correctFlash, setCorrectFlash] = useState<string | null>(null);
  const [firstTryCorrect, setFirstTryCorrect] = useState<Set<string>>(new Set());
  const [attempted, setAttempted] = useState<Set<string>>(new Set());

  const hasCompleted = useRef(false);

  const checkCompletion = useCallback(
    (newMatched: Set<string>, newFirstTryCorrect: Set<string>) => {
      if (newMatched.size === pairs.length && !hasCompleted.current) {
        hasCompleted.current = true;
        const score = newFirstTryCorrect.size / pairs.length;
        if (pearlBark) {
          usePearlStore.getState().triggerBark('success', pearlBark);
        }
        setTimeout(() => {
          onComplete(score, {
            type: 'word_match',
            correct: newFirstTryCorrect.size,
            total: pairs.length,
          });
        }, 1000);
      }
    },
    [pairs.length, pearlBark, onComplete],
  );

  const handleWordClick = useCallback(
    (word: string) => {
      if (matched.has(word)) return;
      setSelectedWord((prev) => (prev === word ? null : word));
    },
    [matched],
  );

  const handleDefClick = useCallback(
    (defWord: string) => {
      if (matched.has(defWord) || !selectedWord) return;

      // The definition belongs to the pair with word === defWord
      // Check if selectedWord matches defWord
      const isCorrect = selectedWord === defWord;

      if (isCorrect) {
        setCorrectFlash(defWord);
        const newMatched = new Set(matched);
        newMatched.add(defWord);
        setMatched(newMatched);

        const newFirstTryCorrect = new Set(firstTryCorrect);
        if (!attempted.has(selectedWord)) {
          newFirstTryCorrect.add(selectedWord);
          setFirstTryCorrect(newFirstTryCorrect);
        }

        setSelectedWord(null);
        setTimeout(() => setCorrectFlash(null), 500);
        checkCompletion(newMatched, newFirstTryCorrect);
      } else {
        // Wrong — flash red
        setWrongFlash(defWord);
        setAttempted((prev) => new Set(prev).add(selectedWord));
        usePearlStore.getState().triggerBark('incorrect', 'Incorrect match. Review the definition and try again.');
        setTimeout(() => setWrongFlash(null), 500);
        setSelectedWord(null);
      }
    },
    [selectedWord, matched, firstTryCorrect, attempted, checkCompletion],
  );

  // Drag and drop handlers
  const handleDrop = useCallback(
    (defWord: string, draggedWord: string) => {
      if (matched.has(defWord)) return;
      // Temporarily set selectedWord for the handleDefClick logic
      const isCorrect = draggedWord === defWord;

      if (isCorrect) {
        setCorrectFlash(defWord);
        const newMatched = new Set(matched);
        newMatched.add(defWord);
        setMatched(newMatched);

        const newFirstTryCorrect = new Set(firstTryCorrect);
        if (!attempted.has(draggedWord)) {
          newFirstTryCorrect.add(draggedWord);
          setFirstTryCorrect(newFirstTryCorrect);
        }

        setTimeout(() => setCorrectFlash(null), 500);
        checkCompletion(newMatched, newFirstTryCorrect);
      } else {
        setWrongFlash(defWord);
        setAttempted((prev) => new Set(prev).add(draggedWord));
        usePearlStore.getState().triggerBark('incorrect', 'Incorrect match. Review the definition and try again.');
        setTimeout(() => setWrongFlash(null), 500);
      }
    },
    [matched, firstTryCorrect, attempted, checkCompletion],
  );

  const allMatched = matched.size === pairs.length;
  const progress = matched.size / pairs.length;

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-1">
        <h3 className="font-ibm-mono text-[10px] text-white/30 tracking-[0.3em] uppercase">
          Language Authorization Check
        </h3>
        <p className="font-ibm-mono text-[11px] text-white/40">
          {selectedWord
            ? <>Tap the matching definition for <span className="text-neon-cyan">{selectedWord}</span></>
            : 'Tap a term, then tap its definition'}
        </p>
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full bg-neon-mint/60 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <div className="flex justify-between font-ibm-mono text-[10px]">
          <span className="text-white/30">{matched.size}/{pairs.length} verified</span>
          {allMatched && (
            <span className="text-neon-mint animate-pulse">COMPLETE</span>
          )}
        </div>
      </div>

      {/* Two-column match area */}
      <div className="grid grid-cols-[1fr_auto_1fr] gap-x-2 items-start">
        {/* Words column */}
        <div className="space-y-1.5">
          {pairs.map((pair) => {
            const isMatched = matched.has(pair.word);
            const isSelected = selectedWord === pair.word;
            return (
              <button
                key={pair.word}
                draggable={!isMatched}
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', pair.word);
                }}
                onClick={() => handleWordClick(pair.word)}
                disabled={isMatched}
                className={`w-full text-left px-3 py-2 rounded-lg font-ibm-mono text-sm transition-all duration-200 border ${
                  isMatched
                    ? 'border-neon-mint/30 bg-neon-mint/5 text-neon-mint/60'
                    : isSelected
                    ? 'border-neon-cyan bg-neon-cyan/15 text-neon-cyan shadow-[0_0_12px_rgba(0,255,255,0.15)] scale-[1.02]'
                    : 'border-white/8 bg-white/[0.03] text-white/70 hover:border-white/20 hover:bg-white/[0.06] active:scale-[0.98] cursor-pointer'
                }`}
              >
                <span className="flex items-center gap-2">
                  {isMatched ? (
                    <span className="text-neon-mint text-xs shrink-0">&#10003;</span>
                  ) : (
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      isSelected ? 'bg-neon-cyan' : 'bg-white/15'
                    }`} />
                  )}
                  {pair.word}
                </span>
              </button>
            );
          })}
        </div>

        {/* Center connector */}
        <div className="flex flex-col items-center justify-center pt-2 opacity-20">
          {pairs.map((_, i) => (
            <div key={i} className="h-[38px] flex items-center">
              <span className="text-white/30 text-[10px]">&mdash;</span>
            </div>
          ))}
        </div>

        {/* Definitions column */}
        <div className="space-y-1.5">
          {shuffledDefs.map((pair) => {
            const isMatched = matched.has(pair.word);
            const isWrong = wrongFlash === pair.word;
            const isCorrectFlash = correctFlash === pair.word;
            const isClickable = !isMatched && !!selectedWord;
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
                className={`px-3 py-2 rounded-lg border text-[11px] leading-snug transition-all duration-200 ${
                  isMatched
                    ? 'border-neon-mint/30 bg-neon-mint/5 text-neon-mint/50'
                    : isCorrectFlash
                    ? 'border-neon-mint bg-neon-mint/15 text-neon-mint shadow-[0_0_12px_rgba(0,255,200,0.2)]'
                    : isWrong
                    ? 'border-neon-pink bg-neon-pink/10 text-neon-pink animate-resist-shake'
                    : isClickable
                    ? 'border-white/15 bg-white/[0.03] text-white/60 cursor-pointer hover:border-neon-cyan/30 hover:bg-neon-cyan/5'
                    : 'border-white/8 bg-white/[0.02] text-white/40'
                }`}
              >
                {isMatched && (
                  <span className="font-ibm-mono text-[9px] text-neon-mint/50 tracking-wider">
                    {pair.word} &#10003;
                  </span>
                )}
                <span className={isMatched ? 'block mt-0.5' : ''}>
                  {pair.definition}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Completion badge */}
      {allMatched && (
        <div className="text-center py-3">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-neon-mint/30 bg-neon-mint/5">
            <span className="text-neon-mint">&#10003;</span>
            <span className="font-ibm-mono text-xs text-neon-mint tracking-wider">
              AUTHORIZATION VERIFIED
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
