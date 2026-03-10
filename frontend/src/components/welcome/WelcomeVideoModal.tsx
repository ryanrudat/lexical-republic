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
  const [paused, setPaused] = useState(false);
  const progressBarRef = useRef<HTMLDivElement>(null);

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

  const togglePlayPause = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().catch(() => {});
      setPaused(false);
    } else {
      v.pause();
      setPaused(true);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const v = videoRef.current;
    const bar = progressBarRef.current;
    if (!v || !bar || !v.duration) return;
    const rect = bar.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    v.currentTime = pct * v.duration;
    setProgress(pct);
  };

  const skipBack = () => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, v.currentTime - 10);
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

  // Screen bounding box as % of full monitor image (2744x1568)
  // Measured via pixel analysis: glass top=12%, left=28.5%, w=43%, h=58%
  const screen = { top: 12, left: 28.5, width: 43, height: 58 };

  // Clip-path for CRT screen shape — coordinates relative to the screen container
  // Rounded top corners + concave curved bottom (center deepest at ~70% of image)
  const screenClip = [
    '1% 1%',       // top-left
    '99% 1%',      // top-right
    '100% 3%',     // top-right corner
    '100% 91%',    // right edge
    '99% 95%',     // bottom-right transition
    '94% 97%',     // bottom-right mid
    '80% 99%',     // bottom-right quarter
    '50% 100%',    // bottom center (lowest)
    '20% 99%',     // bottom-left quarter
    '6% 97%',      // bottom-left mid
    '1% 95%',      // bottom-left transition
    '0% 91%',      // left edge
    '0% 3%',       // top-left corner
  ].join(', ');

  // Green LED bar position — pixel-measured from welcome-monitor.jpg
  const ledBar = { top: 74.2, left: 22.1, width: 55.2 };

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

          {/* Video / placeholder — positioned at screen area, video-first (no cropping) */}
          <div
            className="absolute overflow-hidden bg-black"
            style={{
              top: `${screen.top}%`,
              left: `${screen.left}%`,
              width: `${screen.width}%`,
              height: `${screen.height}%`,
              clipPath: `polygon(${screenClip})`,
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
                  className="w-full h-full object-cover bg-black cursor-pointer"
                  playsInline
                  onClick={togglePlayPause}
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

          {/* Seekable progress bar — aligned to the monitor's green LED strip */}
          <div
            ref={progressBarRef}
            className="absolute cursor-pointer"
            style={{
              top: `${ledBar.top}%`,
              left: `${ledBar.left}%`,
              width: `${ledBar.width}%`,
              height: '1.4%',
              marginTop: '-0.35%',
            }}
            onClick={handleSeek}
          >
            {/* Visible bar — centered within click target */}
            <div
              className="absolute overflow-hidden"
              style={{ top: '30%', left: 0, right: 0, height: '40%' }}
            >
              <div
                className="h-full transition-all duration-200"
                style={{
                  width: `${Math.round(progress * 100)}%`,
                  background: 'linear-gradient(90deg, #00ff88, #44ffaa)',
                  boxShadow: '0 0 12px rgba(0, 255, 136, 0.8), 0 0 4px rgba(0, 255, 136, 1)',
                }}
              />
            </div>
          </div>

          {/* Playback controls — rewind & pause/play between knobs */}
          {!videoError && !needsManualPlay && (
            <div
              className="absolute flex items-center justify-center gap-3"
              style={{
                top: '79%',
                left: '30%',
                width: '40%',
                height: '5%',
              }}
            >
              {/* Rewind 10s */}
              <button
                onClick={skipBack}
                className="opacity-0 hover:opacity-80 transition-opacity"
                title="Rewind 10s"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c0b8a8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 4v6h6" />
                  <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                </svg>
              </button>
              {/* Pause / Play */}
              <button
                onClick={togglePlayPause}
                className="opacity-0 hover:opacity-80 transition-opacity"
                title={paused ? 'Play' : 'Pause'}
              >
                {paused ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="#c0b8a8" stroke="none">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="#c0b8a8" stroke="none">
                    <rect x="6" y="4" width="4" height="16" />
                    <rect x="14" y="4" width="4" height="16" />
                  </svg>
                )}
              </button>
            </div>
          )}
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
