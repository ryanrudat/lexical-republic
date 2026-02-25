import { useCallback, useEffect, useState } from 'react';
import { useSessionConfigStore } from '../../stores/sessionConfigStore';
import { useDictionaryStore } from '../../stores/dictionaryStore';
import PhaseNav from './PhaseNav';
import PhaseClipPlayer from './PhaseClipPlayer';
import PhaseRenderer from './PhaseRenderer';

export default function PhaseRunner() {
  const {
    session,
    phaseProgress,
    currentPhaseIndex,
    clipState,
    setClipState,
    completeCurrentPhase,
    nextPhase,
  } = useSessionConfigStore();

  const closeDictionary = useDictionaryStore((s) => s.close);
  const [shiftComplete, setShiftComplete] = useState(false);

  const phase = session?.phases[currentPhaseIndex];
  const isLastPhase = session
    ? currentPhaseIndex >= session.phases.length - 1
    : false;

  // Auto-advance clip states when no clip exists
  useEffect(() => {
    if (!phase) return;
    if (clipState === 'before' && !phase.clipBefore) {
      setClipState('content');
    } else if (clipState === 'after' && !phase.clipAfter) {
      if (isLastPhase) {
        setShiftComplete(true);
      } else {
        nextPhase();
      }
    }
  }, [clipState, phase, isLastPhase, setClipState, nextPhase]);

  // Close dictionary when entering clip states
  useEffect(() => {
    if (clipState === 'before' || clipState === 'after') {
      if (phase?.clipBefore || phase?.clipAfter) {
        closeDictionary();
      }
    }
  }, [clipState, phase, closeDictionary]);

  // Handle clip before completion
  const handleClipBeforeComplete = useCallback(() => {
    setClipState('content');
  }, [setClipState]);

  // Handle phase content completion
  const handlePhaseComplete = useCallback(
    async (data?: Record<string, unknown>) => {
      await completeCurrentPhase(
        data?.score as number | undefined,
        data
      );
      // clipState is now 'after' — useEffect will check for clipAfter
    },
    [completeCurrentPhase]
  );

  // Handle clip after completion
  const handleClipAfterComplete = useCallback(() => {
    if (isLastPhase) {
      setShiftComplete(true);
      return;
    }
    nextPhase();
  }, [isLastPhase, nextPhase]);

  if (!session || !phase) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="font-ibm-mono text-neon-cyan text-xs animate-pulse tracking-[0.2em]">
          LOADING SESSION...
        </div>
      </div>
    );
  }

  // Shift complete screen
  if (shiftComplete) {
    return (
      <div className="flex flex-col min-h-full">
        <PhaseNav
          phases={session.phases}
          progress={phaseProgress}
          currentIndex={currentPhaseIndex}
          totalMinutes={session.totalMinutes}
        />
        <div className="flex-1 flex flex-col items-center justify-center py-16 px-8">
          <div className="text-center space-y-6 max-w-md">
            <div className="inline-block border-2 border-neon-mint/50 rounded-lg px-8 py-3 rotate-[-1deg]">
              <span className="font-special-elite text-2xl text-neon-mint tracking-[0.3em] ios-text-glow-mint">
                SHIFT COMPLETE
              </span>
            </div>
            <p className="font-ibm-mono text-xs text-white/50 tracking-wider">
              All phases have been processed. Your records have been filed.
            </p>
            <p className="font-ibm-mono text-[10px] text-neon-cyan/40 tracking-wider">
              Return to the terminal to continue your duties.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Determine what to render based on clip state
  const renderContent = () => {
    if (clipState === 'before' && phase.clipBefore) {
      return (
        <PhaseClipPlayer
          clip={phase.clipBefore}
          onComplete={handleClipBeforeComplete}
        />
      );
    }

    if (clipState === 'after' && phase.clipAfter) {
      return (
        <PhaseClipPlayer
          clip={phase.clipAfter}
          onComplete={handleClipAfterComplete}
        />
      );
    }

    if (clipState === 'content') {
      return (
        <PhaseRenderer
          phase={phase}
          onComplete={handlePhaseComplete}
        />
      );
    }

    // Transitioning — show brief loading
    return null;
  };

  return (
    <div className="flex flex-col min-h-full">
      {/* Phase navigation bar */}
      <PhaseNav
        phases={session.phases}
        progress={phaseProgress}
        currentIndex={currentPhaseIndex}
        totalMinutes={session.totalMinutes}
      />

      {/* Phase location label */}
      <div className="border-b border-white/10 px-6 py-1.5 text-center">
        <p className="font-ibm-mono text-xs text-neon-cyan/70 tracking-wider">
          {phase.label}
        </p>
      </div>

      {/* Main content area */}
      <div className="flex-1 px-6 py-6 max-w-3xl mx-auto w-full">
        {renderContent()}
      </div>
    </div>
  );
}
