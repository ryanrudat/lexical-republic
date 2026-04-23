import { useEffect, useState, useCallback } from 'react';
import { fetchGradebook, updateScore, deleteScore, resetWeekProgress } from '../../api/teacher';
import type { GradebookData, GradebookStudent, GradebookWeek, GradebookMissionScore, GradebookShiftResult } from '../../api/teacher';
import { STEP_ORDER } from '../../types/shifts';

// Queue task labels for display
const QUEUE_TASK_LABELS: Record<string, string> = {
  intake_form: 'Intake Form',
  vocab_clearance: 'Vocab Clearance',
  document_review: 'Document Review',
  contradiction_report: 'Contradiction Report',
  shift_report: 'Shift Report',
  priority_briefing: 'Priority Briefing',
  priority_sort: 'Priority Sort',
};

const stepLabel = (stepId: string) =>
  STEP_ORDER.find((s) => s.id === stepId)?.label ?? stepId;

interface CellStatus {
  state: 'gray' | 'blue' | 'green' | 'amber';
  avgScore: number | null;
  scores: GradebookMissionScore[];
  shiftResult: GradebookShiftResult | null;
}

function computeCell(
  student: GradebookStudent,
  week: GradebookWeek
): CellStatus {
  // Only count MissionScores whose missionType belongs to the CURRENT task list
  // for this week. Legacy Missions (old storyboard: recap/briefing/grammar/etc.)
  // can still live in the DB at orderIndex 100+; without this filter their
  // scores inflated the sum and produced >100% shift totals.
  const validTypes = new Set<string>(
    week.taskTypes?.map((t) => t.type) ?? STEP_ORDER.map((s) => s.id),
  );
  const weekScores = student.missionScores.filter(
    (ms) => ms.mission.weekId === week.id && validTypes.has(ms.mission.missionType),
  );
  const shiftResult = student.shiftResults?.find(
    (sr) => sr.weekNumber === week.weekNumber
  ) ?? null;

  if (weekScores.length === 0) {
    return { state: 'gray', avgScore: null, scores: [], shiftResult };
  }

  // Check completion: clock_out for phase weeks, last task for queue weeks
  const isComplete = weekScores.some(
    (ms) =>
      (ms.details as Record<string, unknown>)?.status === 'complete' &&
      (ms.mission.missionType === 'clock_out' || ms.mission.missionType === 'shift_report')
  ) || shiftResult?.completedAt != null;

  // Use ShiftResult summary average when available (matches what student sees),
  // otherwise fall back to MissionScore average. Clamp to [0, 1] in both paths
  // as a final safety net against any historical bad data.
  let avg: number | null;
  if (shiftResult && isComplete) {
    // Average vocab + grammar scores — same metrics student sees on ShiftClosing
    const raw = (shiftResult.vocabScore + shiftResult.grammarAccuracy) / 2;
    avg = Math.max(0, Math.min(1, raw));
  } else {
    const totalTasks = week.taskTypes?.length ?? STEP_ORDER.length;
    const totalScore = weekScores.reduce((sum, ms) => sum + ms.score, 0);
    const raw = totalTasks > 0 ? totalScore / totalTasks : null;
    avg = raw === null ? null : Math.max(0, Math.min(1, raw));
  }

  if (!isComplete) {
    return { state: 'blue', avgScore: avg, scores: weekScores, shiftResult };
  }

  if (avg !== null && avg >= 0.7) {
    return { state: 'green', avgScore: avg, scores: weekScores, shiftResult };
  }

  return { state: 'amber', avgScore: avg, scores: weekScores, shiftResult };
}

const CELL_COLORS: Record<CellStatus['state'], string> = {
  gray: 'bg-slate-100 text-slate-400',
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
};

