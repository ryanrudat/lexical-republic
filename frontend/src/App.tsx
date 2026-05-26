import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useStudentStore } from './stores/studentStore';
import Login from './pages/Login';
import TeacherDashboard from './pages/TeacherDashboard';
import BootSequence from './components/layout/BootSequence';
import GameShell from './components/layout/GameShell';
import { GUIDED_STUDENT_MODE } from './config/runtimeFlags';
import { connectSocket } from './utils/socket';
import { useSessionPauseStore } from './stores/sessionPauseStore';
import { useShiftQueueStore } from './stores/shiftQueueStore';
import { useShiftStore } from './stores/shiftStore';
import { usePearlStore } from './stores/pearlStore';
import { useMessagingStore } from './stores/messagingStore';
import type { CharacterMessage, ThreadEntry } from './types/shiftQueue';
import WelcomeVideoModal from './components/welcome/WelcomeVideoModal';
import { useSeasonStore } from './stores/seasonStore';
import { useHarmonyStore } from './stores/harmonyStore';
import { useViewStore } from './stores/viewStore';
import ComplianceCheckPreview from './pages/ComplianceCheckPreview';
import RemediationOverlay from './components/remediation/RemediationOverlay';
import RemediationDevTrigger from './components/dev/RemediationDevTrigger';
import PearlInquiryOverlay from './components/spy/PearlInquiryOverlay';
import FunnelDrawer from './components/spy/FunnelDrawer';
import UpdateBanner from './components/system/UpdateBanner';
import { useUpdateChecker } from './hooks/useUpdateChecker';
import TrialDispatchModal from './components/terminal/apps/InscriptionPool/TrialDispatchModal';
import { useInscriptionStore, type PoolFormedPayload } from './stores/inscriptionStore';

