import { useState } from 'react';
import { useShiftStore } from '../../stores/shiftStore';
import { usePearlStore } from '../../stores/pearlStore';
import { STEP_ORDER } from '../../types/shifts';
import StoryBeatCard from './shared/StoryBeatCard';
import type { StoryBeatConfig } from './shared/StoryBeatCard';
import StepVideoClip from './shared/StepVideoClip';

export default function ClockOutStep() {
  const { missions, weekProgress, currentWeek, updateStepStatus, submitMissionScore } = useShiftStore();
  const triggerAnnouncement = usePearlStore(s => s.triggerAnnouncement);

  const mission = missions.find(m => m.missionType === 'clock_out');
  const config = (mission?.config || {}) as { cliffhanger?: string; storyBeat?: StoryBeatConfig };
  const cliffhanger = config.cliffhanger || 'To be continued...';
  const storyBeat = config.storyBeat;

  const [clockedOut, setClockedOut] = useState(false);
  const [showCliffhanger, setShowCliffhanger] = useState(false);

  const precedingSteps = STEP_ORDER.filter(s => s.id !== 'clock_out');
  const allPreviousComplete = precedingSteps.every(step => {
    const progress = weekProgress.find(p => p.stepId === step.id);
    return progress?.status === 'complete';
  });

  const handleClockOut = async () => {
    if (!allPreviousComplete || clockedOut || !mission) return;
    setClockedOut(true);
    updateStepStatus('clock_out', 'complete');
    await submitMissionScore(mission.id, 1, { status: 'complete' });

    setTimeout(() => {
      setShowCliffhanger(true);
      triggerAnnouncement(
        'story_beat',
        `End of Shift ${currentWeek?.weekNumber}`,
        cliffhanger,
        'Return to Office'
      );
    }, 1000);
  };

  return (
    <div className="space-y-6">
      <StoryBeatCard storyBeat={storyBeat} />

      <StepVideoClip config={(mission?.config || {}) as Record<string, unknown>} stepLabel="Clock-Out" />

      <div className="ios-glass-card p-4">
        <div className="space-y-2">
          {precedingSteps.map(step => {
            const progress = weekProgress.find(p => p.stepId === step.id);
            const isComplete = progress?.status === 'complete';
            return (
              <div key={step.id} className="flex items-center gap-3">
                <div className={`w-4 h-4 rounded flex items-center justify-center border ${
                  isComplete ? 'bg-neon-mint/20 border-neon-mint/40' : 'bg-white/5 border-white/15'
                }`}>
                  {isComplete && (
                    <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 text-neon-mint" fill="currentColor">
                      <path d="M10 3L4.5 8.5 2 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <span className={`font-ibm-mono text-sm ${
                  isComplete ? 'text-white/70' : 'text-white/30'
                }`}>
                  {step.label}
                </span>
                <span className={`font-ibm-mono text-[10px] ml-auto ${
                  isComplete ? 'text-neon-mint/50' : 'text-white/20'
                }`}>
                  {isComplete ? 'COMPLETE' : 'PENDING'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Clock out button or warning */}
      {!clockedOut && (
        allPreviousComplete ? (
          <button
            onClick={handleClockOut}
            className="w-full py-4 rounded-full font-ibm-mono text-sm uppercase tracking-[0.3em] ios-glass-pill-action text-neon-cyan hover:shadow-[0_0_20px_rgba(0,229,255,0.25)] transition-all"
          >
            Clock Out
          </button>
        ) : (
          <div className="text-center p-3 rounded-lg ios-glass-pill-danger">
            <p className="font-ibm-mono text-xs text-neon-pink/70 tracking-wider">
              Complete all steps above to clock out
            </p>
          </div>
        )
      )}

      {/* Cliffhanger reveal */}
      {showCliffhanger && (
        <div className="animate-fade-in">
          <div className="ios-glass-card-strong border-neon-cyan/30 p-6 text-center">
            <div className="font-ibm-mono text-[10px] text-neon-cyan/60 tracking-[0.4em] uppercase mb-3">
              END OF SHIFT {currentWeek?.weekNumber}
            </div>
            <p className="font-special-elite text-base text-neon-cyan leading-relaxed italic ios-text-glow">
              &ldquo;{cliffhanger}&rdquo;
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
