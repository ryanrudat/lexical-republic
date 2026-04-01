import { useState, useCallback, useRef } from 'react';

// ─── Stamp Variants ──────────────────────────────────────────────

type StampVariant = 'confirm' | 'verified' | 'received' | 'reviewed' | 'filed' | 'changed' | 'removed' | 'deny';

const STAMP_STYLES: Record<StampVariant, { label: string; color: string; borderColor: string; bgColor: string; inkColor: string; flashColor: string }> = {
  confirm:  { label: 'CONFIRM',  color: 'text-emerald-700', borderColor: 'border-emerald-600', bgColor: 'bg-emerald-50', inkColor: 'rgba(5,150,105,0.12)',  flashColor: 'rgba(5,150,105,0.25)' },
  verified: { label: 'VERIFIED', color: 'text-emerald-700', borderColor: 'border-emerald-600', bgColor: 'bg-emerald-50', inkColor: 'rgba(5,150,105,0.12)',  flashColor: 'rgba(5,150,105,0.25)' },
  received: { label: 'RECEIVED', color: 'text-sky-700',     borderColor: 'border-sky-600',     bgColor: 'bg-sky-50',     inkColor: 'rgba(14,165,233,0.12)',  flashColor: 'rgba(14,165,233,0.25)' },
  reviewed: { label: 'REVIEWED', color: 'text-sky-700',     borderColor: 'border-sky-600',     bgColor: 'bg-sky-50',     inkColor: 'rgba(14,165,233,0.12)',  flashColor: 'rgba(14,165,233,0.25)' },
  filed:    { label: 'FILED',    color: 'text-sky-700',     borderColor: 'border-sky-600',     bgColor: 'bg-sky-50',     inkColor: 'rgba(14,165,233,0.12)',  flashColor: 'rgba(14,165,233,0.25)' },
  changed:  { label: 'CHANGED',  color: 'text-amber-700',   borderColor: 'border-amber-500',   bgColor: 'bg-amber-50',   inkColor: 'rgba(245,158,11,0.12)', flashColor: 'rgba(245,158,11,0.25)' },
  removed:  { label: 'REMOVED',  color: 'text-rose-700',    borderColor: 'border-rose-500',    bgColor: 'bg-rose-50',    inkColor: 'rgba(225,29,72,0.12)',   flashColor: 'rgba(225,29,72,0.25)' },
  deny:     { label: 'DENY',     color: 'text-rose-700',    borderColor: 'border-rose-500',    bgColor: 'bg-rose-50',    inkColor: 'rgba(225,29,72,0.12)',   flashColor: 'rgba(225,29,72,0.25)' },
};

// ─── Props ───────────────────────────────────────────────────────

interface BureauStampProps {
  variant: StampVariant;
  onStamp: () => void;
  disabled?: boolean;
  /** Custom label override */
  label?: string;
  /** Compact mode for inline stamp choices */
  compact?: boolean;
}

// ─── Component ───────────────────────────────────────────────────

