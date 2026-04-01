import type { ReactNode } from 'react';
import { useViewStore } from '../../stores/viewStore';
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
      <div className="retro-bezel border-b rounded-t-xl px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-1.5 rounded-full bg-[#C9944A]" style={{ boxShadow: '0 0 4px rgba(201,148,74,0.4)' }} />
          <span className="font-ibm-mono text-sm text-[#D4C5A9] tracking-wider retro-text-glow">
            {title.toUpperCase()}
          </span>
        </div>
        <button
          onClick={returnToDesktop}
          disabled={guidedLockedInShift}
          className="font-ibm-mono text-xs text-[#6B5D45] hover:text-red-400 transition-colors"
        >
          {guidedLockedInShift ? 'TEACHER GUIDED' : '\u2715 CLOSE'}
        </button>
      </div>

      {/* App content */}
      <div className="flex-1 overflow-auto ios-scroll crt-monitor-screen">
        <div className="relative">{children}</div>
      </div>
    </div>
  );
}
