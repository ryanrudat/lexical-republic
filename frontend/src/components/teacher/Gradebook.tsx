import { useEffect, useState } from 'react';
import { fetchGradebook } from '../../api/teacher';
import type { GradebookData, GradebookStudent, GradebookWeek, GradebookMissionScore } from '../../api/teacher';
import { STEP_ORDER } from '../../types/shifts';

const GRADED_STEPS = ['briefing', 'grammar', 'listening'];

const stepLabel = (stepId: string) =>
  STEP_ORDER.find((s) => s.id === stepId)?.label ?? stepId;

interface CellStatus {
  state: 'gray' | 'blue' | 'green' | 'amber';
  avgScore: number | null;
  scores: GradebookMissionScore[];
}

function computeCell(
  student: GradebookStudent,
  week: GradebookWeek
): CellStatus {
  const weekScores = student.missionScores.filter(
    (ms) => ms.mission.weekId === week.id
  );

  if (weekScores.length === 0) {
    return { state: 'gray', avgScore: null, scores: [] };
  }

  const clockOut = weekScores.find(
    (ms) => ms.mission.missionType === 'clock_out'
  );
  const isComplete =
    clockOut && (clockOut.details as any)?.status === 'complete';

  const gradedScores = weekScores.filter((ms) =>
    GRADED_STEPS.includes(ms.mission.missionType)
  );
  const avg =
    gradedScores.length > 0
      ? gradedScores.reduce((sum, ms) => sum + ms.score, 0) / gradedScores.length
      : null;

  if (!isComplete) {
    return { state: 'blue', avgScore: avg, scores: weekScores };
  }

  if (avg !== null && avg >= 0.7) {
    return { state: 'green', avgScore: avg, scores: weekScores };
  }

  return { state: 'amber', avgScore: avg, scores: weekScores };
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

  useEffect(() => {
    setLoading(true);
    setSelected(null);
    void fetchGradebook(classId || undefined)
      .then(setData)
      .finally(() => setLoading(false));
  }, [classId]);

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
}: {
  student: GradebookStudent;
  week: GradebookWeek;
  cell: CellStatus;
  onClose: () => void;
}) {
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
              Graded average: {Math.round(cell.avgScore * 100)}%
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-xs text-slate-400 hover:text-slate-600"
        >
          Close
        </button>
      </div>

      <div className="space-y-2">
        {STEP_ORDER.map((step) => {
          const score = cell.scores.find(
            (ms) => ms.mission.missionType === step.id
          );
          const isGraded = GRADED_STEPS.includes(step.id);
          const details = (score?.details ?? {}) as Record<string, unknown>;

          return (
            <div
              key={step.id}
              className="flex items-start gap-3 py-2 border-b border-slate-100 last:border-0"
            >
              <div className="w-28 shrink-0">
                <div className="text-xs font-medium text-slate-700">
                  {stepLabel(step.id)}
                </div>
                <div className="text-[10px] text-slate-400">{step.id}</div>
              </div>

              <div className="flex-1 text-xs text-slate-600">
                {score ? (
                  <>
                    <span
                      className={`font-semibold ${
                        isGraded
                          ? score.score >= 0.7
                            ? 'text-emerald-600'
                            : 'text-amber-600'
                          : 'text-slate-600'
                      }`}
                    >
                      {isGraded
                        ? `${Math.round(score.score * 100)}%`
                        : score.score >= 1
                          ? 'Pass'
                          : 'Incomplete'}
                    </span>
                    <StepDetails missionType={step.id} details={details} />
                  </>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StepDetails({
  missionType,
  details,
}: {
  missionType: string;
  details: Record<string, unknown>;
}) {
  switch (missionType) {
    case 'grammar': {
      const mastery = details.mastery as
        | Array<{ target: string; state: string }>
        | undefined;
      if (!mastery?.length) return null;
      return (
        <div className="mt-1 flex flex-wrap gap-1">
          {mastery.map((m, i) => (
            <span
              key={i}
              className={`px-1.5 py-0.5 rounded text-[10px] ${
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
        </div>
      );
    }
    case 'case_file': {
      const wordCount = details.wordCount;
      if (typeof wordCount !== 'number') return null;
      return (
        <span className="ml-2 text-slate-400">({wordCount} words)</span>
      );
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
