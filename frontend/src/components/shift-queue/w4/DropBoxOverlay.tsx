import { useState } from 'react';
import { postNarrativeChoice } from '../../../api/narrative-choices';

// ─── W4 Drop Box Overlay ─────────────────────────────────────────
//
// Fires after Shift Report submits, before ShiftClosing. The
// `[ ].edited` app's Drop Box tab — Frey asks the student to write
// down what changed today. Ungraded; empty submissions are allowed
// (refusing to write is itself a signal).
//
// Stored as NarrativeChoice `w4_drop_box_first_submission`:
//   value: 'submitted' | 'skipped'
//   context: { text }
//
// Persistence is checked at the parent (ShiftQueue) via the narrative
// choices fetch — this component does not re-check on its own.

interface DropBoxOverlayProps {
  weekNumber: number;
  onComplete: () => void;
}

export default function DropBoxOverlay({ weekNumber, onComplete }: DropBoxOverlayProps) {
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (value: 'submitted' | 'skipped') => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await postNarrativeChoice({
        choiceKey: 'w4_drop_box_first_submission',
        value,
        weekNumber,
        context: { text: text.trim() },
      });
    } catch (err) {
      // Fail-open — the recruitment vote still needs to fire.
      console.error('Failed to save drop box submission:', err);
    } finally {
      setSubmitting(false);
      onComplete();
    }
  };

  return (
    <div className="bg-slate-950 min-h-[400px] -mx-4 -my-3 px-6 py-8 rounded-xl text-slate-200 font-ibm-mono text-sm">
      {/* App-style header */}
      <div className="mb-6">
        <p className="text-rose-400 mb-1">&gt; [ ].edited</p>
        <p className="text-slate-500 text-xs">&gt; unsigned. unfiled. uncurated.</p>
        <hr className="mt-4 border-slate-800" />
      </div>

      {/* Tab row (drop box active) */}
      <div className="mb-8 flex flex-wrap gap-x-5 gap-y-2">
        <span className="text-slate-500 lowercase tracking-wider">[ lexicon ]</span>
        <span className="text-slate-500 lowercase tracking-wider">[ cipher ]</span>
        <span className="text-rose-400 lowercase tracking-wider">[ drop box ]</span>
      </div>

      {/* Frey's prompt */}
      <p className="text-slate-200 lowercase mb-1">tell me what they took.</p>
      <p className="text-slate-200 lowercase mb-6">i'm reading.</p>

      {/* Free-text input */}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={submitting}
        rows={5}
        maxLength={500}
        placeholder="..."
        className="w-full bg-slate-900 border border-slate-700 focus:border-rose-500 focus:outline-none rounded p-3 text-slate-100 font-ibm-mono text-sm placeholder:text-slate-700 transition-colors disabled:opacity-50 mb-3"
      />
      <p className="text-slate-600 text-xs mb-6">
        &gt; {text.length} / 500 characters
      </p>

      {/* Actions */}
      <div className="flex gap-6">
        <button
          onClick={() => submit('submitted')}
          disabled={submitting || text.trim().length === 0}
          className="text-rose-400 hover:text-rose-300 disabled:text-slate-700 disabled:cursor-not-allowed lowercase tracking-wider transition-colors"
        >
          [ post ]
        </button>
        <button
          onClick={() => submit('skipped')}
          disabled={submitting}
          className="text-slate-500 hover:text-slate-300 disabled:opacity-50 lowercase tracking-wider transition-colors"
        >
          [ skip ]
        </button>
      </div>

      <hr className="mt-12 border-slate-800" />
      <p className="text-rose-400/70 text-xs mt-4">— F</p>
    </div>
  );
}
