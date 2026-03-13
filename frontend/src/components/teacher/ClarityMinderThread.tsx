import { useEffect, useState, useCallback, useRef } from 'react';
import { useTeacherStore } from '../../stores/teacherStore';
import { fetchDirectMessages, sendDirectMessage, appendToThread } from '../../api/messages';
import type { CharacterMessage, ThreadEntry } from '../../types/shiftQueue';

interface Props {
  studentId: string;
  designation: string;
  weekNumber: number | null;
}

export default function ClarityMinderThread({ studentId, designation, weekNumber }: Props) {
  const [messages, setMessages] = useState<CharacterMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const clarityReplyTick = useTeacherStore((s) => s.clarityReplyTick);
  const clarityThreads = useTeacherStore((s) => s.clarityThreads);
  const setClarityThreads = useTeacherStore((s) => s.setClarityThreads);

  // Load messages on mount
  useEffect(() => {
    setLoading(true);
    fetchDirectMessages(studentId)
      .then(({ messages: msgs }) => {
        setMessages(msgs);
        setClarityThreads(studentId, msgs);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [studentId, setClarityThreads]);

  // Merge incoming real-time replies from store
  useEffect(() => {
    const cached = clarityThreads.get(studentId);
    if (cached) setMessages(cached);
  }, [clarityReplyTick, studentId, clarityThreads]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setInput('');

    try {
      // If no existing thread, create a new direct message
      // Otherwise append to the most recent thread
      const lastThread = messages[messages.length - 1];
      let updated: CharacterMessage;

      if (!lastThread) {
        updated = await sendDirectMessage(studentId, trimmed, weekNumber ?? 0);
        const newMsgs = [...messages, updated];
        setMessages(newMsgs);
        setClarityThreads(studentId, newMsgs);
      } else {
        updated = await appendToThread(lastThread.id, trimmed);
        const newMsgs = messages.map((m) => (m.id === updated.id ? updated : m));
        setMessages(newMsgs);
        setClarityThreads(studentId, newMsgs);
      }
    } catch {
      // Restore input on failure
      setInput(trimmed);
    } finally {
      setSending(false);
    }
  }, [input, sending, messages, studentId, weekNumber, setClarityThreads]);

  // Flatten all messages + thread entries into a chronological list
  const entries: Array<{ sender: 'teacher' | 'student'; text: string; timestamp: string; isInitial?: boolean }> = [];
  for (const msg of messages) {
    entries.push({
      sender: 'teacher',
      text: msg.messageText,
      timestamp: msg.createdAt,
      isInitial: true,
    });
    const thread = (msg.thread ?? []) as ThreadEntry[];
    for (const e of thread) {
      entries.push(e);
    }
  }

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <div className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider mb-1.5">
        Clarity Minder — {designation}
      </div>

      {loading ? (
        <p className="text-[11px] text-slate-400 animate-pulse">Loading...</p>
      ) : (
        <>
          {/* Conversation area */}
          <div
            ref={scrollRef}
            className="max-h-[200px] overflow-y-auto space-y-1.5 mb-2"
          >
            {entries.length === 0 && (
              <p className="text-[11px] text-slate-400 italic">
                No messages yet. Send one below.
              </p>
            )}
            {entries.map((entry, idx) => (
              entry.sender === 'teacher' ? (
                <div key={idx} className="flex">
                  <div className="max-w-[85%] bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                    <p className="text-[11px] text-slate-700 whitespace-pre-wrap">{entry.text}</p>
                  </div>
                </div>
              ) : (
                <div key={idx} className="flex justify-end">
                  <div className="max-w-[85%] bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5">
                    <p className="text-[11px] text-slate-600 whitespace-pre-wrap">{entry.text}</p>
                  </div>
                </div>
              )
            ))}
          </div>

          {/* Input */}
          <div className="flex gap-1.5">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value.slice(0, 500))}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
              placeholder="Message student..."
              className="flex-1 text-[11px] px-2.5 py-1.5 rounded-md border border-slate-200 bg-white text-slate-700 placeholder:text-slate-300 focus:outline-none focus:border-amber-400"
              disabled={sending}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending}
              className="px-3 py-1.5 text-[11px] rounded-md bg-amber-500 text-white font-medium hover:bg-amber-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
            >
              {sending ? '...' : 'Send'}
            </button>
          </div>
          <p className="text-[9px] text-slate-300 text-right mt-0.5">
            {input.length}/500
          </p>
        </>
      )}
    </div>
  );
}
