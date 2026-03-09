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
      className={`bg-white rounded-2xl border shadow-sm transition-all duration-800 relative overflow-hidden ${
        internalStatus === 'completing'
          ? 'border-emerald-300 bg-emerald-50/50 shadow-emerald-100'
          : internalStatus === 'stamped'
            ? 'border-emerald-200'
            : 'border-[#D4CFC6]'
      }`}
    >
      {/* Task label */}
      <div className="px-5 py-2.5 border-b border-[#EDE8DE]">
        <span className="font-ibm-mono text-[10px] text-[#8B8578] tracking-[0.25em] uppercase">
          {label}
        </span>
      </div>

      {/* Task content */}
      <div className="p-5">
        {children}
      </div>

      {/* Stamp watermark overlay */}
      {internalStatus === 'completing' && (
        <div className="stamp-watermark !text-emerald-300/20">
          APPROVED
        </div>
      )}
    </div>
  );
}
