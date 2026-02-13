import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useStudentStore } from './stores/studentStore';
import Login from './pages/Login';
import TeacherDashboard from './pages/TeacherDashboard';
import BootSequence from './components/layout/BootSequence';
import GameShell from './components/layout/GameShell';
import { GUIDED_STUDENT_MODE } from './config/runtimeFlags';

export default function App() {
  const { user, loading, refresh } = useStudentStore();
  const [, forceBootRefresh] = useState(0);
  const location = useLocation();

  useEffect(() => {
    refresh();
  }, [refresh]);

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
      return <Navigate to="/" replace />;
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

  // Teachers go straight to their dashboard — no boot sequence, no OfficeView
  if (user.role === 'teacher') {
    return (
      <Routes>
        <Route path="/" element={<TeacherDashboard />} />
        <Route path="/teacher" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  const bootSeen = sessionStorage.getItem('boot-seen') === '1';

  // Show boot sequence once after login
  if (!bootSeen) {
    return <BootSequence onComplete={() => forceBootRefresh((v) => v + 1)} />;
  }

  const studentHome = GUIDED_STUDENT_MODE
    ? <GameShell initialView="office" />
    : <GameShell />;

  return (
    <Routes>
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
