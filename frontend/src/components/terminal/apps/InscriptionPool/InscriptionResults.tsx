import { useInscriptionStore } from '../../../../stores/inscriptionStore';

const TIER_LABEL: Record<string, { label: string; color: string }> = {
  gold: { label: '◆ GOLD COMMENDATION', color: 'text-amber-300' },
  silver: { label: '◆ SILVER COMMENDATION', color: 'text-slate-200' },
  bronze: { label: '◆ BRONZE COMMENDATION', color: 'text-orange-400' },
};

export default function InscriptionResults() {
  const result = useInscriptionStore((s) => s.result);
  const backToLobby = useInscriptionStore((s) => s.backToLobby);

  if (!result) return null;

  const tierInfo = result.commendationTier ? TIER_LABEL[result.commendationTier] : null;
  const breakdown = result.personalBreakdown;

  return (
    <div className="h-full overflow-y-auto px-6 py-6 ios-scroll crt-monitor-screen">
      <div className="max-w-3xl mx-auto space-y-5 relative z-[1]">
        <header className="text-center">
          <p className="font-ibm-mono text-[10px] text-[#5BB88C] tracking-[0.4em] uppercase mb-2">
            Inscription Drill · Complete
          </p>
          <h1 className="font-ibm-mono text-xl text-[#D4E8E5] tracking-[0.2em] uppercase">
            Period Demonstration Recorded
          </h1>
        </header>

        {/* Standings */}
        <section className="rounded-lg border border-[#5BB8B0]/30 bg-[#04181B]/60 p-4">
          <p className="font-ibm-mono text-[10px] text-[#5BB88C] tracking-[0.3em] uppercase mb-3">
            Final Standings
          </p>
          <ul className="space-y-1.5">
            {result.standings.map((s) => {
              const isSelf = s.desk === 1;
              const isFirst = s.rank === 1;
              return (
                <li
                  key={s.desk}
                  className={`flex items-center gap-3 rounded px-2 py-1.5 ${
                    isFirst ? 'bg-amber-500/10 ring-1 ring-amber-300/30' : ''
                  } ${isSelf ? 'ring-1 ring-sky-300/40' : ''}`}
                >
                  <span className="font-ibm-mono text-base font-bold w-7 shrink-0 tabular-nums text-[#D4E8E5]">
                    {s.rank}
                  </span>
                  <span className="font-ibm-mono text-sm text-[#D4E8E5] tracking-wider flex-1">
                    {s.citizenNumber} {isSelf && <span className="text-sky-300">(you)</span>}
                  </span>
                  <span className="font-ibm-mono text-[11px] text-[#82B0B5] tracking-wider tabular-nums">
                    {s.wordsCorrect} words
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        {/* P.I. + commendation */}
        <section className="rounded-lg border border-[#5BB8B0]/30 bg-[#04181B]/60 p-4 text-center">
          <p className="font-ibm-mono text-[10px] text-[#5BB88C] tracking-[0.3em] uppercase mb-2">
            Productivity Index Awarded
          </p>
          <p className={`font-ibm-mono text-3xl tracking-[0.1em] mb-1 ${result.piAwarded > 0 ? 'text-sky-300' : 'text-slate-400'}`}>
            {result.piAwarded > 0 ? `+${result.piAwarded}` : '0'}
          </p>
          {result.piCapped && (
            <p className="font-ibm-mono text-[10px] text-amber-300 tracking-wider mt-2">
              Daily solo allocation exhausted. Practice continues without P.I. credit.
            </p>
          )}
          {tierInfo && (
            <p className={`font-ibm-mono text-[11px] tracking-[0.3em] uppercase mt-3 ${tierInfo.color}`}>
              {tierInfo.label}
            </p>
          )}
        </section>

        {/* Personal breakdown */}
        {breakdown && (
          <section className="rounded-lg border border-[#5BB8B0]/30 bg-[#04181B]/60 p-4">
            <p className="font-ibm-mono text-[10px] text-[#5BB88C] tracking-[0.3em] uppercase mb-3">
              Your Performance
            </p>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 font-ibm-mono text-[11px]">
              <dt className="text-[#5BB88C]/80 tracking-wider">Inscribed</dt>
              <dd className="text-[#D4E8E5] tracking-wider tabular-nums">
                {breakdown.wordsCorrect} / {breakdown.wordsTotal}
              </dd>
              <dt className="text-[#5BB88C]/80 tracking-wider">Avg per word</dt>
              <dd className="text-[#D4E8E5] tracking-wider tabular-nums">
                {breakdown.averagePerWordSec !== null
                  ? `${breakdown.averagePerWordSec.toFixed(1)}s`
                  : '—'}
              </dd>
              {breakdown.fastestWord && (
                <>
                  <dt className="text-[#5BB88C]/80 tracking-wider">Fastest</dt>
                  <dd className="text-[#D4E8E5] tracking-wider">
                    "{breakdown.fastestWord.word}" · {breakdown.fastestWord.secs.toFixed(1)}s
                  </dd>
                </>
              )}
              {breakdown.slowestWord && (
                <>
                  <dt className="text-[#5BB88C]/80 tracking-wider">Slowest</dt>
                  <dd className="text-[#D4E8E5] tracking-wider">
                    "{breakdown.slowestWord.word}" · {breakdown.slowestWord.secs.toFixed(1)}s
                  </dd>
                </>
              )}
            </dl>
          </section>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={backToLobby}
            className="flex-1 px-5 py-3 rounded border border-[#5BB8B0]/40 bg-[#0A2A2E]/60 font-ibm-mono text-[11px] text-[#D4E8E5] hover:bg-[#0A2A2E] tracking-wider active:scale-[0.98]"
          >
            Return
          </button>
        </div>

        {breakdown?.slowestWord && (
          <p className="font-ibm-mono text-[9px] text-[#5BB88C]/60 tracking-wider italic text-center">
            "Continue practicing '{breakdown.slowestWord.word}', Citizen."
          </p>
        )}
      </div>
    </div>
  );
}
