import type { DictionaryWord } from '../../types/dictionary';

interface DictionaryStatsProps {
  words: DictionaryWord[];
}

export default function DictionaryStats({ words }: DictionaryStatsProps) {
  const targetWords = words.filter((w) => !w.isWorldBuilding);
  const worldBuilding = words.filter((w) => w.isWorldBuilding);

  const statusCounts = words.reduce<Record<string, number>>((acc, w) => {
    acc[w.status] = (acc[w.status] || 0) + 1;
    return acc;
  }, {});

  const avgMastery = targetWords.length > 0
    ? Math.round((targetWords.reduce((sum, w) => sum + w.mastery, 0) / targetWords.length) * 100)
    : 0;

  return (
    <div className="px-3 py-2 space-y-2">
      {/* Word counts */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="font-dseg7 text-sm text-neon-cyan/70 tabular-nums">
            {String(words.length).padStart(3, '0')}
          </span>
          <span className="font-ibm-mono text-[9px] text-white/30 tracking-wider uppercase">
            Total
          </span>
        </div>
        <div className="w-px h-3 bg-white/10" />
        <div className="flex items-center gap-1.5">
          <span className="font-ibm-mono text-[11px] text-neon-mint/70 tabular-nums">
            {targetWords.length}
          </span>
          <span className="font-ibm-mono text-[9px] text-white/25 tracking-wider">
            target
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-ibm-mono text-[11px] text-white/40 tabular-nums">
            {worldBuilding.length}
          </span>
          <span className="font-ibm-mono text-[9px] text-white/25 tracking-wider">
            world
          </span>
        </div>
      </div>

      {/* Status breakdown */}
      <div className="flex items-center gap-2 flex-wrap">
        {statusCounts.approved && (
          <span className="font-ibm-mono text-[9px] text-neon-mint/60 tracking-wider">
            {statusCounts.approved} approved
          </span>
        )}
        {statusCounts.grey && (
          <span className="font-ibm-mono text-[9px] text-white/40 tracking-wider">
            {statusCounts.grey} grey
          </span>
        )}
        {statusCounts.monitored && (
          <span className="font-ibm-mono text-[9px] text-terminal-amber/60 tracking-wider">
            {statusCounts.monitored} monitored
          </span>
        )}
        {statusCounts.proscribed && (
          <span className="font-ibm-mono text-[9px] text-neon-pink/60 tracking-wider">
            {statusCounts.proscribed} proscribed
          </span>
        )}
        {statusCounts.recovered && (
          <span className="font-ibm-mono text-[9px] text-neon-cyan/60 tracking-wider">
            {statusCounts.recovered} recovered
          </span>
        )}
      </div>

      {/* Mastery bar */}
      <div className="flex items-center gap-2">
        <span className="font-ibm-mono text-[9px] text-white/25 tracking-wider uppercase shrink-0">
          Mastery
        </span>
        <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-neon-cyan/50 rounded-full transition-all"
            style={{ width: `${avgMastery}%` }}
          />
        </div>
        <span className="font-ibm-mono text-[10px] text-white/30 tabular-nums shrink-0">
          {avgMastery}%
        </span>
      </div>
    </div>
  );
}
