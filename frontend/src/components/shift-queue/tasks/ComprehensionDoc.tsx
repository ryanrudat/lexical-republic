import { useState, useCallback } from 'react';
import DocumentCard from './DocumentCard';

interface ComprehensionQuestion {
  text: string;
  options: string[];
  correctIndex: number;
}

interface ComprehensionDocConfig {
  title: string;
  department?: string;
  classification?: string;
  priority?: string;
  from?: string;
  to?: string;
  re?: string;
  body: string;
  reviewedBy?: string;
  questions: ComprehensionQuestion[];
}

interface ComprehensionDocProps {
  doc: ComprehensionDocConfig;
  onComplete: (score: number) => void;
}

export default function ComprehensionDoc({
  doc,
  onComplete,
}: ComprehensionDocProps) {
  // Track selected answer per question
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const totalQuestions = doc.questions.length;
  const answeredCount = Object.keys(answers).length;
  const allAnswered = answeredCount === totalQuestions;

  const handleSelect = useCallback(
    (questionIndex: number, optionIndex: number) => {
      if (submitted) return;
      setAnswers(prev => ({ ...prev, [questionIndex]: optionIndex }));
    },
    [submitted],
  );

  const handleSubmit = useCallback(() => {
    if (!allAnswered || submitted) return;
    setSubmitted(true);

    // Calculate score
    const correctCount = doc.questions.filter(
      (q, idx) => answers[idx] === q.correctIndex,
    ).length;
    const score = correctCount / totalQuestions;

    // Delay before completing to let student see results
    setTimeout(() => onComplete(score), 1500);
  }, [allAnswered, submitted, doc.questions, answers, totalQuestions, onComplete]);

  return (
    <div className="flex flex-col gap-4">
      {/* Document display */}
      <DocumentCard
        title={doc.title}
        department={doc.department}
        classification={doc.classification}
        priority={doc.priority}
        from={doc.from}
        to={doc.to}
        re={doc.re}
        body={doc.body}
        reviewedBy={doc.reviewedBy}
      />

      {/* Questions section */}
      <div className="space-y-4">
        <div className="px-1">
          <span className="font-ibm-mono text-[10px] text-white/30 tracking-[0.3em] uppercase">
            Comprehension Verification
          </span>
        </div>

        {doc.questions.map((question, qIdx) => {
          const selectedOption = answers[qIdx];
          const isCorrect = submitted && selectedOption === question.correctIndex;
          const isWrong = submitted && selectedOption !== undefined && selectedOption !== question.correctIndex;

          return (
            <div
              key={qIdx}
              className={`ios-glass-card border transition-colors duration-300 ${
                isCorrect
                  ? 'border-neon-mint/40'
                  : isWrong
                    ? 'border-rose-400/40'
                    : 'border-white/10'
              } p-4 space-y-3`}
            >
              {/* Question text */}
              <p className="font-ibm-mono text-sm text-white/80 leading-relaxed">
                <span className="text-white/30 mr-2">{String(qIdx + 1).padStart(2, '0')}.</span>
                {question.text}
              </p>

              {/* Options */}
              <div className="grid grid-cols-1 gap-1.5">
                {question.options.map((option, oIdx) => {
                  const isSelected = selectedOption === oIdx;
                  const isCorrectOption = question.correctIndex === oIdx;
                  const showCorrectHighlight = submitted && isCorrectOption;
                  const showWrongHighlight = submitted && isSelected && !isCorrectOption;

                  let optionClasses =
                    'w-full text-left px-3 py-2 rounded-lg font-ibm-mono text-xs transition-all duration-200 ';

                  if (showCorrectHighlight) {
                    optionClasses +=
                      'bg-neon-mint/15 border border-neon-mint/40 text-neon-mint';
                  } else if (showWrongHighlight) {
                    optionClasses +=
                      'bg-rose-400/10 border border-rose-400/30 text-rose-400 line-through';
                  } else if (isSelected) {
                    optionClasses +=
                      'ios-glass-pill-action text-white/90';
                  } else {
                    optionClasses +=
                      'ios-glass-pill text-white/60 hover:text-white/80 hover:bg-white/5';
                  }

                  return (
                    <button
                      key={oIdx}
                      className={optionClasses}
                      onClick={() => handleSelect(qIdx, oIdx)}
                      disabled={submitted}
                    >
                      <span className="text-white/20 mr-2">
                        {String.fromCharCode(65 + oIdx)}.
                      </span>
                      {option}
                    </button>
                  );
                })}
              </div>

              {/* Post-submit feedback */}
              {submitted && isWrong && (
                <p className="font-ibm-mono text-[10px] text-rose-400/60 pl-1">
                  Correct answer: {String.fromCharCode(65 + question.correctIndex)}.{' '}
                  {question.options[question.correctIndex]}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Submit button */}
      {!submitted && (
        <button
          className={`ios-glass-pill-action px-6 py-2.5 font-ibm-mono text-xs tracking-[0.2em] uppercase transition-opacity duration-300 ${
            allAnswered
              ? 'opacity-100 cursor-pointer'
              : 'opacity-30 cursor-not-allowed'
          }`}
          onClick={handleSubmit}
          disabled={!allAnswered}
        >
          Submit Verification
        </button>
      )}

      {/* Result summary */}
      {submitted && (
        <div className="flex items-center justify-between px-1">
          <span className="font-ibm-mono text-[10px] text-white/30 tracking-wider">
            SCORE:{' '}
            {doc.questions.filter((q, idx) => answers[idx] === q.correctIndex).length}
            {' / '}
            {totalQuestions}
          </span>
          <span className="font-ibm-mono text-[10px] text-neon-mint tracking-wider animate-pulse">
            Verification complete
          </span>
        </div>
      )}
    </div>
  );
}
