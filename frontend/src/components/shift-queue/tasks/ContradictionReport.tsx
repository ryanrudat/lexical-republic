import { useState, useCallback, useRef, useEffect } from 'react';
import type { TaskProps } from '../../../types/shiftQueue';
import { useShiftQueueStore } from '../../../stores/shiftQueueStore';
import { useStudentStore } from '../../../stores/studentStore';
import TargetWordHighlighter from './shared/TargetWordHighlighter';
import WritingEvaluator from './shared/WritingEvaluator';
import type { EvalResult } from './shared/WritingEvaluator';
import LaneScaffolding from './shared/LaneScaffolding';
import { StampChoice } from './shared/BureauStamp';
import AuthorizationToast from './shared/AuthorizationToast';

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
  label: string;
  originalText: string;
  revisedText: string;
  classification: string;
}

interface RecallQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
}

type Phase = 'read' | 'swapping' | 'recall' | 'classify' | 'write' | 'submitting';

// ─── Component ───────────────────────────────────────────────────

export default function ContradictionReport({ config, weekConfig, onComplete }: TaskProps) {
  const memo = config.memo as MemoConfig;
  const memoRevised = config.memoRevised as MemoConfig;
  const differences = (config.differences ?? []) as DiffZone[];
  const recallQuestions = (config.recallQuestions ?? []) as RecallQuestion[];
  const pearlSwapMessage = (config.pearlSwapMessage as string) ?? '';
  const writingPrompt = (config.writingPrompt as string) ?? '';
  const writingMinWords = (config.writingMinWords as number) ?? 30;
  const writingLane = (config.writingLane as Record<string, unknown>) ?? {};

  // ── Legacy config support (memoA/memoB format) ──
  const legacyMemo = config.memoA as MemoConfig | undefined;
  const legacyMemoRevised = config.memoB as MemoConfig | undefined;
  const effectiveMemo = memo ?? legacyMemo;
  const effectiveMemoRevised = memoRevised ?? legacyMemoRevised;

  // ── Legacy difference field support (memoAText/memoBText → originalText/revisedText) ──
  const effectiveDifferences = differences.map(d => ({
    ...d,
    originalText: d.originalText ?? (d as unknown as { memoAText?: string }).memoAText ?? '',
    revisedText: d.revisedText ?? (d as unknown as { memoBText?: string }).memoBText ?? '',
  }));

  const addConcern = useShiftQueueStore(s => s.addConcern);
  const user = useStudentStore(s => s.user);
  const lane = user?.lane ?? 2;

  const laneConfig = writingLane[String(lane)] as Record<string, unknown> | undefined;
  const effectiveMinWords = typeof laneConfig?.minWords === 'number' ? laneConfig.minWords : writingMinWords;

  const [phase, setPhase] = useState<Phase>('read');
  const [glitchActive, setGlitchActive] = useState(false);

  // Recall state
  const [recallAnswers, setRecallAnswers] = useState<Record<string, number>>({});
  const [recallSubmitted, setRecallSubmitted] = useState(false);
  const [recallScore, setRecallScore] = useState(0);

  // Classify state
  const [classifications, setClassifications] = useState<Record<string, string>>({});

  // Write state
  const [writingText, setWritingText] = useState('');
  const [writingPassed, setWritingPassed] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll to top on phase change
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [phase]);

  // ── Phase: Read → Swap ──────────────────────────────────────────

  const handleReadComplete = useCallback(() => {
    setPhase('swapping');
    // Glitch animation sequence
    setTimeout(() => setGlitchActive(true), 300);
    setTimeout(() => setGlitchActive(false), 1800);
    setTimeout(() => setPhase('recall'), 2500);
  }, []);

  // ── Phase: Recall ───────────────────────────────────────────────

  const handleRecallAnswer = useCallback((questionId: string, optionIndex: number) => {
    if (recallSubmitted) return;
    setRecallAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
  }, [recallSubmitted]);

  const allRecallAnswered = recallQuestions.every(q => recallAnswers[q.id] !== undefined);

  const handleRecallSubmit = useCallback(() => {
    let correct = 0;
    for (const q of recallQuestions) {
      if (recallAnswers[q.id] === q.correctIndex) correct++;
    }
    setRecallScore(correct);
    setRecallSubmitted(true);
    const wrongCount = recallQuestions.length - correct;
    if (wrongCount > 0) {
      addConcern(wrongCount * 0.05);
    }
  }, [recallQuestions, recallAnswers, addConcern]);

  const handleRecallContinue = useCallback(() => {
    setPhase('classify');
  }, []);

  // ── Phase: Classify ─────────────────────────────────────────────

  const setClassification = useCallback((diffId: string, value: string) => {
    setClassifications(prev => ({ ...prev, [diffId]: value }));
  }, []);

  const allClassified = effectiveDifferences.every(d => !!classifications[d.diffId]);

  const submitClassifications = useCallback(() => {
    let wrongCount = 0;
    for (const diff of effectiveDifferences) {
      if (classifications[diff.diffId] !== diff.classification) {
        wrongCount++;
      }
    }
    if (wrongCount > 0) {
      addConcern(wrongCount * 0.1);
    }
    setPhase('write');
  }, [effectiveDifferences, classifications, addConcern]);

  // ── Phase: Write ────────────────────────────────────────────────

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
      const correctClassifications = effectiveDifferences.filter(
        d => classifications[d.diffId] === d.classification
      ).length;
      const score = correctClassifications / Math.max(effectiveDifferences.length, 1);
      onComplete(Math.min(score, 1), {
        taskType: 'contradiction_report',
        itemsCorrect: correctClassifications,
        itemsTotal: effectiveDifferences.length,
        category: 'grammar',
        errorsFound: correctClassifications,
        errorsTotal: effectiveDifferences.length,
        writingText,
        // Gradebook teacher view reads these legacy keys — keep them.
        recallScore,
        recallTotal: recallQuestions.length,
        correctClassifications,
        classificationsTotal: effectiveDifferences.length,
      });
    }, 1500);
  }, [effectiveDifferences, classifications, writingText, onComplete, recallScore, recallQuestions.length]);

  // ── Render: Memo card (plain text, no highlights) ───────────────

  function renderMemoCard(memoData: MemoConfig, label?: string) {
    const paragraphs = memoData.body.split('\n\n').filter(Boolean);
    return (
      <div className="bg-white border border-[#D4CFC6] rounded-xl border-l-2 border-l-sky-400">
        {/* Header */}
        <div className="px-4 py-3 border-b border-[#EDE8DE] space-y-1">
          <span className="font-special-elite text-sm text-[#2C3340] tracking-wider">
            {memoData.title}
          </span>
          <p className="font-ibm-mono text-[10px] text-[#9CA3AF] tracking-wider">
            {memoData.department}
          </p>
          <p className="font-ibm-mono text-[10px] text-[#9CA3AF]">
            {memoData.date}
          </p>
          <div className="space-y-0.5 pt-1">
            <p className="font-ibm-mono text-[10px] text-[#6B7280]">
              <span className="text-[#B8B3AA] mr-2">FROM:</span>{memoData.from}
            </p>
            <p className="font-ibm-mono text-[10px] text-[#6B7280]">
              <span className="text-[#B8B3AA] mr-2">TO:</span>{memoData.to}
            </p>
            <p className="font-ibm-mono text-[10px] text-[#6B7280]">
              <span className="text-[#B8B3AA] mr-2">RE:</span>{memoData.re}
            </p>
          </div>
          {label && (
            <div className="pt-1">
              <span className="px-2 py-0.5 bg-[#FAFAF7] border border-[#E8E4DC] rounded-full font-ibm-mono text-[8px] text-[#9CA3AF] tracking-widest">
                {label}
              </span>
            </div>
          )}
        </div>

        {/* Body — plain text, no clickable highlights */}
        <div className="px-4 py-3 space-y-2">
          {paragraphs.map((p, i) => (
            <p key={i} className="text-sm text-[#4B5563] leading-relaxed">{p}</p>
          ))}
        </div>

        {/* Reviewed stamp */}
        {memoData.reviewedBy && (
          <div className="px-4 py-2 border-t border-[#EDE8DE]">
            <p className="font-ibm-mono text-[9px] text-[#B8B3AA] tracking-wider">
              Reviewed by: {memoData.reviewedBy}
            </p>
          </div>
        )}
      </div>
    );
  }

  // ── Render: Read phase ──────────────────────────────────────────

  function renderReadPhase() {
    return (
      <div className="space-y-4">
        <h3 className="font-ibm-mono text-xs tracking-wider uppercase text-[#8B8578] text-center">
          Review Memo 000328 — Read carefully before continuing
        </h3>

        <div className="animate-doc-slide-in">
          {renderMemoCard(effectiveMemo, 'CURRENT DOCUMENT')}
        </div>

        <div className="pt-2">
          <AuthorizationToast variant="received" onAuthorize={handleReadComplete} />
        </div>
      </div>
    );
  }

  // ── Render: Swap animation ──────────────────────────────────────

  function renderSwapPhase() {
    return (
      <div className="space-y-4">
        {/* PEARL announcement */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
          <p className="font-ibm-mono text-[10px] text-amber-700 tracking-wider uppercase mb-2">
            P.E.A.R.L. BROADCAST
          </p>
          <p className="text-sm text-amber-800 leading-relaxed">
            {pearlSwapMessage}
          </p>
        </div>

        {/* Memo with glitch effect */}
        <div className={`transition-all duration-300 ${glitchActive ? 'memo-glitch' : ''}`}>
          {renderMemoCard(
            glitchActive ? effectiveMemoRevised : effectiveMemo,
            glitchActive ? 'UPDATED DOCUMENT' : 'CURRENT DOCUMENT'
          )}
        </div>
      </div>
    );
  }

  // ── Render: Recall phase ────────────────────────────────────────

  function renderRecallPhase() {
    return (
      <div className="space-y-4">
        <h3 className="font-ibm-mono text-xs tracking-wider uppercase text-[#8B8578] text-center">
          The memo has been updated. What do you remember about the original?
        </h3>

        {/* Show the revised memo — students can see what it says NOW */}
        <div className="opacity-60">
          {renderMemoCard(effectiveMemoRevised, 'CURRENT VERSION')}
        </div>

        <div className="bg-white border border-[#D4CFC6] rounded-xl p-4 space-y-5">
          <p className="font-ibm-mono text-[10px] text-[#B8B3AA] tracking-wider uppercase text-center">
            Recall Questions — What did the original memo say?
          </p>

          {recallQuestions.map((q, qi) => {
            const answered = recallAnswers[q.id] !== undefined;
            const isCorrect = recallSubmitted && recallAnswers[q.id] === q.correctIndex;
            const isWrong = recallSubmitted && answered && recallAnswers[q.id] !== q.correctIndex;

            return (
              <div key={q.id} className="space-y-2">
                <p className="text-sm text-[#2C3340] font-medium">
                  {qi + 1}. {q.question}
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {q.options.map((opt, oi) => {
                    const isSelected = recallAnswers[q.id] === oi;
                    const showCorrect = recallSubmitted && oi === q.correctIndex;
                    const showWrong = recallSubmitted && isSelected && oi !== q.correctIndex;

                    return (
                      <button
                        key={oi}
                        className={`px-3 py-2 rounded-lg text-sm text-left transition-all border ${
                          showCorrect
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                            : showWrong
                              ? 'bg-rose-50 border-rose-300 text-rose-800'
                              : isSelected
                                ? 'bg-sky-50 border-sky-400 text-sky-800'
                                : 'bg-[#FAFAF7] border-[#E8E4DC] text-[#4B5563] hover:border-sky-300'
                        } ${recallSubmitted ? 'pointer-events-none' : 'active:scale-[0.98]'}`}
                        onClick={() => handleRecallAnswer(q.id, oi)}
                        disabled={recallSubmitted}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
                {isWrong && recallSubmitted && (
                  <p className="text-xs text-rose-600 font-ibm-mono">
                    The original said: {q.options[q.correctIndex]}
                  </p>
                )}
                {isCorrect && (
                  <p className="text-xs text-emerald-600 font-ibm-mono">
                    Correct
                  </p>
                )}
              </div>
            );
          })}

          {!recallSubmitted ? (
            <div className="pt-2 text-center">
              <button
                className="px-6 py-2.5 rounded-xl bg-sky-600 text-white text-xs font-medium tracking-wider hover:bg-sky-700 disabled:opacity-40 active:scale-95 transition-all"
                disabled={!allRecallAnswered}
                onClick={handleRecallSubmit}
              >
                Check Answers
              </button>
            </div>
          ) : (
            <div className="pt-2 text-center space-y-2">
              <p className="font-ibm-mono text-xs text-[#8B8578]">
                {recallScore} / {recallQuestions.length} correct
              </p>
              <button
                className="px-6 py-2.5 rounded-xl bg-sky-600 text-white text-xs font-medium tracking-wider hover:bg-sky-700 active:scale-95 transition-all"
                onClick={handleRecallContinue}
              >
                Continue to Classification
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Render: Classify phase ──────────────────────────────────────

  function renderClassifyPhase() {
    return (
      <div className="space-y-4">
        <h3 className="font-ibm-mono text-xs tracking-wider uppercase text-[#8B8578] text-center">
          Stamp each difference — was it changed or removed?
        </h3>

        {/* Both memos side by side for reference */}
        <details className="bg-[#FAFAF7] border border-[#E8E4DC] rounded-xl" open>
          <summary className="px-4 py-2 cursor-pointer font-ibm-mono text-[10px] text-[#8B8578] tracking-wider uppercase">
            Reference: Both memo versions
          </summary>
          <div className="px-4 pb-3 flex flex-col md:flex-row gap-4">
            {renderMemoCard(effectiveMemo, 'ORIGINAL — March 3')}
            {renderMemoCard(effectiveMemoRevised, 'REVISED — March 10')}
          </div>
        </details>

        {/* Classification cards with stamp choices */}
        {effectiveDifferences.map((diff, i) => (
          <div key={diff.diffId} className="animate-doc-slide-up bg-white border border-[#E8E4DC] rounded-xl p-4 space-y-3" style={{ animationDelay: `${i * 100}ms` }}>
            <p className="font-ibm-mono text-[10px] text-[#B8B3AA] tracking-wider uppercase">
              Difference {i + 1}: {diff.label}
            </p>
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1">
                <span className="font-ibm-mono text-[10px] text-[#B8B3AA] tracking-wider uppercase">
                  Original
                </span>
                <p className="text-sm text-[#6B7280] mt-1 line-through decoration-[#D4CFC6]">
                  {diff.originalText}
                </p>
              </div>
              <div className="flex-1">
                <span className="font-ibm-mono text-[10px] text-[#B8B3AA] tracking-wider uppercase">
                  Revised
                </span>
                <p className={`text-sm mt-1 ${diff.revisedText === '[Removed]' ? 'text-rose-500 italic' : 'text-emerald-700'}`}>
                  {diff.revisedText}
                </p>
              </div>
            </div>

            {/* Stamp choice replaces dropdown */}
            <StampChoice
              options={[
                { variant: 'changed', label: 'CHANGED' },
                { variant: 'removed', label: 'REMOVED' },
              ]}
              selected={
                classifications[diff.diffId] === 'information_changed' ? 'changed'
                  : classifications[diff.diffId] === 'information_removed' ? 'removed'
                  : null
              }
              onChoice={(v) => setClassification(diff.diffId, v === 'changed' ? 'information_changed' : 'information_removed')}
            />
          </div>
        ))}

        <div className="pt-2">
          <AuthorizationToast
            variant="filed"
            onAuthorize={submitClassifications}
            disabled={!allClassified}
          />
        </div>
      </div>
    );
  }

  // ── Render: Write phase ─────────────────────────────────────────

  function renderWritePhase() {
    return (
      <div className="space-y-4">
        <h3 className="font-ibm-mono text-xs tracking-wider uppercase text-[#8B8578] text-center">
          Written Analysis
        </h3>

        {/* Both memos visible for reference during writing */}
        <details className="bg-[#FAFAF7] border border-[#E8E4DC] rounded-xl">
          <summary className="px-4 py-2 cursor-pointer font-ibm-mono text-[10px] text-[#8B8578] tracking-wider uppercase">
            View both memos for reference
          </summary>
          <div className="px-4 pb-3 flex flex-col md:flex-row gap-4">
            {renderMemoCard(effectiveMemo, 'ORIGINAL — March 3')}
            {renderMemoCard(effectiveMemoRevised, 'REVISED — March 10')}
          </div>
        </details>

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
          writingPrompt={writingPrompt}
          taskContext={`Week ${weekConfig.weekNumber} contradiction analysis. The student compared document "${effectiveMemo?.title || 'memo'}" with a revised version and found ${effectiveDifferences.length} differences. They are writing an analysis of what changed.`}
          onResult={handleWritingResult}
          disabled={!writingText.trim()}
        />

        {writingPassed && (
          <div className="pt-2">
            <AuthorizationToast variant="filed" onAuthorize={handleSubmit} />
          </div>
        )}
      </div>
    );
  }

  // ── Main render ───────────────────────────────────────────────

  const phaseLabels: Record<Phase, string> = {
    read: 'Review Document',
    swapping: 'Document Updating...',
    recall: 'Recall Check',
    classify: 'Classification',
    write: 'Written Analysis',
    submitting: 'Submitting Report...',
  };

  return (
    <div ref={scrollRef} className="space-y-4 max-w-2xl mx-auto">
      {/* Glitch animation styles */}
      <style>{`
        .memo-glitch {
          animation: memoGlitch 1.5s ease-in-out;
        }
        @keyframes memoGlitch {
          0% { opacity: 1; filter: none; }
          10% { opacity: 0.3; filter: blur(2px); transform: translateX(-2px); }
          20% { opacity: 0.8; filter: none; transform: translateX(1px); }
          30% { opacity: 0.2; filter: blur(3px) saturate(2); transform: translateX(-1px) skewX(1deg); }
          40% { opacity: 0.6; filter: hue-rotate(90deg); transform: none; }
          50% { opacity: 0.1; filter: blur(4px); }
          60% { opacity: 0.7; filter: hue-rotate(-30deg) brightness(1.5); transform: translateX(2px); }
          70% { opacity: 0.4; filter: blur(1px); transform: skewX(-0.5deg); }
          80% { opacity: 0.9; filter: none; transform: none; }
          90% { opacity: 0.95; filter: brightness(1.1); }
          100% { opacity: 1; filter: none; transform: none; }
        }
      `}</style>

      {/* Phase indicator */}
      <div className="text-center">
        <span className="font-ibm-mono text-[10px] text-[#B8B3AA] tracking-widest uppercase">
          {phaseLabels[phase]}
        </span>
      </div>

      <div key={phase} className="animate-fadeIn">
        {phase === 'read' && renderReadPhase()}
        {phase === 'swapping' && renderSwapPhase()}
        {phase === 'recall' && renderRecallPhase()}
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
