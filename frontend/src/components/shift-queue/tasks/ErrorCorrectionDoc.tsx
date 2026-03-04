import { useState, useCallback, useRef, useEffect } from 'react';
import DocumentCard from './DocumentCard';
import { useShiftQueueStore } from '../../../stores/shiftQueueStore';

interface ErrorOption {
  text: string;
  isCorrect?: boolean;
}

interface DocError {
  sentenceIndex: number;
  errorWord: string;
  options: ErrorOption[];
  correctIndex: number;
  explanation?: string;
}

interface ErrorDoc {
  title: string;
  department?: string;
  classification?: string;
  priority?: string;
  from?: string;
  to?: string;
  re?: string;
  body: string;
  reviewedBy?: string;
  errors: DocError[];
  laneHints?: Record<string, string[]>;
}

interface ErrorCorrectionDocProps {
  doc: ErrorDoc;
  lane: number;
  onComplete: (score: number) => void;
}

// Normalize errors from either config format:
//   { errorText, options: string[] }  →  { errorWord, options: { text }[] }
//   { errorWord, options: { text }[] }  →  unchanged
function normalizeErrors(errors: DocError[]): DocError[] {
  return errors.map(err => {
    const raw = err as unknown as Record<string, unknown>;
    const errorWord = err.errorWord ?? (raw.errorText as string) ?? '';
    const options = err.options.map(opt =>
      typeof opt === 'string' ? { text: opt } : opt,
    );
    return { ...err, errorWord, options };
  });
}

