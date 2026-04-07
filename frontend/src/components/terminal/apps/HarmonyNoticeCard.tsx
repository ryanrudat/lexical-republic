import type { HarmonyPost } from '../../../api/harmony';

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

export default function HarmonyNoticeCard({
  post,
  onOpenThread,
}: {
  post: HarmonyPost;
  onOpenThread?: (postId: string) => void;
}) {
  return (
    <div className="mx-4 mb-3 rounded-xl border border-amber-200/60 overflow-hidden bg-amber-50/30">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-amber-200/40">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-amber-100 border border-amber-200 flex items-center justify-center flex-shrink-0">
            <span className="text-[8px] font-bold text-amber-700">N</span>
          </div>
          <span className="text-[11px] font-medium text-amber-800">{post.designation}</span>
          <span className="text-[9px] bg-amber-100/50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-full">
            NOTICE
          </span>
        </div>
        <span className="text-[10px] text-[#B8B3AA]">{formatTimestamp(post.createdAt)}</span>
      </div>

      {/* Content */}
      <div className="px-4 py-3">
        <p className="text-[13px] text-[#4B5563] leading-relaxed whitespace-pre-line">{post.content}</p>
      </div>

      {/* PEARL note */}
      {post.pearlNote && (
        <div className="mx-4 mb-3 px-3 py-2 border-l-2 border-emerald-300 bg-emerald-50/50 rounded-r-lg">
          <p className="text-[10px] text-emerald-700 italic">{post.pearlNote}</p>
        </div>
      )}

      {/* Thread link */}
      {post.replyCount > 0 && onOpenThread && (
        <div className="border-t border-amber-200/40 px-4 py-2">
          <button
            onClick={() => onOpenThread(post.id)}
            className="text-[10px] text-amber-700/70 hover:text-amber-800 transition-colors"
          >
            {post.replyCount} {post.replyCount === 1 ? 'reply' : 'replies'}
          </button>
        </div>
      )}
    </div>
  );
}
