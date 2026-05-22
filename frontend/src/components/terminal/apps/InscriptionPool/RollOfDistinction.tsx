import { useEffect } from 'react';
import { useInscriptionStore } from '../../../../stores/inscriptionStore';

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
    <section className="rounded-lg border border-[#5BB8B0]/30 bg-[#0A2A2E]/40 p-4">
      <p className="font-ibm-mono text-[10px] text-[#5BB88C] tracking-[0.3em] uppercase mb-3">
        Roll of Distinction
      </p>

      {loading && roll.length === 0 ? (
        <p className="font-ibm-mono text-[10px] text-[#82B0B5] tracking-wider text-center py-3">
          Loading...
        </p>
      ) : roll.length === 0 ? (
        <p className="font-ibm-mono text-[10px] text-[#82B0B5] tracking-wider text-center py-3">
          No Inscriptions recorded for this sector yet.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {roll.map((r, i) => (
            <li
              key={`${r.citizenNumber}-${i}`}
              className={`flex items-center justify-between rounded px-2 py-1.5 ${
                i === 0 ? 'bg-amber-500/10 ring-1 ring-amber-300/30' : ''
              }`}
            >
              <span className="flex items-center gap-3">
                <span className={`font-ibm-mono text-sm font-bold tracking-wider tabular-nums ${i === 0 ? 'text-amber-300' : 'text-[#D4E8E5]'}`}>
                  {i === 0 ? '◆' : `${i + 1}`}
                </span>
                <span className="font-ibm-mono text-sm text-[#D4E8E5] tracking-wider">
                  {r.citizenNumber}
                </span>
              </span>
              <span className="font-ibm-mono text-[11px] text-[#82B0B5] tracking-wider tabular-nums">
                P.I. {r.piTotal}
              </span>
              {i === 0 && (
                <span className="font-ibm-mono text-[9px] text-amber-300 tracking-wider uppercase">
                  ◆ Model
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="font-ibm-mono text-[9px] text-[#5BB88C]/60 tracking-wider italic mt-3 text-center">
        "Citizens shall emulate the demonstrated compliance of those above."
      </p>
    </section>
  );
}
