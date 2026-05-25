interface Props {
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ShiftGateModal({ onConfirm, onCancel }: Props) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 backdrop-blur-sm">
      <div className="crt-amber-monitor max-w-md w-full mx-4 px-8 py-7 pixel-mono border border-[#FFB000]/60">
        <p className="amber-text-bright text-[12px] uppercase tracking-[0.4em] amber-glow mb-3">
          &gt; ministry notice
        </p>
        <p className="amber-text text-base mb-3">
          citizen, your shift remains in progress.
        </p>
        <p className="amber-text-dim text-[12px] uppercase tracking-[0.3em] leading-relaxed mb-6">
          inscription pool deprioritizes shift completion. the ministry
          recommends returning to your shift first.
        </p>
        <div className="flex gap-6">
          <button
            type="button"
            onClick={onCancel}
            className="amber-text hover:amber-text-bright text-[12px] uppercase tracking-[0.3em]"
          >
            [ return to shift ]
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="amber-text-dim hover:amber-text text-[12px] uppercase tracking-[0.3em] ml-auto"
          >
            [ proceed ]
          </button>
        </div>
      </div>
    </div>
  );
}
