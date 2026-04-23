import { useEffect, useState } from 'react';
import { fetchGradebook } from '../../api/teacher';
import type {
  GradebookData,
  GradebookStudent,
  GradebookWeek,
  GradebookMissionScore,
  GradebookShiftResult,
} from '../../api/teacher';
import { useTeacherStore } from '../../stores/teacherStore';

const QUEUE_TASK_LABELS: Record<string, string> = {
  intake_form: 'Intake',
  vocab_clearance: 'Vocab',
  document_review: 'Docs',
  contradiction_report: 'Contradict',
  shift_report: 'Report',
  priority_briefing: 'Briefing',
  priority_sort: 'Sort',
};

type CompletionState = 'not_started' | 'in_progress' | 'complete';

interface StudentRowData {
  student: GradebookStudent;
  scores: GradebookMissionScore[];
  shiftResult: GradebookShiftResult | null;
  state: CompletionState;
  avgScore: number | null;
}

function computeRowData(student: GradebookStudent, week: GradebookWeek): StudentRowData {
  const scores = student.missionScores.filter((ms) => ms.mission.weekId === week.id);
  const shiftResult = student.shiftResults?.find((sr) => sr.weekNumber === week.weekNumber) ?? null;

  if (scores.length === 0) {
    return { student, scores: [], shiftResult, state: 'not_started', avgScore: null };
  }

  const isComplete =
    scores.some(
      (ms) =>
        (ms.details as Record<string, unknown>)?.status === 'complete' &&
        (ms.mission.missionType === 'clock_out' || ms.mission.missionType === 'shift_report'),
    ) || shiftResult?.completedAt != null;

  let avg: number | null;
  if (shiftResult && isComplete) {
    avg = (shiftResult.vocabScore + shiftResult.grammarAccuracy) / 2;
  } else {
    const totalTasks = week.taskTypes?.length ?? scores.length;
    const totalScore = scores.reduce((sum, ms) => sum + ms.score, 0);
    avg = totalTasks > 0 ? totalScore / totalTasks : null;
  }

  return {
    student,
    scores,
    shiftResult,
    state: isComplete ? 'complete' : 'in_progress',
    avgScore: avg,
  };
}

const STATE_LABEL: Record<CompletionState, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  complete: 'Complete',
};

