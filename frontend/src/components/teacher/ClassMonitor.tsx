import { useEffect, useState } from 'react';
import { fetchStudents } from '../../api/teacher';
import { useTeacherStore } from '../../stores/teacherStore';
import { STEP_ORDER } from '../../types/shifts';
import type { StudentSummary } from '../../types/shifts';

const stepLabel = (stepId: string) =>
  STEP_ORDER.find((s) => s.id === stepId)?.label ?? stepId;

export default function ClassMonitor({ classId }: { classId?: string | null }) {
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const onlineStudents = useTeacherStore((s) => s.onlineStudents);

  useEffect(() => {
    setLoading(true);
    void fetchStudents(classId || undefined)
      .then(setStudents)
      .finally(() => setLoading(false));
  }, [classId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm text-indigo-500 animate-pulse">Loading class data...</div>
      </div>
    );
  }

  // Merge REST student list with real-time online data, sort online-first then by designation
  const merged = students
    .map((s) => ({
      ...s,
      online: onlineStudents.get(s.id) ?? null,
    }))
    .sort((a, b) => {
      if (a.online && !b.online) return -1;
      if (!a.online && b.online) return 1;
      return (a.designation ?? '').localeCompare(b.designation ?? '');
    });

  const onlineCount = merged.filter((s) => s.online).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800">
          Live Class Monitor
        </h2>
        <span className="text-sm text-slate-500">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-1.5" />
          {onlineCount} online / {students.length} total
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {merged.map((student) => (
          <div
            key={student.id}
            className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-start gap-3"
          >
            {/* Designation badge */}
            <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-indigo-600">
                {student.designation || '??'}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-block w-2 h-2 rounded-full shrink-0 ${
                    student.online ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                />
                <h3 className="text-sm font-medium text-slate-800 truncate">
                  {student.displayName}
                </h3>
              </div>

              {student.online ? (
                <div className="mt-1 text-xs text-slate-500">
                  {student.online.weekNumber ? (
                    <>
                      Shift {student.online.weekNumber}
                      {student.online.stepId && (
                        <span className="text-indigo-600 ml-1">
                          — {stepLabel(student.online.stepId)}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-emerald-600">Connected</span>
                  )}
                </div>
              ) : (
                <div className="mt-1 text-xs text-slate-400">Offline</div>
              )}

              <div className="mt-1.5 flex items-center gap-3 text-xs text-slate-400">
                <span>{student.weeksCompleted}/18 shifts</span>
                {student.lastLoginAt && (
                  <span>
                    Last: {new Date(student.lastLoginAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {students.length === 0 && (
        <div className="text-center py-12 text-sm text-slate-400">
          No students registered yet.
        </div>
      )}
    </div>
  );
}
