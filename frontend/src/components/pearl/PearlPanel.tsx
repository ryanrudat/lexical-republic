import { useEffect, useState, useRef, useCallback } from 'react';
import { usePearlStore } from '../../stores/pearlStore';

interface PearlPanelProps {
  open: boolean;
  onClose: () => void;
  variant?: 'chrome' | 'crt';
}

export default function PearlPanel({ open, onClose, variant = 'chrome' }: PearlPanelProps) {
  const { messages, currentIndex, loadMessages, nextMessage, barkHistory } = usePearlStore();
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rotationRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (open && messages.length === 0) {
      loadMessages();
    }
  }, [open, messages.length, loadMessages]);

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
    }, 25);
  }, []);

  useEffect(() => {
    if (open && messages.length > 0) {
      typeText(messages[currentIndex].text);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [messages, currentIndex, open, typeText]);

  useEffect(() => {
    if (!open || messages.length <= 1) return;
    rotationRef.current = setInterval(nextMessage, 8000);
    return () => {
      if (rotationRef.current) clearInterval(rotationRef.current);
    };
  }, [open, messages.length, nextMessage]);

  const recentBarks = barkHistory.slice(-10).reverse();
  const isCrt = variant === 'crt';

  // Variant-specific styles — crt variant now uses iOS palette
  const panelBg = isCrt ? 'bg-ios-bg/95' : 'bg-retro-warm-gray/95';
  const panelBorder = isCrt ? 'border-white/10' : 'border-chrome-mid';
  const titleColor = isCrt ? 'text-neon-cyan ios-text-glow' : 'text-retro-warm-wood';
  const subtitleColor = isCrt ? 'text-white/40' : 'text-chrome-dark/50';
  const statusDot = isCrt ? 'bg-neon-mint' : 'bg-neon-mint';
  const statusText = isCrt ? 'text-neon-cyan/70' : 'text-chrome-dark/60';
  const textColor = isCrt ? 'text-white/70' : 'text-retro-warm-wood/70';
  const accentColor = isCrt ? 'text-neon-cyan' : 'text-pearl-iris';
  const broadcastText = isCrt ? 'text-neon-cyan/90' : 'text-retro-warm-wood';
  const broadcastBg = isCrt ? 'bg-ios-bg-subtle border-white/10' : 'bg-white/50 border-chrome-mid';
  const closeColor = isCrt ? 'text-white/40 hover:text-neon-pink' : 'text-chrome-dark/40 hover:text-neon-pink';
  const linkColor = isCrt ? 'text-white/40 hover:text-neon-cyan' : 'text-chrome-dark/40 hover:text-pearl-iris';
  const barkBorder = isCrt ? 'border-white/10' : 'border-chrome-mid/50';
  const tipBorder = isCrt ? 'border-white/10' : 'border-chrome-mid/30';
  const tipIcon = isCrt ? 'text-neon-pink/50' : 'text-neon-pink/50';
  const tipText = isCrt ? 'text-white/50' : 'text-chrome-dark/50';
  const footerText = isCrt ? 'text-white/20' : 'text-chrome-dark/30';
  const shadow = isCrt ? 'shadow-[-8px_0_30px_rgba(0,0,0,0.5)]' : 'shadow-[-8px_0_30px_rgba(0,0,0,0.15)]';

  return (
    <div
      className={`fixed top-0 right-0 h-full z-[40] transition-all duration-500 ease-out ${
        open
          ? 'translate-x-0 opacity-100'
          : 'translate-x-full opacity-0 pointer-events-none'
      }`}
      style={{ width: '340px' }}
    >
      {open && (
        <div className="fixed inset-0 z-[-1]" onClick={onClose} />
      )}

      <div className={`h-full ${panelBg} border-l ${panelBorder} flex flex-col pt-4 ${shadow} backdrop-blur-sm`}>
        {/* Header */}
        <div className={`px-5 pb-4 border-b ${panelBorder}`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className={`font-special-elite text-sm ${titleColor} tracking-wider`}>
                P.E.A.R.L.
              </h3>
              <p className={`font-ibm-mono text-[10px] ${subtitleColor} tracking-wider mt-0.5`}>
                Programmatic Educational Assistant for Regulated Language
              </p>
            </div>
            <button
              onClick={onClose}
              className={`w-6 h-6 flex items-center justify-center ${closeColor} transition-colors`}
            >
              <span className="font-ibm-mono text-lg">{'\u2715'}</span>
            </button>
          </div>
        </div>

        {/* Status */}
        <div className={`px-5 py-3 border-b ${panelBorder}/50`}>
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${statusDot} animate-pulse`} />
            <span className={`font-ibm-mono text-[11px] ${statusText} tracking-wider`}>
              ACTIVE — LISTENING
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* Greeting */}
          <div className="mb-6">
            <p className={`font-ibm-sans text-sm ${textColor} leading-relaxed`}>
              Hello, Citizen! I'm here to help you on your journey toward
              <span className={` ${accentColor}`}> approved communication</span>.
              How wonderful that you're participating today!
            </p>
          </div>

          {/* Current broadcast */}
          {messages.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1 h-1 bg-neon-cyan" />
                <span className="font-ibm-mono text-[10px] text-neon-cyan/70 tracking-[0.2em] uppercase">
                  Current Broadcast
                </span>
              </div>
              <div className={`${broadcastBg} border p-3`}>
                <p className={`font-ibm-mono text-sm ${broadcastText} leading-relaxed tracking-wide ${isTyping ? 'typewriter-cursor' : ''}`}>
                  {displayedText}
                </p>
              </div>
              <div className="flex items-center justify-between mt-2">
                <button
                  onClick={nextMessage}
                  className={`font-ibm-mono text-[10px] ${linkColor} tracking-wider transition-colors`}
                >
                  NEXT MESSAGE
                </button>
                <span className={`font-ibm-mono text-[10px] ${footerText}`}>
                  {currentIndex + 1} of {messages.length}
                </span>
              </div>
            </div>
          )}

          {/* Recent barks log */}
          {recentBarks.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-1 h-1 ${isCrt ? 'bg-neon-cyan' : 'bg-pearl-iris'}`} />
                <span className={`font-ibm-mono text-[10px] ${isCrt ? 'text-neon-cyan/60' : 'text-pearl-iris/60'} tracking-[0.2em] uppercase`}>
                  Recent Messages
                </span>
              </div>
              <div className="space-y-2">
                {recentBarks.map((bark) => (
                  <div key={bark.id} className={`border ${barkBorder} px-3 py-2`}>
                    <span className={`font-ibm-mono text-[9px] ${subtitleColor} tracking-wider uppercase`}>
                      {bark.type}
                    </span>
                    <p className={`font-ibm-mono text-[11px] ${textColor} leading-relaxed mt-0.5`}>
                      {bark.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Helpful tips */}
          <div className="space-y-3 mt-6">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-1 h-1 ${isCrt ? 'bg-white/30' : 'bg-chrome-mid'}`} />
              <span className={`font-ibm-mono text-[10px] ${subtitleColor} tracking-[0.2em] uppercase`}>
                Helpful Reminders
              </span>
            </div>

            {[
              'Speak clearly into your device for the best evaluation results.',
              'Using approved vocabulary improves your Compliance Score!',
              'Your recordings help us help you. Thank you for sharing!',
            ].map((tip, i) => (
              <div key={i} className={`border ${tipBorder} p-2.5 flex items-start gap-2`}>
                <span className={`${tipIcon} text-xs mt-0.5`}>{'\u2665'}</span>
                <p className={`font-ibm-sans text-xs ${tipText} leading-relaxed`}>
                  {tip}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className={`px-5 py-3 border-t ${panelBorder}`}>
          <p className={`font-ibm-mono text-[9px] ${footerText} tracking-wider text-center`}>
            P.E.A.R.L. v4.7.1 — Ministry Approved Assistant
          </p>
        </div>
      </div>
    </div>
  );
}
