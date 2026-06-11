import { useEffect, useState, type ReactNode } from 'react';
import { useSpyStore } from '../../../../stores/spyStore';
import {
  CONTRABAND_WORDS,
  FREY_INTRO,
  getSnoopFiles,
  type ContrabandWord,
  type SnoopFile,
} from '../../../../data/spyFiles';
import type { SnoopOutcome } from '../../../../stores/spyStore';

// ─── Frey's Channel — the heart of [ ].edited ────────────────────
//
// Replaces the old dead-tabs + dictionary. ONE scrolling transmission
// from Frey, dead-internet register (dark slate, IBM mono, rose accents).
// State-aware: it fills in as the shift runs.
//
//   · intro          — Frey's recruitment + standing order
//   · the words they took — the 5 contraband words, tap-to-reveal Mandarin
//                       (story, NOT a glossary tab)
//   · leads          — one row per Records Wing file:
//                        funnelled → the intel you sent
//                        dark      → "lost contact" (you failed PEARL)
//                        unopened  → Frey's hint (go find it)
//   · your last drop — echo of the drop-box dead-drop, if submitted
//
// Reused by both the full [ ].edited app and the mid-shift funnel drawer.

export default function FreyChannel() {
  const loaded = useSpyStore((s) => s.loaded);
  const loadChoices = useSpyStore((s) => s.loadChoices);
  const resolved = useSpyStore((s) => s.resolved);
  const restoredCiphers = useSpyStore((s) => s.restoredCiphers);
  const dropBoxText = useSpyStore((s) => s.dropBoxText);

  useEffect(() => {
    if (!loaded) void loadChoices();
  }, [loaded, loadChoices]);

  const files = getSnoopFiles(4);
  const anyFunnelled = files.some((f) => resolved[f.id] === 'funneled');
  const restoredList = Object.values(restoredCiphers).filter((r) => r.intel);

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <p className="text-rose-400 mb-1">&gt; [ ].edited</p>
        <p className="text-slate-500 text-xs">&gt; unsigned. unfiled. uncurated.</p>
        <hr className="mt-4 border-slate-800" />
      </div>

      {/* Frey's intro / standing order */}
      <div className="mb-9 space-y-1 text-slate-300 leading-relaxed">
        {FREY_INTRO.map((line, i) =>
          line === '' ? (
            <div key={i} className="h-3" />
          ) : (
            <p key={i}>
              <span className="text-rose-400/60">&gt;</span> {line}
            </p>
          ),
        )}
      </div>

      {/* The words they took */}
      <SectionLabel>the words they took</SectionLabel>
      <div className="mb-9">
        {CONTRABAND_WORDS.map((w) => (
          <ContrabandEntry key={w.word} word={w} />
        ))}
      </div>

      {/* Restored records — uploaded from the Cipher Decryption task */}
      {restoredList.length > 0 && (
        <>
          <SectionLabel>the files you restored</SectionLabel>
          <div className="space-y-4 mb-9">
            {restoredList.map((r, i) => (
              <div key={i}>
                <p className="text-rose-400 text-[11px] tracking-wider uppercase mb-1">
                  ▸ restored
                </p>
                <p className="text-slate-200 leading-relaxed">{r.intel}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Leads — state-aware per Records Wing file */}
      <SectionLabel>leads</SectionLabel>
      {!anyFunnelled && (
        <p className="text-slate-500 text-xs mb-4 lowercase">
          &gt; nothing sent yet. open the records wing. read what they hide.
        </p>
      )}
      <div className="space-y-4 mb-9">
        {files.map((f) => (
          <LeadRow key={f.id} file={f} outcome={resolved[f.id]} />
        ))}
      </div>

      {/* Drop-box echo */}
      {dropBoxText && (
        <>
          <SectionLabel>your last drop</SectionLabel>
          <p className="text-slate-300 italic leading-relaxed mb-9">
            “{dropBoxText}”
          </p>
        </>
      )}

      <p className="text-rose-400/70 text-xs mt-2">— F</p>
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-slate-500 text-[10px] tracking-[0.3em] uppercase mb-4">
      {children}
    </p>
  );
}

function ContrabandEntry({ word }: { word: ContrabandWord }) {
  const [showMandarin, setShowMandarin] = useState(false);
  return (
    <div className="mb-6">
      <p className="text-rose-400 mb-0.5">[ {word.word} ]</p>
      <p className="text-slate-500 text-xs mb-2">{word.ipa}</p>
      <p className="text-slate-200 leading-relaxed mb-1">{word.definition}</p>
      <p className="text-slate-400 text-[13px] italic leading-relaxed mb-2">
        {word.freyLine}
      </p>
      {showMandarin ? (
        <p className="text-slate-300">
          <span className="text-rose-400/60">&gt;</span> 中文:{' '}
          <span className="text-slate-100">{word.mandarin}</span>
        </p>
      ) : (
        <button
          onClick={() => setShowMandarin(true)}
          className="text-slate-500 hover:text-slate-300 transition-colors lowercase active:scale-95"
        >
          &gt; show 中文
        </button>
      )}
    </div>
  );
}

function LeadRow({
  file,
  outcome,
}: {
  file: SnoopFile;
  outcome: SnoopOutcome | undefined;
}) {
  if (outcome === 'funneled') {
    return (
      <div>
        <p className="text-rose-400 text-[11px] tracking-wider uppercase mb-1">
          ▸ sent
        </p>
        <p className="text-slate-200 leading-relaxed">{file.intel}</p>
      </div>
    );
  }
  if (outcome === 'dark') {
    return (
      <div>
        <p className="text-slate-600 text-[11px] tracking-wider uppercase mb-1">
          ✗ lost
        </p>
        <p className="text-slate-500 italic leading-relaxed">
          lost contact on that one. it’s alright. lines reopen — check the records wing again. — F
        </p>
      </div>
    );
  }
  // Unopened — Frey's nudge toward the Records Wing.
  return (
    <div>
      <p className="text-slate-500 text-[11px] tracking-wider uppercase mb-1">
        ○ lead
      </p>
      <p className="text-slate-300 leading-relaxed">{file.freyHint}</p>
    </div>
  );
}
