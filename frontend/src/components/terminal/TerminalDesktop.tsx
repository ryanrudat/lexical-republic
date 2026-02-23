import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useViewStore } from '../../stores/viewStore';
import { useStudentStore } from '../../stores/studentStore';
import { useSeasonStore } from '../../stores/seasonStore';
import type { TerminalApp } from '../../types/views';
import { GUIDED_STUDENT_MODE } from '../../config/runtimeFlags';

interface AppTile {
  id: TerminalApp;
  name: string;
  description: string;
  emoji: string;
  lockWeek?: number;
}

const APPS: AppTile[] = [
  {
    id: 'clarity-queue',
    name: 'Current Shift',
    description: 'Resume mission workflow',
    emoji: '\u{1F4CB}',
  },
  {
    id: 'duty-roster',
    name: 'Duty Roster',
    description: 'Shift schedule & progress',
    emoji: '\u{1F4C5}',
  },
  {
    id: 'harmony',
    name: 'Harmony',
    description: 'Citizen social feed',
    emoji: '\u{1F4AC}',
    lockWeek: 3,
  },
  {
    id: 'my-file',
    name: 'My File',
    description: 'Citizen records & stats',
    emoji: '\u{1F4C1}',
  },
];
const GUIDED_STUDENT_APPS: TerminalApp[] = ['clarity-queue', 'harmony', 'my-file'];

function getHighestUnlockedWeek(weeks: Array<{ weekNumber: number; clockedOut: boolean }>): number {
  if (weeks.length === 0) return 1;
  const sortedWeeks = [...weeks].sort((a, b) => a.weekNumber - b.weekNumber);
  let highestUnlocked = sortedWeeks[0].weekNumber;

  for (let i = 1; i < sortedWeeks.length; i++) {
    if (sortedWeeks[i - 1].clockedOut) {
      highestUnlocked = sortedWeeks[i].weekNumber;
    } else {
      break;
    }
  }

  return highestUnlocked;
}

export default function TerminalDesktop() {
  const openApp = useViewStore((s) => s.openApp);
  const exitTerminal = useViewStore((s) => s.exitTerminal);
  const navigate = useNavigate();
  const user = useStudentStore((s) => s.user);
  const weeks = useSeasonStore((s) => s.weeks);
  const loadSeason = useSeasonStore((s) => s.loadSeason);

  useEffect(() => {
    if (weeks.length === 0) {
      void loadSeason();
    }
  }, [weeks.length, loadSeason]);

  const highestUnlockedWeek = getHighestUnlockedWeek(weeks);
  const visibleApps = GUIDED_STUDENT_MODE && user?.role === 'student'
    ? APPS.filter((app) => GUIDED_STUDENT_APPS.includes(app.id))
    : APPS;

  return (
    <div className="flex-1 flex flex-col overflow-auto ios-scroll px-6 py-8">
      {/* Welcome header */}
      <div className="text-center mb-8">
        <p className="font-ibm-mono text-xs text-white/30 tracking-[0.5em] uppercase mb-2">
          Ministry Work Terminal
        </p>
        <h2 className="font-special-elite text-xl text-white/90 tracking-wider ios-text-glow mb-1">
          Welcome, Citizen {user?.designation || 'UNKNOWN'}
        </h2>
        <p className="font-ibm-mono text-xs text-white/40 tracking-wider">
          {GUIDED_STUDENT_MODE && user?.role === 'student'
            ? 'Open one of your approved applications.'
            : 'Select an application to begin.'}
        </p>
      </div>

      {/* App grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 max-w-4xl mx-auto w-full">
        {/* Office tile — return to office view */}
        <button
          onClick={() => { exitTerminal(); navigate('/', { replace: true }); }}
          className="text-left p-4 ios-glass-card transition-all group hover:scale-[1.03] hover:border-neon-cyan/30 hover:shadow-[0_0_20px_rgba(0,229,255,0.1)]"
        >
          <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">
            {'\uD83C\uDFE2'}
          </div>
          <h3 className="font-ibm-mono text-sm tracking-wider mb-1 text-white/90">
            Office
          </h3>
          <p className="font-ibm-mono text-[10px] text-white/40 tracking-wider">
            Return to your desk
          </p>
        </button>

        {visibleApps.map((app) => {
          const isLocked = app.lockWeek !== undefined && highestUnlockedWeek < app.lockWeek;
          return (
            <button
              key={app.id}
              onClick={() => !isLocked && openApp(app.id)}
              disabled={isLocked}
              className={`text-left p-4 ios-glass-card transition-all group ${
                isLocked
                  ? 'opacity-40 cursor-not-allowed'
                  : 'hover:scale-[1.03] hover:border-neon-cyan/30 hover:shadow-[0_0_20px_rgba(0,229,255,0.1)]'
              }`}
            >
              {/* Emoji icon */}
              <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">
                {isLocked ? '\uD83D\uDD12' : app.emoji}
              </div>
              <h3 className={`font-ibm-mono text-sm tracking-wider mb-1 ${
                isLocked ? 'text-white/25' : 'text-white/90'
              }`}>
                {app.name}
              </h3>
              <p className="font-ibm-mono text-[10px] text-white/40 tracking-wider">
                {isLocked
                  ? `Unlocks in Shift ${app.lockWeek}`
                  : app.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
