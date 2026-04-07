import type { HarmonyPost } from '../../../api/harmony';

export default function HarmonyPearlTip({ post }: { post: HarmonyPost }) {
  return (
    <div className="mx-4 mb-3 rounded-xl border border-emerald-200 overflow-hidden bg-emerald-50/50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-emerald-200">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center flex-shrink-0">
            <span className="text-[8px] font-bold text-emerald-700">P</span>
          </div>
          <span className="text-[10px] font-medium tracking-[0.15em] uppercase text-emerald-700">
            {post.designation}
          </span>
        </div>
        {post.weekNumber && (
          <span className="text-[10px] text-emerald-500">Shift {post.weekNumber}</span>
        )}
      </div>

      {/* Content */}
      <div className="px-4 py-3">
        <p className="text-[13px] text-[#4B5563] leading-relaxed whitespace-pre-line">{post.content}</p>
      </div>
    </div>
  );
}
