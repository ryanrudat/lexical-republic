import { useState } from 'react';
import {
  issueComplianceCheckForStudent,
  issueComplianceCheckForClass,
} from '../../api/compliance-check';

export interface ComplianceTarget {
  kind: 'student' | 'class';
  id: string;
  label: string;
}

interface Props {
  target: ComplianceTarget;
  availableShifts: number[];
  onClose: () => void;
}

export default function IssueComplianceCheckModal({ target, availableShifts, onClose }: Props) {
  const [weekNumber, setWeekNumber] = useState<number>(availableShifts[0] ?? 1);
  const [questionCount, setQuestionCount] = useState<number>(3);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      if (target.kind === 'student') {
        const r = await issueComplianceCheckForStudent(target.id, { weekNumber, questionCount });
        setSuccess(`Issued ${r.totalCount} questions to ${target.label}.`);
      } else {
        const r = await issueComplianceCheckForClass(target.id, { weekNumber, questionCount });
        setSuccess(`Issued to ${r.issued} student(s) in ${target.label}.`);
      }
      setTimeout(onClose, 1400);
    } catch (err) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Failed to issue Compliance Check.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center px-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[10px] font-mono text-cyan-600 tracking-[0.18em] uppercase">
              P.E.A.R.L.
            </p>
            <h3 className="text-base font-semibold text-slate-900 mt-0.5">
              Issue Compliance Check
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors text-lg leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="text-xs text-slate-500 mb-3">
          Target:{' '}
          <span className="font-semibold text-slate-700">
            {target.kind === 'class' ? 'Whole class — ' : ''}
            {target.label}
          </span>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
              Vocabulary from Shift
            </label>
            <div className="flex flex-wrap gap-1.5">
              {availableShifts.map((wn) => (
                <button
                  key={wn}
                  onClick={() => setWeekNumber(wn)}
                  className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
                    weekNumber === wn
                      ? 'bg-cyan-100 text-cyan-700 border-cyan-300 font-semibold'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Shift {wn}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
              Number of Questions
            </label>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setQuestionCount(n)}
                  className={`flex-1 px-2 py-1.5 text-xs rounded-md border transition-colors ${
                    questionCount === n
                      ? 'bg-cyan-100 text-cyan-700 border-cyan-300 font-semibold'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-3 px-3 py-2 rounded-md bg-rose-50 border border-rose-200 text-xs text-rose-700">
            {error}
          </div>
        )}
        {success && (
          <div className="mt-3 px-3 py-2 rounded-md bg-emerald-50 border border-emerald-200 text-xs text-emerald-700">
            {success}
          </div>
        )}

        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !!success}
            className="px-4 py-1.5 text-xs font-semibold rounded-md bg-cyan-600 text-white hover:bg-cyan-700 active:scale-95 transition-all disabled:opacity-60"
          >
            {submitting ? 'Issuing…' : success ? 'Issued' : 'Issue Check'}
          </button>
        </div>
      </div>
    </div>
  );
}
