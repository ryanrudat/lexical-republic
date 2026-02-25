import { useEffect, useState, useRef } from 'react';
import { usePearlStore } from '../../stores/pearlStore';

interface PearlPanelProps {
  open: boolean;
  onClose: () => void;
  variant?: 'chrome' | 'crt';
}

export default function PearlPanel({ open, onClose, variant = 'chrome' }: PearlPanelProps) {
  const { barkHistory, chatMessages, chatLoading, chatError, sendChat, clearChat } = usePearlStore();
  const [input, setInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatLoading]);

  // Focus input when panel opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || chatLoading) return;
    sendChat(trimmed);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const recentBarks = barkHistory.slice(-10).reverse();
  const isCrt = variant === 'crt';

  // Variant-specific styles
  const panelBg = isCrt ? 'bg-ios-bg/95' : 'bg-retro-warm-gray/95';
  const panelBorder = isCrt ? 'border-white/10' : 'border-chrome-mid';
  const titleColor = isCrt ? 'text-neon-cyan ios-text-glow' : 'text-retro-warm-wood';
  const subtitleColor = isCrt ? 'text-white/40' : 'text-chrome-dark/50';
  const statusDot = isCrt ? 'bg-neon-mint' : 'bg-neon-mint';
  const statusText = isCrt ? 'text-neon-cyan/70' : 'text-chrome-dark/60';
  const textColor = isCrt ? 'text-white/70' : 'text-retro-warm-wood/70';
  const accentColor = isCrt ? 'text-neon-cyan' : 'text-pearl-iris';
  const closeColor = isCrt ? 'text-white/40 hover:text-neon-pink' : 'text-chrome-dark/40 hover:text-neon-pink';
  const barkBorder = isCrt ? 'border-white/10' : 'border-chrome-mid/50';
  const footerText = isCrt ? 'text-white/20' : 'text-chrome-dark/30';
  const shadow = isCrt ? 'shadow-[-8px_0_30px_rgba(0,0,0,0.5)]' : 'shadow-[-8px_0_30px_rgba(0,0,0,0.15)]';

  // Chat-specific styles
  const chatBubbleUser = isCrt
    ? 'bg-neon-cyan/15 border-neon-cyan/30 text-white/90'
    : 'bg-pearl-iris/10 border-pearl-iris/30 text-retro-warm-wood';
  const chatBubblePearl = isCrt
    ? 'bg-white/5 border-white/10 text-white/80'
    : 'bg-white/50 border-chrome-mid text-retro-warm-wood/90';
  const inputBg = isCrt
    ? 'bg-ios-bg-subtle border-white/15 text-white/90 placeholder:text-white/30'
    : 'bg-white/60 border-chrome-mid text-retro-warm-wood placeholder:text-chrome-dark/30';
  const sendBtnActive = isCrt
    ? 'bg-neon-cyan/20 text-neon-cyan hover:bg-neon-cyan/30'
    : 'bg-pearl-iris/15 text-pearl-iris hover:bg-pearl-iris/25';
  const sendBtnDisabled = isCrt
    ? 'bg-white/5 text-white/20'
    : 'bg-chrome-mid/20 text-chrome-dark/20';

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

        {/* Content — scrollable area for chat + barks */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* Greeting */}
          <div className="mb-4">
            <p className={`font-ibm-sans text-sm ${textColor} leading-relaxed`}>
              Hello, Citizen! I'm here to help you on your journey toward
              <span className={` ${accentColor}`}> approved communication</span>.
              Ask me anything about your language studies.
            </p>
          </div>

          {/* Chat conversation */}
          {chatMessages.length > 0 && (
            <div className="space-y-3 mb-4">
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] border px-3 py-2 rounded-lg ${
                      msg.role === 'user' ? chatBubbleUser : chatBubblePearl
                    }`}
                  >
                    {msg.role === 'assistant' && (
                      <span className={`font-ibm-mono text-[9px] ${subtitleColor} tracking-wider uppercase block mb-1`}>
                        PEARL
                      </span>
                    )}
                    <p className="font-ibm-sans text-[12px] leading-relaxed">
                      {msg.content}
                    </p>
                  </div>
                </div>
              ))}

              {/* Loading indicator */}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className={`border px-3 py-2 rounded-lg ${chatBubblePearl}`}>
                    <span className={`font-ibm-mono text-[9px] ${subtitleColor} tracking-wider uppercase block mb-1`}>
                      PEARL
                    </span>
                    <div className="flex items-center gap-1">
                      <span className={`inline-block w-1.5 h-1.5 rounded-full ${isCrt ? 'bg-neon-cyan' : 'bg-pearl-iris'} animate-pulse`} />
                      <span className={`inline-block w-1.5 h-1.5 rounded-full ${isCrt ? 'bg-neon-cyan' : 'bg-pearl-iris'} animate-pulse`} style={{ animationDelay: '0.2s' }} />
                      <span className={`inline-block w-1.5 h-1.5 rounded-full ${isCrt ? 'bg-neon-cyan' : 'bg-pearl-iris'} animate-pulse`} style={{ animationDelay: '0.4s' }} />
                    </div>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>
          )}

          {/* Error display */}
          {chatError && (
            <div className={`mb-3 px-3 py-2 border ${isCrt ? 'border-neon-pink/30 text-neon-pink/70' : 'border-neon-pink/20 text-neon-pink/60'} rounded text-[11px] font-ibm-mono`}>
              {chatError}
            </div>
          )}

          {/* Recent barks log */}
          {recentBarks.length > 0 && (
            <div className="mt-4">
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
        </div>

        {/* Chat input — pinned to bottom */}
        <div className={`px-4 py-3 border-t ${panelBorder}`}>
          {/* Clear + char counter row */}
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={clearChat}
              className={`font-ibm-mono text-[10px] tracking-wider transition-colors ${
                chatMessages.length > 0
                  ? (isCrt ? 'text-white/40 hover:text-neon-pink' : 'text-chrome-dark/40 hover:text-neon-pink')
                  : (isCrt ? 'text-white/15' : 'text-chrome-dark/15')
              }`}
              disabled={chatMessages.length === 0}
            >
              CLEAR LOG
            </button>
            <span className={`font-ibm-mono text-[10px] ${input.length > 180 ? (isCrt ? 'text-neon-pink/70' : 'text-neon-pink/60') : (isCrt ? 'text-white/25' : 'text-chrome-dark/25')}`}>
              {input.length}/200
            </span>
          </div>

          {/* Input row */}
          <div className="flex items-center gap-2">
            <span className={`font-ibm-mono text-[10px] ${accentColor} tracking-wider shrink-0`}>
              ASK &gt;
            </span>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value.slice(0, 200))}
              onKeyDown={handleKeyDown}
              placeholder="Ask PEARL a question..."
              maxLength={200}
              disabled={chatLoading}
              className={`flex-1 font-ibm-sans text-[12px] px-2.5 py-1.5 rounded border outline-none transition-colors ${inputBg}`}
            />
            <button
              onClick={handleSend}
              disabled={chatLoading || !input.trim()}
              className={`font-ibm-mono text-[10px] tracking-wider px-2.5 py-1.5 rounded transition-colors ${
                input.trim() && !chatLoading ? sendBtnActive : sendBtnDisabled
              }`}
            >
              SEND
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className={`px-5 py-2 border-t ${panelBorder}`}>
          <p className={`font-ibm-mono text-[9px] ${footerText} tracking-wider text-center`}>
            P.E.A.R.L. v4.7.1 — Ministry Approved Assistant
          </p>
        </div>
      </div>
    </div>
  );
}
