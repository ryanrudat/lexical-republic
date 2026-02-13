import { useState } from 'react';
import { useShiftStore } from '../../stores/shiftStore';
import { usePearlStore } from '../../stores/pearlStore';
import MultipleChoiceCheck from './shared/MultipleChoiceCheck';
import type { ComprehensionCheck } from '../../types/shifts';
import StoryBeatCard from './shared/StoryBeatCard';
import type { StoryBeatConfig } from './shared/StoryBeatCard';

export default function ListeningStep() {
  const { missions, updateStepStatus, submitMissionScore, nextStep } = useShiftStore();
  const triggerBark = usePearlStore(s => s.triggerBark);

  const mission = missions.find(m => m.missionType === 'listening');
  const config = (mission?.config || {}) as {
    mediaUrl?: string;
    transcript?: string[];
    checks?: ComprehensionCheck[];
    highlightPrompt?: string;
    highlightAnswerIndex?: number;
    storyBeat?: StoryBeatConfig;
  };
  const transcript = config.transcript || [];
  const checks = config.checks || [];
  const mediaUrl = config.mediaUrl;
  const highlightPrompt = config.highlightPrompt || 'Select the transcript line that best supports your answers.';
  const highlightAnswerIndex = config.highlightAnswerIndex;
  const storyBeat = config.storyBeat;

  const [checksComplete, setChecksComplete] = useState(false);
  const [checkScore, setCheckScore] = useState(0);
  const [checkAnswers, setCheckAnswers] = useState<number[]>([]);
  const [selectedLine, setSelectedLine] = useState<number | null>(null);
  const [highlightSubmitted, setHighlightSubmitted] = useState(false);
  const [completed, setCompleted] = useState(false);

  const hasHighlight = transcript.length > 0;

  const handleCheckSubmit = (answers: number[], score: number) => {
    setCheckAnswers(answers);
    setCheckScore(score);

    if (hasHighlight) {
      setChecksComplete(true);
      triggerBark('hint', 'Now highlight the transcript line that proves it.');
    } else {
      finishStep(answers, score);
    }
  };

  const handleHighlightSubmit = () => {
    if (selectedLine === null) return;
    setHighlightSubmitted(true);
    const highlightCorrect = highlightAnswerIndex !== undefined && selectedLine === highlightAnswerIndex;

    if (highlightCorrect) {
      triggerBark('success', 'Correct evidence identified. Strong analytical skills.');
    } else if (highlightAnswerIndex !== undefined) {
      triggerBark('hint', 'Not the strongest evidence. Review the transcript next time.');
    }

    setTimeout(() => {
      finishStep(checkAnswers, checkScore, selectedLine);
    }, 1500);
  };

  const finishStep = async (answers: number[], score: number, highlight?: number) => {
    if (!mission || completed) return;
    setCompleted(true);
    const details = { status: 'complete', answers, score, highlightedLine: highlight };
    updateStepStatus('listening', 'complete', details);
    await submitMissionScore(mission.id, score, details);

    if (score >= 0.8) {
      triggerBark('success', 'Evidence analysis complete. Strong comprehension detected.');
    } else {
      triggerBark('hint', 'Review the evidence transcript more carefully next time.');
    }
    setTimeout(() => nextStep(), 2000);
  };

  return (
    <div className="space-y-6">
      <StoryBeatCard storyBeat={storyBeat} />

      {mediaUrl && (
        <div className="ios-glass-card p-4">
          <audio controls src={mediaUrl} className="w-full" />
        </div>
      )}

      {transcript.length > 0 && (
        <div className="ios-glass-card border-neon-cyan/20 p-4">
          <div className="flex items-center gap-1.5 mb-3">
            <div className="w-1 h-1 bg-neon-cyan/60 rounded-full" />
            <span className="font-ibm-mono text-[10px] text-neon-cyan/50 tracking-[0.2em] uppercase">
              Intercepted Transcript
              {checksComplete && !highlightSubmitted && ' — Select Evidence'}
            </span>
          </div>
          <div className="space-y-2">
            {transcript.map((line, i) => {
              const isHighlightPhase = checksComplete && !highlightSubmitted;
              const isSelected = selectedLine === i;
              const isCorrectHighlight = highlightSubmitted && highlightAnswerIndex !== undefined && i === highlightAnswerIndex;

              return (
                <p
                  key={i}
                  onClick={isHighlightPhase ? () => setSelectedLine(i) : undefined}
                  className={`font-ibm-sans text-base leading-relaxed pl-3 border-l transition-all ${
                    isCorrectHighlight
                      ? 'border-l-neon-mint bg-neon-mint/10 text-neon-mint'
                      : isSelected
                      ? 'border-l-neon-cyan bg-neon-cyan/10 text-neon-cyan'
                      : isHighlightPhase
                      ? 'border-white/10 text-white/80 cursor-pointer hover:border-l-neon-cyan/50 hover:bg-neon-cyan/5'
                      : 'border-white/10 text-white/80'
                  }`}
                >
                  {line}
                </p>
              );
            })}
          </div>
        </div>
      )}

      {/* Phase 1: Multiple choice checks */}
      {checks.length > 0 && !checksComplete && (
        <div>
          <MultipleChoiceCheck
            checks={checks}
            onSubmit={handleCheckSubmit}
          />
        </div>
      )}

      {/* Phase 2: Transcript highlight */}
      {checksComplete && !highlightSubmitted && !completed && (
        <div className="space-y-4">
          <div className="ios-glass-card border-neon-cyan/20 p-4">
            <p className="font-ibm-mono text-sm text-neon-cyan/80 tracking-wider">
              {highlightPrompt}
            </p>
          </div>
          <button
            onClick={handleHighlightSubmit}
            disabled={selectedLine === null}
            className={`w-full py-3 rounded-full font-ibm-mono text-xs uppercase tracking-[0.25em] transition-all ${
              selectedLine !== null
                ? 'ios-glass-pill-action text-neon-cyan hover:shadow-[0_0_16px_rgba(0,229,255,0.2)]'
                : 'ios-glass-pill text-white/25 cursor-not-allowed'
            }`}
          >
            Confirm Evidence
          </button>
        </div>
      )}

      {completed && (
        <div className="text-center font-ibm-mono text-xs text-neon-mint tracking-wider animate-pulse ios-text-glow-mint">
          COMPLETE
        </div>
      )}
    </div>
  );
}
