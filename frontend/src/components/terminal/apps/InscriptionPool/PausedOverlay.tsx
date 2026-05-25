export default function PausedOverlay() {
  return (
    <div className="absolute inset-0 z-[40] flex items-center justify-center bg-black/90 backdrop-blur-sm pointer-events-auto">
      <div className="crt-amber-monitor max-w-md w-full mx-4 px-8 py-8 pixel-mono border border-[#FFB000]/60 text-center">
        <p className="amber-text-bright text-[12px] uppercase tracking-[0.4em] amber-glow mb-4">
          ◇ paused by administrator ◇
        </p>
        <h2 className="amber-text-bright text-xl uppercase tracking-[0.2em] amber-glow-strong mb-4">
          Inscription Paused
        </h2>
        <p className="amber-text-dim text-[12px] uppercase tracking-[0.3em] leading-relaxed">
          drill paused for administrative review.<br />
          resume imminent, citizen.
        </p>
      </div>
    </div>
  );
}
