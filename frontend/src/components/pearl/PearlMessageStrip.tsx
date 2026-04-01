import { useEffect, useState, useRef, useCallback } from 'react';
import { usePearlStore } from '../../stores/pearlStore';
import type { BarkType } from '../../types/shifts';

const BARK_STYLES: Record<BarkType, { label: string; textColor: string; islandBg: string; islandBorder: string }> = {
  success:   { label: 'Approved',           textColor: 'text-neon-mint',  islandBg: 'rgba(5,150,105,0.08)',  islandBorder: 'rgba(5,150,105,0.3)' },
  incorrect: { label: 'Correction',         textColor: 'text-neon-cyan',  islandBg: 'rgba(14,165,233,0.08)', islandBorder: 'rgba(14,165,233,0.3)' },
  hint:      { label: 'Hint',              textColor: 'text-neon-cyan',  islandBg: 'rgba(14,165,233,0.08)', islandBorder: 'rgba(14,165,233,0.3)' },
  concern:   { label: 'Concern',           textColor: 'text-neon-pink',  islandBg: 'rgba(225,29,72,0.06)',  islandBorder: 'rgba(225,29,72,0.25)' },
  notice:    { label: 'P.E.A.R.L. Broadcast', textColor: 'text-neon-cyan',  islandBg: 'rgba(91,184,140,0.06)', islandBorder: 'rgba(91,184,140,0.2)' },
};

const DEFAULT_MESSAGE = 'Good morning, Associate. P.E.A.R.L. online and monitoring your shift.';

interface PearlMessageStripProps {
  variant?: 'strip' | 'island';
}

export default function PearlMessageStrip({ variant = 'strip' }: PearlMessageStripProps) {
  const messages = usePearlStore((s) => s.messages);
  const loadMessages = usePearlStore((s) => s.loadMessages);
  const activeBark = usePearlStore((s) => s.activeBark);
  const dismissBark = usePearlStore((s) => s.dismissBark);

  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentMessage, setCurrentMessage] = useState<{ text: string; type: BarkType }>({
    text: DEFAULT_MESSAGE,
    type: 'notice',
  });
  const [isExpanded, setIsExpanded] = useState(false);

  const typeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noticeIndexRef = useRef(0);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  const clearTimers = useCallback(() => {
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
  }, []);

  const typeText = useCallback((text: string) => {
    setIsTyping(true);
    setDisplayedText('');
    let i = 0;

    if (typeIntervalRef.current) clearInterval(typeIntervalRef.current);
    typeIntervalRef.current = setInterval(() => {
      if (i < text.length) {
        setDisplayedText(text.slice(0, i + 1));
        i++;
        return;
      }
      if (typeIntervalRef.current) clearInterval(typeIntervalRef.current);
      setIsTyping(false);
    }, 30);
  }, []);

  useEffect(() => {
    typeText(currentMessage.text);
  }, [currentMessage, typeText]);

  useEffect(() => {
    if (!activeBark) {
      if (variant === 'island') setIsExpanded(false);
      return;
    }
    clearTimers();
    setCurrentMessage({ text: activeBark.text, type: activeBark.type });
    if (variant === 'island') setIsExpanded(true);

    const duration =
      activeBark.type === 'concern'
        ? 4500
        : activeBark.type === 'notice'
          ? 9000
          : 3200;

    dismissTimerRef.current = setTimeout(() => {
      dismissBark();
      if (variant === 'island') setIsExpanded(false);
      setCurrentMessage({ text: DEFAULT_MESSAGE, type: 'notice' });
    }, duration);
  }, [activeBark, dismissBark, clearTimers, variant]);

  useEffect(() => {
    if (messages.length === 0 || activeBark) return;

    const scheduleBroadcast = () => {
      noticeTimerRef.current = setTimeout(() => {
        if (activeBark) return;
        const message = messages[noticeIndexRef.current];
        noticeIndexRef.current = (noticeIndexRef.current + 1) % messages.length;
        setCurrentMessage({ text: message.text, type: 'notice' });
        if (variant === 'island') {
          setIsExpanded(true);
          // Auto-collapse after display
          setTimeout(() => setIsExpanded(false), 8000);
        }
        scheduleBroadcast();
      }, 18000 + Math.random() * 12000);
    };

    scheduleBroadcast();

    return () => {
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    };
  }, [messages, activeBark, variant]);

  useEffect(() => {
    return () => {
      clearTimers();
      if (typeIntervalRef.current) clearInterval(typeIntervalRef.current);
    };
  }, [clearTimers]);

  const barkStyle = BARK_STYLES[currentMessage.type];

  // ─── Dynamic Island variant ───────────────────────────────────
  if (variant === 'island') {
    return (
      <div
        className="pearl-island"
        style={{
          width: isExpanded ? 'auto' : '195px',
          maxWidth: isExpanded ? '90vw' : '195px',
          height: isExpanded ? 'auto' : '28px',
          minHeight: isExpanded ? '34px' : '28px',
          background: isExpanded ? barkStyle.islandBg : 'rgba(0,0,0,0.35)',
          borderColor: isExpanded ? barkStyle.islandBorder : 'rgba(201,148,74,0.15)',
        }}
      >
        {isExpanded ? (
          /* Expanded: bark label + message */
          <div className="flex items-center gap-2 px-3 w-full min-w-0 pearl-island-content-in">
            <span className="font-ibm-mono text-[8px] text-white/30 tracking-[0.12em] uppercase shrink-0">
              {barkStyle.label}
            </span>
            <p
              className={`font-ibm-mono text-[11px] ${barkStyle.textColor} leading-snug tracking-wide ${
                isTyping ? 'typewriter-cursor' : ''
              }`}
              aria-live="polite"
            >
              {displayedText}
            </p>
          </div>
        ) : (
          /* Idle: pulsing dot + P.E.A.R.L. label */
          <div className="flex items-center gap-2 px-3 pearl-island-content-in">
            <div className="relative shrink-0">
              <div className="w-1.5 h-1.5 rounded-full bg-[#5BB88C]" />
              <div className="absolute inset-0 w-1.5 h-1.5 rounded-full bg-[#5BB88C] animate-ping opacity-40" />
            </div>
            <span className="font-ibm-mono text-[9px] text-[#5BB88C]/70 tracking-[0.15em] uppercase whitespace-nowrap">
              P.E.A.R.L. BROADCAST
            </span>
          </div>
        )}
      </div>
    );
  }

  // ─── Classic strip variant ────────────────────────────────────
  return (
    <div className="relative z-10 border-t border-white/10 bg-ios-bg/95">
      <div className="px-4 py-1.5 flex items-center gap-2">
        <span className="font-ibm-mono text-[9px] text-white/35 tracking-[0.15em] uppercase shrink-0">
          {barkStyle.label}
        </span>
        <p
          className={`font-ibm-mono text-xs ${barkStyle.textColor} leading-tight tracking-wide truncate ${
            isTyping ? 'typewriter-cursor' : ''
          }`}
          aria-live="polite"
        >
          {displayedText}
        </p>
      </div>
    </div>
  );
}
