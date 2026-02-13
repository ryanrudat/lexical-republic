import { useEffect, useState, useRef, useCallback } from 'react';
import { usePearlStore } from '../../stores/pearlStore';
import type { BarkType } from '../../types/shifts';

const BARK_STYLES: Record<BarkType, { label: string; textColor: string }> = {
  success: { label: 'Approved', textColor: 'text-neon-mint' },
  incorrect: { label: 'Correction', textColor: 'text-neon-cyan' },
  hint: { label: 'Hint', textColor: 'text-neon-cyan' },
  concern: { label: 'Concern', textColor: 'text-neon-pink' },
  notice: { label: 'P.E.A.R.L. Broadcast', textColor: 'text-neon-cyan' },
};

const DEFAULT_MESSAGE = 'Good morning, Associate. P.E.A.R.L. online and monitoring your shift.';

export default function PearlMessageStrip() {
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
    if (!activeBark) return;
    clearTimers();
    setCurrentMessage({ text: activeBark.text, type: activeBark.type });

    const duration =
      activeBark.type === 'concern'
        ? 4500
        : activeBark.type === 'notice'
          ? 9000
          : 3200;

    dismissTimerRef.current = setTimeout(() => {
      dismissBark();
      setCurrentMessage({ text: DEFAULT_MESSAGE, type: 'notice' });
    }, duration);
  }, [activeBark, dismissBark, clearTimers]);

  useEffect(() => {
    if (messages.length === 0 || activeBark) return;

    const scheduleBroadcast = () => {
      noticeTimerRef.current = setTimeout(() => {
        if (activeBark) return;
        const message = messages[noticeIndexRef.current];
        noticeIndexRef.current = (noticeIndexRef.current + 1) % messages.length;
        setCurrentMessage({ text: message.text, type: 'notice' });
        scheduleBroadcast();
      }, 18000 + Math.random() * 12000);
    };

    scheduleBroadcast();

    return () => {
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    };
  }, [messages, activeBark]);

  useEffect(() => {
    return () => {
      clearTimers();
      if (typeIntervalRef.current) clearInterval(typeIntervalRef.current);
    };
  }, [clearTimers]);

  const style = BARK_STYLES[currentMessage.type];

  return (
    <div className="relative z-10 border-t border-white/10 bg-ios-bg/95">
      <div className="px-4 py-1.5 flex items-center gap-2">
        <span className="font-ibm-mono text-[9px] text-white/35 tracking-[0.15em] uppercase shrink-0">
          {style.label}
        </span>
        <p
          className={`font-ibm-mono text-xs ${style.textColor} leading-tight tracking-wide truncate ${
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