export default function BureauStamp({ variant, onStamp, disabled = false, label, compact = false }: BureauStampProps) {
  const [stamping, setStamping] = useState(false);
  const [stamped, setStamped] = useState(false);
  const [flash, setFlash] = useState(false);
  const rotationRef = useRef(0);

  const style = STAMP_STYLES[variant];
  const displayLabel = label ?? style.label;

  const handleStamp = useCallback(() => {
    if (disabled || stamped) return;

    // Random rotation for organic stamp feel (-4° to 4°)
    rotationRef.current = (Math.random() - 0.5) * 8;

    setStamping(true);

    // Impact: stamp mark + flash + shake
    setTimeout(() => {
      setStamped(true);
      setStamping(false);
      setFlash(true);
      setTimeout(() => setFlash(false), 200);
    }, 300);

    // Callback after settle
    setTimeout(() => {
      onStamp();
    }, 750);
  }, [disabled, stamped, onStamp]);

  if (compact) {
    return (
      <button
        className={`relative font-special-elite tracking-wider border-2 rounded-lg transition-all duration-200 ${
          stamped
            ? `${style.borderColor} ${style.bgColor} ${style.color} scale-95 stamp-ink-spread`
            : stamping
              ? `${style.borderColor} ${style.bgColor} ${style.color} scale-90`
              : disabled
                ? 'border-[#E8E4DC] text-[#B8B3AA] bg-[#FAFAF7] cursor-not-allowed'
                : `border-[#D4CFC6] text-[#4B5563] bg-white hover:${style.borderColor} hover:${style.bgColor} active:scale-95`
        } ${compact ? 'px-4 py-2 text-xs' : 'px-6 py-3 text-sm'}`}
        onClick={handleStamp}
        disabled={disabled || stamped}
      >
        <span className={`inline-block transition-transform duration-200 ${stamping ? 'scale-110' : ''}`}>
          {displayLabel}
        </span>
        {stamped && (
          <span className="absolute inset-0 flex items-center justify-center pointer-events-none animate-fadeIn">
            <span className={`font-special-elite text-[10px] ${style.color} opacity-60 rotate-[-8deg]`}>
              {'\u2714'}
            </span>
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        className={`relative font-special-elite text-base uppercase border-[3px] rounded-lg px-8 py-3.5 transition-all ${
          stamped
            ? `${style.borderColor} ${style.bgColor} ${style.color} stamp-impact-shake`
            : stamping
              ? `${style.borderColor} ${style.bgColor} ${style.color} stamp-pressing`
              : disabled
                ? 'border-[#E8E4DC] text-[#B8B3AA] bg-[#FAFAF7] cursor-not-allowed'
                : `border-[#D4CFC6] text-[#4B5563] bg-white hover:border-[#8B8578] hover:shadow-md active:scale-90 active:shadow-none`
        }`}
        onClick={handleStamp}
        disabled={disabled || stamped}
      >
        {/* Double-line official seal frame */}
        <span className={`absolute inset-1.5 border-2 rounded pointer-events-none transition-colors ${
          stamped || stamping ? style.borderColor : 'border-[#E8E4DC]'
        } ${stamped ? 'opacity-70' : 'opacity-30'}`} />

        {/* Inner accent line */}
        <span className={`absolute inset-[7px] border rounded pointer-events-none transition-colors ${
          stamped || stamping ? style.borderColor : 'border-[#E8E4DC]'
        } ${stamped ? 'opacity-40' : 'opacity-15'}`} />

        {/* Label */}
        <span
          className={`relative z-10 inline-block transition-all duration-200 ${
            stamping ? 'scale-110 translate-y-0.5' : ''
          }`}
          style={{
            letterSpacing: stamped ? '0.3em' : '0.2em',
            textShadow: stamped ? '1px 1px 0 rgba(0,0,0,0.06)' : 'none',
            transition: 'letter-spacing 0.3s ease, text-shadow 0.3s ease, transform 0.2s ease',
          }}
        >
          {displayLabel}
        </span>

        {/* Ink spread effect */}
        {stamped && (
          <span
            className="absolute inset-0 rounded-lg pointer-events-none stamp-ink-bloom"
            style={{
              backgroundColor: style.inkColor,
              transform: `rotate(${rotationRef.current}deg)`,
            }}
          />
        )}

        {/* Impact flash */}
        {flash && (
          <span
            className="absolute inset-0 rounded-lg pointer-events-none stamp-flash"
            style={{ backgroundColor: style.flashColor }}
          />
        )}

        {/* Ministry seal watermark (appears after stamp) */}
        {stamped && (
          <span
            className="absolute inset-0 flex items-center justify-center pointer-events-none stamp-seal-appear"
            style={{ transform: `rotate(${rotationRef.current}deg)` }}
          >
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="opacity-[0.07]">
              <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="24" cy="24" r="16" stroke="currentColor" strokeWidth="0.8" />
              <text x="24" y="27" textAnchor="middle" fontSize="10" fontFamily="Special Elite" fill="currentColor">
                pOS
              </text>
            </svg>
          </span>
        )}
      </button>

      {/* Animation styles */}
      <style>{`
        .stamp-pressing {
          transform: scale(0.85) translateY(2px);
          box-shadow: none;
          transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.15s ease;
        }
        .stamp-impact-shake {
          animation: stampShake 0.08s ease-in-out 2, stampSettle 0.35s ease-out 0.16s;
        }
        @keyframes stampShake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-2px); }
          75% { transform: translateX(2px); }
        }
        @keyframes stampSettle {
          0% { transform: scale(0.92); }
          50% { transform: scale(1.03); }
          100% { transform: scale(1); }
        }
        .stamp-ink-bloom {
          animation: inkBloom 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        @keyframes inkBloom {
          0% { opacity: 0; transform: scale(0.3) rotate(inherit); }
          40% { opacity: 1; transform: scale(1.08) rotate(inherit); }
          100% { opacity: 1; transform: scale(1) rotate(inherit); }
        }
        .stamp-flash {
          animation: stampFlash 0.2s ease-out forwards;
        }
        @keyframes stampFlash {
          0% { opacity: 0; }
          30% { opacity: 0.35; }
          100% { opacity: 0; }
        }
        .stamp-seal-appear {
          animation: sealFadeIn 0.6s ease-out 0.15s both;
        }
        @keyframes sealFadeIn {
          0% { opacity: 0; transform: rotate(inherit) scale(0.6); }
          100% { opacity: 1; transform: rotate(inherit) scale(1); }
        }
        .stamp-ink-spread {
          animation: stampSettle 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

// ─── Stamp Choice (two stamps side by side for classification) ───

interface StampChoiceProps {
  options: { variant: StampVariant; label?: string }[];
  onChoice: (variant: StampVariant) => void;
  selected?: StampVariant | null;
  disabled?: boolean;
}

export function StampChoice({ options, onChoice, selected, disabled }: StampChoiceProps) {
  return (
    <div className="flex gap-3 justify-center">
      {options.map(opt => {
        const style = STAMP_STYLES[opt.variant];
        const isSelected = selected === opt.variant;
        const displayLabel = opt.label ?? style.label;

        return (
          <button
            key={opt.variant}
            className={`relative font-special-elite text-xs tracking-[0.15em] uppercase border-2 rounded-lg px-5 py-2.5 transition-all duration-200 ${
              isSelected
                ? `${style.borderColor} ${style.bgColor} ${style.color} border-[2px] stamp-ink-spread`
                : disabled
                  ? 'border-[#E8E4DC] text-[#B8B3AA] bg-[#FAFAF7] cursor-not-allowed'
                  : `border-[#D4CFC6] text-[#4B5563] bg-white hover:border-[#8B8578] hover:shadow-sm active:scale-95`
            }`}
            onClick={() => !disabled && !isSelected && onChoice(opt.variant)}
            disabled={disabled || isSelected}
          >
            {/* Inner seal frame */}
            <span className={`absolute inset-0.5 border border-dashed rounded-md ${
              isSelected ? style.borderColor : 'border-[#D4CFC6]'
            } opacity-40 pointer-events-none`} />
            <span className="relative z-10">{displayLabel}</span>
          </button>
        );
      })}
    </div>
  );
}
