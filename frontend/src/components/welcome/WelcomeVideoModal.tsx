import { useState, useRef, useEffect, useCallback } from 'react';
import { markWelcomeWatched } from '../../api/dictionary';
import client from '../../api/client';

interface Props {
  designation?: string | null;
  onComplete: () => void;
}

export default function WelcomeVideoModal({ designation, onComplete }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [progress, setProgress] = useState(0);
  const [videoEnded, setVideoEnded] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [proceeding, setProceeding] = useState(false);
  const [needsManualPlay, setNeedsManualPlay] = useState(false);

  const isTestUser = designation?.toUpperCase() === 'CA-1';

  // Build absolute URL from axios baseURL — resolveUploadUrl may not be deployed yet
  const videoUrl = `${client.defaults.baseURL}/dictionary/welcome-video`;

  // Try to autoplay once video is ready — handle autoplay rejection
  useEffect(() => {
    const v = videoRef.current;
    if (!v || videoError) return;

    const tryPlay = () => {
      v.play().catch(() => {
        // Autoplay blocked — show manual play button
        setNeedsManualPlay(true);
      });
    };

    // If video metadata is already loaded, try playing
    if (v.readyState >= 1) {
      tryPlay();
    } else {
      v.addEventListener('loadedmetadata', tryPlay, { once: true });
      return () => v.removeEventListener('loadedmetadata', tryPlay);
    }
  }, [videoError]);

  const handleManualPlay = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = false;
    v.play().catch(() => {
      // If still blocked, try muted
      v.muted = true;
      v.play().catch(() => {});
    });
    setNeedsManualPlay(false);
  };

  // Update progress bar
  const handleTimeUpdate = useCallback(() => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    setProgress(v.currentTime / v.duration);
  }, []);

  // Auto-proceed fallback: if no video, show placeholder and allow after 5s
  useEffect(() => {
    if (videoError) {
      const t = setTimeout(() => setVideoEnded(true), 5000);
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
              playsInline
              onTimeUpdate={handleTimeUpdate}
              onEnded={() => setVideoEnded(true)}
              onError={() => setVideoError(true)}
            />

            {/* Manual play overlay — shown when autoplay is blocked */}
            {needsManualPlay && (
              <button
                onClick={handleManualPlay}
                className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 cursor-pointer"
              >
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center border-2 mb-3"
                  style={{ borderColor: '#00ff88' }}
                >
                  <div
                    className="w-0 h-0 ml-1"
                    style={{
                      borderTop: '12px solid transparent',
                      borderBottom: '12px solid transparent',
                      borderLeft: '20px solid #00ff88',
                    }}
                  />
                </div>
                <span className="font-ibm-mono text-xs tracking-[0.2em] uppercase" style={{ color: '#00ff88' }}>
                  Begin Orientation
                </span>
              </button>
            )}
          </div>
        )}

        {/* Progress bar */}
        <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: '#1a3d1a' }}>
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${Math.round(progress * 100)}%`,
              background: '#00ff88',
            }}
          />
        </div>

        {/* Proceed button — only after video ends */}
        <div className="h-12 flex items-center">
          {videoEnded && (
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
        {isTestUser && !videoEnded && (
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
