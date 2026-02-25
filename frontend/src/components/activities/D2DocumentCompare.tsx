import { useState, useMemo, useCallback } from 'react';
import { useStudentStore } from '../../stores/studentStore';
import { usePearlStore } from '../../stores/pearlStore';
import { useShiftStore } from '../../stores/shiftStore';
import { useBarkContext } from '../../hooks/useBarkContext';
import { submitForEvaluation } from '../../api/sessions';
import type { PhaseConfig, EvaluationResult } from '../../types/sessions';

interface DiffSpan {
  id: string;
  text: string;
  /** Which memo this diff is in: 'original' or 'revised' */
  side: 'original' | 'revised';
}

interface MemoContent {
  title: string;
  subtitle?: string;
  /** Array of text segments. DiffSpan items are clickable differences. */
  segments: Array<string | DiffSpan>;
}

interface D2Config {
  prompt?: string;
  grammarTarget?: string;
  targetVocab?: string[];
  originalMemo?: MemoContent;
  revisedMemo?: MemoContent;
  diffs?: DiffSpan[];
  requiredDiffs?: Record<number, number>; // lane → required count
  requiredSentences?: Record<number, number>; // lane → required count
  reportPrompt?: string;
  ambientMessages?: string[];
  dismissalText?: string;
}

interface D2Props {
  phaseConfig: PhaseConfig;
  onComplete: (data?: Record<string, unknown>) => void;
}

type Phase = 'comparing' | 'reporting' | 'submitting' | 'feedback' | 'dismissed' | 'complete';

