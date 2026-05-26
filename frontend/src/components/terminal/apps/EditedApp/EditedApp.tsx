import FreyChannel from './FreyChannel';

// ─── [ ].edited App ──────────────────────────────────────────────
//
// The Unedited's smuggled surface. Lives on the terminal desktop as a
// glitched tile that appears at Week 4. It is Frey's covert channel — a
// single scrolling transmission (see FreyChannel): recruitment, the
// contraband words, your funnelled leads, your dead-drop echo.
//
// NOT a dictionary, NOT tabs (the old dead-stub design is gone). The cipher
// and drop box still arrive INSIDE the shift queue; this surface is where
// the resistance work accumulates and where the student returns between
// sessions. The same channel renders inside the mid-shift funnel drawer.
//
// Dead-internet register: plain IBM mono on dark slate, rose accents, no
// card chrome — deliberately unlike the Party's other apps.

export default function EditedApp() {
  return (
    <div className="flex-1 overflow-y-auto bg-slate-950 text-slate-200 font-ibm-mono text-sm">
      <FreyChannel />
    </div>
  );
}
