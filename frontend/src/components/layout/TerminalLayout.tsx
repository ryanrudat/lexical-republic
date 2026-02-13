import { useState, type ReactNode } from 'react';
import { useStudentStore } from '../../stores/studentStore';
import Sidebar from './Sidebar';
import StatusBar from './StatusBar';
import PearlEye from '../pearl/PearlEye';
import PearlPanel from '../pearl/PearlPanel';
import PearlMessageStrip from '../pearl/PearlMessageStrip';
import MinistryOffice from '../../scenes/MinistryOffice';

interface TerminalLayoutProps {
  children: ReactNode;
  weekNumber?: number;
  subtitle?: string;
}

export default function TerminalLayout({ children, weekNumber, subtitle }: TerminalLayoutProps) {
  const { user, logout } = useStudentStore();
  const [pearlOpen, setPearlOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="fixed inset-0 overflow-hidden flex flex-col">
      {/* 3D Background — faint atmospheric */}
      <div className="absolute inset-0 z-0 opacity-[0.15] pointer-events-none">
        <MinistryOffice />
      </div>

      {/* CRT overlay */}
      <div className="crt-overlay" />

      {/* === HEADER === */}
      <header className="relative z-10 border-b border-terminal-border bg-terminal-bg/95">
        <div className="flex items-center justify-between px-4 py-2">
          {/* Left: hamburger (mobile) + title */}
          <div className="flex items-center gap-3">
            {/* Hamburger for mobile */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden font-ibm-mono text-terminal-green text-lg"
            >
              {mobileMenuOpen ? '\u2715' : '\u2630'}
            </button>

            <h1 className="font-ibm-mono text-sm text-terminal-green tracking-wider text-glow hidden sm:block">
              {'\u258C'}MINISTRY OF HEALTHY AND SAFE COMMUNICATION{'\u258C'}
            </h1>
            <h1 className="font-ibm-mono text-xs text-terminal-green tracking-wider text-glow sm:hidden">
              {'\u258C'}MHSC{'\u258C'}
            </h1>
          </div>

          {/* Right: designation + PEARL eye + logout */}
          <div className="flex items-center gap-3">
            <span className="font-ibm-mono text-xs text-terminal-green-dim tracking-wider hidden sm:inline">
              [{user?.designation || 'UNKNOWN'}]
            </span>

            <PearlEye
              onClick={() => setPearlOpen(!pearlOpen)}
              panelOpen={pearlOpen}
            />

            <button
              onClick={logout}
              className="font-ibm-mono text-[11px] text-terminal-green-dim/50 hover:text-terminal-red tracking-wider transition-colors"
            >
              END
            </button>
          </div>
        </div>

        {/* Sub-header */}
        <div className="border-t border-terminal-border/50 px-4 py-1 flex items-center justify-between bg-terminal-bg/80">
          <span className="font-ibm-mono text-[11px] text-terminal-green-dim tracking-wider">
            DEPARTMENT OF CLARITY
          </span>
          <span className="font-ibm-mono text-[11px] text-terminal-green-dim tracking-wider">
            {weekNumber ? `SESSION: SHIFT ${weekNumber}` : subtitle || 'TERMINAL READY'}
          </span>
        </div>
      </header>

      {/* === MAIN AREA (sidebar + content) === */}
      <div className="relative z-10 flex-1 flex overflow-hidden">
        {/* Mobile menu overlay */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-20 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Sidebar — hidden on mobile unless menu open */}
        <div className={`
          ${mobileMenuOpen ? 'fixed inset-y-0 left-0 z-30' : 'hidden'}
          lg:relative lg:block lg:z-10
        `}>
          <Sidebar
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
            currentWeek={weekNumber}
          />
        </div>

        {/* Content area */}
        <main className="flex-1 overflow-auto bg-terminal-bg/80">
          {children}
        </main>
      </div>

      {/* === PEARL STRIP === */}
      <PearlMessageStrip />

      {/* === STATUS BAR === */}
      <div className="relative z-10">
        <StatusBar />
      </div>

      {/* PEARL Panel — slides from right */}
      <PearlPanel
        open={pearlOpen}
        onClose={() => setPearlOpen(false)}
      />
    </div>
  );
}
