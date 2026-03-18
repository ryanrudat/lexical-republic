import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useHarmonyStore } from '../../../stores/harmonyStore';
import type { HarmonyPost, CensureItem } from '../../../api/harmony';

/* ─── Result Overlay (neon check / X) ──────────────────────────── */

function ResultOverlay({ isCorrect, onDone }: { isCorrect: boolean; onDone: () => void }) {
  const [phase, setPhase] = useState<'enter' | 'hold' | 'exit'>('enter');
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    // Enter → hold
    const t1 = setTimeout(() => setPhase('hold'), 50);
    // Hold → exit after 3s
    const t2 = setTimeout(() => setPhase('exit'), 3000);
    // Remove after exit animation
    const t3 = setTimeout(() => onDone(), 3500);
    timerRef.current = t3;
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  const opacity = phase === 'enter' ? 'opacity-0 scale-50' : phase === 'hold' ? 'opacity-100 scale-100' : 'opacity-0 scale-75';
  const glowColor = isCorrect ? 'shadow-[0_0_60px_rgba(74,222,128,0.5)]' : 'shadow-[0_0_60px_rgba(244,63,94,0.5)]';
  const borderColor = isCorrect ? 'border-green-400' : 'border-rose-500';
  const iconColor = isCorrect ? 'text-green-400' : 'text-rose-500';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
      <div className={`w-32 h-32 rounded-2xl border-2 ${borderColor} bg-black/80 ${glowColor} flex items-center justify-center transition-all duration-500 ease-out ${opacity}`}>
        {isCorrect ? (
          <svg className={`w-20 h-20 ${iconColor} drop-shadow-[0_0_12px_rgba(74,222,128,0.8)]`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        ) : (
          <svg className={`w-20 h-20 ${iconColor} drop-shadow-[0_0_12px_rgba(244,63,94,0.8)]`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        )}
      </div>
    </div>
  );
}

/* ─── Helpers ───────────────────────────────────────────────────── */

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d`;
  return new Intl.DateTimeFormat([], { month: 'short', day: 'numeric' }).format(date);
}

function isCitizen4488(post: HarmonyPost): boolean {
  return post.designation === 'Citizen-4488';
}

/* ─── Word Highlighting ─────────────────────────────────────────── */

function VocabWord({
  text,
  type,
}: {
  text: string;
  type: 'focus' | 'review';
}) {
  const [showTip, setShowTip] = useState(false);
  const label = type === 'focus' ? 'Target word' : 'Review word';
  const color = type === 'focus'
    ? 'text-teal-800 font-medium'
    : 'text-terminal-amber';
  const tipBg = type === 'focus'
    ? 'bg-teal-800/20 border-teal-800/30 text-teal-800'
    : 'bg-terminal-amber/20 border-terminal-amber/30 text-terminal-amber';

  return (
    <span className="relative inline">
      <span
        className={`${color} cursor-help underline decoration-dotted decoration-1 underline-offset-2`}
        onClick={() => setShowTip(!showTip)}
      >
        {text}
      </span>
      {showTip && (
        <span
          className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-0.5 rounded text-[9px] font-medium border whitespace-nowrap z-10 ${tipBg}`}
        >
          {label}
        </span>
      )}
    </span>
  );
}

function HighlightedContent({
  content,
  focusWords,
  reviewWords,
}: {
  content: string;
  focusWords: string[];
  reviewWords: string[];
}) {
  const allWords = useMemo(() => {
    const focusSet = new Set(focusWords.map((w) => w.toLowerCase()));
    const reviewSet = new Set(reviewWords.map((w) => w.toLowerCase()));
    return { focusSet, reviewSet };
  }, [focusWords, reviewWords]);

  const parts = useMemo(() => {
    const words = content.split(/(\s+)/);
    return words.map((segment, i) => {
      const cleaned = segment.replace(/[^a-zA-Z]/g, '').toLowerCase();
      if (!cleaned) return { key: i, text: segment, type: 'plain' as const };
      if (allWords.focusSet.has(cleaned))
        return { key: i, text: segment, type: 'focus' as const };
      if (allWords.reviewSet.has(cleaned))
        return { key: i, text: segment, type: 'review' as const };
      return { key: i, text: segment, type: 'plain' as const };
    });
  }, [content, allWords]);

  return (
    <p className="text-[13px] text-[#1A3035] leading-relaxed">
      {parts.map((p) => {
        if (p.type === 'focus' || p.type === 'review')
          return <VocabWord key={p.key} text={p.text} type={p.type} />;
        return <span key={p.key}>{p.text}</span>;
      })}
    </p>
  );
}

