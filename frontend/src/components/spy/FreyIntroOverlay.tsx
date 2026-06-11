import { useEffect } from 'react';
import { useViewStore } from '../../stores/viewStore';
import { useSeasonStore } from '../../stores/seasonStore';
import { useSpyStore } from '../../stores/spyStore';
import { getHighestUnlockedWeek } from '../../utils/weekUnlock';
import { FREY_FIRST_CONTACT } from '../../data/spyFiles';

// ─── Frey's first contact — one-time [ ].edited orientation ──────
//
// The first time a student reaches the terminal desktop with W4 unlocked,
// Frey explains the two spy surfaces nobody else will: the Records Wing
// tile and the corner [ ] launcher. Desktop-only — it never interrupts a
// shift, so it cannot collide with Compliance/Clarity lockouts (those only
// exist inside the Current Shift app). Dismissal persists as the
// `w4_funnel_intro` NarrativeChoice (one-shot per pair); the write is
// fail-open like every spy write — worst case the note replays next login.

export default function FreyIntroOverlay() {
  const currentView = useViewStore((s) => s.currentView);
  const terminalApp = useViewStore((s) => s.terminalApp);
  const weeks = useSeasonStore((s) => s.weeks);
  const loaded = useSpyStore((s) => s.loaded);
  const loadChoices = useSpyStore((s) => s.loadChoices);
  const introSeen = useSpyStore((s) => s.introSeen);
  const markIntroSeen = useSpyStore((s) => s.markIntroSeen);

  const eligible =
    currentView === 'terminal' &&
    terminalApp === 'desktop' &&
    getHighestUnlockedWeek(weeks) >= 4;

  // Hydrate persisted choices the first time the overlay could matter —
  // FunnelDrawer never loads them and FreyChannel only does once opened.
  useEffect(() => {
    if (eligible && !loaded) void loadChoices();
  }, [eligible, loaded, loadChoices]);

  const visible = eligible && loaded && !introSeen;

  // Suppress the ambient PEARL island while Frey's note is up — the Party
  // chirping over the covert channel breaks the register (same pattern as
  // the other body-class overlay rules in index.css).
  useEffect(() => {
    if (!visible) return;
    document.body.classList.add('frey-intro-active');
    return () => document.body.classList.remove('frey-intro-active');
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[95] bg-black/70 flex items-center justify-center px-4 py-8 overflow-y-auto">
      <div className="edited-window relative overflow-hidden w-full max-w-md border border-dashed border-slate-700 bg-slate-950 text-slate-300 font-ibm-mono text-sm shadow-2xl shadow-black/60 p-6 leading-relaxed">
        <p className="text-rose-400 mb-1">&gt; [ ].edited</p>
        <p className="text-slate-500 text-xs mb-5">&gt; unsigned. unfiled. uncurated.</p>
        <div className="space-y-1">
          {FREY_FIRST_CONTACT.map((line, i) =>
            line === '' ? (
              <div key={i} className="h-3" />
            ) : (
              <p key={i}>
                <span className="text-rose-400/60">&gt;</span> <FreyLine text={line} />
              </p>
            ),
          )}
        </div>
        <button
          onClick={() => void markIntroSeen()}
          className="mt-6 w-full border border-dashed border-slate-700 hover:border-rose-500 active:scale-[0.98] rounded px-3 py-2 text-rose-400/90 tracking-[0.2em] transition-all"
        >
          [ understood. delete this. ]
        </button>
      </div>
    </div>
  );
}

// Highlights the literal "[ ]" glyph inside a line so the thing Frey is
// pointing at reads at a glance.
function FreyLine({ text }: { text: string }) {
  const parts = text.split('[ ]');
  if (parts.length === 1) return <>{text}</>;
  return (
    <>
      {parts.map((p, i) => (
        <span key={i}>
          {i > 0 && <span className="text-rose-400 font-semibold">[ ]</span>}
          {p}
        </span>
      ))}
    </>
  );
}
