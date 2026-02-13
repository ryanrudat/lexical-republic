import { useStudentStore } from '../../../stores/studentStore';

export default function MyFileApp() {
  const user = useStudentStore((s) => s.user);

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="font-special-elite text-xl text-white/90 tracking-wider ios-text-glow mb-1">
          Citizen File
        </h2>
        <p className="font-ibm-mono text-xs text-white/50 tracking-wider">
          Ministry Personnel Records Division
        </p>
      </div>

      {/* Citizen Info */}
      <div className="ios-glass-card p-6 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-1 bg-neon-cyan" />
          <span className="font-ibm-mono text-[10px] text-neon-cyan/70 tracking-[0.2em] uppercase">
            Identification
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="font-ibm-mono text-[10px] text-white/50 tracking-wider block mb-1">
              DESIGNATION
            </span>
            <span className="font-ibm-mono text-lg text-neon-cyan ios-text-glow">
              {user?.designation || 'UNKNOWN'}
            </span>
          </div>
          <div>
            <span className="font-ibm-mono text-[10px] text-white/50 tracking-wider block mb-1">
              COMPLIANCE LANE
            </span>
            <span className="font-ibm-mono text-lg text-neon-cyan ios-text-glow">
              Lane {user?.lane || '?'}
            </span>
          </div>
          <div>
            <span className="font-ibm-mono text-[10px] text-white/50 tracking-wider block mb-1">
              MERIT POINTS (XP)
            </span>
            <span className="font-ibm-mono text-lg text-white/90">
              {user?.xp || 0}
            </span>
          </div>
          <div>
            <span className="font-ibm-mono text-[10px] text-white/50 tracking-wider block mb-1">
              STREAK
            </span>
            <span className="font-ibm-mono text-lg text-white/90">
              {user?.streak || 0} days
            </span>
          </div>
        </div>
      </div>

      {/* Status */}
      <div className="ios-glass-card p-6 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-1 bg-neon-mint" />
          <span className="font-ibm-mono text-[10px] text-neon-mint/70 tracking-[0.2em] uppercase">
            Standing
          </span>
        </div>

        <div className="flex items-center gap-3 mb-3">
          <div className="w-2 h-2 rounded-full bg-neon-mint animate-pulse" />
          <span className="font-ibm-mono text-sm text-neon-mint tracking-wider">
            GOOD STANDING
          </span>
        </div>
        <p className="font-ibm-mono text-xs text-white/40 tracking-wider">
          No infractions on record. Continue your diligent work, Citizen.
        </p>
      </div>

      {/* Footer */}
      <p className="text-center font-ibm-mono text-[10px] text-white/20 tracking-wider mt-8">
        FILE CLASSIFICATION: STANDARD — ACCESSIBLE BY MINISTRY PERSONNEL
      </p>
    </div>
  );
}
