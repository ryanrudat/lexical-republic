import { useState } from 'react';
import { useStudentStore } from '../../stores/studentStore';
import { useNavigate } from 'react-router-dom';
import PearlEye from '../pearl/PearlEye';
import PearlPanel from '../pearl/PearlPanel';

// ─── Speaker Icon (inline SVG) ───────────────────────────────
function SpeakerIcon({ muted }: { muted: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Speaker body */}
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" stroke="none" />
      {muted ? (
        /* X mark when muted */
        <>
          <line x1="17" y1="9" x2="23" y2="15" />
          <line x1="23" y1="9" x2="17" y2="15" />
        </>
      ) : (
        /* Sound waves when unmuted */
        <>
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
        </>
      )}
    </svg>
  );
}

// ─── HUD Props ────────────────────────────────────────────────
interface OfficeHUDProps {
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;
}

export default function OfficeHUD({ isMuted, setIsMuted }: OfficeHUDProps) {
  const { user } = useStudentStore();
  const navigate = useNavigate();
  const [pearlOpen, setPearlOpen] = useState(false);

  return (
    <>
      {/* Top bar — ministry title (left), citizen badge (right) */}
      <div className="absolute top-0 left-0 right-0 z-10 px-4 py-3 flex items-center justify-between pointer-events-auto">
        {/* Ministry title */}
        <div className="retro-card px-4 py-2 rounded-lg">
          <h1 className="font-special-elite text-sm text-retro-warm-wood tracking-wider">
            Ministry for Healthy &amp; Safe Communication
          </h1>
        </div>

        {/* Citizen badge + actions */}
        <div className="flex items-center gap-3">
          <div className="retro-card px-3 py-1.5 rounded-lg flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-neon-mint animate-pulse" />
            <span className="font-ibm-mono text-xs text-retro-warm-wood tracking-wider">
              {user?.designation || 'CITIZEN'}
            </span>
          </div>

          {user?.role === 'teacher' && (
            <button
              onClick={() => navigate('/teacher')}
              className="retro-card px-3 py-1.5 rounded-lg font-ibm-mono text-xs text-chrome-dark hover:text-neon-cyan transition-colors"
            >
              Director Panel
            </button>
          )}
        </div>
      </div>

      {/* Bottom bar — happiness (left), volume + PEARL (right) */}
      <div className="absolute bottom-0 left-0 right-0 z-10 px-4 py-3 flex items-center justify-between pointer-events-auto">
        {/* Happiness status — ambient text */}
        <span className="font-ibm-mono text-[10px] text-chrome-dark/50 tracking-[3px]">
          HAPPINESS: OPTIMAL
        </span>

        {/* Volume button + PEARL eye */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="retro-card px-2.5 py-1.5 rounded-lg text-chrome-dark/60 hover:text-neon-cyan transition-colors"
            aria-label={isMuted ? 'Unmute audio' : 'Mute audio'}
            style={{
              boxShadow: isMuted ? undefined : '0 0 8px rgba(0, 229, 255, 0.3)',
            }}
          >
            <SpeakerIcon muted={isMuted} />
          </button>
          <span className="font-ibm-mono text-[10px] text-chrome-dark/40 tracking-wider hidden sm:block">
            P.E.A.R.L.
          </span>
          <PearlEye
            onClick={() => setPearlOpen(!pearlOpen)}
            panelOpen={pearlOpen}
            variant="chrome"
            size="lg"
          />
        </div>
      </div>

      {/* PEARL Panel */}
      <PearlPanel
        open={pearlOpen}
        onClose={() => setPearlOpen(false)}
        variant="chrome"
      />
    </>
  );
}
