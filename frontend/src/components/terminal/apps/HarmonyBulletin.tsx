import { useState, useRef } from 'react';
import type { HarmonyPost, BulletinQuestion } from '../../../api/harmony';
import { useHarmonyStore } from '../../../stores/harmonyStore';

/** Fisher-Yates shuffle with index mapping for answer validation. */
function shuffleWithMapping(arr: string[]): { shuffled: string[]; mapping: number[] } {
  const indices = arr.map((_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return {
    shuffled: indices.map(i => arr[i]),
    mapping: indices,
  };
}

export default function HarmonyBulletin({
  post,
}: {
  post: HarmonyPost;
}) {
  const [showQuestions, setShowQuestions] = useState(false);
  const { bulletinAnswers, respondToBulletin } = useHarmonyStore();
  const answers = bulletinAnswers[post.id] ?? {};

  const bulletin = post.bulletinData;
  if (!bulletin) return null;

  return (
    <div className="mx-4 mb-3 rounded-xl border border-sky-200 overflow-hidden bg-sky-50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-sky-600/10 border-b border-sky-200">
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-medium tracking-[0.15em] uppercase text-sky-700">
            Ministry Bulletin
          </span>
          <span className="text-[9px] bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full border border-sky-200">
            {bulletin.refNumber}
          </span>
        </div>
        {post.weekNumber && (
          <span className="text-[10px] text-sky-500">Shift {post.weekNumber}</span>
        )}
      </div>

      {/* Author + Content */}
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-full bg-sky-200 border border-sky-300 flex items-center justify-center flex-shrink-0">
            <span className="text-[8px] font-bold text-sky-700">M</span>
          </div>
          <span className="text-[11px] font-medium text-sky-800">{post.designation}</span>
        </div>
        <p className="text-[13px] text-[#4B5563] leading-relaxed whitespace-pre-line">{post.content}</p>
      </div>

      {/* PEARL note */}
      {post.pearlNote && (
        <div className="mx-4 mb-3 px-3 py-2 border-l-2 border-emerald-300 bg-emerald-50/50 rounded-r-lg">
          <p className="text-[10px] text-emerald-700 italic">{post.pearlNote}</p>
        </div>
      )}

      {/* Comprehension toggle */}
      <div className="border-t border-sky-200">
        <button
          onClick={() => setShowQuestions(!showQuestions)}
          className="w-full px-4 py-2 text-[10px] font-medium tracking-[0.1em] text-sky-700 hover:bg-sky-100/50 transition-colors flex items-center justify-between"
        >
          <span>TEST UNDERSTANDING</span>
          <span className="text-[9px] text-sky-500">
            {Object.keys(answers).length}/{bulletin.questions.length}
          </span>
        </button>

        {showQuestions && (
          <div className="px-4 pb-3 space-y-3">
            {bulletin.questions.map((q, qi) => (
              <BulletinMCQ
                key={qi}
                postId={post.id}
                questionIndex={qi}
                question={q}
                answered={answers[qi]}
                onRespond={respondToBulletin}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function BulletinMCQ({
  postId,
  questionIndex,
  question,
  answered,
  onRespond,
}: {
  postId: string;
  questionIndex: number;
  question: BulletinQuestion;
  answered: boolean | undefined;
  onRespond: (postId: string, qi: number, si: number) => Promise<any>;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<{ isCorrect: boolean; correctIndex: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const shuffleRef = useRef<{ shuffled: string[]; mapping: number[] }>(
    shuffleWithMapping(question.options),
  );
  const { shuffled, mapping } = shuffleRef.current;

  const handleSubmit = async () => {
    if (selected === null || submitting) return;
    setSubmitting(true);
    const originalIdx = mapping[selected];
    const res = await onRespond(postId, questionIndex, originalIdx);
    if (res) setResult(res);
    setSubmitting(false);
  };

  const isAnswered = answered !== undefined || result !== null;
  const isCorrect = result?.isCorrect ?? answered;

  return (
    <div className={`rounded-lg border p-3 ${
      isAnswered
        ? isCorrect ? 'border-green-300 bg-green-50/50' : 'border-rose-300 bg-rose-50/50'
        : 'border-sky-200 bg-white'
    }`}>
      <p className="text-[11px] font-medium text-[#2C3340] mb-2">{question.question}</p>
      <div className="grid grid-cols-1 gap-1.5">
        {shuffled.map((opt, di) => {
          const originalIdx = mapping[di];
          const isCorrectOption = result ? originalIdx === result.correctIndex : false;
          const isSelected = selected === di;

          return (
            <button
              key={di}
              onClick={() => !isAnswered && setSelected(di)}
              disabled={isAnswered}
              className={`text-left text-[11px] px-3 py-1.5 rounded-lg border transition-colors ${
                isAnswered
                  ? isCorrectOption
                    ? 'border-green-400 bg-green-100 text-green-800'
                    : isSelected && !isCorrectOption
                      ? 'border-rose-400 bg-rose-100 text-rose-800'
                      : 'border-gray-200 text-gray-400'
                  : isSelected
                    ? 'border-sky-400 bg-sky-100 text-sky-800'
                    : 'border-gray-200 text-[#4B5563] hover:border-sky-300 active:bg-sky-50'
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
      {!isAnswered && selected !== null && (
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="mt-2 w-full text-[10px] font-medium tracking-[0.1em] py-1.5 rounded-lg bg-sky-600 text-white hover:bg-sky-700 active:bg-sky-800 transition-colors disabled:opacity-50"
        >
          {submitting ? 'CHECKING...' : 'SUBMIT'}
        </button>
      )}
    </div>
  );
}
