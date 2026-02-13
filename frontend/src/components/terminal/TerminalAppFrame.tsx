import type { ReactNode } from 'react';
import { useViewStore } from '../../stores/viewStore';
import PearlMessageStrip from '../pearl/PearlMessageStrip';
import { useStudentStore } from '../../stores/studentStore';
import { GUIDED_STUDENT_MODE } from '../../config/runtimeFlags';

interface TerminalAppFrameProps {
  title: string;
  children: ReactNode;
}

export default function TerminalAppFrame({ title, children }: TerminalAppFrameProps) {
  const terminalApp = useViewStore((s) => s.terminalApp);
  const returnToDesktop = useViewStore((s) => s.returnToDesktop);
  const user = useStudentStore((s) => s.user);
  const guidedStudent = GUIDED_STUDENT_MODE && user?.role === 'student';
  const guidedLockedInShift = guidedStudent && terminalApp === 'clarity-queue';

  return (
    <div className="flex-1 flex flex-col overflow-hidden rounded-xl mx-2 mt-1">
      {/* Title bar */}
      <div className="border-b border-white/10 bg-ios-bg/60 backdrop-blur-md rounded-t-xl px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-ibm-mono text-sm text-white/90 tracking-wider ios-text-glow">
            {title.toUpperCase()}
          </span>
        </div>
        <button
          onClick={returnToDesktop}
          disabled={guidedLockedInShift}
          className="font-ibm-mono text-xs text-white/30 hover:text-neon-pink transition-colors"
        >
          {guidedLockedInShift ? 'TEACHER GUIDED' : '\u2715 CLOSE'}
        </button>
      </div>

      {/* App content */}
      <div className="flex-1 overflow-auto ios-scroll bg-ios-bg-subtle/40">
        {children}
      </div>

      {/* PEARL strip at bottom */}
      <PearlMessageStrip />
    </div>
  );
}
