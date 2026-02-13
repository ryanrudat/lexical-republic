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
    const onError = () => setError('Could not load video.');
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
      try { await video.play(); } catch { setError('Playback blocked. Click Play again.'); }
    } else {
      video.pause();
    }
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
      className="relative ios-glass-card-strong overflow-hidden group"
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setShowControls(true)}
    >
      {/* Video */}
      <video
        ref={videoRef}
        src={src}
        preload="metadata"
        playsInline
        className="w-full aspect-video object-contain bg-black/80"
      />

      {/* Title bar */}
      {title && (
        <div className={`absolute top-0 left-0 right-0 px-4 py-2 bg-gradient-to-b from-black/50 to-transparent transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}>
          <span className="font-ibm-mono text-[11px] text-white/70 tracking-wider">
            {title}
          </span>
        </div>
      )}

      {/* Controls overlay */}
      <div className={`absolute bottom-0 left-0 right-0 transition-opacity duration-300 ${
        showControls ? 'opacity-100' : 'opacity-0'
      }`}>
        <div className="bg-gradient-to-t from-black/60 to-transparent pt-8 pb-3 px-3">
          {/* Seek bar */}
          <div className="relative mb-2 group/seek">
            <input
              type="range"
              min={0}
              max={duration || 1}
              step={0.1}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1 appearance-none bg-white/15 rounded-full cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
                [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-neon-cyan
                [&::-webkit-slider-thumb]:shadow-[0_0_6px_rgba(0,229,255,0.5)]
                [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full
                [&::-moz-range-thumb]:bg-neon-cyan [&::-moz-range-thumb]:border-none"
              style={{
                background: `linear-gradient(to right, rgba(0,229,255,0.6) ${progress}%, rgba(255,255,255,0.15) ${progress}%)`,
              }}
            />
          </div>

          {/* Bottom row: play + time */}
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              disabled={!ready}
              className="w-8 h-8 rounded-full flex items-center justify-center bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-neon-cyan/20 hover:border-neon-cyan/40 transition-all disabled:opacity-30"
            >
              {playing ? (
                <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="currentColor">
                  <rect x="6" y="5" width="4" height="14" rx="1" />
                  <rect x="14" y="5" width="4" height="14" rx="1" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="w-4 h-4 text-white ml-0.5" fill="currentColor">
                  <path d="M8 5.14v14l11-7-11-7z" />
                </svg>
              )}
            </button>

            <span className="font-dseg7 text-sm text-neon-cyan/60 tracking-wider">
              {formatTime(currentTime)}
            </span>
            <span className="font-ibm-mono text-[10px] text-white/30">/</span>
            <span className="font-dseg7 text-sm text-neon-cyan/40 tracking-wider">
              {formatTime(duration)}
            </span>
          </div>
        </div>
      </div>

      {/* Big center play button when paused */}
      {ready && !playing && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors"
        >
          <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center hover:bg-neon-cyan/20 hover:border-neon-cyan/40 transition-all">
            <svg viewBox="0 0 24 24" className="w-8 h-8 text-white ml-1" fill="currentColor">
              <path d="M8 5.14v14l11-7-11-7z" />
            </svg>
          </div>
        </button>
      )}

      {/* Error */}
      {error && (
        <div className="absolute bottom-12 left-3 right-3">
          <div className="rounded-lg bg-neon-pink/10 border border-neon-pink/20 px-3 py-2">
            <p className="font-ibm-mono text-[11px] text-neon-pink tracking-wider text-center">
              {error}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
