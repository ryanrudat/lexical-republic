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

interface CardConfig {
  type: 'personal_info' | 'status_review' | 'writing' | 'acknowledgment';
  title?: string;
  fields?: FieldConfig[];
  prompt?: string;
  minWords?: number;
  lane?: LaneScaffold;
  text?: string;
  blanks?: string[];
  checkboxLabel?: string;
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
  const [dropdownValues, setDropdownValues] = useState<Record<string, string>>({});
  const [blanksValues, setBlanksValues] = useState<string[]>([]);
  const [checkboxChecked, setCheckboxChecked] = useState(false);
  const [cardCompleted, setCardCompleted] = useState<boolean[]>(
    () => cards.map(() => false),
  );
  const [writingPassed, setWritingPassed] = useState(false);

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
    const blanks = card.blanks ?? [];
    if (blanks.length > 0 && blanksValues.length < blanks.length) return false;
    if (blanks.length > 0 && blanksValues.some(v => !v.trim())) return false;
    return checkboxChecked;
  }, [card, blanksValues, checkboxChecked]);

  // ── Navigation ───────────────────────────────────────────────

  const advanceCard = useCallback(() => {
    const updated = [...cardCompleted];
    updated[currentCard] = true;
    setCardCompleted(updated);

    if (currentCard < total - 1) {
      setCurrentCard(currentCard + 1);
      // Reset per-card state
      setDropdownValues({});
      setBlanksValues([]);
      setCheckboxChecked(false);
      setWritingText('');
      setWritingPassed(false);
    } else {
      // All cards complete
      const score = 1;
      const details: Record<string, unknown> = {
        cardsCompleted: total,
        dropdownChoices: dropdownValues,
      };
      onComplete(score, details);
    }
  }, [currentCard, total, cardCompleted, dropdownValues, onComplete]);

  // ── Writing result handler ───────────────────────────────────

  const handleWritingResult = useCallback((result: EvalResult, _attempt: number) => {
    if (result.passed) {
      setWritingPassed(true);
    } else if (!result.isDegraded) {
      addConcern(0.05);
    }
  }, [addConcern]);

  // ── Render helpers ───────────────────────────────────────────

  function renderInfoCard(c: CardConfig) {
    const fields = c.fields ?? [];

    return (
      <div className="space-y-3">
        {c.title && (
          <h3 className="font-ibm-mono text-xs tracking-wider uppercase text-white/50 mb-4">
            {c.title}
          </h3>
        )}
        {fields.map(field => {
          if (field.type === 'readonly') {
            return (
              <div key={field.key} className="ios-glass-card p-3">
                <span className="font-ibm-mono text-[10px] text-white/40 tracking-wider uppercase">
                  {field.label}
                </span>
                <p className="font-ibm-mono text-sm text-white/80 mt-1">
                  {resolveFieldValue(field.value, designation)}
                </p>
              </div>
            );
          }

          if (field.type === 'dropdown') {
            return (
              <div key={field.key} className="ios-glass-card p-3">
                <span className="font-ibm-mono text-[10px] text-white/40 tracking-wider uppercase">
                  {field.label}
                </span>
                <select
                  className="ios-glass-input font-ibm-mono text-sm w-full mt-1"
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
            className="ios-glass-pill-action px-6 py-2 font-ibm-mono text-xs tracking-wider"
            disabled={!isInfoCardReady()}
            onClick={advanceCard}
          >
            CONTINUE
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
          <h3 className="font-ibm-mono text-xs tracking-wider uppercase text-white/50 mb-2">
            {c.title}
          </h3>
        )}

        {c.prompt && (
          <p className="font-ibm-mono text-sm text-white/70 leading-relaxed">
            {c.prompt}
          </p>
        )}

        {/* Target words — always shown so students know which words to use */}
        {weekConfig.targetWords.length > 0 && (
          <div className="ios-glass-card p-3 rounded-lg">
            <p className="font-ibm-mono text-[10px] text-white/40 uppercase tracking-wider mb-2">
              Target Words — use these in your response
            </p>
            <div className="flex flex-wrap">
              {weekConfig.targetWords.map(word => (
                <span
                  key={word}
                  className="ios-glass-pill px-2 py-0.5 font-ibm-mono text-[10px] text-white/70 inline-block m-0.5"
                >
                  {word}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Lane scaffolding — additional hints per lane */}
        {scaffolding && (
          <div className="ios-glass-card p-3 border-l-2 border-neon-cyan/30 space-y-2">
            {scaffolding.prompt && (
              <p className="font-ibm-mono text-xs text-white/60">{scaffolding.prompt}</p>
            )}
            {scaffolding.hints && scaffolding.hints.length > 0 && (
              <ul className="list-disc list-inside space-y-0.5">
                {scaffolding.hints.map((h, i) => (
                  <li key={i} className="font-ibm-mono text-[10px] text-white/40">{h}</li>
                ))}
              </ul>
            )}
            {scaffolding.sentenceStarters && scaffolding.sentenceStarters.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {scaffolding.sentenceStarters.map((s, i) => (
                  <button
                    key={i}
                    className="ios-glass-pill px-2 py-0.5 font-ibm-mono text-[10px] text-neon-cyan/70 hover:text-neon-cyan transition-colors"
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
          minWords={c.minWords ?? 30}
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
              className="ios-glass-pill-action px-6 py-2 font-ibm-mono text-xs tracking-wider"
              onClick={advanceCard}
            >
              CONTINUE
            </button>
          </div>
        )}
      </div>
    );
  }

  function renderAcknowledgmentCard(c: CardConfig) {
    const blanks = c.blanks ?? [];
    const rawText = c.text ?? '';

    // Split text on _____ placeholders
    const segments = rawText.split('_____');

    // Initialize blanksValues if needed
    if (blanksValues.length === 0 && blanks.length > 0) {
      setBlanksValues(blanks.map(() => ''));
    }

    return (
      <div className="space-y-4">
        {c.title && (
          <h3 className="font-ibm-mono text-xs tracking-wider uppercase text-white/50 mb-2">
            {c.title}
          </h3>
        )}

        <div className="ios-glass-card p-4 font-ibm-mono text-sm text-white/80 leading-relaxed">
          {segments.map((segment, idx) => (
            <span key={idx}>
              {segment}
              {idx < segments.length - 1 && idx < blanks.length && (
                <input
                  type="text"
                  className="ios-glass-input font-ibm-mono text-sm w-24 inline-block mx-1 text-center"
                  placeholder={blanks[idx]}
                  value={blanksValues[idx] ?? ''}
                  onChange={e => {
                    const updated = [...blanksValues];
                    // Pad array if needed
                    while (updated.length <= idx) updated.push('');
                    updated[idx] = e.target.value;
                    setBlanksValues(updated);
                  }}
                />
              )}
            </span>
          ))}
        </div>

        {c.checkboxLabel && (
          <label className="flex items-center gap-2 font-ibm-mono text-xs text-white/60">
            <input
              type="checkbox"
              checked={checkboxChecked}
              onChange={e => setCheckboxChecked(e.target.checked)}
              className="accent-neon-cyan"
            />
            {c.checkboxLabel}
          </label>
        )}

        <div className="pt-2">
          <button
            className="ios-glass-pill-action px-6 py-2 font-ibm-mono text-xs tracking-wider"
            disabled={!isAcknowledgmentReady()}
            onClick={advanceCard}
          >
            CONTINUE
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
        <span className="font-ibm-mono text-[10px] text-white/30 tracking-widest">
          STEP {currentCard + 1} OF {total}
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
        {card.type === 'acknowledgment' &&
          renderAcknowledgmentCard(card)}
      </div>
    </div>
  );
}
