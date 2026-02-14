import { useRef, useState, useCallback, useEffect } from 'react';

interface UseVolumeMonitorOptions {
  /** Analyser node to read volume from */
  analyser: AnalyserNode | null;
  /** Threshold above baseline that triggers violation (default 40) */
  threshold?: number;
  /** How long volume must exceed threshold to trigger (ms, default 500) */
  sustainMs?: number;
  /** Whether monitoring is enabled */
  enabled?: boolean;
}

interface UseVolumeMonitorReturn {
  /** Current RMS volume (0-255 scale) */
  volume: number;
  /** Calibrated ambient baseline */
  baseline: number;
  /** Whether currently violating volume threshold */
  isViolating: boolean;
  /** Number of violations this session */
  violationCount: number;
  /** Volume zone: 'safe' | 'warning' | 'danger' */
  zone: 'safe' | 'warning' | 'danger';
  /** Start 3-second ambient calibration */
  calibrate: () => Promise<number>;
  /** Whether calibration is in progress */
  isCalibrating: boolean;
  /** Reset violation count */
  resetViolations: () => void;
}

export function useVolumeMonitor({
  analyser,
  threshold = 40,
  sustainMs = 500,
  enabled = true,
}: UseVolumeMonitorOptions): UseVolumeMonitorReturn {
  const [volume, setVolume] = useState(0);
  const [baseline, setBaseline] = useState(0);
  const [isViolating, setIsViolating] = useState(false);
  const [violationCount, setViolationCount] = useState(0);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [zone, setZone] = useState<'safe' | 'warning' | 'danger'>('safe');

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const violationStartRef = useRef<number | null>(null);

  const getRMS = useCallback(() => {
    if (!analyser) return 0;
    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteTimeDomainData(data);

    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const deviation = data[i] - 128;
      sum += deviation * deviation;
    }
    return Math.sqrt(sum / data.length);
  }, [analyser]);

  // 3-second ambient calibration
  const calibrate = useCallback(async (): Promise<number> => {
    if (!analyser) return 0;

    setIsCalibrating(true);
    const samples: number[] = [];

    return new Promise((resolve) => {
      const calibrationInterval = setInterval(() => {
        samples.push(getRMS());
      }, 100);

      setTimeout(() => {
        clearInterval(calibrationInterval);
        const avg =
          samples.length > 0
            ? samples.reduce((a, b) => a + b, 0) / samples.length
            : 0;
        setBaseline(avg);
        setIsCalibrating(false);
        resolve(avg);
      }, 3000);
    });
  }, [analyser, getRMS]);

  // Volume monitoring at 100ms intervals (setInterval, not rAF)
  useEffect(() => {
    if (!analyser || !enabled || isCalibrating) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      const rms = getRMS();
      setVolume(rms);

      const effectiveThreshold = baseline + threshold;
      const warningThreshold = baseline + threshold * 0.6;

      // Compute zone
      if (rms > effectiveThreshold) {
        setZone('danger');
      } else if (rms > warningThreshold) {
        setZone('warning');
      } else {
        setZone('safe');
      }

      // Sustained violation detection
      if (rms > effectiveThreshold) {
        if (!violationStartRef.current) {
          violationStartRef.current = Date.now();
        } else if (Date.now() - violationStartRef.current >= sustainMs) {
          if (!isViolating) {
            setIsViolating(true);
            setViolationCount((c) => c + 1);
          }
        }
      } else {
        violationStartRef.current = null;
        if (isViolating) {
          setIsViolating(false);
        }
      }
    }, 100);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [analyser, enabled, isCalibrating, baseline, threshold, sustainMs, getRMS, isViolating]);

  const resetViolations = useCallback(() => {
    setViolationCount(0);
    setIsViolating(false);
    violationStartRef.current = null;
  }, []);

  return {
    volume,
    baseline,
    isViolating,
    violationCount,
    zone,
    calibrate,
    isCalibrating,
    resetViolations,
  };
}
