import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useInscriptionStore } from '../../../../stores/inscriptionStore';
import { useStudentStore } from '../../../../stores/studentStore';
import { useSessionStore } from '../../../../stores/sessionStore';
import DrillPromptCard from './DrillPromptCard';
import PoolStandings from './PoolStandings';
import PausedOverlay from './PausedOverlay';
import { useGhostTicker } from './useGhostTicker';
import { connectSocket } from '../../../../utils/socket';

export default function InscriptionDrill() {
  const drill = useInscriptionStore((s) => s.drill);
  const screen = useInscriptionStore((s) => s.screen);
  const submitWord = useInscriptionStore((s) => s.submitWord);
  const completeDrill = useInscriptionStore((s) => s.completeDrill);
  const setInDrill = useSessionStore((s) => s.setInscriptionDrillActive);
  const lane = useStudentStore((s) => s.user?.lane ?? 2);

  const [now, setNow] = useState(() => Date.now());
  const [showAbortConfirm, setShowAbortConfirm] = useState(false);

  // Mark in-drill so concern rate buffer + remediation modal defer
  useEffect(() => {
    setInDrill(true);
    return () => setInDrill(false);
  }, [setInDrill]);

  // Real-time clock tick
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  // Socket subscription for live keystroke + word-complete from other desks
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

  // Merge live self progress with ghost progress
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

  // Detect drill completion (all words submitted OR timer expired)
  const elapsedMs = drill
    ? now - drill.startedAt_ms - drill.totalPausedMs - (drill.pausedAt_ms ? now - drill.pausedAt_ms : 0)
    : 0;
  const remainingSec = drill ? Math.max(0, Math.ceil((drill.durationSec * 1000 - elapsedMs) / 1000)) : 0;
  const completedAllWords = drill ? drill.currentWordIdx >= drill.words.length : false;

  // Auto-complete on time-up or all words inscribed (debounced)
  const completedRef = useRef(false);
  useEffect(() => {
    if (!drill || completedRef.current) return;
    if (completedAllWords || remainingSec === 0) {
      completedRef.current = true;
      // Mark abandoned when the timer ran out before all words were finished.
      // Pre-fix the expression read `abandoned: false && abandoned` which always
      // resolved to `false`, so the backend never knew a drill timed out.
      const abandoned = !completedAllWords && remainingSec === 0;
      // tiny delay so the final word feedback flashes
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

  if (!drill) return null;

  const currentIdx = drill.currentWordIdx;
  const word = drill.words[currentIdx];

  return (
    <div className="h-full overflow-y-auto px-6 py-5 ios-scroll crt-monitor-screen relative">
      <div className="max-w-3xl mx-auto space-y-4 relative z-[1]">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <p className="font-ibm-mono text-[10px] text-[#5BB88C] tracking-[0.3em] uppercase">
            Inscription Drill · Shift {drill.weekNumber}
          </p>
          <div className="flex items-center gap-3">
            <span className="font-ibm-mono text-[10px] text-[#82B0B5] tracking-wider tabular-nums">
              {Math.floor(remainingSec / 60).toString().padStart(2, '0')}:
              {(remainingSec % 60).toString().padStart(2, '0')}
            </span>
            <span className="font-ibm-mono text-[10px] text-[#82B0B5] tracking-wider">
              Words {currentIdx} / {drill.wordCount}
            </span>
            <button
              type="button"
              onClick={() => setShowAbortConfirm(true)}
              className="font-ibm-mono text-[10px] text-rose-400/70 hover:text-rose-300 tracking-wider"
            >
              Withdraw
            </button>
          </div>
        </div>

        {/* Prompt card */}
        {word && (
          <DrillPromptCard
            word={word}
            wordIdx={currentIdx}
            lane={lane}
            onSubmit={submitWord}
            onKeystrokeTick={handleKeystrokeTick}
            disabled={screen !== 'drill'}
          />
        )}

        {/* Live pool standings */}
        <PoolStandings
          desks={drill.desks}
          liveProgress={liveProgress}
          wordCount={drill.wordCount}
          typingByDesk={typingByDesk}
          selfDesk={1}
        />

        <p className="font-ibm-mono text-[9px] text-[#5BB88C]/60 tracking-wider italic text-center">
          "Inscribe accurately. The Ministry observes your diligence."
        </p>
      </div>

      {screen === 'paused' && <PausedOverlay />}

      {showAbortConfirm && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="max-w-sm w-full mx-4 rounded-lg border-2 border-rose-500/40 bg-[#04181B] p-5 shadow-2xl">
            <p className="font-ibm-mono text-[10px] text-rose-300 tracking-[0.3em] uppercase mb-2">
              Withdraw Inscription
            </p>
            <p className="font-ibm-mono text-[11px] text-[#82B0B5] leading-relaxed mb-4">
              Inscription will be recorded as incomplete. No Productivity Index awarded.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowAbortConfirm(false)}
                className="flex-1 px-4 py-2 rounded border border-[#5BB8B0]/40 font-ibm-mono text-[10px] text-[#82B0B5] hover:text-[#D4E8E5] tracking-wider active:scale-[0.98]"
              >
                Continue
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAbortConfirm(false);
                  completedRef.current = true;
                  void completeDrill({ abandoned: true });
                }}
                className="flex-1 px-4 py-2 rounded border border-rose-500/40 bg-rose-500/10 font-ibm-mono text-[10px] text-rose-300 hover:bg-rose-500/20 tracking-wider active:scale-[0.98]"
              >
                Withdraw
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
