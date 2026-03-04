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

export default function VocabClearance({ config, onComplete }: TaskProps) {
  const items = (config.items ?? []) as VocabItem[];
  const addConcern = useShiftQueueStore(s => s.addConcern);

  const [currentItem, setCurrentItem] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [eliminatedOptions, setEliminatedOptions] = useState<Set<number>>(new Set());
  const [attempt, setAttempt] = useState(1); // 1 = first try, 2 = second try

  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resultTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
      if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
    };
  }, []);

  const total = items.length;
  const item = items[currentItem];

  const advanceToNext = useCallback((finalCorrectCount: number) => {
    if (currentItem < total - 1) {
      setCurrentItem(prev => prev + 1);
      setSelectedOption(null);
      setShowResult(false);
      setEliminatedOptions(new Set());
      setAttempt(1);
    } else {
      // Quiz complete
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
        // Correct — show mint highlight, advance
        setShowResult(true);
        const newCount = correctCount + 1;
        setCorrectCount(newCount);
        advanceTimerRef.current = setTimeout(() => advanceToNext(newCount), 1200);
      } else if (attempt === 1) {
        // First wrong — cross out, let them try again
        setShowResult(true);
        addConcern(0.05);
        advanceTimerRef.current = setTimeout(() => {
          setEliminatedOptions(prev => new Set(prev).add(optionIndex));
          setSelectedOption(null);
          setShowResult(false);
          setAttempt(2);
        }, 800);
      } else {
        // Second wrong — show correct answer, then advance
        setShowResult(true);
        addConcern(0.05);
        advanceTimerRef.current = setTimeout(() => advanceToNext(correctCount), 1500);
      }
    }, 300);
  }, [showResult, selectedOption, eliminatedOptions, item, attempt, correctCount, addConcern, advanceToNext]);

  // ── Render ───────────────────────────────────────────────────

  if (!item) {
    return null;
  }

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      {/* Progress counter */}
      <div className="text-center">
        <span className="font-dseg7 text-sm text-neon-cyan">
          {currentItem + 1} / {total}
        </span>
      </div>

      {/* Item card */}
      <div
        key={currentItem}
        className="animate-fadeIn space-y-4"
      >
        {/* Context block (optional) */}
        {item.context && (
          <div className="ios-glass-card p-3 border-l-2 border-neon-cyan/30">
            <p className="font-ibm-mono text-xs text-white/60 leading-relaxed">
              {item.context}
            </p>
          </div>
        )}

        {/* Word label */}
        {item.word && (
          <div className="text-center">
            <span className="font-ibm-mono text-lg text-neon-cyan tracking-wide">
              {item.word}
            </span>
          </div>
        )}

        {/* Question */}
        <p className="font-ibm-mono text-sm text-white/80 leading-relaxed">
          {item.question}
        </p>

        {/* Options */}
        <div className="space-y-2">
          {item.options.map((option, i) => {
            const isEliminated = eliminatedOptions.has(i);
            const isCorrectAnswer = i === item.correctIndex;
            const isSelected = i === selectedOption;

            let borderClass = '';
            let extraClass = '';

            if (isEliminated) {
              // Previously wrong — crossed out, dimmed
              borderClass = 'border-white/5 opacity-30';
              extraClass = 'line-through';
            } else if (showResult && isCorrectAnswer && (isSelected || attempt === 2)) {
              // Correct answer revealed
              borderClass = 'border-neon-mint text-neon-mint';
            } else if (showResult && isSelected && !isCorrectAnswer) {
              // Wrong selection this attempt
              borderClass = 'border-neon-pink text-neon-pink';
            } else if (isSelected && !showResult) {
              borderClass = 'border-neon-cyan';
            }

            return (
              <button
                key={i}
                className={`ios-glass-pill w-full text-left px-4 py-3 font-ibm-mono text-sm transition-all ${borderClass} ${extraClass}`}
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
              <span className="font-ibm-mono text-xs text-neon-mint/80 tracking-wider">
                CORRECT
              </span>
            ) : attempt === 1 ? (
              <span className="font-ibm-mono text-xs text-neon-pink/60 tracking-wider">
                TRY AGAIN
              </span>
            ) : (
              <span className="font-ibm-mono text-xs text-neon-pink/80 tracking-wider">
                INCORRECT
              </span>
            )}
          </div>
        )}
      </div>

      {/* Running score (subtle) */}
      <div className="text-center pt-2">
        <span className="font-ibm-mono text-[10px] text-white/20 tracking-widest">
          {correctCount} CORRECT
        </span>
      </div>
    </div>
  );
}
