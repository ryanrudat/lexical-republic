import { useEffect, useState, useRef, useCallback } from 'react';
import { usePearlStore } from '../../stores/pearlStore';

export default function PearlMessageBar() {
  const { messages, currentIndex, loadMessages, nextMessage } = usePearlStore();
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rotationRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  const typeText = useCallback((text: string) => {
    setIsTyping(true);
    setDisplayedText('');
    let i = 0;

    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      if (i < text.length) {
        setDisplayedText(text.slice(0, i + 1));
        i++;
      } else {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setIsTyping(false);
      }
    }, 35);
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      typeText(messages[currentIndex].text);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [messages, currentIndex, typeText]);

  useEffect(() => {
    if (messages.length <= 1) return;
    rotationRef.current = setInterval(nextMessage, 45000);
    return () => {
      if (rotationRef.current) clearInterval(rotationRef.current);
    };
  }, [messages.length, nextMessage]);

  if (messages.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-20">
      <div className="bg-ministry-dark/95 border-t-2 border-ministry-highlight/40 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 py-2.5 flex items-center gap-4">
          {/* Broadcast indicator */}
          <div className="flex-shrink-0 flex items-center gap-2 border-r border-ministry-accent/30 pr-4">
            <div className="relative">
              <div className="w-2.5 h-2.5 rounded-full bg-ministry-highlight" />
              <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-ministry-highlight animate-ping opacity-50" />
            </div>
            <div className="flex flex-col">
              <span className="font-ibm-mono text-[9px] text-ministry-highlight tracking-[0.2em] font-semibold">
                P.E.A.R.L.
              </span>
              <span className="font-ibm-mono text-[7px] text-ministry-muted/50 tracking-wider">
                BROADCAST
              </span>
            </div>
          </div>

          {/* Message */}
          <div className="flex-1 overflow-hidden">
            <p className={`font-ibm-mono text-xs text-crt-amber/90 tracking-wider ${isTyping ? 'typewriter-cursor' : ''}`}>
              {displayedText}
            </p>
          </div>

          {/* Counter + classification */}
          <div className="flex-shrink-0 flex items-center gap-3">
            <span className="font-ibm-mono text-[8px] text-ministry-muted/40 tracking-wider border border-ministry-accent/20 px-1.5 py-0.5 rounded">
              PUBLIC
            </span>
            <span className="font-ibm-mono text-[9px] text-ministry-muted/50">
              {currentIndex + 1}/{messages.length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
