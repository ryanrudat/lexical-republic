import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useViewStore } from '../../stores/viewStore';
import { useStudentStore } from '../../stores/studentStore';
import { useSeasonStore } from '../../stores/seasonStore';
import { useDictionaryStore } from '../../stores/dictionaryStore';
import { useHarmonyStore } from '../../stores/harmonyStore';
import type { TerminalApp } from '../../types/views';
import { GUIDED_STUDENT_MODE } from '../../config/runtimeFlags';
import { getHighestUnlockedWeek } from '../../utils/weekUnlock';

// localStorage key for the [ ].edited first-visit glitch animation —
// one-shot per pair, plays the stuttery materialize once and then
// the tile renders cleanly on all subsequent loads.
const EDITED_REVEALED_KEY = (pairId: string) => `lr_w4_app_revealed_${pairId}`;

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
  {
    id: 'inscription-pool',
    name: 'Word Pool',
    description: 'Productivity demonstration',
    emoji: '',
    // -v2 suffix cache-busts the stable /images path: the old square PNG
    // was 1-day cached, so clients kept rendering it (240x240, opaque box)
    // against the new code. Renaming forces a fresh fetch on next load.
    icon: '/images/inscription-pool-icon-v2.png',
  },
  {
    // Records Wing — Party archive terminal. Appears at W4 alongside the
    // [ ].edited app — the Party-facing surface where the OPTIONAL snooping
    // happens (off-limits files behind PEARL's dice-roll). Standard retro
    // panel tile (it's a Party app), unlike the dark [ ].edited tile.
    id: 'records-room',
    name: 'Records Wing',
    description: 'Archive access terminal',
    emoji: '\u{1F5C4}',
    lockWeek: 4,
  },
  // [ ].edited has NO desktop tile — it's reached via the corner FunnelDrawer
  // `[ ]` pill (and the planned office-view door), which renders the same
  // FreyChannel. The old large desktop card was redundant; removed 2026-05-26.
];
const GUIDED_STUDENT_APPS: TerminalApp[] = ['clarity-queue', 'harmony', 'my-file', 'inscription-pool', 'records-room'];

// Apps that stay HIDDEN before Shift 4 (no "Unlocks in Shift 4" tease) — the
// resistance/spy surfaces appear together via the post-login glitch at W4.
const W4_HIDDEN_UNTIL_UNLOCK = new Set<TerminalApp>(['records-room']);

