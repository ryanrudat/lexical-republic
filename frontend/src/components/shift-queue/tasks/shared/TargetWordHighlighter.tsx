import { useMemo } from 'react';
import { matchesTargetWord } from '../../../../utils/stemmer';

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

  const wordStatus = useMemo(() => {
    if (!targetWords.length) return [];
    return targetWords.map(w => ({
      word: w,
      used: matchesTargetWord(text, w),
    }));
  }, [text, targetWords]);

  const matchedCount = wordStatus.filter(w => w.used).length;

  return (
    <div>
      <textarea
        className="w-full text-sm text-[#2C3340] p-3 bg-white border border-[#D4CFC6] rounded-xl resize-none focus:outline-none focus:ring-1 focus:ring-sky-400 placeholder:text-[#B8B3AA]"
        rows={rows}
        value={text}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        spellCheck={false}
      />

      <div className="flex items-center justify-between mt-1.5">
        <span className="text-xs text-[#8B8578]">
          <span className="font-semibold">{wordCount}</span>
          {minWords != null && <><span className="mx-0.5">/</span><span className="font-semibold">{minWords}</span></>}
          <span className="ml-1">words</span>
        </span>
        {targetWords.length > 0 && (
          <span className="text-[10px] text-[#9CA3AF]">
            {matchedCount} / {targetWords.length} target words used
          </span>
        )}
      </div>

      {targetWords.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {wordStatus.map(({ word, used }) => (
            <span
              key={word}
              className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                used
                  ? 'border-emerald-300 text-emerald-600 bg-emerald-50'
                  : 'border-[#E8E4DC] text-[#B8B3AA]'
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
