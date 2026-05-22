import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInscriptionStore } from '../../../../stores/inscriptionStore';
import { useViewStore } from '../../../../stores/viewStore';
import { useShiftQueueStore } from '../../../../stores/shiftQueueStore';

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
      if (remaining === 0) {
        // Auto-dismiss; teacher's trial window passed
        clearPendingTrial();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [pendingTrial, clearPendingTrial]);

  if (!pendingTrial) return null;

  const handleReport = () => {
    openApp('inscription-pool');
    navigate('/terminal', { replace: true });
    // Auto-start a trial drill at the inferred week
    const wk = weekConfig?.weekNumber ?? 1;
    void startDrill({
      mode: 'trial',
      weekNumber: wk,
      durationSec: pendingTrial.durationSec,
      wordCount: pendingTrial.wordCount,
    });
    clearPendingTrial();
  };

  const handleDismiss = () => {
    clearPendingTrial();
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="max-w-md w-full mx-4 rounded-lg border-2 border-cyan-400/50 bg-[#04181B] p-6 shadow-2xl">
        <p className="font-ibm-mono text-[10px] text-cyan-300 tracking-[0.4em] uppercase mb-3 animate-pulse">
          ◇ Sector Trial Scheduled ◇
        </p>
        <h2 className="font-ibm-mono text-base text-[#D4E8E5] tracking-[0.2em] uppercase mb-2">
          Report to the Inscription Pool
        </h2>
        <p className="font-ibm-mono text-[11px] text-[#82B0B5] leading-relaxed mb-4">
          Citizens of your sector shall report to the Inscription Pool. Reasonable
          accommodations may apply.
        </p>
        <div className="rounded border border-cyan-400/30 bg-cyan-400/5 p-3 mb-4 grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="font-ibm-mono text-[9px] text-cyan-300/70 tracking-wider uppercase">
              In
            </p>
            <p className="font-ibm-mono text-base text-cyan-200 tabular-nums tracking-wider">
              {secondsLeft}s
            </p>
          </div>
          <div>
            <p className="font-ibm-mono text-[9px] text-cyan-300/70 tracking-wider uppercase">
              Words
            </p>
            <p className="font-ibm-mono text-base text-cyan-200 tabular-nums tracking-wider">
              {pendingTrial.wordCount}
            </p>
          </div>
          <div>
            <p className="font-ibm-mono text-[9px] text-cyan-300/70 tracking-wider uppercase">
              Duration
            </p>
            <p className="font-ibm-mono text-base text-cyan-200 tabular-nums tracking-wider">
              {pendingTrial.durationSec}s
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleDismiss}
            className="flex-1 px-4 py-2.5 rounded border border-[#5BB8B0]/40 font-ibm-mono text-[11px] text-[#82B0B5] hover:text-[#D4E8E5] tracking-wider active:scale-[0.98]"
          >
            Acknowledge
          </button>
          <button
            type="button"
            onClick={handleReport}
            className="flex-1 px-4 py-2.5 rounded border-2 border-cyan-400/60 bg-cyan-400/10 font-ibm-mono text-[11px] text-cyan-200 hover:bg-cyan-400/20 tracking-wider active:scale-[0.98]"
          >
            Report to Pool ➤
          </button>
        </div>
      </div>
    </div>
  );
}
