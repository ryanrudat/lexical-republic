import { useState, useCallback } from 'react';
import type { TaskProps } from '../../../types/shiftQueue';
import { useStudentStore } from '../../../stores/studentStore';
import { useShiftQueueStore } from '../../../stores/shiftQueueStore';
import TargetWordHighlighter from './shared/TargetWordHighlighter';
import WritingEvaluator from './shared/WritingEvaluator';
import type { EvalResult } from './shared/WritingEvaluator';
import BureauStamp from './shared/BureauStamp';

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
  type: 'personal_info' | 'status_review' | 'writing' | 'acknowledgment' | 'intake_questions' | 'briefing';
  title?: string;
  fields?: FieldConfig[];
  prompt?: string;
  minWords?: number;
  lane?: LaneScaffold;
  blanks?: BlankConfig[];
  checkbox?: string;
  questions?: IntakeQuestion[];
  paragraphs?: string[];
  from?: string;
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

  function renderBriefingCard(c: CardConfig) {
    return (
      <div className="space-y-3">
        {c.title && (
          <h3 className="font-ibm-mono text-sm font-semibold tracking-[0.15em] uppercase text-[#2C3340] mb-2">
            {c.title}
          </h3>
        )}

        {c.from && (
          <p className="font-ibm-mono text-xs text-[#6B7280] tracking-wider">
            From: {c.from}
          </p>
        )}

        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <p className="font-ibm-mono text-xs text-amber-800 font-medium">
            Read carefully. You will be asked about this information.
          </p>
        </div>

        {/* Document slides in from the right like it's being placed on a desk */}
        <div className="animate-doc-slide-in bg-[#FAFAF7] border border-[#E8E4DC] rounded-xl p-4 space-y-3 shadow-sm">
          {(c.paragraphs ?? []).map((para, i) => (
            <p key={i} className="text-sm text-[#4B5563] leading-relaxed">
              {para}
            </p>
          ))}
        </div>

        <div className="pt-4 flex justify-center">
          <BureauStamp variant="received" onStamp={advanceCard} />
        </div>
      </div>
    );
  }

  function renderIntakeQuestionsCard(c: CardConfig) {
    const questions = c.questions ?? [];
    const allCorrect = questions.length > 0 && questions.every(q => questionLocked[q.key]);

    // Find current question index (first unlocked)
    const currentQIndex = questions.findIndex(q => !questionLocked[q.key]);
    const lockedCount = questions.filter(q => questionLocked[q.key]).length;
    const activeQ = currentQIndex >= 0 ? questions[currentQIndex] : null;

    // When answer is selected
    const handleOptionTap = (q: IntakeQuestion, optionIndex: number) => {
      if (questionLocked[q.key]) return;

      setQuestionAnswers(prev => ({ ...prev, [q.key]: optionIndex }));

      if (optionIndex === q.correctIndex) {
        // Correct — lock and auto-advance after delay
        setQuestionLocked(prev => ({ ...prev, [q.key]: true }));
      }
    };

    return (
      <div className="space-y-4">
        {/* Header with progress */}
        <div className="text-center space-y-2">
          <p className="font-ibm-mono text-[10px] text-[#B8B3AA] tracking-widest uppercase">
            Verification {Math.min(lockedCount + 1, questions.length)} of {questions.length}
          </p>
          {/* Progress dots */}
          <div className="flex justify-center gap-2">
            {questions.map((q, i) => (
              <div
                key={q.key}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  questionLocked[q.key]
                    ? 'w-8 bg-emerald-400'
                    : i === currentQIndex
                      ? 'w-8 bg-sky-400'
                      : 'w-4 bg-[#E8E4DC]'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Active question or completion */}
        {activeQ ? (
          <div key={activeQ.key} className="animate-fadeIn space-y-4">
            {/* Question */}
            <div className="text-center px-4">
              <p className="text-base text-[#2C3340] font-medium leading-relaxed">
                {activeQ.label}
              </p>
            </div>

            {/* Tappable option cards */}
            <div className="grid grid-cols-1 gap-2.5">
              {activeQ.options.map((opt, oi) => {
                const isSelected = questionAnswers[activeQ.key] === oi;
                const isLocked = questionLocked[activeQ.key];
                const isCorrect = isSelected && isLocked;
                const isWrong = isSelected && !isLocked && questionAnswers[activeQ.key] !== undefined;

                return (
                  <button
                    key={oi}
                    className={`w-full text-left px-4 py-3 rounded-xl border-2 text-sm transition-all duration-200 ${
                      isCorrect
                        ? 'border-emerald-400 bg-emerald-50 text-emerald-800 scale-[1.02]'
                        : isWrong
                          ? 'border-rose-300 bg-rose-50 text-rose-700 animate-[shake_0.3s_ease-in-out]'
                          : isSelected
                            ? 'border-sky-400 bg-sky-50 text-sky-800'
                            : 'border-[#E8E4DC] bg-white text-[#4B5563] hover:border-sky-300 hover:bg-sky-50/50 active:scale-[0.98]'
                    } ${isLocked ? 'pointer-events-none' : ''}`}
                    onClick={() => handleOptionTap(activeQ, oi)}
                    disabled={isLocked}
                  >
                    <span className="flex items-center gap-3">
                      <span className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-medium ${
                        isCorrect
                          ? 'border-emerald-400 bg-emerald-400 text-white'
                          : isWrong
                            ? 'border-rose-300 bg-rose-100 text-rose-600'
                            : isSelected
                              ? 'border-sky-400 bg-sky-400 text-white'
                              : 'border-[#D4CFC6] text-[#9CA3AF]'
                      }`}>
                        {isCorrect ? '\u2713' : String.fromCharCode(65 + oi)}
                      </span>
                      <span>{opt}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Wrong answer feedback */}
            {questionAnswers[activeQ.key] !== undefined && !questionLocked[activeQ.key] && (
              <p className="text-center text-xs text-rose-500 font-ibm-mono animate-fadeIn">
                Not quite — try again, Citizen.
              </p>
            )}
          </div>
        ) : allCorrect ? (
          /* All verified — stamp to continue */
          <div className="text-center py-6 space-y-4 animate-fadeIn">
            <p className="font-ibm-mono text-xs text-emerald-700 tracking-wider uppercase">
              All answers correct — stamp to verify
            </p>
            <BureauStamp variant="verified" onStamp={advanceCard} />
          </div>
        ) : null}

        {/* Shake animation */}
        <style>{`
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            20% { transform: translateX(-4px); }
            40% { transform: translateX(4px); }
            60% { transform: translateX(-3px); }
            80% { transform: translateX(3px); }
          }
        `}</style>
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
        {card.type === 'briefing' &&
          renderBriefingCard(card)}
        {card.type === 'intake_questions' &&
          renderIntakeQuestionsCard(card)}
        {card.type === 'acknowledgment' &&
          renderAcknowledgmentCard(card)}
      </div>
    </div>
  );
}
