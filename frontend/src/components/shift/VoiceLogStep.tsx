import { useState } from 'react';
import { useShiftStore } from '../../stores/shiftStore';
import { usePearlStore } from '../../stores/pearlStore';
import RecordingWidget from '../recording/RecordingWidget';
import StoryBeatCard from './shared/StoryBeatCard';
import type { StoryBeatConfig } from './shared/StoryBeatCard';

const RUBRIC_ITEMS = [
  { id: 'clarity', label: 'I spoke clearly and at an appropriate volume' },
  { id: 'pace', label: 'I maintained a steady pace (not too fast or slow)' },
  { id: 'phrases', label: 'I used the target phrases in my recording' },
];

export default function VoiceLogStep() {
  const { missions, updateStepStatus, submitMissionScore, nextStep } = useShiftStore();
  const triggerBark = usePearlStore(s => s.triggerBark);

  const mission = missions.find(m => m.missionType === 'voice_log');
  const config = (mission?.config || {}) as { prompt?: string; targetPhrases?: string[]; storyBeat?: StoryBeatConfig };
  const prompt = config.prompt || 'Record your voice log now.';
  const targetPhrases = config.targetPhrases || [];
  const storyBeat = config.storyBeat;

  const [submitted, setSubmitted] = useState(false);
  const [recordingUploaded, setRecordingUploaded] = useState(false);
  const [rubric, setRubric] = useState<Record<string, boolean>>({});

  const checkedCount = Object.values(rubric).filter(Boolean).length;
  const canSubmit = checkedCount >= 1 && recordingUploaded;

  const toggleRubric = (id: string) => {
    setRubric(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleComplete = async () => {
    if (submitted || !mission || !canSubmit) return;
    setSubmitted(true);
    updateStepStatus('voice_log', 'complete', { rubric });
    await submitMissionScore(mission.id, 1, { status: 'complete', rubric });
    triggerBark('success', 'Voice Log received. Your speech has been archived for review.');
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

      {targetPhrases.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center">
          {targetPhrases.map((phrase, i) => (
            <span
              key={i}
              className="ios-glass-pill px-3 py-1.5 font-ibm-mono text-xs text-neon-cyan tracking-wider border-neon-cyan/20"
            >
              {phrase}
            </span>
          ))}
        </div>
      )}

      <RecordingWidget
        missionId={mission?.id}
        onUploaded={() => setRecordingUploaded(true)}
      />

      <p className={`text-center font-ibm-mono text-[10px] tracking-wider ${
        recordingUploaded ? 'text-neon-mint/70' : 'text-white/30'
      }`}>
        {recordingUploaded ? 'Recording uploaded' : 'Record and upload to continue'}
      </p>

      {/* Self-assessment rubric */}
      {!submitted && (
        <div className="ios-glass-card p-4">
          <p className="font-ibm-mono text-[10px] text-white/40 tracking-wider mb-3">
            Check at least one:
          </p>
          <div className="space-y-2">
            {RUBRIC_ITEMS.map(item => (
              <label
                key={item.id}
                className="flex items-center gap-3 cursor-pointer group"
                onClick={() => toggleRubric(item.id)}
              >
                <div className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${
                  rubric[item.id]
                    ? 'bg-neon-cyan/20 border-neon-cyan/40'
                    : 'bg-white/5 border-white/15 group-hover:border-white/25'
                }`}>
                  {rubric[item.id] && (
                    <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 text-neon-cyan" fill="currentColor">
                      <path d="M10 3L4.5 8.5 2 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <span className="font-ibm-mono text-xs text-white/80">
                  {item.label}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {!submitted ? (
        <button
          onClick={handleComplete}
          disabled={!canSubmit}
          className={`w-full py-3 rounded-full font-ibm-mono text-xs uppercase tracking-[0.25em] transition-all ${
            canSubmit
              ? 'ios-glass-pill-action text-neon-cyan hover:shadow-[0_0_16px_rgba(0,229,255,0.2)]'
              : 'ios-glass-pill text-white/25 cursor-not-allowed'
          }`}
        >
          Archive Voice Log
        </button>
      ) : (
        <div className="text-center font-ibm-mono text-xs text-neon-mint tracking-wider animate-pulse ios-text-glow-mint">
          COMPLETE
        </div>
      )}
    </div>
  );
}