export default function TerminalDesktop() {
  const openApp = useViewStore((s) => s.openApp);
  const exitTerminal = useViewStore((s) => s.exitTerminal);
  const navigate = useNavigate();
  const user = useStudentStore((s) => s.user);
  const weeks = useSeasonStore((s) => s.weeks);
  const loadSeason = useSeasonStore((s) => s.loadSeason);
  const toggleDictionary = useDictionaryStore((s) => s.toggle);
  const hasNewHarmonyContent = useHarmonyStore((s) => s.hasNewContent);
  const checkNewContent = useHarmonyStore((s) => s.checkNewContent);

  useEffect(() => {
    if (weeks.length === 0) {
      void loadSeason();
    }
  }, [weeks.length, loadSeason]);

  // Check for new Harmony content on desktop mount
  useEffect(() => {
    void checkNewContent();
  }, [checkNewContent]);

  const highestUnlockedWeek = getHighestUnlockedWeek(weeks);
  const guidedFiltered = GUIDED_STUDENT_MODE && user?.role === 'student'
    ? APPS.filter((app) => GUIDED_STUDENT_APPS.includes(app.id))
    : APPS;
  // [ ].edited stays HIDDEN before W4 — no "Unlocks in Shift 4" tease.
  // The Unedited's surface is supposed to appear via the post-login
  // glitch on first W4 entry, not preview itself for three shifts.
  const visibleApps = guidedFiltered.filter((app) =>
    W4_HIDDEN_UNTIL_UNLOCK.has(app.id) ? highestUnlockedWeek >= 4 : true
  );

  // First-visit glitch gate for the [ ].edited tile. Plays once per
  // pair (localStorage), then renders cleanly forever. If localStorage
  // is unavailable or the user isn't a Pair, skip the animation entirely
  // (don't loop the glitch on every visit).
  const [playEditedGlitch, setPlayEditedGlitch] = useState(false);
  useEffect(() => {
    if (highestUnlockedWeek < 4) return;
    if (!user?.id) return;
    if (typeof window === 'undefined') return;
    try {
      const key = EDITED_REVEALED_KEY(user.id);
      if (localStorage.getItem(key)) return;
      setPlayEditedGlitch(true);
      localStorage.setItem(key, '1');
    } catch {
      // localStorage blocked (private mode, etc.) — skip animation silently.
    }
  }, [highestUnlockedWeek, user?.id]);

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
      <div className="relative z-[1] flex flex-wrap justify-center gap-6 max-w-4xl mx-auto w-full">
        {/* Office tile — return to office view */}
        <button
          onClick={() => { exitTerminal(); navigate('/', { replace: true }); }}
          className="w-[240px] shrink-0 rounded-xl transition-all duration-200 group hover:scale-105 active:scale-95"
        >
          <img
            src="/images/office-icon.png"
            alt="Office"
            className="w-full object-contain"
          />
        </button>

        {/* Dictionary tile — opens sidebar overlay */}
        <button
          onClick={toggleDictionary}
          className="w-[240px] shrink-0 rounded-xl transition-all duration-200 group hover:scale-105 active:scale-95"
        >
          <img
            src="/images/lexicon-icon.png"
            alt="Lexicon"
            className="w-full object-contain"
          />
        </button>

        {visibleApps.map((app, idx) => {
          const isLocked = app.lockWeek !== undefined && highestUnlockedWeek < app.lockWeek;

          // [ ].edited — dead-internet aesthetic tile. Dashed border,
          // dark slate, italic name, "unsigned" status. Deliberately
          // does not look like the Party's other apps. First-visit glitch
          // animation plays on the very first W4 desktop mount.
          if (app.id === 'edited' && !isLocked) {
            return (
              <button
                key={app.id}
                onClick={() => openApp(app.id)}
                className={`w-[240px] shrink-0 text-left p-5 bg-slate-900 border border-dashed border-slate-700 hover:border-rose-500 rounded-xl transition-colors duration-200 group active:scale-[0.97]${
                  playEditedGlitch ? ' edited-tile-materialize' : ''
                }`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-rose-500/60 group-hover:bg-rose-500 transition-colors" />
                  <span className="font-ibm-mono text-[8px] text-slate-500 tracking-[0.3em] uppercase">
                    unsigned
                  </span>
                </div>
                <h3 className="font-ibm-mono text-sm text-slate-200 italic mb-1 lowercase tracking-wider">
                  {app.name}
                </h3>
                <p className="font-ibm-mono text-[10px] text-slate-500 tracking-wider lowercase">
                  {app.description}
                </p>
              </button>
            );
          }

          // Full-image tile — the image IS the app button
          if (app.icon && !isLocked) {
            return (
              <button
                key={app.id}
                onClick={() => openApp(app.id)}
                className="relative w-[240px] shrink-0 rounded-xl transition-all duration-200 group hover:scale-105 active:scale-95"
              >
                <img
                  src={app.icon}
                  alt={app.name}
                  className="w-full object-contain"
                />
                {/* Notification badge for Harmony */}
                {app.id === 'harmony' && hasNewHarmonyContent && (
                  <span className="absolute top-2 right-2 w-4 h-4 bg-rose-500 rounded-full border-2 border-[#8EBCC1] animate-pulse" />
                )}
                {/* Word Pool's PNG has no baked-in label (the other icons
                    do), so overlay one at the same vertical position the
                    baked labels occupy (~74.5% of the 3:2 frame). */}
                {app.id === 'inscription-pool' && (
                  <p
                    className="absolute inset-x-0 text-center font-ibm-mono text-[12px] text-[#6B5D45] tracking-wider"
                    style={{ top: '74.5%', transform: 'translateY(-50%)' }}
                  >
                    {app.name}
                  </p>
                )}
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
