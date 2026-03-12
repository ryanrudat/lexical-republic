import { useEffect, useState } from 'react';

const GATE_MESSAGES = [
  'PROCESSING STATION TEMPORARILY RESTRICTED. Please remain at your workstation, Citizen.',
  'Your productivity has been noted. Next assignment pending supervisor clearance.',
  'The Party appreciates your patience. Idle time is still productive time.',
  'HOLD POSITION: Your efficiency is being catalogued for review.',
  'Your compliance record is excellent. Please await further instructions.',
  'All associates must remain at their stations until clearance is granted.',
];

export default function TaskGateOverlay() {
  const [messageIdx, setMessageIdx] = useState(() =>
    Math.floor(Math.random() * GATE_MESSAGES.length)
  );

  // Rotate messages every 8 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIdx((prev) => (prev + 1) % GATE_MESSAGES.length);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6">
      {/* Status badge */}
      <div className="flex items-center gap-2 mb-6">
        <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
        <span className="font-ibm-mono text-[10px] tracking-[0.3em] uppercase text-amber-600">
          Awaiting Clearance
        </span>
      </div>

      {/* Lock icon */}
      <div className="w-16 h-16 rounded-full bg-amber-50 border-2 border-amber-200 flex items-center justify-center mb-6">
        <svg
          className="w-7 h-7 text-amber-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
          />
        </svg>
      </div>

      {/* Title */}
      <h2 className="font-ibm-mono text-sm tracking-[0.2em] uppercase text-[#2C3340] mb-3">
        Station Hold
      </h2>

      {/* Rotating Party message */}
      <p className="text-sm text-[#4B5563] text-center max-w-md leading-relaxed transition-opacity duration-500">
        {GATE_MESSAGES[messageIdx]}
      </p>

      {/* Decorative progress bar */}
      <div className="mt-8 w-48 h-1 bg-[#E8E4DC] rounded-full overflow-hidden">
        <div className="h-full bg-amber-400 rounded-full animate-pulse w-1/3" />
      </div>

      <p className="mt-4 text-[10px] text-[#B8B3AA] tracking-wider">
        Your supervisor will advance your station shortly.
      </p>
    </div>
  );
}
