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
          <div className="ios-glass-card p-3 rounded-lg">
            <p className="font-ibm-mono text-[10px] text-white/40 uppercase tracking-wider mb-2">
              Sentence Starters
            </p>
            <ol className="list-decimal list-inside space-y-1">
              {hints.map((hint, i) => (
                <li key={i} className="font-ibm-mono text-xs text-white/70">
                  {hint}
                </li>
              ))}
            </ol>
          </div>
        )}
        {showWordBank && targetWords.length > 0 && (
          <div className="ios-glass-card p-3 rounded-lg">
            <p className="font-ibm-mono text-[10px] text-white/40 uppercase tracking-wider mb-2">
              Word Bank
            </p>
            <div className="flex flex-wrap">
              {targetWords.map(word => (
                <span
                  key={word}
                  className="ios-glass-pill px-2 py-0.5 font-ibm-mono text-[10px] text-white/70 inline-block m-0.5"
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
      <div className="ios-glass-card p-3 rounded-lg">
        <p className="font-ibm-mono text-[10px] text-white/40 uppercase tracking-wider mb-2">
          Target Words
        </p>
        <div className="flex flex-wrap">
          {targetWords.map(word => (
            <span
              key={word}
              className="ios-glass-pill px-2 py-0.5 font-ibm-mono text-[10px] text-white/70 inline-block m-0.5"
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
      <div className="ios-glass-card p-3 rounded-lg border-terminal-amber/30">
        <p className="font-ibm-mono text-[10px] text-terminal-amber/60 uppercase tracking-wider mb-1">
          Bonus
        </p>
        <p className="font-ibm-mono text-xs text-white/70">
          {bonusQuestion}
        </p>
      </div>
    );
  }

  return null;
}
