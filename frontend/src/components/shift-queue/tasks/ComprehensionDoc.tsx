import { useState, useCallback } from 'react';
import DocumentCard from './DocumentCard';
import type { TaskAnswerLogEntry } from '../../../types/taskResult';

interface ComprehensionQuestion {
  text?: string;
  question?: string;
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

export interface ComprehensionResult {
  correctCount: number;
  totalQuestions: number;
  answerLog: TaskAnswerLogEntry[];
}

interface ComprehensionDocProps {
  doc: ComprehensionDocConfig;
  onComplete: (score: number, result: ComprehensionResult) => void;
}

export default function ComprehensionDoc({
  doc,
  onComplete,
}: ComprehensionDocProps) {
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

    const correctCount = doc.questions.filter(
      (q, idx) => answers[idx] === q.correctIndex,
    ).length;
    const score = correctCount / totalQuestions;

    const answerLog: TaskAnswerLogEntry[] = doc.questions.map((q, idx) => {
      const chosenIdx = answers[idx];
      const chosenText =
        typeof chosenIdx === 'number' ? q.options[chosenIdx] : '(no answer)';
      return {
        questionId: `comp:${idx}`,
        prompt: q.text || q.question || `Question ${idx + 1}`,
        chosen: chosenText,
        correct: q.options[q.correctIndex],
        wasCorrect: chosenIdx === q.correctIndex,
        attempts: 1,
      };
    });

    setTimeout(
      () => onComplete(score, { correctCount, totalQuestions, answerLog }),
      1500,
    );
  }, [allAnswered, submitted, doc.questions, answers, totalQuestions, onComplete]);

  return (
    <div className="flex flex-col gap-4">
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

      <div className="space-y-4">
        <div className="px-1">
          <span className="font-ibm-mono text-[10px] text-[#8B8578] tracking-[0.2em] uppercase">
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
              className={`bg-white border rounded-xl transition-colors duration-300 ${
                isCorrect
                  ? 'border-emerald-300'
                  : isWrong
                    ? 'border-rose-300'
                    : 'border-[#E8E4DC]'
              } p-4 space-y-3`}
            >
              <p className="text-sm text-[#2C3340] leading-relaxed">
                <span className="text-[#B8B3AA] mr-2">{String(qIdx + 1).padStart(2, '0')}.</span>
                {question.text || question.question}
              </p>

              <div className="grid grid-cols-1 gap-1.5">
                {question.options.map((option, oIdx) => {
                  const isSelected = selectedOption === oIdx;
                  const isCorrectOption = question.correctIndex === oIdx;
                  const showCorrectHighlight = submitted && isCorrectOption;
                  const showWrongHighlight = submitted && isSelected && !isCorrectOption;

                  let optionClasses =
                    'w-full text-left px-3 py-2 rounded-xl text-xs border transition-all duration-200 ';

                  if (showCorrectHighlight) {
                    optionClasses += 'bg-emerald-50 border-emerald-300 text-emerald-700 font-medium';
                  } else if (showWrongHighlight) {
                    optionClasses += 'bg-rose-50 border-rose-300 text-rose-600 line-through';
                  } else if (isSelected) {
                    optionClasses += 'bg-sky-50 border-sky-400 text-sky-700';
                  } else {
                    optionClasses += 'bg-white border-[#D4CFC6] text-[#4B5563] hover:border-sky-300 hover:bg-sky-50/50 active:bg-sky-100 active:scale-[0.98]';
                  }

                  return (
                    <button
                      key={oIdx}
                      className={optionClasses}
                      onClick={() => handleSelect(qIdx, oIdx)}
                      disabled={submitted}
                    >
                      <span className="text-[#B8B3AA] mr-2">
                        {String.fromCharCode(65 + oIdx)}.
                      </span>
                      {option}
                    </button>
                  );
                })}
              </div>

              {submitted && isWrong && (
                <p className="text-[10px] text-rose-500 pl-1">
                  Correct answer: {String.fromCharCode(65 + question.correctIndex)}.{' '}
                  {question.options[question.correctIndex]}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {!submitted && (
        <button
          className={`px-6 py-2.5 rounded-xl bg-sky-600 text-white text-xs font-medium tracking-wider transition-opacity duration-300 ${
            allAnswered
              ? 'opacity-100 cursor-pointer hover:bg-sky-700 active:bg-sky-800'
              : 'opacity-40 cursor-not-allowed'
          }`}
          onClick={handleSubmit}
          disabled={!allAnswered}
        >
          Submit Verification
        </button>
      )}

      {submitted && (
        <div className="flex items-center justify-between px-1">
          <span className="font-ibm-mono text-[10px] text-[#9CA3AF] tracking-wider">
            Score:{' '}
            {doc.questions.filter((q, idx) => answers[idx] === q.correctIndex).length}
            {' / '}
            {totalQuestions}
          </span>
          <span className="text-[10px] text-emerald-600 font-medium tracking-wider animate-pulse">
            Verification complete
          </span>
        </div>
      )}
    </div>
  );
}
