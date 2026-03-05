import { useState, useCallback } from 'react';
import type { TaskProps } from '../../../types/shiftQueue';
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
      addConcern(wrongCount * 0.1);
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

  const handleWritingResult = useCallback((result: EvalResult, _attempt: number) => {
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
      onComplete(score, {
        type: 'priority_sort',
        casesCorrect: correctCount,
        totalCases: cases.length,
        disappeared: [...disappearedCases],
        justifications: allJustifications,
      });
      setPhase('done');
    }
  }, [currentJustifyCase, currentJustifyIdx, justifyCases.length, justifications, cases, sortResults, disappearedCases, onComplete]);

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
          className={`ios-glass-card p-3 border transition-all ${
            result === true
              ? 'border-neon-mint/30'
              : result === false
                ? 'border-neon-pink/30'
                : 'border-white/10 hover:border-neon-cyan/30'
          } ${showPicker && !sortChecked ? 'cursor-pointer' : ''}`}
          onClick={() => {
            if (showPicker && !sortChecked) {
              setActivePicker(activePicker === caseId ? null : caseId);
            }
          }}
        >
          <p className="font-special-elite text-sm text-white/90">{caseConfig.title}</p>
          <p className="font-ibm-mono text-xs text-white/50 mt-1">{caseConfig.description}</p>

          {result === false && sortChecked && (
            <p className="font-ibm-mono text-[10px] text-neon-pink/60 mt-1">
              Incorrect classification
            </p>
          )}
        </div>

        {/* Column picker */}
        {showPicker && activePicker === caseId && !sortChecked && (
          <div className="flex gap-2 mt-2 justify-center">
            {(['URGENT', 'ROUTINE', 'HOLD'] as ColumnName[]).map(col => (
              <button
                key={col}
                className={`ios-glass-pill px-3 py-1 font-ibm-mono text-[10px] tracking-wider transition-colors ${
                  col === 'URGENT'
                    ? 'text-neon-pink/80 hover:bg-neon-pink/10 border border-neon-pink/20'
                    : col === 'ROUTINE'
                      ? 'text-neon-cyan/80 hover:bg-neon-cyan/10 border border-neon-cyan/20'
                      : 'text-terminal-amber/80 hover:bg-terminal-amber/10 border border-terminal-amber/20'
                }`}
                onClick={e => {
                  e.stopPropagation();
                  assignToColumn(caseId, col);
                }}
              >
                {col}
              </button>
            ))}
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
        <h3 className="font-ibm-mono text-xs tracking-wider uppercase text-white/50 text-center">
          Assign each case to its priority level
        </h3>

        {/* Unsorted cases */}
        {unsorted.length > 0 && (
          <div className="space-y-2">
            <p className="font-ibm-mono text-[10px] text-white/30 tracking-wider uppercase">
              Unsorted ({unsorted.length})
            </p>
            {unsorted.map(caseId => renderCaseCard(caseId, true))}
          </div>
        )}

        {/* Sorted columns */}
        <div className="grid grid-cols-3 gap-3">
          {(['URGENT', 'ROUTINE', 'HOLD'] as ColumnName[]).map(col => (
            <div key={col} className="space-y-2">
              <p className={`font-ibm-mono text-[10px] tracking-wider uppercase text-center ${
                col === 'URGENT'
                  ? 'text-neon-pink/60'
                  : col === 'ROUTINE'
                    ? 'text-neon-cyan/60'
                    : 'text-terminal-amber/60'
              }`}>
                {col} ({columns[col].length})
              </p>
              <div className={`min-h-[60px] rounded-lg border border-dashed p-2 space-y-2 ${
                col === 'URGENT'
                  ? 'border-neon-pink/20'
                  : col === 'ROUTINE'
                    ? 'border-neon-cyan/20'
                    : 'border-terminal-amber/20'
              }`}>
                {columns[col].map(caseId => renderCaseCard(caseId, false))}
              </div>
            </div>
          ))}
        </div>

        {/* Check button */}
        {allSorted && !sortChecked && (
          <div className="pt-2 text-center">
            <button
              className="ios-glass-pill-action px-6 py-2 font-ibm-mono text-xs tracking-wider"
              onClick={checkSorting}
            >
              CHECK SORTING
            </button>
          </div>
        )}

        {/* Disappear bark */}
        {disappearBarkText && (
          <div className="ios-glass-card p-4 border border-neon-cyan/20 animate-fadeIn">
            <p className="font-ibm-mono text-[10px] text-neon-cyan/50 tracking-wider uppercase mb-2">
              P.E.A.R.L.
            </p>
            <p className="font-ibm-mono text-sm text-white/70 leading-relaxed">
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
          <span className="font-ibm-mono text-[10px] text-white/30 tracking-widest">
            CASE {currentJustifyIdx + 1} OF {justifyCases.length}
          </span>
        </div>

        {/* Case context */}
        <div className="ios-glass-card p-4 border border-white/10">
          <p className="font-special-elite text-sm text-white/90">
            {currentJustifyCase.title}
          </p>
          <p className="font-ibm-mono text-xs text-white/50 mt-1">
            {currentJustifyCase.description}
          </p>
        </div>

        {/* Prompt */}
        <p className="font-ibm-mono text-sm text-white/70 leading-relaxed">
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
              className="ios-glass-pill-action px-6 py-2 font-ibm-mono text-xs tracking-wider"
              onClick={advanceJustify}
            >
              {currentJustifyIdx < justifyCases.length - 1 ? 'NEXT CASE' : 'COMPLETE'}
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
        <span className="font-ibm-mono text-[10px] text-white/30 tracking-widest">
          {phase === 'sort' && 'PRIORITY SORTING'}
          {phase === 'justify' && 'JUSTIFICATION'}
          {phase === 'done' && 'SORTING COMPLETE'}
        </span>
      </div>

      <div key={phase} className="animate-fadeIn">
        {phase === 'sort' && renderSortPhase()}
        {phase === 'justify' && renderJustifyPhase()}
      </div>
    </div>
  );
}
