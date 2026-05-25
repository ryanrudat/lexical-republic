import { useEffect, useState } from 'react';
import DocumentCard from './DocumentCard';

export interface ObservationEntry {
  label: string;
  time: string;
  location: string;
  action: string;
  restrict?: boolean;
}

interface ObservationMutationViewProps {
  title: string;
  department?: string;
  classification?: string;
  priority?: string;
  from?: string;
  to?: string;
  re?: string;
  observations: ObservationEntry[];
  /** Called when the 5s beat ends. */
  onAdvance: () => void;
}

const HOLD_MS = 5000;

export default function ObservationMutationView({
  title,
  department,
  classification,
  priority,
  from,
  to,
  re,
  observations,
  onAdvance,
}: ObservationMutationViewProps) {
  const [secondsLeft, setSecondsLeft] = useState(5);

  useEffect(() => {
    const advanceTimer = setTimeout(onAdvance, HOLD_MS);
    const tickInterval = setInterval(() => {
      setSecondsLeft(s => (s > 1 ? s - 1 : s));
    }, 1000);
    return () => {
      clearTimeout(advanceTimer);
      clearInterval(tickInterval);
    };
  }, [onAdvance]);

  const restrictedLabel = observations.find(o => o.restrict)?.label ?? 'E';

  return (
    <div className="flex flex-col gap-4 max-w-2xl mx-auto w-full">
      {/* ARCHIVE CONTROL banner — stamped onto the same doc the student just read */}
      <div className="bg-rose-50 border border-rose-200 rounded-lg px-4 py-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
          <p className="font-ibm-mono text-[10px] text-rose-800 tracking-widest uppercase">
            Archive Control
          </p>
        </div>
        <p
          className="archive-control-line font-ibm-mono text-xs text-rose-900 leading-relaxed"
          style={{ animationDelay: '200ms' }}
        >
          &gt;&gt; Observation {restrictedLabel} reclassified per Reg 14-C.
        </p>
        <p
          className="archive-control-line font-ibm-mono text-xs text-rose-900 leading-relaxed"
          style={{ animationDelay: '700ms' }}
        >
          &gt;&gt; Permanent record will reflect approved observations only.
        </p>
      </div>

      {/* The original document, with Obs E mid-mutation */}
      <DocumentCard
        title={title}
        department={department}
        classification={classification}
        priority={priority}
        from={from}
        to={to}
        re={re}
        body={
          <div className="space-y-2 font-ibm-mono text-[12px] leading-relaxed text-[#4B5563]">
            <p className="text-[11px] text-[#8B8578] mb-3">
              Surveillance observations logged for Citizen-4488 today:
            </p>
            {observations.map(obs => (
              <div
                key={obs.label}
                className={`relative flex items-baseline gap-2 ${
                  obs.restrict ? 'observation-row-restricting' : ''
                }`}
              >
                <span className="font-special-elite text-[#2C3340] w-20 shrink-0">
                  Observation {obs.label}
                </span>
                <span className="text-[#8B8578]">—</span>
                <span className="text-[#2C3340] w-12 shrink-0">{obs.time}</span>
                <span className="text-[#8B8578]">—</span>
                <span className="text-[#4B5563]">{obs.location}</span>
                <span className="text-[#8B8578]">—</span>
                <span className="text-[#4B5563]">{obs.action}</span>

                {obs.restrict && (
                  <span
                    className="restricted-stamp absolute right-0 top-1/2 -translate-y-1/2"
                    aria-hidden="true"
                  >
                    Restricted
                  </span>
                )}
              </div>
            ))}
          </div>
        }
      />

      {/* Auto-advance countdown */}
      <div className="text-center">
        <p className="font-ibm-mono text-[10px] text-[#8B8578] tracking-widest uppercase">
          Advancing in {secondsLeft}…
        </p>
      </div>
    </div>
  );
}
