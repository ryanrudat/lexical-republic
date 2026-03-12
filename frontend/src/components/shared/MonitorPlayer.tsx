import { useState, useRef, useEffect, useCallback } from 'react';

interface MonitorPlayerProps {
  /** Video file URL (uploaded/static) */
  src?: string;
  /** External embed URL (iframe) */
  embedUrl?: string;
  /** Attempt autoplay on mount (default false) */
  autoPlay?: boolean;
  /** Called when video finishes */
  onEnded?: () => void;
  /** Content rendered inside the CRT screen area (e.g. proceed/skip buttons) */
  screenOverlay?: React.ReactNode;
}

// Screen bounding box as % of full monitor image (2744x1568)
const screen = { top: 12, left: 28.5, width: 43, height: 58 };

// CRT screen clip-path — rounded top corners + concave curved bottom
const screenClip = [
  '1% 1%',
  '99% 1%',
  '100% 3%',
  '100% 91%',
  '99% 95%',
  '94% 97%',
  '80% 99%',
  '50% 100%',
  '20% 99%',
  '6% 97%',
  '1% 95%',
  '0% 91%',
  '0% 3%',
].join(', ');

// Green LED bar position — pixel-measured from welcome-monitor.jpg
const ledBar = { top: 74.2, left: 22.1, width: 55.2 };

export default function MonitorPlayer({
  src,
  embedUrl,
  autoPlay = false,
  onEnded,
  screenOverlay,
}: MonitorPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(true);
  const [muted, setMuted] = useState(false);
  const [needsManualPlay, setNeedsManualPlay] = useState(false);
  const [videoError, setVideoError] = useState(false);

  const hasVideo = !!(src || embedUrl);

  // Auto-skip when video fails to load (file deleted, 404, etc.)
  useEffect(() => {
    if (!videoError) return;
    const t = setTimeout(() => onEnded?.(), 2000);
    return () => clearTimeout(t);
  }, [videoError, onEnded]);

  // Try autoplay if requested
  useEffect(() => {
    if (!autoPlay || !src || videoError) return;
    const v = videoRef.current;
    if (!v) return;

    const tryPlay = () => {
      v.play()
        .then(() => setPaused(false))
        .catch(() => setNeedsManualPlay(true));
    };

    if (v.readyState >= 1) {
      tryPlay();
    } else {
      v.addEventListener('loadedmetadata', tryPlay, { once: true });
      return () => v.removeEventListener('loadedmetadata', tryPlay);
    }
  }, [autoPlay, src, videoError]);

  const handleManualPlay = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = false;
    setMuted(false);
    v.play()
      .then(() => { setPaused(false); setNeedsManualPlay(false); })
      .catch(() => {
        v.muted = true;
        setMuted(true);
        v.play()
          .then(() => { setPaused(false); setNeedsManualPlay(false); })
          .catch(() => {});
      });
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
      v.play().then(() => setPaused(false)).catch(() => {});
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

  const handleTimeUpdate = useCallback(() => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    setProgress(v.currentTime / v.duration);
  }, []);

  const handleEnded = () => {
    setPaused(true);
    onEnded?.();
  };

  return (
    <div className="relative w-full" style={{ aspectRatio: '2744 / 1568' }}>
      <img
        src="/images/welcome-monitor.jpg"
        alt=""
        className="w-full h-full object-contain pointer-events-none select-none"
        draggable={false}
      />

      {/* Screen area — positioned at monitor glass */}
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
        {!hasVideo || videoError ? (
          /* CRT standby screen */
          <div className="w-full h-full flex flex-col items-center justify-center bg-[#050a05]">
            <h2
              className="font-ibm-mono text-sm sm:text-lg tracking-[0.3em] uppercase mb-2"
              style={{ color: '#00ff88' }}
            >
              STANDBY
            </h2>
            <p
              className="font-ibm-mono text-[10px] sm:text-xs tracking-wider"
              style={{ color: '#5a8a6a' }}
            >
              No transmission available.
            </p>
          </div>
        ) : embedUrl ? (
          /* Embed iframe */
          <>
            <iframe
              src={embedUrl}
              className="w-full h-full"
              allow="autoplay; fullscreen"
              allowFullScreen
            />
            {/* CRT effects over embed */}
            <div
              className="absolute inset-0 pointer-events-none opacity-[0.04]"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0,0,0,0.3) 1px, rgba(0,0,0,0.3) 2px)',
                backgroundSize: '100% 2px',
              }}
            />
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                boxShadow: 'inset 0 0 60px 30px rgba(0,0,0,0.95), inset 0 0 120px 60px rgba(0,0,0,0.5)',
              }}
            />
          </>
        ) : (
          /* Video element */
          <>
            <video
              ref={videoRef}
              src={src}
              className="w-full h-full object-contain bg-black cursor-pointer"
              playsInline
              onClick={togglePlayPause}
              onTimeUpdate={handleTimeUpdate}
              onEnded={handleEnded}
              onError={() => setVideoError(true)}
            />

            {/* CRT scanline overlay */}
            <div
              className="absolute inset-0 pointer-events-none opacity-[0.04]"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0,0,0,0.3) 1px, rgba(0,0,0,0.3) 2px)',
                backgroundSize: '100% 2px',
              }}
            />

            {/* Vignette */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                boxShadow: 'inset 0 0 60px 30px rgba(0,0,0,0.95), inset 0 0 120px 60px rgba(0,0,0,0.5)',
              }}
            />

            {/* Screen glare */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  'radial-gradient(ellipse 80% 60% at 35% 30%, rgba(255,255,255,0.06) 0%, transparent 70%)',
              }}
            />

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
                  Play Transmission
                </span>
              </button>
            )}
          </>
        )}

        {/* Screen overlay slot — for proceed/skip buttons etc. */}
        {screenOverlay}
      </div>

      {/* Seekable progress bar — aligned to the monitor's green LED strip */}
      {src && !videoError && (
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
      )}

      {/* Playback controls — rewind & pause/play between knobs */}
      {src && !videoError && !needsManualPlay && (
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
            className="opacity-40 hover:opacity-80 active:opacity-90 transition-opacity"
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
            className="opacity-40 hover:opacity-80 active:opacity-90 transition-opacity"
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

      {/* Volume knob — vintage brass style */}
      {src && !videoError && (
        <button
          onClick={toggleMute}
          className="absolute flex items-center justify-center transition-all hover:scale-105 active:scale-95"
          style={{
            top: '79.5%',
            left: '48%',
            width: '4%',
            height: '7%',
            borderRadius: '50%',
            background: 'radial-gradient(ellipse at 40% 35%, #d4c4a0 0%, #a89060 40%, #7a6840 80%, #5a4e30 100%)',
            boxShadow: muted
              ? 'inset 0 1px 2px rgba(255,255,255,0.3), 0 2px 4px rgba(0,0,0,0.5)'
              : 'inset 0 1px 2px rgba(255,255,255,0.3), 0 2px 4px rgba(0,0,0,0.5), 0 0 8px rgba(0,255,136,0.3)',
            border: '1px solid #5a4e30',
          }}
          title={muted ? 'Unmute' : 'Mute'}
        >
          {muted ? (
            <svg width="45%" height="45%" viewBox="0 0 24 24" fill="none" stroke="#3a3520" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <line x1="23" y1="9" x2="17" y2="15" />
              <line x1="17" y1="9" x2="23" y2="15" />
            </svg>
          ) : (
            <svg width="45%" height="45%" viewBox="0 0 24 24" fill="none" stroke="#3a3520" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            </svg>
          )}
        </button>
      )}
    </div>
  );
}
