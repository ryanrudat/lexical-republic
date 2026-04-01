import { useShiftStore } from '../../stores/shiftStore';
import { LOCATIONS, STEP_ORDER } from '../../types/shifts';
import type { StepId } from '../../types/shifts';

interface LocationTabsProps {
  interactive?: boolean;
}

export default function LocationTabs({ interactive = true }: LocationTabsProps) {
  const { currentStepId, weekProgress, setCurrentStep } = useShiftStore();

  const currentStep = STEP_ORDER.find(s => s.id === currentStepId);
  const activeLocationId = currentStep?.location || 'intake';

  const handleLocationClick = (locationId: string) => {
    const stepsInLocation = STEP_ORDER.filter(s => s.location === locationId);
    const firstIncomplete = stepsInLocation.find(s => {
      const progress = weekProgress.find(p => p.stepId === s.id);
      return progress?.status !== 'complete';
    });
    const target = firstIncomplete || stepsInLocation[0];
    if (target) setCurrentStep(target.id as StepId);
  };

  return (
    <div className="border-b border-[#E8E4DC]">
      <div className="flex items-center justify-center gap-1 px-6 py-2 max-w-3xl mx-auto">
        {LOCATIONS.map(loc => {
          const isActive = activeLocationId === loc.id;
          const stepsHere = STEP_ORDER.filter(s => s.location === loc.id);
          const allComplete = stepsHere.every(s => {
            const progress = weekProgress.find(p => p.stepId === s.id);
            return progress?.status === 'complete';
          });

          return (
            <button
              key={loc.id}
              onClick={() => interactive && handleLocationClick(loc.id)}
              disabled={!interactive}
              className={`flex flex-col items-center px-3 py-1.5 rounded-full transition-all border ${
                isActive
                  ? 'border-sky-400 bg-sky-50'
                  : 'border-transparent hover:bg-[#FAFAF7]'
              }`}
            >
              <span className={`font-ibm-mono text-xs tracking-wider ${
                isActive ? 'text-sky-700 font-medium' :
                allComplete ? 'text-emerald-600' :
                'text-[#8B8578]'
              }`}>
                {loc.label}
              </span>
              {isActive && (
                <span className="font-ibm-mono text-[10px] text-[#9CA3AF] tracking-wider mt-0.5">
                  {loc.hint}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
