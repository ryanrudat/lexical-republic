import { useState } from 'react';
import { useShiftStore } from '../../stores/shiftStore';
import { usePearlStore } from '../../stores/pearlStore';
import StoryBeatCard from './shared/StoryBeatCard';
import type { StoryBeatConfig } from './shared/StoryBeatCard';

export default function CaseFileStep() {
  const { missions, updateStepStatus, submitMissionScore, nextStep } = useShiftStore();
  const triggerBark = usePearlStore(s => s.triggerBark);

  const mission = missions.find(m => m.missionType === 'case_file');
  const config = (mission?.config || {}) as { prompt?: string; minWords?: number; storyBeat?: StoryBeatConfig };
  const prompt = config.prompt || 'Write your Case File summary.';
  const minWords = config.minWords || 40;
  const storyBeat = config.storyBeat;

  const [text, setText] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  const canSubmit = wordCount >= minWords;

  const handleSubmit = async () => {
    if (!canSubmit || submitted || !mission) return;
    setSubmitted(true);
    updateStepStatus('case_file', 'complete', { text, wordCount });
    await submitMissionScore(mission.id, 1, { status: 'complete', text, wordCount });
    triggerBark('success', 'Case File archived. Your written record serves the Republic.');
    setTimeout(() => nextStep(), 2000);
  };

  return (
    <div className="space-y-6">
      <StoryBeatCard storyBeat={storyBeat} />

      <div className="ios-glass-card border-neon-cyan/20 p-4">
        <p className="font-ibm-sans text-sm text-white/90 leading-relaxed">
          {prompt}
        </p>
      </div>

      {/* Writing area */}
      <div className="ios-glass-card p-4">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          disabled={submitted}
          placeholder="Begin writing your Case File summary here..."
          className="ios-glass-input w-full h-40 border-none bg-transparent text-sm leading-relaxed resize-none"
        />
        <div className="mt-2 pt-2 border-t border-white/10">
          <span className={`font-ibm-mono text-xs tracking-wider ${
            wordCount >= minWords ? 'text-neon-mint' : 'text-white/40'
          }`}>
            {wordCount} / {minWords} words {wordCount >= minWords ? '\u2713' : ''}
          </span>
        </div>
      </div>

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
          Archive Case File
        </button>
      ) : (
        <div className="text-center font-ibm-mono text-xs text-neon-mint tracking-wider animate-pulse ios-text-glow-mint">
          COMPLETE
        </div>
      )}
    </div>
  );
}
