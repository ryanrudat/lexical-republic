import { useEffect, useState, useMemo, useCallback } from 'react';
import { useHarmonyStore } from '../../../stores/harmonyStore';
import type { HarmonyPost } from '../../../api/harmony';

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Unknown time';
  return new Intl.DateTimeFormat([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function isNpcPost(post: HarmonyPost): boolean {
  return !post.isOwn && /^Citizen-\d+$/.test(post.designation);
}

function isCitizen4488(post: HarmonyPost): boolean {
  return post.designation === 'Citizen-4488';
}

/** Highlights focus/review words in post content */
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
    <p className="font-ibm-mono text-sm text-white/80 leading-relaxed">
      {parts.map((p) => {
        if (p.type === 'focus')
          return (
            <span
              key={p.key}
              className="text-neon-cyan underline underline-offset-2 decoration-neon-cyan/40"
            >
              {p.text}
            </span>
          );
        if (p.type === 'review')
          return (
            <span
              key={p.key}
              className="text-terminal-amber underline underline-offset-2 decoration-terminal-amber/40"
            >
              {p.text}
            </span>
          );
        return <span key={p.key}>{p.text}</span>;
      })}
    </p>
  );
}

/** Vocabulary word chips section */
function VocabSection({
  focusWords,
  reviewWords,
  currentWeekNumber,
}: {
  focusWords: string[];
  reviewWords: string[];
  currentWeekNumber: number;
}) {
  const [collapsed, setCollapsed] = useState(false);

  if (focusWords.length === 0 && reviewWords.length === 0) return null;

  return (
    <div className="border-b border-white/10 px-4 py-3 space-y-3 bg-white/[0.02]">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-between w-full group"
      >
        <div>
          <p className="font-ibm-mono text-[10px] text-neon-cyan/80 tracking-[0.28em] uppercase">
            Shift {currentWeekNumber} Vocabulary
          </p>
          {!collapsed && (
            <p className="font-ibm-mono text-[11px] text-white/45 tracking-wider mt-1">
              Use these words in your posts for Ministry recognition.
            </p>
          )}
        </div>
        <span className="font-ibm-mono text-[10px] text-white/30 group-hover:text-white/50 transition-colors">
          {collapsed ? 'SHOW' : 'HIDE'}
        </span>
      </button>

      {!collapsed && (
        <>
          {focusWords.length > 0 && (
            <div>
              <p className="font-ibm-mono text-[10px] text-white/35 tracking-[0.2em] uppercase mb-2">
                Focus Words
              </p>
              <div className="flex flex-wrap gap-1.5">
                {focusWords.map((word) => (
                  <span
                    key={word}
                    className="rounded-full border border-neon-cyan/25 bg-neon-cyan/10 px-2 py-0.5 font-ibm-mono text-[10px] uppercase tracking-wider text-neon-cyan"
                  >
                    {word}
                  </span>
                ))}
              </div>
            </div>
          )}

          {reviewWords.length > 0 && (
            <div>
              <p className="font-ibm-mono text-[10px] text-white/35 tracking-[0.2em] uppercase mb-2">
                Review Words
              </p>
              <div className="flex flex-wrap gap-1.5">
                {reviewWords.map((word) => (
                  <span
                    key={word}
                    className="rounded-full border border-terminal-amber/25 bg-terminal-amber/10 px-2 py-0.5 font-ibm-mono text-[10px] uppercase tracking-wider text-terminal-amber"
                  >
                    {word}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** Compose area for new posts or replies */
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
    <form onSubmit={handleSubmit} className="px-4 py-3 border-b border-white/10">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        className="ios-glass-input w-full px-3 py-2 text-sm resize-none rounded-lg"
        rows={2}
        maxLength={280}
      />
      <div className="flex items-center justify-between mt-2">
        <span className="font-ibm-mono text-[10px] text-white/30">
          {text.length}/280
        </span>
        <button
          type="submit"
          disabled={!text.trim() || submitting}
          className="px-4 py-1.5 rounded-full font-ibm-mono text-xs text-neon-cyan border border-neon-cyan/30 tracking-wider hover:bg-neon-cyan/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {submitting ? 'SUBMITTING...' : submitLabel}
        </button>
      </div>
    </form>
  );
}

/** Censure action buttons for NPC posts (approve / correct / flag) */
function CensureActions({
  post,
  onCensure,
}: {
  post: HarmonyPost;
  onCensure: (action: 'approve' | 'correct' | 'flag') => void;
}) {
  const [acted, setActed] = useState(false);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);

  if (post.status === 'flagged') {
    return (
      <div className="mt-2 font-ibm-mono text-[10px] text-neon-pink/70 tracking-wider">
        FLAGGED FOR WELLNESS REVIEW
      </div>
    );
  }

  if (acted) {
    return (
      <div className="mt-2 font-ibm-mono text-[10px] text-white/40 tracking-wider">
        ACTION RECORDED: {selectedAction?.toUpperCase()}
      </div>
    );
  }

  return (
    <div className="mt-3 flex items-center gap-2">
      <span className="font-ibm-mono text-[8px] text-white/30 tracking-[0.2em] uppercase mr-1">
        REVIEW:
      </span>
      <button
        onClick={() => { setActed(true); setSelectedAction('approve'); onCensure('approve'); }}
        className="px-2.5 py-1 rounded-full font-ibm-mono text-[10px] tracking-wider border border-green-500/30 text-green-400/80 hover:bg-green-500/10 transition-colors"
      >
        APPROVE
      </button>
      <button
        onClick={() => { setActed(true); setSelectedAction('correct'); onCensure('correct'); }}
        className="px-2.5 py-1 rounded-full font-ibm-mono text-[10px] tracking-wider border border-terminal-amber/30 text-terminal-amber/80 hover:bg-terminal-amber/10 transition-colors"
      >
        CORRECT
      </button>
      <button
        onClick={() => { setActed(true); setSelectedAction('flag'); onCensure('flag'); }}
        className="px-2.5 py-1 rounded-full font-ibm-mono text-[10px] tracking-wider border border-neon-pink/30 text-neon-pink/80 hover:bg-neon-pink/10 transition-colors"
      >
        FLAG
      </button>
    </div>
  );
}

/** Single post card */
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
  onCensure: (postId: string, action: 'approve' | 'correct' | 'flag', weekNumber: number) => void;
}) {
  const is4488 = isCitizen4488(post);
  const isNpc = isNpcPost(post);

  const cardClass = is4488
    ? 'border-terminal-amber/20 bg-terminal-amber/[0.04]'
    : post.status === 'pending_review'
      ? 'border-neon-cyan/30 bg-neon-cyan/5'
      : post.status === 'flagged'
        ? 'border-neon-pink/20 bg-neon-pink/[0.04] opacity-60'
        : '';

  return (
    <div className={`rounded-xl p-4 ios-glass-card ${cardClass}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {is4488 && (
            <span className="w-2 h-2 rounded-full bg-terminal-amber animate-pulse" />
          )}
          <span
            className={`font-ibm-mono text-xs tracking-wider ${
              is4488
                ? 'text-terminal-amber/90'
                : post.isOwn
                  ? 'text-neon-cyan/90'
                  : 'text-white/90'
            }`}
          >
            [{post.isOwn ? 'YOU' : post.designation}]
          </span>
          {post.weekNumber != null && (
            <span className="rounded-full border border-white/10 px-2 py-0.5 font-ibm-mono text-[8px] uppercase tracking-[0.18em] text-white/45">
              Shift {post.weekNumber}
            </span>
          )}
          {post.status === 'pending_review' && (
            <span className="font-ibm-mono text-[8px] text-neon-cyan/70 tracking-wider uppercase">
              UNDER REVIEW
            </span>
          )}
        </div>
        <span className="font-ibm-mono text-[10px] text-white/30">
          {formatTimestamp(post.createdAt)}
        </span>
      </div>

      {/* Content with word highlighting */}
      <HighlightedContent
        content={post.content}
        focusWords={focusWords}
        reviewWords={reviewWords}
      />

      {/* PEARL note */}
      {post.pearlNote && (
        <div className="mt-2 rounded border border-white/10 px-2 py-1">
          <p className="font-ibm-mono text-[10px] text-neon-cyan/70">
            P.E.A.R.L.: {post.pearlNote}
          </p>
        </div>
      )}

      {/* Citizen-4488 grammar notice */}
      {is4488 && post.status !== 'flagged' && (
        <div className="mt-2 rounded border border-terminal-amber/15 px-2 py-1 bg-terminal-amber/[0.03]">
          <p className="font-ibm-mono text-[9px] text-terminal-amber/60 tracking-wider">
            COMMUNITY POST — REVIEW FOR LANGUAGE COMPLIANCE
          </p>
        </div>
      )}

      {/* Censure actions for NPC posts */}
      {isNpc && post.status !== 'flagged' && (
        <CensureActions
          post={post}
          onCensure={(action) =>
            onCensure(post.id, action, post.weekNumber ?? 1)
          }
        />
      )}

      {/* Footer: reply count + thread link */}
      <div className="mt-3 flex items-center justify-between">
        <button
          onClick={() => onOpenThread(post.id)}
          className="font-ibm-mono text-[10px] text-white/40 hover:text-neon-cyan/70 tracking-wider transition-colors"
        >
          {post.replyCount > 0
            ? `${post.replyCount} ${post.replyCount === 1 ? 'REPLY' : 'REPLIES'}`
            : 'REPLY'}
        </button>
      </div>
    </div>
  );
}

/** Thread view — shows parent post + replies + compose */
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
    censurePost,
  } = useHarmonyStore();

  const parentPost = posts.find((p) => p.id === selectedPostId);
  if (!parentPost) return null;

  return (
    <div className="flex flex-col h-full">
      {/* Thread header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
        <button
          onClick={closeThread}
          className="font-ibm-mono text-xs text-white/50 hover:text-neon-cyan tracking-wider transition-colors"
        >
          &larr; FEED
        </button>
        <span className="font-ibm-mono text-[10px] text-white/30 tracking-[0.2em] uppercase">
          THREAD
        </span>
      </div>

      {/* Scrollable area: parent + replies */}
      <div className="flex-1 overflow-auto px-4 py-4 space-y-3">
        {/* Parent post (no thread link in thread view) */}
        <div
          className={`rounded-xl p-4 ios-glass-card border-white/20 ${
            isCitizen4488(parentPost) ? 'border-terminal-amber/20 bg-terminal-amber/[0.04]' : ''
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {isCitizen4488(parentPost) && (
                <span className="w-2 h-2 rounded-full bg-terminal-amber animate-pulse" />
              )}
              <span
                className={`font-ibm-mono text-xs tracking-wider ${
                  isCitizen4488(parentPost)
                    ? 'text-terminal-amber/90'
                    : parentPost.isOwn
                      ? 'text-neon-cyan/90'
                      : 'text-white/90'
                }`}
              >
                [{parentPost.isOwn ? 'YOU' : parentPost.designation}]
              </span>
              {parentPost.weekNumber != null && (
                <span className="rounded-full border border-white/10 px-2 py-0.5 font-ibm-mono text-[8px] uppercase tracking-[0.18em] text-white/45">
                  Shift {parentPost.weekNumber}
                </span>
              )}
            </div>
            <span className="font-ibm-mono text-[10px] text-white/30">
              {formatTimestamp(parentPost.createdAt)}
            </span>
          </div>
          <HighlightedContent
            content={parentPost.content}
            focusWords={focusWords}
            reviewWords={reviewWords}
          />
          {parentPost.pearlNote && (
            <div className="mt-2 rounded border border-white/10 px-2 py-1">
              <p className="font-ibm-mono text-[10px] text-neon-cyan/70">
                P.E.A.R.L.: {parentPost.pearlNote}
              </p>
            </div>
          )}
          {isNpcPost(parentPost) && parentPost.status !== 'flagged' && (
            <CensureActions
              post={parentPost}
              onCensure={(action) =>
                censurePost(parentPost.id, action, parentPost.weekNumber ?? 1)
              }
            />
          )}
        </div>

        {/* Replies */}
        {repliesLoading && (
          <div className="font-ibm-mono text-xs text-neon-cyan animate-pulse tracking-wider text-center py-4">
            LOADING REPLIES...
          </div>
        )}

        {replies.map((reply) => (
          <div
            key={reply.id}
            className="rounded-lg p-3 ml-4 border-l-2 border-white/10 bg-white/[0.02]"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-ibm-mono text-[11px] tracking-wider text-white/70">
                [{reply.designation}]
              </span>
              <span className="font-ibm-mono text-[10px] text-white/25">
                {formatTimestamp(reply.createdAt)}
              </span>
            </div>
            <HighlightedContent
              content={reply.content}
              focusWords={focusWords}
              reviewWords={reviewWords}
            />
          </div>
        ))}

        {!repliesLoading && replies.length === 0 && (
          <div className="font-ibm-mono text-[11px] text-white/30 tracking-wider text-center py-4 ml-4">
            NO REPLIES YET
          </div>
        )}
      </div>

      {/* Reply compose */}
      <ComposeBox
        placeholder="Write a reply using this shift's vocabulary..."
        onSubmit={submitReply}
        submitLabel="REPLY"
      />
    </div>
  );
}

export default function HarmonyApp() {
  const {
    posts,
    currentWeekNumber,
    focusWords,
    reviewWords,
    loading,
    error,
    selectedPostId,
    loadPosts,
    submitPost,
    openThread,
    censurePost,
  } = useHarmonyStore();

  useEffect(() => {
    void loadPosts();
  }, [loadPosts]);

  const handleCensure = useCallback(
    (postId: string, action: 'approve' | 'correct' | 'flag', weekNumber: number) => {
      void censurePost(postId, action, weekNumber);
    },
    [censurePost],
  );

  // Thread view
  if (selectedPostId) {
    return (
      <ThreadView focusWords={focusWords} reviewWords={reviewWords} />
    );
  }

  // Feed view
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="text-center py-4 px-6 border-b border-white/10">
        <h2 className="font-special-elite text-lg text-white/90 tracking-wider ios-text-glow">
          Harmony
        </h2>
        <p className="font-ibm-mono text-[10px] text-white/50 tracking-wider">
          Community Feed — Ministry Monitored
        </p>
      </div>

      {/* Vocab section (collapsible) */}
      <VocabSection
        focusWords={focusWords}
        reviewWords={reviewWords}
        currentWeekNumber={currentWeekNumber}
      />

      {/* Compose new post */}
      <ComposeBox
        placeholder="Use this shift's focus words or review words in a community post..."
        onSubmit={submitPost}
        submitLabel="SUBMIT FOR REVIEW"
      />

      {/* Post feed */}
      <div className="flex-1 overflow-auto px-4 py-4 space-y-3">
        {loading && posts.length === 0 && (
          <div className="font-ibm-mono text-xs text-neon-cyan animate-pulse tracking-wider text-center py-8">
            LOADING HARMONY FEED...
          </div>
        )}

        {error && (
          <div className="font-ibm-mono text-xs text-neon-pink tracking-wider text-center py-2">
            {error.toUpperCase()}
          </div>
        )}

        {!loading && posts.length === 0 && (
          <div className="font-ibm-mono text-xs text-white/50 tracking-wider text-center py-8">
            NO POSTS AVAILABLE YET.
          </div>
        )}

        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            focusWords={focusWords}
            reviewWords={reviewWords}
            onOpenThread={openThread}
            onCensure={handleCensure}
          />
        ))}
      </div>
    </div>
  );
}
