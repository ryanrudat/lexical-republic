import { useState, useCallback, useRef } from 'react';
import { usePearlStore } from '../../../stores/pearlStore';
import type { TaskProps } from '../../../types/shiftQueue';

interface Pair {
  word: string;
  definition: string;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function WordMatch({ config, onComplete }: TaskProps) {
  const pairs = (config.pairs as Pair[]) || [];
  const pearlBark = config.pearlBarkOnComplete as string | undefined;

  // Shuffle both columns independently on mount
  const shuffledWords = useRef(shuffle(pairs)).current;
  const shuffledDefs = useRef(shuffle(pairs)).current;

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

  const tryMatch = useCallback(
    (word: string, defWord: string) => {
      if (matched.has(defWord)) return;
      const isCorrect = word === defWord;

      if (isCorrect) {
        setCorrectFlash(defWord);
        const newMatched = new Set(matched);
        newMatched.add(defWord);
        setMatched(newMatched);

        const newFirstTryCorrect = new Set(firstTryCorrect);
        if (!attempted.has(word)) {
          newFirstTryCorrect.add(word);
          setFirstTryCorrect(newFirstTryCorrect);
        }

        setSelectedWord(null);
        setTimeout(() => setCorrectFlash(null), 500);
        checkCompletion(newMatched, newFirstTryCorrect);
      } else {
        setWrongFlash(defWord);
        setAttempted((prev) => new Set(prev).add(word));
        usePearlStore.getState().triggerBark('incorrect', 'Incorrect match. Review the definition and try again.');
        setTimeout(() => setWrongFlash(null), 500);
        setSelectedWord(null);
      }
    },
    [matched, firstTryCorrect, attempted, checkCompletion],
  );

  const handleDefClick = useCallback(
    (defWord: string) => {
      if (matched.has(defWord) || !selectedWord) return;
      tryMatch(selectedWord, defWord);
    },
    [selectedWord, matched, tryMatch],
  );

  const handleDrop = useCallback(
    (defWord: string, draggedWord: string) => {
      tryMatch(draggedWord, defWord);
    },
    [tryMatch],
  );

  const allMatched = matched.size === pairs.length;
  const progress = matched.size / pairs.length;

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-1">
        <p className="text-sm text-[#6B7280]">
          {selectedWord
            ? <>Select the definition for <span className="font-semibold text-sky-600">{selectedWord}</span></>
            : 'Tap a term, then tap its matching definition.'}
        </p>
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="h-2 bg-[#E8E4DC] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-400 to-emerald-300 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <div className="flex justify-between text-[11px]">
          <span className="text-[#8B8578] font-ibm-mono">{matched.size}/{pairs.length} verified</span>
          {allMatched && (
            <span className="text-emerald-600 font-semibold animate-pulse">Complete</span>
          )}
        </div>
      </div>

      {/* Two-column match area */}
      <div className="grid grid-cols-[1fr_1fr] gap-3">
        {/* Words column */}
        <div className="space-y-2">
          <div className="text-[10px] text-[#8B8578] font-ibm-mono tracking-[0.15em] uppercase font-medium px-1">
            Terms
          </div>
          {shuffledWords.map((pair) => {
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
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border ${
                  isMatched
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                    : isSelected
                    ? 'bg-sky-50 border-sky-400 text-sky-700 shadow-md shadow-sky-100 scale-[1.02]'
                    : 'bg-white border-[#D4CFC6] text-[#2C3340] hover:border-[#B8B3AA] hover:shadow-sm active:scale-[0.98] cursor-pointer'
                }`}
              >
                <span className="flex items-center gap-2">
                  {isMatched ? (
                    <span className="text-emerald-500 text-xs">&#10003;</span>
                  ) : (
                    <span className={`w-2 h-2 rounded-full shrink-0 ${
                      isSelected ? 'bg-sky-400' : 'bg-[#D4CFC6]'
                    }`} />
                  )}
                  {pair.word}
                </span>
              </button>
            );
          })}
        </div>

        {/* Definitions column */}
        <div className="space-y-2">
          <div className="text-[10px] text-[#8B8578] font-ibm-mono tracking-[0.15em] uppercase font-medium px-1">
            Definitions
          </div>
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
                className={`px-3.5 py-2.5 rounded-xl border text-[12px] leading-relaxed transition-all duration-200 ${
                  isMatched
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700/70'
                    : isCorrectFlash
                    ? 'bg-emerald-100 border-emerald-400 text-emerald-800 shadow-md shadow-emerald-100'
                    : isWrong
                    ? 'bg-red-50 border-red-300 text-red-700 animate-resist-shake'
                    : isClickable
                    ? 'bg-white border-[#D4CFC6] text-[#4B5563] cursor-pointer hover:border-sky-300 hover:bg-sky-50/50 hover:shadow-sm'
                    : 'bg-[#FAFAF7] border-[#E8E4DC] text-[#9CA3AF]'
                }`}
              >
                {isMatched && (
                  <span className="text-[10px] text-emerald-500 font-ibm-mono font-medium">
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
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50">
            <span className="text-emerald-500">&#10003;</span>
            <span className="font-ibm-mono text-xs text-emerald-700 tracking-wider font-medium">
              Authorization Verified
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
