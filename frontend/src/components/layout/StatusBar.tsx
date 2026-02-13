import { useState, useEffect } from 'react';

export default function StatusBar() {
  const [time, setTime] = useState('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(
        `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
      );
    };
    update();
    const interval = setInterval(update, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="border-t border-terminal-border bg-terminal-bg/95 px-4 py-1.5 flex items-center justify-between">
      <span className="font-ibm-mono text-xs text-terminal-green-dim tracking-wider">
        STATUS: <span className="text-terminal-green">ON-SHIFT</span>
      </span>

      <div className="flex items-center gap-4">
        <span className="font-ibm-mono text-xs text-terminal-green-dim tracking-wider">
          TIME: <span className="text-terminal-green">{time}</span>
        </span>

        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-terminal-green animate-pulse" />
          <span className="font-ibm-mono text-xs text-terminal-green tracking-wider">
            LIVE
          </span>
        </div>
      </div>
    </div>
  );
}
