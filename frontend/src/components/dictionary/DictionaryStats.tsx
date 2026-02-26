import type { DictionaryWord } from '../../types/dictionary';

const RANKS = [
  { min: 0, label: 'Lexical Trainee' },
  { min: 26, label: 'Lexical Associate' },
  { min: 61, label: 'Lexical Officer' },
  { min: 101, label: 'Lexical Commander' },
  { min: 150, label: 'Lexical Director' },
];

function getRank(masteredCount: number): string {
  let rank = RANKS[0].label;
  for (const r of RANKS) {
    if (masteredCount >= r.min) rank = r.label;
  }
  return rank;
}

interface Props {
  words: DictionaryWord[];
}

export default function DictionaryStats({ words }: Props) {
  const totalWords = words.length;
  const masteredCount = words.filter((w) => w.mastery >= 1.0).length;
  const avgMastery = totalWords > 0
    ? words.reduce((sum, w) => sum + w.mastery, 0) / totalWords
    : 0;
  const rank = getRank(masteredCount);

  return (
    <div className="px-4 py-2 border-b" style={{ borderColor: 'var(--dict-border)' }}>
      <div className="flex items-center justify-between">
        <span
          className="font-ibm-mono text-[10px] tracking-wider uppercase"
          style={{ color: 'var(--dict-text-dim)' }}
        >
          {totalWords} WORDS &middot; {masteredCount} MASTERED
        </span>
        <div
          className="w-[60px] h-[6px] rounded-full overflow-hidden"
          style={{ background: 'var(--dict-surface)' }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.round(avgMastery * 100)}%`,
              background: avgMastery >= 1
                ? 'linear-gradient(90deg, var(--dict-gold-dim), var(--dict-gold))'
                : 'linear-gradient(90deg, var(--dict-green-dark), var(--dict-green))',
            }}
          />
        </div>
      </div>
      <div
        className="font-ibm-mono text-[9px] tracking-[0.15em] mt-1"
        style={{ color: 'var(--dict-gold-dim)' }}
      >
        {rank.toUpperCase()}
      </div>
    </div>
  );
}
