import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useViewStore } from '../../stores/viewStore';
import { useViewTheme } from '../../hooks/useViewTheme';
import { useShiftStore } from '../../stores/shiftStore';
import { usePearlStore } from '../../stores/pearlStore';
import { useSessionStore } from '../../stores/sessionStore';
import TerminalDesktop from './TerminalDesktop';
import TerminalTaskbar from './TerminalTaskbar';
import TerminalAppFrame from './TerminalAppFrame';
import ClarityQueueApp from './apps/ClarityQueueApp';
import DutyRosterApp from './apps/DutyRosterApp';
import HarmonyApp from './apps/HarmonyApp';
import MyFileApp from './apps/MyFileApp';
import PearlEye from '../pearl/PearlEye';
import PearlPanel from '../pearl/PearlPanel';
import DictionarySidebar from '../dictionary/DictionarySidebar';
import DictionaryIcon from '../dictionary/DictionaryIcon';
import SystemAuditOverlay from '../shift/SystemAuditOverlay';

const APP_CONFIG = {
  'clarity-queue': { title: 'Clarity Queue', component: ClarityQueueApp },
  'harmony': { title: 'Harmony', component: HarmonyApp },
  'duty-roster': { title: 'Duty Roster', component: DutyRosterApp },
  'my-file': { title: 'My File', component: MyFileApp },
} as const;

export default function TerminalView() {
  useViewTheme();
  const navigate = useNavigate();
  const terminalApp = useViewStore((s) => s.terminalApp);
  const exitTerminal = useViewStore((s) => s.exitTerminal);
  const returnToDesktop = useViewStore((s) => s.returnToDesktop);
  const currentWeek = useShiftStore((s) => s.currentWeek);
  const eyeState = usePearlStore((s) => s.eyeState);
  const concernScore = useSessionStore((s) => s.concernScore);
  const [pearlOpen, setPearlOpen] = useState(false);
  const handleHome = useCallback(() => {
    returnToDesktop();
    navigate('/', { replace: true });
  }, [returnToDesktop, navigate]);

  const eyeStateLabel: Record<typeof eyeState, string> = {
    welcoming: 'Welcoming',
    attentive: 'Attentive',
    evaluative: 'Evaluative',
    confused: 'Interference',
    alarmed: 'Alarmed',
    frantic: 'Frantic',
    cold: 'Cold',
    breaking: 'Unstable',
    final: 'Final',
  };

  // ESC to exit terminal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && terminalApp === 'desktop') {
        exitTerminal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [terminalApp, exitTerminal]);

  return (
    <div className="fixed inset-0 ios-terminal-bg flex flex-col">
      {/* Ambient glow layers */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 18% 12%, rgba(0,229,255,0.06) 0%, transparent 36%), radial-gradient(circle at 84% 86%, rgba(105,240,174,0.04) 0%, transparent 30%)',
        }}
      />

      {/* Subtle scanline overlay */}
      <div className="ios-scanline-overlay" />

      <div className="relative z-10 flex-1 flex flex-col overflow-hidden">
        <header className="border-b border-white/10 bg-ios-bg/80 backdrop-blur-md px-4 py-2">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={handleHome}
                className="ios-glass-pill font-ibm-mono text-[10px] text-white/60 hover:text-neon-cyan hover:border-neon-cyan/30 px-2.5 py-1.5 tracking-wider transition-all uppercase"
                aria-label="Return to terminal desktop"
              >
                ⌂ HOME
              </button>
              <div>
                <p className="font-ibm-mono text-[10px] text-white/40 tracking-[0.3em] uppercase">
                  Ministry of Healthy and Safe Information
                </p>
                <p className="font-ibm-mono text-xs text-white/80 tracking-wider mt-0.5">
                  Department of Clarity
                  {currentWeek ? ` • Shift ${currentWeek.weekNumber}` : ' • Terminal Standby'}
                </p>
              </div>
            </div>

            {/* Concern counter — only visible when > 0 */}
            {concernScore > 0 && (
              <div className="ios-glass-pill px-2 py-1 flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${
                  concernScore >= 75 ? 'bg-neon-pink animate-pulse' :
                  concernScore >= 50 ? 'bg-terminal-amber animate-pulse' :
                  'bg-terminal-amber'
                }`} />
                <span className="font-ibm-mono text-[8px] text-white/40 tracking-wider uppercase">
                  CONCERN
                </span>
                <span className={`font-dseg7 text-sm tracking-wider tabular-nums ${
                  concernScore >= 75 ? 'text-neon-pink' :
                  concernScore >= 50 ? 'text-terminal-amber' :
                  'text-terminal-amber/70'
                }`}>
                  {String(Math.min(concernScore, 999)).padStart(3, '0')}
                </span>
              </div>
            )}

            {/* Dictionary icon */}
            <DictionaryIcon variant="terminal" />

            <div className="flex items-center gap-2 ios-glass-pill px-2.5 py-1">
              <PearlEye
                onClick={() => setPearlOpen((v) => !v)}
                panelOpen={pearlOpen}
                variant="crt"
                size="md"
              />
              <div className="text-left">
                <p className="font-ibm-mono text-[10px] text-neon-cyan tracking-[0.2em] uppercase">
                  P.E.A.R.L.
                </p>
                <p className="font-ibm-mono text-[10px] text-white/40 tracking-wider">
                  {eyeStateLabel[eyeState]}
                </p>
              </div>
            </div>
          </div>
        </header>

        {terminalApp === 'desktop' ? (
          <TerminalDesktop />
        ) : (
          <TerminalAppFrame
            title={APP_CONFIG[terminalApp as keyof typeof APP_CONFIG]?.title || 'Application'}
          >
            {(() => {
              const config = APP_CONFIG[terminalApp as keyof typeof APP_CONFIG];
              if (!config) return null;
              const AppComponent = config.component;
              return <AppComponent />;
            })()}
          </TerminalAppFrame>
        )}

        {/* Taskbar */}
        <TerminalTaskbar />
      </div>

      <PearlPanel
        open={pearlOpen}
        onClose={() => setPearlOpen(false)}
        variant="crt"
      />

      <DictionarySidebar />

      {/* System Audit Overlay — triggers at concern score 100 */}
      <SystemAuditOverlay />
    </div>
  );
}
