import { useState, useCallback } from 'react';
import type { TaskProps } from '../../../types/shiftQueue';
import { useStudentStore } from '../../../stores/studentStore';
import { useShiftQueueStore } from '../../../stores/shiftQueueStore';
import TargetWordHighlighter from './shared/TargetWordHighlighter';
import WritingEvaluator from './shared/WritingEvaluator';
import type { EvalResult } from './shared/WritingEvaluator';

// ─── Types ───────────────────────────────────────────────────────

interface FieldConfig {
  key: string;
  label: string;
  type: 'readonly' | 'dropdown';
  value?: string;
  options?: string[];
  logToNarrativeChoice?: boolean;
}

interface LaneScaffold {
  [lane: number]: {
    prompt?: string;
    hints?: string[];
    sentenceStarters?: string[];
  } | undefined;
}

interface BlankConfig {
  text: string;
  answers: string[];
}

interface IntakeQuestion {
  key: string;
  label: string;
  options: string[];
  correctIndex: number;
}

interface CardConfig {
  type: 'personal_info' | 'status_review' | 'writing' | 'acknowledgment' | 'intake_questions';
  title?: string;
  fields?: FieldConfig[];
  prompt?: string;
  minWords?: number;
  lane?: LaneScaffold;
  blanks?: BlankConfig[];
  checkbox?: string;
  questions?: IntakeQuestion[];
}

// ─── Helpers ─────────────────────────────────────────────────────

function resolveFieldValue(value: string | undefined, designation: string): string {
  if (!value) return '';
  return value
    .replace('{designation}', designation)
    .replace('{date}', new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }));
}

// ─── Component ───────────────────────────────────────────────────

