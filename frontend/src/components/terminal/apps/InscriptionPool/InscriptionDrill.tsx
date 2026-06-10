import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useInscriptionStore } from '../../../../stores/inscriptionStore';
import { useStudentStore } from '../../../../stores/studentStore';
import { useSessionStore } from '../../../../stores/sessionStore';
import DrillPromptCard from './DrillPromptCard';
import PoolStandings from './PoolStandings';
import PausedOverlay from './PausedOverlay';
import { useGhostTicker } from './useGhostTicker';
import { connectSocket } from '../../../../utils/socket';

// ─── InscriptionDrill ────────────────────────────────────────────
//
// Amber CRT / DOS typing-tutor register. Container is the
// .crt-phosphor-monitor (black + green scanlines). Layout reads top to
// bottom as a single column of monospace text — no cards, no panels.
// The student types into the input in the middle of the page; the
// citizens being raced sit at the bottom in a single horizontal row.

export default function InscriptionDrill() {
  const drill = useInscriptionStore((s) => s.drill);
  const screen = useInscriptionStore((s) => s.screen);
  const submitWord = useInscriptionStore((s) => s.submitWord);
  const completeDrill = useInscriptionStore((s) => s.completeDrill);
  const setInDrill = useSessionStore((s) => s.setInscriptionDrillActive);
  const lane = useStudentStore((s) => s.user?.lane ?? 2);

  const [now, setNow] = useState(() => Date.now());
  const [showAbortConfirm, setShowAbortConfirm] = useState(false);

  // Local per-character accuracy counters for the WPM/ACC display.
  // The new per-character prompt fires `onCharTyped(wasCorrect)` on
  // every keystroke; we tally them here so the footer stats update
  // live as the student types, not just on word completion.
  const [charsTyped, setCharsTyped] = useState(0);
  const [charsCorrect, setCharsCorrect] = useState(0);

  const handleCharTyped = useCallback((wasCorrect: boolean) => {
    setCharsTyped((n) => n + 1);
    if (wasCorrect) setCharsCorrect((n) => n + 1);
  }, []);

  useEffect(() => {
    setInDrill(true);
    return () => setInDrill(false);
  }, [setInDrill]);

  // Real-time clock tick — 250ms is plenty for a second-resolution timer.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!drill?.drillId) return;
    const sock = connectSocket();
    if (!sock) return;
    const drillId = drill.drillId;
    // Re-enter on every (re)connect — server rooms are per-socket, so a
    // mid-race Wi-Fi blip otherwise left this student out of both the drill
    // and lobby rooms: opponent desks froze and pause/resume events were
    // missed for the rest of the race. The enter handler also replays
    // paused/resumed state.
    const enter = () => sock.emit('inscription:enter-drill', { drillId });
    if (sock.connected) enter();
    sock.on('connect', enter);
    return () => {
      sock.off('connect', enter);
      sock.emit('inscription:leave-drill', { drillId });
    };
  }, [drill?.drillId]);

  const ghostTickerInput = useMemo(
    () => ({
      // Only ghost desks replay from baked timings. Live opponent desks get
      // their progress from socket events (liveDeskState); keep the ticker
      // away from them or it would overwrite live progress with zeros.
      desks: (drill?.desks ?? []).filter((d) => d.isGhost),
      wordCount: drill?.wordCount ?? 0,
      drillStartedAt_ms: drill?.startedAt_ms ?? null,
      totalPausedMs: drill?.totalPausedMs ?? 0,
      pausedAt_ms: drill?.pausedAt_ms ?? null,
    }),
    [drill?.desks, drill?.wordCount, drill?.startedAt_ms, drill?.totalPausedMs, drill?.pausedAt_ms],
  );
  const { ghostProgress, ghostTyping } = useGhostTicker(ghostTickerInput);

  const liveProgress = useMemo(() => {
    const map = new Map<number, { wordsCorrect: number; finishedAt_ms: number | null }>();
    if (drill) {
      for (const [k, v] of drill.liveDeskState) map.set(k, v);
      for (const [k, v] of ghostProgress) map.set(k, v);
    }
    return map;
  }, [drill, ghostProgress]);

  const typingByDesk = useMemo(() => {
    const map = new Map<number, boolean>();
    for (const [k, v] of ghostTyping) map.set(k, v);
    return map;
  }, [ghostTyping]);

  const elapsedMs = drill
    ? now - drill.startedAt_ms - drill.totalPausedMs - (drill.pausedAt_ms ? now - drill.pausedAt_ms : 0)
    : 0;
  const remainingSec = drill ? Math.max(0, Math.ceil((drill.durationSec * 1000 - elapsedMs) / 1000)) : 0;
  const completedAllWords = drill ? drill.currentWordIdx >= drill.words.length : false;

  const completedRef = useRef(false);
  useEffect(() => {
    if (!drill || completedRef.current) return;
    if (completedAllWords || remainingSec === 0) {
      completedRef.current = true;
      const abandoned = !completedAllWords && remainingSec === 0;
      const t = setTimeout(() => void completeDrill({ abandoned }), 600);
      return () => clearTimeout(t);
    }
  }, [drill, completedAllWords, remainingSec, completeDrill]);

  // Thin wrapper around the store action. The per-character tracker
  // already handles local accuracy; this just forwards the submission
  // and returns the result so the auto-advance flow stays clean.
  const wrappedSubmit = useCallback(
    async (text: string, errorsRecovered: number) => {
      return submitWord(text, errorsRecovered);
    },
    [submitWord],
  );

  if (!drill) return null;

  const currentIdx = drill.currentWordIdx;
  const word = drill.words[currentIdx];
  const wordsCompleted = drill.liveDeskState.get(1)?.wordsCorrect ?? 0;

  const mmss = `${Math.floor(remainingSec / 60).toString().padStart(2, '0')}:${(remainingSec % 60).toString().padStart(2, '0')}`;

  // Live pool: the race begins at startedAt_ms (a few seconds out). Until then,
  // show a synchronized countdown and block input. Solo/trial start immediately
  // (startedAt_ms ≈ now), so notStarted is false and no countdown shows.
  const notStarted = now < drill.startedAt_ms;
  const countdownSecs = Math.max(0, Math.ceil((drill.startedAt_ms - now) / 1000));

  return (
    <div className="crt-phosphor-monitor h-full min-h-full flex flex-col overflow-y-auto ios-scroll">
      <div className="max-w-2xl mx-auto px-6 py-5 pixel-mono flex-1 w-full">
        {/* Title bar */}
        <div className="flex items-baseline justify-between mb-1">
          <p className="phosphor-text-bright text-[12px] uppercase tracking-[0.4em] phosphor-glow">
            Productivity Demonstration
          </p>
          <p className="phosphor-text-bright text-base tabular-nums phosphor-glow">
            {mmss}
          </p>
        </div>
        <div className="flex items-baseline justify-between mb-4">
          <p className="phosphor-text-dim text-[11px] uppercase tracking-[0.3em]">
            Shift {drill.weekNumber} &nbsp;·&nbsp; Word {currentIdx + 1} / {drill.wordCount}
          </p>
          <button
            type="button"
            onClick={() => setShowAbortConfirm(true)}
            className="phosphor-text-dim hover:phosphor-text text-[11px] uppercase tracking-[0.3em]"
          >
            [ withdraw ]
          </button>
        </div>

        <div className="border-t border-dashed border-[#1F8540] mb-4" />

        {/* Racing track — sits at TOP now so the student sees who's
            ahead at a glance while they type. */}
        <PoolStandings
          desks={drill.desks}
          liveProgress={liveProgress}
          wordCount={drill.wordCount}
          typingByDesk={typingByDesk}
          selfDesk={1}
        />

        <div className="border-t border-dashed border-[#1F8540] mt-4 mb-6" />

        {/* Prompt — per-character display + auto-advance */}
        {word && (
          <DrillPromptCard
            word={word}
            wordIdx={currentIdx}
            lane={lane}
            onSubmit={wrappedSubmit}
            disabled={screen !== 'drill' || notStarted}
            drillStartedAt_ms={drill.startedAt_ms}
            wordsCompleted={wordsCompleted}
            charsTyped={charsTyped}
            charsCorrect={charsCorrect}
            onCharTyped={handleCharTyped}
          />
        )}

        <p className="phosphor-text-faint text-[10px] uppercase tracking-[0.3em] italic text-center mt-8">
          "the ministry observes your diligence."
        </p>
      </div>

      {screen === 'paused' && <PausedOverlay />}

      {notStarted && screen === 'drill' && (
        <div className="fixed inset-0 z-[80] flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm">
          <p className="phosphor-text-dim text-[12px] uppercase tracking-[0.4em] mb-4">
            pool assembled — stand by
          </p>
          <p className="phosphor-text-bright text-7xl tabular-nums phosphor-glow">{countdownSecs}</p>
          <p className="phosphor-text-dim text-[11px] uppercase tracking-[0.3em] mt-4">
            inscription begins…
          </p>
        </div>
      )}

      {showAbortConfirm && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 backdrop-blur-sm">
          <div className="max-w-sm w-full mx-4 crt-phosphor-monitor p-6 pixel-mono border border-[#33CC66]/60">
            <p className="phosphor-text-bright text-[12px] uppercase tracking-[0.3em] mb-3 phosphor-glow">
              &gt; withdraw inscription?
            </p>
            <p className="phosphor-text-dim text-[12px] leading-relaxed mb-6">
              Inscription will be recorded as incomplete.
              No Productivity Index awarded.
            </p>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setShowAbortConfirm(false)}
                className="phosphor-text hover:phosphor-text-bright text-[12px] uppercase tracking-[0.3em]"
              >
                [ continue ]
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAbortConfirm(false);
                  completedRef.current = true;
                  void completeDrill({ abandoned: true });
                }}
                className="phosphor-text-dim hover:phosphor-text text-[12px] uppercase tracking-[0.3em] ml-auto"
              >
                [ withdraw ]
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
