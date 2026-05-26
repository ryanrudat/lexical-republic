import { useEffect } from 'react';
import { useSpyStore } from '../../../stores/spyStore';
import { getSnoopFiles, type Exposure, type SnoopFile } from '../../../data/spyFiles';

// ─── Records Room — the Party records terminal (snoop surface) ───
//
// A Party facility, so it wears the institutional CRT look (dark teal on
// the cyan monitor), deliberately UNLIKE the dark-slate [ ].edited
// resistance channel. Authorized case work lives in Current Shift; this
// surface holds the RESTRICTED files the student may CHOOSE to open.
//
// Opening a restricted file is a gamble: spyStore.attemptOpen rolls the
// dice by exposure. If PEARL notices, the app-root PearlInquiryOverlay
// takes over (cover-story interrogation); otherwise the file opens and the
// student can funnel its intel to Frey. Resolved files are locked.

const EXPOSURE: Record<Exposure, { label: string; pill: string }> = {
  low: { label: 'LOW EXPOSURE', pill: 'text-emerald-700 bg-emerald-100 border-emerald-300' },
  medium: { label: 'MODERATE EXPOSURE', pill: 'text-amber-700 bg-amber-100 border-amber-300' },
  high: { label: 'HIGH EXPOSURE', pill: 'text-rose-700 bg-rose-100 border-rose-300' },
};

export default function RecordsRoomApp() {
  const loaded = useSpyStore((s) => s.loaded);
  const loadChoices = useSpyStore((s) => s.loadChoices);

  useEffect(() => {
    if (!loaded) void loadChoices();
  }, [loaded, loadChoices]);

  const files = getSnoopFiles(4);

  return (
    <div className="px-6 py-7 font-ibm-mono text-[#1A3035] min-h-full">
      {/* Header */}
      <div className="mb-6">
        <p className="text-[10px] text-[#3A5A5E] tracking-[0.4em] uppercase mb-1">
          Department of Clarity
        </p>
        <h2 className="text-xl text-[#1A3035] tracking-[0.12em] uppercase">
          Records Wing — Archive Terminal
        </h2>
        <div className="mt-3 h-px bg-[#2A4A4E]/25" />
      </div>

      {/* Authorized note — keeps the room from duplicating the shift's doc review */}
      <div className="mb-7 rounded-xl border border-[#2A4A4E]/20 bg-white/35 px-4 py-3">
        <p className="text-[11px] text-[#2A4A4E] leading-relaxed">
          <span className="text-[#3A5A5E]">&gt;</span> Your authorized case work is filed in{' '}
          <span className="text-[#1A3035] font-semibold">Current Shift</span>. The files below are
          held under <span className="text-rose-700 font-semibold">Archive Control</span>.
        </p>
      </div>

      {/* Restricted shelf */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] text-rose-700 tracking-[0.3em] uppercase font-semibold">
          ▰ Restricted
        </span>
        <span className="text-[10px] text-[#8B9B9E] tracking-wider">
          access logged · authorization required
        </span>
      </div>

      <div className="space-y-3">
        {files.map((file) => (
          <RecordsFile key={file.id} file={file} />
        ))}
      </div>

      <p className="mt-8 text-[10px] text-[#8B9B9E] tracking-wider text-center">
        Archive Control monitors all access. A clean record protects everyone.
      </p>
    </div>
  );
}

function RecordsFile({ file }: { file: SnoopFile }) {
  const resolved = useSpyStore((s) => s.resolved[file.id]);
  const cleared = useSpyStore((s) => Boolean(s.cleared[file.id]));
  const interrogatingThis = useSpyStore(
    (s) => s.activeInterrogation?.id === file.id,
  );
  const attemptOpen = useSpyStore((s) => s.attemptOpen);
  const funnel = useSpyStore((s) => s.funnel);
  const openDrawer = useSpyStore((s) => s.openDrawer);

  const exposure = EXPOSURE[file.exposure];
  const isOpen = cleared || resolved === 'funneled';

  const handleFunnel = async () => {
    await funnel(file);
    // Open the [ ].edited channel so the student sees the intel land with Frey.
    openDrawer();
  };

  return (
    <div className="rounded-xl border border-[#2A4A4E]/25 bg-white/45 overflow-hidden">
      {/* File header row */}
      <div className="flex items-start justify-between gap-3 px-4 pt-3.5 pb-3 border-b border-[#2A4A4E]/15">
        <div className="min-w-0">
          <p className="text-[9px] text-rose-700 tracking-[0.25em] uppercase mb-1">
            {file.classification}
          </p>
          <p className="text-[13px] text-[#1A3035] leading-snug">{file.title}</p>
        </div>
        {/* Status / exposure badge */}
        {resolved === 'funneled' ? (
          <span className="shrink-0 text-[9px] text-emerald-700 bg-emerald-100 border border-emerald-300 rounded-full px-2 py-0.5 tracking-wider uppercase">
            ✓ funnelled
          </span>
        ) : resolved === 'dark' ? (
          <span className="shrink-0 text-[9px] text-[#8B9B9E] bg-slate-200/60 border border-slate-300 rounded-full px-2 py-0.5 tracking-wider uppercase">
            ✗ withdrawn
          </span>
        ) : (
          <span
            className={`shrink-0 text-[9px] rounded-full px-2 py-0.5 tracking-wider uppercase border ${exposure.pill}`}
          >
            {exposure.label}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="px-4 py-3.5">
        {resolved === 'dark' ? (
          <p className="text-[12px] text-[#8B9B9E] italic leading-relaxed">
            &gt; Archive Control withdrew this file. The lead is lost.
          </p>
        ) : isOpen ? (
          <>
            <div className="space-y-0.5 text-[12px] text-[#2A4A4E] leading-relaxed">
              {file.body.map((line, i) =>
                line === '' ? (
                  <div key={i} className="h-2" />
                ) : (
                  <p key={i}>{line}</p>
                ),
              )}
            </div>
            {resolved === 'funneled' ? (
              <p className="mt-3 text-[11px] text-emerald-700 tracking-wider">
                &gt; funnelled to [ ]. Frey has it.
              </p>
            ) : (
              <button
                onClick={handleFunnel}
                className="mt-4 inline-flex items-center gap-2 rounded-lg border border-rose-300 bg-rose-50 px-3.5 py-2 text-[11px] text-rose-700 tracking-wider uppercase hover:bg-rose-100 active:scale-[0.98] transition-all"
              >
                ▸ funnel to [ ]
              </button>
            )}
          </>
        ) : (
          <>
            <p className="text-[11px] text-[#5A7A7E] leading-relaxed mb-3">
              &gt; Opening this file may draw attention.
            </p>
            <button
              onClick={() => attemptOpen(file)}
              disabled={interrogatingThis}
              className="inline-flex items-center gap-2 rounded-lg border border-[#2A4A4E]/35 bg-white/60 px-3.5 py-2 text-[11px] text-[#1A3035] tracking-wider uppercase hover:border-rose-400 hover:text-rose-700 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {interrogatingThis ? '■ access queried…' : '⊟ open file'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
