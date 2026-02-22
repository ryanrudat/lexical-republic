import { useState } from 'react';
import { useShiftStore } from '../../stores/shiftStore';
import { usePearlStore } from '../../stores/pearlStore';
import type { GrammarDocument, MasteryState } from '../../types/shifts';
import StoryBeatCard from './shared/StoryBeatCard';
import type { StoryBeatConfig } from './shared/StoryBeatCard';
import { useBarkContext } from '../../hooks/useBarkContext';

const MASTERY_LABELS: Record<MasteryState, { label: string; color: string }> = {
  new: { label: 'NEW', color: 'text-white/40' },
  learning: { label: 'LEARNING', color: 'text-neon-cyan' },
  practicing: { label: 'PRACTICING', color: 'text-neon-mint/70' },
  mastered: { label: 'MASTERED', color: 'text-neon-mint' },
  struggling: { label: 'NEEDS REVIEW', color: 'text-neon-pink' },
};

export default function GrammarStep() {
  const { missions, updateStepStatus, submitMissionScore, updateGrammarMastery, nextStep, grammarMastery } = useShiftStore();
  const triggerBark = usePearlStore(s => s.triggerBark);
  const triggerAIBark = usePearlStore(s => s.triggerAIBark);
  const baseContext = useBarkContext();

  const mission = missions.find(m => m.missionType === 'grammar');
  const config = (mission?.config || {}) as { requiredCount?: number; documents?: GrammarDocument[]; storyBeat?: StoryBeatConfig };
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
      if (mission) {
        const score = newCompleted / requiredCount;
        updateStepStatus('grammar', 'complete', { completedCount: newCompleted, grammarMastery });
        await submitMissionScore(mission.id, score, { status: 'complete', completedCount: newCompleted, grammarMastery });
      }
      triggerBark('success', 'Grammar drills complete. Your compliance metrics have been updated.');
      setTimeout(() => nextStep(), 2000);
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

      {/* Progress bar */}
      <div className="bg-white/10 h-2 rounded-full overflow-hidden">
        <div
          className="h-full bg-neon-mint/70 transition-all duration-500"
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
                className={`ios-glass-pill px-2 py-0.5 text-[10px] font-ibm-mono tracking-wider ${info.color}`}
                title={`${m.target}: ${m.correct}/${m.attempts} correct, streak ${m.streak}`}
              >
                {m.target.replace(/-/g, ' ')} — {info.label}
              </span>
            );
          })}
        </div>
      )}

      {stepDone ? (
        <div className="text-center font-ibm-mono text-xs text-neon-mint tracking-wider animate-pulse py-8 ios-text-glow-mint">
          COMPLETE
        </div>
      ) : doc ? (
        <div className="ios-glass-card p-6">
          {/* Prompt */}
          <p className="font-ibm-mono text-xs text-neon-cyan/70 tracking-wider mb-3">
            {doc.prompt}
          </p>

          {/* Sentence with blank */}
          <p className="font-ibm-sans text-[17px] text-white/90 mb-6 leading-relaxed">
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
                  className={`w-full text-left px-4 py-2.5 rounded-lg font-ibm-mono text-sm transition-all border ${
                    correctAfterSubmit
                      ? 'bg-neon-mint/10 border-neon-mint/40 text-neon-mint'
                      : wrongAfterSubmit
                      ? 'bg-neon-pink/10 border-neon-pink/40 text-neon-pink'
                      : isSelected
                      ? 'bg-neon-cyan/10 border-neon-cyan/40 text-neon-cyan'
                      : 'bg-white/5 border-white/10 text-white/75 hover:border-white/20'
                  }`}
                >
                  <span className="mr-2 text-white/30">{String.fromCharCode(65 + idx)}.</span>
                  {option}
                </button>
              );
            })}
          </div>

          {/* Feedback */}
          {showFeedback && (
            <div className={`mb-4 p-3 rounded-lg font-ibm-mono text-xs tracking-wider border ${
              isCorrect
                ? 'bg-neon-mint/10 border-neon-mint/20 text-neon-mint'
                : 'bg-neon-pink/10 border-neon-pink/20 text-neon-pink'
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
                  ? 'ios-glass-pill-action text-neon-cyan hover:shadow-[0_0_16px_rgba(0,229,255,0.2)]'
                  : 'ios-glass-pill text-white/25 cursor-not-allowed'
              }`}
            >
              Submit Answer
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="w-full py-3 rounded-full font-ibm-mono text-xs uppercase tracking-[0.25em] ios-glass-pill-action text-neon-cyan hover:shadow-[0_0_16px_rgba(0,229,255,0.2)] transition-all"
            >
              {completedCount + 1 >= requiredCount || currentDoc >= documents.length - 1 ? 'Complete Grammar' : 'Next Document'}
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}
