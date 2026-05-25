import { useEffect } from 'react';
import { useInscriptionStore } from '../../../../stores/inscriptionStore';

// ─── RollOfDistinction ──────────────────────────────────────────
//
// Lobby-only leaderboard. Amber CRT register; rendered inside the
// parent .crt-amber-monitor. No card chrome — just amber text.

interface Props {
  classId: string;
}

export default function RollOfDistinction({ classId }: Props) {
  const roll = useInscriptionStore((s) => s.roll);
  const loading = useInscriptionStore((s) => s.rollLoading);
  const loadRoll = useInscriptionStore((s) => s.loadRoll);

  useEffect(() => {
    void loadRoll(classId);
  }, [classId, loadRoll]);

  return (
    <section>
      <p className="amber-text-dim text-[12px] uppercase tracking-[0.3em] mb-4">
        &gt; roll of distinction
      </p>

      {loading && roll.length === 0 ? (
        <p className="amber-text-dim text-[12px] uppercase tracking-[0.3em] text-center py-3">
          loading...
        </p>
      ) : roll.length === 0 ? (
        <p className="amber-text-dim text-[12px] uppercase tracking-[0.3em] text-center py-3">
          no inscriptions recorded for this sector yet.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {roll.map((r, i) => {
            const isFirst = i === 0;
            const colorClass = isFirst
              ? 'amber-text-bright amber-glow'
              : 'amber-text';
            return (
              <li key={`${r.citizenNumber}-${i}`} className={`flex items-center gap-4 ${colorClass}`}>
                <span className="text-base tabular-nums w-8">
                  {isFirst ? '◆' : `${i + 1}.`}
                </span>
                <span className="text-base tracking-wider flex-1">
                  {r.citizenNumber}
                </span>
                <span className="text-[12px] tabular-nums tracking-wider amber-text-dim">
                  P.I. {r.piTotal}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <p className="amber-text-faint text-[11px] uppercase tracking-[0.3em] italic text-center mt-6">
        "citizens shall emulate the demonstrated compliance of those above."
      </p>
    </section>
  );
}
