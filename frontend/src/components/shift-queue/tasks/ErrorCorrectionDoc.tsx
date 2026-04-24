import { useState, useCallback, useRef, useEffect } from 'react';
import DocumentCard from './DocumentCard';
import { useShiftQueueStore } from '../../../stores/shiftQueueStore';
import type { TaskAnswerLogEntry } from '../../../types/taskResult';

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

export interface ErrorCorrectionResult {
  correctCount: number;
  totalErrors: number;
  answerLog: TaskAnswerLogEntry[];
}

interface ErrorCorrectionDocProps {
  doc: ErrorDoc;
  lane: number;
  onComplete: (score: number, result: ErrorCorrectionResult) => void;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function normalizeErrors(errors: DocError[]): DocError[] {
  return errors.map(err => {
    const raw = err as unknown as Record<string, unknown>;
    const errorWord = err.errorWord ?? (raw.errorText as string) ?? '';
    const options = err.options.map(opt =>
      typeof opt === 'string' ? { text: opt } : opt,
    );
    // Shuffle option order and update correctIndex to match
    const indices = shuffle(options.map((_, i) => i));
    const shuffledOptions = indices.map(i => options[i]);
    const newCorrectIndex = indices.indexOf(err.correctIndex);
    return { ...err, errorWord, options: shuffledOptions, correctIndex: newCorrectIndex };
  });
}

export default function ErrorCorrectionDoc({
  doc,
  lane,
  onComplete,
}: ErrorCorrectionDocProps) {
  const addConcern = useShiftQueueStore(s => s.addConcern);
  const normalizedDocRef = useRef({ ...doc, errors: normalizeErrors(doc.errors) });
  const normalizedDoc = normalizedDocRef.current;

  const [activeError, setActiveError] = useState<number | null>(null);
  const [corrections, setCorrections] = useState<Record<number, number | null>>({});
  const [lockedErrors, setLockedErrors] = useState<Set<number>>(new Set());
  const [showResults, setShowResults] = useState<Record<number, boolean>>({});
  const [allDone, setAllDone] = useState(false);

  const timerRefs = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

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

      const timer = setTimeout(() => {
        setLockedErrors(prev => {
          const next = new Set(prev);
          next.add(errorIndex);

          if (next.size === normalizedDoc.errors.length) {
            const correctCount = normalizedDoc.errors.filter((err, idx) => {
              const selected = idx === errorIndex ? optionIndex : corrections[idx];
              return selected === err.correctIndex;
            }).length;
            const total = normalizedDoc.errors.length;
            const score = correctCount / total;

            const answerLog: TaskAnswerLogEntry[] = normalizedDoc.errors.map((err, idx) => {
              const selectedOpt = idx === errorIndex ? optionIndex : corrections[idx];
              const chosenText =
                typeof selectedOpt === 'number'
                  ? err.options[selectedOpt]?.text ?? '(none)'
                  : '(none)';
              return {
                questionId: `err:${idx}`,
                prompt: `${normalizedDoc.title}: "${err.errorWord}"`,
                chosen: chosenText,
                correct: err.options[err.correctIndex]?.text ?? '',
                wasCorrect: selectedOpt === err.correctIndex,
                attempts: 1,
              };
            });

            setAllDone(true);
            setTimeout(
              () => onComplete(score, { correctCount, totalErrors: total, answerLog }),
              800,
            );
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

  const laneHints =
    lane === 1 && normalizedDoc.laneHints?.['1']
      ? (normalizedDoc.laneHints['1'] as string[])
      : null;

  const renderBody = () => {
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
              <p key={sIdx} className="text-sm text-[#4B5563] leading-relaxed inline">
                {sentence}{' '}
              </p>
            );
          }

          let remaining = sentence;
          const parts: React.ReactNode[] = [];

          errorsInSentence.forEach(({ error, errorIndex }, eIdx) => {
            const wordIdx = remaining.indexOf(error.errorWord);
            if (wordIdx === -1) return;

            if (wordIdx > 0) {
              parts.push(
                <span key={`${sIdx}-pre-${eIdx}`} className="text-sm text-[#4B5563]">
                  {remaining.slice(0, wordIdx)}
                </span>,
              );
            }

            const isLocked = lockedErrors.has(errorIndex);
            const selected = corrections[errorIndex];
            const isCorrect = selected === error.correctIndex;
            const isShowingResult = showResults[errorIndex];

            let underlineClass = 'border-b-2 border-dashed border-amber-400 cursor-pointer hover:border-sky-500 active:border-sky-600';
            if (isLocked || isShowingResult) {
              if (isCorrect) {
                underlineClass = 'border-b-2 border-solid border-emerald-500 text-emerald-700';
              } else {
                underlineClass = 'border-b-2 border-solid border-rose-400 text-rose-600';
              }
            }

            parts.push(
              <span key={`${sIdx}-err-${eIdx}`} className="relative inline-block">
                <span
                  className={`text-sm ${underlineClass} transition-colors duration-300 ${
                    isLocked ? 'cursor-default' : ''
                  }`}
                  onClick={() => handleClickError(errorIndex)}
                >
                  {isLocked
                    ? error.options[error.correctIndex].text
                    : error.errorWord}
                </span>

                {laneHints && laneHints[errorIndex] && !isLocked && (
                  <span className="block text-[9px] text-sky-500 mt-0.5">
                    {laneHints[errorIndex]}
                  </span>
                )}

                {activeError === errorIndex && !isLocked && (
                  <div className="absolute left-0 top-full mt-1 z-10 bg-white border border-[#D4CFC6] rounded-xl p-1.5 min-w-[140px] shadow-lg">
                    {error.options.map((option, oIdx) => (
                      <button
                        key={oIdx}
                        className="block w-full text-left px-3 py-1.5 text-xs text-[#4B5563] rounded-lg hover:bg-sky-50 hover:text-sky-700 active:bg-sky-100 transition-colors"
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

          if (remaining) {
            parts.push(
              <span key={`${sIdx}-tail`} className="text-sm text-[#4B5563]">
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

      <div className="flex items-center justify-between px-1">
        <span className="font-ibm-mono text-[10px] text-[#9CA3AF] tracking-wider">
          Errors: {lockedErrors.size} / {normalizedDoc.errors.length} corrected
        </span>
        {allDone && (
          <span className="text-[10px] text-emerald-600 font-medium tracking-wider animate-pulse">
            All corrections applied
          </span>
        )}
      </div>
    </div>
  );
}
