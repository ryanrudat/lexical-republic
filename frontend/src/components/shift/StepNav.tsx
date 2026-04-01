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
    <div className="bg-[#EDEAE4] border-y border-[#D4CFC6] px-6 py-3">
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
                    ? 'bg-[#C8C3BA]'
                    :
                  isComplete
                    ? 'bg-emerald-500 shadow-[0_0_6px_rgba(52,211,153,0.4)]'
                    : isActive
                    ? 'bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.4)] scale-125'
                    : 'bg-[#B8B3AA] group-hover:bg-[#9E998F]'
                }`} />
                {/* Label */}
                <span className={`font-ibm-mono text-[11px] tracking-wider transition-colors ${
                  isLocked
                    ? 'text-[#B8B3AA]'
                    :
                  isComplete
                    ? 'text-emerald-700'
                    : isActive
                    ? 'text-sky-700 font-semibold'
                    : 'text-[#6B7280] group-hover:text-[#4B5563]'
                }`}>
                  {step.label}
                </span>
              </button>
              {/* Connector line */}
              {idx < STEP_ORDER.length - 1 && (
                <div className={`w-6 h-px mx-1 mt-[-10px] ${
                  isComplete ? 'bg-emerald-400' : 'bg-[#C8C3BA]'
                }`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
