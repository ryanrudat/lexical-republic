import { useEffect, useMemo, useState } from 'react';
import type { ClarityCheckConfig } from '../../types/shiftQueue';
import { submitClarityCheck } from '../../api/clarity-check';

interface Props {
  config: ClarityCheckConfig;
  weekNumber: number;
  onComplete: () => void;
}

type QuestionState = {
  selectedIdx: number | null;
  submitted: boolean;
  correctIdx: number;
  optionOrder: number[]; // maps displayed position -> original index (0 = correct def, 1..n = distractors)
};

/** Fisher-Yates shuffle producing a position map. */
function shuffleIndices(length: number): number[] {
  const arr = Array.from({ length }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

export default function ClarityCheck({ config, weekNumber, onComplete }: Props) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);

  const initialQuestions = useMemo<QuestionState[]>(() => {
    return config.questions.map((q) => {
      // Options array: [correctDefinition, ...distractors]
      const totalOptions = 1 + q.distractors.length;
      const order = shuffleIndices(totalOptions);
      const correctIdx = order.indexOf(0); // original index 0 is the correct definition
      return { selectedIdx: null, submitted: false, correctIdx, optionOrder: order };
    });
  }, [config.id]);

  const [states, setStates] = useState<QuestionState[]>(initialQuestions);

  // Block ESC + browser back (student cannot escape without completing).
  useEffect(() => {
    const blockKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    const blockBack = () => {
      // Push a state so back-button attempts just no-op
      window.history.pushState(null, '', window.location.href);
    };
    window.addEventListener('keydown', blockKey, true);
    window.addEventListener('popstate', blockBack);
    blockBack();
    return () => {
      window.removeEventListener('keydown', blockKey, true);
      window.removeEventListener('popstate', blockBack);
    };
  }, []);

  const question = config.questions[currentIdx];
  const state = states[currentIdx];
  if (!question || !state) return null;

  const getOptionText = (displayIdx: number) => {
    const originalIdx = state.optionOrder[displayIdx]!;
    return originalIdx === 0
      ? question.correctDefinition
      : question.distractors[originalIdx - 1]!;
  };

  const totalOptions = 1 + question.distractors.length;

  const handleSelect = (displayIdx: number) => {
    if (state.submitted) return;
    setStates((prev) =>
      prev.map((s, i) => (i === currentIdx ? { ...s, selectedIdx: displayIdx } : s)),
    );
  };

  const handleCheck = () => {
    if (state.selectedIdx === null) return;
    setStates((prev) =>
      prev.map((s, i) => (i === currentIdx ? { ...s, submitted: true } : s)),
    );
  };

  const goNext = async () => {
    if (currentIdx < config.questions.length - 1) {
      setCurrentIdx(currentIdx + 1);
      return;
    }
    // Last question complete — submit summary to backend
    setSubmitting(true);
    const words = config.questions.map((q, i) => ({
      word: q.word,
      correct: states[i]!.selectedIdx === states[i]!.correctIdx,
    }));
    try {
      await submitClarityCheck({ checkId: config.id, weekNumber, words });
    } catch {
      // Log-and-continue — student shouldn't be stuck if backend is unreachable
    }
    setSubmitting(false);
    setCompleted(true);
  };

  const correctCount = states.filter((s) => s.selectedIdx === s.correctIdx).length;
  const allDone = states.every((s) => s.submitted);

  return (
    <div className="fixed inset-0 z-[90] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center px-4 py-8 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border-2 border-sky-300">
        {/* Header — Ministry framing */}
        <div className="bg-sky-50 border-b border-sky-200 px-5 py-3 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[9px] font-ibm-mono text-sky-600 tracking-[0.2em] uppercase">
                P.E.A.R.L. — Clarity Check
              </p>
              <h2 className="text-sm font-semibold text-[#2C3340] mt-0.5">
                {config.title}
              </h2>
            </div>
            <span className="text-[10px] font-ibm-mono text-sky-600 bg-white border border-sky-200 px-2 py-0.5 rounded">
              {completed ? 'CLEARED' : `${currentIdx + 1}/${config.questions.length}`}
            </span>
          </div>
          {config.subtitle && !completed && (
            <p className="text-[11px] text-sky-700 mt-1.5">{config.subtitle}</p>
          )}
        </div>

        {/* Body */}
        {completed ? (
          <div className="p-6 space-y-4 text-center">
            <p className="text-[10px] font-ibm-mono text-sky-600 tracking-[0.2em] uppercase">
              VERIFICATION RECORDED
            </p>
            <p className="text-sm text-[#4B5563]">
              You answered <span className="font-semibold text-sky-700">{correctCount}</span> of{' '}
              <span className="font-semibold">{config.questions.length}</span> correctly.
            </p>
            <p className="text-xs text-[#8B8578] italic">
              Thank you for your cooperation, Citizen. Compliance noted.
            </p>
            <button
              onClick={onComplete}
              className="mt-2 px-5 py-2 rounded-lg bg-sky-600 text-white text-sm font-medium hover:bg-sky-700 active:scale-95 transition-all"
            >
              Continue
            </button>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            <p className="text-xs text-[#8B8578]">Select the approved definition of:</p>
            <p className="text-2xl font-semibold text-[#2C3340] font-ibm-mono">
              {question.word}
            </p>

            <div className="space-y-2">
              {Array.from({ length: totalOptions }).map((_, displayIdx) => {
                const isSelected = state.selectedIdx === displayIdx;
                const isCorrect = state.correctIdx === displayIdx;
                const showResult = state.submitted;
                let cls = 'border-slate-200 bg-white hover:bg-sky-50 hover:border-sky-300';
                if (showResult && isCorrect) {
                  cls = 'border-emerald-300 bg-emerald-50';
                } else if (showResult && isSelected && !isCorrect) {
                  cls = 'border-rose-300 bg-rose-50';
                } else if (isSelected) {
                  cls = 'border-sky-400 bg-sky-50';
                }
                return (
                  <button
                    key={displayIdx}
                    onClick={() => handleSelect(displayIdx)}
                    disabled={state.submitted}
                    className={`w-full text-left text-sm px-3 py-2.5 rounded-lg border-2 transition-all active:scale-[0.99] ${cls} ${
                      state.submitted ? 'cursor-default' : 'cursor-pointer'
                    }`}
                  >
                    {getOptionText(displayIdx)}
                  </button>
                );
              })}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-1">
              {!state.submitted ? (
                <button
                  onClick={handleCheck}
                  disabled={state.selectedIdx === null}
                  className="px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-sky-700 active:scale-95 transition-all"
                >
                  Verify
                </button>
              ) : (
                <button
                  onClick={goNext}
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-medium hover:bg-sky-700 active:scale-95 transition-all disabled:opacity-60"
                >
                  {currentIdx < config.questions.length - 1
                    ? 'Next'
                    : submitting
                      ? 'Recording…'
                      : allDone
                        ? 'Finish'
                        : 'Finish'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
