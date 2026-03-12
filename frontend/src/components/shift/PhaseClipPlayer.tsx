import { useState, useEffect, useRef } from 'react';
import type { ClipConfig } from '../../types/sessions';
import { resolveUploadUrl } from '../../api/client';
import MonitorPlayer from '../shared/MonitorPlayer';

interface PhaseClipPlayerProps {
  clip: ClipConfig;
  onComplete: () => void;
}

export default function PhaseClipPlayer({ clip, onComplete }: PhaseClipPlayerProps) {
  const [showSkip, setShowSkip] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasVideo = clip.embedUrl || clip.uploadPath;

  // Auto-advance for fallback text (3s), show skip after 3s for video
  useEffect(() => {
    if (!hasVideo) {
      timerRef.current = setTimeout(onComplete, 3000);
      setShowSkip(true);
    } else {
      timerRef.current = setTimeout(() => setShowSkip(true), 3000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [hasVideo, onComplete]);

  // Fallback text — shown inside the CRT monitor
  if (!hasVideo) {
    return (
      <div className="flex flex-col items-center justify-center py-6 px-4 max-w-2xl mx-auto w-full">
        <MonitorPlayer
          screenOverlay={
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {clip.title && (
                <h3
                  className="font-ibm-mono text-[10px] sm:text-xs tracking-[0.3em] uppercase mb-3"
                  style={{ color: '#5a8a6a' }}
                >
                  {clip.title}
                </h3>
              )}
              <p
                className="font-ibm-mono text-xs sm:text-sm leading-relaxed max-w-[80%] text-center"
                style={{ color: '#00ff88' }}
              >
                {clip.fallbackText}
              </p>
            </div>
          }
        />
        {showSkip && (
          <button
            onClick={onComplete}
            className="mt-3 font-ibm-mono text-[10px] tracking-[0.2em] uppercase px-4 py-2 border rounded transition-all active:scale-95"
            style={{
              borderColor: '#00cc6a',
              color: '#00ff88',
              background: 'rgba(0, 40, 0, 0.6)',
            }}
          >
            CONTINUE
          </button>
        )}
      </div>
    );
  }

  // Video player inside CRT monitor
  const videoSrc = clip.uploadPath
    ? resolveUploadUrl(clip.uploadPath)
    : undefined;

  return (
    <div className="flex flex-col items-center justify-center py-6 px-4 max-w-2xl mx-auto w-full">
      <MonitorPlayer
        src={videoSrc}
        embedUrl={clip.embedUrl || undefined}
        autoPlay
        onEnded={onComplete}
      />
      {showSkip && (
        <button
          onClick={onComplete}
          className="mt-3 font-ibm-mono text-[10px] tracking-[0.2em] uppercase px-4 py-2 border rounded transition-all active:scale-95 opacity-60 hover:opacity-100"
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