export default function IntakeForm({ config, weekConfig, onComplete }: TaskProps) {
  const cards = (config.cards ?? []) as CardConfig[];
  const user = useStudentStore(s => s.user);
  const addConcern = useShiftQueueStore(s => s.addConcern);
  const designation = user?.designation ?? 'UNKNOWN';
  const lane = user?.lane ?? 2;

  const [currentCard, setCurrentCard] = useState(0);
  const [writingText, setWritingText] = useState('');
  const [writingSubmissions, setWritingSubmissions] = useState<Record<number, string>>({});
  const [dropdownValues, setDropdownValues] = useState<Record<string, string>>({});
  const [blanksValues, setBlanksValues] = useState<string[]>([]);
  const [checkboxChecked, setCheckboxChecked] = useState(false);
  const [cardCompleted, setCardCompleted] = useState<boolean[]>(
    () => cards.map(() => false),
  );
  const [writingPassed, setWritingPassed] = useState(false);
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, number>>({});
  const [questionLocked, setQuestionLocked] = useState<Record<string, boolean>>({});

  const card = cards[currentCard];
  const total = cards.length;

  // ── Field requirement check ──────────────────────────────────

  const isInfoCardReady = useCallback(() => {
    if (!card || (card.type !== 'personal_info' && card.type !== 'status_review')) return false;
    if (!card.fields) return true;
    return card.fields.every(f => {
      if (f.type === 'dropdown') {
        return !!dropdownValues[f.key];
      }
      return true;
    });
  }, [card, dropdownValues]);

  const isAcknowledgmentReady = useCallback(() => {
    if (!card || card.type !== 'acknowledgment') return false;
    const answers = card.blanks?.[0]?.answers ?? [];
    if (answers.length > 0 && blanksValues.length < answers.length) return false;
    if (answers.length > 0 && blanksValues.some(v => !v.trim())) return false;
    return checkboxChecked;
  }, [card, blanksValues, checkboxChecked]);

  // ── Navigation ───────────────────────────────────────────────

  const advanceCard = useCallback(() => {
    const updated = [...cardCompleted];
    updated[currentCard] = true;
    setCardCompleted(updated);

    if (currentCard < total - 1) {
      setCurrentCard(currentCard + 1);
      setDropdownValues({});
      setBlanksValues([]);
      setCheckboxChecked(false);
      setWritingText('');
      setWritingPassed(false);
      setQuestionAnswers({});
      setQuestionLocked({});
    } else {
      const score = 1;
      const details: Record<string, unknown> = {
        cardsCompleted: total,
        dropdownChoices: dropdownValues,
        writingSubmissions,
      };
      onComplete(score, details);
    }
  }, [currentCard, total, cardCompleted, dropdownValues, writingSubmissions, onComplete]);

  // ── Writing result handler ───────────────────────────────────

  const handleWritingResult = useCallback((result: EvalResult) => {
    if (result.passed) {
      setWritingSubmissions(prev => ({ ...prev, [currentCard]: writingText }));
      setWritingPassed(true);
    } else if (!result.isDegraded) {
      addConcern(0.05);
    }
  }, [addConcern, currentCard, writingText]);

  // ── Render helpers ───────────────────────────────────────────

  function renderInfoCard(c: CardConfig) {
    const fields = c.fields ?? [];

    return (
      <div className="space-y-3">
        {c.title && (
          <h3 className="font-ibm-mono text-[10px] tracking-[0.15em] uppercase text-[#8B8578] mb-4">
            {c.title}
          </h3>
        )}
        {fields.map(field => {
          if (field.type === 'readonly') {
            return (
              <div key={field.key} className="bg-[#FAFAF7] border border-[#E8E4DC] rounded-xl p-3">
                <span className="font-ibm-mono text-[10px] text-[#9CA3AF] tracking-wider uppercase">
                  {field.label}
                </span>
                <p className="text-sm text-[#2C3340] mt-1">
                  {resolveFieldValue(field.value, designation)}
                </p>
              </div>
            );
          }

          if (field.type === 'dropdown') {
            return (
              <div key={field.key} className="bg-[#FAFAF7] border border-[#E8E4DC] rounded-xl p-3">
                <span className="font-ibm-mono text-[10px] text-[#9CA3AF] tracking-wider uppercase">
                  {field.label}
                </span>
                <select
                  className="w-full mt-1 text-sm bg-white border border-[#D4CFC6] rounded-lg px-3 py-2 text-[#2C3340] focus:outline-none focus:ring-1 focus:ring-sky-400"
                  value={dropdownValues[field.key] ?? ''}
                  onChange={e => {
                    setDropdownValues(prev => ({
                      ...prev,
                      [field.key]: e.target.value,
                    }));
                  }}
                >
                  <option value="">-- Select --</option>
                  {(field.options ?? []).map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            );
          }

          return null;
        })}

        <div className="pt-4">
          <button
            className="px-6 py-2.5 rounded-xl bg-sky-600 text-white text-xs font-medium tracking-wider hover:bg-sky-700 active:bg-sky-800 active:scale-[0.98] disabled:opacity-40 transition-colors"
            disabled={!isInfoCardReady()}
            onClick={advanceCard}
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  function renderIntakeQuestionsCard(c: CardConfig) {
    const questions = c.questions ?? [];
    const allCorrect = questions.length > 0 && questions.every(q => questionLocked[q.key]);

    return (
      <div className="space-y-3">
        {c.title && (
          <h3 className="font-ibm-mono text-[10px] tracking-[0.15em] uppercase text-[#8B8578] mb-4">
            {c.title}
          </h3>
        )}

        {questions.map(q => {
          const hasAnswer = Object.prototype.hasOwnProperty.call(questionAnswers, q.key);
          const selected = questionAnswers[q.key];
          const isLocked = questionLocked[q.key];
          const isWrong = hasAnswer && selected !== q.correctIndex && !isLocked;

          return (
            <div key={q.key} className="bg-[#FAFAF7] border border-[#E8E4DC] rounded-xl p-3">
              <span className="font-ibm-mono text-[10px] text-[#9CA3AF] tracking-wider uppercase block mb-1">
                {q.label}
              </span>
              <select
                className={`w-full text-sm bg-white border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 transition-colors ${
                  isLocked
                    ? 'border-emerald-300 text-emerald-700 bg-emerald-50'
                    : isWrong
                    ? 'border-rose-300 text-rose-600 bg-rose-50'
                    : 'border-[#D4CFC6] text-[#2C3340] focus:ring-sky-400'
                }`}
                value={hasAnswer ? selected : ''}
                disabled={isLocked}
                onChange={e => {
                  const val = e.target.value;
                  if (val === '') return;
                  const idx = parseInt(val, 10);
                  setQuestionAnswers(prev => ({ ...prev, [q.key]: idx }));
                  if (idx === q.correctIndex) {
                    setQuestionLocked(prev => ({ ...prev, [q.key]: true }));
                  }
                }}
              >
                <option value="">-- Select --</option>
                {q.options.map((opt, i) => (
                  <option key={i} value={i}>{opt}</option>
                ))}
              </select>
              {isLocked && (
                <span className="text-[10px] text-emerald-600 mt-1 block font-medium">
                  &#10003; Correct
                </span>
              )}
              {isWrong && (
                <span className="text-[10px] text-rose-500 mt-1 block">
                  Not quite — try again
                </span>
              )}
            </div>
          );
        })}

        <div className="pt-4">
          <button
            className="px-6 py-2.5 rounded-xl bg-sky-600 text-white text-xs font-medium tracking-wider hover:bg-sky-700 active:bg-sky-800 active:scale-[0.98] disabled:opacity-40 transition-colors"
            disabled={!allCorrect}
            onClick={advanceCard}
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  function renderWritingCard(c: CardConfig) {
    const scaffolding = c.lane?.[lane];

    return (
      <div className="space-y-4">
        {c.title && (
          <h3 className="font-ibm-mono text-[10px] tracking-[0.15em] uppercase text-[#8B8578] mb-2">
            {c.title}
          </h3>
        )}

        {c.prompt && (
          <p className="text-sm text-[#4B5563] leading-relaxed">
            {c.prompt}
          </p>
        )}

        {weekConfig.targetWords.length > 0 && (
          <div className="bg-[#FAFAF7] border border-[#E8E4DC] rounded-xl p-3">
            <p className="font-ibm-mono text-[10px] text-[#9CA3AF] uppercase tracking-wider mb-2">
              Target Words — use these in your response
            </p>
            <div className="flex flex-wrap gap-1">
              {weekConfig.targetWords.map(word => (
                <span
                  key={word}
                  className="px-2 py-0.5 bg-white border border-[#D4CFC6] rounded-full text-[10px] text-[#4B5563]"
                >
                  {word}
                </span>
              ))}
            </div>
          </div>
        )}

        {scaffolding && (
          <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 border-l-2 border-l-sky-400 space-y-2">
            {scaffolding.prompt && (
              <p className="text-xs text-sky-800">{scaffolding.prompt}</p>
            )}
            {scaffolding.hints && scaffolding.hints.length > 0 && (
              <ul className="list-disc list-inside space-y-0.5">
                {scaffolding.hints.map((h, i) => (
                  <li key={i} className="text-[10px] text-sky-600">{h}</li>
                ))}
              </ul>
            )}
            {scaffolding.sentenceStarters && scaffolding.sentenceStarters.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {scaffolding.sentenceStarters.map((s, i) => (
                  <button
                    key={i}
                    className="px-2 py-0.5 bg-white border border-sky-200 rounded-full text-[10px] text-sky-600 hover:bg-sky-50 active:bg-sky-100 active:scale-[0.95] transition-colors"
                    onClick={() => {
                      if (!writingText.endsWith(' ') && writingText.length > 0) {
                        setWritingText(writingText + ' ' + s);
                      } else {
                        setWritingText(writingText + s);
                      }
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <TargetWordHighlighter
          text={writingText}
          onChange={setWritingText}
          targetWords={weekConfig.targetWords}
          minWords={(scaffolding as Record<string, unknown> | undefined)?.minWords as number ?? c.minWords ?? 30}
          placeholder="Begin writing here..."
        />

        <WritingEvaluator
          text={writingText}
          weekNumber={weekConfig.weekNumber}
          grammarTarget={weekConfig.grammarTarget}
          targetVocab={weekConfig.targetWords}
          lane={lane}
          onResult={handleWritingResult}
          disabled={!writingText.trim()}
        />

        {writingPassed && (
          <div className="pt-2">
            <button
              className="px-6 py-2.5 rounded-xl bg-sky-600 text-white text-xs font-medium tracking-wider hover:bg-sky-700 active:bg-sky-800 active:scale-[0.98] transition-colors"
              onClick={advanceCard}
            >
              Continue
            </button>
          </div>
        )}
      </div>
    );
  }

  function renderAcknowledgmentCard(c: CardConfig) {
    const blankConfigs = c.blanks ?? [];
    const blankDef = blankConfigs[0];
    const rawText = blankDef?.text ?? '';
    const answers = blankDef?.answers ?? [];
    const resolvedText = rawText.replace('{designation}', designation);
    const segments = resolvedText.split('_____');

    if (blanksValues.length === 0 && answers.length > 0) {
      setBlanksValues(answers.map(() => ''));
    }

    return (
      <div className="space-y-4">
        {c.title && (
          <h3 className="font-ibm-mono text-[10px] tracking-[0.15em] uppercase text-[#8B8578] mb-2">
            {c.title}
          </h3>
        )}

        <div className="bg-[#FAFAF7] border border-[#E8E4DC] rounded-xl p-4 text-sm text-[#4B5563] leading-relaxed">
          {segments.map((segment, idx) => (
            <span key={idx}>
              {segment}
              {idx < segments.length - 1 && idx < answers.length && (
                <input
                  type="text"
                  className="w-28 inline-block mx-1 text-center text-sm bg-white border border-[#D4CFC6] rounded-lg px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-sky-400"
                  placeholder={answers[idx]}
                  value={blanksValues[idx] ?? ''}
                  onChange={e => {
                    const updated = [...blanksValues];
                    while (updated.length <= idx) updated.push('');
                    updated[idx] = e.target.value;
                    setBlanksValues(updated);
                  }}
                />
              )}
            </span>
          ))}
        </div>

        {c.checkbox && (
          <label className="flex items-center gap-2 text-xs text-[#6B7280]">
            <input
              type="checkbox"
              checked={checkboxChecked}
              onChange={e => setCheckboxChecked(e.target.checked)}
              className="accent-sky-600"
            />
            {c.checkbox}
          </label>
        )}

        <div className="pt-2">
          <button
            className="px-6 py-2.5 rounded-xl bg-sky-600 text-white text-xs font-medium tracking-wider hover:bg-sky-700 active:bg-sky-800 active:scale-[0.98] disabled:opacity-40 transition-colors"
            disabled={!isAcknowledgmentReady()}
            onClick={advanceCard}
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────

  if (!card) {
    return null;
  }

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      {/* Card counter */}
      <div className="text-center">
        <span className="font-ibm-mono text-[10px] text-[#B8B3AA] tracking-widest">
          Step {currentCard + 1} of {total}
        </span>
      </div>

      {/* Card content with transition */}
      <div
        key={currentCard}
        className="animate-fadeIn"
      >
        {(card.type === 'personal_info' || card.type === 'status_review') &&
          renderInfoCard(card)}
        {card.type === 'writing' &&
          renderWritingCard(card)}
        {card.type === 'intake_questions' &&
          renderIntakeQuestionsCard(card)}
        {card.type === 'acknowledgment' &&
          renderAcknowledgmentCard(card)}
      </div>
    </div>
  );
}
