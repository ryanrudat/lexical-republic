import { useEffect, useRef, lazy, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useShiftStore } from '../../../stores/shiftStore';
import { useSeasonStore } from '../../../stores/seasonStore';
import { usePearlStore } from '../../../stores/pearlStore';
import StepNav from '../../shift/StepNav';
import LocationTabs from '../../shift/LocationTabs';
import type { StepId } from '../../../types/shifts';
import { STEP_ORDER } from '../../../types/shifts';
import { GUIDED_STUDENT_MODE } from '../../../config/runtimeFlags';
import { connectSocket, joinWeekRoom, leaveWeekRoom, getSocket } from '../../../utils/socket';
import { useStudentStore } from '../../../stores/studentStore';

const RecapStep = lazy(() => import('../../shift/RecapStep'));
const BriefingStep = lazy(() => import('../../shift/BriefingStep'));
const GrammarStep = lazy(() => import('../../shift/GrammarStep'));
const ListeningStep = lazy(() => import('../../shift/ListeningStep'));
const VoiceLogStep = lazy(() => import('../../shift/VoiceLogStep'));
const CaseFileStep = lazy(() => import('../../shift/CaseFileStep'));
const ClockOutStep = lazy(() => import('../../shift/ClockOutStep'));

const STEP_COMPONENTS: Record<StepId, React.LazyExoticComponent<React.ComponentType>> = {
  recap: RecapStep,
  briefing: BriefingStep,
  grammar: GrammarStep,
  listening: ListeningStep,
  voice_log: VoiceLogStep,
  case_file: CaseFileStep,
  clock_out: ClockOutStep,
};

function getFirstUnlockedWeekNumber(weeks: Array<{ weekNumber: number; clockedOut: boolean }>): number | null {
  if (weeks.length === 0) return null;
  const sorted = [...weeks].sort((a, b) => a.weekNumber - b.weekNumber);
  let unlocked = sorted[0].weekNumber;

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i - 1].clockedOut) {
      unlocked = sorted[i].weekNumber;
    } else {
      break;
    }
  }

  return unlocked;
}