export default function App() {
  const { user, loading, refresh } = useStudentStore();
  const [, forceBootRefresh] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();

  // Polls /version.json every 5 min + on tab focus. Flips updateAvailable
  // when the deployed build differs from the running one. UpdateBanner reads
  // the flag and renders at top of screen.
  useUpdateChecker();

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Re-validate session when tab regains focus (e.g. Chromebook waking from sleep,
  // student switching back after long background). Catches expired JWTs early.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        refresh();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [refresh]);

  // Connect student socket as soon as authenticated — makes them visible
  // in the teacher's Live Class Monitor immediately, not just when entering a shift.
  // Socket disconnects on logout (handled in studentStore).
  useEffect(() => {
    if (user && user.role === 'student') {
      const sock = connectSocket({
        designation: user.designation ?? undefined,
        displayName: user.displayName,
      });

      const onError = (err: Error) => {
        console.error('[StudentSocket] connection error:', err.message);
      };
      const onPaused = (data: { message?: string }) => {
        useSessionPauseStore.getState().setPaused(true, data.message);
      };
      const onResumed = () => {
        useSessionPauseStore.getState().setPaused(false);
      };
      const onTaskCommand = async (data: { action: string; taskId?: string }) => {
        const store = useShiftQueueStore.getState();
        const pearl = usePearlStore.getState();

        // If shift queue isn't loaded, try reloading first
        if (!store.weekConfig) {
          pearl.triggerBark('notice', 'SUPERVISOR OVERRIDE: Awaiting shift assignment.');
          return;
        }

        switch (data.action) {
          case 'send-to-task':
            if (data.taskId) {
              await store.goToTask(data.taskId);
              pearl.triggerBark('notice', 'SUPERVISOR OVERRIDE: Reassignment directive received. Redirecting to assigned station.');
            }
            break;
          case 'skip-task':
            await store.skipCurrentTask();
            pearl.triggerBark('notice', 'SUPERVISOR OVERRIDE: Current task has been waived. Proceed to next station.');
            break;
          case 'reset-task':
            store.resetCurrentTask();
            pearl.triggerBark('notice', 'SUPERVISOR OVERRIDE: Task requires re-evaluation. Please begin again.');
            break;
          case 'reset-shift':
            await store.resetShift();
            pearl.triggerBark('notice', 'SUPERVISOR OVERRIDE: Full shift reassessment ordered. Return to Intake.');
            break;
        }
      };

      const onClarityMessage = (data: { message?: CharacterMessage; messageId?: string; entry?: ThreadEntry }) => {
        const messaging = useMessagingStore.getState();
        if (data.message) {
          // New conversation from teacher
          messaging.addIncomingMessage(data.message);
        } else if (data.messageId && data.entry) {
          // Follow-up in existing thread
          messaging.addIncomingThreadEntry(data.messageId, data.entry);
        }
      };

      const onLaneChanged = (data: { lane: number }) => {
        useStudentStore.getState().setLane(data.lane);
        const pearl = usePearlStore.getState();
        pearl.triggerBark('notice', 'CLASSIFICATION UPDATE: Your operational tier has been adjusted by a supervisor.');
      };

      const onGateUpdated = (data: { weekId: string; taskGates: number[] }) => {
        const store = useShiftQueueStore.getState();
        const shiftState = useShiftStore.getState();

        // Only apply if student is currently on this week
        if (shiftState.currentWeek?.id !== data.weekId) return;

        const wasGated = store.gated;
        store.setTaskGates(data.taskGates);

        // If student was gated and is now ungated, notify via PEARL
        if (wasGated && !store.gated) {
          const pearl = usePearlStore.getState();
          pearl.triggerBark('notice', 'PROCESSING AUTHORIZED: Your station has been cleared for the next assignment. Proceed, Citizen.');
        }
      };

      const onShiftChanged = async (data: { weekNumber: number }) => {
        const pearl = usePearlStore.getState();
        useShiftQueueStore.getState().reset();
        await useSeasonStore.getState().loadSeason();
        navigate(`/shift/${data.weekNumber}`, { replace: true });
        pearl.triggerBark('notice', `SUPERVISOR OVERRIDE: Transfer directive received. Report to Shift ${data.weekNumber}.`);
      };

      // Load all existing messages on login so inbox is populated immediately
      void useMessagingStore.getState().loadMessages();

      const onHarmonyNewContent = () => {
        useHarmonyStore.getState().setHasNewContent(true);
        // If Harmony is the currently-open app, refetch so new posts appear live
        // without the student having to sign out and back in.
        if (useViewStore.getState().terminalApp === 'harmony') {
          void useHarmonyStore.getState().loadPosts();
          void useHarmonyStore.getState().loadCensureQueue();
        }
      };

      // ── Inscription Pool socket listeners ──
      const onInscriptionPaused = (data: { drillId: string; pausedAt_ms: number }) => {
        useInscriptionStore.getState().applyServerPaused(data.drillId, data.pausedAt_ms);
      };
      const onInscriptionResumed = (data: { drillId: string; totalPausedMs: number }) => {
        useInscriptionStore.getState().applyServerResumed(data.drillId, data.totalPausedMs);
      };
      const onInscriptionWordComplete = (data: {
        pairId?: string;
        desk?: number;
        wordIdx: number;
        finishedAt_ms: number;
      }) => {
        // Live peer word completion broadcast — useful in Phase 3 multi-citizen pools.
        if (typeof data.desk === 'number') {
          const drillId = useInscriptionStore.getState().drill?.drillId;
          if (drillId) {
            useInscriptionStore.getState().applyDeskWordComplete(drillId, data.desk, data.wordIdx, data.finishedAt_ms);
          }
        }
      };
      const onTrialScheduled = (data: {
        classId: string;
        trialId: string | null;
        startsAt_ms: number;
        durationSec: number;
        wordCount: number;
      }) => {
        useInscriptionStore.getState().setPendingTrial(data);
      };
      const onForceAborted = (data: { drillId: string }) => {
        const store = useInscriptionStore.getState();
        if (store.drill?.drillId === data.drillId) {
          void store.completeDrill({ abandoned: true });
        }
      };
      // ── Live Open Pool matchmaking ──
      const onInscriptionPoolFormed = (data: PoolFormedPayload) => {
        useInscriptionStore.getState().applyPoolFormed(data);
      };
      const onInscriptionQueueUpdate = (data: { count: number; max: number; designations: string[]; formsAt_ms?: number | null }) => {
        useInscriptionStore.getState().applyQueueUpdate(data);
      };
      const onInscriptionParticipantProgress = (data: {
        lobbyId: string;
        pairId: string;
        wordsCorrect: number;
        finishedAt_ms: number | null;
      }) => {
        useInscriptionStore.getState().applyParticipantProgress(data);
      };
      const onInscriptionQueueError = (data: { error: string; message: string; drillId?: string }) => {
        useInscriptionStore.getState().applyQueueError(data);
      };

      sock.on('connect_error', onError);
      sock.on('session:paused', onPaused);
      sock.on('session:resumed', onResumed);
      sock.on('session:task-command', onTaskCommand);
      sock.on('session:lane-changed', onLaneChanged);
      sock.on('session:gate-updated', onGateUpdated);
      sock.on('session:shift-changed', onShiftChanged);
      sock.on('session:clarity-message', onClarityMessage);
      sock.on('harmony:new-content', onHarmonyNewContent);
      sock.on('inscription:paused', onInscriptionPaused);
      sock.on('inscription:resumed', onInscriptionResumed);
      sock.on('inscription:word-complete', onInscriptionWordComplete);
      sock.on('inscription:trial-scheduled', onTrialScheduled);
      sock.on('inscription:force-aborted', onForceAborted);
      sock.on('inscription:pool-formed', onInscriptionPoolFormed);
      sock.on('inscription:queue-update', onInscriptionQueueUpdate);
      sock.on('inscription:participant-progress', onInscriptionParticipantProgress);
      sock.on('inscription:queue-error', onInscriptionQueueError);

      return () => {
        sock.off('connect_error', onError);
        sock.off('session:paused', onPaused);
        sock.off('session:resumed', onResumed);
        sock.off('session:task-command', onTaskCommand);
        sock.off('session:lane-changed', onLaneChanged);
        sock.off('session:gate-updated', onGateUpdated);
        sock.off('session:shift-changed', onShiftChanged);
        sock.off('session:clarity-message', onClarityMessage);
        sock.off('harmony:new-content', onHarmonyNewContent);
        sock.off('inscription:paused', onInscriptionPaused);
        sock.off('inscription:resumed', onInscriptionResumed);
        sock.off('inscription:word-complete', onInscriptionWordComplete);
        sock.off('inscription:trial-scheduled', onTrialScheduled);
        sock.off('inscription:force-aborted', onForceAborted);
        sock.off('inscription:pool-formed', onInscriptionPoolFormed);
        sock.off('inscription:queue-update', onInscriptionQueueUpdate);
        sock.off('inscription:participant-progress', onInscriptionParticipantProgress);
        sock.off('inscription:queue-error', onInscriptionQueueError);
      };
    }
  }, [user?.id, user?.role, user?.designation, user?.displayName, navigate]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-terminal-bg flex items-center justify-center">
        <div className="text-center">
          <div className="font-ibm-mono text-terminal-green text-sm animate-pulse tracking-[0.3em]">
            INITIALIZING
          </div>
          <div className="mt-2 font-ibm-mono text-terminal-green-dim text-xs tracking-wider">
            CONNECTING TO MINISTRY NETWORK...
          </div>
        </div>
      </div>
    );
  }

  if (location.pathname === '/preview/compliance-check') {
    return <ComplianceCheckPreview />;
  }

  if (location.pathname === '/login') {
    if (user) {
      return <Navigate to={user.role === 'teacher' ? '/teacher' : '/'} replace />;
    }
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // Skip boot sequence for teachers; students see it once per session
  const bootSeen = user.role === 'teacher' || sessionStorage.getItem('boot-seen') === '1';

  if (!bootSeen) {
    return <BootSequence onComplete={() => forceBootRefresh((v) => v + 1)} />;
  }

  // Welcome video gate — pairs only, one-time
  const isPair = user.role === 'student' && !!user.pairId;
  if (isPair && user.hasWatchedWelcome === false) {
    return (
      <WelcomeVideoModal
        designation={user.designation}
        onComplete={() => refresh()}
      />
    );
  }

  const studentHome = GUIDED_STUDENT_MODE
    ? <GameShell initialView="office" />
    : <GameShell />;

  return (
    <>
      <Routes>
        {/* Teacher dashboard — only at /teacher, only for teachers */}
        <Route
          path="/teacher"
          element={user.role === 'teacher' ? <TeacherDashboard /> : <Navigate to="/" replace />}
        />
        <Route path="/" element={studentHome} />
        <Route path="/terminal" element={<Navigate to="/" replace />} />
        <Route
          path="/season"
          element={
            GUIDED_STUDENT_MODE
              ? <Navigate to="/" replace />
              : <GameShell initialView="terminal" initialApp="duty-roster" />
          }
        />
        <Route path="/shift/:weekNumber" element={studentHome} />
        <Route path="/shift/:weekNumber/:stepId" element={studentHome} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {/* Remediation Module — global modal mount for students. Renders only when
          useSessionStore.activeRemediation is set; guards on student role to avoid
          mounting in teacher dashboard. */}
      {user.role === 'student' && <RemediationOverlay />}
      {user.role === 'student' && import.meta.env.DEV && <RemediationDevTrigger />}
      {/* PEARL Clarity Inquiry — fires when the dice roll catches a student snooping. */}
      {user.role === 'student' && <PearlInquiryOverlay />}
      {/* [ ].edited funnel drawer — floating covert channel, reachable across the terminal. */}
      {user.role === 'student' && <FunnelDrawer />}
      {/* Sector Trial invite — class-wide modal pops when teacher schedules a Trial. */}
      {user.role === 'student' && <TrialDispatchModal />}
      {/* New-version banner. Self-gates on `updateAvailable` from updateStore. */}
      <UpdateBanner />
    </>
  );
}
