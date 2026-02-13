import { useEffect, useState, useRef } from 'react';
import { usePearlStore } from '../../stores/pearlStore';
import type { BarkType } from '../../types/shifts';

interface PearlBarkProps {
  panelOpen: boolean;
}

const BARK_STYLES: Record<BarkType, { borderColor: string; dotColor: string; label: string; textColor: string }> = {
  success: { borderColor: 'border-crt-green/40', dotColor: 'bg-crt-green/60', label: 'Approved', textColor: 'text-crt-green/90' },
  incorrect: { borderColor: 'border-crt-amber/40', dotColor: 'bg-crt-amber/60', label: 'Correction', textColor: 'text-crt-amber/90' },
  hint: { borderColor: 'border-crt-blue/40', dotColor: 'bg-crt-blue/60', label: 'Hint', textColor: 'text-crt-blue/90' },
  concern: { borderColor: 'border-ministry-highlight/40', dotColor: 'bg-ministry-highlight/60', label: 'Concern', textColor: 'text-ministry-highlight/90' },
  notice: { borderColor: 'border-crt-blue/30', dotColor: 'bg-crt-blue/60', label: 'P.E.A.R.L. Broadcast', textColor: 'text-crt-amber/90' },
};

// Duration per bark type (ms)
const BARK_DURATIONS: Record<BarkType, number> = {
  success: 2800,
  incorrect: 2800,
  hint: 3000,
  concern: 4200,
  notice: 12000,
};

export default function PearlBark({ panelOpen }: PearlBarkProps) {
  const messages = usePearlStore(s => s.messages);
  const loadMessages = usePearlStore(s => s.loadMessages);
  const activeBark = usePearlStore(s => s.activeBark);
  const dismissBark = usePearlStore(s => s.dismissBark);

  const [bark, setBark] = useState<{ text: string; type: BarkType } | null>(null);
  const [visible, setVisible] = useState(false);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const indexRef = useRef(0);
  const typeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  // Handle activeBark from store (contextual barks from step components)
  useEffect(() => {
    if (!activeBark || panelOpen) return;

    // Clear any existing dismiss timer
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);

    setBark({ text: activeBark.text, type: activeBark.type });
    setVisible(true);

    const duration = BARK_DURATIONS[activeBark.type];
    dismissTimerRef.current = setTimeout(() => {
      setVisible(false);
      setTimeout(() => {
        setBark(null);
        dismissBark();
      }, 400);
    }, duration);

    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, [activeBark, panelOpen, dismissBark]);

  // Dismiss when panel opens
  useEffect(() => {
    if (panelOpen) {
      setVisible(false);
      const t = setTimeout(() => setBark(null), 400);
      return () => clearTimeout(t);
    }
  }, [panelOpen]);

  // Typewriter effect
  useEffect(() => {
    if (!bark || !visible) {
      setDisplayedText('');
      setIsTyping(false);
      return;
    }
    const text = bark.text;
    setIsTyping(true);
    setDisplayedText('');
    let i = 0;
    if (typeIntervalRef.current) clearInterval(typeIntervalRef.current);
    typeIntervalRef.current = setInterval(() => {
      if (i < text.length) {
        setDisplayedText(text.slice(0, i + 1));
        i++;
      } else {
        if (typeIntervalRef.current) clearInterval(typeIntervalRef.current);
        setIsTyping(false);
      }
    }, 30);
    return () => { if (typeIntervalRef.current) clearInterval(typeIntervalRef.current); };
  }, [bark, visible]);

  // Propaganda scheduling loop (only for random propaganda, when no activeBark)
  useEffect(() => {
    if (panelOpen || messages.length === 0) return;
    let barkTimer: ReturnType<typeof setTimeout>;
    let propDismissTimer: ReturnType<typeof setTimeout>;
    let fadeTimer: ReturnType<typeof setTimeout>;
    let cancelled = false;

    const showBark = () => {
      if (cancelled || activeBark) return; // Don't show propaganda if contextual bark active
      const msg = messages[indexRef.current];
      indexRef.current = (indexRef.current + 1) % messages.length;
      setBark({ text: msg.text, type: 'notice' });
      setVisible(true);
      const displayTime = 10000 + Math.random() * 5000;
      propDismissTimer = setTimeout(() => {
        if (cancelled) return;
        setVisible(false);
        fadeTimer = setTimeout(() => { if (cancelled) return; setBark(null); scheduleNext(); }, 400);
      }, displayTime);
    };

    const scheduleNext = () => {
      if (cancelled) return;
      const delay = 20000 + Math.random() * 25000;
      barkTimer = setTimeout(showBark, delay);
    };

    const firstDelay = 4000 + Math.random() * 4000;
    barkTimer = setTimeout(showBark, firstDelay);

    return () => {
      cancelled = true;
      clearTimeout(barkTimer);
      clearTimeout(propDismissTimer);
      clearTimeout(fadeTimer);
    };
  }, [panelOpen, messages, activeBark]);

  if (!bark) return null;

  const style = BARK_STYLES[bark.type];

  return (
    <div className={`transition-all duration-400 mb-3 ${
      visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
    }`}>
      <div className={`relative max-w-[280px] bg-white/90 border ${style.borderColor} rounded-lg px-3.5 py-2.5 backdrop-blur-sm shadow-[0_4px_16px_rgba(0,0,0,0.06)]`}>
        {/* Source label */}
        <div className="flex items-center gap-1.5 mb-1.5">
          <div className={`w-1 h-1 rounded-full ${style.dotColor}`} />
          <span className="font-ibm-mono text-[7px] text-chrome-dark/60 tracking-[0.2em] uppercase">
            {style.label}
          </span>
        </div>
        <p className={`font-ibm-mono text-[11px] ${style.textColor} leading-relaxed tracking-wide ${isTyping ? 'typewriter-cursor' : ''}`}>
          {displayedText}
        </p>
        {/* Speech bubble tail */}
        <div className={`absolute -bottom-[5px] right-6 w-2.5 h-2.5 bg-white/90 border-r border-b ${style.borderColor} rotate-45`} />
      </div>
    </div>
  );
}