export default function ErrorCorrectionDoc({
  doc,
  lane,
  onComplete,
}: ErrorCorrectionDocProps) {
  const addConcern = useShiftQueueStore(s => s.addConcern);

  // Normalize errors once on mount / doc change
  const normalizedDoc = { ...doc, errors: normalizeErrors(doc.errors) };

  // Track which error is currently showing options
  const [activeError, setActiveError] = useState<number | null>(null);
  // Track corrections: error index -> selected option index
  const [corrections, setCorrections] = useState<Record<number, number | null>>({});
  // Track which errors have been locked (answered)
  const [lockedErrors, setLockedErrors] = useState<Set<number>>(new Set());
  // Track result flash state per error
  const [showResults, setShowResults] = useState<Record<number, boolean>>({});
  // All done state
  const [allDone, setAllDone] = useState(false);

  const timerRefs = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      timerRefs.current.forEach(timer => clearTimeout(timer));
    };
  }, []);

  const sentences = normalizedDoc.body.split(/(?<=\.)\s+/);

  const handleSelectOption = useCallback(
    (errorIndex: number, optionIndex: number) => {
      if (lockedErrors.has(errorIndex)) return;

      const error = normalizedDoc.errors[errorIndex];
      const isCorrect = optionIndex === error.correctIndex;

      setCorrections(prev => ({ ...prev, [errorIndex]: optionIndex }));
      setShowResults(prev => ({ ...prev, [errorIndex]: true }));
      setActiveError(null);

      if (!isCorrect) {
        addConcern(0.1);
      }

      // Lock after showing result for 1s
      const timer = setTimeout(() => {
        setLockedErrors(prev => {
          const next = new Set(prev);
          next.add(errorIndex);

          // Check if all errors are now locked
          if (next.size === normalizedDoc.errors.length) {
            const correctCount = normalizedDoc.errors.filter((err, idx) => {
              const selected = idx === errorIndex ? optionIndex : corrections[idx];
              return selected === err.correctIndex;
            }).length;
            const score = correctCount / normalizedDoc.errors.length;

            setAllDone(true);
            // Slight delay before calling onComplete
            setTimeout(() => onComplete(score), 800);
          }

          return next;
        });
        setShowResults(prev => ({ ...prev, [errorIndex]: false }));

        timerRefs.current.delete(errorIndex);
      }, 1000);

      timerRefs.current.set(errorIndex, timer);
    },
    [corrections, normalizedDoc.errors, lockedErrors, addConcern, onComplete],
  );

  const handleClickError = useCallback(
    (errorIndex: number) => {
      if (lockedErrors.has(errorIndex)) return;
      setActiveError(prev => (prev === errorIndex ? null : errorIndex));
    },
    [lockedErrors],
  );

  // Build the lane hints lookup
  const laneHints =
    lane === 1 && normalizedDoc.laneHints?.['1']
      ? (normalizedDoc.laneHints['1'] as string[])
      : null;

  // Render body with interactive error spans
  const renderBody = () => {
    // Build a map of sentence index -> error entries for quick lookup
    const errorsBySentence = new Map<number, { error: DocError; errorIndex: number }[]>();
    normalizedDoc.errors.forEach((error, idx) => {
      const list = errorsBySentence.get(error.sentenceIndex) ?? [];
      list.push({ error, errorIndex: idx });
      errorsBySentence.set(error.sentenceIndex, list);
    });

    return (
      <div className="space-y-2">
        {sentences.map((sentence, sIdx) => {
          const errorsInSentence = errorsBySentence.get(sIdx);

          if (!errorsInSentence) {
            return (
              <p key={sIdx} className="font-ibm-mono text-sm text-white/70 leading-relaxed inline">
                {sentence}{' '}
              </p>
            );
          }

          // Replace error words with interactive spans
          let remaining = sentence;
          const parts: React.ReactNode[] = [];

          errorsInSentence.forEach(({ error, errorIndex }, eIdx) => {
            const wordIdx = remaining.indexOf(error.errorWord);
            if (wordIdx === -1) {
              // If error word not found in remaining text, just render it
              return;
            }

            // Text before error word
            if (wordIdx > 0) {
              parts.push(
                <span key={`${sIdx}-pre-${eIdx}`} className="font-ibm-mono text-sm text-white/70">
                  {remaining.slice(0, wordIdx)}
                </span>,
              );
            }

            // Determine styling state
            const isLocked = lockedErrors.has(errorIndex);
            const selected = corrections[errorIndex];
            const isCorrect = selected === error.correctIndex;
            const isShowingResult = showResults[errorIndex];

            let underlineClass = 'border-b-2 border-dashed border-terminal-amber/60 cursor-pointer hover:border-neon-cyan/80';
            if (isLocked || isShowingResult) {
              if (isCorrect) {
                underlineClass = 'border-b-2 border-solid border-neon-mint text-neon-mint';
              } else {
                underlineClass = 'border-b-2 border-solid border-rose-400 text-rose-400';
              }
            }

            // The error word
            parts.push(
              <span key={`${sIdx}-err-${eIdx}`} className="relative inline-block">
                <span
                  className={`font-ibm-mono text-sm ${underlineClass} transition-colors duration-300 ${
                    isLocked ? 'cursor-default' : ''
                  }`}
                  onClick={() => handleClickError(errorIndex)}
                >
                  {isLocked && !isCorrect
                    ? error.options[error.correctIndex].text
                    : error.errorWord}
                </span>

                {/* Lane 1 hints */}
                {laneHints && laneHints[errorIndex] && !isLocked && (
                  <span className="block font-ibm-mono text-[9px] text-neon-cyan/50 mt-0.5">
                    {laneHints[errorIndex]}
                  </span>
                )}

                {/* Options popup */}
                {activeError === errorIndex && !isLocked && (
                  <div className="absolute left-0 top-full mt-1 z-10 ios-glass-card-strong border border-white/15 rounded-lg p-1.5 min-w-[140px]">
                    {error.options.map((option, oIdx) => (
                      <button
                        key={oIdx}
                        className="block w-full text-left px-3 py-1.5 font-ibm-mono text-xs text-white/70 rounded hover:bg-white/10 transition-colors"
                        onClick={() => handleSelectOption(errorIndex, oIdx)}
                      >
                        {option.text}
                      </button>
                    ))}
                  </div>
                )}
              </span>,
            );

            remaining = remaining.slice(wordIdx + error.errorWord.length);
          });

          // Remaining text after last error
          if (remaining) {
            parts.push(
              <span key={`${sIdx}-tail`} className="font-ibm-mono text-sm text-white/70">
                {remaining}
              </span>,
            );
          }

          return (
            <span key={sIdx} className="leading-relaxed">
              {parts}{' '}
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <DocumentCard
        title={normalizedDoc.title}
        department={normalizedDoc.department}
        classification={normalizedDoc.classification}
        priority={normalizedDoc.priority}
        from={normalizedDoc.from}
        to={normalizedDoc.to}
        re={normalizedDoc.re}
        body={renderBody()}
        reviewedBy={normalizedDoc.reviewedBy}
      />

      {/* Status line */}
      <div className="flex items-center justify-between px-1">
        <span className="font-ibm-mono text-[10px] text-white/30 tracking-wider">
          ERRORS: {lockedErrors.size} / {normalizedDoc.errors.length} CORRECTED
        </span>
        {allDone && (
          <span className="font-ibm-mono text-[10px] text-neon-mint tracking-wider animate-pulse">
            All corrections applied
          </span>
        )}
      </div>
    </div>
  );
}
