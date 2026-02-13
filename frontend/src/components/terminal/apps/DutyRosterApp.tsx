import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSeasonStore } from '../../../stores/seasonStore';
import { useViewStore } from '../../../stores/viewStore';

export default function DutyRosterApp() {
  const { title, subtitle, weeks, loading, loadSeason } = useSeasonStore();
  const openApp = useViewStore((s) => s.openApp);
  const navigate = useNavigate();

  useEffect(() => {
    loadSeason();
  }, [loadSeason]);

  const acts = [
    { order: 1, name: 'Act I: Compliance', weeks: weeks.filter((w) => w.arcOrder === 1) },
    { order: 2, name: 'Act II: Discovery', weeks: weeks.filter((w) => w.arcOrder === 2) },
    { order: 3, name: 'Act III: Resistance', weeks: weeks.filter((w) => w.arcOrder === 3) },
  ];

  const getWeekStatus = (week: (typeof weeks)[0]) => {
    if (week.clockedOut) return 'clocked-out';
    const allWeeksSorted = [...weeks].sort((a, b) => a.weekNumber - b.weekNumber);
    const weekIdx = allWeeksSorted.findIndex((w) => w.id === week.id);
    if (weekIdx === 0) return 'unlocked';
    if (allWeeksSorted[weekIdx - 1]?.clockedOut) return 'unlocked';
    return 'locked';
  };

  const handleWeekClick = (weekNumber: number) => {
    navigate(`/shift/${weekNumber}`);
    openApp('clarity-queue');
  };

  return (
    <div className="px-6 pb-12">
      {/* Title */}
      <div className="text-center py-8">
        <p className="font-ibm-mono text-xs text-neon-cyan tracking-[0.5em] uppercase mb-2 ios-text-glow">
          Ministry Duty Roster
        </p>
        <h1 className="font-special-elite text-2xl text-white/90 tracking-wider ios-text-glow">
          {title || 'Approved Shift Rotation'}
        </h1>
        <p className="font-ibm-mono text-xs text-white/50 mt-1 tracking-wider">
          {subtitle || '18 Shifts \u2022 50 minutes each \u2022 Ministry-assigned'}
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="font-ibm-mono text-neon-cyan text-sm animate-pulse tracking-[0.3em]">
            LOADING SCHEDULE...
          </div>
        </div>
      ) : (
        <div className="max-w-5xl mx-auto w-full">
          {acts.map((act) => (
            <div key={act.order} className="mb-10">
              <div className="flex items-center gap-3 mb-4">
                <div
                  className={`h-px flex-1 ${act.order === 3 ? 'bg-resistance-gold/30' : 'bg-white/10'}`}
                />
                <h2
                  className={`font-special-elite text-sm tracking-[0.3em] uppercase ${
                    act.order === 3 ? 'text-resistance-gold' : 'text-neon-cyan/70'
                  }`}
                >
                  {act.name}
                </h2>
                <div
                  className={`h-px flex-1 ${act.order === 3 ? 'bg-resistance-gold/30' : 'bg-white/10'}`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {act.weeks.map((week) => {
                  const status = getWeekStatus(week);
                  const isLocked = status === 'locked';

                  return (
                    <button
                      key={week.id}
                      disabled={isLocked}
                      onClick={() => handleWeekClick(week.weekNumber)}
                      className={`text-left p-4 rounded-xl ios-glass-card transition-all ${
                        isLocked
                          ? 'opacity-40 cursor-not-allowed'
                          : status === 'clocked-out'
                            ? 'border-neon-mint/30 hover:border-neon-mint/50'
                            : 'border-neon-cyan/30 hover:border-neon-cyan/50 hover:shadow-lg'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-ibm-mono text-xs text-white/50 tracking-wider">
                          SHIFT {week.weekNumber}
                        </span>
                        <span
                          className={`font-ibm-mono text-[10px] px-2 py-0.5 rounded-full tracking-wider uppercase ${
                            isLocked
                              ? 'text-white/30 border border-white/10'
                              : status === 'clocked-out'
                                ? 'text-neon-mint border border-neon-mint/30'
                                : 'text-neon-cyan border border-neon-cyan/30'
                          }`}
                        >
                          {isLocked ? 'Locked' : status === 'clocked-out' ? 'Clocked-Out' : 'Unlocked'}
                        </span>
                      </div>
                      <h3
                        className={`font-special-elite text-sm mb-1 ${
                          isLocked ? 'text-white/25' : 'text-white/90'
                        }`}
                      >
                        {week.title}
                      </h3>
                      {week.description && !isLocked && (
                        <p className="font-ibm-mono text-[11px] text-white/40 line-clamp-2">
                          {week.description}
                        </p>
                      )}
                      {!isLocked && week.totalSteps > 0 && (
                        <div className="mt-2 flex items-center gap-1">
                          {Array.from({ length: week.totalSteps }).map((_, i) => (
                            <div
                              key={i}
                              className={`w-1.5 h-1.5 rounded-full ${
                                i < week.stepsCompleted ? 'bg-neon-mint' : 'bg-white/10'
                              }`}
                            />
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