const STATE_CHIP: Record<CompletionState, string> = {
  not_started: 'bg-slate-100 text-slate-500 border-slate-200',
  in_progress: 'bg-blue-50 text-blue-700 border-blue-200',
  complete: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

export default function ShiftReviewModal({
  classId,
  weekNumber,
  onClose,
}: {
  classId: string;
  weekNumber: number;
  onClose: () => void;
}) {
  const [data, setData] = useState<GradebookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedWriting, setExpandedWriting] = useState<string | null>(null);
  const setActiveTab = useTeacherStore((s) => s.setActiveTab);
  const setSelectedClassId = useTeacherStore((s) => s.setSelectedClassId);

  useEffect(() => {
    setLoading(true);
    void fetchGradebook(classId)
      .then(setData)
      .finally(() => setLoading(false));
  }, [classId]);

  const week = data?.weeks.find((w) => w.weekNumber === weekNumber) ?? null;
  const rows: StudentRowData[] =
    data && week ? data.students.map((s) => computeRowData(s, week)) : [];

  const tallies = rows.reduce(
    (acc, r) => {
      acc[r.state]++;
      return acc;
    },
    { not_started: 0, in_progress: 0, complete: 0 } as Record<CompletionState, number>,
  );

  const openInGradebook = () => {
    setSelectedClassId(classId);
    setActiveTab('grades');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[80] bg-slate-900/60 flex items-start justify-center px-4 py-8 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-5xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-800">
              Shift {weekNumber} Review
              {week && <span className="text-slate-400 font-normal ml-2">— {week.title}</span>}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Class snapshot. Read-only. Use Gradebook to edit scores.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-slate-600"
          >
            Close
          </button>
        </div>

        {/* Tally strip */}
        {!loading && (
          <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-4 text-xs">
            <span className="text-slate-500 font-medium">
              {rows.length} student{rows.length !== 1 ? 's' : ''}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-slate-700">{tallies.complete} complete</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-slate-700">{tallies.in_progress} in progress</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              <span className="text-slate-700">{tallies.not_started} not started</span>
            </span>
          </div>
        )}

        {/* Body */}
        <div className="p-5">
          {loading ? (
            <div className="text-sm text-slate-400 text-center py-12 animate-pulse">
              Loading shift data…
            </div>
          ) : !week ? (
            <div className="text-sm text-red-500 text-center py-12">
              No data for Shift {weekNumber} in this class.
            </div>
          ) : rows.length === 0 ? (
            <div className="text-sm text-slate-400 text-center py-12">
              No students enrolled in this class.
            </div>
          ) : (
            <div className="space-y-2">
              {rows.map((row) => (
                <StudentRow
                  key={row.student.id}
                  row={row}
                  week={week}
                  expandedWriting={expandedWriting}
                  onToggleWriting={(id) =>
                    setExpandedWriting((cur) => (cur === id ? null : id))
                  }
                  onOpenInGradebook={openInGradebook}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StudentRow({
  row,
  week,
  expandedWriting,
  onToggleWriting,
  onOpenInGradebook,
}: {
  row: StudentRowData;
  week: GradebookWeek;
  expandedWriting: string | null;
  onToggleWriting: (id: string) => void;
  onOpenInGradebook: () => void;
}) {
  const { student, scores, shiftResult, state, avgScore } = row;

  const taskList = week.taskTypes ?? [];
  const hasWriting = scores.some((ms) => {
    const d = (ms.details ?? {}) as Record<string, unknown>;
    return !!(d.writingText || d.writingSubmissions || d.text || d.justifications);
  });
  const isExpanded = expandedWriting === student.id;

  return (
    <div className="border border-slate-200 rounded-lg">
      <div className="px-3 py-2.5 flex items-center gap-3">
        {/* Student identity */}
        <div className="w-40 shrink-0">
          <div className="text-xs font-medium text-slate-700 truncate">
            <span className="text-indigo-500 mr-1.5">{student.designation || '??'}</span>
            {student.displayName}
          </div>
        </div>

        {/* State chip */}
        <span
          className={`text-[10px] px-2 py-0.5 rounded-full border shrink-0 ${STATE_CHIP[state]}`}
        >
          {STATE_LABEL[state]}
        </span>

        {/* Average score */}
        <div className="w-16 shrink-0 text-xs">
          {avgScore !== null ? (
            <span
              className={`font-semibold ${
                avgScore >= 0.7 ? 'text-emerald-600' : 'text-amber-600'
              }`}
            >
              {Math.round(avgScore * 100)}%
            </span>
          ) : (
            <span className="text-slate-400">—</span>
          )}
        </div>

        {/* Per-task dots */}
        <div className="flex-1 flex items-center gap-1 flex-wrap">
          {taskList.map((t) => {
            const score = scores.find((ms) => ms.mission.missionType === t.type);
            const done = !!score;
            const label = QUEUE_TASK_LABELS[t.type] ?? t.type;
            return (
              <span
                key={t.id}
                title={`${label}${score ? ` — ${Math.round(score.score * 100)}%` : ' — not done'}`}
                className={`text-[10px] px-1.5 py-0.5 rounded ${
                  done
                    ? score && score.score >= 0.7
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-amber-100 text-amber-700'
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                {label}
              </span>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {hasWriting && (
            <button
              onClick={() => onToggleWriting(student.id)}
              className="text-[10px] px-2 py-1 rounded bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
            >
              {isExpanded ? 'Hide' : 'Writing'}
            </button>
          )}
          <button
            onClick={onOpenInGradebook}
            className="text-[10px] px-2 py-1 rounded bg-slate-100 text-slate-600 hover:bg-slate-200"
            title="Open this class in the Gradebook tab to edit scores"
          >
            Gradebook →
          </button>
        </div>
      </div>

      {/* Shift summary row (compact) */}
      {shiftResult && (
        <div className="px-3 pb-2 pt-0 flex items-center gap-4 text-[10px] text-slate-500 border-t border-slate-100">
          <span>
            Docs <span className="text-slate-700 font-medium">{shiftResult.documentsProcessed}/{shiftResult.documentsTotal}</span>
          </span>
          <span>
            Errors <span className="text-slate-700 font-medium">{shiftResult.errorsFound}/{shiftResult.errorsTotal}</span>
          </span>
          <span>
            Vocab <span className="text-indigo-600 font-medium">{Math.round(shiftResult.vocabScore * 100)}%</span>
          </span>
          <span>
            Grammar <span className="text-indigo-600 font-medium">{Math.round(shiftResult.grammarAccuracy * 100)}%</span>
          </span>
          <span>
            Target words <span className="text-slate-700 font-medium">{shiftResult.targetWordsUsed}</span>
          </span>
          <span>
            Concern{' '}
            <span
              className={`font-medium ${
                shiftResult.concernScoreDelta > 0 ? 'text-amber-600' : 'text-emerald-600'
              }`}
            >
              {shiftResult.concernScoreDelta.toFixed(1)}
            </span>
          </span>
        </div>
      )}

      {/* Writing expansion */}
      {isExpanded && (
        <div className="px-3 pb-3 pt-2 border-t border-slate-100 space-y-2">
          {scores.map((ms) => (
            <WritingBlock key={ms.id} score={ms} />
          ))}
        </div>
      )}
    </div>
  );
}

function WritingBlock({ score }: { score: GradebookMissionScore }) {
  const details = (score.details ?? {}) as Record<string, unknown>;
  const writings: Array<{ label: string; text: string }> = [];

  if (typeof details.text === 'string') writings.push({ label: 'Report', text: details.text });
  if (typeof details.writingText === 'string')
    writings.push({ label: 'Writing', text: details.writingText });
  if (details.writingSubmissions && typeof details.writingSubmissions === 'object') {
    Object.entries(details.writingSubmissions as Record<string, string>).forEach(([k, t]) => {
      writings.push({ label: `Card ${Number(k) + 1}`, text: t });
    });
  }
  if (details.justifications && typeof details.justifications === 'object') {
    Object.entries(details.justifications as Record<string, string>).forEach(([k, t]) => {
      writings.push({ label: `Justification: ${k}`, text: t });
    });
  }

  if (writings.length === 0) return null;

  return (
    <div>
      <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">
        {score.mission.missionType}
      </div>
      <div className="space-y-1.5">
        {writings.map((w, i) => (
          <div key={i} className="bg-slate-50 rounded p-2.5 border border-slate-200">
            <div className="text-[9px] font-medium text-slate-500 uppercase tracking-wider mb-1">
              {w.label}
            </div>
            <div className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
              {w.text}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
