import { useState, useCallback, useEffect, useRef } from 'react';
import type { TaskProps } from '../../../types/shiftQueue';
import { useShiftQueueStore } from '../../../stores/shiftQueueStore';

// ─── Types ───────────────────────────────────────────────────────

interface VocabItem {
  type: string;
  word: string;
  question: string;
  options: string[];
  correctIndex: number;
  context?: string;
}

// ─── Component ───────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function VocabClearance({ config, onComplete }: TaskProps) {
  const rawItems = (config.items ?? []) as VocabItem[];
  const addConcern = useShiftQueueStore(s => s.addConcern);

  // Shuffle item order and option order within each item on mount
  const items = useRef(
    shuffle(rawItems).map(item => {
      const indices = shuffle(item.options.map((_, i) => i));
      return {
        ...item,
        options: indices.map(i => item.options[i]),
        correctIndex: indices.indexOf(item.correctIndex),
      };
    }),
  ).current;

  const [currentItem, setCurrentItem] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [eliminatedOptions, setEliminatedOptions] = useState<Set<number>>(new Set());
  const [attempt, setAttempt] = useState(1);

  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resultTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
      if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
    };
  }, []);

  const total = items.length;
  const item = items[currentItem];
  const progress = (currentItem + (showResult ? 1 : 0)) / total;

  const advanceToNext = useCallback((finalCorrectCount: number) => {
    if (currentItem < total - 1) {
      setCurrentItem(prev => prev + 1);
      setSelectedOption(null);
      setShowResult(false);
      setEliminatedOptions(new Set());
      setAttempt(1);
    } else {
      const score = total > 0 ? finalCorrectCount / total : 1;
      onComplete(score, {
        correct: finalCorrectCount,
        total,
      });
    }
  }, [currentItem, total, onComplete]);

  const handleSelect = useCallback((optionIndex: number) => {
    if (showResult || selectedOption !== null) return;
    if (eliminatedOptions.has(optionIndex)) return;

    setSelectedOption(optionIndex);

    resultTimerRef.current = setTimeout(() => {
      const isCorrect = optionIndex === item.correctIndex;

      if (isCorrect) {
        setShowResult(true);
        const newCount = correctCount + 1;
        setCorrectCount(newCount);
        advanceTimerRef.current = setTimeout(() => advanceToNext(newCount), 1200);
      } else if (attempt === 1) {
        setShowResult(true);
        addConcern(0.05);
        advanceTimerRef.current = setTimeout(() => {
          setEliminatedOptions(prev => new Set(prev).add(optionIndex));
          setSelectedOption(null);
          setShowResult(false);
          setAttempt(2);
        }, 800);
      } else {
        setShowResult(true);
        addConcern(0.05);
        advanceTimerRef.current = setTimeout(() => advanceToNext(correctCount), 1500);
      }
    }, 300);
  }, [showResult, selectedOption, eliminatedOptions, item, attempt, correctCount, addConcern, advanceToNext]);

  if (!item) {
    return null;
  }

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      {/* Progress bar */}
      <div className="space-y-1">
        <div className="h-2 bg-[#E8E4DC] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-400 to-emerald-300 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] font-ibm-mono text-[#9CA3AF]">
          <span>{currentItem + 1} / {total}</span>
          <span>{correctCount} correct</span>
        </div>
      </div>

      {/* Item card */}
      <div
        key={currentItem}
        className="animate-fadeIn space-y-4"
      >
        {/* Context block */}
        {item.context && (
          <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 border-l-2 border-l-sky-400">
            <p className="text-xs text-sky-800 leading-relaxed">
              {item.context}
            </p>
          </div>
        )}

        {/* Question */}
        <p className="text-sm text-[#2C3340] leading-relaxed">
          {item.question}
        </p>

        {/* Options */}
        <div className="space-y-2">
          {item.options.map((option, i) => {
            const isEliminated = eliminatedOptions.has(i);
            const isCorrectAnswer = i === item.correctIndex;
            const isSelected = i === selectedOption;

            let classes = 'w-full text-left px-4 py-3 rounded-xl text-sm border transition-all duration-200 ';

            if (isEliminated) {
              classes += 'border-[#E8E4DC] bg-[#FAFAF7] text-[#D4CFC6] line-through opacity-50';
            } else if (showResult && isCorrectAnswer && (isSelected || attempt === 2)) {
              classes += 'border-emerald-300 bg-emerald-50 text-emerald-700 font-medium';
            } else if (showResult && isSelected && !isCorrectAnswer) {
              classes += 'border-rose-300 bg-rose-50 text-rose-600';
            } else if (isSelected && !showResult) {
              classes += 'border-sky-400 bg-sky-50 text-sky-700';
            } else {
              classes += 'border-[#D4CFC6] bg-white text-[#4B5563] hover:border-sky-300 hover:bg-sky-50/50 active:bg-sky-100 active:scale-[0.98] cursor-pointer';
            }

            return (
              <button
                key={i}
                className={classes}
                onClick={() => handleSelect(i)}
                disabled={showResult || isEliminated}
              >
                {option}
              </button>
            );
          })}
        </div>

        {/* Result feedback */}
        {showResult && (
          <div className="text-center animate-fadeIn">
            {selectedOption === item.correctIndex ? (
              <span className="text-xs text-emerald-600 font-medium tracking-wider">
                Correct
              </span>
            ) : attempt === 1 ? (
              <span className="text-xs text-amber-600 tracking-wider">
                Try again
              </span>
            ) : (
              <span className="text-xs text-rose-500 tracking-wider">
                Incorrect
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
