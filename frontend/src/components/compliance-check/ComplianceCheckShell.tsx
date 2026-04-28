import { useEffect, useRef, useState } from 'react';
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
  const [isClosing, setIsClosing] = useState(false);
  const closingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    document.body.classList.add('compliance-check-active');
    return () => {
      window.removeEventListener('keydown', blockKey, true);
      window.removeEventListener('popstate', blockBack);
      document.body.classList.remove('compliance-check-active');
      if (closingTimerRef.current) clearTimeout(closingTimerRef.current);
    };
  }, []);

  const handleMCQComplete = (
    results: Array<{ word: string; correct: boolean }>,
    correctCount: number,
  ) => {
    onComplete(results, correctCount);
    // ShiftQueue parent unmounts the shell ~2200ms after onComplete fires.
    // Trigger the close animation ~1820ms in so it lasts ~380ms before unmount.
    closingTimerRef.current = setTimeout(() => setIsClosing(true), 1820);
  };

  return (
    <div className={`fixed inset-0 z-[1000] pointer-events-auto compliance-modal-shell ${isClosing ? 'is-closing' : ''}`}>
      <div className="compliance-backdrop absolute inset-0 bg-slate-900/85 backdrop-blur-md" />
      <div className="compliance-scanline" />

      <div className="absolute inset-0 flex flex-col items-center gap-6 px-6 py-8 overflow-y-auto">
        <div className="compliance-eye-wrap shrink-0 mt-4">
          <div className="compliance-sonar-ring" />
          <div className="compliance-eye-halo" />
          <ComplianceEye />
        </div>

        <div className="compliance-label text-center shrink-0">
          <p className="font-ibm-mono text-[10px] text-cyan-300 tracking-[0.3em]">
            P.E.A.R.L.
          </p>
          <p className="compliance-typewriter mt-2 font-ibm-mono text-sm text-cyan-100 tracking-[0.2em]">
            COMPLIANCE CHECK ISSUED
          </p>
        </div>

        <div className="compliance-card-enter w-full max-w-lg shrink-0 pb-4">
          <ComplianceCheckMCQ questions={questions} onComplete={handleMCQComplete} />
        </div>
      </div>
    </div>
  );
}
