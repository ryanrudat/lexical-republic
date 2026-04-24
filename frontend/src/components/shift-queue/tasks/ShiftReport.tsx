import { useState, useCallback } from 'react';
import type { TaskProps } from '../../../types/shiftQueue';
import { useStudentStore } from '../../../stores/studentStore';
import TargetWordHighlighter from './shared/TargetWordHighlighter';
import WritingEvaluator from './shared/WritingEvaluator';
import type { EvalResult } from './shared/WritingEvaluator';
import LaneScaffolding from './shared/LaneScaffolding';

export default function ShiftReport({ config, weekConfig, onComplete }: TaskProps) {
  const pair = useStudentStore((s) => s.user);
  const lane = pair?.lane ?? 2;
  const [writingText, setWritingText] = useState('');
  const [guidedTexts, setGuidedTexts] = useState<string[]>([]);
  const [passed, setPassed] = useState(false);

  const prompt = config.prompt as string;
  const laneConfig = config.lane as Record<string, Record<string, unknown>> | undefined;
  const laneMinWords = laneConfig?.[String(lane)]?.minWords as number | undefined;
  const minWords = laneMinWords ?? ((config.minWords as number) || 40);
  const guidedQuestions = (laneConfig?.['1']?.guidedQuestions as string[]) || [];

  // Lane 1 uses guided questions (individual textareas)
  const isGuided = lane === 1 && guidedQuestions.length > 0;

  // All target + previous words for highlighting
  const allWords = [...weekConfig.targetWords, ...weekConfig.previousWords];

  const handleGuidedChange = useCallback((idx: number, text: string) => {
    setGuidedTexts(prev => {
      const updated = [...prev];
      updated[idx] = text;
      return updated;
    });
  }, []);

  // Combine guided texts for evaluation
  const fullText = isGuided ? guidedTexts.filter(Boolean).join(' ') : writingText;

  const handleResult = useCallback(
    (result: EvalResult, attempt: number) => {
      if (!result.passed) return;
      setPassed(true);

      // Clamped gradient score so no single submission registers as perfect or zero.
      const raw = (result.grammarScore + result.vocabScore) / 2;
      const score = Math.min(1, Math.max(0.1, Number.isFinite(raw) ? raw : 0.3));

      setTimeout(() => {
        onComplete(score, {
          taskType: 'shift_report',
          itemsCorrect: 1,
          itemsTotal: 1,
          category: 'writing',
          writingText: fullText,
          wordCount: fullText.split(/\s+/).filter(Boolean).length,
          attempt,
          grammarScore: result.grammarScore,
          vocabScore: result.vocabScore,
          submittedAnyway: result.submittedAnyway ?? false,
          // Gradebook WritingDisplay reads `text` for the "Shift Report" label.
          text: fullText,
        });
      }, 1000);
    },
    [fullText, onComplete]
  );

  return (
    <div className="space-y-4">
      {/* Report header */}
      <div className="bg-[#FAFAF7] border border-[#E8E4DC] rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="font-ibm-mono text-[10px] text-[#8B8578] tracking-[0.3em] uppercase">
            Ministry Shift Report
          </span>
          <span className="font-ibm-mono text-[10px] text-[#B8B3AA] tracking-wider">
            {pair?.designation || 'Associate'}
          </span>
        </div>
        <p className="text-sm text-[#4B5563] leading-relaxed">{prompt}</p>
      </div>

      {/* Lane scaffolding */}
      <LaneScaffolding
        lane={lane}
        scaffolding={laneConfig || {}}
        targetWords={weekConfig.targetWords}
      />

      {/* Writing area */}
      {isGuided ? (
        <div className="space-y-3">
          {guidedQuestions.map((q, idx) => (
            <div key={idx} className="space-y-1">
              <p className="font-ibm-mono text-[10px] text-sky-500 tracking-wider">
                {idx + 1}. {q}
              </p>
              <TargetWordHighlighter
                text={guidedTexts[idx] || ''}
                onChange={(text) => handleGuidedChange(idx, text)}
                targetWords={allWords}
                rows={3}
                placeholder="Write your answer..."
              />
            </div>
          ))}
        </div>
      ) : (
        <TargetWordHighlighter
          text={writingText}
          onChange={setWritingText}
          targetWords={allWords}
          minWords={minWords}
          placeholder="Write your shift report..."
          rows={6}
        />
      )}

      {/* Submit / Evaluate */}
      {!passed && (
        <WritingEvaluator
          text={fullText}
          weekNumber={weekConfig.weekNumber}
          grammarTarget={weekConfig.grammarTarget}
          targetVocab={weekConfig.targetWords}
          lane={lane}
          writingPrompt={prompt}
          taskContext={`Week ${weekConfig.weekNumber} shift report. The student completed their shift tasks and is writing a report about their experience.`}
          onResult={handleResult}
          disabled={fullText.split(/\s+/).filter(Boolean).length < Math.floor(minWords * 0.5)}
          minWords={minWords}
        />
      )}

      {passed && (
        <div className="text-center py-2">
          <span className="font-ibm-mono text-xs text-emerald-600 tracking-wider">
            Shift report submitted successfully.
          </span>
        </div>
      )}
    </div>
  );
}
