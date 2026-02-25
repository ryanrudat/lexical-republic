import { useState, useEffect, useRef } from 'react';

interface QueueCounterProps {
  startCount?: number;
  incrementInterval?: number; // seconds
  /** Threshold counts for color changes [amber, red] */
  thresholds?: [number, number];
}

export default function QueueCounter({
  startCount = 14,
  incrementInterval = 30,
  thresholds = [20, 30],
}: QueueCounterProps) {
  const [count, setCount] = useState(startCount);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setCount(c => c + 1);
    }, incrementInterval * 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [incrementInterval]);

  const color = count >= thresholds[1]
    ? 'text-neon-pink border-neon-pink/40 bg-neon-pink/5'
    : count >= thresholds[0]
    ? 'text-terminal-amber border-terminal-amber/40 bg-terminal-amber/5'
    : 'text-neon-mint border-neon-mint/40 bg-neon-mint/5';

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border font-ibm-mono text-xs tracking-wider transition-colors ${color}`}>
      <span className="text-[10px] opacity-60">QUEUE</span>
      <span className="font-dseg7 text-sm">{count}</span>
    </div>
  );
}
