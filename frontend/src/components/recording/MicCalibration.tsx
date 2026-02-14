import { useEffect, useState } from 'react';

interface MicCalibrationProps {
  /** Trigger calibration */
  onCalibrate: () => Promise<number>;
  /** Whether calibration is in progress */
  isCalibrating: boolean;
  /** Calibrated baseline value */
  baseline: number;
  /** Whether calibration is complete */
  isComplete: boolean;
}

/**
 * 3-second ambient noise calibration overlay.
 * Samples mic baseline before recording begins.
 */
export default function MicCalibration({
  onCalibrate,
  isCalibrating,
  baseline,
  isComplete,
}: MicCalibrationProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isCalibrating) {
      setProgress(isComplete ? 100 : 0);
      return;
    }

    setProgress(0);
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      setProgress(Math.min(100, (elapsed / 3000) * 100));
    }, 100);

    return () => clearInterval(interval);
  }, [isCalibrating, isComplete]);

  if (isComplete) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-neon-mint/20 bg-neon-mint/5">
        <div className="w-2 h-2 rounded-full bg-neon-mint" />
        <span className="font-ibm-mono text-[10px] text-neon-mint tracking-wider">
          ENVIRONMENT CALIBRATED — BASELINE: {baseline.toFixed(1)}
        </span>
      </div>
    );
  }

  if (isCalibrating) {
    return (
      <div className="px-3 py-3 rounded-lg border border-neon-cyan/20 bg-neon-cyan/5">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-neon-cyan animate-pulse" />
          <span className="font-ibm-mono text-[10px] text-neon-cyan tracking-[0.2em] uppercase">
            Calibrating Environment...
          </span>
        </div>
        <div className="w-full h-1.5 bg-ios-bg/50 rounded-full overflow-hidden">
          <div
            className="h-full bg-neon-cyan/60 rounded-full transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="font-ibm-mono text-[10px] text-white/40 tracking-wider mt-1.5">
          Remain silent. Sampling ambient noise levels.
        </p>
      </div>
    );
  }

  return (
    <button
      onClick={onCalibrate}
      className="w-full px-3 py-2.5 rounded-lg border border-neon-cyan/20 bg-neon-cyan/5 hover:bg-neon-cyan/10 transition-all text-left"
    >
      <div className="flex items-center gap-2">
        <svg viewBox="0 0 24 24" className="w-4 h-4 text-neon-cyan" fill="currentColor">
          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5z" />
          <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
        </svg>
        <div>
          <span className="font-ibm-mono text-[10px] text-neon-cyan tracking-[0.2em] uppercase block">
            Initialize Microphone
          </span>
          <span className="font-ibm-mono text-[10px] text-white/40 tracking-wider block">
            Tap to begin environment calibration
          </span>
        </div>
      </div>
    </button>
  );
}
