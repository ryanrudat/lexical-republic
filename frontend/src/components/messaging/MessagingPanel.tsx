import { useEffect, useState, useCallback } from 'react';
import { useMessagingStore } from '../../stores/messagingStore';
import type { CharacterMessage, ReplyOption } from '../../types/shiftQueue';

const CHARACTER_COLORS: Record<string, string> = {
  'Betty': 'border-neon-mint/40',
  'Ivan': 'border-neon-cyan/40',
  'M.K.': 'border-terminal-amber/40',
  'Chad': 'border-violet-400/40',
};

function MessageThread({ message }: { message: CharacterMessage }) {
  const sendReply = useMessagingStore((s) => s.sendReply);
  const markAsRead = useMessagingStore((s) => s.markAsRead);
  const [replying, setReplying] = useState(false);
  const [showResponse, setShowResponse] = useState(false);
  const [selectedReply, setSelectedReply] = useState<ReplyOption | null>(null);

  useEffect(() => {
    if (!message.isRead) {
      markAsRead(message.id);
    }
  }, [message.id, message.isRead, markAsRead]);

  const borderColor = CHARACTER_COLORS[message.characterName] || 'border-white/20';
  const replyOptions = message.replyOptions as ReplyOption[] | null;
  const hasReplied = !!message.studentReply;

  const handleReply = useCallback(async (option: ReplyOption) => {
    setReplying(true);
    setSelectedReply(option);
    await sendReply(message.id, option.text);

    // Silent pattern: null responseText = read receipt only
    if (option.responseText === null) {
      setTimeout(() => {
        setShowResponse(true);
        setReplying(false);
      }, 500);
    } else {
      // Normal reply: show typing indicator, then response
      setTimeout(() => {
        setShowResponse(true);
        setReplying(false);
      }, 800);
    }
  }, [message.id, sendReply]);

  return (
    <div className="space-y-2">
      {/* Character message */}
      <div className={`ios-glass-card border-l-2 ${borderColor} p-3`}>
        <div className="flex items-center gap-2 mb-1.5">
          <span className="font-special-elite text-xs text-white/80">
            {message.characterName}
          </span>
          {message.designation && (
            <span className="font-ibm-mono text-[8px] text-white/25 tracking-wider">
              {message.designation}
            </span>
          )}
        </div>
        <p className="font-ibm-mono text-[11px] text-white/60 leading-relaxed whitespace-pre-wrap">
          {message.messageText}
        </p>
      </div>

      {/* Reply options (if not yet replied) */}
      {!hasReplied && replyOptions && !selectedReply && (
        <div className="flex flex-col gap-1.5 pl-4">
          {replyOptions.map((option, idx) => (
            <button
              key={idx}
              onClick={() => handleReply(option)}
              className="ios-glass-pill px-3 py-2 text-left font-ibm-mono text-[11px] text-neon-cyan/70 hover:text-neon-cyan hover:border-neon-cyan/30 transition-all"
            >
              {option.text}
            </button>
          ))}
        </div>
      )}

      {/* Student reply */}
      {(hasReplied || selectedReply) && (
        <div className="flex justify-end pl-8">
          <div className="ios-glass-card border border-neon-cyan/20 bg-neon-cyan/5 p-2.5 max-w-[85%]">
            <p className="font-ibm-mono text-[11px] text-white/70">
              {message.studentReply || selectedReply?.text}
            </p>
          </div>
        </div>
      )}

      {/* Typing indicator */}
      {replying && !showResponse && selectedReply?.responseText !== null && (
        <div className={`ios-glass-card border-l-2 ${borderColor} p-2.5 max-w-[70%]`}>
          <div className="flex gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      )}

      {/* Character response */}
      {showResponse && selectedReply && (
        selectedReply.responseText === null ? (
          // Silent pattern (M.K.)
          <div className="pl-4">
            <span className="font-ibm-mono text-[10px] text-white/20 italic">(Read)</span>
          </div>
        ) : (
          <div className={`ios-glass-card border-l-2 ${borderColor} p-2.5 max-w-[85%]`}>
            <p className="font-ibm-mono text-[11px] text-white/60 leading-relaxed">
              {selectedReply.responseText}
            </p>
          </div>
        )
      )}
    </div>
  );
}

export default function MessagingPanel() {
  const isPanelOpen = useMessagingStore((s) => s.isPanelOpen);
  const closePanel = useMessagingStore((s) => s.closePanel);
  const messages = useMessagingStore((s) => s.messages);

  return (
    <>
      {/* Dark overlay */}
      {isPanelOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[40] transition-opacity"
          onClick={closePanel}
        />
      )}

      {/* Panel */}
      <div
        className={`fixed right-0 top-0 h-full w-[360px] max-w-[90vw] z-[41] bg-ios-bg/95 backdrop-blur-xl border-l border-white/10 transition-transform duration-500 ease-out ${
          isPanelOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div>
            <h2 className="font-ibm-mono text-xs text-white/80 tracking-[0.2em] uppercase">
              Messages
            </h2>
            <p className="font-ibm-mono text-[9px] text-white/30 tracking-wider mt-0.5">
              Department Communications
            </p>
          </div>
          <button
            onClick={closePanel}
            className="ios-glass-pill px-2 py-1 font-ibm-mono text-[10px] text-white/40 hover:text-white transition-colors"
          >
            CLOSE
          </button>
        </div>

        {/* Messages list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ maxHeight: 'calc(100vh - 52px)' }}>
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <p className="font-ibm-mono text-xs text-white/20 tracking-wider">
                No messages yet.
              </p>
            </div>
          ) : (
            messages.map((msg) => (
              <MessageThread key={msg.id} message={msg} />
            ))
          )}
        </div>
      </div>
    </>
  );
}
