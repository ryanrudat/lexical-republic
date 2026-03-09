import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useStudentStore } from './stores/studentStore';
import Login from './pages/Login';
import TeacherDashboard from './pages/TeacherDashboard';
import BootSequence from './components/layout/BootSequence';
import GameShell from './components/layout/GameShell';
import { GUIDED_STUDENT_MODE } from './config/runtimeFlags';
import { connectSocket } from './utils/socket';
import { useSessionPauseStore } from './stores/sessionPauseStore';
import { useShiftQueueStore } from './stores/shiftQueueStore';
import { usePearlStore } from './stores/pearlStore';
import WelcomeVideoModal from './components/welcome/WelcomeVideoModal';

export default function App() {
  const { user, loading, refresh } = useStudentStore();
  const [, forceBootRefresh] = useState(0);
  const location = useLocation();

  useEffect(() => {
    refresh();
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
      const onTaskCommand = (data: { action: string; taskId?: string }) => {
        const store = useShiftQueueStore.getState();
        const pearl = usePearlStore.getState();
        switch (data.action) {
          case 'send-to-task':
            if (data.taskId) {
              store.goToTask(data.taskId);
              pearl.triggerBark('notice', 'SUPERVISOR OVERRIDE: Reassignment directive received. Redirecting to assigned station.');
            }
            break;
          case 'skip-task':
            store.skipCurrentTask();
            pearl.triggerBark('notice', 'SUPERVISOR OVERRIDE: Current task has been waived. Proceed to next station.');
            break;
          case 'reset-task':
            store.resetCurrentTask();
            pearl.triggerBark('notice', 'SUPERVISOR OVERRIDE: Task requires re-evaluation. Please begin again.');
            break;
          case 'reset-shift':
            store.resetShift();
            pearl.triggerBark('notice', 'SUPERVISOR OVERRIDE: Full shift reassessment ordered. Return to Intake.');
            break;
        }
      };

      sock.on('connect_error', onError);
      sock.on('session:paused', onPaused);
      sock.on('session:resumed', onResumed);
      sock.on('session:task-command', onTaskCommand);

      return () => {
        sock.off('connect_error', onError);
        sock.off('session:paused', onPaused);
        sock.off('session:resumed', onResumed);
        sock.off('session:task-command', onTaskCommand);
      };
    }
  }, [user?.id, user?.role, user?.designation, user?.displayName]);

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
  );
}
