import { useMemo } from 'react';

interface TargetWordHighlighterProps {
  text: string;
  onChange: (text: string) => void;
  targetWords: string[];
  placeholder?: string;
  minWords?: number;
  rows?: number;
}

export default function TargetWordHighlighter({
  text,
  onChange,
  targetWords,
  placeholder,
  minWords,
  rows = 5,
}: TargetWordHighlighterProps) {
  const highlightedHtml = useMemo(() => {
    if (!targetWords.length || !text) return text;
    const pattern = new RegExp(
      '\\b(' + targetWords.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')\\b',
      'gi',
    );
    return text.replace(
      pattern,
      '<mark class="bg-neon-mint/20 text-neon-mint rounded px-0.5">$1</mark>',
    );
  }, [text, targetWords]);

  const wordCount = useMemo(() => {
    return text.split(/\s+/).filter(Boolean).length;
  }, [text]);

  const matchedCount = useMemo(() => {
    if (!targetWords.length) return 0;
    const lower = text.toLowerCase();
    return targetWords.filter(w => {
      const pattern = new RegExp('\\b' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
      return pattern.test(lower);
    }).length;
  }, [text, targetWords]);

  return (
    <div>
      <div className="relative">
        {/* Hidden mirror div for highlights */}
        <div
          className="absolute inset-0 font-ibm-mono text-sm text-transparent whitespace-pre-wrap break-words pointer-events-none overflow-hidden p-3"
          aria-hidden="true"
          dangerouslySetInnerHTML={{ __html: highlightedHtml }}
        />
        {/* Textarea on top */}
        <textarea
          className="ios-glass-input bg-transparent relative z-10 w-full font-ibm-mono text-sm text-white p-3 resize-none"
          rows={rows}
          value={text}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          spellCheck={false}
        />
      </div>
      <div className="flex items-center justify-between mt-1.5">
        <span className="font-dseg7 text-xs text-white/50">
          {wordCount}{minWords != null ? ` / ${minWords}` : ''} words
        </span>
        {targetWords.length > 0 && (
          <span className="font-ibm-mono text-[10px] text-white/40">
            {matchedCount} / {targetWords.length} target words used
          </span>
        )}
      </div>
    </div>
  );
}
