import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { usePearlStore } from '../../../stores/pearlStore';
import { useShiftQueueStore } from '../../../stores/shiftQueueStore';
import { useStudentStore } from '../../../stores/studentStore';
import { useSpyStore } from '../../../stores/spyStore';
import type { TaskProps } from '../../../types/shiftQueue';
import type { TaskAnswerLogEntry } from '../../../types/taskResult';

// ─── Cipher Activity ────────────────────────────────────────────
//
// W4 Cipher Decryption (`cloze_fill_w4`), rendered inside the `[ ].edited`
// app's dead-internet register (dark slate, IBM mono, rose accents, `[ ]`
// brackets). REDESIGNED 2026-06-03 from a single cloze into a MULTI-DOCUMENT
// "redacted-reveal" sequence:
//
//   · The student works through 3 personal "records" documents (config.documents),
//     escalating 9020 (the person) → the cover-up → 4488 (the watcher watched).
//   · Each blank is a redacted [████] block. Tap it, then pick the restored
//     word from that blank's own `options` (no shared word bank). Same lane-aware
//     attempts + forced-exposure auto-reveal as ClozeFill — never a force-fail loop.
//   · When a document is fully restored, the student taps "upload to [ ].edited":
//     a transfer animation runs, the doc's `intel` line is written to spyStore
//     (NarrativeChoice `w4_cipher_<id>`), and it surfaces in Frey's channel.
//   · After the last document uploads, the task scores (firstTryCorrect / total
//     blanks across all docs) and calls onComplete once.
//
// pearlBarkOnComplete is an Unedited (Frey) bark, not PEARL — routed through
// pearlStore for the shared completion hook but written in Frey's register.

interface CipherBlank {
  index: number;
  correctWord: string;
  /** The redacted word + plausible distractors (one is usually a cold Party word). */
  options: string[];
}

interface CipherDoc {
  id: string;
  /** Records-file header, e.g. "PERSONNEL FILE — CITIZEN-9020". */
  recordTag: string;
  classification?: string;
  /** Frey's lowercase framing lines shown above the document. */
  freyIntro: string[];
  /** Body text with {0},{1}… blank tokens. */
  passage: string;
  blanks: CipherBlank[];
  /** The one-line headline that uploads to Frey's channel. */
  intel: string;
  /** Optional closing beat shown once the doc is restored. */
  restoredLine?: string;
}

type Phase = 'solving' | 'restored' | 'uploading' | 'sent';

const REDACTION = '████';

// Sentence containing the blank, with the token shown as "[ ]" — for the answer log.
function buildBlankPrompt(passage: string, blankIndex: number): string {
  const token = `{${blankIndex}}`;
  const fallback = `Blank ${blankIndex + 1}`;
  const tokenPos = passage.indexOf(token);
  if (tokenPos === -1) return fallback;

  const boundaries = ['. ', '! ', '? '];
  const before = passage.slice(0, tokenPos);
  const after = passage.slice(tokenPos + token.length);
  const sentenceStart = Math.max(...boundaries.map((b) => before.lastIndexOf(b)));
  const afterHits = boundaries.map((b) => after.indexOf(b)).filter((i) => i >= 0);

  const startIdx = sentenceStart >= 0 ? sentenceStart + 2 : 0;
  const endIdx =
    afterHits.length > 0
      ? tokenPos + token.length + Math.min(...afterHits) + 1
      : passage.length;

  const sentence = passage.slice(startIdx, endIdx).replace(token, '[ ]').trim();
  return sentence || fallback;
}

