import { useState } from 'react';
import { useShiftStore } from '../../stores/shiftStore';
import { usePearlStore } from '../../stores/pearlStore';

export default function RecapStep() {
  const { missions, updateStepStatus, submitMissionScore, nextStep } = useShiftStore();
  const triggerBark = usePearlStore(s => s.triggerBark);

  const mission = missions.find(m => m.missionType === 'recap');
  const config = (mission?.config || {}) as {
    prompts?: string[];
    minAnswers?: number;
    storyBeat?: {
      speaker?: string;
      line?: string;
    };
  };
  const prompts = config.prompts || ['What do you remember from last time?'];
  const minAnswers = config.minAnswers || 1;
  const storyLead = config.storyBeat?.speaker && config.storyBeat?.line
    ? `${config.storyBeat.speaker}: ${config.storyBeat.line}`
    : '';

  const [answers, setAnswers] = useState<string[]>(new Array(prompts.length).fill(''));
  const [submitted, setSubmitted] = useState(false);

  const filledCount = answers.filter(a => a.trim().length > 0).length;
  const canSubmit = filledCount >= minAnswers;

  const handleSubmit = async () => {
    if (!canSubmit || submitted || !mission) return;
    setSubmitted(true);
    updateStepStatus('recap', 'complete', { answers });
    await submitMissionScore(mission.id, 1, { status: 'complete', answers });
    triggerBark('success', 'Recap logged. The Ministry appreciates your diligence.');
    setTimeout(() => nextStep(), 1500);
  };

  return (
    <div className="space-y-6">
      {storyLead && (
        <div className="ios-glass-card px-4 py-3 text-center">
          <p className="font-ibm-sans text-sm text-white/75 leading-relaxed italic">
            {storyLead}
          </p>
        </div>
      )}

      {prompts.map((prompt, idx) => (
        <div key={idx} className="ios-glass-card p-4">
          <label className="block font-ibm-mono text-sm text-neon-cyan mb-2">
            <span className="text-white/30 mr-2">{idx + 1}.</span>
            {prompt}
          </label>
          <textarea
            value={answers[idx]}
            onChange={e => {
              const newAnswers = [...answers];
              newAnswers[idx] = e.target.value;
              setAnswers(newAnswers);
            }}
            disabled={submitted}
            placeholder="Type your response here..."
            className="ios-glass-input w-full h-20 px-3 py-2 text-sm resize-none"
          />
        </div>
      ))}

      {!submitted ? (
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={`w-full py-3 rounded-full font-ibm-mono text-xs uppercase tracking-[0.25em] transition-all ${
            canSubmit
              ? 'ios-glass-pill-action text-neon-cyan hover:shadow-[0_0_16px_rgba(0,229,255,0.2)]'
              : 'ios-glass-pill text-white/25 cursor-not-allowed'
          }`}
        >
          Continue
        </button>
      ) : (
        <div className="text-center font-ibm-mono text-xs text-neon-mint tracking-wider animate-pulse ios-text-glow-mint">
          COMPLETE
        </div>
      )}
    </div>
  );
}
