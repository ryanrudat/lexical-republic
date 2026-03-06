import { useState, useCallback } from 'react';
import type { TaskProps } from '../../../types/shiftQueue';
import { useShiftQueueStore } from '../../../stores/shiftQueueStore';
import { useStudentStore } from '../../../stores/studentStore';
import TargetWordHighlighter from './shared/TargetWordHighlighter';
import WritingEvaluator from './shared/WritingEvaluator';
import type { EvalResult } from './shared/WritingEvaluator';
import LaneScaffolding from './shared/LaneScaffolding';

// ─── Types ───────────────────────────────────────────────────────

interface MemoConfig {
  title: string;
  department: string;
  date: string;
  from: string;
  to: string;
  re: string;
  reviewedBy?: string;
  body: string;
}

interface DiffZone {
  diffId: string;
  memoAText: string;
  memoBText: string;
  classification: string;
}

// ─── Component ───────────────────────────────────────────────────

export default function ContradictionReport({ config, weekConfig, onComplete }: TaskProps) {
  const memoA = config.memoA as MemoConfig;
  const memoB = config.memoB as MemoConfig;
  const differences = (config.differences ?? []) as DiffZone[];
  const writingPrompt = (config.writingPrompt as string) ?? '';
  const writingMinWords = (config.writingMinWords as number) ?? 30;
  const writingLane = (config.writingLane as Record<string, unknown>) ?? {};

  const addConcern = useShiftQueueStore(s => s.addConcern);
  const user = useStudentStore(s => s.user);
  const lane = user?.lane ?? 2;

  const [phase, setPhase] = useState<'compare' | 'classify' | 'write' | 'done'>('compare');
  const [foundDiffs, setFoundDiffs] = useState<Set<string>>(new Set());
  const [classifications, setClassifications] = useState<Record<string, string>>({});
  const [writingText, setWritingText] = useState('');
  const [writingPassed, setWritingPassed] = useState(false);

  // ── Compare phase handlers ────────────────────────────────────

  const toggleDiff = useCallback((diffId: string) => {
    setFoundDiffs(prev => {
      const next = new Set(prev);
      if (next.has(diffId)) {
        next.delete(diffId);
      } else {
        next.add(diffId);
      }
      // Auto-advance when all differences found
      if (next.size === differences.length) {
        setTimeout(() => setPhase('classify'), 600);
      }
      return next;
    });
  }, [differences.length]);

  // ── Classify phase handlers ───────────────────────────────────

  const setClassification = useCallback((diffId: string, value: string) => {
    setClassifications(prev => ({ ...prev, [diffId]: value }));
  }, []);

  const allClassified = differences
    .filter(d => foundDiffs.has(d.diffId))
    .every(d => !!classifications[d.diffId]);

  const submitClassifications = useCallback(() => {
    let wrongCount = 0;
    for (const diff of differences) {
      if (foundDiffs.has(diff.diffId) && classifications[diff.diffId] !== diff.classification) {
        wrongCount++;
      }
    }
    if (wrongCount > 0) {
      addConcern(wrongCount * 0.1);
    }
    setPhase('write');
  }, [differences, foundDiffs, classifications, addConcern]);

  // ── Writing phase handlers ────────────────────────────────────

  const handleWritingResult = useCallback((result: EvalResult) => {
    if (result.passed) {
      setWritingPassed(true);
    } else if (!result.isDegraded) {
      addConcern(0.05);
    }
  }, [addConcern]);

  const finishTask = useCallback(() => {
    const correctCount = differences.filter(
      d => foundDiffs.has(d.diffId) && classifications[d.diffId] === d.classification
    ).length;
    const score = correctCount / Math.max(differences.length, 1);
    onComplete(score, {
      type: 'contradiction_report',
      diffsFound: foundDiffs.size,
      diffsTotal: differences.length,
      correctClassifications: correctCount,
      writingText,
    });
    setPhase('done');
  }, [differences, foundDiffs, classifications, writingText, onComplete]);

  // ── Render: Memo card ─────────────────────────────────────────

  function renderMemo(memo: MemoConfig, label: string, highlightedDiffIds: Set<string>, side: 'A' | 'B') {
    // Build body with diff highlights
    const bodyText = memo.body;
    const bodySegments: { text: string; diffId: string | null; isHighlighted: boolean }[] = [];

    // Find diff zones that apply to this side
    const sideDiffs = differences.map(d => ({
      diffId: d.diffId,
      text: side === 'A' ? d.memoAText : d.memoBText,
    })).filter(d => d.text && bodyText.includes(d.text));

    if (sideDiffs.length === 0) {
      bodySegments.push({ text: bodyText, diffId: null, isHighlighted: false });
    } else {
      // Sort diffs by position in text
      const sorted = sideDiffs
        .map(d => ({ ...d, idx: bodyText.indexOf(d.text) }))
        .filter(d => d.idx >= 0)
        .sort((a, b) => a.idx - b.idx);

      let cursor = 0;
      for (const diff of sorted) {
        if (diff.idx > cursor) {
          bodySegments.push({ text: bodyText.slice(cursor, diff.idx), diffId: null, isHighlighted: false });
        }
        bodySegments.push({
          text: diff.text,
          diffId: diff.diffId,
          isHighlighted: highlightedDiffIds.has(diff.diffId),
        });
        cursor = diff.idx + diff.text.length;
      }
      if (cursor < bodyText.length) {
        bodySegments.push({ text: bodyText.slice(cursor), diffId: null, isHighlighted: false });
      }
    }

    return (
      <div className="ios-glass-card border border-white/10 border-l-2 border-l-neon-cyan/30 flex-1">
        {/* Header */}
        <div className="px-4 py-3 border-b border-white/5 space-y-1">
          <span className="font-special-elite text-sm text-white/90 tracking-wider">
            {memo.title}
          </span>
          <p className="font-ibm-mono text-[10px] text-white/30 tracking-wider">
            {memo.department}
          </p>
          <p className="font-ibm-mono text-[10px] text-white/30">
            {memo.date}
          </p>
          <div className="space-y-0.5 pt-1">
            <p className="font-ibm-mono text-[10px] text-white/40">
              <span className="text-white/20 mr-2">FROM:</span>{memo.from}
            </p>
            <p className="font-ibm-mono text-[10px] text-white/40">
              <span className="text-white/20 mr-2">TO:</span>{memo.to}
            </p>
            <p className="font-ibm-mono text-[10px] text-white/40">
              <span className="text-white/20 mr-2">RE:</span>{memo.re}
            </p>
          </div>
          <div className="pt-1">
            <span className="ios-glass-pill px-2 py-0.5 font-ibm-mono text-[8px] text-white/40 tracking-widest">
              {label}
            </span>
          </div>
        </div>

        {/* Body with tappable diff zones */}
        <div className="px-4 py-3">
          <p className="font-ibm-mono text-sm text-white/70 leading-relaxed">
            {bodySegments.map((seg, i) => {
              if (!seg.diffId) {
                return <span key={i}>{seg.text}</span>;
              }
              return (
                <span
                  key={i}
                  role="button"
                  tabIndex={0}
                  className={`cursor-pointer rounded px-0.5 transition-colors ${
                    seg.isHighlighted
                      ? 'bg-neon-mint/20 text-neon-mint'
                      : 'hover:bg-white/10 underline decoration-dotted decoration-white/20'
                  }`}
                  onClick={() => toggleDiff(seg.diffId!)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') toggleDiff(seg.diffId!);
                  }}
                >
                  {seg.text}
                </span>
              );
            })}
          </p>
        </div>

        {/* Reviewed stamp */}
        {memo.reviewedBy && (
          <div className="px-4 py-2 border-t border-white/5">
            <p className="font-ibm-mono text-[9px] text-white/20 tracking-wider">
              Reviewed by: {memo.reviewedBy}
            </p>
          </div>
        )}
      </div>
    );
  }

  // ── Render: Compare phase ─────────────────────────────────────

  function renderComparePhase() {
    return (
      <div className="space-y-4">
        <h3 className="font-ibm-mono text-xs tracking-wider uppercase text-white/50 text-center">
          Identify all differences between the two memos
        </h3>

        <div className="flex flex-col md:flex-row gap-4">
          {renderMemo(memoA, 'ORIGINAL MEMO', foundDiffs, 'A')}
          {renderMemo(memoB, 'REVISED MEMO', foundDiffs, 'B')}
        </div>

        <div className="text-center">
          <span className="font-ibm-mono text-[10px] text-white/40">
            {foundDiffs.size} / {differences.length} differences identified
          </span>
        </div>
      </div>
    );
  }

  // ── Render: Classify phase ────────────────────────────────────

  function renderClassifyPhase() {
    const classifyOptions = [
      { value: 'minor_correction', label: 'Minor correction' },
      { value: 'information_changed', label: 'Information changed' },
      { value: 'information_removed', label: 'Information removed' },
    ];

    return (
      <div className="space-y-4">
        <h3 className="font-ibm-mono text-xs tracking-wider uppercase text-white/50 text-center">
          Classify each difference
        </h3>

        {differences.filter(d => foundDiffs.has(d.diffId)).map(diff => (
          <div key={diff.diffId} className="ios-glass-card p-4 space-y-3">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1">
                <span className="font-ibm-mono text-[10px] text-white/30 tracking-wider uppercase">
                  Original
                </span>
                <p className="font-ibm-mono text-sm text-white/60 mt-1 line-through decoration-white/20">
                  {diff.memoAText}
                </p>
              </div>
              <div className="flex-1">
                <span className="font-ibm-mono text-[10px] text-white/30 tracking-wider uppercase">
                  Revised
                </span>
                <p className="font-ibm-mono text-sm text-neon-mint/80 mt-1">
                  {diff.memoBText}
                </p>
              </div>
            </div>

            <select
              className="ios-glass-input font-ibm-mono text-sm w-full"
              value={classifications[diff.diffId] ?? ''}
              onChange={e => setClassification(diff.diffId, e.target.value)}
            >
              <option value="">-- Classify this change --</option>
              {classifyOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        ))}

        <div className="pt-2 text-center">
          <button
            className="ios-glass-pill-action px-6 py-2 font-ibm-mono text-xs tracking-wider"
            disabled={!allClassified}
            onClick={submitClassifications}
          >
            SUBMIT CLASSIFICATIONS
          </button>
        </div>
      </div>
    );
  }

  // ── Render: Write phase ───────────────────────────────────────

  function renderWritePhase() {
    return (
      <div className="space-y-4">
        <h3 className="font-ibm-mono text-xs tracking-wider uppercase text-white/50 text-center">
          Written Analysis
        </h3>

        {writingPrompt && (
          <p className="font-ibm-mono text-sm text-white/70 leading-relaxed">
            {writingPrompt}
          </p>
        )}

        <LaneScaffolding
          lane={lane}
          scaffolding={writingLane}
          targetWords={weekConfig.targetWords}
        />

        <TargetWordHighlighter
          text={writingText}
          onChange={setWritingText}
          targetWords={weekConfig.targetWords}
          minWords={writingMinWords}
          placeholder="Begin your analysis here..."
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
          <div className="pt-2 text-center">
            <button
              className="ios-glass-pill-action px-6 py-2 font-ibm-mono text-xs tracking-wider"
              onClick={finishTask}
            >
              COMPLETE REPORT
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Main render ───────────────────────────────────────────────

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Phase indicator */}
      <div className="text-center">
        <span className="font-ibm-mono text-[10px] text-white/30 tracking-widest">
          {phase === 'compare' && 'PHASE 1: COMPARISON'}
          {phase === 'classify' && 'PHASE 2: CLASSIFICATION'}
          {phase === 'write' && 'PHASE 3: ANALYSIS'}
          {phase === 'done' && 'REPORT COMPLETE'}
        </span>
      </div>

      <div key={phase} className="animate-fadeIn">
        {phase === 'compare' && renderComparePhase()}
        {phase === 'classify' && renderClassifyPhase()}
        {phase === 'write' && renderWritePhase()}
      </div>
    </div>
  );
}
