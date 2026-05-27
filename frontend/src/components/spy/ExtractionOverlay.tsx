import { useEffect, useState } from 'react';
import { useSpyStore } from '../../stores/spyStore';
import DoublespeakDecoder from './DoublespeakDecoder';
import ComprehensionActivity from './ComprehensionActivity';
import ListeningActivity from './ListeningActivity';
import SpotEditActivity from './SpotEditActivity';
import type { SnoopFile } from '../../data/spyFiles';

// ─── Extraction Overlay ──────────────────────────────────────────
//
// App-root overlay for the exfiltration step (runs AFTER any PEARL
// interrogation). Dark-slate resistance surface, deliberately unlike the
// Party's cyan Records Wing underneath. Two phases, same panel:
//   · activeActivity → the file's language task (the decoder, for now)
//   · downloadingFile → the transfer animation, then opens [ ].edited
//
// Distinct from PearlInquiryOverlay (the catch) — this is YOU doing the
// resistance work, so it wears the [ ].edited look.

export default function ExtractionOverlay() {
  const activeActivity = useSpyStore((s) => s.activeActivity);
  const downloadingFile = useSpyStore((s) => s.downloadingFile);
  const open = Boolean(activeActivity || downloadingFile);

  // Suppress the ambient PEARL Dynamic Island while the overlay is up.
  useEffect(() => {
    if (!open) return;
    document.body.classList.add('extraction-active');
    return () => document.body.classList.remove('extraction-active');
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1000] bg-slate-950/90 backdrop-blur-sm flex items-center justify-center px-4 py-8 overflow-y-auto pointer-events-auto">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 px-6 py-6 shadow-2xl">
        <div className="mb-5">
          <p className="text-rose-400 text-xs">&gt; [ ].edited</p>
          <p className="text-slate-600 text-[10px] tracking-wider lowercase">
            &gt; extraction in progress
          </p>
          <hr className="mt-3 border-slate-800" />
        </div>

        {activeActivity ? (
          <ActivityRouter key={activeActivity.id} file={activeActivity} />
        ) : downloadingFile ? (
          <Transfer key={downloadingFile.id} file={downloadingFile} />
        ) : null}
      </div>
    </div>
  );
}

function ActivityRouter({ file }: { file: SnoopFile }) {
  const completeActivity = useSpyStore((s) => s.completeActivity);
  const activity = file.activity;
  const done = () => completeActivity(file);

  if (activity?.type === 'decoder')
    return <DoublespeakDecoder activity={activity} onComplete={done} />;
  if (activity?.type === 'comprehension')
    return <ComprehensionActivity activity={activity} onComplete={done} />;
  if (activity?.type === 'listening')
    return <ListeningActivity activity={activity} onComplete={done} />;
  if (activity?.type === 'spot_edit')
    return <SpotEditActivity activity={activity} onComplete={done} />;

  // Defensive: a file reached the activity step with no known activity.
  // (proceedAfterClearance only routes files that HAVE an activity — but
  // never trap the student if it somehow does.)
  return (
    <div className="font-ibm-mono text-sm text-slate-300">
      <p className="mb-4 leading-relaxed">&gt; the file is ready to send.</p>
      <button
        onClick={() => completeActivity(file)}
        className="rounded-lg border border-rose-400 bg-rose-500/10 px-4 py-2.5 text-rose-300 tracking-wider uppercase text-xs hover:bg-rose-500/20 active:scale-[0.98] transition-all"
      >
        ▸ send to [ ]
      </button>
    </div>
  );
}

function Transfer({ file }: { file: SnoopFile }) {
  const completeDownload = useSpyStore((s) => s.completeDownload);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let p = 0;
    const id = setInterval(() => {
      p += 7;
      if (p >= 100) {
        clearInterval(id);
        setProgress(100);
        void completeDownload(file);
      } else {
        setProgress(p);
      }
    }, 110);
    return () => clearInterval(id);
  }, [file, completeDownload]);

  return (
    <div className="font-ibm-mono text-sm text-slate-200 py-2">
      <p className="text-rose-400 text-xs tracking-wider uppercase mb-3">
        ⬇ extracting → [ ].edited
      </p>
      <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
        <div
          className="h-full bg-rose-500 transition-[width] duration-100 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="mt-2 text-[11px] text-slate-500 tracking-wider tabular-nums">
        copying to [ ].edited — {progress}%
      </p>
    </div>
  );
}
