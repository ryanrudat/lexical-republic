interface Props {
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ShiftGateModal({ onConfirm, onCancel }: Props) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="max-w-md w-full mx-4 rounded-lg border-2 border-[#5BB8B0]/40 bg-[#04181B] p-6 shadow-2xl">
        <p className="font-ibm-mono text-[10px] text-[#5BB88C] tracking-[0.3em] uppercase mb-3">
          P.E.A.R.L. · Notice
        </p>
        <h2 className="font-ibm-mono text-base text-[#D4E8E5] tracking-wider mb-2">
          Citizen, your shift remains in progress.
        </h2>
        <p className="font-ibm-mono text-[11px] text-[#82B0B5] leading-relaxed mb-5">
          Inscription Pool deprioritizes shift completion. The Ministry recommends returning to
          your shift first. Do you wish to proceed?
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded border border-[#5BB8B0]/40 bg-transparent font-ibm-mono text-[11px] text-[#82B0B5] hover:text-[#D4E8E5] hover:border-[#5BB8B0] tracking-wider active:scale-[0.98] transition-colors"
          >
            Return to Shift
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 rounded border border-amber-500/40 bg-amber-500/10 font-ibm-mono text-[11px] text-amber-300 hover:bg-amber-500/20 tracking-wider active:scale-[0.98] transition-colors"
          >
            Proceed
          </button>
        </div>
      </div>
    </div>
  );
}
