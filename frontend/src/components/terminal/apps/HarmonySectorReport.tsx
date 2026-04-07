import type { HarmonyPost } from '../../../api/harmony';

export default function HarmonySectorReport({ post }: { post: HarmonyPost }) {
  return (
    <div className="mx-4 mb-3 rounded-xl border border-gray-200 overflow-hidden bg-gray-50/50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-100 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-medium tracking-[0.15em] uppercase text-gray-600">
            Sector Report
          </span>
          <span className="text-[11px] font-medium text-gray-700">{post.designation}</span>
        </div>
        {post.weekNumber && (
          <span className="text-[10px] text-gray-400">Shift {post.weekNumber}</span>
        )}
      </div>

      {/* Content */}
      <div className="px-4 py-3">
        <p className="text-[13px] text-[#4B5563] leading-relaxed whitespace-pre-line font-mono">{post.content}</p>
      </div>

      {/* PEARL note */}
      {post.pearlNote && (
        <div className="mx-4 mb-3 px-3 py-2 border-l-2 border-emerald-300 bg-emerald-50/50 rounded-r-lg">
          <p className="text-[10px] text-emerald-700 italic">{post.pearlNote}</p>
        </div>
      )}
    </div>
  );
}
