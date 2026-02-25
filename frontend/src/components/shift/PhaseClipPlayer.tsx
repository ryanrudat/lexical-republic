import { useState, useEffect, useRef } from 'react';
import type { ClipConfig } from '../../types/sessions';
import { resolveUploadUrl } from '../../api/client';

interface PhaseClipPlayerProps {
  clip: ClipConfig;
  onComplete: () => void;
}

export default function PhaseClipPlayer({ clip, onComplete }: PhaseClipPlayerProps) {
  const [showSkip, setShowSkip] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasVideo = clip.embedUrl || clip.uploadPath;

  // Auto-advance for fallback text (3s), show skip immediately for video
  useEffect(() => {
    if (!hasVideo) {
      // Fallback text mode: auto-advance after 3s with Continue button
      timerRef.current = setTimeout(onComplete, 3000);
      setShowSkip(true);
    } else {
      // Video mode: show skip after 3s
      timerRef.current = setTimeout(() => setShowSkip(true), 3000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [hasVideo, onComplete]);

  // Fallback text card
  if (!hasVideo) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-8 max-w-xl mx-auto">
        <div className="w-full border border-white/10 bg-white/5 backdrop-blur-sm p-6">
          {clip.title && (
            <h3 className="font-ibm-mono text-[10px] text-neon-cyan/60 tracking-[0.3em] uppercase mb-3">
              {clip.title}
            </h3>
          )}
          <p className="font-ibm-sans text-sm text-white/70 leading-relaxed">
            {clip.fallbackText}
          </p>
        </div>
        <button
          onClick={onComplete}
          className="mt-4 ios-glass-pill px-4 py-2 font-ibm-mono text-xs text-neon-cyan tracking-wider hover:border-neon-cyan/40 transition-colors"
        >
          CONTINUE
        </button>
      </div>
    );
  }

  // Video player
  const videoSrc = clip.uploadPath
    ? resolveUploadUrl(clip.uploadPath)
    : null;

  return (
    <div className="flex flex-col items-center justify-center py-6 px-4 max-w-2xl mx-auto w-full">
      {clip.title && (
        <h3 className="font-ibm-mono text-[10px] text-neon-cyan/60 tracking-[0.3em] uppercase mb-3">
          {clip.title}
        </h3>
      )}

      <div className="w-full aspect-video bg-black/50 border border-white/10 rounded overflow-hidden relative">
        {clip.embedUrl ? (
          <iframe
            src={clip.embedUrl}
            className="absolute inset-0 w-full h-full"
            allow="autoplay; fullscreen"
            allowFullScreen
          />
        ) : videoSrc ? (
          <video
            src={videoSrc}
            className="absolute inset-0 w-full h-full object-contain"
            autoPlay
            onEnded={onComplete}
            controls
          />
        ) : null}
      </div>

      {showSkip && (
        <button
          onClick={onComplete}
          className="mt-4 ios-glass-pill px-4 py-2 font-ibm-mono text-[10px] text-white/40 tracking-wider hover:text-white/60 hover:border-white/30 transition-colors"
        >
          SKIP
        </button>
      )}
    </div>
  );
}
