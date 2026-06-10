import { useEffect, useState } from 'react';
import { useInscriptionStore } from '../../../../stores/inscriptionStore';
import { useShiftQueueStore } from '../../../../stores/shiftQueueStore';
import { useShiftStore } from '../../../../stores/shiftStore';
import { useSeasonStore } from '../../../../stores/seasonStore';
import { getHighestUnlockedWeek } from '../../../../utils/weekUnlock';
import RollOfDistinction from './RollOfDistinction';
import ShiftGateModal from './ShiftGateModal';

// ─── InscriptionLobby ────────────────────────────────────────────
//
// Amber CRT / DOS-typing-tutor register. Pre-drill screen with
// citizen identity, cooldown + solo-cap status, and the mode picker.
// Lives inside .crt-phosphor-monitor; everything is pixel-mono on black.

interface Props {
  classId: string | null;
}

export default function InscriptionLobby({ classId }: Props) {
  const refreshState = useInscriptionStore((s) => s.refreshState);
  const startDrill = useInscriptionStore((s) => s.startDrill);
  const joinQueue = useInscriptionStore((s) => s.joinQueue);
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
    getHighestUnlockedWeek(weeks);

  const [showShiftGate, setShowShiftGate] = useState(false);
  const [pendingMode, setPendingMode] = useState<'solo' | 'open' | null>(null);

  useEffect(() => {
    void refreshState();
  }, [refreshState]);

  const launchDrill = (mode: 'solo' | 'open') => {
    if (mode === 'open') {
      // Live Open Pool: join the matchmaking queue (waiting room → synced race).
      joinQueue(inferredWeek);
    } else {
      void startDrill({ mode, weekNumber: inferredWeek });
    }
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
    <div className="crt-phosphor-monitor h-full min-h-full flex flex-col overflow-y-auto ios-scroll">
      <div className="max-w-xl mx-auto px-6 py-5 pixel-mono flex-1 w-full">
        {/* Compact header — single status bar across the top */}
        <div className="flex items-baseline justify-between mb-1">
          <p className="phosphor-text-bright text-[11px] uppercase tracking-[0.3em] phosphor-glow">
            ▸ Inscription Pool
          </p>
          <p className="phosphor-text-dim text-[10px] uppercase tracking-[0.3em]">
            ministry · lexical division
          </p>
        </div>
        <p className="phosphor-text-dim text-[10px] uppercase tracking-[0.3em] mb-5">
          demonstrate lexical compliance · period {inferredWeek}
        </p>

        <div className="border-t border-dashed border-[#1F8540] mb-5" />

        {/* Status strip — single row, compact */}
        <div className="grid grid-cols-3 gap-3 mb-6 text-center text-[11px]">
          <div>
            <p className="phosphor-text-dim uppercase tracking-[0.25em] mb-1">Citizen</p>
            <p className="phosphor-text-bright tracking-wider phosphor-glow tabular-nums">
              {citizenNumber || 'C-????'}
            </p>
          </div>
          <div>
            <p className="phosphor-text-dim uppercase tracking-[0.25em] mb-1">Cooldown</p>
            <p className={`tracking-wider tabular-nums phosphor-glow ${cooldownLocked ? 'phosphor-text' : 'phosphor-text-bright'}`}>
              {cooldownDisplay}
            </p>
          </div>
          <div>
            <p className="phosphor-text-dim uppercase tracking-[0.25em] mb-1">Solo</p>
            <p className={`tracking-wider tabular-nums phosphor-glow ${soloCapped ? 'phosphor-text' : 'phosphor-text-bright'}`}>
              {soloUsedToday} / {soloCap}
            </p>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-4 px-3 py-2 border border-red-500/60 text-red-400 text-[11px] tracking-wider">
            &gt; {error}
          </div>
        )}

        {/* Mode picker — bordered button cards so they read as clickable */}
        <p className="phosphor-text-dim text-[10px] uppercase tracking-[0.3em] mb-2">
          &gt; select mode
        </p>
        <div className="space-y-2 mb-5">
          <ModeOption
            keyLabel="1"
            title="Open Pool"
            description="race classmates live · full p.i. + roll of distinction"
            disabled={loading}
            onClick={() => handleStart('open')}
          />
          <ModeOption
            keyLabel="2"
            title="Solo Practice"
            description={
              soloCapped
                ? 'allocation exhausted · practice without p.i. credit'
                : 'race your past-best ghost · half p.i. weight'
            }
            disabled={cooldownLocked || loading}
            onClick={() => handleStart('solo')}
          />
        </div>

        {cooldownLocked && (
          <p className="phosphor-text-dim text-[10px] uppercase tracking-[0.3em] text-center mb-5">
            &gt; cooldown — next drill in {cooldownRemainingSec}s
          </p>
        )}

        {/* Roll of Distinction */}
        {classId && (
          <>
            <div className="border-t border-dashed border-[#1F8540] mb-5" />
            <RollOfDistinction classId={classId} />
          </>
        )}

        <p className="phosphor-text-faint text-[10px] uppercase tracking-[0.3em] italic text-center mt-6">
          "demonstrate compliance through accurate inscription."
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
  keyLabel: string;
  title: string;
  description: string;
  disabled: boolean;
  onClick: () => void;
}

// Mode option — bordered card with hover affordance so it reads as
// clickable. Numbered prefix (e.g. "[1]") makes the picker feel like
// a real DOS menu rather than a list of text links.
function ModeOption({ keyLabel, title, description, disabled, onClick }: ModeOptionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="block w-full text-left px-4 py-3 border border-[#1F8540] hover:border-[#33CC66] hover:bg-[#33CC66]/5 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:border-[#1F8540] transition-colors group"
    >
      <p className="phosphor-text-bright text-base tracking-[0.15em] uppercase group-hover:phosphor-glow">
        <span className="phosphor-text-dim mr-2">[{keyLabel}]</span>
        {title}
      </p>
      <p className="phosphor-text-dim text-[11px] leading-relaxed mt-1 ml-7 uppercase tracking-[0.15em]">
        {description}
      </p>
    </button>
  );
}
