import { useEffect, useState, type ReactNode } from 'react';
import { useSpyStore } from '../../../stores/spyStore';
import { getSnoopFiles, type Exposure, type SnoopFile } from '../../../data/spyFiles';

// ─── Records Room — the Party records terminal (snoop surface) ───
//
// A Party facility, so it wears the institutional CRT look (dark teal on
// the cyan monitor), deliberately UNLIKE the dark-slate [ ].edited
// resistance channel. Authorized case work lives in Current Shift; this
// surface holds the RESTRICTED files the student may CHOOSE to read.
//
// Reading a file is FREE. EXTRACTING it (copying into [ ].edited) is the
// crime PEARL watches for — spyStore.startExtract rolls the dice by
// exposure. If caught, PearlInquiryOverlay takes over (cover-story); then
// the file's activity + the transfer run in ExtractionOverlay. Resolved
// files lock.

const RISK: Record<Exposure, { label: string; pill: string }> = {
  low: { label: 'EXTRACT RISK · LOW', pill: 'text-emerald-700 bg-emerald-100 border-emerald-300' },
  medium: { label: 'EXTRACT RISK · MODERATE', pill: 'text-amber-700 bg-amber-100 border-amber-300' },
  high: { label: 'EXTRACT RISK · HIGH', pill: 'text-rose-700 bg-rose-100 border-rose-300' },
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
          Records — Archive Terminal
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
          reading is logged · extraction is watched
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
  const interrogatingThis = useSpyStore((s) => s.activeInterrogation?.id === file.id);
  const startExtract = useSpyStore((s) => s.startExtract);

  const [open, setOpen] = useState(false);

  const isFunneled = resolved === 'funneled';
  const isDark = resolved === 'dark';
  const risk = RISK[file.exposure];

  return (
    <div className="rounded-xl border border-[#2A4A4E]/25 bg-white/45 overflow-hidden">
      {/* Header row: TYPE tag + title + status/risk badge */}
      <div className="flex items-start justify-between gap-3 px-4 pt-3.5 pb-3 border-b border-[#2A4A4E]/15">
        <div className="min-w-0">
          <p className="text-[9px] text-rose-700 tracking-[0.25em] uppercase mb-1">
            ▰ {file.kind}
          </p>
          <p className="text-[13px] text-[#1A3035] leading-snug">{file.title}</p>
        </div>
        {isFunneled ? (
          <Badge className="text-emerald-700 bg-emerald-100 border-emerald-300">✓ secured</Badge>
        ) : isDark ? (
          <Badge className="text-[#8B9B9E] bg-slate-200/60 border-slate-300">✗ blocked</Badge>
        ) : (
          <Badge className={risk.pill}>{risk.label}</Badge>
        )}
      </div>

      {/* Body */}
      <div className="px-4 py-3.5">
        {isDark ? (
          <p className="text-[12px] text-[#8B9B9E] italic leading-relaxed">
            &gt; Archive Control blocked the extraction. The lead is lost.
          </p>
        ) : isFunneled ? (
          <>
            <FileContent file={file} />
            <p className="mt-3 text-[11px] text-emerald-700 tracking-wider">
              &gt; secured in [ ]. Frey has it.
            </p>
          </>
        ) : open ? (
          <>
            <FileContent file={file} />
            <p className="mt-4 mb-2 text-[10px] text-[#8B7A5A] tracking-wider">
              &gt; copying a file is what they watch for.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => startExtract(file)}
                disabled={interrogatingThis}
                className="inline-flex items-center gap-2 rounded-lg border border-rose-300 bg-rose-50 px-3.5 py-2 text-[11px] text-rose-700 tracking-wider uppercase hover:bg-rose-100 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {interrogatingThis ? '■ access queried…' : '⬇ extract to [ ]'}
              </button>
              <button
                onClick={() => setOpen(false)}
                className="text-[10px] text-[#8B9B9E] tracking-wider uppercase hover:text-[#2A4A4E] transition-colors"
              >
                close
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-[11px] text-[#5A7A7E] leading-relaxed mb-3">
              &gt; Reading is permitted. Extraction draws attention.
            </p>
            <button
              onClick={() => setOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-[#2A4A4E]/35 bg-white/60 px-3.5 py-2 text-[11px] text-[#1A3035] tracking-wider uppercase hover:border-[#2A4A4E]/60 active:scale-[0.98] transition-all"
            >
              ⊟ view file
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function Badge({ className, children }: { className: string; children: ReactNode }) {
  return (
    <span
      className={`shrink-0 text-[9px] rounded-full px-2 py-0.5 tracking-wider uppercase border ${className}`}
    >
      {children}
    </span>
  );
}

// Renders the file body per type: a before/after pair for revision records,
// otherwise plain document lines (item / transcript / memo).
function FileContent({ file }: { file: SnoopFile }) {
  if (file.fileType === 'revision' && file.revision) {
    return (
      <div className="space-y-3">
        {file.body.map((line, i) => (
          <p key={i} className="text-[12px] text-[#2A4A4E] leading-relaxed">{line}</p>
        ))}
        <RevisionPanel label="ORIGINAL · recovered" tone="truth" lines={file.revision.before} />
        <RevisionPanel label="REVISED · official" tone="lie" lines={file.revision.after} />
      </div>
    );
  }
  return (
    <div className="space-y-0.5 text-[12px] text-[#2A4A4E] leading-relaxed">
      {file.body.map((line, i) =>
        line === '' ? <div key={i} className="h-2" /> : <p key={i}>{line}</p>,
      )}
    </div>
  );
}

function RevisionPanel({
  label,
  tone,
  lines,
}: {
  label: string;
  tone: 'truth' | 'lie';
  lines: string[];
}) {
  const truth = tone === 'truth';
  return (
    <div
      className={`rounded-lg border px-3 py-2.5 ${
        truth
          ? 'border-emerald-300 bg-emerald-50/60'
          : 'border-[#2A4A4E]/25 bg-slate-200/40'
      }`}
    >
      <p
        className={`text-[9px] tracking-[0.2em] uppercase mb-1.5 ${
          truth ? 'text-emerald-700' : 'text-[#8B9B9E]'
        }`}
      >
        {label}
      </p>
      <div className="space-y-0.5 text-[12px] text-[#2A4A4E] leading-relaxed">
        {lines.map((line, i) => (
          <p key={i}>{line}</p>
        ))}
      </div>
    </div>
  );
}
