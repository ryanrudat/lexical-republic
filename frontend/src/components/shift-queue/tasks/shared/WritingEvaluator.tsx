import { useState, useCallback } from 'react';
import client from '../../../../api/client';
import { sendPearlChat } from '../../../../api/pearl';
import { fetchPearlFeedback } from '../../../../api/pearl-feedback';
import { getSocket } from '../../../../utils/socket';

export interface EvalResult {
  passed: boolean;
  grammarScore: number;
  vocabScore: number;
  vocabUsed?: string[];
  vocabMissed?: string[];
  taskScore?: number;
  taskNotes?: string;
  pearlFeedback?: string;
  isDegraded?: boolean;
  /** True when the student forced submission after a failed AI evaluation. */
  submittedAnyway?: boolean;
}

interface WritingEvaluatorProps {
  text: string;
  weekNumber: number;
  missionId?: string;
  grammarTarget: string;
  targetVocab: string[];
  lane: number;
  onResult: (result: EvalResult, attempt: number) => void;
  disabled?: boolean;
  writingPrompt?: string;
  taskContext?: string;
  /**
   * Minimum word count required to enable the "Submit Anyway" button.
   * Prevents empty/near-empty submissions from bypassing evaluation.
   * Defaults to 20.
   */
  minWords?: number;
}

const MAX_NUDGES = 3;

