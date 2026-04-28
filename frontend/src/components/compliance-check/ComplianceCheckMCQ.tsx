import { useEffect, useMemo, useState } from 'react';
import type { ComplianceCheckQuestion } from '../../types/complianceCheck';

interface Props {
  questions: ComplianceCheckQuestion[];
  onComplete: (results: Array<{ word: string; correct: boolean }>, correctCount: number) => void;
}

type QuestionState = {
  selectedIdx: number | null;
  submitted: boolean;
  correctIdx: number;
  optionOrder: number[];
};

function shuffleIndices(length: number): number[] {
  const arr = Array.from({ length }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

export default function ComplianceCheckMCQ({ questions, onComplete }: Props) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);

  const initialQuestions = useMemo<QuestionState[]>(() => {
    return questions.map((q) => {
      const totalOptions = 1 + q.distractors.length;
      const order = shuffleIndices(totalOptions);
      const correctIdx = order.indexOf(0);
      return { selectedIdx: null, submitted: false, correctIdx, optionOrder: order };
    });
  }, [questions]);

  const [states, setStates] = useState<QuestionState[]>(initialQuestions);

  useEffect(() => {
    setStates(initialQuestions);
    setCurrentIdx(0);
    setCompleted(false);
  }, [initialQuestions]);

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

  const goNext = async () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(currentIdx + 1);
      return;
    }
    setSubmitting(true);
    const results = states.map((s, i) => ({
      word: questions[i]!.word,
      correct: s.selectedIdx === s.correctIdx,
    }));
    const correctCount = results.filter((r) => r.correct).length;
    setSubmitting(false);
    setCompleted(true);
    onComplete(results, correctCount);
  };

  const correctCount = states.filter((s) => s.selectedIdx === s.correctIdx).length;

  if (completed) {
    return (
      <div className="bg-white rounded-2xl shadow-2xl border-2 border-cyan-300 p-6 text-center space-y-4">
        <p className="font-ibm-mono text-[10px] text-cyan-600 tracking-[0.25em] uppercase">
          Verification Recorded
        </p>
        <p className="text-sm text-[#4B5563]">
          You answered{' '}
          <span className="font-semibold text-cyan-700">{correctCount}</span> of{' '}
          <span className="font-semibold">{questions.length}</span> correctly.
        </p>
        <p className="text-xs text-[#8B8578] italic">
          Thank you for your cooperation, Citizen. Compliance noted.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-2xl border-2 border-cyan-300 overflow-hidden">
      <div className="bg-cyan-50 border-b border-cyan-200 px-5 py-3">
        <div className="flex items-center justify-between">
          <p className="font-ibm-mono text-[9px] text-cyan-600 tracking-[0.2em] uppercase">
            Vocabulary Verification
          </p>
          <span className="text-[10px] font-ibm-mono text-cyan-600 bg-white border border-cyan-200 px-2 py-0.5 rounded">
            {currentIdx + 1}/{questions.length}
          </span>
        </div>
      </div>

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
            let cls = 'border-slate-200 bg-white hover:bg-cyan-50 hover:border-cyan-300';
            if (showResult && isCorrect) {
              cls = 'border-emerald-300 bg-emerald-50';
            } else if (showResult && isSelected && !isCorrect) {
              cls = 'border-rose-300 bg-rose-50';
            } else if (isSelected) {
              cls = 'border-cyan-400 bg-cyan-50';
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

        <div className="flex items-center justify-end gap-2 pt-1">
          {!state.submitted ? (
            <button
              onClick={handleCheck}
              disabled={state.selectedIdx === null}
              className="px-4 py-2 rounded-lg bg-cyan-600 text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-cyan-700 active:scale-95 transition-all"
            >
              Verify
            </button>
          ) : (
            <button
              onClick={goNext}
              disabled={submitting}
              className="px-4 py-2 rounded-lg bg-cyan-600 text-white text-sm font-medium hover:bg-cyan-700 active:scale-95 transition-all disabled:opacity-60"
            >
              {currentIdx < questions.length - 1
                ? 'Next'
                : submitting
                  ? 'Recording…'
                  : 'Finish'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
