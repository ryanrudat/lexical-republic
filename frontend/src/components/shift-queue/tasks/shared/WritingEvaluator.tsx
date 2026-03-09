import { useState } from 'react';
import client from '../../../../api/client';
import { getSocket } from '../../../../utils/socket';

export interface EvalResult {
  passed: boolean;
  grammarScore: number;
  vocabScore: number;
  vocabUsed?: string[];
  vocabMissed?: string[];
  taskScore?: number;
  pearlFeedback?: string;
  isDegraded?: boolean;
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
}

export default function WritingEvaluator({
  text,
  weekNumber,
  missionId,
  grammarTarget,
  targetVocab,
  lane,
  onResult,
  disabled,
}: WritingEvaluatorProps) {
  const [attempt, setAttempt] = useState(1);
  const [evaluating, setEvaluating] = useState(false);
  const [lastResult, setLastResult] = useState<EvalResult | null>(null);

  async function evaluate() {
    setEvaluating(true);

    try {
      let result: EvalResult;

      if (attempt >= 3) {
        // Auto-pass on attempt 3+
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
          metadata: { grammarTarget, targetVocab, missionId, lane },
        });

        const data = response.data;

        if (attempt === 1) {
          // Attempt 1: pass only if API says passed
          result = {
            passed: data.passed === true,
            grammarScore: data.grammarScore ?? 0,
            vocabScore: data.vocabScore ?? 0,
            vocabUsed: data.vocabUsed,
            vocabMissed: data.vocabMissed,
            taskScore: data.taskScore,
            pearlFeedback: data.pearlFeedback,
            isDegraded: data.isDegraded,
          };
        } else {
          // Attempt 2: pass if grammarScore >= 0.3 OR vocabScore >= 0.3
          const gs = data.grammarScore ?? 0;
          const vs = data.vocabScore ?? 0;
          result = {
            passed: gs >= 0.3 || vs >= 0.3,
            grammarScore: gs,
            vocabScore: vs,
            vocabUsed: data.vocabUsed,
            vocabMissed: data.vocabMissed,
            taskScore: data.taskScore,
            pearlFeedback: data.pearlFeedback,
            isDegraded: data.isDegraded,
          };
        }
      }

      setLastResult(result);
      const currentAttempt = attempt;
      if (!result.passed) {
        setAttempt(prev => prev + 1);
        // Notify teacher's class monitor of failure
        const sock = getSocket();
        if (sock?.connected) {
          sock.emit('student:task-update', { taskId: missionId ?? 'writing', taskLabel: 'Writing', failCount: currentAttempt });
        }
      }
      onResult(result, currentAttempt);
    } catch {
      // On error, increment attempt so auto-pass kicks in at attempt 3
      const currentAttempt = attempt;
      setAttempt(prev => prev + 1);
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

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        className="ios-glass-pill-action px-6 py-2 font-ibm-mono text-xs tracking-wider"
        disabled={disabled || evaluating}
        onClick={evaluate}
      >
        {evaluating ? (
          <span className="animate-pulse">EVALUATING...</span>
        ) : (
          `SUBMIT (ATTEMPT ${attempt}/3)`
        )}
      </button>
      {lastResult && !lastResult.passed && lastResult.pearlFeedback && (
        <p className="text-neon-pink/80 font-ibm-mono text-xs mt-1">
          {lastResult.pearlFeedback}
        </p>
      )}
    </div>
  );
}
