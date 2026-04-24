import { useState, useCallback } from 'react';
import type { TaskProps } from '../../../types/shiftQueue';
import type { TaskAnswerLogEntry } from '../../../types/taskResult';
import { useShiftQueueStore } from '../../../stores/shiftQueueStore';
import { useStudentStore } from '../../../stores/studentStore';
import TargetWordHighlighter from './shared/TargetWordHighlighter';
import WritingEvaluator from './shared/WritingEvaluator';
import type { EvalResult } from './shared/WritingEvaluator';

// ─── Types ───────────────────────────────────────────────────────

type ColumnName = 'URGENT' | 'ROUTINE' | 'HOLD';

interface CaseConfig {
  caseId: string;
  title: string;
  description: string;
  correctColumn: ColumnName;
  disappears?: boolean;
  disappearBark?: string;
}

const COLUMN_STYLES: Record<ColumnName, { text: string; border: string; bg: string; hoverBg: string }> = {
  URGENT: { text: 'text-rose-600', border: 'border-rose-200', bg: 'bg-rose-50', hoverBg: 'hover:bg-rose-50' },
  ROUTINE: { text: 'text-sky-600', border: 'border-sky-200', bg: 'bg-sky-50', hoverBg: 'hover:bg-sky-50' },
  HOLD: { text: 'text-amber-600', border: 'border-amber-200', bg: 'bg-amber-50', hoverBg: 'hover:bg-amber-50' },
};

// ─── Component ───────────────────────────────────────────────────

