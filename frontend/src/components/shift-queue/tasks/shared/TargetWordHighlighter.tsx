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
  const wordCount = useMemo(() => {
    return text.split(/\s+/).filter(Boolean).length;
  }, [text]);

  // Track which target words have been used
  const wordStatus = useMemo(() => {
    if (!targetWords.length) return [];
    const lower = text.toLowerCase();
    return targetWords.map(w => ({
      word: w,
      used: new RegExp('\\b' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i').test(lower),
    }));
  }, [text, targetWords]);

  const matchedCount = wordStatus.filter(w => w.used).length;

  return (
    <div>
      {/* Textarea — clean, no overlay */}
      <textarea
        className="ios-glass-input w-full font-ibm-mono text-sm text-white p-3 resize-none"
        rows={rows}
        value={text}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        spellCheck={false}
      />

      {/* Word count */}
      <div className="flex items-center justify-between mt-1.5">
        <span className="font-ibm-mono text-xs text-white/50">
          <span className="font-dseg7">{wordCount}</span>
          {minWords != null && <><span className="mx-0.5">/</span><span className="font-dseg7">{minWords}</span></>}
          <span className="ml-1">words</span>
        </span>
        {targetWords.length > 0 && (
          <span className="font-ibm-mono text-[10px] text-white/40">
            {matchedCount} / {targetWords.length} target words used
          </span>
        )}
      </div>

      {/* Target word chips — green when used, dim when not */}
      {targetWords.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {wordStatus.map(({ word, used }) => (
            <span
              key={word}
              className={`font-ibm-mono text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                used
                  ? 'border-neon-mint/50 text-neon-mint bg-neon-mint/10'
                  : 'border-white/10 text-white/30'
              }`}
            >
              {used && <span className="mr-0.5">&#10003;</span>}
              {word}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