export default function Gradebook({ classId }: { classId?: string | null }) {
  const [data, setData] = useState<GradebookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<{
    student: GradebookStudent;
    week: GradebookWeek;
    cell: CellStatus;
  } | null>(null);

  const loadData = useCallback(() => {
    setLoading(true);
    void fetchGradebook(classId || undefined)
      .then((d) => { setData(d); setSelected(null); })
      .finally(() => setLoading(false));
  }, [classId]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId]);

  const handleRefresh = useCallback(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm text-indigo-500 animate-pulse">Loading gradebook...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-sm text-red-500 text-center py-12">
        Failed to load gradebook data.
      </div>
    );
  }

  const { students, weeks } = data;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800">Gradebook</h2>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-slate-200" /> Not started</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-200" /> In progress</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-200" /> Good</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-200" /> Needs work</span>
        </div>
      </div>

      {/* Scrollable table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="sticky left-0 bg-white z-[5] text-left px-3 py-2 text-xs font-medium text-slate-500 uppercase tracking-wider min-w-[140px]">
                Student
              </th>
              {weeks.map((w) => (
                <th
                  key={w.id}
                  className="px-1.5 py-2 text-center text-xs font-medium text-slate-500 min-w-[44px]"
                >
                  {w.weekNumber}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.id} className="border-b border-slate-100 last:border-0">
                <td className="sticky left-0 bg-white z-[5] px-3 py-2 font-medium text-slate-700 whitespace-nowrap">
                  <span className="text-xs text-indigo-500 mr-1.5">
                    {student.designation || '??'}
                  </span>
                  {student.displayName}
                </td>
                {weeks.map((week) => {
                  const cell = computeCell(student, week);
                  const isSelected =
                    selected?.student.id === student.id &&
                    selected?.week.id === week.id;
                  return (
                    <td key={week.id} className="px-1 py-1.5 text-center">
                      <button
                        onClick={() => {
                          if (cell.state === 'gray') return;
                          setSelected(
                            isSelected ? null : { student, week, cell }
                          );
                        }}
                        className={`inline-block w-9 h-7 rounded text-xs font-medium border transition-all ${
                          CELL_COLORS[cell.state]
                        } ${
                          cell.state !== 'gray'
                            ? 'cursor-pointer hover:ring-2 hover:ring-indigo-300'
                            : 'cursor-default border-transparent'
                        } ${isSelected ? 'ring-2 ring-indigo-500' : ''}`}
                        title={
                          cell.state === 'gray'
                            ? 'Not started'
                            : `${student.displayName} — Shift ${week.weekNumber}`
                        }
                      >
                        {cell.avgScore !== null
                          ? Math.round(cell.avgScore * 100)
                          : '—'}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Drill-down panel */}
      {selected && (
        <DrillDown
          student={selected.student}
          week={selected.week}
          cell={selected.cell}
          onClose={() => setSelected(null)}
          onRefresh={handleRefresh}
        />
      )}

      {students.length === 0 && (
        <div className="text-center py-12 text-sm text-slate-400">
          No students registered yet.
        </div>
      )}
    </div>
  );
}

