import { useEffect, useState } from 'react';
import { useStudentStore } from '../../../stores/studentStore';
import { useHarmonyStore } from '../../../stores/harmonyStore';

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

export default function HarmonyApp() {
  const user = useStudentStore((s) => s.user);
  const { posts, loading, error, loadPosts, submitPost } = useHarmonyStore();
  const [newPost, setNewPost] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void loadPosts();
  }, [loadPosts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.trim() || submitting) return;

    setSubmitting(true);
    try {
      await submitPost(newPost.trim());
      setNewPost('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="text-center py-4 px-6 border-b border-white/10">
        <h2 className="font-special-elite text-lg text-white/90 tracking-wider ios-text-glow">
          Harmony
        </h2>
        <p className="font-ibm-mono text-[10px] text-white/50 tracking-wider">
          Citizen Social Feed - Ministry Monitored
        </p>
      </div>

      <div className="border-b border-white/10 px-4 py-3">
        <form onSubmit={handleSubmit}>
          <textarea
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            placeholder="Share your thoughts with the community..."
            className="ios-glass-input w-full px-3 py-2 text-sm resize-none rounded-lg"
            rows={2}
            maxLength={280}
          />
          <div className="flex items-center justify-between mt-2">
            <span className="font-ibm-mono text-[10px] text-white/30">
              {newPost.length}/280
            </span>
            <button
              type="submit"
              disabled={!newPost.trim() || submitting}
              className="px-4 py-1.5 rounded-full font-ibm-mono text-xs text-neon-cyan border border-neon-cyan/30 tracking-wider hover:bg-neon-cyan/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {submitting ? 'SUBMITTING...' : 'SUBMIT FOR REVIEW'}
            </button>
          </div>
        </form>
      </div>

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
          <div
            key={post.id}
            className={`rounded-xl p-4 ios-glass-card ${
              post.status === 'pending_review'
                ? 'border-neon-cyan/30 bg-neon-cyan/5'
                : ''
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-ibm-mono text-xs tracking-wider text-white/90">
                  [{post.isOwn ? (user?.designation || 'YOU') : post.designation}]
                </span>
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

            <p className="font-ibm-mono text-sm text-white/80 leading-relaxed">
              {post.content}
            </p>

            {post.pearlNote && (
              <div className="mt-2 rounded border border-white/10 px-2 py-1">
                <p className="font-ibm-mono text-[10px] text-neon-cyan/70">
                  P.E.A.R.L.: {post.pearlNote}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
