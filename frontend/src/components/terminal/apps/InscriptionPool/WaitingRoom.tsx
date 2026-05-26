import { useEffect, useState } from 'react';
import { useInscriptionStore } from '../../../../stores/inscriptionStore';

// ─── WaitingRoom ─────────────────────────────────────────────────
//
// Live Open Pool matchmaking screen. Shows who is queued and a
// "finding inscribers" state until the server forms a pool — which
// happens when the queue is full or the wait window elapses (after
// which empty slots are filled with ghost stand-ins). Phosphor-green
// CRT register, matching the lobby + drill.

export default function WaitingRoom() {
  const queueInfo = useInscriptionStore((s) => s.queueInfo);
  const leaveQueue = useInscriptionStore((s) => s.leaveQueue);

  // Animated ellipsis for the "searching" feel.
  const [dots, setDots] = useState('');
  useEffect(() => {
    const id = setInterval(() => setDots((d) => (d.length >= 3 ? '' : `${d}.`)), 400);
    return () => clearInterval(id);
  }, []);

  // Tick the auto-start countdown (server sends the shared deadline).
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  const count = queueInfo?.count ?? 1;
  const max = queueInfo?.max ?? 5;
  const designations = queueInfo?.designations ?? [];
  const formsAt = queueInfo?.formsAt_ms ?? null;
  const secsLeft = formsAt != null ? Math.max(0, Math.ceil((formsAt - now) / 1000)) : null;

  return (
    <div className="crt-phosphor-monitor h-full min-h-full flex flex-col overflow-y-auto ios-scroll">
      <div className="max-w-xl mx-auto px-6 py-5 pixel-mono flex-1 w-full flex flex-col">
        <div className="flex items-baseline justify-between mb-1">
          <p className="phosphor-text-bright text-[11px] uppercase tracking-[0.3em] phosphor-glow">
            ▸ Open Pool
          </p>
          <p className="phosphor-text-dim text-[10px] uppercase tracking-[0.3em]">
            ministry · lexical division
          </p>
        </div>

        <div className="border-t border-dashed border-[#1F8540] my-5" />

        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <p className="phosphor-text-bright text-base uppercase tracking-[0.3em] phosphor-glow mb-2">
            finding inscribers{dots}
          </p>
          <p className="phosphor-text text-4xl tabular-nums phosphor-glow mb-4">
            {count} / {max}
          </p>
          {secsLeft != null && (
            <p className="phosphor-text-bright text-base uppercase tracking-[0.3em] phosphor-glow mb-2 tabular-nums">
              starts in {secsLeft}s
            </p>
          )}
          <p className="phosphor-text-dim text-[11px] uppercase tracking-[0.25em] mb-7 max-w-xs leading-relaxed">
            the pool starts when full — or when the timer hits zero, with ministry stand-ins.
          </p>

          {/* Roster of queued citizens */}
          <div className="w-full max-w-xs space-y-1 mb-8">
            {designations.length > 0 ? (
              designations.map((d, i) => (
                <div key={`${d}-${i}`} className="flex items-center gap-2 justify-center text-[12px]">
                  <span className="phosphor-text">▸</span>
                  <span className="phosphor-text-bright tracking-wider">{d}</span>
                </div>
              ))
            ) : (
              <p className="phosphor-text-faint text-[11px] tracking-wider">awaiting roster…</p>
            )}
          </div>

          <button
            type="button"
            onClick={() => leaveQueue()}
            className="phosphor-text-dim hover:phosphor-text text-[11px] uppercase tracking-[0.3em] border border-[#1F8540] hover:border-[#33CC66] px-4 py-2 transition-colors"
          >
            [ cancel ]
          </button>
        </div>
      </div>
    </div>
  );
}
