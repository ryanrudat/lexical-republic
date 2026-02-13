import { useEffect, lazy, Suspense } from 'react';
import { useViewStore } from '../../stores/viewStore';
import ViewTransition from './ViewTransition';
import PearlAnnouncement from '../pearl/PearlAnnouncement';
import type { ViewMode, TerminalApp } from '../../types/views';

const OfficeView = lazy(() => import('../office/OfficeView'));
const TerminalView = lazy(() => import('../terminal/TerminalView'));

interface GameShellProps {
  initialView?: ViewMode;
  initialApp?: TerminalApp;
}

export default function GameShell({ initialView, initialApp }: GameShellProps) {
  const currentView = useViewStore((s) => s.currentView);
  const setView = useViewStore((s) => s.setView);
  const openApp = useViewStore((s) => s.openApp);

  // Set initial view/app on mount (for direct route like /shift/:weekNumber)
  useEffect(() => {
    if (initialView) {
      setView(initialView);
    }
    if (initialApp) {
      openApp(initialApp);
    }
  }, [initialView, initialApp, setView, openApp]);

  return (
    <div className="fixed inset-0 overflow-hidden">
      <Suspense
        fallback={
          <div className="fixed inset-0 bg-terminal-bg flex items-center justify-center">
            <div className="text-center">
              <div className="font-ibm-mono text-terminal-green text-sm animate-pulse tracking-[0.3em]">
                INITIALIZING
              </div>
            </div>
          </div>
        }
      >
        {currentView === 'office' && <OfficeView />}
        {currentView === 'terminal' && <TerminalView />}
      </Suspense>
      <ViewTransition />
      <PearlAnnouncement />
    </div>
  );
}
