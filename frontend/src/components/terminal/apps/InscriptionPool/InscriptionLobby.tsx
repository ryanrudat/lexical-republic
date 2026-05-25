import { useEffect, useState } from 'react';
import { useInscriptionStore } from '../../../../stores/inscriptionStore';
import { useShiftQueueStore } from '../../../../stores/shiftQueueStore';
import { useShiftStore } from '../../../../stores/shiftStore';
import { useSeasonStore } from '../../../../stores/seasonStore';
import RollOfDistinction from './RollOfDistinction';
import ShiftGateModal from './ShiftGateModal';

// ─── InscriptionLobby ────────────────────────────────────────────
//
// Amber CRT / DOS-typing-tutor register. Pre-drill screen with
// citizen identity, cooldown + solo-cap status, and the mode picker.
// Lives inside .crt-amber-monitor; everything is pixel-mono on black.

interface Props {
  classId: string | null;
}

export default function InscriptionLobby({ classId }: Props) {
  const refreshState = useInscriptionStore((s) => s.refreshState);
  const startDrill = useInscriptionStore((s) => s.startDrill);
  const cooldownRemainingSec = useInscriptionStore((s) => s.cooldownRemainingSec);
  const soloUsedToday = useInscriptionStore((s) => s.soloUsedToday);
  const soloCap = useInscriptionStore((s) => s.soloCap);
  const citizenNumber = useInscriptionStore((s) => s.citizenNumber);
  const loading = useInscriptionStore((s) => s.loading);
  const error = useInscriptionStore((s) => s.error);

  const weekConfig = useShiftQueueStore((s) => s.weekConfig);
  const legacyWeek = useShiftStore((s) => s.currentWeek);
  const weeks = useSeasonStore((s) => s.weeks);

  const inActiveShift = !!weekConfig;
  const inferredWeek =
    weekConfig?.weekNumber ??
    legacyWeek?.weekNumber ??
    (() => {
      if (weeks.length === 0) return 1;
      const unlocked = [...weeks].sort((a, b) => a.weekNumber - b.weekNumber);
      let highest = unlocked[0].weekNumber;
      for (let i = 1; i < unlocked.length; i++) {
        if (unlocked[i - 1].clockedOut) highest = unlocked[i].weekNumber;
        else break;
      }
      return highest;
    })();

  const [showShiftGate, setShowShiftGate] = useState(false);
  const [pendingMode, setPendingMode] = useState<'solo' | 'open' | null>(null);

  useEffect(() => {
    void refreshState();
  }, [refreshState]);

  const launchDrill = (mode: 'solo' | 'open') => {
    void startDrill({ mode, weekNumber: inferredWeek });
  };

  const handleStart = (mode: 'solo' | 'open') => {
    if (inActiveShift) {
      setPendingMode(mode);
      setShowShiftGate(true);
      return;
    }
    launchDrill(mode);
  };

  const cooldownLocked = cooldownRemainingSec > 0;
  const soloCapped = soloUsedToday >= soloCap;
  const cooldownDisplay = cooldownLocked
    ? `${Math.floor(cooldownRemainingSec / 60)}:${String(cooldownRemainingSec % 60).padStart(2, '0')}`
    : 'READY';

  return (
    <div className="crt-amber-monitor h-full overflow-y-auto ios-scroll">
      <div className="max-w-2xl mx-auto px-8 py-10 pixel-mono">
        {/* Title */}
        <p className="amber-text-bright text-[12px] uppercase tracking-[0.4em] text-center mb-1 amber-glow">
          Ministry of Civic Compliance
        </p>
        <p className="amber-text-dim text-[11px] uppercase tracking-[0.3em] text-center mb-6">
          · Lexical Division ·
        </p>

        <h1 className="amber-text-bright text-3xl tracking-[0.2em] uppercase text-center mb-3 amber-glow-strong">
          The Inscription Pool
        </h1>
        <p className="amber-text-dim text-[12px] uppercase tracking-[0.3em] text-center mb-10">
          demonstrate lexical compliance
        </p>

        <div className="border-t border-dashed border-[#FFB000]/40 mb-8" />

        {/* Status strip */}
        <div className="grid grid-cols-3 gap-6 mb-10 text-center">
          <div>
            <p className="amber-text-dim text-[10px] uppercase tracking-[0.3em] mb-2">
              Citizen
            </p>
            <p className="amber-text-bright text-base tracking-wider amber-glow">
              {citizenNumber || 'C-????'}
            </p>
          </div>
          <div>
            <p className="amber-text-dim text-[10px] uppercase tracking-[0.3em] mb-2">
              Cooldown
            </p>
            <p className={`text-base tracking-wider tabular-nums amber-glow ${cooldownLocked ? 'amber-text' : 'amber-text-bright'}`}>
              {cooldownDisplay}
            </p>
          </div>
          <div>
            <p className="amber-text-dim text-[10px] uppercase tracking-[0.3em] mb-2">
              Solo Allocation
            </p>
            <p className={`text-base tracking-wider tabular-nums amber-glow ${soloCapped ? 'amber-text' : 'amber-text-bright'}`}>
              {soloUsedToday} / {soloCap}
            </p>
          </div>
        </div>

        <div className="border-t border-dashed border-[#FFB000]/40 mb-8" />

        {/* Period label */}
        <p className="amber-text-dim text-[12px] uppercase tracking-[0.3em] mb-4">
          &gt; productivity allocation · period {inferredWeek}
        </p>

        {/* Error banner */}
        {error && (
          <div className="mb-6 px-4 py-3 border border-red-500/60 text-red-400 text-[12px] tracking-wider">
            &gt; {error}
          </div>
        )}

        {/* Mode picker */}
        <div className="space-y-6 mb-10">
          <ModeOption
            title="Open Pool"
            description="Race ghosts of recent classmates. Counts for full P.I. + Roll of Distinction."
            disabled={cooldownLocked || loading}
            onClick={() => handleStart('open')}
          />
          <ModeOption
            title="Solo Practice"
            description={
              soloCapped
                ? 'Allocation exhausted for today. Practice continues without P.I. credit.'
                : 'Race against your past-best ghost. Half P.I. weight.'
            }
            disabled={cooldownLocked || loading}
            onClick={() => handleStart('solo')}
          />
        </div>

        {cooldownLocked && (
          <p className="amber-text-dim text-[11px] uppercase tracking-[0.3em] text-center mb-8">
            &gt; cooldown — next drill in {cooldownRemainingSec}s
          </p>
        )}

        {/* Roll of Distinction */}
        {classId && (
          <>
            <div className="border-t border-dashed border-[#FFB000]/40 mb-8" />
            <RollOfDistinction classId={classId} />
          </>
        )}

        <p className="amber-text-faint text-[11px] uppercase tracking-[0.3em] italic text-center mt-10">
          "citizens shall demonstrate lexical compliance through accurate inscription."
        </p>
      </div>

      {showShiftGate && pendingMode && (
        <ShiftGateModal
          onCancel={() => {
            setShowShiftGate(false);
            setPendingMode(null);
          }}
          onConfirm={() => {
            setShowShiftGate(false);
            launchDrill(pendingMode);
            setPendingMode(null);
          }}
        />
      )}
    </div>
  );
}

interface ModeOptionProps {
  title: string;
  description: string;
  disabled: boolean;
  onClick: () => void;
}

function ModeOption({ title, description, disabled, onClick }: ModeOptionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="block w-full text-left disabled:opacity-30 group"
    >
      <p className="amber-text-bright text-lg tracking-[0.15em] uppercase mb-1 group-hover:amber-glow-strong group-disabled:no-underline">
        &gt; [ {title} ]
      </p>
      <p className="amber-text-dim text-[12px] leading-relaxed ml-4">
        {description}
      </p>
    </button>
  );
}
