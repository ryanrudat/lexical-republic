import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useViewStore } from '../../stores/viewStore';
import { useStudentStore } from '../../stores/studentStore';
import { useSeasonStore } from '../../stores/seasonStore';
import { useDictionaryStore } from '../../stores/dictionaryStore';
import type { TerminalApp } from '../../types/views';
import { GUIDED_STUDENT_MODE } from '../../config/runtimeFlags';

interface AppTile {
  id: TerminalApp;
  name: string;
  description: string;
  emoji: string;
  icon?: string;
  lockWeek?: number;
}

const APPS: AppTile[] = [
  {
    id: 'clarity-queue',
    name: 'Current Shift',
    description: 'Resume mission workflow',
    emoji: '',
    icon: '/images/current-shift-icon.png',
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
    description: 'Weekly vocabulary review feed',
    emoji: '',
    icon: '/images/harmony-icon.png',
  },
  {
    id: 'my-file',
    name: 'My File',
    description: 'Citizen records & stats',
    emoji: '',
    icon: '/images/my-file-icon.png',
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
  const toggleDictionary = useDictionaryStore((s) => s.toggle);

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
    <div className="flex-1 flex flex-col overflow-auto ios-scroll px-6 py-8 crt-monitor-screen">
      {/* Welcome header */}
      <div className="relative z-[1] text-center mb-10">
        <p className="font-ibm-mono text-[10px] text-[#2A4A4E] tracking-[0.5em] uppercase mb-3">
          Ministry Work Terminal
        </p>
        <h2 className="font-ibm-mono text-2xl text-[#1A3035] tracking-[0.15em] mb-2 uppercase">
          Welcome, Citizen {user?.designation || 'UNKNOWN'}
        </h2>
        <div
          className="mx-auto my-3"
          style={{
            width: '80px',
            height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(30,70,75,0.3), transparent)',
          }}
        />
        <p className="font-ibm-mono text-[11px] text-[#3A5A5E] tracking-wider">
          {GUIDED_STUDENT_MODE && user?.role === 'student'
            ? 'Open one of your approved applications.'
            : 'Select an application to begin.'}
        </p>
      </div>

      {/* App grid */}
      <div className="relative z-[1] grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 max-w-4xl mx-auto w-full">
        {/* Office tile — return to office view */}
        <button
          onClick={() => { exitTerminal(); navigate('/', { replace: true }); }}
          className="rounded-xl transition-all duration-200 group hover:scale-[1.02] active:scale-[0.97] hover:shadow-[0_0_20px_rgba(201,148,74,0.12)]"
        >
          <img
            src="/images/office-icon.png"
            alt="Office"
            className="w-[150%] h-[150%] -mt-[25%] -ml-[25%] object-contain aspect-square"
          />
        </button>

        {/* Dictionary tile — opens sidebar overlay */}
        <button
          onClick={toggleDictionary}
          className="rounded-xl transition-all duration-200 group hover:scale-[1.02] active:scale-[0.97] hover:shadow-[0_0_20px_rgba(201,148,74,0.12)]"
        >
          <img
            src="/images/lexicon-icon.png"
            alt="Lexicon"
            className="w-[150%] h-[150%] -mt-[25%] -ml-[25%] object-contain aspect-square"
          />
        </button>

        {visibleApps.map((app, idx) => {
          const isLocked = app.lockWeek !== undefined && highestUnlockedWeek < app.lockWeek;

          // Full-image tile — the image IS the app button
          if (app.icon && !isLocked) {
            return (
              <button
                key={app.id}
                onClick={() => openApp(app.id)}
                className="rounded-xl transition-all duration-200 group hover:scale-[1.02] active:scale-[0.97] hover:shadow-[0_0_20px_rgba(201,148,74,0.12)]"
              >
                <img
                  src={app.icon}
                  alt={app.name}
                  className="w-[150%] h-[150%] -mt-[25%] -ml-[25%] object-contain aspect-square"
                />
              </button>
            );
          }

          return (
            <button
              key={app.id}
              onClick={() => !isLocked && openApp(app.id)}
              disabled={isLocked}
              className={`text-left p-5 retro-panel transition-all duration-200 group ${
                isLocked
                  ? 'opacity-30 cursor-not-allowed'
                  : 'hover:scale-[1.02] active:scale-[0.97]'
              }`}
            >
              {/* Status indicator + system label */}
              <div className="flex items-center gap-2 mb-3">
                <div
                  className={`w-2 h-2 rounded-full transition-opacity ${
                    isLocked
                      ? 'bg-white/15 opacity-50'
                      : 'bg-[#C9944A] opacity-60 group-hover:opacity-100'
                  }`}
                  style={isLocked ? {} : { boxShadow: '0 0 4px rgba(201,148,74,0.4)' }}
                />
                <span className="font-ibm-mono text-[8px] text-[#6B5D45] tracking-[0.3em] uppercase">
                  APP-{String(idx + 1).padStart(2, '0')}
                </span>
              </div>
              {/* Emoji icon */}
              <div className="text-2xl mb-2 group-hover:scale-110 group-active:scale-95 transition-transform">
                {isLocked ? '\uD83D\uDD12' : app.emoji}
              </div>
              <h3 className={`font-ibm-mono text-sm tracking-wider mb-1 ${
                isLocked ? 'text-white/15' : 'text-[#D4C5A9] group-hover:text-[#E8DCC8]'
              }`}>
                {app.name}
              </h3>
              <p className="font-ibm-mono text-[10px] text-[#6B5D45] tracking-wider">
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
