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
import MessagingPanel from '../messaging/MessagingPanel';
import MessageNotification from '../messaging/MessageNotification';
import MessageBadge from '../messaging/MessageBadge';
import { useMessagingStore } from '../../stores/messagingStore';

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
      {/* Subtle ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 50% 40%, rgba(0,0,0,0.3) 0%, transparent 70%)',
        }}
      />

      {/* Digital grid lines */}
      <div className="retro-grid-overlay" />

      {/* Horizontal glitch scan line */}
      <div className="retro-glitch-line" />

      {/* CRT vignette */}
      <div className="retro-vignette" />

      {/* Warm scanlines */}
      <div className="retro-scanline-overlay" />

      <div className="relative z-10 flex-1 flex flex-col overflow-hidden">
        {/* ── Header bezel ──────────────────────────────── */}
        <header className="retro-bezel border-b px-4 py-2">
          <div className="flex items-center justify-between gap-3">
            {/* Left: Home + Title */}
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={handleHome}
                className="retro-pill font-ibm-mono text-[10px] text-[#8B7D65] hover:text-[#C9944A] hover:border-[#C9944A]/30 px-2.5 py-1.5 tracking-wider transition-all uppercase shrink-0"
                aria-label="Return to terminal desktop"
              >
                ⌂ HOME
              </button>
              <div className="min-w-0 hidden sm:block">
                <p className="font-ibm-mono text-[10px] text-[#6B5D45] tracking-[0.3em] uppercase truncate">
                  Ministry for Safe and Healthy Communication
                </p>
                <p className="font-ibm-mono text-xs text-[#D4C5A9] tracking-wider mt-0.5">
                  Department of Clarity
                  {currentWeek ? ` · Shift ${currentWeek.weekNumber}` : ' · Terminal Standby'}
                </p>
              </div>
            </div>

            {/* Center: Concern counter — only visible when > 0 */}
            {concernScore > 0 && (
              <div className="retro-pill px-2 py-1 flex items-center gap-1.5 shrink-0">
                <div className={`retro-indicator ${
                  concernScore >= 3.0 ? 'text-red-400 animate-pulse' :
                  concernScore >= 1.0 ? 'text-[#C9944A] animate-pulse' :
                  'text-[#C9944A]'
                }`} style={{ backgroundColor: 'currentColor' }} />
                <span className="font-ibm-mono text-[8px] text-[#6B5D45] tracking-wider uppercase">
                  CONCERN
                </span>
                <span className={`font-ibm-mono text-sm font-bold tracking-wider tabular-nums ${
                  concernScore >= 3.0 ? 'text-red-400' :
                  concernScore >= 1.0 ? 'text-[#C9944A]' :
                  'text-[#C9944A]/70'
                }`}>
                  {concernScore.toFixed(1)}
                </span>
              </div>
            )}

            {/* Right: App icons + PEARL */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Dictionary icon */}
              <DictionaryIcon variant="terminal" />

              {/* Messaging icon */}
              <button
                onClick={() => useMessagingStore.getState().isPanelOpen ? useMessagingStore.getState().closePanel() : useMessagingStore.getState().openPanel()}
                className="relative retro-pill px-2 py-1.5 hover:border-[#C9944A]/30 transition-all group"
                aria-label="Messages"
                title="Messages"
              >
                <svg width="20" height="16" viewBox="0 0 16 14" fill="none" className="text-[#6B5D45] group-hover:text-[#C9944A] transition-colors">
                  <path d="M1 1h14v9H5l-4 3V1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                  <line x1="4" y1="4" x2="12" y2="4" stroke="currentColor" strokeWidth="0.8" opacity="0.5" />
                  <line x1="4" y1="6.5" x2="10" y2="6.5" stroke="currentColor" strokeWidth="0.8" opacity="0.5" />
                </svg>
                <MessageBadge />
              </button>

              {/* Divider */}
              <div className="w-px h-6 bg-white/10 mx-0.5" />

              {/* PEARL */}
              <div className="flex items-center gap-2 retro-pill px-2.5 py-1">
                <PearlEye
                  onClick={() => setPearlOpen((v) => !v)}
                  panelOpen={pearlOpen}
                  variant="crt"
                  size="md"
                />
                <div className="text-left hidden sm:block">
                  <p className="font-ibm-mono text-[10px] text-[#5BB88C] tracking-[0.2em] uppercase">
                    P.E.A.R.L.
                  </p>
                  <p className="font-ibm-mono text-[10px] text-[#6B5D45] tracking-wider">
                    {eyeStateLabel[eyeState]}
                  </p>
                </div>
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

      <MessagingPanel />
      <MessageNotification />

      {/* System Audit Overlay — triggers at concern score 100 */}
      <SystemAuditOverlay />
    </div>
  );
}
