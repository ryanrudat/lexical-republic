import { useState, useEffect } from 'react';
import { useViewStore } from '../../stores/viewStore';
import { usePearlStore } from '../../stores/pearlStore';
import { useStudentStore } from '../../stores/studentStore';
import { GUIDED_STUDENT_MODE } from '../../config/runtimeFlags';

export default function TerminalTaskbar() {
  const terminalApp = useViewStore((s) => s.terminalApp);
  const returnToDesktop = useViewStore((s) => s.returnToDesktop);
  const exitTerminal = useViewStore((s) => s.exitTerminal);
  const eyeState = usePearlStore((s) => s.eyeState);
  const user = useStudentStore((s) => s.user);
  const [time, setTime] = useState(new Date());
  const guidedStudent = GUIDED_STUDENT_MODE && user?.role === 'student';
  const guidedLockedInShift = guidedStudent && terminalApp === 'clarity-queue';

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

  const hours = time.getHours().toString().padStart(2, '0');
  const minutes = time.getMinutes().toString().padStart(2, '0');
  const eyeStateLabel: Record<typeof eyeState, string> = {
    welcoming: 'WELCOMING',
    attentive: 'ATTENTIVE',
    evaluative: 'EVALUATIVE',
    confused: 'INTERFERENCE',
    alarmed: 'ALARMED',
    frantic: 'FRANTIC',
    cold: 'COLD',
    breaking: 'UNSTABLE',
    final: 'FINAL',
  };

  const handleBack = () => {
    if (terminalApp === 'desktop') {
      exitTerminal();
    } else {
      returnToDesktop();
    }
  };

  return (
    <div className="relative z-10 border-t border-white/10 bg-ios-bg/80 backdrop-blur-md px-4 py-1.5 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          onClick={handleBack}
          disabled={guidedLockedInShift}
          className="font-ibm-mono text-xs text-white/40 hover:text-neon-cyan tracking-wider transition-colors flex items-center gap-1"
        >
          {'\u25C0'} {guidedLockedInShift ? 'TEACHER GUIDED' : terminalApp === 'desktop' ? 'OFFICE' : 'DESKTOP'}
        </button>
        {terminalApp !== 'desktop' && (
          <span className="font-ibm-mono text-[10px] text-white/25 tracking-wider uppercase">
            | {terminalApp.replace(/-/g, ' ')}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-neon-mint animate-pulse" />
        <span className="font-ibm-mono text-[9px] text-neon-mint/60 tracking-[0.25em]">
          SESSION LIVE
        </span>
      </div>

      <div className="flex items-center gap-3">
        <span className="font-ibm-mono text-[10px] text-neon-cyan/50 tracking-wider">
          PEARL: {eyeStateLabel[eyeState]}
        </span>
        <span className="font-dseg7 text-xs text-neon-cyan/60">
          {hours}:{minutes}
        </span>
      </div>
    </div>
  );
}
