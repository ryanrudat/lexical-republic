import { useState, useEffect, useRef } from 'react';
import { useStudentStore } from '../../stores/studentStore';

const BOOT_LINES = [
  'INITIALIZING TERMINAL...',
  'DEPARTMENT OF CLARITY TERMINAL v4.7.1',
  'CONNECTING TO MINISTRY NETWORK... OK',
  'P.E.A.R.L. SUBSYSTEM... ONLINE',
  'COMPLIANCE MODULE... LOADED',
  'LOADING OFFICE ENVIRONMENT...',
];

interface BootSequenceProps {
  onComplete: () => void;
}

export default function BootSequence({ onComplete }: BootSequenceProps) {
  const user = useStudentStore((s) => s.user);
  const [lines, setLines] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const [fading, setFading] = useState(false);
  const lineIndex = useRef(0);

  useEffect(() => {
    if (sessionStorage.getItem('boot-seen')) {
      onComplete();
      return;
    }

    const allLines = [...BOOT_LINES, `WELCOME, ${user?.designation || 'CITIZEN'}`];

    const interval = setInterval(() => {
      if (lineIndex.current < allLines.length) {
        setLines((prev) => [...prev, allLines[lineIndex.current]]);
        lineIndex.current++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          setDone(true);
          setFading(true);
          sessionStorage.setItem('boot-seen', '1');
          setTimeout(onComplete, 600);
        }, 500);
      }
    }, 200);

    return () => clearInterval(interval);
  }, [onComplete, user?.designation]);

  const handleSkip = () => {
    sessionStorage.setItem('boot-seen', '1');
    onComplete();
  };

  return (
    <div
      className={`fixed inset-0 z-50 bg-terminal-bg flex flex-col items-start justify-center px-12 cursor-pointer transition-opacity duration-600 ${
        fading ? 'opacity-0' : 'opacity-100'
      }`}
      onClick={handleSkip}
    >
      <div className="space-y-2">
        {lines.map((line, i) => (
          <p
            key={i}
            className="font-ibm-mono text-sm text-terminal-green tracking-wider animate-fade-in"
          >
            {'\u25B8'} {line}
          </p>
        ))}
        {!done && (
          <span className="inline-block w-2 h-4 bg-terminal-green animate-cursor-blink" />
        )}
      </div>

      <p className="absolute bottom-8 right-8 font-ibm-mono text-[11px] text-terminal-green-dim/50 tracking-wider">
        CLICK TO SKIP
      </p>
    </div>
  );
}
