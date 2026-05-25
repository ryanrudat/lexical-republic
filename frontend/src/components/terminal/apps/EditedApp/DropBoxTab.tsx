// ─── Drop Box Tab — Pass 1 stub ──────────────────────────────────
//
// The Drop Box is meant to open AFTER the Shift Report submits, as
// an ungraded free-text observation slot (stored as NarrativeChoice
// `w4_drop_box_first_submission`). Wiring the post-Shift-Report
// trigger is the next integration pass.
//
// For Pass 1 the tab is reachable but locked: a stub message in
// Frey's voice tells the student the box opens later.

export default function DropBoxTab() {
  return (
    <div>
      <p className="text-slate-500 text-xs mb-6 lowercase">
        &gt; tell me what they took.
      </p>

      <div className="space-y-2 text-slate-300 leading-relaxed">
        <p>
          <span className="text-rose-400/60">&gt;</span> the drop box opens
          after your shift report.
        </p>
        <p>
          <span className="text-rose-400/60">&gt;</span> finish the day. write
          your report. then come back.
        </p>
        <p>
          <span className="text-rose-400/60">&gt;</span> i'm reading.
        </p>
      </div>

      <p className="text-slate-600 text-xs mt-8 italic">
        [ closed until shift report submits ]
      </p>

      <p className="text-rose-400/70 text-xs mt-6">— F</p>
    </div>
  );
}
