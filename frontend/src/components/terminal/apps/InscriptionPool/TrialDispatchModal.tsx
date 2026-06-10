import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInscriptionStore } from '../../../../stores/inscriptionStore';
import { useViewStore } from '../../../../stores/viewStore';
import { useShiftQueueStore } from '../../../../stores/shiftQueueStore';
import { useSeasonStore } from '../../../../stores/seasonStore';
import { getHighestUnlockedWeek } from '../../../../utils/weekUnlock';

// ─── TrialDispatchModal ─────────────────────────────────────────
//
// Class-wide invite that pops when the teacher schedules a Sector
// Trial. Amber CRT register to match the Inscription Pool itself.

export default function TrialDispatchModal() {
  const pendingTrial = useInscriptionStore((s) => s.pendingTrial);
  const clearPendingTrial = useInscriptionStore((s) => s.clearPendingTrial);
  const startDrill = useInscriptionStore((s) => s.startDrill);
  const openApp = useViewStore((s) => s.openApp);
  const weekConfig = useShiftQueueStore((s) => s.weekConfig);
  const weeks = useSeasonStore((s) => s.weeks);
  const navigate = useNavigate();

  const [secondsLeft, setSecondsLeft] = useState(60);

  useEffect(() => {
    if (!pendingTrial) return;
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((pendingTrial.startsAt_ms - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0) clearPendingTrial();
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [pendingTrial, clearPendingTrial]);

  if (!pendingTrial) return null;

  const handleReport = () => {
    openApp('inscription-pool');
    navigate('/terminal', { replace: true });
    // A student on the terminal desktop has no weekConfig — fall back to the
    // class's highest unlocked week, NOT week 1, or their trial drill would
    // pull W1 words while classmates race the current shift's set.
    const wk = weekConfig?.weekNumber ?? getHighestUnlockedWeek(weeks);
    void startDrill({
      mode: 'trial',
      weekNumber: wk,
      durationSec: pendingTrial.durationSec,
      wordCount: pendingTrial.wordCount,
    });
    clearPendingTrial();
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/90 backdrop-blur-sm">
      <div className="crt-phosphor-monitor max-w-md w-full mx-4 px-8 py-7 pixel-mono border border-[#33CC66]/60">
        <p className="phosphor-text-bright text-[12px] uppercase tracking-[0.4em] phosphor-glow mb-3">
          ◇ sector trial scheduled ◇
        </p>
        <p className="phosphor-text text-base uppercase tracking-[0.2em] mb-3">
          report to the inscription pool
        </p>
        <p className="phosphor-text-dim text-[12px] uppercase tracking-[0.3em] leading-relaxed mb-6">
          citizens of your sector shall report.
          reasonable accommodations may apply.
        </p>

        <div className="grid grid-cols-3 gap-4 mb-6 border-t border-b border-dashed border-[#33CC66]/40 py-4 text-center">
          <div>
            <p className="phosphor-text-dim text-[10px] uppercase tracking-[0.3em] mb-1">In</p>
            <p className="phosphor-text-bright text-lg tabular-nums phosphor-glow">{secondsLeft}s</p>
          </div>
          <div>
            <p className="phosphor-text-dim text-[10px] uppercase tracking-[0.3em] mb-1">Words</p>
            <p className="phosphor-text-bright text-lg tabular-nums phosphor-glow">{pendingTrial.wordCount}</p>
          </div>
          <div>
            <p className="phosphor-text-dim text-[10px] uppercase tracking-[0.3em] mb-1">Duration</p>
            <p className="phosphor-text-bright text-lg tabular-nums phosphor-glow">{pendingTrial.durationSec}s</p>
          </div>
        </div>

        <div className="flex gap-6">
          <button
            type="button"
            onClick={clearPendingTrial}
            className="phosphor-text-dim hover:phosphor-text text-[12px] uppercase tracking-[0.3em]"
          >
            [ acknowledge ]
          </button>
          <button
            type="button"
            onClick={handleReport}
            className="phosphor-text-bright hover:phosphor-glow-strong text-[12px] uppercase tracking-[0.3em] ml-auto"
          >
            [ report to pool ➤ ]
          </button>
        </div>
      </div>
    </div>
  );
}
