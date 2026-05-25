// ─── Cipher Tab — stub when accessed from the desktop ─────────────
//
// The cipher itself (W4 Task 3) renders inside the shift queue using
// CipherActivity (which wraps the same task chrome you see here). If
// a student opens the [ ].edited app from the desktop OUTSIDE the
// queue, they land here — a stub message telling them the cipher
// reaches them during their shift, not in this tab.

export default function CipherTab() {
  return (
    <div>
      <p className="text-slate-500 text-xs mb-6 lowercase">
        &gt; the unedited's restoration.
      </p>

      <div className="space-y-2 text-slate-300 leading-relaxed">
        <p>
          <span className="text-rose-400/60">&gt;</span> the cipher arrives
          during your shift.
        </p>
        <p>
          <span className="text-rose-400/60">&gt;</span> they have removed
          words. you will put them back.
        </p>
      </div>

      <p className="text-rose-400/70 text-xs mt-10">— F</p>
    </div>
  );
}
