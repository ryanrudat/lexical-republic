import { useEffect, useMemo, useRef, useState } from 'react';
import type { RemediationQuestion, RemediationResultEntry } from '../../api/remediation';

interface RemediationModuleProps {
  /** Used to key initial-shuffle memoization so a fresh remediation re-shuffles. */
  moduleId: string;
  questions: RemediationQuestion[];
  onComplete: (correctCount: number, results: RemediationResultEntry[]) => void;
}

type QuestionState = {
  selectedIdx: number | null;
  submitted: boolean;
  correctIdx: number;
  optionOrder: number[]; // maps displayed position -> original index (0 = correct, 1..n = distractors)
};

/** Fisher-Yates shuffle producing a position map. Stable across re-renders via useRef. */
function shuffleIndices(length: number): number[] {
  const arr = Array.from({ length }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

/**
 * Remediation Module — screen-locking 3-question vocab MCQ fired when a student
 * has been detected grinding the concernScore HUD. Forked from ClarityCheck;
 * differences:
 * - amber accent (vs sky/cyan) — signals "remediation" rather than routine "verification"
 * - z-[1000] sits above the Dynamic Island (matches ComplianceCheckShell)
 * - body.remediation-active class hides the PEARL Dynamic Island while modal is open
 * - PEARL completion copy is forced-happy throughout, NEVER punitive
 *
 * Locked decision: PEARL eye colors/styling untouched here — this is plain MCQ UI.
 */
export default function RemediationModule({
  moduleId,
  questions,
  onComplete,
}: RemediationModuleProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [completed, setCompleted] = useState(false);
  const completedFiredRef = useRef(false);
  const autoDismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Build initial states once, scoped to this moduleId.
  // useMemo keyed on moduleId so a fresh remediation gets a fresh shuffle.
  const initialStates = useMemo<QuestionState[]>(() => {
    return questions.map((q) => {
      const totalOptions = 1 + q.distractors.length;
      const order = shuffleIndices(totalOptions);
      const correctIdx = order.indexOf(0); // original index 0 = correct definition
      return { selectedIdx: null, submitted: false, correctIdx, optionOrder: order };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleId]);

  const [states, setStates] = useState<QuestionState[]>(initialStates);

  // ESC + browser back blocking — student cannot escape without completing.
  useEffect(() => {
    const blockKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    const blockBack = () => {
      window.history.pushState(null, '', window.location.href);
    };
    window.addEventListener('keydown', blockKey, true);
    window.addEventListener('popstate', blockBack);
    blockBack();
    document.body.classList.add('remediation-active');
    return () => {
      window.removeEventListener('keydown', blockKey, true);
      window.removeEventListener('popstate', blockBack);
      document.body.classList.remove('remediation-active');
      if (autoDismissTimerRef.current) clearTimeout(autoDismissTimerRef.current);
    };
  }, []);

  const question = questions[currentIdx];
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

  const fireComplete = () => {
    if (completedFiredRef.current) return;
    completedFiredRef.current = true;
    const results: RemediationResultEntry[] = states.map((s, i) => ({
      word: questions[i]!.word,
      correct: s.selectedIdx === s.correctIdx,
    }));
    const correctCount = results.filter((r) => r.correct).length;
    onComplete(correctCount, results);
  };

  const goNext = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(currentIdx + 1);
      return;
    }
    // Last question — show finale screen, then auto-dismiss after ~2s.
    setCompleted(true);
    autoDismissTimerRef.current = setTimeout(fireComplete, 2000);
  };

  const correctCount = states.filter((s) => s.selectedIdx === s.correctIdx).length;
  const totalCount = questions.length;

  // Score-based completion copy (forced-happy throughout).
  const completionCopy = (() => {
    if (correctCount === totalCount) {
      return {
        accent: 'emerald' as const,
        line: 'Excellent work, Citizen. Engagement restored.',
      };
    }
    if (correctCount >= 1) {
      return {
        accent: 'amber' as const,
        line: 'Verification recorded. Continue to monitor your focus.',
      };
    }
    return {
      accent: 'rose' as const,
      line: 'Verification recorded. We will continue to support your engagement.',
    };
  })();

  const completionAccentClasses: Record<'emerald' | 'amber' | 'rose', string> = {
    emerald: 'text-emerald-700',
    amber: 'text-amber-700',
    rose: 'text-rose-700',
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center px-4 py-8 overflow-y-auto pointer-events-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border-2 border-amber-500">
        {/* Header — Ministry framing */}
        <div className="bg-amber-50 border-b border-amber-200 px-5 py-3 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[9px] font-ibm-mono text-amber-700 tracking-[0.2em] uppercase">
                P.E.A.R.L. — Remediation Module
              </p>
              <h2 className="text-sm font-semibold text-[#2C3340] mt-0.5 tracking-wide">
                STANDARD VOCABULARY VERIFICATION
              </h2>
            </div>
            <span className="text-[10px] font-ibm-mono text-amber-700 bg-white border border-amber-300 px-2 py-0.5 rounded">
              {completed ? 'COMPLETE' : `${currentIdx + 1}/${totalCount}`}
            </span>
          </div>
          {!completed && (
            <p className="text-[11px] text-amber-700 mt-1.5 italic">
              For citizens experiencing focus difficulty.
            </p>
          )}
        </div>

        {/* Body */}
        {completed ? (
          <div className="p-6 space-y-4 text-center">
            <p className="text-[10px] font-ibm-mono text-amber-700 tracking-[0.2em] uppercase">
              Verification Recorded
            </p>
            <p className="text-sm text-[#4B5563]">
              You answered{' '}
              <span className="font-semibold text-amber-700">{correctCount}</span> of{' '}
              <span className="font-semibold">{totalCount}</span> correctly.
            </p>
            <p className={`text-sm italic ${completionAccentClasses[completionCopy.accent]}`}>
              {completionCopy.line}
            </p>
            <button
              onClick={fireComplete}
              className="mt-2 px-5 py-2 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 active:scale-95 transition-all"
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
                let cls =
                  'border-slate-200 bg-white text-slate-700 hover:bg-amber-50 hover:border-amber-300';
                if (showResult && isCorrect) {
                  cls = 'border-emerald-300 bg-emerald-50 text-emerald-900';
                } else if (showResult && isSelected && !isCorrect) {
                  cls = 'border-rose-300 bg-rose-50 text-rose-900';
                } else if (isSelected) {
                  cls = 'border-amber-400 bg-amber-50 text-amber-900';
                }
                return (
                  <button
                    key={displayIdx}
                    onClick={() => handleSelect(displayIdx)}
                    disabled={state.submitted}
                    className={`w-full text-left text-sm font-sans leading-snug px-3 py-2.5 rounded-lg border-2 transition-all active:scale-[0.99] ${cls} ${
                      state.submitted ? 'cursor-default' : 'cursor-pointer'
                    }`}
                  >
                    {getOptionText(displayIdx)}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              {!state.submitted ? (
                <button
                  onClick={handleCheck}
                  disabled={state.selectedIdx === null}
                  className="px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-amber-700 active:scale-95 transition-all"
                >
                  Verify
                </button>
              ) : (
                <button
                  onClick={goNext}
                  className="px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 active:scale-95 transition-all"
                >
                  {currentIdx < totalCount - 1 ? 'Next' : 'Finish'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
