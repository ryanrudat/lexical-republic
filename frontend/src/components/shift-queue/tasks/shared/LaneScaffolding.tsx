interface LaneScaffoldingProps {
  lane: number;
  scaffolding: Record<string, unknown>;
  targetWords: string[];
}

export default function LaneScaffolding({
  lane,
  scaffolding,
  targetWords,
}: LaneScaffoldingProps) {
  const laneConfig = scaffolding[String(lane)] as Record<string, unknown> | undefined;

  if (!laneConfig) return null;

  // Lane 1: sentence starters + word bank with Chinese
  if (lane === 1) {
    const showStarters = laneConfig.sentenceStarters === true;
    const hints = (laneConfig.pearlHints as string[] | undefined) ?? [];
    const showWordBank = laneConfig.wordBankChinese === true;

    return (
      <div className="flex flex-col gap-3">
        {showStarters && hints.length > 0 && (
          <div className="bg-[#FAFAF7] border border-[#E8E4DC] rounded-xl p-3">
            <p className="font-ibm-mono text-[10px] text-[#9CA3AF] uppercase tracking-wider mb-2">
              Sentence Starters
            </p>
            <ol className="list-decimal list-inside space-y-1">
              {hints.map((hint, i) => (
                <li key={i} className="text-xs text-[#4B5563]">
                  {hint}
                </li>
              ))}
            </ol>
          </div>
        )}
        {showWordBank && targetWords.length > 0 && (
          <div className="bg-[#FAFAF7] border border-[#E8E4DC] rounded-xl p-3">
            <p className="font-ibm-mono text-[10px] text-[#9CA3AF] uppercase tracking-wider mb-2">
              Word Bank
            </p>
            <div className="flex flex-wrap gap-1">
              {targetWords.map(word => (
                <span
                  key={word}
                  className="px-2 py-0.5 bg-white border border-[#D4CFC6] rounded-full text-[10px] text-[#4B5563]"
                >
                  {word}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Lane 2: word list without Chinese
  if (lane === 2) {
    const showWordList = laneConfig.wordListVisible === true;

    if (!showWordList || targetWords.length === 0) return null;

    return (
      <div className="bg-[#FAFAF7] border border-[#E8E4DC] rounded-xl p-3">
        <p className="font-ibm-mono text-[10px] text-[#9CA3AF] uppercase tracking-wider mb-2">
          Target Words
        </p>
        <div className="flex flex-wrap gap-1">
          {targetWords.map(word => (
            <span
              key={word}
              className="px-2 py-0.5 bg-white border border-[#D4CFC6] rounded-full text-[10px] text-[#4B5563]"
            >
              {word}
            </span>
          ))}
        </div>
      </div>
    );
  }

  // Lane 3: bonus question only
  if (lane === 3) {
    const bonusQuestion = laneConfig.bonusQuestion as string | undefined;

    if (!bonusQuestion) return null;

    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
        <p className="font-ibm-mono text-[10px] text-amber-600 uppercase tracking-wider mb-1">
          Bonus
        </p>
        <p className="text-xs text-amber-800">
          {bonusQuestion}
        </p>
      </div>
    );
  }

  return null;
}
