import { useEffect, useState, useCallback } from 'react';

interface LoreRevealProps {
  text: string;
  onComplete: () => void;
}

/**
 * CRT glitch overlay showing secret narrative easter egg text.
 * Auto-unmounts after 5 seconds with CSS exit animation.
 */
export default function LoreReveal({ text, onComplete }: LoreRevealProps) {
  const [isExiting, setIsExiting] = useState(false);

  const handleExit = useCallback(() => {
    setIsExiting(true);
  }, []);

  // Auto-dismiss after 5 seconds
  useEffect(() => {
    const timer = setTimeout(handleExit, 5000);
    return () => clearTimeout(timer);
  }, [handleExit]);

  const handleTransitionEnd = () => {
    if (isExiting) {
      onComplete();
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm transition-opacity duration-300 ${
        isExiting ? 'opacity-0' : 'opacity-100'
      }`}
      onTransitionEnd={handleTransitionEnd}
      onClick={handleExit}
    >
      {/* Glitch container */}
      <div className="relative max-w-lg mx-4">
        {/* Scanline effect */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-lg">
          <div className="absolute inset-0 animate-scanline-drift opacity-20 bg-gradient-to-b from-transparent via-neon-cyan/10 to-transparent" />
        </div>

        {/* Content card */}
        <div className="ios-glass-card border-neon-cyan/30 p-6 animate-glitch-tear">
          {/* Header */}
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1.5 h-1.5 bg-neon-cyan animate-pulse rounded-full" />
            <span className="font-ibm-mono text-[10px] text-neon-cyan/70 tracking-[0.3em] uppercase">
              Classified Fragment Recovered
            </span>
          </div>

          {/* Lore text */}
          <p className="font-special-elite text-sm text-white/90 leading-relaxed">
            {text}
          </p>

          {/* Footer */}
          <div className="mt-4 pt-3 border-t border-white/10">
            <span className="font-ibm-mono text-[10px] text-white/30 tracking-wider">
              TAP TO DISMISS — AUTO-CLEARING IN 5s
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
