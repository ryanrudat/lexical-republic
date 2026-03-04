import { useMemo } from 'react';
import { useMessagingStore } from '../../stores/messagingStore';
import type { CharacterMessage } from '../../types/shiftQueue';

const CHARACTER_DOT_COLORS: Record<string, string> = {
  'Betty': 'bg-neon-mint',
  'Ivan': 'bg-neon-cyan',
  'M.K.': 'bg-terminal-amber',
  'Chad': 'bg-violet-400',
};

function MessagePreviewCard({ message }: { message: CharacterMessage }) {
  const selectMessage = useMessagingStore((s) => s.selectMessage);
  const markAsRead = useMessagingStore((s) => s.markAsRead);

  const dotColor = CHARACTER_DOT_COLORS[message.characterName] || 'bg-white/40';
  const hasReplied = !!message.studentReply;

  const preview = useMemo(() => {
    const text = message.messageText;
    return text.length > 60 ? text.slice(0, 60) + '...' : text;
  }, [message.messageText]);

  const timeAgo = useMemo(() => {
    const diff = Date.now() - new Date(message.createdAt).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  }, [message.createdAt]);

  const handleClick = () => {
    if (!message.isRead) {
      markAsRead(message.id);
    }
    selectMessage(message.id);
  };

  return (
    <button
      onClick={handleClick}
      className="w-full text-left ios-glass-card p-3 hover:bg-white/5 transition-colors cursor-pointer"
    >
      <div className="flex items-start gap-2.5">
        {/* Character color dot */}
        <div className={`w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 ${dotColor}`} />

        <div className="flex-1 min-w-0">
          {/* Name row */}
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-special-elite text-xs text-white/80 truncate">
                {message.characterName}
              </span>
              {message.designation && (
                <span className="font-ibm-mono text-[8px] text-white/25 tracking-wider flex-shrink-0">
                  {message.designation}
                </span>
              )}
            </div>
            <span className="font-ibm-mono text-[9px] text-white/20 flex-shrink-0">
              {timeAgo}
            </span>
          </div>

          {/* Message preview */}
          <p className="font-ibm-mono text-[11px] text-white/40 leading-relaxed truncate">
            {preview}
          </p>

          {/* Status row */}
          <div className="flex items-center gap-2 mt-1.5">
            {hasReplied ? (
              <span className="font-ibm-mono text-[8px] tracking-wider px-1.5 py-0.5 rounded-full bg-neon-cyan/10 text-neon-cyan/60 border border-neon-cyan/15">
                REPLIED
              </span>
            ) : !message.isRead ? (
              <span className="w-2 h-2 rounded-full bg-neon-pink animate-pulse" />
            ) : null}
          </div>
        </div>
      </div>
    </button>
  );
}

export default function InboxView() {
  const messages = useMessagingStore((s) => s.messages);

  // Sort most recent first
  const sorted = useMemo(
    () => [...messages].sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ),
    [messages]
  );

  if (sorted.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="font-ibm-mono text-xs text-white/20 tracking-wider">
          No messages yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {sorted.map((msg) => (
        <MessagePreviewCard key={msg.id} message={msg} />
      ))}
    </div>
  );
}
