import { useState } from 'react';
import type { GrammarError } from '../../api/ai';

interface MinistryAuditViewProps {
  text: string;
  errors: GrammarError[];
  onAmend: () => void;
  onAccept: () => void;
  isDegraded: boolean;
}

/**
 * Read-only annotation overlay replacing the textarea after grammar scan.
 * Highlights errored words as clickable spans with tooltip explanations.
 */
export default function MinistryAuditView({
  text,
  errors,
  onAmend,
  onAccept,
  isDegraded,
}: MinistryAuditViewProps) {
  const [activeTooltip, setActiveTooltip] = useState<number | null>(null);

  // Build segments: alternate between plain text and error spans
  const segments = buildSegments(text, errors);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-2 h-2 rounded-full ${errors.length > 0 ? 'bg-terminal-amber animate-pulse' : 'bg-neon-mint'}`} />
        <span className="font-ibm-mono text-[10px] tracking-[0.3em] uppercase text-white/60">
          {isDegraded
            ? 'Ministry Network Degraded — Provisional Clearance'
            : errors.length > 0
              ? `${errors.length} Compliance ${errors.length === 1 ? 'Issue' : 'Issues'} Detected`
              : 'Document Cleared — No Issues Found'}
        </span>
      </div>

      {/* Annotated text */}
      <div className="ios-glass-card p-4 leading-relaxed text-sm text-white/90 font-ibm-sans">
        {segments.map((seg, i) =>
          seg.error ? (
            <span
              key={i}
              onClick={() => setActiveTooltip(activeTooltip === i ? null : i)}
              className="relative cursor-pointer bg-terminal-amber/20 border-b-2 border-terminal-amber text-terminal-amber px-0.5 rounded-sm transition-colors hover:bg-terminal-amber/30"
            >
              {seg.text}
              {activeTooltip === i && seg.error && (
                <span
                  className="absolute left-0 top-full mt-1 z-50 w-64 p-3 rounded-lg bg-ios-surface border border-terminal-amber/30 shadow-lg"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="block font-ibm-mono text-[10px] text-terminal-amber tracking-wider uppercase mb-1">
                    {seg.error.rule.replace(/-/g, ' ')}
                  </span>
                  <span className="block font-ibm-sans text-xs text-white/80 mb-1">
                    {seg.error.explanation}
                  </span>
                  <span className="block font-ibm-mono text-xs text-neon-mint">
                    → {seg.error.suggestion}
                  </span>
                </span>
              )}
            </span>
          ) : (
            <span key={i}>{seg.text}</span>
          ),
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        {errors.length > 0 && (
          <button
            onClick={onAmend}
            className="flex-1 py-3 rounded-full font-ibm-mono text-xs uppercase tracking-[0.25em] ios-glass-pill-action text-neon-cyan hover:shadow-[0_0_16px_rgba(0,229,255,0.2)] transition-all"
          >
            Amend Record
          </button>
        )}
        <button
          onClick={onAccept}
          className={`${errors.length > 0 ? 'flex-1' : 'w-full'} py-3 rounded-full font-ibm-mono text-xs uppercase tracking-[0.25em] transition-all ${
            errors.length > 0
              ? 'ios-glass-pill text-white/40 hover:text-white/60'
              : 'ios-glass-pill-action text-neon-mint hover:shadow-[0_0_16px_rgba(105,240,174,0.2)]'
          }`}
        >
          {errors.length > 0 ? 'Submit Anyway' : 'Archive Case File'}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Text segmentation — split text into plain/error segments
// ---------------------------------------------------------------------------

interface Segment {
  text: string;
  error?: GrammarError;
}

function buildSegments(text: string, errors: GrammarError[]): Segment[] {
  if (errors.length === 0) return [{ text }];

  const sorted = [...errors].sort((a, b) => a.startIndex - b.startIndex);
  const segments: Segment[] = [];
  let cursor = 0;

  for (const err of sorted) {
    // Bounds check
    if (err.startIndex < cursor || err.startIndex >= text.length) continue;

    // Add plain text before this error
    if (err.startIndex > cursor) {
      segments.push({ text: text.slice(cursor, err.startIndex) });
    }

    // Add error span
    const end = Math.min(err.endIndex, text.length);
    segments.push({ text: text.slice(err.startIndex, end), error: err });
    cursor = end;
  }

  // Remaining text after last error
  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor) });
  }

  return segments;
}
