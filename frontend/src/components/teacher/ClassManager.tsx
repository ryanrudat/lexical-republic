import { useState, useEffect, useCallback } from 'react';
import {
  createClass,
  regenerateClassCode,
  unlockWeek,
  lockWeek,
  deleteClass,
  removeStudentFromClass,
  fetchClassDetail,
  fetchWeekBriefings,
} from '../../api/teacher';
import type { ClassInfo, ClassStudent, WeekBriefingSetting } from '../../api/teacher';

interface Props {
  classes: ClassInfo[];
  onRefresh: () => Promise<void>;
}

type ConfirmAction =
  | { type: 'delete-class'; classId: string; className: string }
  | { type: 'remove-student'; classId: string; studentId: string; studentName: string };

export default function ClassManager({ classes, onRefresh }: Props) {
  const [newClassName, setNewClassName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [expandedClassId, setExpandedClassId] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<'weeks' | 'students' | null>(null);
  const [weeks, setWeeks] = useState<WeekBriefingSetting[]>([]);
  const [weeksLoaded, setWeeksLoaded] = useState(false);
  const [classStudents, setClassStudents] = useState<Record<string, ClassStudent[]>>({});
  const [loadingStudents, setLoadingStudents] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmAction | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!weeksLoaded) {
      void fetchWeekBriefings().then((w) => {
        setWeeks(w);
        setWeeksLoaded(true);
      });
    }
  }, [weeksLoaded]);

  const loadStudents = useCallback(async (classId: string) => {
    setLoadingStudents(classId);
    try {
      const detail = await fetchClassDetail(classId);
      setClassStudents((prev) => ({ ...prev, [classId]: detail.students }));
    } catch (err) {
      console.error('Failed to load class students:', err);
    } finally {
      setLoadingStudents(null);
    }
  }, []);

  const handleCreate = async () => {
    if (!newClassName.trim()) return;
    setCreating(true);
    setError('');
    try {
      await createClass(newClassName.trim());
      setNewClassName('');
      await onRefresh();
    } catch (err: unknown) {
      const e = err as Record<string, Record<string, Record<string, string>>>;
      const msg = e?.response?.data?.error || (err instanceof Error ? err.message : '') || 'Failed to create class';
      setError(msg);
      console.error('Failed to create class:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleRegenCode = async (classId: string) => {
    try {
      await regenerateClassCode(classId);
      await onRefresh();
    } catch (err) {
      console.error('Failed to regenerate code:', err);
    }
  };

  const handleToggleWeek = async (classId: string, weekId: string, isUnlocked: boolean) => {
    try {
      if (isUnlocked) {
        await lockWeek(classId, weekId);
      } else {
        await unlockWeek(classId, weekId);
      }
      await onRefresh();
    } catch (err) {
      console.error('Failed to toggle week:', err);
    }
  };

  const handleExpand = (classId: string, section: 'weeks' | 'students') => {
    if (expandedClassId === classId && expandedSection === section) {
      setExpandedClassId(null);
      setExpandedSection(null);
    } else {
      setExpandedClassId(classId);
      setExpandedSection(section);
      if (section === 'students' && !classStudents[classId]) {
        void loadStudents(classId);
      }
    }
  };

  const executeConfirm = async () => {
    if (!confirm) return;
    setActionLoading(true);
    try {
      if (confirm.type === 'delete-class') {
        await deleteClass(confirm.classId);
        // Clear expanded state if this class was expanded
        if (expandedClassId === confirm.classId) {
          setExpandedClassId(null);
          setExpandedSection(null);
        }
      } else {
        await removeStudentFromClass(confirm.classId, confirm.studentId);
        // Refresh student list for this class
        await loadStudents(confirm.classId);
      }
      await onRefresh();
    } catch (err) {
      console.error('Action failed:', err);
    } finally {
      setActionLoading(false);
      setConfirm(null);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <h2 className="text-lg font-semibold text-slate-800 mb-4">Classes</h2>

      {/* Create new class */}
      <div className="flex items-center gap-2 mb-5">
        <input
          type="text"
          value={newClassName}
          onChange={(e) => setNewClassName(e.target.value)}
          placeholder="New class name (e.g. 110-B)"
          className="flex-1 text-sm border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
        />
        <button
          onClick={handleCreate}
          disabled={creating || !newClassName.trim()}
          className="text-sm px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 transition-colors font-medium"
        >
          {creating ? 'Creating...' : 'Create Class'}
        </button>
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      {/* Class list */}
      <div className="space-y-3">
        {classes.map((cls) => {
          const isWeeksExpanded = expandedClassId === cls.id && expandedSection === 'weeks';
          const isStudentsExpanded = expandedClassId === cls.id && expandedSection === 'students';
          const students = classStudents[cls.id] || [];

          return (
            <div key={cls.id} className="border border-slate-200 rounded-lg">
              {/* Class header */}
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-slate-800">{cls.name}</span>
                  <span className="text-xs text-slate-500">{cls.studentCount} students</span>
                </div>
                <div className="flex items-center gap-2">
                  {/* Join code badge */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-400">Code:</span>
                    <code className="text-sm font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                      {cls.joinCode}
                    </code>
                    <button
                      onClick={() => handleRegenCode(cls.id)}
                      className="text-[10px] text-slate-400 hover:text-slate-600"
                      title="Regenerate join code"
                    >
                      ↻
                    </button>
                  </div>
                  <button
                    onClick={() => handleExpand(cls.id, 'students')}
                    className={`text-xs px-2 py-1 rounded-md font-medium transition-colors ${
                      isStudentsExpanded
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'text-indigo-600 hover:bg-indigo-50'
                    }`}
                  >
                    Students
                  </button>
                  <button
                    onClick={() => handleExpand(cls.id, 'weeks')}
                    className={`text-xs px-2 py-1 rounded-md font-medium transition-colors ${
                      isWeeksExpanded
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'text-indigo-600 hover:bg-indigo-50'
                    }`}
                  >
                    Weeks
                  </button>
                  <button
                    onClick={() => setConfirm({ type: 'delete-class', classId: cls.id, className: cls.name })}
                    className="text-xs px-2 py-1 rounded-md text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors"
                    title="Delete class"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {/* Week unlock controls */}
              {isWeeksExpanded && (
                <div className="border-t border-slate-100 px-4 py-3">
                  <div className="grid grid-cols-6 sm:grid-cols-9 lg:grid-cols-18 gap-1.5">
                    {weeks.map((week) => {
                      const isUnlocked = cls.unlockedWeekIds.includes(week.id);
                      return (
                        <button
                          key={week.id}
                          onClick={() => handleToggleWeek(cls.id, week.id, isUnlocked)}
                          className={`text-xs py-1.5 rounded-md font-medium transition-colors ${
                            isUnlocked
                              ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                              : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                          }`}
                          title={`Shift ${week.weekNumber}: ${week.title} — ${isUnlocked ? 'Click to lock' : 'Click to unlock'}`}
                        >
                          {week.weekNumber}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2">
                    Green = unlocked. Click to toggle.
                  </p>
                </div>
              )}

              {/* Student list */}
              {isStudentsExpanded && (
                <div className="border-t border-slate-100 px-4 py-3">
                  {loadingStudents === cls.id ? (
                    <div className="text-xs text-slate-400 animate-pulse py-2">Loading students...</div>
                  ) : students.length === 0 ? (
                    <div className="text-xs text-slate-400 py-2">No students enrolled.</div>
                  ) : (
                    <div className="space-y-1">
                      <div className="grid grid-cols-[auto_1fr_auto_auto] gap-x-3 items-center text-[10px] text-slate-400 uppercase tracking-wider font-medium pb-1 border-b border-slate-100">
                        <span>ID</span>
                        <span>Name</span>
                        <span>Lane</span>
                        <span></span>
                      </div>
                      {students.map((s) => (
                        <div
                          key={s.id}
                          className="grid grid-cols-[auto_1fr_auto_auto] gap-x-3 items-center py-1.5 hover:bg-slate-50 rounded-md px-1"
                        >
                          <code className="text-xs font-medium text-indigo-600">
                            {s.designation || s.id.slice(0, 6)}
                          </code>
                          <span className="text-xs text-slate-700 truncate">{s.displayName}</span>
                          <span className="text-[10px] text-slate-400">L{s.lane}</span>
                          <button
                            onClick={() => setConfirm({
                              type: 'remove-student',
                              classId: cls.id,
                              studentId: s.id,
                              studentName: s.displayName,
                            })}
                            className="text-[10px] text-red-400 hover:text-red-600 transition-colors px-1"
                            title="Remove student from class"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {students.length > 0 && (
                    <button
                      onClick={() => loadStudents(cls.id)}
                      className="mt-2 text-[10px] text-indigo-500 hover:text-indigo-700"
                    >
                      Refresh list
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {classes.length === 0 && (
        <div className="text-center py-8 text-sm text-slate-400">
          No classes yet. Create your first class above.
        </div>
      )}

      {/* Confirmation dialog */}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4 space-y-4">
            <h3 className="text-base font-semibold text-slate-800">
              {confirm.type === 'delete-class' ? 'Delete Class' : 'Remove Student'}
            </h3>
            <p className="text-sm text-slate-600">
              {confirm.type === 'delete-class' ? (
                <>
                  Delete class <span className="font-semibold">{confirm.className}</span> and all associated data?
                  This will remove all enrollments and cannot be undone.
                </>
              ) : (
                <>
                  Remove <span className="font-semibold">{confirm.studentName}</span> from this class?
                  Their account will remain but they will be unenrolled.
                </>
              )}
            </p>
            <div className="flex gap-2 justify-end pt-2">
              <button
                className="px-4 py-2 text-sm rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                onClick={() => setConfirm(null)}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors font-medium disabled:opacity-50"
                onClick={executeConfirm}
                disabled={actionLoading}
              >
                {actionLoading ? 'Processing...' : confirm.type === 'delete-class' ? 'Delete Class' : 'Remove Student'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
