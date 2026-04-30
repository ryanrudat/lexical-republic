import { useEffect, useRef } from 'react';
import { useSessionStore } from '../../stores/sessionStore';

interface ConcernTooltipProps {
  concernScore: number;
  onClose: () => void;
}

interface ThresholdInfo {
  label: string;
  toneClass: string;
  dotClass: string;
}

const GOOD_STANDING: ThresholdInfo = {
  label: 'GOOD STANDING',
  toneClass: 'text-emerald-400',
  dotClass: 'bg-emerald-400',
};
const MONITORED: ThresholdInfo = {
  label: 'MONITORED',
  toneClass: 'text-amber-400',
  dotClass: 'bg-amber-400',
};
const UNDER_REVIEW: ThresholdInfo = {
  label: 'UNDER REVIEW',
  toneClass: 'text-rose-400',
  dotClass: 'bg-rose-400',
};

/**
 * Resolves the threshold band for a given concern score.
 * Mirrors `concernGaugeColor()` in MyFileApp.tsx but tuned to the dark HUD palette.
 */
function resolveThreshold(score: number): ThresholdInfo {
  if (score >= 3.0) return UNDER_REVIEW;
  if (score >= 1.0) return MONITORED;
  return GOOD_STANDING;
}

function resolveNextThresholdText(score: number): string {
  if (score < 1.0) return `+${(1.0 - score).toFixed(1)} to monitoring`;
  if (score < 3.0) return `+${(3.0 - score).toFixed(1)} to review`;
  return 'Currently under review';
}

/**
 * Compact, frosted/dark tooltip anchored below the concern HUD chip.
 *
 * Behavior:
 * - Closes on outside click (handled by stopPropagation on the panel + a global listener)
 * - Closes on ESC
 *
 * NOTE: Render this INSIDE a `relative` parent so the absolute positioning
 * anchors to the chip, not to the page.
 */
export default function ConcernTooltip({ concernScore, onClose }: ConcernTooltipProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  // Optional rate buffer (Phase 1 Unit 1). May not exist on the store yet.
  const concernRateBuffer = useSessionStore(
    (s) => (s as typeof s & { concernRateBuffer?: number }).concernRateBuffer
  );

  const threshold = resolveThreshold(concernScore);
  const nextText = resolveNextThresholdText(concernScore);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    const handleClick = (e: MouseEvent) => {
      if (!panelRef.current) return;
      if (panelRef.current.contains(e.target as Node)) return;
      onClose();
    };
    window.addEventListener('keydown', handleKey);
    // Mousedown captures earlier than click — avoids races with the chip toggle.
    window.addEventListener('mousedown', handleClick);
    return () => {
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('mousedown', handleClick);
    };
  }, [onClose]);

  return (
    <div
      ref={panelRef}
      role="tooltip"
      className="absolute top-full mt-2 right-0 z-30 w-72 rounded-xl border border-white/10 bg-[#0A0A0A]/95 backdrop-blur-md px-4 py-3 shadow-xl shadow-black/60"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header — score + threshold label */}
      <div className="flex items-baseline justify-between mb-2">
        <span className="font-ibm-mono text-3xl font-bold tracking-wider tabular-nums text-[#D4C5A9]">
          {concernScore.toFixed(1)}
        </span>
        <div className="flex items-center gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full ${threshold.dotClass}`} />
          <span
            className={`font-ibm-mono text-[10px] tracking-[0.2em] uppercase font-semibold ${threshold.toneClass}`}
          >
            {threshold.label}
          </span>
        </div>
      </div>

      {/* Body lines */}
      <div className="space-y-1.5 mb-3">
        {typeof concernRateBuffer === 'number' ? (
          <p className="font-ibm-mono text-[10px] text-[#8B7D65] tracking-wider">
            Recent activity:{' '}
            <span className="text-[#C9944A] tabular-nums">
              {concernRateBuffer >= 0 ? '+' : ''}
              {concernRateBuffer.toFixed(1)}
            </span>{' '}
            over last 30s
          </p>
        ) : null}
        <p className="font-ibm-mono text-[10px] text-[#8B7D65] tracking-wider">
          <span className={threshold.toneClass}>{nextText}</span>
        </p>
      </div>

      {/* Hint — italic, forced-happy PEARL voice */}
      <div className="pt-2 border-t border-white/10">
        <p className="font-ibm-mono text-[10px] italic text-[#5BB88C]/80 leading-relaxed">
          Complete tasks correctly and your readings will naturally normalize, Citizen.
        </p>
      </div>
    </div>
  );
}
