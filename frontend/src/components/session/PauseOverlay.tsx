import { useSessionPauseStore } from '../../stores/sessionPauseStore';

export default function PauseOverlay() {
  const { paused, message } = useSessionPauseStore();

  if (!paused) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center pointer-events-auto">
      {/* PEARL eye — wide gaze state */}
      <div className="mb-8">
        <div className="w-20 h-20 rounded-full border-2 border-neon-mint/60 flex items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-neon-mint/20 border border-neon-mint/40 flex items-center justify-center">
            <div className="w-4 h-4 rounded-full bg-neon-mint/80" />
          </div>
        </div>
      </div>

      {/* Message */}
      <div className="max-w-lg text-center px-6">
        <p className="font-ibm-mono text-neon-mint text-sm tracking-[0.3em] leading-relaxed uppercase">
          {message || 'SESSION PAUSED'}
        </p>
      </div>

      {/* Scanning line animation */}
      <div className="mt-10 w-48 h-px bg-neon-mint/20 relative overflow-hidden">
        <div className="absolute inset-y-0 w-12 bg-neon-mint/40 animate-scan-line" />
      </div>

      <p className="mt-6 font-ibm-mono text-[10px] text-white/20 tracking-[0.2em]">
        AWAITING SUPERVISOR SIGNAL
      </p>
    </div>
  );
}
