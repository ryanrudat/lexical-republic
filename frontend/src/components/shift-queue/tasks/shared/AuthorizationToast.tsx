import { useState, useCallback, useRef } from 'react';

// ─── Variant Config ─────────────────────────────────────────────

type ToastVariant = 'received' | 'verified' | 'filed' | 'authorized' | 'processed';

const VARIANT_CONFIG: Record<ToastVariant, { buttonLabel: string; toastLabel: string; subtitle: string }> = {
  received:   { buttonLabel: 'ACKNOWLEDGE',  toastLabel: 'Submission Received',       subtitle: 'Your input has been logged to Ministry records.' },
  verified:   { buttonLabel: 'PROCEED',      toastLabel: 'Verification Complete',     subtitle: 'Comprehension confirmed. Clearance updated.' },
  filed:      { buttonLabel: 'FILE REPORT',  toastLabel: 'Report Filed',              subtitle: 'This record has been added to your permanent file.' },
  authorized: { buttonLabel: 'SUBMIT',       toastLabel: 'Authorization Granted',     subtitle: 'The Party acknowledges your contribution, Citizen.' },
  processed:  { buttonLabel: 'CONFIRM',      toastLabel: 'Processing Complete',       subtitle: 'Your compliance record has been updated accordingly.' },
};

// ─── Props ──────────────────────────────────────────────────────

interface AuthorizationToastProps {
  variant: ToastVariant;
  onAuthorize: () => void;
  disabled?: boolean;
  /** Custom button label override */
  label?: string;
}

// ─── Component ──────────────────────────────────────────────────

export default function AuthorizationToast({ variant, onAuthorize, disabled = false, label }: AuthorizationToastProps) {
  const [phase, setPhase] = useState<'idle' | 'processing' | 'complete'>('idle');
  const callbackFired = useRef(false);

  const config = VARIANT_CONFIG[variant];
  const buttonLabel = label ?? config.buttonLabel;

  const handleClick = useCallback(() => {
    if (disabled || phase !== 'idle') return;
    callbackFired.current = false;

    setPhase('processing');

    // Processing → complete after ring animation
    setTimeout(() => setPhase('complete'), 1200);

    // Fire callback after full sequence
    setTimeout(() => {
      if (!callbackFired.current) {
        callbackFired.current = true;
        onAuthorize();
      }
    }, 2200);
  }, [disabled, phase, onAuthorize]);

  // ── Idle: show the pOS system button ──
  if (phase === 'idle') {
    return (
      <div className="flex justify-center">
        <button
          onClick={handleClick}
          disabled={disabled}
          className={`
            font-ibm-mono text-xs tracking-[0.25em] uppercase
            px-8 py-3 rounded-xl border-2 transition-all duration-200
            ${disabled
              ? 'border-[#E8E4DC] text-[#B8B3AA] bg-[#FAFAF7] cursor-not-allowed'
              : 'border-sky-400/40 text-sky-700 bg-sky-50/50 hover:border-sky-400 hover:bg-sky-50 hover:shadow-md active:scale-95 active:shadow-none'
            }
          `}
        >
          {buttonLabel}
        </button>
      </div>
    );
  }

  // ── Processing / Complete: show the toast overlay ──
  return (
    <div className="flex flex-col items-center gap-4 py-6">
      {/* PEARL eye with ring */}
      <div className="relative w-24 h-24 flex items-center justify-center">
        {/* Progress ring */}
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 96 96"
        >
          <circle
            cx="48" cy="48" r="44"
            fill="none"
            stroke="rgba(56, 189, 248, 0.15)"
            strokeWidth="2"
          />
          <circle
            cx="48" cy="48" r="44"
            fill="none"
            stroke="rgba(56, 189, 248, 0.8)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 44}
            strokeDashoffset={phase === 'processing' ? 2 * Math.PI * 44 : 0}
            className="transition-[stroke-dashoffset] duration-[1200ms] ease-out"
            style={{ transformOrigin: 'center', transform: 'rotate(-90deg)' }}
          />
        </svg>

        {/* PEARL eye image — circular with feathered edges */}
        <div
          className={`w-16 h-16 rounded-full overflow-hidden transition-all duration-500 ${
            phase === 'processing'
              ? 'animate-pulse scale-100'
              : 'scale-110'
          }`}
          style={{
            maskImage: 'radial-gradient(circle, black 40%, transparent 72%)',
            WebkitMaskImage: 'radial-gradient(circle, black 40%, transparent 72%)',
          }}
        >
          <img
            src="/images/pearl-eye-glow.png"
            alt="P.E.A.R.L."
            className="w-full h-full object-cover"
          />
        </div>

        {/* Checkmark overlay on complete */}
        {phase === 'complete' && (
          <div className="absolute inset-0 flex items-center justify-center animate-auth-check-pop">
            <div className="w-8 h-8 rounded-full bg-emerald-400/90 flex items-center justify-center shadow-lg shadow-emerald-400/30">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8.5L6.5 12L13 4" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* Authorization text */}
      <div className={`text-center transition-all duration-500 ${
        phase === 'complete' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      }`}>
        <p className="font-ibm-mono text-sm text-sky-700 tracking-[0.2em] uppercase font-medium">
          {config.toastLabel}
        </p>
        <p className="font-ibm-mono text-[10px] text-[#8B8578] tracking-wider mt-1.5 max-w-[280px]">
          {config.subtitle}
        </p>
      </div>

      {/* Animation styles */}
      <style>{`
        @keyframes authCheckPop {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.3); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-auth-check-pop {
          animation: authCheckPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
      `}</style>
    </div>
  );
}