export default function PrioritySort({ config, weekConfig, onComplete }: TaskProps) {
  const cases = (config.cases ?? []) as CaseConfig[];
  const modalPrompt = (config.modalPrompt as string) ?? 'Explain why this case received its priority level.';

  const addConcern = useShiftQueueStore(s => s.addConcern);
  const user = useStudentStore(s => s.user);
  const lane = user?.lane ?? 2;

  const [columns, setColumns] = useState<Record<ColumnName, string[]>>({
    URGENT: [],
    ROUTINE: [],
    HOLD: [],
  });
  const [unsorted, setUnsorted] = useState<string[]>(() => cases.map(c => c.caseId));
  const [phase, setPhase] = useState<'sort' | 'justify' | 'done'>('sort');
  const [justifications, setJustifications] = useState<Record<string, string>>({});
  const [currentJustifyIdx, setCurrentJustifyIdx] = useState(0);
  const [disappearedCases, setDisappearedCases] = useState<Set<string>>(new Set());
  const [activePicker, setActivePicker] = useState<string | null>(null);
  const [sortChecked, setSortChecked] = useState(false);
  const [sortResults, setSortResults] = useState<Record<string, boolean>>({});
  const [disappearBarkText, setDisappearBarkText] = useState<string | null>(null);
  const [writingPassed, setWritingPassed] = useState(false);

  // ── Sort phase handlers ────────────────────────────────────────

  const assignToColumn = useCallback((caseId: string, column: ColumnName) => {
    // Remove from unsorted
    setUnsorted(prev => prev.filter(id => id !== caseId));

    // Remove from any existing column
    setColumns(prev => {
      const updated = { ...prev };
      for (const col of Object.keys(updated) as ColumnName[]) {
        updated[col] = updated[col].filter(id => id !== caseId);
      }
      updated[column] = [...updated[column], caseId];
      return updated;
    });

    setActivePicker(null);
  }, []);

  const checkSorting = useCallback(() => {
    const results: Record<string, boolean> = {};
    let wrongCount = 0;

    for (const c of cases) {
      const assignedColumn = (Object.keys(columns) as ColumnName[]).find(
        col => columns[col].includes(c.caseId)
      );
      const correct = assignedColumn === c.correctColumn;
      results[c.caseId] = correct;
      if (!correct) wrongCount++;
    }

    if (wrongCount > 0) {
      // Tier 1 (Guided): gentler penalty; Tier 3 (Independent): stricter
      const concernPerWrong = lane === 1 ? 0.05 : lane === 3 ? 0.15 : 0.1;
      addConcern(wrongCount * concernPerWrong);
    }

    setSortResults(results);
    setSortChecked(true);

    // Handle disappearing cases after a delay
    const disappearing = cases.filter(c => c.disappears);
    if (disappearing.length > 0) {
      setTimeout(() => {
        const disappeared = new Set<string>();
        for (const c of disappearing) {
          disappeared.add(c.caseId);
          if (c.disappearBark) {
            setDisappearBarkText(c.disappearBark);
          }
        }
        setDisappearedCases(disappeared);

        // Clear bark after a few seconds and advance to justify
        setTimeout(() => {
          setDisappearBarkText(null);
          setPhase('justify');
        }, 3000);
      }, 1200);
    } else {
      setTimeout(() => setPhase('justify'), 1200);
    }
  }, [cases, columns, addConcern]);

  // ── Justify phase handlers ─────────────────────────────────────

  const justifyCases = cases.filter(c => !disappearedCases.has(c.caseId));
  const currentJustifyCase = justifyCases[currentJustifyIdx];

  const handleWritingResult = useCallback((result: EvalResult) => {
    if (result.passed) {
      setWritingPassed(true);
    } else if (!result.isDegraded) {
      addConcern(0.05);
    }
  }, [addConcern]);

  const advanceJustify = useCallback(() => {
    if (!currentJustifyCase) return;

    // Build complete justifications including the current case
    const allJustifications = {
      ...justifications,
      [currentJustifyCase.caseId]: justifications[currentJustifyCase.caseId] ?? '',
    };
    setJustifications(allJustifications);

    if (currentJustifyIdx < justifyCases.length - 1) {
      setCurrentJustifyIdx(currentJustifyIdx + 1);
      setWritingPassed(false);
    } else {
      // All justified -- finish
      const correctCount = cases.filter(c => sortResults[c.caseId]).length;
      const score = correctCount / Math.max(cases.length, 1);

      // Teacher review trail. Disappeared cases are still logged so the
      // teacher sees the full sequence, not a gap.
      const answerLog: TaskAnswerLogEntry[] = cases.map(c => {
        const assignedColumn = (Object.keys(columns) as ColumnName[]).find(
          col => columns[col].includes(c.caseId),
        );
        const isDisappeared = disappearedCases.has(c.caseId);
        return {
          questionId: `case:${c.caseId}`,
          prompt: `${c.title}: ${c.description}`,
          chosen: isDisappeared
            ? '(case disappeared)'
            : assignedColumn ?? '(unassigned)',
          correct: c.correctColumn,
          wasCorrect: !!sortResults[c.caseId],
          attempts: 1,
        };
      });

      onComplete(score, {
        taskType: 'priority_sort',
        itemsCorrect: correctCount,
        itemsTotal: cases.length,
        // mixed = both grammar (sort decisions) and writing (justifications)
        category: 'mixed',
        answerLog,
        disappeared: [...disappearedCases],
        justifications: allJustifications,
        // Gradebook teacher view reads these legacy keys — keep them.
        casesCorrect: correctCount,
        totalCases: cases.length,
      });
      setPhase('done');
    }
  }, [currentJustifyCase, currentJustifyIdx, justifyCases.length, justifications, cases, sortResults, disappearedCases, onComplete, columns]);

  // ── Render: Case card ──────────────────────────────────────────

  function renderCaseCard(caseId: string, showPicker: boolean) {
    const caseConfig = cases.find(c => c.caseId === caseId);
    if (!caseConfig) return null;

    const isDisappearing = disappearedCases.has(caseId);
    const result = sortChecked ? sortResults[caseId] : undefined;

    return (
      <div
        key={caseId}
        className={`transition-all duration-500 ${
          isDisappearing ? 'opacity-0 max-h-0 overflow-hidden' : 'opacity-100 max-h-96'
        }`}
      >
        <div
          className={`bg-white border rounded-xl p-3 transition-all ${
            result === true
              ? 'border-emerald-300'
              : result === false
                ? 'border-rose-300'
                : 'border-[#D4CFC6] hover:border-sky-300 active:bg-sky-50'
          } ${showPicker && !sortChecked ? 'cursor-pointer active:scale-[0.98]' : ''}`}
          onClick={() => {
            if (showPicker && !sortChecked) {
              setActivePicker(activePicker === caseId ? null : caseId);
            }
          }}
        >
          <p className="font-special-elite text-sm text-[#2C3340]">{caseConfig.title}</p>
          <p className="font-ibm-mono text-xs text-[#6B7280] mt-1">{caseConfig.description}</p>

          {result === false && sortChecked && (
            <p className="font-ibm-mono text-[10px] text-rose-500 mt-1">
              Incorrect classification
            </p>
          )}
        </div>

        {/* Column picker */}
        {showPicker && activePicker === caseId && !sortChecked && (
          <div className="flex gap-2 mt-2 justify-center">
            {(['URGENT', 'ROUTINE', 'HOLD'] as ColumnName[]).map(col => {
              const styles = COLUMN_STYLES[col];
              return (
                <button
                  key={col}
                  className={`px-3 py-1 rounded-full font-ibm-mono text-[10px] tracking-wider transition-colors border ${styles.text} ${styles.border} ${styles.hoverBg} active:scale-[0.95] active:brightness-95`}
                  onClick={e => {
                    e.stopPropagation();
                    assignToColumn(caseId, col);
                  }}
                >
                  {col}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── Render: Sort phase ─────────────────────────────────────────

  function renderSortPhase() {
    const allSorted = unsorted.length === 0;

    return (
      <div className="space-y-4">
        <h3 className="font-ibm-mono text-xs tracking-wider uppercase text-[#8B8578] text-center">
          Assign each case to its priority level
        </h3>

        {/* Unsorted cases */}
        {unsorted.length > 0 && (
          <div className="space-y-2">
            <p className="font-ibm-mono text-[10px] text-[#B8B3AA] tracking-wider uppercase">
              Unsorted ({unsorted.length})
            </p>
            {unsorted.map(caseId => renderCaseCard(caseId, true))}
          </div>
        )}

        {/* Sorted columns */}
        <div className="grid grid-cols-3 gap-3">
          {(['URGENT', 'ROUTINE', 'HOLD'] as ColumnName[]).map(col => {
            const styles = COLUMN_STYLES[col];
            return (
              <div key={col} className="space-y-2">
                <p className={`font-ibm-mono text-[10px] tracking-wider uppercase text-center ${styles.text}`}>
                  {col} ({columns[col].length})
                </p>
                <div className={`min-h-[60px] rounded-xl border border-dashed p-2 space-y-2 ${styles.border} ${styles.bg}`}>
                  {columns[col].map(caseId => renderCaseCard(caseId, false))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Check button */}
        {allSorted && !sortChecked && (
          <div className="pt-2 text-center">
            <button
              className="px-6 py-2.5 rounded-xl bg-sky-600 text-white text-xs font-medium tracking-wider hover:bg-sky-700 active:bg-sky-800 active:scale-[0.98] transition-colors"
              onClick={checkSorting}
            >
              Check Sorting
            </button>
          </div>
        )}

        {/* Disappear bark */}
        {disappearBarkText && (
          <div className="bg-[#FAFAF7] border border-sky-200 rounded-xl p-4 animate-fadeIn">
            <p className="font-ibm-mono text-[10px] text-sky-500 tracking-wider uppercase mb-2">
              P.E.A.R.L.
            </p>
            <p className="text-sm text-[#4B5563] leading-relaxed">
              {disappearBarkText}
            </p>
          </div>
        )}
      </div>
    );
  }

  // ── Render: Justify phase ──────────────────────────────────────

  function renderJustifyPhase() {
    if (!currentJustifyCase) return null;

    const justifyText = justifications[currentJustifyCase.caseId] ?? '';

    return (
      <div className="space-y-4">
        <div className="text-center">
          <span className="font-ibm-mono text-[10px] text-[#B8B3AA] tracking-widest">
            CASE {currentJustifyIdx + 1} OF {justifyCases.length}
          </span>
        </div>

        {/* Case context */}
        <div className="bg-white border border-[#E8E4DC] rounded-xl p-4">
          <p className="font-special-elite text-sm text-[#2C3340]">
            {currentJustifyCase.title}
          </p>
          <p className="font-ibm-mono text-xs text-[#6B7280] mt-1">
            {currentJustifyCase.description}
          </p>
        </div>

        {/* Prompt */}
        <p className="text-sm text-[#4B5563] leading-relaxed">
          {modalPrompt}
        </p>

        {/* Writing area */}
        <TargetWordHighlighter
          text={justifyText}
          onChange={text => setJustifications(prev => ({ ...prev, [currentJustifyCase.caseId]: text }))}
          targetWords={weekConfig.targetWords}
          minWords={10}
          rows={3}
          placeholder="Write your justification here..."
        />

        <WritingEvaluator
          text={justifyText}
          weekNumber={weekConfig.weekNumber}
          grammarTarget={weekConfig.grammarTarget}
          targetVocab={weekConfig.targetWords}
          lane={lane}
          onResult={handleWritingResult}
          disabled={!justifyText.trim()}
        />

        {writingPassed && (
          <div className="pt-2 text-center">
            <button
              className="px-6 py-2.5 rounded-xl bg-sky-600 text-white text-xs font-medium tracking-wider hover:bg-sky-700 active:bg-sky-800 active:scale-[0.98] transition-colors"
              onClick={advanceJustify}
            >
              {currentJustifyIdx < justifyCases.length - 1 ? 'Next Case' : 'Complete'}
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Main render ────────────────────────────────────────────────

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Phase indicator */}
      <div className="text-center">
        <span className="font-ibm-mono text-[10px] text-[#B8B3AA] tracking-widest uppercase">
          {phase === 'sort' && 'Priority Sorting'}
          {phase === 'justify' && 'Justification'}
          {phase === 'done' && 'Sorting Complete'}
        </span>
      </div>

      <div key={phase} className="animate-fadeIn">
        {phase === 'sort' && renderSortPhase()}
        {phase === 'justify' && renderJustifyPhase()}
      </div>
    </div>
  );
}
