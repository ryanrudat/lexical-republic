import { useState, useCallback } from 'react';
import type { TaskProps } from '../../../types/shiftQueue';
import { useStudentStore } from '../../../stores/studentStore';
import TargetWordHighlighter from './shared/TargetWordHighlighter';
import WritingEvaluator from './shared/WritingEvaluator';
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
    (result: { passed: boolean }, attempt: number) => {
      if (result.passed) {
        setPassed(true);
        setTimeout(() => {
          onComplete(1, {
            type: 'shift_report',
            text: fullText,
            attempt,
            wordCount: fullText.split(/\s+/).filter(Boolean).length,
          });
        }, 1000);
      }
    },
    [fullText, onComplete]
  );

  return (
    <div className="space-y-4">
      {/* Report header */}
      <div className="ios-glass-card border border-white/10 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="font-ibm-mono text-[10px] text-white/30 tracking-[0.3em] uppercase">
            Ministry Shift Report
          </span>
          <span className="font-ibm-mono text-[10px] text-white/20 tracking-wider">
            {pair?.designation || 'Associate'}
          </span>
        </div>
        <p className="font-ibm-mono text-sm text-white/70 leading-relaxed">{prompt}</p>
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
              <p className="font-ibm-mono text-[10px] text-neon-cyan/60 tracking-wider">
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
          onResult={handleResult}
          disabled={fullText.split(/\s+/).filter(Boolean).length < Math.floor(minWords * 0.5)}
        />
      )}

      {passed && (
        <div className="text-center py-2">
          <span className="font-ibm-mono text-xs text-neon-mint tracking-wider">
            Shift report submitted successfully.
          </span>
        </div>
      )}
    </div>
  );
}
