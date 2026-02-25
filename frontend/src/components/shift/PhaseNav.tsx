import type { PhaseConfig, PhaseProgress } from '../../types/sessions';

interface PhaseNavProps {
  phases: PhaseConfig[];
  progress: PhaseProgress[];
  currentIndex: number;
  totalMinutes: number;
}

export default function PhaseNav({ phases, progress, currentIndex, totalMinutes }: PhaseNavProps) {
  return (
    <div className="px-4 py-2 border-b border-white/10">
      <div className="flex items-center gap-1">
        {phases.map((phase, i) => {
          const prog = progress.find((p) => p.phaseId === phase.id);
          const isCompleted = prog?.completed ?? false;
          const isCurrent = i === currentIndex;
          const isLocked = i > currentIndex && !isCompleted;

          // Visual weight based on minutes
          const weight = totalMinutes > 0 ? phase.minutes / totalMinutes : 1 / phases.length;

          return (
            <div
              key={phase.id}
              className="flex flex-col items-center gap-0.5"
              style={{ flex: weight }}
            >
              {/* Progress bar segment */}
              <div className="w-full h-1.5 rounded-full overflow-hidden relative">
                <div
                  className={`absolute inset-0 rounded-full transition-colors ${
                    isCompleted
                      ? 'bg-neon-mint/60'
                      : isCurrent
                        ? 'bg-neon-cyan/40 animate-pulse'
                        : 'bg-white/10'
                  }`}
                />
              </div>

              {/* Label */}
              <span
                className={`font-ibm-mono text-[8px] tracking-wider uppercase truncate w-full text-center ${
                  isCompleted
                    ? 'text-neon-mint/60'
                    : isCurrent
                      ? 'text-neon-cyan/80'
                      : isLocked
                        ? 'text-white/15'
                        : 'text-white/30'
                }`}
              >
                {phase.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
