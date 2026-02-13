import { useState } from 'react';

export interface CheckItem {
  id: string;
  question: string;
  choices: string[];
  answerIndex: number;
}

interface MultipleChoiceCheckProps {
  checks: CheckItem[];
  onSubmit: (answers: number[], score: number) => void;
}

export default function MultipleChoiceCheck({ checks, onSubmit }: MultipleChoiceCheckProps) {
  const [answers, setAnswers] = useState<(number | null)[]>(new Array(checks.length).fill(null));
  const [submitted, setSubmitted] = useState(false);

  const allAnswered = answers.every(a => a !== null);

  const handleSelect = (checkIndex: number, choiceIndex: number) => {
    if (submitted) return;
    const newAnswers = [...answers];
    newAnswers[checkIndex] = choiceIndex;
    setAnswers(newAnswers);
  };

  const handleSubmit = () => {
    if (!allAnswered || submitted) return;
    setSubmitted(true);
    const correct = answers.filter((a, i) => a === checks[i].answerIndex).length;
    const score = correct / checks.length;
    onSubmit(answers as number[], score);
  };

  return (
    <div className="space-y-6">
      {checks.map((check, ci) => (
        <div key={check.id} className="ios-glass-card p-4">
          <p className="font-ibm-mono text-sm text-white/90 mb-3">
            <span className="text-neon-cyan mr-2">{ci + 1}.</span>
            {check.question}
          </p>
          <div className="space-y-2">
            {check.choices.map((choice, choiceIdx) => {
              const isSelected = answers[ci] === choiceIdx;
              const isCorrect = submitted && choiceIdx === check.answerIndex;
              const isWrong = submitted && isSelected && choiceIdx !== check.answerIndex;

              return (
                <button
                  key={choiceIdx}
                  onClick={() => handleSelect(ci, choiceIdx)}
                  disabled={submitted}
                  className={`w-full text-left px-3 py-2 rounded-lg font-ibm-mono text-sm transition-all border ${
                    isCorrect
                      ? 'bg-neon-mint/10 border-neon-mint/40 text-neon-mint'
                      : isWrong
                      ? 'bg-neon-pink/10 border-neon-pink/40 text-neon-pink'
                      : isSelected
                      ? 'bg-neon-cyan/10 border-neon-cyan/40 text-neon-cyan'
                      : 'bg-white/5 border-white/10 text-white/75 hover:border-white/20'
                  }`}
                >
                  <span className="mr-2 text-white/30">{String.fromCharCode(65 + choiceIdx)}.</span>
                  {choice}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {!submitted && (
        <button
          onClick={handleSubmit}
          disabled={!allAnswered}
          className={`w-full py-3 rounded-full font-ibm-mono text-xs uppercase tracking-[0.25em] transition-all ${
            allAnswered
              ? 'ios-glass-pill-action text-neon-cyan hover:shadow-[0_0_16px_rgba(0,229,255,0.2)]'
              : 'ios-glass-pill text-white/25 cursor-not-allowed'
          }`}
        >
          Submit Answers
        </button>
      )}

      {submitted && (
        <div className="text-center font-ibm-mono text-xs text-neon-mint tracking-wider ios-text-glow-mint">
          ANSWERS SUBMITTED — {answers.filter((a, i) => a === checks[i].answerIndex).length}/{checks.length} CORRECT
        </div>
      )}
    </div>
  );
}
