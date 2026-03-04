import { useState, useEffect, useRef } from 'react';

interface TaskCardProps {
  children: React.ReactNode;
  taskId: string;
  label: string;
  status: 'idle' | 'completing' | 'stamped';
  onStampComplete?: () => void;
}

export default function TaskCard({
  children,
  taskId,
  label,
  status,
  onStampComplete,
}: TaskCardProps) {
  const [internalStatus, setInternalStatus] = useState(status);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync external status into internal state
  useEffect(() => {
    setInternalStatus(status);
  }, [status]);

  // Handle stamp animation timing
  useEffect(() => {
    if (internalStatus === 'completing') {
      timerRef.current = setTimeout(() => {
        setInternalStatus('stamped');
        onStampComplete?.();
      }, 1200);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [internalStatus, onStampComplete]);

  // Reset internal state when taskId changes (new task)
  useEffect(() => {
    setInternalStatus('idle');
  }, [taskId]);

  return (
    <div
      className={`ios-glass-card border transition-all duration-800 ${
        internalStatus === 'completing'
          ? 'task-card-approved'
          : internalStatus === 'stamped'
            ? 'border-neon-mint/40'
            : 'border-white/10'
      } relative overflow-hidden`}
    >
      {/* Task label */}
      <div className="px-4 py-2 border-b border-white/5">
        <span className="font-ibm-mono text-[10px] text-white/40 tracking-[0.3em] uppercase">
          {label}
        </span>
      </div>

      {/* Task content */}
      <div className="p-4">
        {children}
      </div>

      {/* Stamp watermark overlay */}
      {internalStatus === 'completing' && (
        <div className="stamp-watermark">
          APPROVED
        </div>
      )}
    </div>
  );
}
