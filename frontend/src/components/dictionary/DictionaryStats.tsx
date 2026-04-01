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
  const targetWords = words.filter((w) => !w.isWorldBuilding);
  const wbCount = words.length - targetWords.length;
  const masteredCount = targetWords.filter((w) => w.mastery >= 1.0).length;
  const avgMastery = targetWords.length > 0
    ? targetWords.reduce((sum, w) => sum + w.mastery, 0) / targetWords.length
    : 0;
  const rank = getRank(masteredCount);

  return (
    <div className="px-4 py-2 border-b" style={{ borderColor: 'var(--dict-border)' }}>
      <div className="flex items-center justify-between">
        <span
          className="font-ibm-mono text-[10px] tracking-wider uppercase"
          style={{ color: 'var(--dict-text-dim)' }}
        >
          {targetWords.length} TARGET{wbCount > 0 ? ` \u00B7 ${wbCount} REPUBLIC` : ''} &middot; {masteredCount} MASTERED
        </span>
        <div
          className="w-[60px] h-[6px] rounded-full overflow-hidden"
          style={{ background: 'var(--dict-border-light)' }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.round(avgMastery * 100)}%`,
              background: avgMastery >= 1
                ? 'linear-gradient(90deg, var(--dict-gold-dim), var(--dict-gold))'
                : 'linear-gradient(90deg, #7DD3FC, #0284C7)',
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