export default function D2DocumentCompare({ phaseConfig, onComplete }: D2Props) {
  const user = useStudentStore(s => s.user);
  const triggerBark = usePearlStore(s => s.triggerBark);
  const triggerAIBark = usePearlStore(s => s.triggerAIBark);
  const currentWeek = useShiftStore(s => s.currentWeek);
  const baseContext = useBarkContext();

  const config = phaseConfig.config as D2Config;
  const lane = user?.lane || 2;
  const requiredDiffCount = config.requiredDiffs?.[lane] ?? (lane === 1 ? 3 : lane === 2 ? 4 : 5);
  const requiredSentenceCount = config.requiredSentences?.[lane] ?? (lane === 1 ? 3 : lane === 2 ? 5 : 8);
  const targetVocab = config.targetVocab || [];
  const dismissalText = config.dismissalText || 'The latest version is the correct version. Thank you for your diligence.';

  const [foundDiffs, setFoundDiffs] = useState<Set<string>>(new Set());
  const [reportText, setReportText] = useState('');
  const [phase, setPhase] = useState<Phase>('comparing');
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);

  const sentenceCount = reportText.trim().split(/[.!?]+/).filter(s => s.trim().length > 3).length;
  const canProceedToReport = foundDiffs.size >= requiredDiffCount;
  const canSubmitReport = sentenceCount >= requiredSentenceCount;

  // Track vocab usage in report
  const vocabUsed = useMemo(() => {
    const lower = reportText.toLowerCase();
    return targetVocab.filter(word => {
      const pattern = new RegExp(`\\b${word.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
      return pattern.test(lower);
    });
  }, [reportText, targetVocab]);

  const handleDiffClick = useCallback((diffId: string) => {
    if (phase !== 'comparing') return;
    setFoundDiffs(prev => {
      const next = new Set(prev);
      if (next.has(diffId)) {
        next.delete(diffId);
      } else {
        next.add(diffId);
        // PEARL feedback on finding a diff
        if (!prev.has(diffId)) {
          const count = next.size;
          if (count === requiredDiffCount) {
            triggerBark('success', 'Minimum contradictions identified. You may now file your report.');
          } else if (count === 1) {
            triggerBark('notice', 'Contradiction noted. Continue scanning for discrepancies.');
          }
        }
      }
      return next;
    });
  }, [phase, requiredDiffCount, triggerBark]);

  const handleProceedToReport = useCallback(() => {
    if (!canProceedToReport) return;
    setPhase('reporting');
    triggerBark('notice', 'Begin your contradiction report. Use precise language.');
  }, [canProceedToReport, triggerBark]);

  const handleSubmitReport = useCallback(async () => {
    if (!canSubmitReport) return;
    setPhase('submitting');

    try {
      const result = await submitForEvaluation({
        weekNumber: currentWeek?.weekNumber || 2,
        phaseId: phaseConfig.id,
        activityType: 'd2_document_compare',
        content: reportText,
        metadata: {
          grammarTarget: config.grammarTarget,
          targetVocab,
          missionId: phaseConfig.missionId,
          lane,
        },
      });
      setEvaluation(result);
      setPhase('feedback');

      if (result.pearlFeedback) {
        triggerBark('notice', result.pearlFeedback);
      }
    } catch {
      triggerBark('notice', 'Contradiction report filed. Processing complete.');
      setPhase('feedback');
      setEvaluation(null);
    }
  }, [canSubmitReport, reportText, currentWeek, phaseConfig, config.grammarTarget, targetVocab, lane, triggerBark]);

  const handleDismiss = useCallback(() => {
    setPhase('dismissed');
    triggerAIBark('notice', {
      ...baseContext,
      customDetail: 'Student report dismissed by Ministry. Emotional beat: their work is invalidated.',
    }, dismissalText);
    // Auto-advance after the dismissal message sinks in
    setTimeout(() => {
      setPhase('complete');
      onComplete({
        score: evaluation?.taskScore ?? 1,
        reportText,
        diffsFound: foundDiffs.size,
        evaluation,
      });
    }, 4000);
  }, [dismissalText, triggerAIBark, baseContext, onComplete, evaluation, reportText, foundDiffs.size]);

  const renderMemoSegments = (segments: Array<string | DiffSpan> | undefined) => {
    if (!segments) return null;
    return segments.map((seg, i) => {
      if (typeof seg === 'string') {
        return <span key={i}>{seg}</span>;
      }
      const isFound = foundDiffs.has(seg.id);
      return (
        <span
          key={seg.id}
          onClick={() => handleDiffClick(seg.id)}
          className={`cursor-pointer transition-all rounded px-0.5 ${
            isFound
              ? 'bg-terminal-amber/30 text-terminal-amber border-b border-terminal-amber/50'
              : 'hover:bg-white/10'
          }`}
        >
          {seg.text}
        </span>
      );
    });
  };

  return (
    <div className="space-y-5">
      {/* Prompt */}
      <div className="ios-glass-card border-neon-cyan/20 p-4">
        <p className="font-ibm-sans text-sm text-white/90 leading-relaxed">
          {config.prompt || 'Compare the two memos below. Click on the differences you find.'}
        </p>
      </div>

      {/* Diff counter */}
      <div className="flex items-center justify-center gap-3">
        <span className={`font-ibm-mono text-xs tracking-wider ${
          foundDiffs.size >= requiredDiffCount ? 'text-neon-mint' : 'text-white/50'
        }`}>
          {foundDiffs.size} / {requiredDiffCount} contradictions identified
          {foundDiffs.size >= requiredDiffCount && ' ✓'}
        </span>
      </div>

      {/* Split-screen memos */}
      {(phase === 'comparing' || phase === 'reporting') && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Original memo */}
          <div className="ios-glass-card p-4 border-white/10">
            <div className="border-b border-white/10 pb-2 mb-3">
              <p className="font-ibm-mono text-[10px] text-white/30 tracking-wider">
                ORIGINAL
              </p>
              <h3 className="font-special-elite text-sm text-white/80 tracking-wider">
                {config.originalMemo?.title || 'Memo 14'}
              </h3>
              {config.originalMemo?.subtitle && (
                <p className="font-ibm-mono text-[10px] text-white/40 tracking-wider">
                  {config.originalMemo.subtitle}
                </p>
              )}
            </div>
            <div className="font-ibm-sans text-sm text-white/75 leading-relaxed space-y-2">
              {renderMemoSegments(config.originalMemo?.segments)}
            </div>
          </div>

          {/* Revised memo */}
          <div className="ios-glass-card p-4 border-white/10">
            <div className="border-b border-white/10 pb-2 mb-3">
              <p className="font-ibm-mono text-[10px] text-neon-cyan/50 tracking-wider">
                REVISED
              </p>
              <h3 className="font-special-elite text-sm text-white/80 tracking-wider">
                {config.revisedMemo?.title || 'Memo 14-R'}
              </h3>
              {config.revisedMemo?.subtitle && (
                <p className="font-ibm-mono text-[10px] text-white/40 tracking-wider">
                  {config.revisedMemo.subtitle}
                </p>
              )}
            </div>
            <div className="font-ibm-sans text-sm text-white/75 leading-relaxed space-y-2">
              {renderMemoSegments(config.revisedMemo?.segments)}
            </div>
          </div>
        </div>
      )}

      {/* Comparing phase: proceed button */}
      {phase === 'comparing' && (
        <button
          onClick={handleProceedToReport}
          disabled={!canProceedToReport}
          className={`w-full py-3 rounded-full font-ibm-mono text-xs uppercase tracking-[0.25em] transition-all ${
            canProceedToReport
              ? 'ios-glass-pill-action text-neon-cyan hover:shadow-[0_0_16px_rgba(0,229,255,0.2)]'
              : 'ios-glass-pill text-white/25 cursor-not-allowed'
          }`}
        >
          File Contradiction Report
        </button>
      )}

      {/* Reporting phase */}
      {phase === 'reporting' && (
        <>
          <div className="ios-glass-card p-4 border-neon-cyan/20">
            <p className="font-ibm-mono text-[10px] text-neon-cyan/70 tracking-wider mb-2">
              CONTRADICTION REPORT
            </p>
            <p className="font-ibm-sans text-xs text-white/60 mb-3">
              {config.reportPrompt || 'Describe the differences you found. Use "there is" / "there are" to report each contradiction.'}
            </p>
            <textarea
              value={reportText}
              onChange={e => setReportText(e.target.value)}
              placeholder="Write your contradiction report here..."
              className="ios-glass-input w-full h-36 border-none bg-transparent text-sm leading-relaxed resize-none font-ibm-sans text-white/90"
            />
            <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between">
              <span className={`font-ibm-mono text-xs tracking-wider ${
                sentenceCount >= requiredSentenceCount ? 'text-neon-mint' : 'text-white/40'
              }`}>
                ~{sentenceCount} / {requiredSentenceCount} sentences
                {sentenceCount >= requiredSentenceCount && ' ✓'}
              </span>
              {targetVocab.length > 0 && (
                <span className="font-ibm-mono text-[10px] text-white/40 tracking-wider">
                  {vocabUsed.length} vocab used
                </span>
              )}
            </div>
          </div>

          <button
            onClick={handleSubmitReport}
            disabled={!canSubmitReport}
            className={`w-full py-3 rounded-full font-ibm-mono text-xs uppercase tracking-[0.25em] transition-all ${
              canSubmitReport
                ? 'ios-glass-pill-action text-neon-cyan hover:shadow-[0_0_16px_rgba(0,229,255,0.2)]'
                : 'ios-glass-pill text-white/25 cursor-not-allowed'
            }`}
          >
            Submit Report
          </button>
        </>
      )}

      {/* Submitting phase */}
      {phase === 'submitting' && (
        <div className="ios-glass-card p-8 text-center">
          <div className="mb-4">
            <div className="w-12 h-12 mx-auto border-2 border-neon-cyan/40 rounded-full flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-neon-cyan border-t-transparent rounded-full animate-spin" />
            </div>
          </div>
          <p className="font-ibm-mono text-xs text-neon-cyan tracking-[0.3em] uppercase animate-pulse">
            P.E.A.R.L. is reviewing...
          </p>
          <p className="font-ibm-mono text-[10px] text-white/30 tracking-wider mt-2">
            Contradiction report under compliance review
          </p>
        </div>
      )}

      {/* Feedback phase — emotional beat: report gets dismissed */}
      {phase === 'feedback' && (
        <div className="space-y-4">
          <div className="ios-glass-card p-6 text-center border-terminal-amber/30">
            <p className="font-ibm-mono text-xs text-terminal-amber tracking-wider mb-3">
              REPORT RECEIVED
            </p>
            {evaluation?.pearlFeedback && (
              <p className="font-ibm-mono text-xs text-white/60 tracking-wider leading-relaxed">
                {evaluation.pearlFeedback}
              </p>
            )}
            <p className="font-ibm-mono text-[10px] text-white/30 tracking-wider mt-3">
              {foundDiffs.size} contradiction{foundDiffs.size !== 1 ? 's' : ''} documented.
              {evaluation && ` Compliance: ${Math.round(evaluation.taskScore * 100)}%.`}
            </p>
          </div>

          <button
            onClick={handleDismiss}
            className="w-full py-3 rounded-full font-ibm-mono text-xs uppercase tracking-[0.25em] ios-glass-pill-action text-neon-cyan hover:shadow-[0_0_16px_rgba(0,229,255,0.2)] transition-all"
          >
            Continue
          </button>
        </div>
      )}

      {/* Dismissed phase — memo fades, only revised remains */}
      {phase === 'dismissed' && (
        <div className="space-y-4 animate-pulse">
          <div className="ios-glass-card p-6 text-center border-white/10">
            <p className="font-ibm-mono text-xs text-white/40 tracking-wider italic">
              {dismissalText}
            </p>
          </div>
        </div>
      )}

      {/* Complete phase */}
      {phase === 'complete' && (
        <div className="text-center font-ibm-mono text-xs text-neon-mint tracking-wider animate-pulse ios-text-glow-mint py-8">
          FILED
        </div>
      )}
    </div>
  );
}
