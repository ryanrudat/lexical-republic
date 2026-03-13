import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useMessagingStore } from '../../stores/messagingStore';
import type { CharacterMessage, ReplyOption, ThreadEntry } from '../../types/shiftQueue';

const CHARACTER_COLORS: Record<string, string> = {
  'Betty': 'border-neon-mint/40',
  'Ivan': 'border-neon-cyan/40',
  'M.K.': 'border-terminal-amber/40',
  'Chad': 'border-violet-400/40',
  'Clarity Minder': 'border-amber-400/40',
};

const CHARACTER_DOT_COLORS: Record<string, string> = {
  'Betty': 'bg-neon-mint',
  'Ivan': 'bg-neon-cyan',
  'M.K.': 'bg-terminal-amber',
  'Chad': 'bg-violet-400',
  'Clarity Minder': 'bg-amber-400',
};

// ─── Thread mode: teacher↔student back-and-forth ─────────────

function ThreadConversation({ message }: { message: CharacterMessage }) {
  const markAsRead = useMessagingStore((s) => s.markAsRead);
  const appendToThread = useMessagingStore((s) => s.appendToThread);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const thread = (message.thread ?? []) as ThreadEntry[];

  useEffect(() => {
    if (!message.isRead) {
      markAsRead(message.id);
    }
  }, [message.id, message.isRead, markAsRead]);

  // Auto-scroll on new entries
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [thread.length]);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setInput('');
    await appendToThread(message.id, trimmed);
    setSending(false);
  }, [input, sending, message.id, appendToThread]);

  const timeAgo = useMemo(() => {
    const diff = Date.now() - new Date(message.createdAt).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }, [message.createdAt]);

  return (
    <div className="space-y-3 animate-threadSlideIn">
      {/* Clarity Minder header */}
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-3 h-3 rounded-full bg-amber-400" />
        <div>
          <span className="font-special-elite text-sm text-white/80">
            Clarity Minder
          </span>
          <p className="font-ibm-mono text-[9px] text-white/30 tracking-wider">
            Ministry Oversight
          </p>
        </div>
        <span className="ml-auto font-ibm-mono text-[9px] text-white/20">
          {timeAgo}
        </span>
      </div>

      {/* Scrollable conversation area */}
      <div ref={scrollRef} className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
        {/* Initial teacher message */}
        <div className="ios-glass-card border-l-2 border-amber-400/40 p-3 max-w-[85%]">
          <p className="font-ibm-mono text-[11px] text-white/60 leading-relaxed whitespace-pre-wrap">
            {message.messageText}
          </p>
        </div>

        {/* Thread entries */}
        {thread.map((entry, idx) => (
          entry.sender === 'teacher' ? (
            <div key={idx} className="ios-glass-card border-l-2 border-amber-400/40 p-2.5 max-w-[85%]">
              <p className="font-ibm-mono text-[11px] text-white/60 leading-relaxed whitespace-pre-wrap">
                {entry.text}
              </p>
            </div>
          ) : (
            <div key={idx} className="flex justify-end pl-8">
              <div className="ios-glass-card border border-neon-cyan/20 bg-neon-cyan/5 p-2.5 max-w-[85%]">
                <p className="font-ibm-mono text-[11px] text-white/70 whitespace-pre-wrap">
                  {entry.text}
                </p>
              </div>
            </div>
          )
        ))}
      </div>

      {/* Reply input */}
      <div className="flex gap-2 pt-1">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value.slice(0, 200))}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
          placeholder="Reply to Clarity Minder..."
          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 font-ibm-mono text-[11px] text-white/70 placeholder:text-white/20 focus:outline-none focus:border-amber-400/40"
          disabled={sending}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || sending}
          className="px-3 py-2 rounded-lg bg-amber-400/20 text-amber-300 font-ibm-mono text-[11px] hover:bg-amber-400/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
        >
          Send
        </button>
      </div>
      <p className="font-ibm-mono text-[9px] text-white/15 text-right">
        {input.length}/200
      </p>
    </div>
  );
}

// ─── Standard canned-reply mode ──────────────────────────────

function CannedThreadView({ message }: { message: CharacterMessage }) {
  const sendReply = useMessagingStore((s) => s.sendReply);
  const markAsRead = useMessagingStore((s) => s.markAsRead);

  // Reconstruct selected reply from DB data on reload
  const reconstructedReply = useMemo(() => {
    if (!message.studentReply || !message.replyOptions) return null;
    return (message.replyOptions as ReplyOption[]).find(
      opt => opt.text === message.studentReply
    ) || null;
  }, [message.studentReply, message.replyOptions]);

  const [selectedReply, setSelectedReply] = useState<ReplyOption | null>(reconstructedReply);
  const [showResponse, setShowResponse] = useState(!!reconstructedReply);
  const [replying, setReplying] = useState(false);

  useEffect(() => {
    if (!message.isRead) {
      markAsRead(message.id);
    }
  }, [message.id, message.isRead, markAsRead]);

  const borderColor = CHARACTER_COLORS[message.characterName] || 'border-white/20';
  const dotColor = CHARACTER_DOT_COLORS[message.characterName] || 'bg-white/40';
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

  // Relative timestamp
  const timeAgo = useMemo(() => {
    const diff = Date.now() - new Date(message.createdAt).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }, [message.createdAt]);

  return (
    <div className="space-y-3 animate-threadSlideIn">
      {/* Character info header */}
      <div className="flex items-center gap-2.5 mb-4">
        <div className={`w-3 h-3 rounded-full ${dotColor}`} />
        <div>
          <span className="font-special-elite text-sm text-white/80">
            {message.characterName}
          </span>
          {message.designation && (
            <p className="font-ibm-mono text-[9px] text-white/30 tracking-wider">
              {message.designation}
            </p>
          )}
        </div>
        <span className="ml-auto font-ibm-mono text-[9px] text-white/20">
          {timeAgo}
        </span>
      </div>

      {/* Character message */}
      <div className={`ios-glass-card border-l-2 ${borderColor} p-3`}>
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

// ─── Main export: picks mode based on replyType ──────────────

export default function ThreadView({ message }: { message: CharacterMessage }) {
  if (message.replyType === 'thread') {
    return <ThreadConversation message={message} />;
  }
  return <CannedThreadView message={message} />;
}
