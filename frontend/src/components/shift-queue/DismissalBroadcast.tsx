import { useEffect, useRef, useState } from 'react';
import MonitorPlayer from '../shared/MonitorPlayer';

interface DismissalBroadcastProps {
  state: 'flash' | 'playing' | 'outro';
  videoUrl: string;
  showSkip: boolean;
  onStateChange: (state: 'flash' | 'playing' | 'outro') => void;
  onSkipReady: () => void;
  onComplete: () => void;
  onSkip: () => void;
}

export default function DismissalBroadcast({
  state,
  videoUrl,
  showSkip,
  onStateChange,
  onSkipReady,
  onComplete,
  onSkip,
}: DismissalBroadcastProps) {
  const skipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [outroFaded, setOutroFaded] = useState(false);

  // Stage 1: Flash — 2 seconds then advance to playing
  useEffect(() => {
    if (state !== 'flash') return;
    const timer = setTimeout(() => onStateChange('playing'), 2000);
    return () => clearTimeout(timer);
  }, [state, onStateChange]);

  // Stage 2: Playing — start skip timer
  useEffect(() => {
    if (state !== 'playing') return;
    skipTimerRef.current = setTimeout(() => onSkipReady(), 5000);
    return () => {
      if (skipTimerRef.current) clearTimeout(skipTimerRef.current);
    };
  }, [state, onSkipReady]);

  // Stage 3: Outro — fade in text, then complete after 3s
  useEffect(() => {
    if (state !== 'outro') return;
    const fadeTimer = requestAnimationFrame(() => setOutroFaded(true));
    const completeTimer = setTimeout(() => onComplete(), 3000);
    return () => {
      cancelAnimationFrame(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, [state, onComplete]);

  // MonitorPlayer's onEnded fires on both successful end and error fallback (2s auto-skip)
  const handleVideoDone = () => {
    onStateChange('outro');
  };

  // ── Stage 1: Flash ──────────────────────────────────────────
  if (state === 'flash') {
    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
        <div
          className="absolute inset-0"
          style={{
            animation: 'dismissalFlash 0.5s ease-in-out',
          }}
        />
        <style>{`
          @keyframes dismissalFlash {
            0% { box-shadow: inset 0 0 0 0px rgba(200,0,0,0); }
            50% { box-shadow: inset 0 0 0 4px rgba(200,0,0,0.8); }
            100% { box-shadow: inset 0 0 0 0px rgba(200,0,0,0); }
          }
        `}</style>
      </div>
    );
  }

  // ── Stage 2: Playing ────────────────────────────────────────
  if (state === 'playing') {
    return (
      <div
        className="fixed inset-0 z-50 flex flex-col items-center justify-center"
        style={{
          background: `
            radial-gradient(ellipse 80% 60% at 50% 45%, rgba(58, 82, 65, 0.35) 0%, transparent 70%),
            radial-gradient(ellipse 50% 40% at 50% 50%, rgba(0, 180, 100, 0.08) 0%, transparent 60%),
            radial-gradient(ellipse 120% 80% at 50% 55%, rgba(90, 75, 50, 0.2) 0%, transparent 70%),
            #0a0a0a
          `,
        }}
      >
        <div className="w-full max-w-3xl px-4">
          <MonitorPlayer
            src={videoUrl}
            autoPlay
            onEnded={handleVideoDone}
          />
        </div>

        {showSkip && (
          <button
            onClick={onSkip}
            className="mt-6 font-ibm-mono text-[10px] tracking-[0.2em] uppercase px-5 py-2.5 border rounded transition-all active:scale-95 opacity-50 hover:opacity-100"
            style={{
              borderColor: '#5a8a6a',
              color: '#5a8a6a',
              background: 'transparent',
            }}
          >
            SKIP
          </button>
        )}
      </div>
    );
  }

  // ── Stage 3: Outro ──────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center transition-colors duration-[3000ms]"
      style={{ backgroundColor: outroFaded ? '#0a1a0a' : '#1a0000' }}
    >
      <p
        className={`font-ibm-mono text-white tracking-[0.3em] uppercase text-sm transition-opacity duration-1000 ${
          outroFaded ? 'opacity-100' : 'opacity-0'
        }`}
      >
        HAVE A HAPPY DAY.
      </p>
    </div>
  );
}
