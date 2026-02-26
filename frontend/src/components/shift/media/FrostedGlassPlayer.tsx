import { useEffect, useRef, useState, useCallback } from 'react';

interface FrostedGlassPlayerProps {
  src: string;
  title?: string;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function FrostedGlassPlayer({ src, title }: FrostedGlassPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const scheduleHide = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    setShowControls(true);
    hideTimerRef.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) {
        setShowControls(false);
      }
    }, 3000);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onLoaded = () => {
      setReady(true);
      setDuration(Number.isFinite(video.duration) ? video.duration : 0);
      setError(null);
    };
    const onTime = () => setCurrentTime(video.currentTime || 0);
    const onPlay = () => { setPlaying(true); scheduleHide(); };
    const onPause = () => { setPlaying(false); setShowControls(true); };
    const onError = () => setError('Video unavailable — file may need re-uploading.');
    const onEnded = () => { setPlaying(false); setShowControls(true); };

    video.addEventListener('loadedmetadata', onLoaded);
    video.addEventListener('timeupdate', onTime);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('error', onError);
    video.addEventListener('ended', onEnded);

    return () => {
      video.removeEventListener('loadedmetadata', onLoaded);
      video.removeEventListener('timeupdate', onTime);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('error', onError);
      video.removeEventListener('ended', onEnded);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [src, scheduleHide]);

  const togglePlay = async () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      try { await video.play(); } catch { setError('Playback blocked. Tap play again.'); }
    } else {
      video.pause();
    }
  };

  const handleRetry = () => {
    const video = videoRef.current;
    if (!video) return;
    setError(null);
    setReady(false);
    video.load();
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Number(e.target.value);
  };

  const handleMouseMove = () => scheduleHide();

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className="relative rounded-2xl overflow-hidden"
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setShowControls(true)}
      onTouchStart={scheduleHide}
      style={{
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        background: 'linear-gradient(135deg, rgba(0,20,30,0.85) 0%, rgba(0,40,50,0.75) 100%)',
        border: '1px solid rgba(0,229,255,0.12)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
      }}
    >
      {/* Video element */}
      <video
        ref={videoRef}
        src={src}
        preload="metadata"
        playsInline
        className="w-full aspect-video object-contain"
        style={{ background: 'transparent' }}
      />

      {/* Title bar — frosted glass strip */}
      {title && (
        <div className={`absolute top-0 left-0 right-0 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}>
          <div className="px-4 py-2.5" style={{
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            background: 'linear-gradient(to bottom, rgba(0,20,30,0.6) 0%, transparent 100%)',
          }}>
            <span className="font-ibm-mono text-[11px] text-neon-cyan/60 tracking-[0.2em] uppercase">
              {title}
            </span>
          </div>
        </div>
      )}

      {/* Controls bar — frosted glass bottom strip */}
      <div className={`absolute bottom-0 left-0 right-0 transition-opacity duration-300 ${
        showControls ? 'opacity-100' : 'opacity-0'
      }`}>
        <div className="px-3 pb-3 pt-8" style={{
          background: 'linear-gradient(to top, rgba(0,20,30,0.7) 0%, transparent 100%)',
        }}>
          {/* Seek bar */}
          <div className="relative mb-2.5">
            <input
              type="range"
              min={0}
              max={duration || 1}
              step={0.1}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-[6px] appearance-none rounded-full cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
                [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-neon-cyan
                [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(0,229,255,0.6)]
                [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full
                [&::-moz-range-thumb]:bg-neon-cyan [&::-moz-range-thumb]:border-none"
              style={{
                background: `linear-gradient(to right, rgba(0,229,255,0.7) ${progress}%, rgba(255,255,255,0.1) ${progress}%)`,
              }}
            />
          </div>

          {/* Bottom row: play + time */}
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              disabled={!ready}
              className="w-11 h-11 rounded-full flex items-center justify-center transition-all disabled:opacity-30"
              style={{
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                background: 'rgba(0,229,255,0.1)',
                border: '1px solid rgba(0,229,255,0.25)',
              }}
            >
              {playing ? (
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-neon-cyan" fill="currentColor">
                  <rect x="6" y="5" width="4" height="14" rx="1" />
                  <rect x="14" y="5" width="4" height="14" rx="1" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-neon-cyan ml-0.5" fill="currentColor">
                  <path d="M8 5.14v14l11-7-11-7z" />
                </svg>
              )}
            </button>

            <span className="font-dseg7 text-xs text-neon-cyan/70 tracking-wider">
              {formatTime(currentTime)}
            </span>
            <span className="font-ibm-mono text-[10px] text-white/20">/</span>
            <span className="font-dseg7 text-xs text-neon-cyan/40 tracking-wider">
              {formatTime(duration)}
            </span>
          </div>
        </div>
      </div>

      {/* Center play button — frosted glass pill */}
      {ready && !playing && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center transition-colors"
        >
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center hover:scale-105 transition-transform"
            style={{
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              background: 'linear-gradient(135deg, rgba(0,229,255,0.15) 0%, rgba(0,229,255,0.08) 100%)',
              border: '1px solid rgba(0,229,255,0.3)',
              boxShadow: '0 0 20px rgba(0,229,255,0.15), inset 0 1px 0 rgba(255,255,255,0.1)',
            }}
          >
            <svg viewBox="0 0 24 24" className="w-6 h-6 text-neon-cyan ml-0.5" fill="currentColor">
              <path d="M8 5.14v14l11-7-11-7z" />
            </svg>
          </div>
        </button>
      )}

      {/* Loading state — before video metadata loads */}
      {!ready && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{
              border: '2px solid rgba(0,229,255,0.2)',
            }}
          >
            <div className="w-5 h-5 rounded-full animate-spin"
              style={{
                border: '2px solid transparent',
                borderTopColor: 'rgba(0,229,255,0.6)',
              }}
            />
          </div>
          <span className="font-ibm-mono text-[10px] text-neon-cyan/40 tracking-[0.25em] uppercase">
            Loading...
          </span>
        </div>
      )}

      {/* Error state — frosted glass overlay with retry */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center px-6 py-4 rounded-2xl mx-4" style={{
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            background: 'linear-gradient(135deg, rgba(255,64,129,0.08) 0%, rgba(255,64,129,0.04) 100%)',
            border: '1px solid rgba(255,64,129,0.15)',
          }}>
            <div className="w-8 h-8 mx-auto mb-2 rounded-full flex items-center justify-center"
              style={{ border: '1px solid rgba(255,64,129,0.2)' }}
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-neon-pink/60" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 9v4m0 4h.01M12 3l9.5 16.5H2.5L12 3z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="font-ibm-mono text-[11px] text-neon-pink/70 tracking-wider mb-3">
              {error}
            </p>
            <button
              onClick={handleRetry}
              className="font-ibm-mono text-[10px] text-neon-cyan/60 tracking-[0.2em] uppercase px-6 py-3 min-h-[44px] rounded-full transition-all hover:text-neon-cyan"
              style={{
                border: '1px solid rgba(0,229,255,0.2)',
                background: 'rgba(0,229,255,0.05)',
              }}
            >
              Retry
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