export default function ClarityQueueApp() {
  const { weekNumber, stepId } = useParams<{ weekNumber?: string; stepId?: string }>();
  const navigate = useNavigate();
  const { currentWeek, currentStepId, loading, error, loadWeek, setCurrentStep } = useShiftStore();
  const weeks = useSeasonStore((s) => s.weeks);
  const loadSeason = useSeasonStore((s) => s.loadSeason);
  const setEyeStateFromWeek = usePearlStore((s) => s.setEyeStateFromWeek);
  const user = useStudentStore((s) => s.user);

  useEffect(() => {
    if (weeks.length === 0) loadSeason();
  }, [weeks.length, loadSeason]);

  useEffect(() => {
    if (weekNumber || weeks.length === 0) return;
    const unlockedWeek = getFirstUnlockedWeekNumber(weeks);
    if (!unlockedWeek) return;
    navigate(`/shift/${unlockedWeek}`, { replace: true });
  }, [weekNumber, weeks, navigate]);

  const currentWeekIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!weekNumber || weeks.length === 0) return;
    const weekNum = parseInt(weekNumber, 10);
    if (GUIDED_STUDENT_MODE) {
      const unlockedWeek = getFirstUnlockedWeekNumber(weeks);
      if (unlockedWeek && weekNum > unlockedWeek) {
        navigate(`/shift/${unlockedWeek}`, { replace: true });
        return;
      }
    }
    const weekSummary = weeks.find((w) => w.weekNumber === weekNum);
    if (weekSummary && (!currentWeek || currentWeek.weekNumber !== weekNum)) {
      loadWeek(weekSummary.id);
    }
    setEyeStateFromWeek(weekNum);

    // Socket: join week room for real-time updates
    if (weekSummary) {
      if (currentWeekIdRef.current && currentWeekIdRef.current !== weekSummary.id) {
        leaveWeekRoom(currentWeekIdRef.current);
      }
      const sock = connectSocket({
        designation: user?.designation ?? undefined,
        displayName: user?.displayName,
      });
      joinWeekRoom(weekSummary.id);
      currentWeekIdRef.current = weekSummary.id;

      // Notify teacher dashboard of shift entry (wait for connection if needed)
      const emitEnter = () => sock.emit('student:enter-shift', { weekNumber: weekNum });
      if (sock.connected) {
        emitEnter();
      } else {
        sock.once('connect', emitEnter);
      }
    }
  }, [weekNumber, weeks, currentWeek, loadWeek, setEyeStateFromWeek, navigate, user]);

  useEffect(() => {
    return () => {
      if (currentWeekIdRef.current) {
        leaveWeekRoom(currentWeekIdRef.current);
      }
      // Socket stays connected at app level — disconnect happens on logout
    };
  }, []);

  useEffect(() => {
    if (stepId && STEP_ORDER.some((s) => s.id === stepId)) {
      setCurrentStep(stepId as StepId);
    }
  }, [stepId, setCurrentStep]);

  useEffect(() => {
    if (weekNumber && currentStepId) {
      const expectedPath = `/shift/${weekNumber}/${currentStepId}`;
      if (window.location.pathname !== expectedPath) {
        navigate(expectedPath, { replace: true });
      }

      // Notify teacher dashboard of step change
      const sock = getSocket();
      if (sock) {
        const emitStep = () => sock.emit('student:change-step', { stepId: currentStepId });
        if (sock.connected) {
          emitStep();
        } else {
          sock.once('connect', emitStep);
        }
      }
    }
  }, [weekNumber, currentStepId, navigate]);

  // If no weekNumber in URL, show a prompt to select from duty roster
  if (!weekNumber) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-12 gap-4">
        <p className="font-ibm-mono text-neon-cyan text-sm tracking-wider ios-text-glow">
          {GUIDED_STUDENT_MODE ? 'Preparing your assigned shift...' : 'No shift selected.'}
        </p>
        <p className="font-ibm-mono text-xs text-white/50 tracking-wider">
          {GUIDED_STUDENT_MODE
            ? 'Loading the first unlocked shift.'
            : 'Select a shift from the Duty Roster to begin.'}
        </p>
      </div>
    );
  }

  const StepComponent = STEP_COMPONENTS[currentStepId];
  const currentStepLabel = STEP_ORDER.find((step) => step.id === currentStepId)?.label || 'Current Step';

  return (
    <div className="flex flex-col min-h-full">
      {loading ? (
        <div className="flex-1 flex items-center justify-center py-20">
          <div className="font-ibm-mono text-neon-cyan text-sm animate-pulse tracking-[0.3em]">
            LOADING SHIFT DATA...
          </div>
        </div>
      ) : error ? (
        <div className="flex-1 flex items-center justify-center py-20">
          <div className="text-center">
            <div className="font-ibm-mono text-neon-pink text-sm tracking-wider">{error}</div>
          </div>
        </div>
      ) : currentWeek ? (
        <>
          {/* Week header */}
          <div className="text-center py-4 px-6 border-b border-white/10">
            <div className="flex items-center justify-center gap-3 mb-1">
              <span className="font-ibm-mono text-xs text-white/50 tracking-wider">
                SHIFT {currentWeek.weekNumber}
              </span>
            </div>
            <h1 className="font-special-elite text-xl text-white/90 tracking-wider ios-text-glow">
              {currentWeek.title}
            </h1>
            {currentWeek.description && (
              <p className="font-ibm-mono text-xs text-white/40 mt-1 tracking-wider max-w-lg mx-auto">
                {currentWeek.description}
              </p>
            )}
          </div>

          {GUIDED_STUDENT_MODE ? (
            <div className="border-b border-white/10 px-6 py-1.5 text-center">
              <p className="font-ibm-mono text-xs text-neon-cyan/70 tracking-wider">
                {currentStepLabel}
              </p>
            </div>
          ) : (
            <>
              {/* Location tabs */}
              <LocationTabs interactive />

              {/* Step navigation */}
              <StepNav interactive />
            </>
          )}

          {/* Step content */}
          <div className="flex-1 px-6 py-6 max-w-3xl mx-auto w-full">
            <Suspense
              fallback={
                <div className="flex items-center justify-center py-12">
                  <div className="font-ibm-mono text-neon-cyan text-xs animate-pulse tracking-[0.2em]">
                    LOADING MODULE...
                  </div>
                </div>
              }
            >
              <StepComponent />
            </Suspense>
          </div>
        </>
      ) : null}
    </div>
  );
}
