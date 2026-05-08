import { useEffect, useMemo, useState } from 'react';
import {
  createComplianceTemplate,
  deleteComplianceTemplate,
  fetchDictionaryWordsGrouped,
  updateComplianceTemplate,
  type ComplianceCheckTemplate,
  type DictionaryWordRow,
} from '../../../api/compliance-check';
import WordPicker from './WordPicker';

export type PlacementSlot =
  | { kind: 'shift_start' }
  | { kind: 'shift_end' }
  | { kind: 'after_task'; afterTaskId: string; afterTaskLabel: string };

interface Props {
  classId: string;
  weekNumber: number;
  slot: PlacementSlot;
  existing: ComplianceCheckTemplate | null;
  onSaved: (tpl: ComplianceCheckTemplate) => void;
  onDeleted: (id: string) => void;
  onClose: () => void;
}

function placementLabel(slot: PlacementSlot): string {
  if (slot.kind === 'shift_start') return 'Before shift starts';
  if (slot.kind === 'shift_end') return 'At shift end';
  return `After ${slot.afterTaskLabel}`;
}

function shuffle<T>(arr: T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

// Two-step wizard:
//   1. Configure — title + question count + prior-shift count
//   2. Words    — manual word picking + live preview
// Save lives only on Step 2 so the teacher must consciously walk through both
// choices before a Compliance Check is created.
type WizardStep = 1 | 2;

export default function ComplianceCheckEditor({
  classId,
  weekNumber,
  slot,
  existing,
  onSaved,
  onDeleted,
  onClose,
}: Props) {
  const [step, setStep] = useState<WizardStep>(1);
  const [title, setTitle] = useState<string>(existing?.title ?? '');
  const [words, setWords] = useState<string[]>(existing?.words ?? []);
  const [questionCount, setQuestionCount] = useState<number>(existing?.questionCount ?? 3);
  const [cumulativeReviewCount, setCumulativeReviewCount] = useState<number>(
    existing?.cumulativeReviewCount ?? 2,
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const [dictRows, setDictRows] = useState<Record<string, DictionaryWordRow[]>>({});

  // Load dictionary so the live preview + ↻ Auto-fill button can use it.
  // We deliberately do NOT auto-seed words: the editor opens empty and the
  // teacher walks through the wizard manually.
  useEffect(() => {
    fetchDictionaryWordsGrouped(true).then((res) => setDictRows(res.grouped)).catch(() => {});
  }, []);

  const seedFromDict = (priorCount: number) => {
    const currentRows = dictRows[String(weekNumber)] ?? [];
    const currentWords = currentRows.map((r) => r.word.toLowerCase());

    const priorWords: string[] = [];
    for (let wk = 1; wk < weekNumber; wk++) {
      const rows = dictRows[String(wk)] ?? [];
      const pool = rows.map((r) => r.word.toLowerCase());
      const picked = shuffle(pool).slice(0, priorCount);
      priorWords.push(...picked);
    }

    setWords(Array.from(new Set([...currentWords, ...priorWords])));
  };

  const reseed = () => {
    seedFromDict(cumulativeReviewCount);
  };

  const sampleQuestion = useMemo(() => {
    if (words.length === 0 || Object.keys(dictRows).length === 0) return null;
    const flat = Object.values(dictRows).flat();
    const lc = words[Math.floor(Math.random() * words.length)]!;
    const correctRow = flat.find((r) => r.word.toLowerCase() === lc);
    if (!correctRow || !correctRow.definition) return null;
    const selectedSet = new Set(words.map((w) => w.toLowerCase()));
    const distractorPool = shuffle(
      flat.filter(
        (r) =>
          !selectedSet.has(r.word.toLowerCase()) &&
          r.definition &&
          r.definition !== correctRow.definition,
      ),
    );
    const distractors = distractorPool.slice(0, 3).map((r) => r.definition);
    if (distractors.length < 2) return null;
    return { word: correctRow.word, correctDefinition: correctRow.definition, distractors };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [words, dictRows, previewKey]);

  const canAdvance = questionCount >= 1;
  const canSave = words.length > 0 && questionCount >= 1;

  const handleSave = async () => {
    setSubmitting(true);
    setError(null);
    try {
      if (existing) {
        const r = await updateComplianceTemplate(existing.id, {
          title: title.trim() ? title.trim() : null,
          words,
          questionCount,
          cumulativeReviewCount,
        });
        onSaved(r.template);
      } else {
        const r = await createComplianceTemplate({
          classId,
          weekNumber,
          placement: slot.kind,
          afterTaskId: slot.kind === 'after_task' ? slot.afterTaskId : null,
          title: title.trim() ? title.trim() : null,
          words,
          questionCount,
          cumulativeReviewCount,
        });
        onSaved(r.template);
      }
      onClose();
    } catch (err) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Failed to save Compliance Check.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!existing) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteComplianceTemplate(existing.id);
      onDeleted(existing.id);
      onClose();
    } catch (err) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Failed to delete Compliance Check.';
      setError(msg);
      setDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4 py-6"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 sticky top-0 bg-white rounded-t-xl">
          <div>
            <p className="text-[10px] font-mono text-cyan-600 tracking-[0.2em] uppercase">
              P.E.A.R.L. — Compliance Check
            </p>
            <h3 className="text-base font-semibold text-slate-900 mt-0.5">
              Shift {weekNumber} · {placementLabel(slot)}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-xl leading-none px-2"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Step indicator */}
        <div className="px-5 pt-4">
          <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider">
            <span
              className={`px-2 py-0.5 rounded ${
                step === 1
                  ? 'bg-cyan-100 text-cyan-700 border border-cyan-300 font-semibold'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}
            >
              {step === 1 ? '1' : '✓'} Configure
            </span>
            <span className="text-slate-300">→</span>
            <span
              className={`px-2 py-0.5 rounded ${
                step === 2
                  ? 'bg-cyan-100 text-cyan-700 border border-cyan-300 font-semibold'
                  : 'bg-slate-50 text-slate-400 border border-slate-200'
              }`}
            >
              2 Words
            </span>
          </div>
        </div>

        {step === 1 && (
          <div className="px-5 py-4 space-y-5">
            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                Title (optional)
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Vocabulary Verification"
                className="w-full text-sm px-3 py-2 rounded-md border border-slate-200 focus:border-cyan-300 focus:outline-none focus:ring-1 focus:ring-cyan-200"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                Number of questions
              </label>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setQuestionCount(n)}
                    className={`flex-1 px-3 py-2.5 text-sm rounded-md border transition-colors ${
                      questionCount === n
                        ? 'bg-cyan-100 text-cyan-700 border-cyan-300 font-semibold'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">
                The student is asked this many questions, drawn at random from the words you'll pick on the next step.
              </p>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                Auto-fill: prior-shift words (optional)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={10}
                  value={cumulativeReviewCount}
                  onChange={(e) =>
                    setCumulativeReviewCount(
                      Math.max(0, Math.min(10, Number(e.target.value) || 0)),
                    )
                  }
                  className="w-20 text-sm px-2 py-1.5 rounded-md border border-slate-200 focus:border-cyan-300 focus:outline-none focus:ring-1 focus:ring-cyan-200"
                />
                <span className="text-[11px] text-slate-500">words per prior shift</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">
                Only used if you press the ↻ Auto-fill button on the next step. Leave at 0 if you want to pick everything by hand.
              </p>
            </div>

            {error && (
              <div className="px-3 py-2 rounded-md bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {error}
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="px-5 py-4 space-y-5">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Words to verify
                </label>
                <button
                  type="button"
                  onClick={reseed}
                  className="text-[10px] text-cyan-600 hover:text-cyan-700 underline"
                  title="Auto-fill: all current-shift words + N words from each prior shift"
                >
                  ↻ Auto-fill
                </button>
              </div>
              <WordPicker
                selectedWords={words}
                onChange={setWords}
                focusWeek={weekNumber}
              />
              <p className="text-[11px] text-slate-400 mt-2">
                The {questionCount} question{questionCount === 1 ? '' : 's'} will be drawn at random from this list.
              </p>
            </div>

            {sampleQuestion && (
              <div className="rounded-lg border-2 border-cyan-200 bg-cyan-50/40 p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-mono text-cyan-700 tracking-[0.2em] uppercase">
                    Live Preview
                  </p>
                  <button
                    type="button"
                    onClick={() => setPreviewKey((k) => k + 1)}
                    className="text-[10px] text-cyan-600 hover:text-cyan-700 underline"
                  >
                    ↻ Re-roll
                  </button>
                </div>
                <p className="text-xs text-slate-500 mb-1">Select the approved definition of:</p>
                <p className="text-base font-mono font-semibold text-slate-800 mb-2.5">
                  {sampleQuestion.word}
                </p>
                <div className="space-y-1.5">
                  <div className="text-xs px-2 py-1.5 rounded border border-emerald-300 bg-emerald-50 text-emerald-800">
                    ✓ {sampleQuestion.correctDefinition}
                  </div>
                  {sampleQuestion.distractors.map((d, i) => (
                    <div
                      key={i}
                      className="text-xs px-2 py-1.5 rounded border border-slate-200 bg-white text-slate-600"
                    >
                      {d}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="px-3 py-2 rounded-md bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {error}
              </div>
            )}
          </div>
        )}

        <div className="px-5 py-4 border-t border-slate-200 sticky bottom-0 bg-white rounded-b-xl flex items-center justify-between">
          <div>
            {existing && step === 1 && !confirmDelete && (
              <button
                onClick={() => setConfirmDelete(true)}
                disabled={submitting || deleting}
                className="text-xs text-rose-600 hover:text-rose-700 underline disabled:opacity-50"
              >
                Remove Compliance Check
              </button>
            )}
            {existing && step === 1 && confirmDelete && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-rose-700">Remove? Past results stay.</span>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="text-xs px-2.5 py-1 rounded-md bg-rose-600 text-white hover:bg-rose-700 active:scale-95 transition-all disabled:opacity-60"
                >
                  {deleting ? 'Removing…' : 'Confirm'}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  disabled={deleting}
                  className="text-xs text-slate-500 hover:text-slate-700 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            )}
            {step === 2 && (
              <button
                onClick={() => setStep(1)}
                disabled={submitting}
                className="text-xs font-semibold text-slate-500 hover:text-slate-700 disabled:opacity-50"
              >
                ← Back
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={submitting || deleting}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 disabled:opacity-50"
            >
              Cancel
            </button>
            {step === 1 ? (
              <button
                onClick={() => setStep(2)}
                disabled={!canAdvance}
                className="px-4 py-1.5 text-xs font-semibold rounded-md bg-cyan-600 text-white hover:bg-cyan-700 active:scale-95 transition-all disabled:opacity-50"
              >
                Next: Pick Words →
              </button>
            ) : (
              <button
                onClick={handleSave}
                disabled={submitting || deleting || !canSave}
                className="px-4 py-1.5 text-xs font-semibold rounded-md bg-cyan-600 text-white hover:bg-cyan-700 active:scale-95 transition-all disabled:opacity-50"
              >
                {submitting
                  ? 'Saving…'
                  : existing
                    ? 'Save Changes'
                    : `Save Compliance Check (${words.length} word${words.length === 1 ? '' : 's'})`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
