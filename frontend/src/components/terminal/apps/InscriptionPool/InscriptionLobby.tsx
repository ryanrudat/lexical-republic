import { useEffect, useState } from 'react';
import { useInscriptionStore } from '../../../../stores/inscriptionStore';
import { useShiftQueueStore } from '../../../../stores/shiftQueueStore';
import { useShiftStore } from '../../../../stores/shiftStore';
import { useSeasonStore } from '../../../../stores/seasonStore';
import RollOfDistinction from './RollOfDistinction';
import ShiftGateModal from './ShiftGateModal';

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

  // Resolve current week: prefer active shift queue, then legacy shift, then highest unlocked
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

  return (
    <div className="h-full overflow-y-auto px-6 py-6 ios-scroll crt-monitor-screen">
      <div className="max-w-3xl mx-auto space-y-6 relative z-[1]">
        {/* Header */}
        <header className="text-center mb-2">
          <p className="font-ibm-mono text-[10px] text-[#5BB88C] tracking-[0.4em] uppercase mb-2">
            Ministry of Civic Compliance · Lexical Division
          </p>
          <h1 className="font-ibm-mono text-2xl text-[#D4E8E5] tracking-[0.2em] uppercase">
            The Inscription Pool
          </h1>
          <p className="font-ibm-mono text-[10px] text-[#82B0B5] tracking-wider mt-2">
            Demonstrate Lexical Compliance, {citizenNumber || 'Citizen'}.
          </p>
        </header>

        {/* Status strip */}
        <div className="rounded-lg border border-[#5BB8B0]/30 bg-[#04181B]/60 p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
          <div>
            <p className="font-ibm-mono text-[9px] text-[#5BB88C] tracking-[0.3em] uppercase mb-1">
              Citizen
            </p>
            <p className="font-ibm-mono text-base text-[#D4E8E5] tracking-wider">
              {citizenNumber || 'C-????'}
            </p>
          </div>
          <div>
            <p className="font-ibm-mono text-[9px] text-[#5BB88C] tracking-[0.3em] uppercase mb-1">
              Cooldown
            </p>
            <p className="font-ibm-mono text-base text-[#D4E8E5] tracking-wider tabular-nums">
              {cooldownLocked
                ? `${Math.floor(cooldownRemainingSec / 60)}:${String(cooldownRemainingSec % 60).padStart(2, '0')}`
                : 'Ready'}
            </p>
          </div>
          <div>
            <p className="font-ibm-mono text-[9px] text-[#5BB88C] tracking-[0.3em] uppercase mb-1">
              Solo Allocation
            </p>
            <p className={`font-ibm-mono text-base tracking-wider tabular-nums ${soloCapped ? 'text-amber-300' : 'text-[#D4E8E5]'}`}>
              {soloUsedToday} / {soloCap}
            </p>
          </div>
        </div>

        {/* Mode picker */}
        <section className="rounded-lg border border-[#5BB8B0]/30 bg-[#0A2A2E]/50 p-5">
          <p className="font-ibm-mono text-[10px] text-[#5BB88C] tracking-[0.3em] uppercase mb-4">
            Productivity Allocation · Period {inferredWeek}
          </p>

          {error && (
            <div className="mb-4 px-3 py-2 rounded border border-rose-500/40 bg-rose-500/10 font-ibm-mono text-[11px] text-rose-300">
              {error}
            </div>
          )}

          <div className="grid gap-3">
            <ModeButton
              title="Open Pool"
              description="Race ghosts of recent classmates. Counts for full P.I. + Roll of Distinction."
              tier="amber"
              disabled={cooldownLocked || loading}
              onClick={() => handleStart('open')}
            />
            <ModeButton
              title="Solo Practice"
              description={
                soloCapped
                  ? 'Allocation exhausted for today. Practice continues without P.I. credit.'
                  : 'Race against your past-best ghost. Half P.I. weight.'
              }
              tier="sky"
              disabled={cooldownLocked || loading}
              onClick={() => handleStart('solo')}
            />
          </div>

          {cooldownLocked && (
            <p className="font-ibm-mono text-[10px] text-amber-300 tracking-wider mt-3 text-center">
              Productivity Allocation cooldown — next drill in {cooldownRemainingSec}s.
            </p>
          )}
        </section>

        {/* Roll of Distinction */}
        {classId && <RollOfDistinction classId={classId} />}

        <p className="font-ibm-mono text-[9px] text-[#5BB88C]/70 tracking-wider text-center italic">
          "Citizens shall demonstrate lexical compliance through accurate inscription."
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

interface ModeButtonProps {
  title: string;
  description: string;
  tier: 'sky' | 'amber';
  disabled: boolean;
  onClick: () => void;
}

function ModeButton({ title, description, tier, disabled, onClick }: ModeButtonProps) {
  const tierClasses =
    tier === 'amber'
      ? 'border-amber-500/40 hover:border-amber-300 active:bg-amber-500/15'
      : 'border-sky-500/40 hover:border-sky-300 active:bg-sky-500/15';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`text-left rounded-md border ${tierClasses} bg-[#04181B]/40 px-4 py-3 transition-colors disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.98]`}
    >
      <p className="font-ibm-mono text-sm text-[#D4E8E5] tracking-wider uppercase mb-1">
        {title}
      </p>
      <p className="font-ibm-mono text-[11px] text-[#82B0B5] leading-relaxed">{description}</p>
    </button>
  );
}
