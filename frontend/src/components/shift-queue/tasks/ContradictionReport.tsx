import { useState, useCallback, useRef } from 'react';
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
  removedAfterText?: string;
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

  const requiredDiffCount = lane === 1 ? 3 : lane === 2 ? 4 : differences.length;

  // Per-lane minWords override (falls back to top-level writingMinWords)
  const laneConfig = writingLane[String(lane)] as Record<string, unknown> | undefined;
  const effectiveMinWords = typeof laneConfig?.minWords === 'number' ? laneConfig.minWords : writingMinWords;

  const autoAdvancedRef = useRef(false);
  const [phase, setPhase] = useState<'compare' | 'classify' | 'write' | 'submitting' | 'done'>('compare');
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
      // Auto-advance when required differences found (guard against multiple fires)
      if (next.size >= requiredDiffCount && !autoAdvancedRef.current) {
        autoAdvancedRef.current = true;
        setTimeout(() => setPhase('classify'), 600);
      }
      return next;
    });
  }, [requiredDiffCount]);

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

  const handleSubmit = useCallback(() => {
    setPhase('submitting');
    setTimeout(() => {
      const correctCount = differences.filter(
        d => foundDiffs.has(d.diffId) && classifications[d.diffId] === d.classification
      ).length;
      const score = correctCount / Math.max(requiredDiffCount, 1);
      onComplete(Math.min(score, 1), {
        type: 'contradiction_report',
        diffsFound: foundDiffs.size,
        diffsRequired: requiredDiffCount,
        diffsTotal: differences.length,
        correctClassifications: correctCount,
        writingText,
      });
    }, 1500);
  }, [differences, foundDiffs, classifications, writingText, onComplete, requiredDiffCount]);

  // ── Render: Memo card ─────────────────────────────────────────

  function renderMemo(memo: MemoConfig, label: string, highlightedDiffIds: Set<string>, side: 'A' | 'B') {
    // Build body with diff highlights
    const bodyText = memo.body;
    const bodySegments: { text: string; diffId: string | null; isHighlighted: boolean }[] = [];

    // Find diff zones that apply to this side
    const sideDiffs = differences.map(d => ({
      diffId: d.diffId,
      text: side === 'A' ? d.memoAText : d.memoBText,
      removedAfterText: d.removedAfterText,
    })).filter(d => d.text && bodyText.includes(d.text));

    // For side B, collect removed-sentence diffs that need [...] placeholders
    const removedDiffs = side === 'B'
      ? differences.filter(d =>
          d.memoBText === '[Sentence removed]' &&
          d.removedAfterText &&
          bodyText.includes(d.removedAfterText)
        ).map(d => ({
          diffId: d.diffId,
          anchorText: d.removedAfterText!,
          anchorIdx: bodyText.indexOf(d.removedAfterText!),
          insertAfter: true,
        }))
      : [];

    if (sideDiffs.length === 0 && removedDiffs.length === 0) {
      bodySegments.push({ text: bodyText, diffId: null, isHighlighted: false });
    } else {
      // Sort diffs by position in text
      const sorted = sideDiffs
        .map(d => ({ ...d, idx: bodyText.indexOf(d.text) }))
        .filter(d => d.idx >= 0)
        .sort((a, b) => a.idx - b.idx);

      let cursor = 0;
      for (const diff of sorted) {
        // Check if any removed-sentence placeholder should appear before this diff
        for (const rd of removedDiffs) {
          const insertPos = rd.anchorIdx + rd.anchorText.length;
          if (insertPos > cursor && insertPos <= diff.idx) {
            if (insertPos > cursor) {
              bodySegments.push({ text: bodyText.slice(cursor, insertPos), diffId: null, isHighlighted: false });
            }
            bodySegments.push({
              text: ' [...] ',
              diffId: rd.diffId,
              isHighlighted: highlightedDiffIds.has(rd.diffId),
            });
            cursor = insertPos;
          }
        }

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

      // Check for any remaining removed-sentence placeholders after last diff
      for (const rd of removedDiffs) {
        const insertPos = rd.anchorIdx + rd.anchorText.length;
        if (insertPos >= cursor) {
          if (insertPos > cursor) {
            bodySegments.push({ text: bodyText.slice(cursor, insertPos), diffId: null, isHighlighted: false });
          }
          bodySegments.push({
            text: ' [...] ',
            diffId: rd.diffId,
            isHighlighted: highlightedDiffIds.has(rd.diffId),
          });
          cursor = insertPos;
        }
      }

      if (cursor < bodyText.length) {
        bodySegments.push({ text: bodyText.slice(cursor), diffId: null, isHighlighted: false });
      }
    }

    return (
      <div className="bg-white border border-[#D4CFC6] rounded-xl border-l-2 border-l-sky-400 flex-1">
        {/* Header */}
        <div className="px-4 py-3 border-b border-[#EDE8DE] space-y-1">
          <span className="font-special-elite text-sm text-[#2C3340] tracking-wider">
            {memo.title}
          </span>
          <p className="font-ibm-mono text-[10px] text-[#9CA3AF] tracking-wider">
            {memo.department}
          </p>
          <p className="font-ibm-mono text-[10px] text-[#9CA3AF]">
            {memo.date}
          </p>
          <div className="space-y-0.5 pt-1">
            <p className="font-ibm-mono text-[10px] text-[#6B7280]">
              <span className="text-[#B8B3AA] mr-2">FROM:</span>{memo.from}
            </p>
            <p className="font-ibm-mono text-[10px] text-[#6B7280]">
              <span className="text-[#B8B3AA] mr-2">TO:</span>{memo.to}
            </p>
            <p className="font-ibm-mono text-[10px] text-[#6B7280]">
              <span className="text-[#B8B3AA] mr-2">RE:</span>{memo.re}
            </p>
          </div>
          <div className="pt-1">
            <span className="px-2 py-0.5 bg-[#FAFAF7] border border-[#E8E4DC] rounded-full font-ibm-mono text-[8px] text-[#9CA3AF] tracking-widest">
              {label}
            </span>
          </div>
        </div>

        {/* Body with tappable diff zones */}
        <div className="px-4 py-3">
          <p className="text-sm text-[#4B5563] leading-relaxed">
            {bodySegments.map((seg, i) => {
              if (!seg.diffId) {
                return <span key={i}>{seg.text}</span>;
              }
              const isPlaceholder = seg.text.trim() === '[...]';
              return (
                <span
                  key={i}
                  role="button"
                  tabIndex={0}
                  className={`cursor-pointer rounded px-0.5 transition-colors ${
                    seg.isHighlighted
                      ? 'bg-emerald-100 text-emerald-700'
                      : isPlaceholder
                        ? 'hover:bg-sky-50 underline decoration-dashed decoration-[#D4CFC6] text-[#9CA3AF]'
                        : 'hover:bg-sky-50 underline decoration-dotted decoration-[#D4CFC6]'
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
          <div className="px-4 py-2 border-t border-[#EDE8DE]">
            <p className="font-ibm-mono text-[9px] text-[#B8B3AA] tracking-wider">
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
        <h3 className="font-ibm-mono text-xs tracking-wider uppercase text-[#8B8578] text-center">
          Identify all differences between the two memos
        </h3>

        <div className="flex flex-col md:flex-row gap-4">
          {renderMemo(memoA, 'ORIGINAL MEMO', foundDiffs, 'A')}
          {renderMemo(memoB, 'REVISED MEMO', foundDiffs, 'B')}
        </div>

        <div className="text-center">
          <span className="font-ibm-mono text-[10px] text-[#9CA3AF]">
            {foundDiffs.size} / {requiredDiffCount} differences identified
          </span>
        </div>
      </div>
    );
  }

  // ── Render: Classify phase ────────────────────────────────────

  function renderClassifyPhase() {
    const classifyOptions = [
      { value: 'information_changed', label: 'Information changed' },
      { value: 'information_removed', label: 'Information removed' },
    ];

    return (
      <div className="space-y-4">
        <h3 className="font-ibm-mono text-xs tracking-wider uppercase text-[#8B8578] text-center">
          Classify each difference
        </h3>

        {differences.filter(d => foundDiffs.has(d.diffId)).map(diff => (
          <div key={diff.diffId} className="bg-white border border-[#E8E4DC] rounded-xl p-4 space-y-3">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1">
                <span className="font-ibm-mono text-[10px] text-[#B8B3AA] tracking-wider uppercase">
                  Original
                </span>
                <p className="text-sm text-[#6B7280] mt-1 line-through decoration-[#D4CFC6]">
                  {diff.memoAText}
                </p>
              </div>
              <div className="flex-1">
                <span className="font-ibm-mono text-[10px] text-[#B8B3AA] tracking-wider uppercase">
                  Revised
                </span>
                <p className="text-sm text-emerald-700 mt-1">
                  {diff.memoBText}
                </p>
              </div>
            </div>

            <select
              className="w-full bg-white border border-[#D4CFC6] rounded-lg px-3 py-2 text-sm text-[#4B5563] focus:outline-none focus:ring-2 focus:ring-sky-400"
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
            className="px-6 py-2.5 rounded-xl bg-sky-600 text-white text-xs font-medium tracking-wider hover:bg-sky-700 disabled:opacity-40"
            disabled={!allClassified}
            onClick={submitClassifications}
          >
            Submit Classifications
          </button>
        </div>
      </div>
    );
  }

  // ── Render: Write phase ───────────────────────────────────────

  function renderWritePhase() {
    return (
      <div className="space-y-4">
        <h3 className="font-ibm-mono text-xs tracking-wider uppercase text-[#8B8578] text-center">
          Written Analysis
        </h3>

        {writingPrompt && (
          <p className="text-sm text-[#4B5563] leading-relaxed">
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
          minWords={effectiveMinWords}
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
              className="px-6 py-2.5 rounded-xl bg-sky-600 text-white text-xs font-medium tracking-wider hover:bg-sky-700"
              onClick={handleSubmit}
            >
              Complete Report
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
        <span className="font-ibm-mono text-[10px] text-[#B8B3AA] tracking-widest uppercase">
          {phase === 'compare' && 'Phase 1: Comparison'}
          {phase === 'classify' && 'Phase 2: Classification'}
          {phase === 'write' && 'Phase 3: Analysis'}
          {phase === 'submitting' && 'Submitting Report...'}
          {phase === 'done' && 'Report Complete'}
        </span>
      </div>

      <div key={phase} className="animate-fadeIn">
        {phase === 'compare' && renderComparePhase()}
        {phase === 'classify' && renderClassifyPhase()}
        {phase === 'write' && renderWritePhase()}
        {phase === 'submitting' && (
          <div className="text-center py-12">
            <div className="w-10 h-10 mx-auto border-2 border-sky-400 border-t-transparent rounded-full animate-spin mb-4" />
            <span className="font-ibm-mono text-[10px] text-[#8B8578] tracking-[0.3em] uppercase animate-pulse">
              P.E.A.R.L. is reviewing your report...
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