/* ─── Compose Box ───────────────────────────────────────────────── */

function ComposeBox({
  placeholder,
  onSubmit,
  submitLabel,
}: {
  placeholder: string;
  onSubmit: (content: string) => Promise<void>;
  submitLabel: string;
}) {
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(text.trim());
      setText('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="px-4 py-3 border-b border-black/[0.08]">
      <div className="flex gap-3">
        <div className="w-8 h-8 rounded-full bg-teal-800/15 border border-teal-800/20 flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-[9px] font-bold text-teal-800">YOU</span>
        </div>
        <div className="flex-1">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={placeholder}
            className="w-full bg-transparent text-sm text-[#1A3035] placeholder:text-[#8AAAB0] resize-none outline-none"
            rows={2}
            maxLength={280}
          />
          <div className="flex items-center justify-between mt-1.5">
            <span className="font-ibm-mono text-[10px] text-[#8AAAB0]">
              {text.length}/280
            </span>
            <button
              type="submit"
              disabled={!text.trim() || submitting}
              className="px-4 py-1.5 rounded-full text-[11px] font-medium tracking-wider bg-teal-800/15 text-teal-800 border border-teal-800/25 hover:bg-teal-800/25 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
            >
              {submitting ? 'POSTING...' : submitLabel}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

/* ─── Post Card (Social Media Style) ────────────────────────────── */

function PostCard({
  post,
  focusWords,
  reviewWords,
  onOpenThread,
  onCensure,
  onDelete,
}: {
  post: HarmonyPost;
  focusWords: string[];
  reviewWords: string[];
  onOpenThread: (postId: string) => void;
  onCensure?: (postId: string, action: 'approve' | 'flag', weekNumber: number) => void;
  onDelete?: (postId: string) => void;
}) {
  const is4488 = isCitizen4488(post);
  const [censureAction, setCensureAction] = useState<'approve' | 'flag' | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const avatarColor = is4488
    ? 'bg-terminal-amber/15 border-terminal-amber/30 text-terminal-amber'
    : post.isOwn
      ? 'bg-teal-800/15 border-teal-800/25 text-teal-800'
      : 'bg-black/[0.06] border-black/10 text-[#4A6A6E]';

  const designation = post.isOwn ? 'YOU' : post.designation;
  const initials = designation.slice(0, 3).toUpperCase();

  const handleCensureAction = (action: 'approve' | 'flag') => {
    if (censureAction || !onCensure) return;
    setCensureAction(action);
    onCensure(post.id, action, post.weekNumber ?? 1);
  };

  return (
    <div
      className={`px-4 py-3 border-b border-black/[0.08] hover:bg-black/[0.03] transition-colors ${
        is4488 ? 'bg-terminal-amber/[0.02]' : ''
      }`}
    >
      <div className="flex gap-3">
        {/* Avatar */}
        <div className={`w-9 h-9 rounded-full border flex items-center justify-center shrink-0 ${avatarColor}`}>
          {is4488 ? (
            <span className="text-[9px] font-bold">4488</span>
          ) : (
            <span className="text-[8px] font-bold">{initials}</span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header row */}
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`text-[13px] font-medium ${is4488 ? 'text-terminal-amber' : post.isOwn ? 'text-teal-800' : 'text-[#1A3035]'}`}>
              {designation}
            </span>
            {post.weekNumber != null && (
              <span className="text-[10px] text-[#7A9A9E]">
                S{post.weekNumber}
              </span>
            )}
            {post.status === 'pending_review' && (
              <span className="text-[9px] text-teal-800/60 tracking-wider">
                PENDING
              </span>
            )}
            <span className="text-[11px] text-[#8AAAB0] ml-auto">
              {formatTimestamp(post.createdAt)}
            </span>
          </div>

          {/* Post body */}
          <HighlightedContent
            content={post.content}
            focusWords={focusWords}
            reviewWords={reviewWords}
          />

          {/* PEARL note */}
          {post.pearlNote && (
            <div className="mt-2 pl-2 border-l-2 border-teal-800/20">
              <p className="text-[10px] text-teal-800/60 italic">
                PEARL: {post.pearlNote}
              </p>
            </div>
          )}

          {/* Citizen-4488 interaction */}
          {is4488 && !post.isOwn && onCensure && (
            <div className="mt-2 flex items-center gap-2">
              {censureAction ? (
                <span className={`text-[10px] tracking-wider font-medium ${
                  censureAction === 'approve' ? 'text-green-400' : 'text-rose-700'
                }`}>
                  {censureAction === 'approve' ? 'APPROVED' : 'FLAGGED FOR REVIEW'}
                </span>
              ) : (
                <>
                  <span className="text-[9px] text-terminal-amber/40 tracking-wider mr-1">COMPLIANCE:</span>
                  <button
                    onClick={() => handleCensureAction('approve')}
                    className="text-[10px] px-2.5 py-1 rounded-md border border-green-500/20 text-green-400/70 hover:bg-green-500/10 hover:text-green-400 transition-colors active:scale-95"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleCensureAction('flag')}
                    className="text-[10px] px-2.5 py-1 rounded-md border border-rose-700/20 text-rose-700/60 hover:bg-rose-700/10 hover:text-rose-700 transition-colors active:scale-95"
                  >
                    Flag
                  </button>
                </>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="mt-2 flex items-center gap-4">
            <button
              onClick={() => onOpenThread(post.id)}
              className="text-[11px] text-[#7A9A9E] hover:text-teal-800/60 transition-colors flex items-center gap-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
              </svg>
              {post.replyCount > 0 ? post.replyCount : ''}
            </button>

            {/* Delete — own posts only */}
            {post.isOwn && onDelete && (
              confirmDelete ? (
                <span className="flex items-center gap-1.5">
                  <span className="text-[10px] text-rose-700/60">Delete?</span>
                  <button
                    onClick={() => { onDelete(post.id); setConfirmDelete(false); }}
                    className="text-[10px] text-rose-700 hover:text-rose-700/80 transition-colors active:scale-95"
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="text-[10px] text-[#6A8A8E] hover:text-[#4A6A6E] transition-colors"
                  >
                    No
                  </button>
                </span>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="text-[11px] text-[#8AAAB0] hover:text-rose-700/60 transition-colors flex items-center gap-1"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                  </svg>
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Thread View ───────────────────────────────────────────────── */

function ThreadView({
  focusWords,
  reviewWords,
}: {
  focusWords: string[];
  reviewWords: string[];
}) {
  const {
    posts,
    selectedPostId,
    replies,
    repliesLoading,
    closeThread,
    submitReply,
  } = useHarmonyStore();

  const parentPost = posts.find((p) => p.id === selectedPostId);
  if (!parentPost) return null;

  return (
    <div className="flex flex-col h-full">
      {/* Thread header */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-black/[0.08]">
        <button
          onClick={closeThread}
          className="text-xs text-[#5A7A7E] hover:text-teal-800 transition-colors flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Back
        </button>
        <span className="text-[10px] text-[#8AAAB0] tracking-[0.2em] uppercase">
          Thread
        </span>
      </div>

      {/* Thread content */}
      <div className="flex-1 overflow-auto">
        {/* Parent post */}
        <div className="px-4 py-3 border-b border-black/[0.08]">
          <div className="flex gap-3">
            <div className={`w-9 h-9 rounded-full border flex items-center justify-center shrink-0 ${
              isCitizen4488(parentPost) ? 'bg-terminal-amber/15 border-terminal-amber/30' : 'bg-black/[0.06] border-black/10'
            }`}>
              <span className={`text-[8px] font-bold ${isCitizen4488(parentPost) ? 'text-terminal-amber' : 'text-[#4A6A6E]'}`}>
                {(parentPost.isOwn ? 'YOU' : parentPost.designation).slice(0, 4)}
              </span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[13px] font-medium text-[#1A3035]">
                  {parentPost.isOwn ? 'YOU' : parentPost.designation}
                </span>
                <span className="text-[11px] text-[#8AAAB0]">
                  {formatTimestamp(parentPost.createdAt)}
                </span>
              </div>
              <HighlightedContent content={parentPost.content} focusWords={focusWords} reviewWords={reviewWords} />
            </div>
          </div>
        </div>

        {/* Replies */}
        {repliesLoading && (
          <div className="text-xs text-teal-800/50 animate-pulse text-center py-6 tracking-wider">
            LOADING...
          </div>
        )}

        {replies.map((reply) => (
          <div key={reply.id} className="px-4 py-2.5 border-b border-black/[0.06] ml-6">
            <div className="flex gap-2.5">
              <div className="w-7 h-7 rounded-full bg-black/[0.04] border border-black/[0.1] flex items-center justify-center shrink-0">
                <span className="text-[7px] font-bold text-[#5A7A7E]">
                  {reply.designation.slice(0, 3)}
                </span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[12px] font-medium text-[#2A4A4E]">{reply.designation}</span>
                  <span className="text-[10px] text-[#8AAAB0]">{formatTimestamp(reply.createdAt)}</span>
                </div>
                <HighlightedContent content={reply.content} focusWords={focusWords} reviewWords={reviewWords} />
              </div>
            </div>
          </div>
        ))}

        {!repliesLoading && replies.length === 0 && (
          <div className="text-[11px] text-[#8AAAB0] text-center py-6 tracking-wider">
            No replies yet
          </div>
        )}
      </div>

      <ComposeBox
        placeholder="Write a reply..."
        onSubmit={submitReply}
        submitLabel="REPLY"
      />
    </div>
  );
}

/* ─── Censure Content with Error Highlight ─────────────────────── */

function CensureContentHighlight({
  content,
  errorWord,
  postType,
}: {
  content: string;
  errorWord: string;
  postType: string;
}) {
  if (!errorWord) {
    return <p className="text-[13px] text-[#2A4A4E] leading-relaxed">{content}</p>;
  }

  // For replace items, look for [word] brackets
  if (postType === 'censure_replace') {
    const bracketPattern = new RegExp(`\\[${errorWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]`, 'i');
    const match = content.match(bracketPattern);
    if (match) {
      const idx = content.indexOf(match[0]);
      return (
        <p className="text-[13px] text-[#2A4A4E] leading-relaxed">
          {content.slice(0, idx)}
          <span className="px-1.5 py-0.5 rounded bg-terminal-amber/15 text-terminal-amber font-medium border border-terminal-amber/25">
            {match[0]}
          </span>
          {content.slice(idx + match[0].length)}
        </p>
      );
    }
  }

  // For grammar/vocab, highlight the error word in the sentence
  const escapedWord = errorWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const wordPattern = new RegExp(`(\\b${escapedWord}\\b)`, 'i');
  const parts = content.split(wordPattern);

  if (parts.length === 1) {
    // Word not found as whole word — show content as-is
    return <p className="text-[13px] text-[#2A4A4E] leading-relaxed">{content}</p>;
  }

  const highlightColor = postType === 'censure_grammar'
    ? 'bg-rose-700/15 text-rose-700 border-rose-700/25'
    : 'bg-teal-800/15 text-teal-800 border-teal-800/25';

  return (
    <p className="text-[13px] text-[#2A4A4E] leading-relaxed">
      {parts.map((part, i) =>
        wordPattern.test(part) ? (
          <span key={i} className={`px-1 py-0.5 rounded font-medium border ${highlightColor}`}>
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </p>
  );
}

/* ─── Censure Queue Item ────────────────────────────────────────── */

function CensureCard({ item }: { item: CensureItem }) {
  const { respondToCensure } = useHarmonyStore();
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [result, setResult] = useState<{ isCorrect: boolean; correction: string | null; explanation: string | null } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);

  const data = item.censureData;

  // Shuffle options once per item (Fisher-Yates), stored in ref for stability
  const shuffleRef = useRef<{ options: string[]; mapping: number[] } | null>(null);
  if (!shuffleRef.current && data) {
    const indices = data.options.map((_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    shuffleRef.current = {
      options: indices.map(i => data.options[i]),
      mapping: indices, // mapping[displayIdx] = originalIdx
    };
  }

  if (!data) return null;

  const shuffledOptions = shuffleRef.current!.options;
  const indexMapping = shuffleRef.current!.mapping;

  const typeLabel =
    item.postType === 'censure_grammar' ? 'GRAMMAR CHECK'
    : item.postType === 'censure_vocab' ? 'VOCABULARY CHECK'
    : 'WORD REPLACEMENT';

  const typeColor =
    item.postType === 'censure_grammar' ? 'text-rose-700 border-rose-700/20 bg-neon-pink/[0.06]'
    : item.postType === 'censure_vocab' ? 'text-teal-800 border-teal-800/20 bg-teal-800/[0.08]'
    : 'text-terminal-amber border-terminal-amber/20 bg-terminal-amber/[0.06]';

  const handleSubmit = async () => {
    if (selectedIdx === null || submitting) return;
    setSubmitting(true);
    // Map shuffled display index back to original index for backend validation
    const originalIdx = indexMapping[selectedIdx];
    const res = await respondToCensure(item.id, item.postType, originalIdx);
    if (res) {
      setResult(res);
      setShowOverlay(true);
    }
    setSubmitting(false);
  };

  const isReviewed = item.reviewed || result !== null;

  return (
    <div className={`mx-4 mb-3 rounded-xl border border-black/[0.1] overflow-hidden ${
      isReviewed
        ? result?.isCorrect || item.wasCorrect
          ? 'border-green-500/20 bg-green-500/[0.03]'
          : 'border-rose-700/20 bg-neon-pink/[0.03]'
        : 'bg-black/[0.03]'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-black/[0.08]">
        <div className="flex items-center gap-2">
          <span className={`text-[9px] font-medium tracking-[0.15em] uppercase px-2 py-0.5 rounded-full border ${typeColor}`}>
            {typeLabel}
          </span>
          {item.weekNumber && (
            <span className="text-[10px] text-[#8AAAB0]">Shift {item.weekNumber}</span>
          )}
        </div>
        {isReviewed && (
          <span className={`text-[10px] font-medium tracking-wider ${
            result?.isCorrect || item.wasCorrect ? 'text-green-400' : 'text-rose-700'
          }`}>
            {result?.isCorrect || item.wasCorrect ? 'CORRECT' : 'INCORRECT'}
          </span>
        )}
      </div>

      {/* Post content — highlight the error word */}
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-6 h-6 rounded-full bg-black/[0.06] border border-black/10 flex items-center justify-center">
            <span className="text-[7px] font-bold text-[#5A7A7E]">
              {item.designation.slice(0, 3)}
            </span>
          </div>
          <span className="text-[12px] text-[#3A5A5E]">{item.designation}</span>
        </div>
        <CensureContentHighlight
          content={item.content}
          errorWord={data.errorWord || data.blankWord || ''}
          postType={item.postType}
        />
      </div>

      {/* Question / options */}
      <div className="px-4 pb-3 space-y-2">
        <p className="text-[11px] text-[#5A7A7E] tracking-wider uppercase">
          {item.postType === 'censure_grammar' && (
            <>Find the correct form of "<span className="text-rose-700 font-medium normal-case">{data.errorWord}</span>":</>
          )}
          {item.postType === 'censure_vocab' && (
            <>What does "<span className="text-teal-800 font-medium normal-case">{data.errorWord}</span>" actually mean?</>
          )}
          {item.postType === 'censure_replace' && (
            <>Replace "<span className="text-terminal-amber font-medium normal-case">{data.blankWord || '...'}</span>" with the correct word:</>
          )}
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {shuffledOptions.map((opt, displayIdx) => {
            const originalIdx = indexMapping[displayIdx];
            const isCorrectOption = originalIdx === data.correctIndex;
            const isSelected = selectedIdx === displayIdx;

            // After review: show correct/incorrect markings
            if (isReviewed) {
              const wasRight = result?.isCorrect || item.wasCorrect;
              let optionStyle: string;
              if (isCorrectOption) {
                optionStyle = 'border-green-500/40 bg-green-500/10 text-green-400';
              } else if (isSelected && !wasRight) {
                optionStyle = 'border-rose-700/40 bg-rose-700/10 text-rose-700';
              } else {
                optionStyle = 'border-black/[0.06] bg-black/[0.02] text-[#7A9A9E]';
              }
              return (
                <div
                  key={displayIdx}
                  className={`text-left px-3 py-2 rounded-lg text-[12px] border ${optionStyle} flex items-center gap-1.5`}
                >
                  {isCorrectOption && (
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                  )}
                  {isSelected && !wasRight && !isCorrectOption && (
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  )}
                  {opt}
                </div>
              );
            }

            // Before review: interactive buttons
            return (
              <button
                key={displayIdx}
                onClick={() => setSelectedIdx(displayIdx)}
                className={`text-left px-3 py-2 rounded-lg text-[12px] border transition-all active:scale-[0.98] ${
                  isSelected
                    ? 'border-teal-800/40 bg-teal-800/10 text-teal-800'
                    : 'border-black/[0.1] bg-black/[0.03] text-[#3A5A5E] hover:border-white/20'
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>

        {/* Submit button — only before review */}
        {!isReviewed && (
          <button
            onClick={handleSubmit}
            disabled={selectedIdx === null || submitting}
            className="w-full mt-1 py-2 rounded-lg text-[11px] font-medium tracking-wider bg-teal-800/10 text-teal-800 border border-teal-800/20 hover:bg-teal-800/20 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
          >
            {submitting ? 'CHECKING...' : 'SUBMIT REVIEW'}
          </button>
        )}
      </div>

      {/* Explanation — only after review */}
      {isReviewed && (
        <div className="px-4 pb-3">
          <div className={`rounded-lg px-3 py-2 border ${
            result?.isCorrect || item.wasCorrect
              ? 'border-green-500/15 bg-green-500/[0.05]'
              : 'border-neon-pink/15 bg-neon-pink/[0.05]'
          }`}>
            <p className="text-[11px] text-[#3A5A5E]">
              {result?.explanation || data.explanation}
            </p>
          </div>
        </div>
      )}

      {/* Neon result overlay */}
      {showOverlay && result && (
        <ResultOverlay
          isCorrect={result.isCorrect}
          onDone={() => setShowOverlay(false)}
        />
      )}
    </div>
  );
}

/* ─── Censure Queue Tab ─────────────────────────────────────────── */

function CensureQueue() {
  const { censureItems, censureStats, censureLoading, loadCensureQueue } = useHarmonyStore();

  useEffect(() => {
    void loadCensureQueue();
  }, [loadCensureQueue]);

  const unreviewed = censureItems.filter(i => !i.reviewed);
  const reviewed = censureItems.filter(i => i.reviewed);

  if (censureLoading && censureItems.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-xs text-teal-800/50 animate-pulse tracking-wider">
          LOADING CENSURE QUEUE...
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto py-3">
      {/* Stats bar */}
      <div className="flex items-center justify-between px-4 py-2 mb-2">
        <span className="text-[10px] text-[#6A8A8E] tracking-[0.15em] uppercase">
          Documents for Review
        </span>
        <span className="text-[11px] text-teal-800/60 font-medium">
          {censureStats.completed}/{censureStats.total} reviewed
        </span>
      </div>

      {/* Progress bar */}
      {censureStats.total > 0 && (
        <div className="mx-4 mb-4 h-1 rounded-full bg-black/[0.06] overflow-hidden">
          <div
            className="h-full rounded-full bg-neon-cyan/40 transition-all duration-500"
            style={{ width: `${(censureStats.completed / censureStats.total) * 100}%` }}
          />
        </div>
      )}

      {/* Unreviewed items */}
      {unreviewed.map((item) => (
        <CensureCard key={item.id} item={item} />
      ))}

      {/* Reviewed items (collapsed) */}
      {reviewed.length > 0 && (
        <div className="px-4 py-2 mt-2">
          <p className="text-[10px] text-[#8AAAB0] tracking-[0.15em] uppercase mb-2">
            Completed ({reviewed.length})
          </p>
          {reviewed.map((item) => (
            <CensureCard key={item.id} item={item} />
          ))}
        </div>
      )}

      {censureItems.length === 0 && (
        <div className="text-center py-12">
          <p className="text-[11px] text-[#7A9A9E] tracking-wider">
            No documents pending review.
          </p>
          <p className="text-[10px] text-[#8AAAB0] mt-1">
            New items appear as you progress through shifts.
          </p>
        </div>
      )}
    </div>
  );
}

/* ─── Onboarding Briefing ──────────────────────────────────────── */

const HARMONY_BRIEFING_KEY = 'harmony_briefing_dismissed';

function HarmonyOnboarding({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="mx-4 mt-3 rounded-xl border border-neon-cyan/15 bg-neon-cyan/[0.04] overflow-hidden">
      <div className="px-4 py-2.5 border-b border-neon-cyan/10">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-medium tracking-[0.15em] uppercase text-teal-800/70">
            Ministry Orientation — Harmony Protocol
          </span>
          <button
            onClick={onDismiss}
            className="text-[9px] text-[#7A9A9E] hover:text-[#4A6A6E] transition-colors tracking-wider"
          >
            DISMISS
          </button>
        </div>
      </div>
      <div className="px-4 py-3 space-y-2.5">
        <p className="text-[12px] text-[#2A4A4E] leading-relaxed">
          Welcome to <span className="text-teal-800 font-medium">Harmony</span>, the Ministry-monitored community network. As a Clarity Associate, you have two duties here:
        </p>
        <div className="space-y-1.5 pl-2 border-l border-neon-cyan/15">
          <div>
            <span className="text-[11px] text-teal-800/80 font-medium">Feed</span>
            <p className="text-[11px] text-[#4A6A6E] leading-relaxed">
              Read citizen posts and practice your target vocabulary. You may write your own posts for Ministry review. Words from your current shift are highlighted.
            </p>
          </div>
          <div>
            <span className="text-[11px] text-terminal-amber/80 font-medium">Censure Queue</span>
            <p className="text-[11px] text-[#4A6A6E] leading-relaxed">
              Review flagged citizen posts for language errors — grammar mistakes, vocabulary misuse, and incorrect word choices. Select the correct answer to clear each item.
            </p>
          </div>
        </div>
        <p className="text-[10px] text-[#6A8A8E] italic">
          P.E.A.R.L. monitors all community activity. Proceed with clarity.
        </p>
      </div>
    </div>
  );
}

/* ─── Locked State ──────────────────────────────────────────────── */

function HarmonyLocked({ message }: { message: string | null }) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-8">
      <div className="w-16 h-16 rounded-2xl bg-black/[0.04] border border-black/10 flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-[#8AAAB0]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
        </svg>
      </div>
      <h3 className="font-special-elite text-base text-[#3A5A5E] tracking-wider mb-2">
        Harmony Restricted
      </h3>
      <p className="text-[11px] text-[#6A8A8E] text-center leading-relaxed max-w-xs">
        {message || 'Complete your first shift to gain Harmony access. The community awaits your contributions.'}
      </p>
    </div>
  );
}

/* ─── Main Component ────────────────────────────────────────────── */

export default function HarmonyApp() {
  const {
    posts,
    currentWeekNumber,
    focusWords,
    reviewWords,
    loading,
    error,
    locked,
    lockMessage,
    selectedPostId,
    activeTab,
    setTab,
    loadPosts,
    submitPost,
    openThread,
    censurePost: _censurePost,
    deletePost,
  } = useHarmonyStore();

  const [showOnboarding, setShowOnboarding] = useState(
    () => !localStorage.getItem(HARMONY_BRIEFING_KEY),
  );

  const dismissOnboarding = useCallback(() => {
    localStorage.setItem(HARMONY_BRIEFING_KEY, '1');
    setShowOnboarding(false);
  }, []);

  const { loadCensureQueue, censureStats } = useHarmonyStore();

  useEffect(() => {
    void loadPosts();
    void loadCensureQueue();
  }, [loadPosts, loadCensureQueue]);

  const handleCensure = useCallback(
    (postId: string, action: 'approve' | 'correct' | 'flag', weekNumber: number) => {
      void _censurePost(postId, action, weekNumber);
    },
    [_censurePost],
  );

  // Thread view
  if (selectedPostId) {
    return <ThreadView focusWords={focusWords} reviewWords={reviewWords} />;
  }

  // Locked state
  if (locked) {
    return (
      <div className="flex flex-col h-full">
        <HarmonyHeader currentWeekNumber={0} />
        <HarmonyLocked message={lockMessage} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <HarmonyHeader currentWeekNumber={currentWeekNumber} />

      {/* First-time onboarding */}
      {showOnboarding && <HarmonyOnboarding onDismiss={dismissOnboarding} />}

      {/* Tabs */}
      <div className="flex border-b border-black/[0.08]">
        <button
          onClick={() => setTab('feed')}
          className={`flex-1 py-2.5 text-[11px] font-medium tracking-[0.15em] uppercase transition-colors relative ${
            activeTab === 'feed'
              ? 'text-teal-800'
              : 'text-[#6A8A8E] hover:text-[#4A6A6E]'
          }`}
        >
          Feed
          {activeTab === 'feed' && (
            <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-neon-cyan rounded-full" />
          )}
        </button>
        <button
          onClick={() => setTab('censure')}
          className={`flex-1 py-2.5 text-[11px] font-medium tracking-[0.15em] uppercase transition-colors relative ${
            activeTab === 'censure'
              ? 'text-teal-800'
              : 'text-[#6A8A8E] hover:text-[#4A6A6E]'
          }`}
        >
          Censure Queue
          {censureStats.total - censureStats.completed > 0 && (
            <span className="ml-1.5 inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold bg-neon-pink/80 text-white">
              {censureStats.total - censureStats.completed}
            </span>
          )}
          {activeTab === 'censure' && (
            <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-neon-cyan rounded-full" />
          )}
        </button>
      </div>

      {/* Tab content */}
      {activeTab === 'feed' ? (
        <FeedTab
          posts={posts}
          focusWords={focusWords}
          reviewWords={reviewWords}
          currentWeekNumber={currentWeekNumber}
          loading={loading}
          error={error}
          onSubmitPost={submitPost}
          onOpenThread={openThread}
          onCensure={handleCensure}
          onDelete={deletePost}
        />
      ) : (
        <CensureQueue />
      )}
    </div>
  );
}

/* ─── Header ────────────────────────────────────────────────────── */

function HarmonyHeader({ currentWeekNumber }: { currentWeekNumber: number }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-black/[0.08]">
      <div>
        <h2 className="font-special-elite text-[17px] text-[#1A3035] tracking-wider">
          Harmony
        </h2>
        <p className="text-[9px] text-[#7A9A9E] tracking-[0.2em] uppercase">
          Ministry-Monitored Community
        </p>
      </div>
      {currentWeekNumber > 0 && (
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500/60" />
          <span className="text-[10px] text-[#7A9A9E]">S{currentWeekNumber}</span>
        </div>
      )}
    </div>
  );
}

/* ─── Feed Tab ──────────────────────────────────────────────────── */

function FeedTab({
  posts,
  focusWords,
  reviewWords,
  currentWeekNumber,
  loading,
  error,
  onDelete,
  onSubmitPost,
  onOpenThread,
  onCensure,
}: {
  posts: HarmonyPost[];
  focusWords: string[];
  reviewWords: string[];
  currentWeekNumber: number;
  loading: boolean;
  error: string | null;
  onSubmitPost: (content: string) => Promise<void>;
  onOpenThread: (postId: string) => void;
  onCensure: (postId: string, action: 'approve' | 'correct' | 'flag', weekNumber: number) => void;
  onDelete: (postId: string) => void;
}) {
  const [showVocab, setShowVocab] = useState(false);

  return (
    <>
      {/* Vocab chips (collapsible) */}
      {(focusWords.length > 0 || reviewWords.length > 0) && (
        <div className="border-b border-black/[0.08]">
          <button
            onClick={() => setShowVocab(!showVocab)}
            className="w-full flex items-center justify-between px-4 py-2 group"
          >
            <span className="text-[10px] text-teal-800/50 tracking-[0.2em] uppercase">
              Shift {currentWeekNumber} Vocabulary
            </span>
            <span className="text-[9px] text-[#8AAAB0] group-hover:text-[#5A7A7E] transition-colors">
              {showVocab ? 'HIDE' : 'SHOW'}
            </span>
          </button>
          {showVocab && (
            <div className="px-4 pb-3 space-y-2">
              {focusWords.length > 0 && (
                <div>
                  <p className="text-[9px] text-[#7A9A9E] tracking-[0.15em] uppercase mb-1">Focus</p>
                  <div className="flex flex-wrap gap-1">
                    {focusWords.map((w) => (
                      <span key={w} className="text-[10px] px-2 py-0.5 rounded-full border border-teal-800/20 text-teal-800/70 bg-neon-cyan/[0.05]">
                        {w}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {reviewWords.length > 0 && (
                <div>
                  <p className="text-[9px] text-[#7A9A9E] tracking-[0.15em] uppercase mb-1">Review</p>
                  <div className="flex flex-wrap gap-1">
                    {reviewWords.map((w) => (
                      <span key={w} className="text-[10px] px-2 py-0.5 rounded-full border border-terminal-amber/20 text-terminal-amber/70 bg-terminal-amber/[0.05]">
                        {w}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Compose */}
      <ComposeBox
        placeholder="Share your thoughts with the community..."
        onSubmit={onSubmitPost}
        submitLabel="POST"
      />

      {/* Feed */}
      <div className="flex-1 overflow-auto">
        {loading && posts.length === 0 && (
          <div className="text-xs text-teal-800/50 animate-pulse text-center py-8 tracking-wider">
            LOADING FEED...
          </div>
        )}

        {error && (
          <div className="text-xs text-rose-700/60 text-center py-2 tracking-wider">
            {error.toUpperCase()}
          </div>
        )}

        {!loading && posts.length === 0 && (
          <div className="text-[11px] text-[#7A9A9E] text-center py-8 tracking-wider">
            No posts yet. Be the first to contribute.
          </div>
        )}

        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            focusWords={focusWords}
            reviewWords={reviewWords}
            onOpenThread={onOpenThread}
            onCensure={onCensure}
            onDelete={onDelete}
          />
        ))}
      </div>
    </>
  );
}
