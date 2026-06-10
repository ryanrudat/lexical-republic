import { useState } from 'react';
import { postNarrativeChoice } from '../../../api/narrative-choices';

// ─── W4 Recruitment Vote ─────────────────────────────────────────
//
// Fires after Drop Box, before ShiftClosing. The end-of-shift vote
// — "will you read what they have hidden?" — gates W5 content depth.
//
// Stored as NarrativeChoice `w4_recruitment_vote`:
//   value: 'compliant' | 'curious' | 'guarded'
//   context: { buttonText }
//
// The button label IS the narrative beat — the student is signing
// their name to a complete sentence, not a yes/no.

interface RecruitmentModalProps {
  weekNumber: number;
  onComplete: () => void;
}

interface VoteOption {
  value: 'compliant' | 'curious' | 'guarded';
  label: string;
}

const OPTIONS: VoteOption[] = [
  { value: 'compliant', label: 'i follow procedure. i will not look again.' },
  { value: 'curious',   label: 'show me what they hid.' },
  { value: 'guarded',   label: 'i need to think about it.' },
];

export default function RecruitmentModal({ weekNumber, onComplete }: RecruitmentModalProps) {
  const [submitting, setSubmitting] = useState<VoteOption['value'] | null>(null);
  const [retryLine, setRetryLine] = useState(false);

  const vote = async (option: VoteOption) => {
    if (submitting) return;
    setSubmitting(option.value);
    try {
      await postNarrativeChoice({
        choiceKey: 'w4_recruitment_vote',
        value: option.value,
        weekNumber,
        context: { buttonText: option.label },
      });
      onComplete();
    } catch (err) {
      // This vote gates W5 content — advancing on a failed POST silently
      // dropped it forever (no retry surface once the stage moves on). Stay
      // on the modal with an in-register retry line instead; the student can
      // tap their choice again. Shift closing is one tap away, not blocked.
      console.error('Failed to save recruitment vote:', err);
      setRetryLine(true);
      setSubmitting(null);
    }
  };

  return (
    <div className="bg-slate-950 min-h-[400px] -mx-4 -my-3 px-6 py-8 rounded-xl text-slate-200 font-ibm-mono text-sm">
      {/* Header */}
      <div className="mb-10">
        <p className="text-rose-400 mb-1">&gt; [ ].edited</p>
        <p className="text-slate-500 text-xs">&gt; unsigned. unfiled. uncurated.</p>
        <hr className="mt-4 border-slate-800" />
      </div>

      {/* Frey's question */}
      <p className="text-slate-200 lowercase mb-2">&gt; citizen —</p>
      <p className="text-slate-100 lowercase mb-10 text-base">
        will you read what they have hidden?
      </p>

      {/* Three vertical bracketed options */}
      <div className="space-y-3">
        {OPTIONS.map((option) => {
          const isSubmittingThis = submitting === option.value;
          return (
            <button
              key={option.value}
              onClick={() => vote(option)}
              disabled={submitting !== null}
              className={`block w-full text-left lowercase tracking-wider transition-colors disabled:opacity-50 ${
                isSubmittingThis
                  ? 'text-rose-300'
                  : 'text-slate-300 hover:text-rose-300'
              }`}
            >
              [ {option.label} ]
            </button>
          );
        })}
      </div>

      {retryLine && (
        <p className="text-amber-300/80 text-xs mt-6 lowercase">
          &gt; the line dropped. say it again.
        </p>
      )}

      <hr className="mt-12 border-slate-800" />
      <p className="text-rose-400/70 text-xs mt-4">— F</p>
    </div>
  );
}
