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
  const [, setAnswered] = useState<boolean[]>(() => items.map(() => false));

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

  const handleSelect = useCallback((optionIndex: number) => {
    if (showResult || selectedOption !== null) return;

    setSelectedOption(optionIndex);

    // Show result after brief delay
    resultTimerRef.current = setTimeout(() => {
      setShowResult(true);

      const isCorrect = optionIndex === item.correctIndex;

      if (isCorrect) {
        setCorrectCount(prev => prev + 1);
      } else {
        addConcern(0.1);
      }

      // Mark as answered
      setAnswered(prev => {
        const updated = [...prev];
        updated[currentItem] = true;
        return updated;
      });

      // Auto-advance after showing result
      advanceTimerRef.current = setTimeout(() => {
        if (currentItem < total - 1) {
          setCurrentItem(prev => prev + 1);
          setSelectedOption(null);
          setShowResult(false);
        } else {
          // Quiz complete
          const finalCorrect = isCorrect ? correctCount + 1 : correctCount;
          const score = total > 0 ? finalCorrect / total : 1;
          onComplete(score, {
            correct: finalCorrect,
            total,
          });
        }
      }, 1500);
    }, 300);
  }, [showResult, selectedOption, item, currentItem, total, correctCount, addConcern, onComplete]);

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
            let borderClass = '';
            if (showResult && i === item.correctIndex) {
              borderClass = 'border-neon-mint text-neon-mint';
            } else if (showResult && i === selectedOption && i !== item.correctIndex) {
              borderClass = 'border-neon-pink text-neon-pink';
            } else if (selectedOption === i && !showResult) {
              borderClass = 'border-neon-cyan';
            }

            return (
              <button
                key={i}
                className={`ios-glass-pill w-full text-left px-4 py-3 font-ibm-mono text-sm transition-all ${borderClass}`}
                onClick={() => handleSelect(i)}
                disabled={showResult}
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
