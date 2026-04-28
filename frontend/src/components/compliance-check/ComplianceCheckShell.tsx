import { useEffect } from 'react';
import type { ComplianceCheckQuestion } from '../../types/complianceCheck';
import ComplianceEye from './ComplianceEye';
import ComplianceCheckMCQ from './ComplianceCheckMCQ';

interface Props {
  questions: ComplianceCheckQuestion[];
  onComplete: (results: Array<{ word: string; correct: boolean }>, correctCount: number) => void;
}

/**
 * Screen-locking Compliance Check shell.
 * Mounted at App root via complianceCheckStore. While present:
 * - Backdrop dims + blurs everything underneath
 * - ESC key blocked, browser back blocked
 * - z-[100] sits above terminal header (z-[90])
 *
 * Locked decision: PEARL eye does NOT blink — only looks around + breathes.
 */
export default function ComplianceCheckShell({ questions, onComplete }: Props) {
  useEffect(() => {
    const blockKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    const blockBack = () => {
      window.history.pushState(null, '', window.location.href);
    };
    window.addEventListener('keydown', blockKey, true);
    window.addEventListener('popstate', blockBack);
    blockBack();
    return () => {
      window.removeEventListener('keydown', blockKey, true);
      window.removeEventListener('popstate', blockBack);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] pointer-events-auto">
      <div className="compliance-backdrop absolute inset-0 bg-slate-900/70 backdrop-blur-md" />
      <div className="compliance-scanline" />

      <div className="absolute inset-0 flex flex-col items-center justify-center gap-7 px-6 py-10 overflow-y-auto">
        <div className="compliance-eye-wrap">
          <div className="compliance-sonar-ring" />
          <div className="compliance-eye-halo" />
          <ComplianceEye />
        </div>

        <div className="compliance-label text-center">
          <p className="font-ibm-mono text-[10px] text-cyan-300 tracking-[0.3em]">
            P.E.A.R.L.
          </p>
          <p className="compliance-typewriter mt-2 font-ibm-mono text-sm text-cyan-100 tracking-[0.2em]">
            COMPLIANCE CHECK ISSUED
          </p>
        </div>

        <div className="compliance-card-enter w-full max-w-lg">
          <ComplianceCheckMCQ questions={questions} onComplete={onComplete} />
        </div>
      </div>
    </div>
  );
}
