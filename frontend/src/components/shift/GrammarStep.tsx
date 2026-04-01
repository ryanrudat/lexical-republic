import { useState } from 'react';
import { useShiftStore } from '../../stores/shiftStore';
import { usePearlStore } from '../../stores/pearlStore';
import type { GrammarDocument, MasteryState } from '../../types/shifts';
import StoryBeatCard from './shared/StoryBeatCard';
import type { StoryBeatConfig } from './shared/StoryBeatCard';
import StepVideoClip from './shared/StepVideoClip';
import { useBarkContext } from '../../hooks/useBarkContext';

const MASTERY_LABELS: Record<MasteryState, { label: string; color: string }> = {
  new: { label: 'NEW', color: 'text-[#9CA3AF]' },
  learning: { label: 'LEARNING', color: 'text-sky-600' },
  practicing: { label: 'PRACTICING', color: 'text-amber-600' },
  mastered: { label: 'MASTERED', color: 'text-emerald-600' },
  struggling: { label: 'NEEDS REVIEW', color: 'text-rose-600' },
};

interface GrammarStepProps {
  phaseConfig?: Record<string, unknown>;
  onPhaseComplete?: (data?: Record<string, unknown>) => void;
}

export default function GrammarStep({ phaseConfig, onPhaseComplete }: GrammarStepProps = {}) {
  const { missions, updateStepStatus, submitMissionScore, updateGrammarMastery, nextStep, grammarMastery } = useShiftStore();
  const triggerBark = usePearlStore(s => s.triggerBark);
  const triggerAIBark = usePearlStore(s => s.triggerAIBark);
  const baseContext = useBarkContext();

  const mission = missions.find(m => m.missionType === 'grammar');
  // Use phaseConfig if provided (from PhaseRunner), otherwise use mission config
  const config = (phaseConfig || mission?.config || {}) as { requiredCount?: number; documents?: GrammarDocument[]; storyBeat?: StoryBeatConfig };
  const documents = config.documents || [];
  const requiredCount = config.requiredCount || documents.length;
  const storyBeat = config.storyBeat;

  const [currentDoc, setCurrentDoc] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);
  const [stepDone, setStepDone] = useState(false);

  const doc = documents[currentDoc];
  const progress = completedCount / requiredCount;

  const handleAnswer = () => {
    if (selectedOption === null || !doc) return;
    const correct = selectedOption === doc.correctIndex;
    setIsCorrect(correct);
    setShowFeedback(true);

    // Build grammar-specific context for AI barks
    const grammarTarget = doc.targets.join(', ').replace(/-/g, ' ');

    doc.targets.forEach(target => {
      const updated = updateGrammarMastery(target, correct);
      if (updated.state === 'struggling') {
        triggerAIBark('concern', {
          ...baseContext,
          grammarTarget: target.replace(/-/g, ' '),
          masteryState: updated.state,
        }, `P.E.A.R.L. has noted difficulty with ${target.replace(/-/g, ' ')}. Additional support may be assigned.`);
      }
    });

    if (correct) {
      const masteryState = grammarMastery[doc.targets[0]]?.state;
      triggerAIBark('success', { ...baseContext, grammarTarget, masteryState });
    } else {
      triggerAIBark('incorrect', { ...baseContext, grammarTarget });
    }
  };

  const handleNext = async () => {
    const newCompleted = completedCount + 1;
    setCompletedCount(newCompleted);
    setShowFeedback(false);
    setSelectedOption(null);
    setIsCorrect(false);

    if (newCompleted >= requiredCount || currentDoc >= documents.length - 1) {
      setStepDone(true);
      const score = newCompleted / requiredCount;
      if (onPhaseComplete) {
        // Phase-based runner: signal completion to PhaseRunner
        triggerBark('success', 'Grammar drills complete. Your compliance metrics have been updated.');
        setTimeout(() => onPhaseComplete({ score, completedCount: newCompleted, grammarMastery }), 2000);
      } else {
        // Legacy 7-step runner: use shiftStore
        if (mission) {
          updateStepStatus('grammar', 'complete', { completedCount: newCompleted, grammarMastery });
          await submitMissionScore(mission.id, score, { status: 'complete', completedCount: newCompleted, grammarMastery });
        }
        triggerBark('success', 'Grammar drills complete. Your compliance metrics have been updated.');
        setTimeout(() => nextStep(), 2000);
      }
    } else {
      setCurrentDoc(currentDoc + 1);
    }
  };

  if (!doc && !stepDone) {
    return (
      <div className="text-center py-8 font-ibm-mono text-white/40 text-sm tracking-wider">
        No grammar documents available for this shift.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <StoryBeatCard storyBeat={storyBeat} />

      <StepVideoClip config={(mission?.config || {}) as Record<string, unknown>} stepLabel="Compliance Desk" />

      {/* Progress bar */}
      <div className="bg-[#E8E4DC] h-2 rounded-full overflow-hidden">
        <div
          className="h-full bg-sky-500 transition-all duration-500"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {/* Grammar target mastery indicators */}
      {Object.keys(grammarMastery).length > 0 && (
        <div className="flex flex-wrap gap-1.5 justify-center">
          {Object.values(grammarMastery).map(m => {
            const info = MASTERY_LABELS[m.state];
            return (
              <span
                key={m.target}
                className={`px-2 py-0.5 text-[10px] font-ibm-mono tracking-wider border border-[#D4CFC6] rounded-full bg-[#FAFAF7] ${info.color}`}
                title={`${m.target}: ${m.correct}/${m.attempts} correct, streak ${m.streak}`}
              >
                {m.target.replace(/-/g, ' ')} — {info.label}
              </span>
            );
          })}
        </div>
      )}

      {stepDone ? (
        <div className="text-center font-ibm-mono text-xs text-emerald-600 tracking-wider animate-pulse py-8">
          COMPLETE
        </div>
      ) : doc ? (
        <div className="bg-white border border-[#D4CFC6] rounded-2xl p-6 shadow-sm">
          {/* Prompt */}
          <p className="font-ibm-mono text-xs text-sky-600 tracking-wider mb-3">
            {doc.prompt}
          </p>

          {/* Sentence with blank */}
          <p className="font-ibm-sans text-[17px] text-[#2C3340] mb-6 leading-relaxed">
            {doc.text}
          </p>

          {/* Options */}
          <div className="space-y-2 mb-4">
            {doc.options.map((option, idx) => {
              const isSelected = selectedOption === idx;
              const correctAfterSubmit = showFeedback && idx === doc.correctIndex;
              const wrongAfterSubmit = showFeedback && isSelected && idx !== doc.correctIndex;

              return (
                <button
                  key={idx}
                  onClick={() => !showFeedback && setSelectedOption(idx)}
                  disabled={showFeedback}
                  className={`w-full text-left px-4 py-2.5 rounded-lg text-sm transition-all border-2 ${
                    correctAfterSubmit
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-800'
                      : wrongAfterSubmit
                      ? 'bg-rose-50 border-rose-300 text-rose-700'
                      : isSelected
                      ? 'bg-sky-50 border-sky-400 text-sky-800'
                      : 'bg-[#FAFAF7] border-[#E8E4DC] text-[#4B5563] hover:border-sky-300'
                  }`}
                >
                  <span className="mr-2 text-[#9CA3AF]">{String.fromCharCode(65 + idx)}.</span>
                  {option}
                </button>
              );
            })}
          </div>

          {/* Feedback */}
          {showFeedback && (
            <div className={`mb-4 p-3 rounded-lg font-ibm-mono text-xs tracking-wider border ${
              isCorrect
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-rose-50 border-rose-200 text-rose-700'
            }`}>
              {isCorrect ? 'CORRECT — Well done, Citizen.' : `INCORRECT — The correct answer is: ${doc.options[doc.correctIndex]}`}
            </div>
          )}

          {/* Action buttons */}
          {!showFeedback ? (
            <button
              onClick={handleAnswer}
              disabled={selectedOption === null}
              className={`w-full py-3 rounded-full font-ibm-mono text-xs uppercase tracking-[0.25em] transition-all ${
                selectedOption !== null
                  ? 'bg-sky-600 text-white hover:bg-sky-700 active:scale-[0.98]'
                  : 'bg-[#E8E4DC] text-[#B8B3AA] cursor-not-allowed'
              }`}
            >
              Submit Answer
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="w-full py-3 rounded-full font-ibm-mono text-xs uppercase tracking-[0.25em] bg-sky-600 text-white hover:bg-sky-700 active:scale-[0.98] transition-all"
            >
              {completedCount + 1 >= requiredCount || currentDoc >= documents.length - 1 ? 'Complete Grammar' : 'Next Document'}
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}
