import { useInscriptionStore } from '../../../../stores/inscriptionStore';

// ─── InscriptionResults ──────────────────────────────────────────
//
// Amber CRT register. End-of-drill summary: final standings, P.I.
// awarded, personal breakdown (avg / fastest / slowest words).
// No styled cards — sections divided by dashed amber rules.

const TIER_LABEL: Record<string, string> = {
  gold:   '◆ GOLD COMMENDATION',
  silver: '◆ SILVER COMMENDATION',
  bronze: '◆ BRONZE COMMENDATION',
};

export default function InscriptionResults() {
  const result = useInscriptionStore((s) => s.result);
  const backToLobby = useInscriptionStore((s) => s.backToLobby);

  if (!result) return null;

  const tierLabel = result.commendationTier ? TIER_LABEL[result.commendationTier] : null;
  const breakdown = result.personalBreakdown;

  return (
    <div className="crt-amber-monitor h-full overflow-y-auto ios-scroll">
      <div className="max-w-2xl mx-auto px-8 py-10 pixel-mono">
        {/* Header */}
        <p className="amber-text-bright text-[12px] uppercase tracking-[0.4em] text-center mb-2 amber-glow">
          Inscription Drill · Complete
        </p>
        <h1 className="amber-text-bright text-2xl uppercase tracking-[0.2em] text-center mb-10 amber-glow-strong">
          Period Demonstration Recorded
        </h1>

        <div className="border-t border-dashed border-[#FFB000]/40 mb-8" />

        {/* Standings */}
        <p className="amber-text-dim text-[12px] uppercase tracking-[0.3em] mb-4">
          &gt; final standings
        </p>
        <ul className="space-y-1.5 mb-10">
          {result.standings.map((s) => {
            const isSelf = s.desk === 1;
            const isFirst = s.rank === 1;
            const colorClass = isFirst
              ? 'amber-text-bright amber-glow'
              : isSelf
              ? 'amber-text amber-glow'
              : 'amber-text-dim';
            return (
              <li key={s.desk} className={`flex items-center gap-4 ${colorClass}`}>
                <span className="text-base tabular-nums w-8">
                  {s.rank}.
                </span>
                <span className="text-base tracking-wider flex-1">
                  {s.citizenNumber}
                  {isSelf && <span className="amber-text-dim ml-2">(you)</span>}
                </span>
                <span className="text-[12px] tabular-nums tracking-wider">
                  {s.wordsCorrect} words
                </span>
              </li>
            );
          })}
        </ul>

        <div className="border-t border-dashed border-[#FFB000]/40 mb-8" />

        {/* P.I. + commendation */}
        <p className="amber-text-dim text-[12px] uppercase tracking-[0.3em] mb-2">
          &gt; productivity index awarded
        </p>
        <p className={`text-5xl mb-3 amber-glow-strong ${result.piAwarded > 0 ? 'amber-text-bright' : 'amber-text-dim'}`}>
          {result.piAwarded > 0 ? `+${result.piAwarded}` : '0'}
        </p>
        {result.piCapped && (
          <p className="amber-text text-[11px] uppercase tracking-[0.3em] mb-2">
            &gt; daily solo allocation exhausted. practice without p.i. credit.
          </p>
        )}
        {tierLabel && (
          <p className="amber-text-bright text-[12px] uppercase tracking-[0.4em] amber-glow mb-10">
            {tierLabel}
          </p>
        )}

        {!tierLabel && <div className="mb-10" />}

        <div className="border-t border-dashed border-[#FFB000]/40 mb-8" />

        {/* Personal breakdown */}
        {breakdown && (
          <>
            <p className="amber-text-dim text-[12px] uppercase tracking-[0.3em] mb-4">
              &gt; your performance
            </p>
            <dl className="grid grid-cols-[140px_1fr] gap-y-2 text-[13px] amber-text mb-10">
              <dt className="amber-text-dim uppercase tracking-wider text-[11px]">Inscribed</dt>
              <dd className="amber-text-bright tabular-nums">
                {breakdown.wordsCorrect} / {breakdown.wordsTotal}
              </dd>
              <dt className="amber-text-dim uppercase tracking-wider text-[11px]">Avg / word</dt>
              <dd className="amber-text-bright tabular-nums">
                {breakdown.averagePerWordSec !== null
                  ? `${breakdown.averagePerWordSec.toFixed(1)}s`
                  : '—'}
              </dd>
              {breakdown.fastestWord && (
                <>
                  <dt className="amber-text-dim uppercase tracking-wider text-[11px]">Fastest</dt>
                  <dd className="amber-text-bright tracking-wider">
                    "{breakdown.fastestWord.word}" · {breakdown.fastestWord.secs.toFixed(1)}s
                  </dd>
                </>
              )}
              {breakdown.slowestWord && (
                <>
                  <dt className="amber-text-dim uppercase tracking-wider text-[11px]">Slowest</dt>
                  <dd className="amber-text-bright tracking-wider">
                    "{breakdown.slowestWord.word}" · {breakdown.slowestWord.secs.toFixed(1)}s
                  </dd>
                </>
              )}
            </dl>

            <div className="border-t border-dashed border-[#FFB000]/40 mb-8" />
          </>
        )}

        {/* Return action */}
        <button
          type="button"
          onClick={backToLobby}
          className="amber-text-bright hover:amber-glow-strong text-base uppercase tracking-[0.3em]"
        >
          &gt; [ return ]
        </button>

        {breakdown?.slowestWord && (
          <p className="amber-text-faint text-[11px] uppercase tracking-[0.3em] italic text-center mt-10">
            "continue practicing '{breakdown.slowestWord.word}', citizen."
          </p>
        )}
      </div>
    </div>
  );
}
