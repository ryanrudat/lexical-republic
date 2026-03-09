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
  const [videoEnded, setVideoEnded] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [proceeding, setProceeding] = useState(false);
  const [needsManualPlay, setNeedsManualPlay] = useState(false);
  const [muted, setMuted] = useState(false);

  const isTestUser = designation?.toUpperCase() === 'CA-1';

  // Use static file path — served by express.static('/uploads'), no auth needed
  const videoUrl = resolveUploadUrl('/uploads/welcome/welcome-video.mp4');

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
    setMuted(false);
    v.play().catch(() => {
      // If still blocked, try muted
      v.muted = true;
      setMuted(true);
      v.play().catch(() => {});
    });
    setNeedsManualPlay(false);
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
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

  // Monitor screen area as percentage of the image (2744x1568)
  // Tightly inset inside the beveled CRT bezel
  const screen = { top: 12, left: 24.5, width: 51, height: 49 };
  // Green LED bar position on the monitor
  const ledBar = { top: 71.5, left: 24.5, width: 51 };

  return (
    <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-[#0c0c0c]">
      {/* Monitor + video container */}
      <div className="relative w-full max-w-5xl px-4">
        {/* Monitor image — sets the size for everything */}
        <div className="relative w-full" style={{ aspectRatio: '2744 / 1568' }}>
          <img
            src="/images/welcome-monitor.jpg"
            alt=""
            className="w-full h-full object-contain pointer-events-none select-none"
            draggable={false}
          />

          {/* Video / placeholder — positioned inside the screen area */}
          <div
            className="absolute overflow-hidden"
            style={{
              top: `${screen.top}%`,
              left: `${screen.left}%`,
              width: `${screen.width}%`,
              height: `${screen.height}%`,
              borderRadius: '3% / 4%',
            }}
          >
            {videoError ? (
              // No video uploaded — CRT standby screen
              <div className="w-full h-full flex flex-col items-center justify-center bg-[#050a05]">
                <h2
                  className="font-ibm-mono text-sm sm:text-lg tracking-[0.3em] uppercase mb-2"
                  style={{ color: '#00ff88' }}
                >
                  WELCOME TO THE MINISTRY
                </h2>
                <p
                  className="font-ibm-mono text-[10px] sm:text-xs tracking-wider"
                  style={{ color: '#5a8a6a' }}
                >
                  Your orientation will begin shortly.
                </p>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  src={videoUrl}
                  className="w-full h-full object-cover bg-black"
                  playsInline
                  onTimeUpdate={handleTimeUpdate}
                  onEnded={() => setVideoEnded(true)}
                  onError={() => setVideoError(true)}
                />

                {/* CRT scanline overlay for retro feel */}
                <div
                  className="absolute inset-0 pointer-events-none opacity-[0.04]"
                  style={{
                    backgroundImage:
                      'repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0,0,0,0.3) 1px, rgba(0,0,0,0.3) 2px)',
                    backgroundSize: '100% 2px',
                  }}
                />

                {/* Subtle screen glare */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background:
                      'radial-gradient(ellipse 80% 60% at 35% 30%, rgba(255,255,255,0.06) 0%, transparent 70%)',
                  }}
                />

                {/* Volume toggle */}
                {!needsManualPlay && (
                  <button
                    onClick={toggleMute}
                    className="absolute bottom-2 right-2 w-8 h-8 rounded-full flex items-center justify-center transition-opacity hover:opacity-100 opacity-60"
                    style={{ background: 'rgba(0, 0, 0, 0.5)' }}
                    title={muted ? 'Unmute' : 'Mute'}
                  >
                    {muted ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00ff88" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                        <line x1="23" y1="9" x2="17" y2="15" />
                        <line x1="17" y1="9" x2="23" y2="15" />
                      </svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00ff88" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                        <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                      </svg>
                    )}
                  </button>
                )}

                {/* Manual play overlay */}
                {needsManualPlay && (
                  <button
                    onClick={handleManualPlay}
                    className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 cursor-pointer"
                  >
                    <div
                      className="w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center border-2 mb-2"
                      style={{ borderColor: '#00ff88', background: 'rgba(0, 255, 136, 0.08)' }}
                    >
                      <div
                        className="w-0 h-0 ml-1"
                        style={{
                          borderTop: '10px solid transparent',
                          borderBottom: '10px solid transparent',
                          borderLeft: '18px solid #00ff88',
                        }}
                      />
                    </div>
                    <span
                      className="font-ibm-mono text-[10px] sm:text-xs tracking-[0.2em] uppercase"
                      style={{ color: '#00ff88' }}
                    >
                      Begin Orientation
                    </span>
                  </button>
                )}
              </>
            )}
          </div>

          {/* Progress bar — overlaid on the monitor's green LED strip */}
          <div
            className="absolute overflow-hidden"
            style={{
              top: `${ledBar.top}%`,
              left: `${ledBar.left}%`,
              width: `${ledBar.width}%`,
              height: '0.45%',
            }}
          >
            <div
              className="h-full transition-all duration-300"
              style={{
                width: `${Math.round(progress * 100)}%`,
                background: '#00ff88',
                boxShadow: '0 0 8px rgba(0, 255, 136, 0.6)',
              }}
            />
          </div>
        </div>

        {/* Controls below the monitor */}
        <div className="flex flex-col items-center gap-3 mt-4">
          {/* Proceed button — only after video ends */}
          <div className="h-12 flex items-center">
            {videoEnded && (
              <button
                onClick={handleProceed}
                disabled={proceeding}
                className="font-ibm-mono text-xs sm:text-sm tracking-[0.2em] uppercase px-8 py-3 border rounded transition-all"
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
              className="font-ibm-mono text-[10px] tracking-wider uppercase px-3 py-1 border rounded"
              style={{ borderColor: '#1a3d1a', color: '#5a8a6a' }}
            >
              SKIP (TEST)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
