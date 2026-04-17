import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useHarmonyStore } from '../../../stores/harmonyStore';
import type { HarmonyPost, CensureItem } from '../../../api/harmony';
import HarmonyBulletin from './HarmonyBulletin';
import HarmonyPearlTip from './HarmonyPearlTip';
import HarmonyNoticeCard from './HarmonyNoticeCard';
import HarmonySectorReport from './HarmonySectorReport';

/** Max characters for a Harmony post. Source of truth: backend/src/data/harmonyWorldBible.ts */
const HARMONY_POST_MAX_LENGTH = 280;

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
  type: 'focus' | 'recent' | 'deep';
}) {
  const [showTip, setShowTip] = useState(false);
  const label = type === 'focus' ? 'Target word' : type === 'recent' ? 'Recent review' : 'Deep review';
  const color = type === 'focus'
    ? 'text-sky-700 font-medium'
    : type === 'recent'
      ? 'text-amber-600'
      : 'text-[#8B8578]';
  const tipBg = type === 'focus'
    ? 'bg-sky-600/20 border-sky-300/30 text-sky-700'
    : type === 'recent'
      ? 'bg-amber-100/20 border-amber-300/30 text-amber-600'
      : 'bg-gray-100/40 border-gray-300/30 text-[#6B7280]';
  const decoration = type === 'deep'
    ? 'underline decoration-dotted decoration-1 underline-offset-2 decoration-gray-400/50'
    : 'underline decoration-dotted decoration-1 underline-offset-2';

  return (
    <span className="relative inline">
      <span
        className={`${color} cursor-help ${decoration}`}
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
  recentWords,
  deepReviewWords,
}: {
  content: string;
  focusWords: string[];
  recentWords: string[];
  deepReviewWords: string[];
}) {
  const wordSets = useMemo(() => {
    const focusSet = new Set(focusWords.map((w) => w.toLowerCase()));
    const recentSet = new Set(recentWords.map((w) => w.toLowerCase()));
    const deepSet = new Set(deepReviewWords.map((w) => w.toLowerCase()));
    return { focusSet, recentSet, deepSet };
  }, [focusWords, recentWords, deepReviewWords]);

  const parts = useMemo(() => {
    const words = content.split(/(\s+)/);
    return words.map((segment, i) => {
      const cleaned = segment.replace(/[^a-zA-Z]/g, '').toLowerCase();
      if (!cleaned) return { key: i, text: segment, type: 'plain' as const };
      if (wordSets.focusSet.has(cleaned))
        return { key: i, text: segment, type: 'focus' as const };
      if (wordSets.recentSet.has(cleaned))
        return { key: i, text: segment, type: 'recent' as const };
      if (wordSets.deepSet.has(cleaned))
        return { key: i, text: segment, type: 'deep' as const };
      return { key: i, text: segment, type: 'plain' as const };
    });
  }, [content, wordSets]);

  return (
    <p className="text-[13px] text-[#4B5563] leading-relaxed">
      {parts.map((p) => {
        if (p.type === 'focus' || p.type === 'recent' || p.type === 'deep')
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
    if (submitting) return;
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit(text.trim());
      setText('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mx-4 mt-3 mb-2 bg-white rounded-xl border border-[#E8E4DC] shadow-sm p-3">
      <div className="flex gap-3">
        <div className="w-8 h-8 rounded-full bg-sky-100 border border-sky-200 flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-[9px] font-bold text-sky-600">YOU</span>
        </div>
        <div className="flex-1">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={placeholder}
            className="w-full bg-transparent text-sm text-[#2C3340] placeholder:text-[#B8B3AA] resize-none outline-none"
            rows={2}
            maxLength={HARMONY_POST_MAX_LENGTH}
          />
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-[10px] text-[#B8B3AA]">
              {text.length}/{HARMONY_POST_MAX_LENGTH}
            </span>
            <button
              type="submit"
              disabled={!text.trim() || submitting}
              className="px-4 py-1.5 rounded-full text-[11px] font-semibold tracking-wider bg-sky-600 text-white hover:bg-sky-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
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
  recentWords,
  deepReviewWords,
  onOpenThread,
  onCensure,
  onDelete,
}: {
  post: HarmonyPost;
  focusWords: string[];
  recentWords: string[];
  deepReviewWords: string[];
  onOpenThread: (postId: string) => void;
  onCensure?: (postId: string, action: 'approve' | 'flag', weekNumber: number) => void;
  onDelete?: (postId: string) => void;
}) {
  const is4488 = isCitizen4488(post);
  const [censureAction, setCensureAction] = useState<'approve' | 'flag' | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const avatarColor = is4488
    ? 'bg-amber-100 border-amber-300 text-amber-700'
    : post.isOwn
      ? 'bg-sky-100 border-sky-200 text-sky-600'
      : 'bg-gray-100 border-gray-200 text-gray-500';

  const designation = post.isOwn ? 'YOU' : post.designation;
  const initials = designation.slice(0, 3).toUpperCase();

  const handleCensureAction = (action: 'approve' | 'flag') => {
    if (censureAction || !onCensure) return;
    setCensureAction(action);
    onCensure(post.id, action, post.weekNumber ?? 1);
  };

  return (
    <div
      className={`mx-4 mb-2 p-3 rounded-xl border shadow-sm transition-colors ${
        is4488 ? 'bg-amber-50 border-amber-200' : 'bg-white border-[#E8E4DC] hover:border-[#D4CFC6]'
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
            <span className={`text-[13px] font-semibold ${is4488 ? 'text-amber-700' : post.isOwn ? 'text-sky-600' : 'text-[#2C3340]'}`}>
              {designation}
            </span>
            {post.weekNumber != null && (
              <span className="text-[10px] text-[#9CA3AF] bg-gray-100 px-1.5 py-0.5 rounded">
                S{post.weekNumber}
              </span>
            )}
            {post.status === 'pending_review' && (
              <span className="text-[9px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded tracking-wider font-medium">
                PENDING
              </span>
            )}
            {post.isNew && (
              <span className="text-[8px] text-white bg-sky-500 px-1.5 py-0.5 rounded-full tracking-wider font-bold">
                NEW
              </span>
            )}
            <span className="text-[11px] text-[#9CA3AF] ml-auto">
              {formatTimestamp(post.createdAt)}
            </span>
          </div>

          {/* Post body */}
          <HighlightedContent
            content={post.content}
            focusWords={focusWords}
            recentWords={recentWords}
            deepReviewWords={deepReviewWords}
          />

          {/* PEARL note */}
          {post.pearlNote && (
            <div className="mt-2 pl-2 border-l-2 border-emerald-300">
              <p className="text-[10px] text-emerald-700 italic">
                PEARL: {post.pearlNote}
              </p>
            </div>
          )}

          {/* Citizen-4488 interaction */}
          {is4488 && !post.isOwn && onCensure && (
            <div className="mt-2 flex items-center gap-2">
              {censureAction ? (
                <span className={`text-[10px] tracking-wider font-semibold ${
                  censureAction === 'approve' ? 'text-emerald-600' : 'text-rose-600'
                }`}>
                  {censureAction === 'approve' ? 'APPROVED' : 'FLAGGED FOR REVIEW'}
                </span>
              ) : (
                <>
                  <span className="text-[9px] text-[#9CA3AF] tracking-wider mr-1">COMPLIANCE:</span>
                  <button
                    onClick={() => handleCensureAction('approve')}
                    className="text-[10px] px-2.5 py-1 rounded-lg border border-emerald-200 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 transition-colors active:scale-95 font-medium"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleCensureAction('flag')}
                    className="text-[10px] px-2.5 py-1 rounded-lg border border-rose-200 text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors active:scale-95 font-medium"
                  >
                    Flag
                  </button>
                </>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="mt-2 pt-2 border-t border-gray-100 flex items-center gap-4">
            <button
              onClick={() => onOpenThread(post.id)}
              className="text-[11px] text-[#9CA3AF] hover:text-sky-600 transition-colors flex items-center gap-1"
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
                    className="text-[10px] text-[#9CA3AF] hover:text-[#6B7280] transition-colors"
                  >
                    No
                  </button>
                </span>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="text-[11px] text-[#B8B3AA] hover:text-rose-700/60 transition-colors flex items-center gap-1"
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
  recentWords,
  deepReviewWords,
}: {
  focusWords: string[];
  recentWords: string[];
  deepReviewWords: string[];
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
    <div className="flex flex-col h-full min-h-full bg-[#F5F1EB]">
      {/* Thread header */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-[#EFEBE4] border-b border-[#D4CFC6]">
        <button
          onClick={closeThread}
          className="text-xs text-[#4B5563] hover:text-sky-600 transition-colors flex items-center gap-1 font-medium"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Back
        </button>
        <span className="text-[10px] text-[#9CA3AF] tracking-[0.2em] uppercase">
          Thread
        </span>
      </div>

      {/* Thread content */}
      <div className="flex-1 overflow-auto p-4">
        {/* Parent post */}
        <div className="bg-white rounded-xl border border-[#E8E4DC] shadow-sm p-3 mb-3">
          <div className="flex gap-3">
            <div className={`w-9 h-9 rounded-full border flex items-center justify-center shrink-0 ${
              isCitizen4488(parentPost) ? 'bg-amber-100 border-amber-300' : parentPost.isOwn ? 'bg-sky-100 border-sky-200' : 'bg-gray-100 border-gray-200'
            }`}>
              <span className={`text-[8px] font-bold ${isCitizen4488(parentPost) ? 'text-amber-700' : parentPost.isOwn ? 'text-sky-600' : 'text-gray-500'}`}>
                {(parentPost.isOwn ? 'YOU' : parentPost.designation).slice(0, 4)}
              </span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[13px] font-semibold text-[#2C3340]">
                  {parentPost.isOwn ? 'YOU' : parentPost.designation}
                </span>
                <span className="text-[11px] text-[#9CA3AF]">
                  {formatTimestamp(parentPost.createdAt)}
                </span>
              </div>
              <HighlightedContent content={parentPost.content} focusWords={focusWords} recentWords={recentWords} deepReviewWords={deepReviewWords} />
            </div>
          </div>
        </div>

        {/* Replies */}
        {repliesLoading && (
          <div className="text-xs text-[#9CA3AF] animate-pulse text-center py-6 tracking-wider">
            LOADING...
          </div>
        )}

        {replies.map((reply) => (
          <div key={reply.id} className="bg-white rounded-lg border border-[#E8E4DC] shadow-sm p-3 mb-2 ml-6">
            <div className="flex gap-2.5">
              <div className="w-7 h-7 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
                <span className="text-[7px] font-bold text-gray-500">
                  {reply.designation.slice(0, 3)}
                </span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[12px] font-semibold text-[#2C3340]">{reply.designation}</span>
                  <span className="text-[10px] text-[#9CA3AF]">{formatTimestamp(reply.createdAt)}</span>
                </div>
                <HighlightedContent content={reply.content} focusWords={focusWords} recentWords={recentWords} deepReviewWords={deepReviewWords} />
              </div>
            </div>
          </div>
        ))}

        {!repliesLoading && replies.length === 0 && (
          <div className="text-[11px] text-[#9CA3AF] text-center py-6 tracking-wider">
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
    return <p className="text-[13px] text-[#4B5563] leading-relaxed">{content}</p>;
  }

  // For replace items, look for [word] brackets
  if (postType === 'censure_replace') {
    const bracketPattern = new RegExp(`\\[${errorWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]`, 'i');
    const match = content.match(bracketPattern);
    if (match) {
      const idx = content.indexOf(match[0]);
      return (
        <p className="text-[13px] text-[#4B5563] leading-relaxed">
          {content.slice(0, idx)}
          <span className="px-1.5 py-0.5 rounded bg-amber-100/15 text-amber-600 font-medium border border-amber-300/25">
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
    return <p className="text-[13px] text-[#4B5563] leading-relaxed">{content}</p>;
  }

  const highlightColor = postType === 'censure_grammar'
    ? 'bg-rose-700/15 text-rose-700 border-rose-700/25'
    : 'bg-sky-600/15 text-sky-700 border-sky-300/25';

  return (
    <p className="text-[13px] text-[#4B5563] leading-relaxed">
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
    item.postType === 'censure_grammar' ? 'text-rose-700 border-rose-700/20 bg-rose-100/[0.06]'
    : item.postType === 'censure_vocab' ? 'text-sky-700 border-sky-300/20 bg-sky-600/[0.08]'
    : 'text-amber-600 border-amber-300/20 bg-amber-100/[0.06]';

  const handleSubmit = async () => {
    if (selectedIdx === null || submitting) return;
    setSubmitting(true);
    // Map shuffled display index back to original index for backend validation
    const originalIdx = indexMapping[selectedIdx];
    const res = await respondToCensure(item.id, 'answer', originalIdx);
    if (res) {
      setResult(res);
      setShowOverlay(true);
    }
    setSubmitting(false);
  };

  const isReviewed = item.reviewed || result !== null;

  return (
    <div className={`mx-4 mb-3 rounded-xl border border-[#E8E4DC] overflow-hidden ${
      isReviewed
        ? result?.isCorrect || item.wasCorrect
          ? 'border-green-500/20 bg-green-500/[0.03]'
          : 'border-rose-700/20 bg-rose-100/[0.03]'
        : 'bg-white'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#E8E4DC]">
        <div className="flex items-center gap-2">
          <span className={`text-[9px] font-medium tracking-[0.15em] uppercase px-2 py-0.5 rounded-full border ${typeColor}`}>
            {typeLabel}
          </span>
          {item.weekNumber && (
            <span className="text-[10px] text-[#B8B3AA]">Shift {item.weekNumber}</span>
          )}
          {item.isReview && (
            <span className="text-[9px] font-medium tracking-[0.1em] text-[#8B8578] bg-gray-100/60 px-1.5 py-0.5 rounded-full border border-gray-200/30">
              REVIEW
            </span>
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
          <div className="w-6 h-6 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center">
            <span className="text-[7px] font-bold text-[#6B7280]">
              {item.designation.slice(0, 3)}
            </span>
          </div>
          <span className="text-[12px] text-[#4B5563]">{item.designation}</span>
        </div>
        <CensureContentHighlight
          content={item.content}
          errorWord={data.errorWord || data.blankWord || ''}
          postType={item.postType}
        />
      </div>

      {/* Question / options */}
      <div className="px-4 pb-3 space-y-2">
        <p className="text-[11px] text-[#6B7280] tracking-wider uppercase">
          {item.postType === 'censure_grammar' && (
            <>Find the correct form of "<span className="text-rose-700 font-medium normal-case">{data.errorWord}</span>":</>
          )}
          {item.postType === 'censure_vocab' && (
            <>What does "<span className="text-sky-700 font-medium normal-case">{data.errorWord}</span>" actually mean?</>
          )}
          {item.postType === 'censure_replace' && (
            <>Replace "<span className="text-amber-600 font-medium normal-case">{data.blankWord || '...'}</span>" with the correct word:</>
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
                optionStyle = 'border-[#E8E4DC] bg-gray-50 text-[#9CA3AF]';
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
                    ? 'border-sky-300/40 bg-sky-600/10 text-sky-700'
                    : 'border-[#E8E4DC] bg-white text-[#4B5563] hover:border-[#D4CFC6]'
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
            className="w-full mt-1 py-2 rounded-lg text-[11px] font-medium tracking-wider bg-sky-600/10 text-sky-700 border border-sky-300/20 hover:bg-sky-600/20 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
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
              : 'border-rose-200/15 bg-rose-100/[0.05]'
          }`}>
            <p className="text-[11px] text-[#4B5563]">
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
        <div className="text-xs text-sky-700/50 animate-pulse tracking-wider">
          LOADING CENSURE QUEUE...
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto py-3">
      {/* Stats bar */}
      <div className="flex items-center justify-between px-4 py-2 mb-2">
        <span className="text-[10px] text-[#9CA3AF] tracking-[0.15em] uppercase">
          Documents for Review
        </span>
        <span className="text-[11px] text-sky-700/60 font-medium">
          {censureStats.completed}/{censureStats.total} reviewed
        </span>
      </div>

      {/* Progress bar */}
      {censureStats.total > 0 && (
        <div className="mx-4 mb-4 h-1 rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-sky-200/40 transition-all duration-500"
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
          <p className="text-[10px] text-[#B8B3AA] tracking-[0.15em] uppercase mb-2">
            Completed ({reviewed.length})
          </p>
          {reviewed.map((item) => (
            <CensureCard key={item.id} item={item} />
          ))}
        </div>
      )}

      {censureItems.length === 0 && (
        <div className="text-center py-12">
          <p className="text-[11px] text-[#9CA3AF] tracking-wider">
            No documents pending review.
          </p>
          <p className="text-[10px] text-[#B8B3AA] mt-1">
            New items appear as you progress through shifts.
          </p>
        </div>
      )}
    </div>
  );
}

/* ─── First-Visit PEARL Intro Banner ───────────────────────────── */

function PearlIntroBanner() {
  const isFirstVisit = useHarmonyStore(s => s.isFirstVisit);
  const dismissFirstVisit = useHarmonyStore(s => s.dismissFirstVisit);

  // Auto-dismiss on first scroll — ambient, not intrusive.
  // `once: true` ensures the listener fires at most once, so no de-dupe ref is needed.
  useEffect(() => {
    if (!isFirstVisit) return;
    window.addEventListener('scroll', dismissFirstVisit, { capture: true, once: true, passive: true });
    return () => window.removeEventListener('scroll', dismissFirstVisit, { capture: true });
  }, [isFirstVisit, dismissFirstVisit]);

  if (!isFirstVisit) return null;

  return (
    <div className="mx-4 mt-3 mb-2 rounded-xl border border-sky-200 bg-sky-50 shadow-sm p-3 flex items-start gap-3">
      <img
        src="/images/pearl-eye-glow.png"
        alt=""
        aria-hidden="true"
        className="w-8 h-8 rounded-full object-cover shrink-0 mt-0.5"
        style={{
          maskImage: 'radial-gradient(circle, black 40%, transparent 72%)',
          WebkitMaskImage: 'radial-gradient(circle, black 40%, transparent 72%)',
        }}
      />
      <div className="flex-1 min-w-0">
        <div className="font-ibm-mono text-[9px] text-sky-700 tracking-[0.2em] uppercase mb-1">
          P.E.A.R.L. Orientation
        </div>
        <p className="text-[12px] text-[#2C3340] leading-relaxed">
          Welcome to community communications, Citizen. Your fellow associates share their progress here. Some write more carefully than others. Pay attention to patterns &mdash; the Ministry values observant citizens.
        </p>
      </div>
      <button
        type="button"
        onClick={dismissFirstVisit}
        aria-label="Dismiss orientation"
        className="text-[#8B8578] hover:text-[#4B5563] transition-colors active:scale-95 shrink-0"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

/* ─── Onboarding Briefing ──────────────────────────────────────── */

const HARMONY_BRIEFING_KEY = 'harmony_briefing_dismissed';

function HarmonyOnboarding({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="mx-4 mt-3 rounded-xl border border-[#E8E4DC] bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-2.5 border-b border-[#E8E4DC] bg-sky-50">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold tracking-[0.15em] uppercase text-sky-700">
            Ministry Orientation — Harmony Protocol
          </span>
          <button
            onClick={onDismiss}
            className="text-[9px] text-[#9CA3AF] hover:text-[#6B7280] transition-colors tracking-wider"
          >
            DISMISS
          </button>
        </div>
      </div>
      <div className="px-4 py-3 space-y-2.5">
        <p className="text-[12px] text-[#4B5563] leading-relaxed">
          Welcome to <span className="text-sky-700 font-medium">Harmony</span>, the Ministry-monitored community network. As a Clarity Associate, you have two duties here:
        </p>
        <div className="space-y-1.5 pl-2 border-l-2 border-sky-200">
          <div>
            <span className="text-[11px] text-sky-700/80 font-medium">Feed</span>
            <p className="text-[11px] text-[#6B7280] leading-relaxed">
              Read citizen posts and practice your target vocabulary. You may write your own posts for Ministry review. Words from your current shift are highlighted.
            </p>
          </div>
          <div>
            <span className="text-[11px] text-amber-600/80 font-medium">Censure Queue</span>
            <p className="text-[11px] text-[#6B7280] leading-relaxed">
              Review flagged citizen posts for language errors — grammar mistakes, vocabulary misuse, and incorrect word choices. Select the correct answer to clear each item.
            </p>
          </div>
        </div>
        <p className="text-[10px] text-[#9CA3AF] italic">
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
      <div className="w-16 h-16 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-[#B8B3AA]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
        </svg>
      </div>
      <h3 className="font-special-elite text-base text-[#4B5563] tracking-wider mb-2">
        Harmony Restricted
      </h3>
      <p className="text-[11px] text-[#9CA3AF] text-center leading-relaxed max-w-xs">
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
    recentWords,
    deepReviewWords,
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
    pearlAnnotations,
    setHasNewContent,
    trackCitizen4488Action,
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
    // Clear new content flag when user opens Harmony
    setHasNewContent(false);
  }, [loadPosts, loadCensureQueue, setHasNewContent]);

  const handleCensure = useCallback(
    (postId: string, action: 'approve' | 'correct' | 'flag', weekNumber: number) => {
      void _censurePost(postId, action, weekNumber);
      // Track 4488 actions for PEARL annotations
      trackCitizen4488Action(postId, action);
    },
    [_censurePost, trackCitizen4488Action],
  );

  // Thread view
  if (selectedPostId) {
    return <ThreadView focusWords={focusWords} recentWords={recentWords} deepReviewWords={deepReviewWords} />;
  }

  // Locked state
  if (locked) {
    return (
      <div className="flex flex-col h-full min-h-full bg-[#F5F1EB]">
        <HarmonyHeader currentWeekNumber={0} />
        <HarmonyLocked message={lockMessage} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-full bg-[#F5F1EB]">
      {/* Header */}
      <HarmonyHeader currentWeekNumber={currentWeekNumber} />

      {/* First-time onboarding */}
      {showOnboarding && <HarmonyOnboarding onDismiss={dismissOnboarding} />}

      {/* Tabs — government portal navigation */}
      <HarmonyTabs activeTab={activeTab} setTab={setTab} censureStats={censureStats} ministryCount={posts.filter(p => p.postType === 'bulletin' || p.postType === 'pearl_tip').length} />

      {/* Tab content */}
      {activeTab === 'feed' && (
        <FeedTab
          posts={posts.filter(p => p.postType === 'feed' || !p.postType)}
          focusWords={focusWords}
          recentWords={recentWords}
          deepReviewWords={deepReviewWords}
          currentWeekNumber={currentWeekNumber}
          loading={loading}
          error={error}
          onSubmitPost={submitPost}
          onOpenThread={openThread}
          onCensure={handleCensure}
          onDelete={deletePost}
        />
      )}
      {activeTab === 'ministry' && (
        <MinistryTab
          posts={posts.filter(p => p.postType === 'bulletin' || p.postType === 'pearl_tip')}
          loading={loading}
        />
      )}
      {activeTab === 'sector' && (
        <SectorTab
          posts={posts.filter(p => p.postType === 'community_notice' || p.postType === 'sector_report')}
          loading={loading}
          onOpenThread={openThread}
        />
      )}
      {activeTab === 'censure' && (
        <CensureQueue />
      )}
      {activeTab === 'archives' && (
        <ArchivesTab />
      )}

      {/* PEARL ambient annotations — pinned at bottom of visible tab */}
      {pearlAnnotations.length > 0 && activeTab === 'feed' && (
        <div className="border-t border-emerald-200/50 bg-emerald-50/30 px-4 py-2">
          {pearlAnnotations.map((a, i) => (
            <div key={i} className="flex items-start gap-2 py-1">
              <span className="text-[10px] text-emerald-600 font-bold tracking-wider shrink-0">P.E.A.R.L.</span>
              <p className="text-[10px] text-emerald-700/80 italic leading-relaxed">{a.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Header ────────────────────────────────────────────────────── */

function HarmonyHeader({ currentWeekNumber }: { currentWeekNumber: number }) {
  return (
    <div className="bg-gradient-to-b from-[#E8E4DC] to-[#F5F1EB] border-b border-[#D4CFC6] px-4 py-3">
      <div className="flex items-center gap-3">
        <img
          src="/images/harmony-icon.png"
          alt="Harmony"
          className="w-10 h-10 object-contain"
        />
        <div className="flex-1">
          <h2 className="text-[18px] font-semibold text-[#2C3340] tracking-wide" style={{ fontFamily: "'DM Serif Display', serif" }}>
            Harmony
          </h2>
          <p className="text-[9px] text-[#8B8578] tracking-[0.2em] uppercase">
            Content Moderation Console
          </p>
        </div>
        {currentWeekNumber > 0 && (
          <div className="flex items-center gap-1.5 bg-white/60 rounded-full px-2.5 py-1 border border-[#D4CFC6]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-[10px] font-medium text-[#4B5563]">Shift {currentWeekNumber}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Feed Tab ──────────────────────────────────────────────────── */

function FeedTab({
  posts,
  focusWords,
  recentWords,
  deepReviewWords,
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
  recentWords: string[];
  deepReviewWords: string[];
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
      {/* First-visit PEARL intro banner (one-time, dismissible) */}
      <PearlIntroBanner />

      {/* Vocab chips (collapsible, 3-tier) */}
      {(focusWords.length > 0 || recentWords.length > 0 || deepReviewWords.length > 0) && (
        <div className="border-b border-[#E8E4DC]">
          <button
            onClick={() => setShowVocab(!showVocab)}
            className="w-full flex items-center justify-between px-4 py-2 group"
          >
            <span className="text-[10px] text-sky-700/50 tracking-[0.2em] uppercase">
              Shift {currentWeekNumber} Vocabulary
            </span>
            <span className="text-[9px] text-[#B8B3AA] group-hover:text-[#6B7280] transition-colors">
              {showVocab ? 'HIDE' : 'SHOW'}
            </span>
          </button>
          {showVocab && (
            <div className="px-4 pb-3 space-y-2">
              {focusWords.length > 0 && (
                <div>
                  <p className="text-[9px] text-[#9CA3AF] tracking-[0.15em] uppercase mb-1">Focus</p>
                  <div className="flex flex-wrap gap-1">
                    {focusWords.map((w) => (
                      <span key={w} className="text-[10px] px-2 py-0.5 rounded-full border border-sky-300/20 text-sky-700/70 bg-sky-200/[0.05]">
                        {w}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {recentWords.length > 0 && (
                <div>
                  <p className="text-[9px] text-[#9CA3AF] tracking-[0.15em] uppercase mb-1">Recent</p>
                  <div className="flex flex-wrap gap-1">
                    {recentWords.map((w) => (
                      <span key={w} className="text-[10px] px-2 py-0.5 rounded-full border border-amber-300/20 text-amber-600/70 bg-amber-100/[0.05]">
                        {w}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {deepReviewWords.length > 0 && (
                <div>
                  <p className="text-[9px] text-[#9CA3AF] tracking-[0.15em] uppercase mb-1">Deep Review</p>
                  <div className="flex flex-wrap gap-1">
                    {deepReviewWords.map((w) => (
                      <span key={w} className="text-[10px] px-2 py-0.5 rounded-full border border-gray-300/15 text-[#8B8578]/60 bg-gray-100/[0.03]">
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
          <div className="text-xs text-sky-700/50 animate-pulse text-center py-8 tracking-wider">
            LOADING FEED...
          </div>
        )}

        {error && (
          <div className="text-xs text-rose-700/60 text-center py-2 tracking-wider">
            {error.toUpperCase()}
          </div>
        )}

        {!loading && posts.length === 0 && (
          <div className="text-[11px] text-[#9CA3AF] text-center py-8 tracking-wider">
            No posts yet. Be the first to contribute.
          </div>
        )}

        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            focusWords={focusWords}
            recentWords={recentWords}
            deepReviewWords={deepReviewWords}
            onOpenThread={onOpenThread}
            onCensure={onCensure}
            onDelete={onDelete}
          />
        ))}
      </div>
    </>
  );
}

/* ─── Tab Bar ───────────────────────────────────────────────────── */

function HarmonyTabs({
  activeTab,
  setTab,
  censureStats,
  ministryCount,
}: {
  activeTab: string;
  setTab: (tab: 'feed' | 'ministry' | 'sector' | 'censure' | 'archives') => void;
  censureStats: { total: number; completed: number };
  ministryCount: number;
}) {
  const tabs: { key: 'feed' | 'ministry' | 'sector' | 'censure' | 'archives'; label: string; badge?: number; badgeColor?: string }[] = [
    { key: 'feed', label: 'Feed' },
    { key: 'ministry', label: 'Ministry', badge: ministryCount > 0 ? ministryCount : undefined, badgeColor: 'bg-sky-500' },
    { key: 'sector', label: 'Sector' },
    { key: 'censure', label: 'Review', badge: censureStats.total - censureStats.completed > 0 ? censureStats.total - censureStats.completed : undefined, badgeColor: 'bg-rose-500' },
    { key: 'archives', label: 'Archives' },
  ];

  return (
    <div className="flex gap-1 px-3 py-2 bg-[#EFEBE4] border-b border-[#D4CFC6]">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => setTab(tab.key)}
          className={`flex-1 py-1.5 rounded-lg text-[10px] font-semibold tracking-[0.08em] uppercase transition-all ${
            activeTab === tab.key
              ? 'bg-white text-[#2C3340] shadow-sm border border-[#D4CFC6]'
              : 'text-[#8B8578] hover:text-[#4B5563] hover:bg-white/40'
          }`}
        >
          {tab.label}
          {tab.badge && (
            <span className={`ml-1 inline-flex items-center justify-center min-w-[14px] h-3.5 px-1 rounded-full text-[8px] font-bold ${tab.badgeColor} text-white`}>
              {tab.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

/* ─── Ministry Tab ──────────────────────────────────────────────── */

function MinistryTab({
  posts,
  loading,
}: {
  posts: HarmonyPost[];
  loading: boolean;
}) {
  const bulletins = posts.filter(p => p.postType === 'bulletin');
  const tips = posts.filter(p => p.postType === 'pearl_tip');

  return (
    <div className="flex-1 overflow-auto">
      {/* Section header */}
      <div className="px-4 py-3 border-b border-sky-200/30">
        <p className="text-[10px] text-sky-700/50 tracking-[0.2em] uppercase font-semibold">
          Ministry Dispatches
        </p>
        <p className="text-[9px] text-[#B8B3AA] mt-0.5">
          Official bulletins and language guidance from P.E.A.R.L.
        </p>
      </div>

      {loading && posts.length === 0 && (
        <div className="text-xs text-sky-700/50 animate-pulse text-center py-8 tracking-wider">
          LOADING DISPATCHES...
        </div>
      )}

      {!loading && posts.length === 0 && (
        <div className="text-center py-12">
          <p className="text-[11px] text-[#9CA3AF] tracking-wider">
            No dispatches have been issued for this shift.
          </p>
          <p className="text-[10px] text-[#B8B3AA] mt-1">
            Ministry bulletins appear as you progress.
          </p>
        </div>
      )}

      {/* Bulletins first */}
      {bulletins.map((post) => (
        <HarmonyBulletin key={post.id} post={post} />
      ))}

      {/* PEARL tips */}
      {tips.length > 0 && bulletins.length > 0 && (
        <div className="px-4 py-2 border-t border-[#E8E4DC]">
          <p className="text-[9px] text-emerald-600/50 tracking-[0.15em] uppercase">
            P.E.A.R.L. Language Guidance
          </p>
        </div>
      )}
      {tips.map((post) => (
        <HarmonyPearlTip key={post.id} post={post} />
      ))}
    </div>
  );
}

/* ─── Sector Tab ────────────────────────────────────────────────── */

function SectorTab({
  posts,
  loading,
  onOpenThread,
}: {
  posts: HarmonyPost[];
  loading: boolean;
  onOpenThread: (postId: string) => void;
}) {
  const notices = posts.filter(p => p.postType === 'community_notice');
  const reports = posts.filter(p => p.postType === 'sector_report');

  return (
    <div className="flex-1 overflow-auto">
      {/* Section header */}
      <div className="px-4 py-3 border-b border-amber-200/30">
        <p className="text-[10px] text-amber-600/50 tracking-[0.2em] uppercase font-semibold">
          Sector Board
        </p>
        <p className="text-[9px] text-[#B8B3AA] mt-0.5">
          Community notices, schedules, and sector reports.
        </p>
      </div>

      {loading && posts.length === 0 && (
        <div className="text-xs text-amber-600/50 animate-pulse text-center py-8 tracking-wider">
          LOADING SECTOR NOTICES...
        </div>
      )}

      {!loading && posts.length === 0 && (
        <div className="text-center py-12">
          <p className="text-[11px] text-[#9CA3AF] tracking-wider">
            No sector notices for this shift.
          </p>
          <p className="text-[10px] text-[#B8B3AA] mt-1">
            Community updates appear as new shifts begin.
          </p>
        </div>
      )}

      {/* Notices first */}
      {notices.map((post) => (
        <HarmonyNoticeCard key={post.id} post={post} onOpenThread={onOpenThread} />
      ))}

      {/* Sector reports */}
      {reports.length > 0 && notices.length > 0 && (
        <div className="px-4 py-2 border-t border-[#E8E4DC]">
          <p className="text-[9px] text-[#8B8578]/50 tracking-[0.15em] uppercase">
            Sector Performance Data
          </p>
        </div>
      )}
      {reports.map((post) => (
        <HarmonySectorReport key={post.id} post={post} />
      ))}
    </div>
  );
}

/* ─── Archives Tab ─────────────────────────────────────────────── */

function ArchivesTab() {
  const { archives, archivesLoading, loadArchives } = useHarmonyStore();
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null);
  const [activeSection, setActiveSection] = useState<'vocabulary' | 'timeline' | 'bulletins'>('vocabulary');

  useEffect(() => {
    void loadArchives();
  }, [loadArchives]);

  if (archivesLoading && !archives) {
    return (
      <div className="text-xs text-[#8B8578] animate-pulse text-center py-8 tracking-wider">
        LOADING ARCHIVES...
      </div>
    );
  }

  if (archives?.locked) {
    return (
      <div className="text-center py-12">
        <p className="text-[11px] text-[#9CA3AF] tracking-wider">Archives unavailable.</p>
      </div>
    );
  }

  const sectionTabs: { key: typeof activeSection; label: string }[] = [
    { key: 'vocabulary', label: 'Vocabulary' },
    { key: 'timeline', label: 'Case File: 4488' },
    { key: 'bulletins', label: 'Bulletins' },
  ];

  return (
    <div className="flex-1 overflow-auto">
      {/* Section header */}
      <div className="px-4 py-3 border-b border-[#D4CFC6]">
        <p className="text-[10px] text-[#8B8578] tracking-[0.2em] uppercase font-semibold">
          Ministry Archives
        </p>
        <p className="text-[9px] text-[#B8B3AA] mt-0.5">
          Historical records and vocabulary reference.
        </p>
      </div>

      {/* Sub-section tabs */}
      <div className="flex gap-1 px-3 py-2 bg-[#EFEBE4] border-b border-[#E8E4DC]">
        {sectionTabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveSection(t.key)}
            className={`flex-1 py-1 rounded text-[9px] font-semibold tracking-[0.06em] uppercase transition-all ${
              activeSection === t.key
                ? 'bg-white text-[#2C3340] shadow-sm border border-[#D4CFC6]'
                : 'text-[#8B8578] hover:text-[#4B5563] hover:bg-white/40'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Vocabulary by Week */}
      {activeSection === 'vocabulary' && (
        <div className="px-3 py-2">
          {(!archives?.vocabulary || archives.vocabulary.length === 0) && (
            <p className="text-[11px] text-[#9CA3AF] text-center py-8">No vocabulary records yet.</p>
          )}
          {archives?.vocabulary?.map(week => (
            <div key={week.weekNumber} className="mb-2">
              <button
                onClick={() => setExpandedWeek(expandedWeek === week.weekNumber ? null : week.weekNumber)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-white border border-[#E8E4DC] hover:border-[#D4CFC6] transition-colors"
              >
                <span className="text-[12px] font-semibold text-[#2C3340]">Shift {week.weekNumber}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[#8B8578]">{week.words.length} words</span>
                  <span className={`text-[10px] transition-transform ${expandedWeek === week.weekNumber ? 'rotate-180' : ''}`}>
                    &#9660;
                  </span>
                </div>
              </button>
              {expandedWeek === week.weekNumber && (
                <div className="mt-1 space-y-1 pl-2">
                  {week.words.map(w => (
                    <div key={w.word} className="flex items-center gap-3 px-3 py-2 bg-white/60 rounded-lg border border-[#E8E4DC]/50">
                      <div className="flex-1 min-w-0">
                        <span className="text-[12px] font-semibold text-[#2C3340]">{w.word}</span>
                        <p className="text-[10px] text-[#4B5563] leading-snug mt-0.5">{w.definition}</p>
                        {w.exampleSentence && (
                          <p className="text-[9px] text-[#8B8578] italic mt-0.5">"{w.exampleSentence}"</p>
                        )}
                      </div>
                      {/* Mastery bar */}
                      <div className="w-16 shrink-0">
                        <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              w.mastery >= 0.8 ? 'bg-emerald-500' : w.mastery >= 0.4 ? 'bg-amber-500' : 'bg-rose-400'
                            }`}
                            style={{ width: `${Math.round(w.mastery * 100)}%` }}
                          />
                        </div>
                        <p className="text-[8px] text-[#9CA3AF] text-right mt-0.5">
                          {Math.round(w.mastery * 100)}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Citizen-4488 Case File Timeline */}
      {activeSection === 'timeline' && (
        <div className="px-4 py-3">
          {(!archives?.timeline || archives.timeline.length === 0) && (
            <p className="text-[11px] text-[#9CA3AF] text-center py-8">No case file entries yet.</p>
          )}
          <div className="relative">
            {/* Timeline line */}
            {(archives?.timeline?.length ?? 0) > 1 && (
              <div className="absolute left-[14px] top-3 bottom-3 w-px bg-amber-200" />
            )}
            {archives?.timeline?.map((entry) => (
              <div key={entry.id} className="flex gap-3 mb-3 relative">
                {/* Timeline dot */}
                <div className={`w-[30px] h-[30px] rounded-full border-2 flex items-center justify-center shrink-0 z-[1] ${
                  entry.studentAction === 'flag' ? 'bg-rose-100 border-rose-300' :
                  entry.studentAction === 'approve' ? 'bg-emerald-100 border-emerald-300' :
                  'bg-amber-100 border-amber-300'
                }`}>
                  <span className="text-[8px] font-bold text-amber-700">
                    {entry.weekNumber ? `S${entry.weekNumber}` : '?'}
                  </span>
                </div>
                {/* Entry content */}
                <div className="flex-1 bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-semibold text-amber-700">{entry.authorLabel}</span>
                    <span className="text-[9px] text-amber-500">{formatTimestamp(entry.createdAt)}</span>
                    {entry.studentAction && (
                      <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold ml-auto ${
                        entry.studentAction === 'flag'
                          ? 'bg-rose-100 text-rose-600'
                          : 'bg-emerald-100 text-emerald-600'
                      }`}>
                        {entry.studentAction === 'flag' ? 'FLAGGED' : 'APPROVED'}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#4B5563] leading-relaxed">{entry.content}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bulletin Archive */}
      {activeSection === 'bulletins' && (
        <div className="px-3 py-2">
          {(!archives?.bulletins || archives.bulletins.length === 0) && (
            <p className="text-[11px] text-[#9CA3AF] text-center py-8">No archived bulletins.</p>
          )}
          {archives?.bulletins?.map(b => (
            <HarmonyBulletin
              key={b.id}
              post={{
                id: b.id,
                designation: b.authorLabel,
                content: b.content,
                status: 'approved',
                pearlNote: null,
                replyCount: 0,
                createdAt: b.createdAt,
                isOwn: false,
                weekNumber: b.weekNumber,
                postType: 'bulletin',
                bulletinData: b.bulletinData as HarmonyPost['bulletinData'],
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
