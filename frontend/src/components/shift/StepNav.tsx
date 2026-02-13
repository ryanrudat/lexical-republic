import { useShiftStore } from '../../stores/shiftStore';
import { STEP_ORDER } from '../../types/shifts';
import type { StepId } from '../../types/shifts';

interface StepNavProps {
  interactive?: boolean;
}

export default function StepNav({ interactive = true }: StepNavProps) {
  const { currentStepId, weekProgress, setCurrentStep } = useShiftStore();
  const firstIncompleteIndex = STEP_ORDER.findIndex((step) => {
    const progress = weekProgress.find((p) => p.stepId === step.id);
    return progress?.status !== 'complete';
  });
  const maxNavigableIndex =
    firstIncompleteIndex === -1 ? STEP_ORDER.length - 1 : firstIncompleteIndex;

  return (
    <div className="bg-ios-bg/60 backdrop-blur-sm border-b border-white/10 px-6 py-3">
      <div className="flex items-center justify-center gap-1 max-w-2xl mx-auto">
        {STEP_ORDER.map((step, idx) => {
          const progress = weekProgress.find(p => p.stepId === step.id);
          const isActive = currentStepId === step.id;
          const isComplete = progress?.status === 'complete';
          const isLocked = idx > maxNavigableIndex;

          return (
            <div key={step.id} className="flex items-center">
              <button
                onClick={() => interactive && setCurrentStep(step.id as StepId)}
                disabled={!interactive || isLocked}
                className="flex flex-col items-center gap-1 group"
              >
                {/* Dot */}
                <div className={`w-3 h-3 rounded-full transition-all ${
                  isLocked
                    ? 'bg-white/15'
                    :
                  isComplete
                    ? 'bg-neon-mint shadow-[0_0_6px_rgba(105,240,174,0.3)]'
                    : isActive
                    ? 'bg-neon-cyan shadow-[0_0_8px_rgba(0,229,255,0.4)] scale-125'
                    : 'bg-white/15 group-hover:bg-white/25'
                }`} />
                {/* Label */}
                <span className={`font-ibm-mono text-[11px] tracking-wider transition-colors ${
                  isLocked
                    ? 'text-white/15'
                    :
                  isComplete
                    ? 'text-neon-mint/60'
                    : isActive
                    ? 'text-neon-cyan'
                    : 'text-white/30 group-hover:text-white/50'
                }`}>
                  {step.label}
                </span>
              </button>
              {/* Connector line */}
              {idx < STEP_ORDER.length - 1 && (
                <div className={`w-6 h-px mx-1 mt-[-10px] ${
                  isComplete ? 'bg-neon-mint/30' : 'bg-white/10'
                }`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
