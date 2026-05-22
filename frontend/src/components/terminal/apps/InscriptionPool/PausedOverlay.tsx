export default function PausedOverlay() {
  return (
    <div className="absolute inset-0 z-[40] flex items-center justify-center bg-black/80 backdrop-blur-sm pointer-events-auto">
      <div className="max-w-md w-full mx-4 rounded-lg border-2 border-amber-500/50 bg-[#04181B] p-6 shadow-2xl text-center">
        <p className="font-ibm-mono text-[11px] text-amber-300 tracking-[0.4em] uppercase mb-3">
          ◇ Paused by Administrator ◇
        </p>
        <h2 className="font-ibm-mono text-lg text-[#D4E8E5] tracking-[0.15em] uppercase mb-2">
          Inscription Paused
        </h2>
        <p className="font-ibm-mono text-[11px] text-[#82B0B5] leading-relaxed">
          Inscription Drill paused for administrative review.<br />
          Resume imminent, Citizen.
        </p>
      </div>
    </div>
  );
}
