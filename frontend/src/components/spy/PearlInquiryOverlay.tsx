import { useEffect, useMemo, useRef, useState } from 'react';
import { useSpyStore } from '../../stores/spyStore';
import PearlEye from '../pearl/PearlEye';
import type { SnoopFile } from '../../data/spyFiles';

// ─── PEARL Clarity Inquiry ───────────────────────────────────────
//
// App-root overlay (mirrors RemediationOverlay). Fires when the student
// opens an off-limits Records Room file and the dice roll says PEARL
// noticed. The eye NEVER opens or closes — it's always watching — so this
// is PEARL *turning its attention onto you*: a window opens beside the
// ever-watching eye.
//
// The register is Dolores-Umbridge sweet: a pleasant Party "wellness"
// card, never a dark hacker screen. The dread is the smile. The student
// "picks a cover story" — the deferential, Party-pleasing excuse. Pass and
// the lead stays funnel-ready; fail and the file is pulled (Frey goes dark).
//
// Distinct from cyan Clarity/Compliance checks and amber Remediation by the
// big PEARL eye + first-person voice + PEARL's own green accent.

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export default function PearlInquiryOverlay() {
  const file = useSpyStore((s) => s.activeInterrogation);
  if (!file) return null;
  // key on file.id so a fresh inquiry gets fresh state + a fresh shuffle.
  return <PearlInquiryModal key={file.id} file={file} />;
}

function PearlInquiryModal({ file }: { file: SnoopFile }) {
  const resolveInterrogation = useSpyStore((s) => s.resolveInterrogation);

  // null = still choosing; true/false = the correctness of the picked option.
  const [picked, setPicked] = useState<boolean | null>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Shuffle the cover-story options once so the right answer isn't always first.
  // (The modal is keyed on file.id in the parent, so it remounts per file.)
  const options = useMemo(
    () => shuffle(file.interrogation.options),
    [file.interrogation.options],
  );

  // Suppress the ambient PEARL Dynamic Island while the inquiry is open
  // (mirrors body.remediation-active / body.compliance-check-active).
  useEffect(() => {
    document.body.classList.add('pearl-inquiry-active');
    return () => {
      document.body.classList.remove('pearl-inquiry-active');
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, []);

  const pick = (correct: boolean) => {
    if (picked !== null) return;
    setPicked(correct);
    // Let the student read PEARL's reaction, then resolve (unmounts this modal).
    dismissTimerRef.current = setTimeout(() => {
      resolveInterrogation(correct);
    }, 2600);
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center px-4 py-8 overflow-y-auto pointer-events-auto">
      <div className="w-full max-w-md rounded-2xl border border-[#D4CFC6] bg-[#FAFAF7] shadow-2xl overflow-hidden">
        {/* PEARL header — the eye is always watching; it has simply turned to you */}
        <div className="flex items-center gap-3 px-6 pt-6 pb-4 border-b border-[#E8E4DC]">
          <PearlEye onClick={() => {}} panelOpen variant="chrome" size="lg" />
          <div>
            <p className="font-ibm-mono text-[10px] text-[#5BB88C] tracking-[0.25em] uppercase">
              P.E.A.R.L.
            </p>
            <p className="font-ibm-mono text-[10px] text-[#8B8578] tracking-wider uppercase">
              Clarity Inquiry
            </p>
          </div>
        </div>

        <div className="px-6 py-5">
          {/* Which access triggered the inquiry */}
          <p className="font-ibm-mono text-[9px] text-[#B8B3AA] tracking-wider uppercase mb-3">
            Access logged · {file.title}
          </p>

          {picked === null ? (
            <>
              <p className="text-[15px] text-[#2C3340] leading-relaxed mb-5">
                {file.interrogation.pearlPrompt}
              </p>

              <div className="space-y-2.5">
                {options.map((opt) => (
                  <button
                    key={opt.text}
                    onClick={() => pick(opt.correct)}
                    className="block w-full text-left px-4 py-3 rounded-xl border border-[#D4CFC6] bg-white text-sm text-[#4B5563] leading-snug hover:border-[#5BB88C]/50 hover:bg-[#F5F1EB] active:scale-[0.99] transition-all"
                  >
                    “{opt.text}”
                  </button>
                ))}
              </div>

              <p className="font-ibm-mono text-[10px] text-[#B8B3AA] tracking-wider mt-5 text-center">
                Answer carefully, Citizen. ☺
              </p>
            </>
          ) : (
            <div className="py-2">
              <p className="text-[15px] text-[#2C3340] leading-relaxed mb-4">
                {picked
                  ? file.interrogation.passLine
                  : file.interrogation.failLine}
              </p>
              <p
                className={`font-ibm-mono text-[11px] tracking-wider ${
                  picked ? 'text-[#5BB88C]' : 'text-rose-500'
                }`}
              >
                {picked
                  ? '> clearance accepted. extracting…'
                  : '> extraction blocked. the lead is lost.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