function DrillDown({
  student,
  week,
  cell,
  onClose,
  onRefresh,
}: {
  student: GradebookStudent;
  week: GradebookWeek;
  cell: CellStatus;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [resetting, setResetting] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const handleReset = async () => {
    setResetting(true);
    try {
      await resetWeekProgress(student.id, week.id);
      onRefresh();
      onClose();
    } catch {
      setResetting(false);
    }
  };

  // Determine task list based on week type
  const isQueue = week.shiftType === 'queue';
  const taskList = isQueue && week.taskTypes
    ? week.taskTypes.map(t => ({ id: t.type, label: QUEUE_TASK_LABELS[t.type] || t.title }))
    : STEP_ORDER.map(s => ({ id: s.id, label: stepLabel(s.id) }));

  return (
    <div className="bg-white rounded-xl border border-indigo-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">
            {student.displayName}
            <span className="text-slate-400 font-normal ml-2">
              Shift {week.weekNumber}: {week.title}
            </span>
          </h3>
          {cell.avgScore !== null && (
            <p className="text-xs text-slate-500 mt-0.5">
              Average: {Math.round(cell.avgScore * 100)}%
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!confirmReset ? (
            <button
              onClick={() => setConfirmReset(true)}
              className="text-xs px-2.5 py-1 rounded-md bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
            >
              Reset Week
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-red-600">Reset all progress?</span>
              <button
                onClick={handleReset}
                disabled={resetting}
                className="text-xs px-2 py-1 rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {resetting ? 'Resetting...' : 'Confirm'}
              </button>
              <button
                onClick={() => setConfirmReset(false)}
                className="text-xs px-2 py-1 rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200"
              >
                Cancel
              </button>
            </div>
          )}
          <button
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-slate-600 ml-2"
          >
            Close
          </button>
        </div>
      </div>

      {/* Shift Summary — matches what the student sees on ShiftClosing */}
      {cell.shiftResult && (
        <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
          <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-2">
            Shift Summary (Student View)
          </p>
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center">
              <span className="text-sm font-semibold text-slate-700">
                {cell.shiftResult.documentsProcessed}/{cell.shiftResult.documentsTotal}
              </span>
              <p className="text-[9px] text-slate-400">Docs Processed</p>
            </div>
            <div className="text-center">
              <span className="text-sm font-semibold text-slate-700">
                {cell.shiftResult.errorsFound}/{cell.shiftResult.errorsTotal}
              </span>
              <p className="text-[9px] text-slate-400">Errors Found</p>
            </div>
            <div className="text-center">
              <span className="text-sm font-semibold text-slate-700">
                {cell.shiftResult.targetWordsUsed}
              </span>
              <p className="text-[9px] text-slate-400">Words Used</p>
            </div>
            <div className="text-center">
              <span className="text-sm font-semibold text-indigo-600">
                {Math.round(Math.max(0, Math.min(1, cell.shiftResult.vocabScore)) * 100)}%
              </span>
              <p className="text-[9px] text-slate-400">Vocab Score</p>
            </div>
            <div className="text-center">
              <span className="text-sm font-semibold text-indigo-600">
                {Math.round(Math.max(0, Math.min(1, cell.shiftResult.grammarAccuracy)) * 100)}%
              </span>
              <p className="text-[9px] text-slate-400">Grammar Accuracy</p>
            </div>
            <div className="text-center">
              <span className={`text-sm font-semibold ${cell.shiftResult.concernScoreDelta > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                {cell.shiftResult.concernScoreDelta.toFixed(1)}
              </span>
              <p className="text-[9px] text-slate-400">Concern Score</p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {taskList.map((task) => {
          const score = cell.scores.find(
            (ms) => ms.mission.missionType === task.id
          );

          return (
            <TaskRow
              key={task.id}
              taskId={task.id}
              label={task.label}
              score={score ?? null}
              isQueue={isQueue}
              onRefresh={onRefresh}
            />
          );
        })}
      </div>
    </div>
  );
}

function TaskRow({
  taskId,
  label,
  score,
  isQueue,
  onRefresh,
}: {
  taskId: string;
  label: string;
  score: GradebookMissionScore | null;
  isQueue: boolean;
  onRefresh: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const details = (score?.details ?? {}) as Record<string, unknown>;
  const hasWriting = !!(details.writingText || details.writingSubmissions || details.text || details.justifications);

  const handleSave = async () => {
    if (!score) return;
    const newScore = parseFloat(editValue) / 100;
    if (isNaN(newScore) || newScore < 0 || newScore > 1) return;
    setSaving(true);
    try {
      await updateScore(score.id, newScore);
      onRefresh();
    } finally {
      setSaving(false);
      setEditing(false);
    }
  };

  const handleDelete = async () => {
    if (!score) return;
    setSaving(true);
    try {
      await deleteScore(score.id);
      onRefresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border-b border-slate-100 last:border-0">
      <div className="flex items-start gap-3 py-2">
        <div className="w-36 shrink-0">
          <div className="text-xs font-medium text-slate-700">{label}</div>
          <div className="text-[10px] text-slate-400">{taskId}</div>
        </div>

        <div className="flex-1 text-xs text-slate-600">
          {score ? (
            <div className="flex items-center gap-2">
              {editing ? (
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                    className="w-14 px-1.5 py-0.5 text-xs border border-indigo-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-400"
                    autoFocus
                  />
                  <span className="text-slate-400">%</span>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-50"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 hover:bg-slate-200"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setEditValue(String(Math.round(score.score * 100)));
                      setEditing(true);
                    }}
                    className="font-semibold hover:underline cursor-pointer"
                    title="Click to edit score"
                  >
                    {score.score > 0
                      ? `${Math.round(score.score * 100)}%`
                      : 'Incomplete'}
                  </button>
                  <QueueTaskDetails taskId={taskId} details={details} isQueue={isQueue} />
                  {hasWriting && (
                    <button
                      onClick={() => setExpanded(!expanded)}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 hover:bg-indigo-100 ml-1"
                    >
                      {expanded ? 'Hide Writing' : 'View Writing'}
                    </button>
                  )}
                  <button
                    onClick={handleDelete}
                    disabled={saving}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-500 hover:bg-red-100 ml-1 disabled:opacity-50"
                    title="Reset this task"
                  >
                    Reset
                  </button>
                </>
              )}
            </div>
          ) : (
            <span className="text-slate-400">—</span>
          )}
        </div>
      </div>

      {/* Expanded writing display */}
      {expanded && score && <WritingDisplay details={details} />}
    </div>
  );
}

function QueueTaskDetails({
  taskId,
  details,
  isQueue,
}: {
  taskId: string;
  details: Record<string, unknown>;
  isQueue: boolean;
}) {
  if (isQueue) {
    switch (taskId) {
      case 'vocab_clearance': {
        const correct = details.correct as number | undefined;
        const total = details.total as number | undefined;
        if (correct != null && total != null) {
          return <span className="ml-2 text-slate-400">({correct}/{total} correct)</span>;
        }
        return null;
      }
      case 'document_review': {
        const docs = details.documentsProcessed as number | undefined;
        const errors = details.errors as number | undefined;
        return (
          <span className="ml-2 text-slate-400">
            {docs != null ? `${docs} docs` : ''}
            {errors != null ? `, ${errors} errors` : ''}
          </span>
        );
      }
      case 'contradiction_report': {
        const found = details.diffsFound as number | undefined;
        const total = details.diffsTotal as number | undefined;
        const correct = details.correctClassifications as number | undefined;
        return (
          <span className="ml-2 text-slate-400">
            {found != null && total != null ? `${found}/${total} diffs` : ''}
            {correct != null ? `, ${correct} correct` : ''}
          </span>
        );
      }
      case 'shift_report': {
        const wordCount = details.wordCount as number | undefined;
        const attempt = details.attempt as number | undefined;
        return (
          <span className="ml-2 text-slate-400">
            {wordCount != null ? `${wordCount} words` : ''}
            {attempt != null ? ` (attempt ${attempt})` : ''}
          </span>
        );
      }
      case 'priority_sort': {
        const casesCorrect = details.casesCorrect as number | undefined;
        const totalCases = details.totalCases as number | undefined;
        return casesCorrect != null && totalCases != null
          ? <span className="ml-2 text-slate-400">({casesCorrect}/{totalCases} cases correct)</span>
          : null;
      }
      case 'intake_form': {
        const cards = details.cardsCompleted as number | undefined;
        return cards != null
          ? <span className="ml-2 text-slate-400">({cards} cards)</span>
          : null;
      }
      default:
        return null;
    }
  }

  // PhaseRunner step details
  switch (taskId) {
    case 'grammar': {
      const mastery = details.mastery as Array<{ target: string; state: string }> | undefined;
      if (!mastery?.length) return null;
      return (
        <span className="ml-2">
          {mastery.map((m, i) => (
            <span
              key={i}
              className={`inline-block px-1.5 py-0.5 rounded text-[10px] mr-1 ${
                m.state === 'mastered'
                  ? 'bg-emerald-100 text-emerald-700'
                  : m.state === 'struggling'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-slate-100 text-slate-600'
              }`}
            >
              {m.target}: {m.state}
            </span>
          ))}
        </span>
      );
    }
    case 'case_file': {
      const wordCount = details.wordCount;
      if (typeof wordCount !== 'number') return null;
      return <span className="ml-2 text-slate-400">({wordCount} words)</span>;
    }
    case 'voice_log': {
      const rubricChecks = details.rubricChecks;
      if (!Array.isArray(rubricChecks) || rubricChecks.length === 0) return null;
      return (
        <span className="ml-2 text-slate-400">
          ({rubricChecks.length} rubric item{rubricChecks.length !== 1 ? 's' : ''})
        </span>
      );
    }
    default:
      return null;
  }
}

function WritingDisplay({ details }: { details: Record<string, unknown> }) {
  const writings: Array<{ label: string; text: string }> = [];

  // ShiftReport / ContradictionReport: single text field
  if (typeof details.text === 'string') {
    writings.push({ label: 'Shift Report', text: details.text });
  }
  if (typeof details.writingText === 'string') {
    writings.push({ label: 'Report Writing', text: details.writingText });
  }

  // IntakeForm / PriorityBriefing: keyed by card index
  if (details.writingSubmissions && typeof details.writingSubmissions === 'object') {
    const subs = details.writingSubmissions as Record<string, string>;
    Object.entries(subs).forEach(([key, text]) => {
      writings.push({ label: `Card ${Number(key) + 1} Writing`, text });
    });
  }

  // PrioritySort: keyed by case ID
  if (details.justifications && typeof details.justifications === 'object') {
    const justs = details.justifications as Record<string, string>;
    Object.entries(justs).forEach(([caseId, text]) => {
      writings.push({ label: `Justification: ${caseId}`, text });
    });
  }

  if (writings.length === 0) {
    return (
      <div className="px-3 pb-3 text-xs text-slate-400 italic">
        No writing content saved.
      </div>
    );
  }

  return (
    <div className="px-3 pb-3 space-y-2">
      {writings.map((w, i) => (
        <div key={i} className="bg-slate-50 rounded-lg p-3 border border-slate-200">
          <div className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-1">
            {w.label}
          </div>
          <div className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
            {w.text}
          </div>
        </div>
      ))}
    </div>
  );
}
