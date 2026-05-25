import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInscriptionStore } from '../../../../stores/inscriptionStore';
import { useViewStore } from '../../../../stores/viewStore';
import { useShiftQueueStore } from '../../../../stores/shiftQueueStore';

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
    const wk = weekConfig?.weekNumber ?? 1;
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
      <div className="crt-amber-monitor max-w-md w-full mx-4 px-8 py-7 pixel-mono border border-[#FFB000]/60">
        <p className="amber-text-bright text-[12px] uppercase tracking-[0.4em] amber-glow mb-3">
          ◇ sector trial scheduled ◇
        </p>
        <p className="amber-text text-base uppercase tracking-[0.2em] mb-3">
          report to the inscription pool
        </p>
        <p className="amber-text-dim text-[12px] uppercase tracking-[0.3em] leading-relaxed mb-6">
          citizens of your sector shall report.
          reasonable accommodations may apply.
        </p>

        <div className="grid grid-cols-3 gap-4 mb-6 border-t border-b border-dashed border-[#FFB000]/40 py-4 text-center">
          <div>
            <p className="amber-text-dim text-[10px] uppercase tracking-[0.3em] mb-1">In</p>
            <p className="amber-text-bright text-lg tabular-nums amber-glow">{secondsLeft}s</p>
          </div>
          <div>
            <p className="amber-text-dim text-[10px] uppercase tracking-[0.3em] mb-1">Words</p>
            <p className="amber-text-bright text-lg tabular-nums amber-glow">{pendingTrial.wordCount}</p>
          </div>
          <div>
            <p className="amber-text-dim text-[10px] uppercase tracking-[0.3em] mb-1">Duration</p>
            <p className="amber-text-bright text-lg tabular-nums amber-glow">{pendingTrial.durationSec}s</p>
          </div>
        </div>

        <div className="flex gap-6">
          <button
            type="button"
            onClick={clearPendingTrial}
            className="amber-text-dim hover:amber-text text-[12px] uppercase tracking-[0.3em]"
          >
            [ acknowledge ]
          </button>
          <button
            type="button"
            onClick={handleReport}
            className="amber-text-bright hover:amber-glow-strong text-[12px] uppercase tracking-[0.3em] ml-auto"
          >
            [ report to pool ➤ ]
          </button>
        </div>
      </div>
    </div>
  );
}
