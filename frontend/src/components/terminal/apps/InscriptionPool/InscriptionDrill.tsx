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

  // Local stats for live WPM / accuracy display. We increment on every
  // submission attempt here (rather than in the store) because they're
  // display-only and don't affect server-side scoring.
  const [attemptsTotal, setAttemptsTotal] = useState(0);
  const [attemptsCorrect, setAttemptsCorrect] = useState(0);

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
    sock.emit('inscription:enter-drill', { drillId: drill.drillId });
    return () => {
      sock.emit('inscription:leave-drill', { drillId: drill.drillId });
    };
  }, [drill?.drillId]);

  const ghostTickerInput = useMemo(
    () => ({
      desks: drill?.desks ?? [],
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

  const handleKeystrokeTick = useCallback(
    (typing: boolean) => {
      const sock = connectSocket();
      if (!sock || !drill) return;
      sock.emit('inscription:keystroke-tick', { drillId: drill.drillId, typing });
    },
    [drill],
  );

  // Wraps submitWord to track local attempt + correct counts for the
  // live WPM / accuracy display in DrillPromptCard.
  const wrappedSubmit = useCallback(
    async (text: string, errorsRecovered: number) => {
      setAttemptsTotal((n) => n + 1);
      const res = await submitWord(text, errorsRecovered);
      if (res.correct) setAttemptsCorrect((n) => n + 1);
      return res;
    },
    [submitWord],
  );

  if (!drill) return null;

  const currentIdx = drill.currentWordIdx;
  const word = drill.words[currentIdx];
  const wordsCompleted = drill.liveDeskState.get(1)?.wordsCorrect ?? 0;

  const mmss = `${Math.floor(remainingSec / 60).toString().padStart(2, '0')}:${(remainingSec % 60).toString().padStart(2, '0')}`;

  return (
    <div className="crt-phosphor-monitor h-full overflow-y-auto ios-scroll">
      <div className="max-w-xl mx-auto px-6 py-5 pixel-mono">
        {/* Title bar */}
        <div className="flex items-baseline justify-between mb-2">
          <p className="phosphor-text-bright text-[12px] uppercase tracking-[0.4em] phosphor-glow">
            Productivity Demonstration
          </p>
          <p className="phosphor-text-bright text-base tabular-nums phosphor-glow">
            {mmss}
          </p>
        </div>
        <div className="flex items-baseline justify-between mb-8">
          <p className="phosphor-text-dim text-[12px] uppercase tracking-[0.3em]">
            Shift {drill.weekNumber} &nbsp;·&nbsp; Word {currentIdx + 1} / {drill.wordCount}
          </p>
          <button
            type="button"
            onClick={() => setShowAbortConfirm(true)}
            className="phosphor-text-dim hover:phosphor-text text-[12px] uppercase tracking-[0.3em]"
          >
            [ withdraw ]
          </button>
        </div>

        {/* Horizontal rule */}
        <div className="border-t border-dashed border-[#33CC66]/40 mb-8" />

        {/* Prompt card */}
        {word && (
          <DrillPromptCard
            word={word}
            wordIdx={currentIdx}
            lane={lane}
            onSubmit={wrappedSubmit}
            onKeystrokeTick={handleKeystrokeTick}
            disabled={screen !== 'drill'}
            drillStartedAt_ms={drill.startedAt_ms}
            wordsCompleted={wordsCompleted}
            totalAttempts={attemptsTotal}
            totalCorrect={attemptsCorrect}
          />
        )}

        {/* Horizontal rule */}
        <div className="border-t border-dashed border-[#33CC66]/40 mt-8 mb-4" />

        {/* Pool standings — bottom row */}
        <PoolStandings
          desks={drill.desks}
          liveProgress={liveProgress}
          wordCount={drill.wordCount}
          typingByDesk={typingByDesk}
          selfDesk={1}
        />

        <p className="phosphor-text-faint text-[11px] uppercase tracking-[0.3em] italic text-center mt-10">
          "the ministry observes your diligence."
        </p>
      </div>

      {screen === 'paused' && <PausedOverlay />}

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