export default function CipherActivity({ config, onComplete }: TaskProps) {
  const documents = (config.documents as CipherDoc[]) || [];
  const closingBark = config.pearlBarkOnComplete as string | undefined;

  const addConcern = useShiftQueueStore((s) => s.addConcern);
  const lane = useStudentStore((s) => s.user?.lane ?? 2);

  // Lane-aware attempts per blank, mirroring ClozeFill: 3 / 2 / 1.
  const maxAttempts = lane === 1 ? 3 : lane === 3 ? 1 : 2;

  const totalBlanks = useMemo(
    () => documents.reduce((n, d) => n + d.blanks.length, 0),
    [documents],
  );

  // ── Document cursor ──
  const [docIndex, setDocIndex] = useState(0);
  const doc = documents[docIndex] as CipherDoc | undefined;

  // ── Per-document working state (reset on advance) ──
  const [phase, setPhase] = useState<Phase>('solving');
  const [placements, setPlacements] = useState<Record<number, string>>({});
  const [locked, setLocked] = useState<Set<number>>(new Set());
  const [attempted, setAttempted] = useState<Set<number>>(new Set());
  const [attemptCounts, setAttemptCounts] = useState<Record<number, number>>({});
  const [firstTryCorrect, setFirstTryCorrect] = useState<Set<number>>(new Set());
  const [activeBlank, setActiveBlank] = useState<number | null>(null);
  const [wrongFlash, setWrongFlash] = useState<number | null>(null);
  const [wrongChip, setWrongChip] = useState<string | null>(null);
  const [uploadPct, setUploadPct] = useState(0);

  const lastWrongPickRef = useRef<Record<number, string>>({});

  // ── Cross-document accumulators ──
  const answerLogRef = useRef<TaskAnswerLogEntry[]>([]);
  const firstCorrectTotalRef = useRef(0);
  const processedDocsRef = useRef<Set<string>>(new Set()); // scored docs (idempotent)
  const uploadedDocsRef = useRef<Set<string>>(new Set()); // uploaded docs (idempotent)
  const hasCompletedRef = useRef(false);
  const timeoutsRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  // Track pending timers so they can be cancelled on unmount (teacher skip /
  // reset) or when advancing documents — a forced-exposure auto-reveal must
  // never fire into a freshly-reset (or unmounted) document.
  const schedule = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      timeoutsRef.current.delete(id);
      fn();
    }, ms);
    timeoutsRef.current.add(id);
  }, []);
  const clearTimers = useCallback(() => {
    timeoutsRef.current.forEach((id) => clearTimeout(id));
    timeoutsRef.current.clear();
  }, []);

  // Per-blank option order, stable within a document.
  const shuffledOptions = useMemo(() => {
    const map: Record<number, string[]> = {};
    if (!doc) return map;
    for (const b of doc.blanks) {
      const a = [...b.options];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      map[b.index] = a;
    }
    return map;
    // Reshuffle only when the document changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docIndex]);

  const segments = useMemo(() => {
    const parts: Array<
      { type: 'text'; text: string } | { type: 'blank'; index: number }
    > = [];
    if (!doc) return parts;
    const regex = /\{(\d+)\}/g;
    let lastEnd = 0;
    let match;
    while ((match = regex.exec(doc.passage)) !== null) {
      if (match.index > lastEnd) {
        parts.push({ type: 'text', text: doc.passage.slice(lastEnd, match.index) });
      }
      parts.push({ type: 'blank', index: parseInt(match[1], 10) });
      lastEnd = regex.lastIndex;
    }
    if (lastEnd < doc.passage.length) {
      parts.push({ type: 'text', text: doc.passage.slice(lastEnd) });
    }
    return parts;
  }, [doc]);

  const tryPlace = useCallback(
    (word: string, blankIndex: number) => {
      if (!doc || locked.has(blankIndex)) return;
      const blank = doc.blanks.find((b) => b.index === blankIndex);
      if (!blank) return;

      if (word === blank.correctWord) {
        setPlacements((prev) => ({ ...prev, [blankIndex]: word }));
        setLocked((prev) => new Set(prev).add(blankIndex));
        if (!attempted.has(blankIndex)) {
          setFirstTryCorrect((prev) => new Set(prev).add(blankIndex));
        }
        setActiveBlank(null);
        setWrongChip(null);
      } else {
        const newCount = (attemptCounts[blankIndex] ?? 0) + 1;
        setAttemptCounts((prev) => ({ ...prev, [blankIndex]: newCount }));
        setAttempted((prev) => new Set(prev).add(blankIndex));
        lastWrongPickRef.current[blankIndex] = word;
        setWrongChip(word);
        schedule(() => setWrongChip(null), 400);

        if (lane !== 1) addConcern(0.05);

        if (newCount >= maxAttempts) {
          // Forced exposure: reveal the word, never trap the student.
          if (lane === 1) addConcern(0.05);
          setWrongFlash(blankIndex);
          schedule(
            () => {
              setWrongFlash(null);
              setPlacements((prev) => ({ ...prev, [blankIndex]: blank.correctWord }));
              setLocked((prev) => new Set(prev).add(blankIndex));
              setActiveBlank(null);
            },
            lane === 1 ? 1500 : 800,
          );
        } else {
          setWrongFlash(blankIndex);
          schedule(() => setWrongFlash(null), 400);
        }
      }
    },
    [doc, locked, attempted, attemptCounts, maxAttempts, lane, addConcern, schedule],
  );

  // ── Document fully restored → commit score, advance to the upload step ──
  useEffect(() => {
    if (!doc || phase !== 'solving') return;
    if (doc.blanks.length === 0 || locked.size !== doc.blanks.length) return;

    if (!processedDocsRef.current.has(doc.id)) {
      processedDocsRef.current.add(doc.id);
      doc.blanks.forEach((blank) => {
        const wasCorrect = firstTryCorrect.has(blank.index);
        const lastWrong = lastWrongPickRef.current[blank.index];
        const chosen = !wasCorrect && lastWrong ? lastWrong : blank.correctWord;
        answerLogRef.current.push({
          questionId: `${doc.id}:${blank.index}`,
          prompt: buildBlankPrompt(doc.passage, blank.index),
          chosen,
          correct: blank.correctWord,
          wasCorrect,
          attempts: (attemptCounts[blank.index] ?? 0) + 1,
        });
      });
      firstCorrectTotalRef.current += firstTryCorrect.size;
    }
    setPhase('restored');
  }, [doc, phase, locked, firstTryCorrect, attemptCounts]);

  // ── Upload transfer animation → write to Frey's channel → 'sent' ──
  useEffect(() => {
    if (!doc || phase !== 'uploading') return;
    let p = 0;
    const id = setInterval(() => {
      p += 7;
      if (p >= 100) {
        clearInterval(id);
        setUploadPct(100);
        if (!uploadedDocsRef.current.has(doc.id)) {
          uploadedDocsRef.current.add(doc.id);
          void useSpyStore.getState().uploadCipherDoc({ id: doc.id, intel: doc.intel });
        }
        setPhase('sent');
      } else {
        setUploadPct(p);
      }
    }, 110);
    return () => clearInterval(id);
  }, [doc, phase]);

  // ── Last document sent → score the task once ──
  useEffect(() => {
    if (phase !== 'sent' || docIndex < documents.length - 1) return;
    if (hasCompletedRef.current) return;
    hasCompletedRef.current = true;

    if (closingBark) usePearlStore.getState().triggerBark('success', closingBark);

    const score = totalBlanks > 0 ? firstCorrectTotalRef.current / totalBlanks : 1;
    const t = setTimeout(() => {
      onComplete(score, {
        taskType: 'cloze_fill',
        itemsCorrect: firstCorrectTotalRef.current,
        itemsTotal: totalBlanks,
        category: 'vocab',
        answerLog: answerLogRef.current,
      });
    }, 1400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, docIndex]);

  // Hydrate restoredCiphers from the server so a re-upload after a refresh is
  // recognised as already-persisted (spyStore.uploadCipherDoc then skips the
  // POST — no duplicate `w4_cipher_*` rows).
  useEffect(() => {
    if (!useSpyStore.getState().loaded) void useSpyStore.getState().loadChoices();
  }, []);

  // Cancel any pending timers when the task unmounts (teacher skip / reset).
  useEffect(() => clearTimers, [clearTimers]);

  // Dev-only: a {n} token with no matching blank def (or vice-versa) would
  // soft-lock the document — surface it loudly during authoring.
  useEffect(() => {
    if (!import.meta.env.DEV || !doc) return;
    const tokenCount = segments.filter((s) => s.type === 'blank').length;
    if (tokenCount !== doc.blanks.length) {
      // eslint-disable-next-line no-console
      console.error(
        `CipherActivity: doc "${doc.id}" has ${tokenCount} blank token(s) but ${doc.blanks.length} blank def(s).`,
      );
    }
  }, [doc, segments]);

  const handleUpload = useCallback(() => {
    if (phase !== 'restored') return; // ignore stray taps once the transfer starts
    setUploadPct(0);
    setPhase('uploading');
  }, [phase]);

  const goNextDoc = useCallback(() => {
    clearTimers(); // drop any pending flash/auto-reveal before resetting
    setDocIndex((i) => i + 1);
    setPhase('solving');
    setPlacements({});
    setLocked(new Set());
    setAttempted(new Set());
    setAttemptCounts({});
    setFirstTryCorrect(new Set());
    setActiveBlank(null);
    setWrongFlash(null);
    setWrongChip(null);
    setUploadPct(0);
    lastWrongPickRef.current = {};
  }, [clearTimers]);

  if (!doc) {
    return (
      <div className="bg-slate-950 text-slate-400 font-ibm-mono text-sm -mx-4 -my-3 px-6 py-8 rounded-xl">
        &gt; no records to restore.
      </div>
    );
  }

  const isLastDoc = docIndex === documents.length - 1;

  return (
    <div className="bg-slate-950 text-slate-200 font-ibm-mono text-sm -mx-4 -my-3 px-6 py-8 rounded-xl">
      {/* App-style header — mirrors the EditedApp shell. */}
      <div className="mb-6">
        <p className="text-rose-400 mb-1">&gt; [ ].edited</p>
        <p className="text-slate-500 text-xs">&gt; unsigned. unfiled. uncurated.</p>
        <hr className="mt-4 border-slate-800" />
      </div>

      {/* Tab row (cipher active) */}
      <div className="mb-6 flex flex-wrap gap-x-5 gap-y-2">
        <span className="text-slate-500 lowercase tracking-wider">[ lexicon ]</span>
        <span className="text-rose-400 lowercase tracking-wider">[ cipher ]</span>
        <span className="text-slate-500 lowercase tracking-wider">[ drop box ]</span>
      </div>

      {/* Progress across documents */}
      <p className="text-slate-500 text-xs mb-6 lowercase tracking-wider">
        &gt; file {docIndex + 1} / {documents.length} &nbsp;·&nbsp; {locked.size} /{' '}
        {doc.blanks.length} restored
      </p>

      {/* Frey's framing for this document */}
      <div className="mb-5 space-y-1 text-slate-400 leading-relaxed">
        {doc.freyIntro.map((line, i) => (
          <p key={i}>
            <span className="text-rose-400/60">&gt;</span> {line}
          </p>
        ))}
      </div>

      {/* Records-file header */}
      <div className="mb-4 border border-slate-800 rounded-lg px-4 py-2">
        <p className="text-slate-300 text-xs tracking-wider uppercase">{doc.recordTag}</p>
        {doc.classification && (
          <p className="text-rose-400/70 text-[10px] tracking-wider lowercase mt-0.5">
            {doc.classification}
          </p>
        )}
      </div>

      {/* The document body with redacted / restored blanks */}
      <div className="mb-7 leading-relaxed text-slate-200">
        {segments.map((seg, i) => {
          if (seg.type === 'text') return <span key={i}>{seg.text}</span>;
          const isLocked = locked.has(seg.index);
          const isWrong = wrongFlash === seg.index;
          const isActive = activeBlank === seg.index;
          const placement = placements[seg.index];
          if (isLocked) {
            return (
              <span key={`blank-${seg.index}`} className="text-rose-300 font-medium">
                [<span className="px-1">{placement}</span>]
              </span>
            );
          }
          return (
            <button
              key={`blank-${seg.index}`}
              type="button"
              onClick={() => phase === 'solving' && setActiveBlank(seg.index)}
              disabled={phase !== 'solving'}
              className={`inline-block mx-0.5 px-1 tracking-widest align-baseline transition-colors ${
                isWrong
                  ? 'text-rose-500 animate-resist-shake'
                  : isActive
                  ? 'text-rose-300 bg-rose-500/10 rounded'
                  : 'text-slate-600 hover:text-rose-300 cursor-pointer'
              }`}
            >
              {REDACTION}
            </button>
          );
        })}
      </div>

      {/* ── Decrypt panel (solving) ── */}
      {phase === 'solving' && (
        <div className="mb-2">
          {activeBlank === null ? (
            <p className="text-slate-500 text-xs lowercase">
              &gt; tap a {REDACTION} block to decrypt it.
            </p>
          ) : (
            <>
              <p className="text-slate-500 text-xs mb-3 lowercase">&gt; decrypt:</p>
              <div className="flex flex-wrap gap-2">
                {(shuffledOptions[activeBlank] ?? []).map((opt) => {
                  const isWrongChip = wrongChip === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => tryPlace(opt, activeBlank)}
                      className={`lowercase tracking-wider px-1 transition-colors active:scale-95 ${
                        isWrongChip
                          ? 'text-rose-600 line-through'
                          : 'text-slate-300 hover:text-rose-300'
                      }`}
                    >
                      [ {opt} ]
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Restored → upload ── */}
      {phase === 'restored' && (
        <div className="mt-2">
          <hr className="border-slate-800 mb-4" />
          <p className="text-slate-300 lowercase mb-1">&gt; record restored.</p>
          {doc.restoredLine && (
            <p className="text-slate-400 italic leading-relaxed mb-4">
              {doc.restoredLine} <span className="text-rose-400/70">— F</span>
            </p>
          )}
          <button
            type="button"
            onClick={handleUpload}
            className="rounded-lg border border-rose-400 bg-rose-500/10 px-4 py-2.5 text-rose-300 tracking-wider lowercase text-xs hover:bg-rose-500/20 active:scale-[0.98] transition-all"
          >
            ▸ upload to [ ].edited
          </button>
        </div>
      )}

      {/* ── Uploading transfer ── */}
      {phase === 'uploading' && (
        <div className="mt-2 py-1">
          <p className="text-rose-400 text-xs tracking-wider lowercase mb-3">
            ⬇ copying to [ ].edited
          </p>
          <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-rose-500 transition-[width] duration-100 ease-linear"
              style={{ width: `${uploadPct}%` }}
            />
          </div>
          <p className="mt-2 text-[11px] text-slate-500 tracking-wider tabular-nums lowercase">
            copying to [ ].edited — {uploadPct}%
          </p>
        </div>
      )}

      {/* ── Sent ── */}
      {phase === 'sent' && (
        <div className="mt-2">
          <hr className="border-slate-800 mb-4" />
          <p className="text-rose-400 text-xs tracking-wider uppercase mb-2">
            ▸ sent to [ ].edited
          </p>
          <p className="text-slate-300 leading-relaxed mb-4">{doc.intel}</p>
          {isLastDoc ? (
            <p className="text-slate-400 italic lowercase">
              &gt; all files restored. <span className="text-rose-400/70">— F</span>
            </p>
          ) : (
            <button
              type="button"
              onClick={goNextDoc}
              className="rounded-lg border border-slate-600 bg-slate-800/40 px-4 py-2.5 text-slate-200 tracking-wider lowercase text-xs hover:border-rose-400 hover:text-rose-300 active:scale-[0.98] transition-all"
            >
              ▸ open next file →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
