import { useEffect, useState, useCallback } from 'react';
import { useSessionStore } from '../../stores/sessionStore';
import type { GrammarError } from '../../api/ai';

/**
 * Full-screen 5-second penalty overlay triggered at concernScore >= 100.
 * Shows a recent grammar error as micro-learning during the lockout.
 * Uses CSS isExiting + onTransitionEnd for clean unmount (no Framer Motion).
 */
export default function SystemAuditOverlay() {
  const { isAuditActive, lastGrammarError, resetConcern } = useSessionStore();
  const [isExiting, setIsExiting] = useState(false);
  const [countdown, setCountdown] = useState(5);

  const handleExit = useCallback(() => {
    setIsExiting(true);
  }, []);

  // 5-second countdown → exit
  useEffect(() => {
    if (!isAuditActive) return;

    setCountdown(5);
    setIsExiting(false);

    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(interval);
          handleExit();
          return 0;
        }
        return c - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isAuditActive, handleExit]);

  const handleTransitionEnd = () => {
    if (isExiting) {
      resetConcern();
    }
  };

  if (!isAuditActive) return null;

  return (
    <div
      className={`fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-md transition-opacity duration-300 ${
        isExiting ? 'opacity-0' : 'opacity-100'
      }`}
      onTransitionEnd={handleTransitionEnd}
    >
      <div className="text-center max-w-md mx-4">
        {/* Warning icon */}
        <div className="mb-6">
          <div className="w-20 h-20 mx-auto rounded-full border-2 border-terminal-amber/60 flex items-center justify-center animate-pulse">
            <span className="font-dseg7 text-3xl text-terminal-amber">!</span>
          </div>
        </div>

        {/* Title */}
        <h2 className="font-ibm-mono text-lg text-terminal-amber tracking-[0.3em] uppercase mb-2">
          Mandatory System Audit
        </h2>
        <p className="font-ibm-mono text-xs text-white/50 tracking-wider mb-6">
          Compliance threshold exceeded. Processing review...
        </p>

        {/* Micro-learning: show recent grammar error */}
        {lastGrammarError && (
          <AuditFinding error={lastGrammarError} />
        )}

        {/* Countdown */}
        <div className="mt-6">
          <span className="font-dseg7 text-4xl text-terminal-amber tracking-wider">
            {countdown}
          </span>
          <p className="font-ibm-mono text-[10px] text-white/30 tracking-wider mt-2">
            RESUMING IN {countdown} SECOND{countdown !== 1 ? 'S' : ''}
          </p>
        </div>
      </div>
    </div>
  );
}

function AuditFinding({ error }: { error: GrammarError }) {
  return (
    <div className="ios-glass-card border-terminal-amber/20 p-4 text-left">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-1 h-1 bg-terminal-amber" />
        <span className="font-ibm-mono text-[10px] text-terminal-amber/70 tracking-[0.2em] uppercase">
          Audit Finding
        </span>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <span className="font-ibm-mono text-neon-pink line-through">{error.word}</span>
        <span className="font-ibm-mono text-white/40">→</span>
        <span className="font-ibm-mono text-neon-mint">{error.suggestion}</span>
      </div>
      <p className="font-ibm-sans text-xs text-white/60 mt-1">
        {error.explanation}
      </p>
    </div>
  );
}
