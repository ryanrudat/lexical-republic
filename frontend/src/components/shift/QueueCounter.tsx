import { useEffect, useState, useRef } from 'react';
import { usePearlStore } from '../../stores/pearlStore';

interface QueueCounterProps {
  /** Grammar errors add to the queue */
  errorDelta?: number;
  /** Successful submit subtracts from queue */
  submitDelta?: number;
  /** Whether the counter is visible */
  enabled?: boolean;
}

const PEARL_MILESTONES = [25, 50, 75, 100];
const MILESTONE_BARKS = [
  'Queue volume is increasing. Your efficiency matters.',
  'Cases are accumulating. The Department depends on your speed.',
  'Critical backlog developing. Focus, Citizen.',
  'Queue overflow imminent. Prioritize accuracy and speed.',
];

/**
 * Atmospheric queue counter that ticks up over time.
 * DSEG7 LED display, color shifts by threshold.
 * Purely atmospheric — does NOT gate progression.
 */
export default function QueueCounter({
  errorDelta = 0,
  submitDelta = 0,
  enabled = true,
}: QueueCounterProps) {
  const triggerBark = usePearlStore((s) => s.triggerBark);
  const [count, setCount] = useState(() => Math.floor(Math.random() * 12) + 12);
  const [isAnimating, setIsAnimating] = useState(false);
  const lastMilestoneRef = useRef(0);

  // Tick +1 every 30 seconds
  useEffect(() => {
    if (!enabled) return;
    const interval = setInterval(() => {
      setCount((c) => c + 1);
    }, 30000);
    return () => clearInterval(interval);
  }, [enabled]);

  // Handle external deltas (error adds, submit subtracts)
  useEffect(() => {
    if (errorDelta > 0) {
      setCount((c) => c + errorDelta);
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 300);
    }
  }, [errorDelta]);

  useEffect(() => {
    if (submitDelta > 0) {
      setCount((c) => Math.max(0, c - submitDelta));
    }
  }, [submitDelta]);

  // PEARL barks at milestones
  useEffect(() => {
    for (let i = 0; i < PEARL_MILESTONES.length; i++) {
      const milestone = PEARL_MILESTONES[i];
      if (count >= milestone && lastMilestoneRef.current < milestone) {
        triggerBark('notice', MILESTONE_BARKS[i]);
        lastMilestoneRef.current = milestone;
      }
    }
  }, [count, triggerBark]);

  if (!enabled) return null;

  // Color by threshold
  const color =
    count >= 75
      ? 'text-neon-pink'
      : count >= 50
        ? 'text-terminal-amber'
        : count >= 25
          ? 'text-neon-cyan'
          : 'text-neon-cyan/60';

  return (
    <div className={`inline-flex items-center gap-1.5 ios-glass-pill px-2 py-1 ${isAnimating ? 'animate-queue-tick' : ''}`}>
      <span className="font-ibm-mono text-[8px] text-white/40 tracking-wider uppercase">
        QUEUE
      </span>
      <span className={`font-dseg7 text-sm ${color} tracking-wider tabular-nums`}>
        {String(Math.min(count, 999)).padStart(3, '0')}
      </span>
    </div>
  );
}
