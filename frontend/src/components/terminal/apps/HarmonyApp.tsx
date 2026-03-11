import { useEffect, useState, useMemo, useCallback } from 'react';
import { useHarmonyStore } from '../../../stores/harmonyStore';
import type { HarmonyPost, CensureItem } from '../../../api/harmony';

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
    ? 'text-neon-cyan font-medium'
    : 'text-terminal-amber';
  const tipBg = type === 'focus'
    ? 'bg-neon-cyan/20 border-neon-cyan/30 text-neon-cyan'
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
    <p className="text-[13px] text-white/80 leading-relaxed">
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
    <form onSubmit={handleSubmit} className="px-4 py-3 border-b border-white/[0.06]">
      <div className="flex gap-3">
        <div className="w-8 h-8 rounded-full bg-neon-cyan/15 border border-neon-cyan/20 flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-[9px] font-bold text-neon-cyan">YOU</span>
        </div>
        <div className="flex-1">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={placeholder}
            className="w-full bg-transparent text-sm text-white/80 placeholder:text-white/20 resize-none outline-none"
            rows={2}
            maxLength={280}
          />
          <div className="flex items-center justify-between mt-1.5">
            <span className="font-ibm-mono text-[10px] text-white/20">
              {text.length}/280
            </span>
            <button
              type="submit"
              disabled={!text.trim() || submitting}
              className="px-4 py-1.5 rounded-full text-[11px] font-medium tracking-wider bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/25 hover:bg-neon-cyan/25 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
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
}: {
  post: HarmonyPost;
  focusWords: string[];
  reviewWords: string[];
  onOpenThread: (postId: string) => void;
  onCensure?: (postId: string, action: 'approve' | 'flag', weekNumber: number) => void;
}) {
  const is4488 = isCitizen4488(post);
  const [censureAction, setCensureAction] = useState<'approve' | 'flag' | null>(null);

  const avatarColor = is4488
    ? 'bg-terminal-amber/15 border-terminal-amber/30 text-terminal-amber'
    : post.isOwn
      ? 'bg-neon-cyan/15 border-neon-cyan/25 text-neon-cyan'
      : 'bg-white/[0.06] border-white/10 text-white/50';

  const designation = post.isOwn ? 'YOU' : post.designation;
  const initials = designation.slice(0, 3).toUpperCase();

  const handleCensureAction = (action: 'approve' | 'flag') => {
    if (censureAction || !onCensure) return;
    setCensureAction(action);
    onCensure(post.id, action, post.weekNumber ?? 1);
  };

  return (
    <div
      className={`px-4 py-3 border-b border-white/[0.06] hover:bg-white/[0.02] transition-colors ${
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
            <span className={`text-[13px] font-medium ${is4488 ? 'text-terminal-amber' : post.isOwn ? 'text-neon-cyan' : 'text-white/90'}`}>
              {designation}
            </span>
            {post.weekNumber != null && (
              <span className="text-[10px] text-white/25">
                S{post.weekNumber}
              </span>
            )}
            {post.status === 'pending_review' && (
              <span className="text-[9px] text-neon-cyan/60 tracking-wider">
                PENDING
              </span>
            )}
            <span className="text-[11px] text-white/20 ml-auto">
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
            <div className="mt-2 pl-2 border-l-2 border-neon-cyan/20">
              <p className="text-[10px] text-neon-cyan/60 italic">
                PEARL: {post.pearlNote}
              </p>
            </div>
          )}

          {/* Citizen-4488 interaction */}
          {is4488 && !post.isOwn && onCensure && (
            <div className="mt-2 flex items-center gap-2">
              {censureAction ? (
                <span className={`text-[10px] tracking-wider font-medium ${
                  censureAction === 'approve' ? 'text-green-400' : 'text-neon-pink'
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
                    className="text-[10px] px-2.5 py-1 rounded-md border border-neon-pink/20 text-neon-pink/60 hover:bg-neon-pink/10 hover:text-neon-pink transition-colors active:scale-95"
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
              className="text-[11px] text-white/25 hover:text-neon-cyan/60 transition-colors flex items-center gap-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
              </svg>
              {post.replyCount > 0 ? post.replyCount : ''}
            </button>
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
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-white/[0.06]">
        <button
          onClick={closeThread}
          className="text-xs text-white/40 hover:text-neon-cyan transition-colors flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Back
        </button>
        <span className="text-[10px] text-white/20 tracking-[0.2em] uppercase">
          Thread
        </span>
      </div>

      {/* Thread content */}
      <div className="flex-1 overflow-auto">
        {/* Parent post */}
        <div className="px-4 py-3 border-b border-white/[0.06]">
          <div className="flex gap-3">
            <div className={`w-9 h-9 rounded-full border flex items-center justify-center shrink-0 ${
              isCitizen4488(parentPost) ? 'bg-terminal-amber/15 border-terminal-amber/30' : 'bg-white/[0.06] border-white/10'
            }`}>
              <span className={`text-[8px] font-bold ${isCitizen4488(parentPost) ? 'text-terminal-amber' : 'text-white/50'}`}>
                {(parentPost.isOwn ? 'YOU' : parentPost.designation).slice(0, 4)}
              </span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[13px] font-medium text-white/90">
                  {parentPost.isOwn ? 'YOU' : parentPost.designation}
                </span>
                <span className="text-[11px] text-white/20">
                  {formatTimestamp(parentPost.createdAt)}
                </span>
              </div>
              <HighlightedContent content={parentPost.content} focusWords={focusWords} reviewWords={reviewWords} />
            </div>
          </div>
        </div>

        {/* Replies */}
        {repliesLoading && (
          <div className="text-xs text-neon-cyan/50 animate-pulse text-center py-6 tracking-wider">
            LOADING...
          </div>
        )}

        {replies.map((reply) => (
          <div key={reply.id} className="px-4 py-2.5 border-b border-white/[0.04] ml-6">
            <div className="flex gap-2.5">
              <div className="w-7 h-7 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0">
                <span className="text-[7px] font-bold text-white/40">
                  {reply.designation.slice(0, 3)}
                </span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[12px] font-medium text-white/70">{reply.designation}</span>
                  <span className="text-[10px] text-white/15">{formatTimestamp(reply.createdAt)}</span>
                </div>
                <HighlightedContent content={reply.content} focusWords={focusWords} reviewWords={reviewWords} />
              </div>
            </div>
          </div>
        ))}

        {!repliesLoading && replies.length === 0 && (
          <div className="text-[11px] text-white/20 text-center py-6 tracking-wider">
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

/* ─── Censure Queue Item ────────────────────────────────────────── */

function CensureCard({ item }: { item: CensureItem }) {
  const { respondToCensure } = useHarmonyStore();
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [result, setResult] = useState<{ isCorrect: boolean; correction: string | null; explanation: string | null } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const data = item.censureData;
  if (!data) return null;

  const typeLabel =
    item.postType === 'censure_grammar' ? 'GRAMMAR CHECK'
    : item.postType === 'censure_vocab' ? 'VOCABULARY CHECK'
    : 'WORD REPLACEMENT';

  const typeColor =
    item.postType === 'censure_grammar' ? 'text-neon-pink border-neon-pink/20 bg-neon-pink/[0.06]'
    : item.postType === 'censure_vocab' ? 'text-neon-cyan border-neon-cyan/20 bg-neon-cyan/[0.06]'
    : 'text-terminal-amber border-terminal-amber/20 bg-terminal-amber/[0.06]';

  const handleSubmit = async () => {
    if (selectedIdx === null || submitting) return;
    setSubmitting(true);
    const res = await respondToCensure(item.id, item.postType, selectedIdx);
    if (res) setResult(res);
    setSubmitting(false);
  };

  const isReviewed = item.reviewed || result !== null;

  return (
    <div className={`mx-4 mb-3 rounded-xl border border-white/[0.08] overflow-hidden ${
      isReviewed
        ? result?.isCorrect || item.wasCorrect
          ? 'border-green-500/20 bg-green-500/[0.03]'
          : 'border-neon-pink/20 bg-neon-pink/[0.03]'
        : 'bg-white/[0.02]'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <span className={`text-[9px] font-medium tracking-[0.15em] uppercase px-2 py-0.5 rounded-full border ${typeColor}`}>
            {typeLabel}
          </span>
          {item.weekNumber && (
            <span className="text-[10px] text-white/20">Shift {item.weekNumber}</span>
          )}
        </div>
        {isReviewed && (
          <span className={`text-[10px] font-medium tracking-wider ${
            result?.isCorrect || item.wasCorrect ? 'text-green-400' : 'text-neon-pink'
          }`}>
            {result?.isCorrect || item.wasCorrect ? 'CORRECT' : 'INCORRECT'}
          </span>
        )}
      </div>

      {/* Post content */}
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-6 h-6 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center">
            <span className="text-[7px] font-bold text-white/40">
              {item.designation.slice(0, 3)}
            </span>
          </div>
          <span className="text-[12px] text-white/60">{item.designation}</span>
        </div>
        <p className="text-[13px] text-white/75 leading-relaxed">{item.content}</p>
      </div>

      {/* Question / options */}
      {!isReviewed && (
        <div className="px-4 pb-3 space-y-2">
          <p className="text-[11px] text-white/40 tracking-wider uppercase">
            {item.postType === 'censure_grammar' && 'Identify the correct form:'}
            {item.postType === 'censure_vocab' && 'What does this word actually mean?'}
            {item.postType === 'censure_replace' && 'Select the correct word:'}
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {data.options.map((opt, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedIdx(idx)}
                className={`text-left px-3 py-2 rounded-lg text-[12px] border transition-all ${
                  selectedIdx === idx
                    ? 'border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan'
                    : 'border-white/[0.08] bg-white/[0.02] text-white/60 hover:border-white/20'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
          <button
            onClick={handleSubmit}
            disabled={selectedIdx === null || submitting}
            className="w-full mt-1 py-2 rounded-lg text-[11px] font-medium tracking-wider bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20 hover:bg-neon-cyan/20 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
          >
            {submitting ? 'CHECKING...' : 'SUBMIT REVIEW'}
          </button>
        </div>
      )}

      {/* Result feedback */}
      {isReviewed && (result || item.wasCorrect !== null) && (
        <div className="px-4 pb-3">
          <div className={`rounded-lg px-3 py-2 border ${
            result?.isCorrect || item.wasCorrect
              ? 'border-green-500/15 bg-green-500/[0.05]'
              : 'border-neon-pink/15 bg-neon-pink/[0.05]'
          }`}>
            <p className="text-[11px] text-white/50">
              <span className="font-medium text-white/70">Correction: </span>
              {result?.correction || data.correction}
            </p>
            <p className="text-[11px] text-white/40 mt-0.5">
              {result?.explanation || data.explanation}
            </p>
          </div>
        </div>
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
        <div className="text-xs text-neon-cyan/50 animate-pulse tracking-wider">
          LOADING CENSURE QUEUE...
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto py-3">
      {/* Stats bar */}
      <div className="flex items-center justify-between px-4 py-2 mb-2">
        <span className="text-[10px] text-white/30 tracking-[0.15em] uppercase">
          Documents for Review
        </span>
        <span className="text-[11px] text-neon-cyan/60 font-medium">
          {censureStats.completed}/{censureStats.total} reviewed
        </span>
      </div>

      {/* Progress bar */}
      {censureStats.total > 0 && (
        <div className="mx-4 mb-4 h-1 rounded-full bg-white/[0.06] overflow-hidden">
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
          <p className="text-[10px] text-white/20 tracking-[0.15em] uppercase mb-2">
            Completed ({reviewed.length})
          </p>
          {reviewed.map((item) => (
            <CensureCard key={item.id} item={item} />
          ))}
        </div>
      )}

      {censureItems.length === 0 && (
        <div className="text-center py-12">
          <p className="text-[11px] text-white/25 tracking-wider">
            No documents pending review.
          </p>
          <p className="text-[10px] text-white/15 mt-1">
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
          <span className="text-[10px] font-medium tracking-[0.15em] uppercase text-neon-cyan/70">
            Ministry Orientation — Harmony Protocol
          </span>
          <button
            onClick={onDismiss}
            className="text-[9px] text-white/25 hover:text-white/50 transition-colors tracking-wider"
          >
            DISMISS
          </button>
        </div>
      </div>
      <div className="px-4 py-3 space-y-2.5">
        <p className="text-[12px] text-white/70 leading-relaxed">
          Welcome to <span className="text-neon-cyan font-medium">Harmony</span>, the Ministry-monitored community network. As a Clarity Associate, you have two duties here:
        </p>
        <div className="space-y-1.5 pl-2 border-l border-neon-cyan/15">
          <div>
            <span className="text-[11px] text-neon-cyan/80 font-medium">Feed</span>
            <p className="text-[11px] text-white/50 leading-relaxed">
              Read citizen posts and practice your target vocabulary. You may write your own posts for Ministry review. Words from your current shift are highlighted.
            </p>
          </div>
          <div>
            <span className="text-[11px] text-terminal-amber/80 font-medium">Censure Queue</span>
            <p className="text-[11px] text-white/50 leading-relaxed">
              Review flagged citizen posts for language errors — grammar mistakes, vocabulary misuse, and incorrect word choices. Select the correct answer to clear each item.
            </p>
          </div>
        </div>
        <p className="text-[10px] text-white/30 italic">
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
      <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
        </svg>
      </div>
      <h3 className="font-special-elite text-base text-white/60 tracking-wider mb-2">
        Harmony Restricted
      </h3>
      <p className="text-[11px] text-white/30 text-center leading-relaxed max-w-xs">
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
      <div className="flex border-b border-white/[0.06]">
        <button
          onClick={() => setTab('feed')}
          className={`flex-1 py-2.5 text-[11px] font-medium tracking-[0.15em] uppercase transition-colors relative ${
            activeTab === 'feed'
              ? 'text-neon-cyan'
              : 'text-white/30 hover:text-white/50'
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
              ? 'text-neon-cyan'
              : 'text-white/30 hover:text-white/50'
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
    <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
      <div>
        <h2 className="font-special-elite text-[17px] text-white/90 tracking-wider">
          Harmony
        </h2>
        <p className="text-[9px] text-white/25 tracking-[0.2em] uppercase">
          Ministry-Monitored Community
        </p>
      </div>
      {currentWeekNumber > 0 && (
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500/60" />
          <span className="text-[10px] text-white/25">S{currentWeekNumber}</span>
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
}) {
  const [showVocab, setShowVocab] = useState(false);

  return (
    <>
      {/* Vocab chips (collapsible) */}
      {(focusWords.length > 0 || reviewWords.length > 0) && (
        <div className="border-b border-white/[0.06]">
          <button
            onClick={() => setShowVocab(!showVocab)}
            className="w-full flex items-center justify-between px-4 py-2 group"
          >
            <span className="text-[10px] text-neon-cyan/50 tracking-[0.2em] uppercase">
              Shift {currentWeekNumber} Vocabulary
            </span>
            <span className="text-[9px] text-white/20 group-hover:text-white/40 transition-colors">
              {showVocab ? 'HIDE' : 'SHOW'}
            </span>
          </button>
          {showVocab && (
            <div className="px-4 pb-3 space-y-2">
              {focusWords.length > 0 && (
                <div>
                  <p className="text-[9px] text-white/25 tracking-[0.15em] uppercase mb-1">Focus</p>
                  <div className="flex flex-wrap gap-1">
                    {focusWords.map((w) => (
                      <span key={w} className="text-[10px] px-2 py-0.5 rounded-full border border-neon-cyan/20 text-neon-cyan/70 bg-neon-cyan/[0.05]">
                        {w}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {reviewWords.length > 0 && (
                <div>
                  <p className="text-[9px] text-white/25 tracking-[0.15em] uppercase mb-1">Review</p>
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
          <div className="text-xs text-neon-cyan/50 animate-pulse text-center py-8 tracking-wider">
            LOADING FEED...
          </div>
        )}

        {error && (
          <div className="text-xs text-neon-pink/60 text-center py-2 tracking-wider">
            {error.toUpperCase()}
          </div>
        )}

        {!loading && posts.length === 0 && (
          <div className="text-[11px] text-white/25 text-center py-8 tracking-wider">
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
          />
        ))}
      </div>
    </>
  );
}
