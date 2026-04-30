import { useEffect, useRef, useState } from 'react';

/**
 * Smoothly interpolates a numeric value when it DECREASES.
 *
 * - Decrease: animates `displayValue` from old → new over `durationMs` (default 1500ms)
 *   using requestAnimationFrame + ease-out cubic.
 * - Increase / no change: snaps immediately (no animation).
 *
 * Used by the concern HUD chip so students see the cooldown happen after a
 * Remediation Module completion drops the score.
 */
export function useCountDownAnimation(
  value: number,
  durationMs: number = 1500
): { displayValue: number; isAnimating: boolean } {
  const [displayValue, setDisplayValue] = useState<number>(value);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);

  // Track the value we last "settled" on, so we can detect a true decrease.
  const settledValueRef = useRef<number>(value);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (value === settledValueRef.current) return;

    // Increase or first-time higher → snap immediately.
    if (value > settledValueRef.current) {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      settledValueRef.current = value;
      setDisplayValue(value);
      setIsAnimating(false);
      return;
    }

    // Decrease → animate from current settled value to new value.
    const startValue = settledValueRef.current;
    const endValue = value;
    const startTime = performance.now();

    setIsAnimating(true);

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / durationMs);
      // Ease-out cubic: starts fast, slows toward the end.
      const eased = 1 - Math.pow(1 - t, 3);
      const next = startValue + (endValue - startValue) * eased;

      setDisplayValue(next);

      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        settledValueRef.current = endValue;
        setDisplayValue(endValue);
        setIsAnimating(false);
        rafRef.current = null;
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [value, durationMs]);

  return { displayValue, isAnimating };
}