export default function WritingEvaluator({
  text,
  weekNumber,
  missionId,
  grammarTarget,
  targetVocab,
  lane,
  onResult,
  disabled,
  writingPrompt,
  taskContext,
  minWords = 20,
}: WritingEvaluatorProps) {
  const [attempt, setAttempt] = useState(1);
  const [evaluating, setEvaluating] = useState(false);
  const [lastResult, setLastResult] = useState<EvalResult | null>(null);

  // Second AI pass: reasoning feedback. Separate from grammar/vocab so it can stream in asynchronously without blocking the main result.
  const [pearlReasoning, setPearlReasoning] = useState<string | null>(null);
  const [pearlReasoningLoading, setPearlReasoningLoading] = useState(false);

  // Nudge state
  const [nudgeText, setNudgeText] = useState<string | null>(null);
  const [nudgeLoading, setNudgeLoading] = useState(false);
  const [nudgeCount, setNudgeCount] = useState(0);

  async function evaluate() {
    setEvaluating(true);
    setPearlReasoning(null);

    try {
      let result: EvalResult;

      if (attempt >= 3) {
        result = {
          passed: true,
          grammarScore: 0.3,
          vocabScore: 0.3,
          pearlFeedback: 'Submission recorded. Continue to next task.',
        };
      } else {
        const response = await client.post('/submissions/evaluate', {
          content: text,
          weekNumber,
          phaseId: 'shift_queue',
          activityType: 'writing',
          metadata: {
            grammarTarget,
            targetVocab,
            missionId,
            lane,
            writingPrompt,
            taskContext,
          },
        });

        const data = response.data;

        if (attempt === 1) {
          result = {
            passed: data.passed === true,
            grammarScore: data.grammarScore ?? 0,
            vocabScore: data.vocabScore ?? 0,
            vocabUsed: data.vocabUsed,
            vocabMissed: data.vocabMissed,
            taskScore: data.taskScore,
            taskNotes: data.taskNotes,
            pearlFeedback: data.pearlFeedback,
            isDegraded: data.isDegraded,
          };
        } else {
          const gs = data.grammarScore ?? 0;
          const vs = data.vocabScore ?? 0;
          result = {
            passed: gs >= 0.3 || vs >= 0.3,
            grammarScore: gs,
            vocabScore: vs,
            vocabUsed: data.vocabUsed,
            vocabMissed: data.vocabMissed,
            taskScore: data.taskScore,
            taskNotes: data.taskNotes,
            pearlFeedback: data.pearlFeedback,
            isDegraded: data.isDegraded,
          };
        }
      }

      setLastResult(result);
      const currentAttempt = attempt;
      if (!result.passed) {
        setAttempt(prev => prev + 1);
        setNudgeCount(0); // reset nudge count for new attempt
        const sock = getSocket();
        if (sock?.connected) {
          sock.emit('student:task-update', { taskId: missionId ?? 'writing', taskLabel: 'Writing', failCount: currentAttempt });
        }
      }
      onResult(result, currentAttempt);

      // Fire-and-forget so the grammar result renders immediately; fetchPearlFeedback never throws.
      setPearlReasoningLoading(true);
      fetchPearlFeedback({
        taskType: 'writing',
        taskContext: taskContext ?? writingPrompt ?? '',
        studentText: text,
        weekNumber,
      })
        .then(({ pearlFeedback }) => setPearlReasoning(pearlFeedback))
        .finally(() => setPearlReasoningLoading(false));
    } catch {
      const currentAttempt = attempt;
      setAttempt(prev => prev + 1);
      setNudgeCount(0);
      const result: EvalResult = {
        passed: false,
        grammarScore: 0,
        vocabScore: 0,
        pearlFeedback: 'Evaluation unavailable. Try again.',
        isDegraded: true,
      };
      setLastResult(result);
      onResult(result, currentAttempt);
    } finally {
      setEvaluating(false);
    }
  }

  const submitAnyway = useCallback(() => {
    // Fall back to the degraded 0.3 floor so this path and the attempt-3 auto-pass land at the same score.
    const result: EvalResult = {
      passed: true,
      grammarScore: lastResult?.grammarScore ?? 0.3,
      vocabScore: lastResult?.vocabScore ?? 0.3,
      vocabUsed: lastResult?.vocabUsed,
      vocabMissed: lastResult?.vocabMissed,
      submittedAnyway: true,
    };
    setLastResult(result);
    onResult(result, attempt);
  }, [lastResult, attempt, onResult]);

  const handleNudge = useCallback(async () => {
    if (nudgeLoading || nudgeCount >= MAX_NUDGES) return;
    setNudgeLoading(true);
    try {
      const resp = await sendPearlChat(
        'Help me with my writing.',
        [],
        {
          weekNumber,
          taskType: 'shift_report',
          taskLabel: 'Writing Task',
          grammarTarget,
          targetWords: targetVocab,
          isWritingNudge: true,
          writingPrompt,
          studentWritingSoFar: text,
          taskNarrativeContext: taskContext,
        },
      );
      setNudgeText(resp.reply);
      setNudgeCount(prev => prev + 1);
    } catch {
      setNudgeText('Guidance systems temporarily unavailable. Continue writing, Citizen.');
    } finally {
      setNudgeLoading(false);
    }
  }, [nudgeLoading, nudgeCount, weekNumber, grammarTarget, targetVocab, writingPrompt, text, taskContext]);

  const trimmedText = text.trim();
  const hasText = trimmedText.length > 0;
  const hasFailedOnce = lastResult !== null && !lastResult.passed;
  const meetsMinWords = trimmedText.split(/\s+/).filter(Boolean).length >= minWords;

  return (
    <div className="flex flex-col items-start gap-3">
      <div className="flex items-center gap-3 flex-wrap">
        <button
          className="px-6 py-2.5 rounded-xl bg-sky-600 text-white text-xs font-medium tracking-wider hover:bg-sky-700 disabled:opacity-40 transition-colors"
          disabled={disabled || evaluating}
          onClick={evaluate}
        >
          {evaluating ? (
            <span className="animate-pulse">Evaluating...</span>
          ) : (
            `Submit (Attempt ${attempt}/3)`
          )}
        </button>

        <button
          className="px-4 py-2.5 rounded-xl border border-[#D4CFC6] text-[#8B8578] text-xs font-medium tracking-wider hover:border-sky-400 hover:text-sky-600 disabled:opacity-30 transition-colors"
          disabled={!hasText || nudgeLoading || nudgeCount >= MAX_NUDGES}
          onClick={handleNudge}
          title={nudgeCount >= MAX_NUDGES ? 'Maximum guidance reached' : 'Ask PEARL for a writing hint'}
        >
          {nudgeLoading ? (
            <span className="animate-pulse">Consulting...</span>
          ) : nudgeCount >= MAX_NUDGES ? (
            'Guidance Limit Reached'
          ) : (
            `Request Guidance (${MAX_NUDGES - nudgeCount} left)`
          )}
        </button>

        {hasFailedOnce && (
          <button
            className="px-4 py-2.5 rounded-xl border border-amber-300 bg-amber-50 text-amber-700 text-xs font-medium tracking-wider hover:bg-amber-100 disabled:opacity-40 disabled:hover:bg-amber-50 transition-colors"
            disabled={!meetsMinWords || evaluating}
            onClick={submitAnyway}
            title={
              meetsMinWords
                ? 'Submit your current draft for review.'
                : `Write at least ${minWords} words to submit anyway.`
            }
          >
            Submit Anyway
          </button>
        )}
      </div>

      {hasFailedOnce && !meetsMinWords && (
        <p className="font-ibm-mono text-[10px] text-[#8B8578] tracking-wider">
          Reach {minWords} words to submit as-is.
        </p>
      )}

      {/* Nudge display */}
      {nudgeText && (
        <div className="w-full bg-[#FAFAF7] border border-[#D4CFC6] rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-sky-500" />
            <span className="font-ibm-mono text-[9px] text-[#8B8578] tracking-[0.2em] uppercase">
              P.E.A.R.L. Guidance
            </span>
          </div>
          <p className="text-xs text-[#4B5563] leading-relaxed">
            {nudgeText}
          </p>
        </div>
      )}

      {/* Evaluation feedback */}
      {lastResult && !lastResult.passed && lastResult.pearlFeedback && (
        <div className="w-full bg-rose-50 border border-rose-200 rounded-xl p-3">
          <p className="text-xs text-rose-600 leading-relaxed">
            {lastResult.pearlFeedback}
          </p>
          {lastResult.taskNotes && (
            <p className="text-[10px] text-rose-400 mt-1 font-ibm-mono tracking-wider">
              {lastResult.taskNotes}
            </p>
          )}
        </div>
      )}

      {/* In-character PEARL reasoning feedback */}
      {lastResult && (pearlReasoning || pearlReasoningLoading) && (
        <div className="w-full bg-sky-50/60 border border-sky-200 rounded-xl p-3 flex items-start gap-2.5">
          <img
            src="/images/pearl-eye-glow.png"
            alt=""
            aria-hidden="true"
            className="w-5 h-5 rounded-full object-cover shrink-0 mt-0.5"
            style={{
              maskImage: 'radial-gradient(circle, black 40%, transparent 72%)',
              WebkitMaskImage: 'radial-gradient(circle, black 40%, transparent 72%)',
            }}
          />
          <div className="flex-1 min-w-0">
            <div className="font-ibm-mono text-[9px] text-sky-700 tracking-[0.2em] uppercase mb-1">
              P.E.A.R.L. Observation
            </div>
            {pearlReasoningLoading && !pearlReasoning ? (
              <p className="text-xs text-sky-600/70 italic animate-pulse">
                Observing...
              </p>
            ) : (
              <p className="text-xs text-[#2C3340] leading-relaxed">
                {pearlReasoning}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
