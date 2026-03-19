import { useMemo } from 'react';
import { useMessagingStore } from '../../stores/messagingStore';
import type { CharacterMessage, ThreadEntry } from '../../types/shiftQueue';

const CHARACTER_DOT_COLORS: Record<string, string> = {
  'Betty': 'bg-neon-mint',
  'Ivan': 'bg-neon-cyan',
  'M.K.': 'bg-terminal-amber',
  'Chad': 'bg-violet-400',
  'Clarity Minder': 'bg-amber-400',
};

/** One inbox row per character — groups all messages from the same person */
interface ConversationGroup {
  characterName: string;
  designation: string;
  /** All messages from this character, oldest first */
  messages: CharacterMessage[];
  /** Most recent message timestamp */
  latestAt: number;
  /** Any unread messages in the group? */
  hasUnread: boolean;
  /** Has a thread-type message? */
  hasThread: boolean;
  /** Number of messages the student has replied to */
  repliedCount: number;
}

function ConversationCard({ group }: { group: ConversationGroup }) {
  const selectConversation = useMessagingStore((s) => s.selectConversation);
  const markAsRead = useMessagingStore((s) => s.markAsRead);

  const dotColor = CHARACTER_DOT_COLORS[group.characterName] || 'bg-white/40';
  const latest = group.messages[group.messages.length - 1];

  const preview = useMemo(() => {
    // Show preview from the most recent message
    if (latest.replyType === 'thread') {
      const thread = (latest.thread ?? []) as ThreadEntry[];
      if (thread.length > 0) {
        const last = thread[thread.length - 1];
        const prefix = last.sender === 'teacher' ? 'Minder: ' : 'You: ';
        const text = prefix + last.text;
        return text.length > 60 ? text.slice(0, 60) + '...' : text;
      }
    }
    const text = latest.messageText;
    return text.length > 60 ? text.slice(0, 60) + '...' : text;
  }, [latest]);

  const timeAgo = (() => {
    const diff = Date.now() - group.latestAt;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  })();

  const handleClick = () => {
    // Mark all unread messages in this conversation as read
    for (const msg of group.messages) {
      if (!msg.isRead) markAsRead(msg.id);
    }
    selectConversation(group.characterName);
  };

  const msgCount = group.messages.length;

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
                {group.characterName}
              </span>
              {group.designation && (
                <span className="font-ibm-mono text-[8px] text-white/25 tracking-wider flex-shrink-0">
                  {group.designation}
                </span>
              )}
              {msgCount > 1 && (
                <span className="font-ibm-mono text-[8px] text-white/20 flex-shrink-0">
                  ({msgCount})
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
            {group.hasThread && (
              <span className="font-ibm-mono text-[8px] tracking-wider px-1.5 py-0.5 rounded-full bg-amber-400/10 text-amber-400/60 border border-amber-400/15">
                THREAD
              </span>
            )}
            {group.repliedCount > 0 && !group.hasThread && (
              <span className="font-ibm-mono text-[8px] tracking-wider px-1.5 py-0.5 rounded-full bg-neon-cyan/10 text-neon-cyan/60 border border-neon-cyan/15">
                REPLIED
              </span>
            )}
            {group.hasUnread && (
              <span className="w-2 h-2 rounded-full bg-neon-pink animate-pulse" />
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

export default function InboxView() {
  const messages = useMessagingStore((s) => s.messages);

  // Group messages by characterName
  const groups = useMemo(() => {
    const map = new Map<string, ConversationGroup>();

    // Sort all messages oldest-first so each group accumulates in chronological order
    const sorted = [...messages].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    for (const msg of sorted) {
      const key = msg.characterName;
      const existing = map.get(key);
      if (existing) {
        existing.messages.push(msg);
        const ts = new Date(msg.createdAt).getTime();
        if (ts > existing.latestAt) existing.latestAt = ts;
        if (!msg.isRead) existing.hasUnread = true;
        if (msg.replyType === 'thread') existing.hasThread = true;
        if (msg.studentReply) existing.repliedCount++;
      } else {
        map.set(key, {
          characterName: msg.characterName,
          designation: msg.designation,
          messages: [msg],
          latestAt: new Date(msg.createdAt).getTime(),
          hasUnread: !msg.isRead,
          hasThread: msg.replyType === 'thread',
          repliedCount: msg.studentReply ? 1 : 0,
        });
      }
    }

    // Sort groups by most recent message first
    return [...map.values()].sort((a, b) => b.latestAt - a.latestAt);
  }, [messages]);

  if (groups.length === 0) {
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
      {groups.map((group) => (
        <ConversationCard key={group.characterName} group={group} />
      ))}
    </div>
  );
}
