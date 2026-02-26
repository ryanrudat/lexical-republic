import { useState, useRef, useEffect, useCallback } from 'react';
import { markWelcomeWatched } from '../../api/dictionary';
import { resolveUploadUrl } from '../../api/client';

interface Props {
  designation?: string | null;
  onComplete: () => void;
}

export default function WelcomeVideoModal({ designation, onComplete }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [progress, setProgress] = useState(0);
  const [canProceed, setCanProceed] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [proceeding, setProceeding] = useState(false);

  const isTestUser = designation?.toUpperCase() === 'CA-1';

  const videoUrl = resolveUploadUrl('/api/dictionary/welcome-video');

  // Update progress bar
  const handleTimeUpdate = useCallback(() => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    const pct = v.currentTime / v.duration;
    setProgress(pct);
    if (pct >= 0.9) setCanProceed(true);
  }, []);

  // Auto-proceed fallback: if no video, show placeholder and allow after 5s
  useEffect(() => {
    if (videoError) {
      const t = setTimeout(() => setCanProceed(true), 5000);
      return () => clearTimeout(t);
    }
  }, [videoError]);

  const handleProceed = async () => {
    if (proceeding) return;
    setProceeding(true);
    try {
      await markWelcomeWatched();
      onComplete();
    } catch {
      // If API fails, still let them through
      onComplete();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col items-center justify-center"
      style={{
        background: '#0a0a0a',
        boxShadow: 'inset 0 0 200px rgba(0, 255, 136, 0.05)',
      }}
    >
      {/* Content area */}
      <div className="w-full max-w-3xl px-4 flex flex-col items-center gap-6">
        {videoError ? (
          // No video uploaded yet — static screen
          <div className="w-full aspect-video flex flex-col items-center justify-center border rounded"
            style={{ borderColor: '#1a3d1a', background: '#0d1a0d' }}
          >
            <h2 className="font-ibm-mono text-lg tracking-[0.3em] uppercase mb-2"
              style={{ color: '#00ff88' }}
            >
              WELCOME TO THE MINISTRY
            </h2>
            <p className="font-ibm-mono text-xs tracking-wider" style={{ color: '#5a8a6a' }}>
              Your orientation will begin shortly.
            </p>
          </div>
        ) : (
          // Video player
          <div className="w-full aspect-video relative bg-black rounded overflow-hidden">
            <video
              ref={videoRef}
              src={videoUrl}
              className="w-full h-full object-contain"
              autoPlay
              playsInline
              onTimeUpdate={handleTimeUpdate}
              onEnded={() => setCanProceed(true)}
              onError={() => setVideoError(true)}
            />
          </div>
        )}

        {/* Progress bar */}
        <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: '#1a3d1a' }}>
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: videoError ? `${Math.min(progress * 100, 100)}%` : `${Math.round(progress * 100)}%`,
              background: '#00ff88',
            }}
          />
        </div>

        {/* Proceed button */}
        <div className="h-12 flex items-center">
          {canProceed && (
            <button
              onClick={handleProceed}
              disabled={proceeding}
              className="font-ibm-mono text-sm tracking-[0.2em] uppercase px-8 py-3 border rounded transition-all"
              style={{
                borderColor: '#00cc6a',
                color: proceeding ? '#5a8a6a' : '#00ff88',
                background: 'rgba(0, 40, 0, 0.4)',
              }}
            >
              {proceeding ? 'PROCESSING...' : 'PROCEED TO YOUR STATION'}
            </button>
          )}
        </div>

        {/* CA-1 test bypass */}
        {isTestUser && !canProceed && (
          <button
            onClick={handleProceed}
            className="font-ibm-mono text-[10px] tracking-wider uppercase px-3 py-1 border rounded absolute top-4 right-4"
            style={{ borderColor: '#1a3d1a', color: '#5a8a6a' }}
          >
            SKIP (TEST)
          </button>
        )}
      </div>
    </div>
  );
}
