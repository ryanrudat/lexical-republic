import { useEffect, useState, useCallback, useRef } from 'react';
import { fetchStudents, deleteStudent, deleteAllStudents, sendTaskCommand, fetchShiftStatus, setStudentLane, moveStudentToShift, moveClassToShift } from '../../api/teacher';
import type { ShiftStatus } from '../../api/teacher';
import { useTeacherStore } from '../../stores/teacherStore';
import { getSocket } from '../../utils/socket';
import { STEP_ORDER } from '../../types/shifts';
import type { StudentSummary } from '../../types/shifts';
import ClarityMinderThread from './ClarityMinderThread';
import ShiftReviewModal from './ShiftReviewModal';
import { getAvailableShifts } from '../../data/narrative-routes';

const stepLabel = (stepId: string) =>
  STEP_ORDER.find((s) => s.id === stepId)?.label ?? stepId;

const WARN_TIME_MS = 5 * 60 * 1000;   // 5 min → yellow
const ALERT_TIME_MS = 8 * 60 * 1000;  // 8 min → red
const FAIL_ALERT_THRESHOLD = 2;        // 2 fails → red
const AUTO_REFRESH_MS = 30_000;        // 30s auto-refresh

type FlagLevel = 'ok' | 'warn' | 'alert';

function getFlag(taskStartedAt: string | null, failCount: number, now: number): FlagLevel {
  const elapsed = taskStartedAt ? now - new Date(taskStartedAt).getTime() : 0;
  if (elapsed >= ALERT_TIME_MS || failCount >= FAIL_ALERT_THRESHOLD) return 'alert';
  if (elapsed >= WARN_TIME_MS || failCount === 1) return 'warn';
  return 'ok';
}

function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  if (totalSec < 60) return `${totalSec}s`;
  return `${Math.floor(totalSec / 60)}m`;
}

export default function ClassMonitor({ classId, narrativeRoute }: { classId?: string | null; narrativeRoute?: string }) {
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [pauseElapsed, setPauseElapsed] = useState(0);
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    studentId: string;
    designation: string;
    action: 'skip-task' | 'reset-task' | 'reset-shift' | 'send-to-task' | 'delete-student' | 'delete-all' | 'move-to-shift' | 'move-class-to-shift';
    taskId?: string;
    taskLabel?: string;
    weekNumber?: number;
  } | null>(null);
  const [showClassShiftSelector, setShowClassShiftSelector] = useState(false);
  const [showReviewShiftSelector, setShowReviewShiftSelector] = useState(false);
  const [reviewShiftNumber, setReviewShiftNumber] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  // Cache of shift status fetched from backend for offline students
  const [offlineStatus, setOfflineStatus] = useState<Map<string, ShiftStatus>>(new Map());
  const [statusLoading, setStatusLoading] = useState<Set<string>>(new Set());

  const onlineStudents = useTeacherStore((s) => s.onlineStudents);
  const lastKnownStatus = useTeacherStore((s) => s.lastKnownStatus);
  const socketStatus = useTeacherStore((s) => s.socketStatus);
  const registrationTick = useTeacherStore((s) => s.registrationTick);
  const classPaused = useTeacherStore((s) => s.classPaused);
  const selectedClassId = useTeacherStore((s) => s.selectedClassId);

  const loadStudents = useCallback(() => {
    setLoading(true);
    void fetchStudents(classId || undefined)
      .then(setStudents)
      .finally(() => setLoading(false));
  }, [classId]);

  // Refresh on mount, classId change, or when a new student registers
  useEffect(() => {
    loadStudents();
  }, [loadStudents, registrationTick]);

  // Auto-refresh student list every 30 seconds to catch missed socket events
  useEffect(() => {
    const interval = setInterval(loadStudents, AUTO_REFRESH_MS);
    return () => clearInterval(interval);
  }, [loadStudents]);

  // Update time-on-task display every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(interval);
  }, []);

  // Track pause elapsed time
  useEffect(() => {
    if (!classPaused) {
      setPauseElapsed(0);
      return;
    }
    const start = Date.now();
    const interval = setInterval(() => setPauseElapsed(Date.now() - start), 1000);
    return () => clearInterval(interval);
  }, [classPaused]);

  // Fetch shift status from backend when expanding an offline student
  const fetchedRef = useRef(new Set<string>());
  const loadOfflineStatus = useCallback((studentId: string) => {
    if (fetchedRef.current.has(studentId)) return;
    fetchedRef.current.add(studentId);
    setStatusLoading((prev) => new Set(prev).add(studentId));
    fetchShiftStatus(studentId)
      .then((status) => {
        setOfflineStatus((prev) => {
          const next = new Map(prev);
          next.set(studentId, status);
          return next;
        });
      })
      .catch(() => {})
      .finally(() => {
        setStatusLoading((prev) => {
          const next = new Set(prev);
          next.delete(studentId);
          return next;
        });
      });
  }, []);

  // Re-fetch shift status after a task command (skip/reset/send-to) for offline students
  const refreshOfflineStatus = useCallback((studentId: string) => {
    fetchedRef.current.delete(studentId);
    setOfflineStatus((prev) => {
      const next = new Map(prev);
      next.delete(studentId);
      return next;
    });
    // Small delay for the DB write to settle, then re-fetch
    setTimeout(() => {
      fetchedRef.current.add(studentId);
      fetchShiftStatus(studentId)
        .then((status) => {
          setOfflineStatus((prev) => {
            const next = new Map(prev);
            next.set(studentId, status);
            return next;
          });
        })
        .catch(() => {});
    }, 500);
  }, []);

  const handlePause = () => {
    const sock = getSocket();
    if (!sock) return;
    sock.emit('teacher:pause-all', { classId: selectedClassId ?? undefined });
  };

  const handleResume = () => {
    const sock = getSocket();
    if (!sock) return;
    sock.emit('teacher:resume-all', { classId: selectedClassId ?? undefined });
  };

  const executeAction = useCallback(async () => {
    if (!confirmAction) return;

    const { studentId, action, taskId } = confirmAction;

    // Handle delete actions
    if (action === 'delete-student') {
      setDeleteLoading(true);
      try {
        await deleteStudent(studentId);
        loadStudents();
      } catch (err) {
        console.error('Failed to delete student:', err);
      } finally {
        setDeleteLoading(false);
        setConfirmAction(null);
      }
      return;
    }
    if (action === 'delete-all') {
      setDeleteLoading(true);
      try {
        await deleteAllStudents();
        loadStudents();
      } catch (err) {
        console.error('Failed to delete all students:', err);
      } finally {
        setDeleteLoading(false);
        setConfirmAction(null);
      }
      return;
    }

    // Move-to-shift actions
    if (action === 'move-to-shift' && confirmAction.weekNumber) {
      try {
        await moveStudentToShift(studentId, confirmAction.weekNumber);
        loadStudents();
        // Clear cached offline status so it refreshes
        setOfflineStatus(prev => {
          const next = new Map(prev);
          next.delete(studentId);
          return next;
        });
      } catch (err) {
        console.error('Move to shift failed:', err);
      }
      setConfirmAction(null);
      return;
    }
    if (action === 'move-class-to-shift' && confirmAction.weekNumber && selectedClassId) {
      try {
        await moveClassToShift(selectedClassId, confirmAction.weekNumber);
        loadStudents();
        setOfflineStatus(new Map());
        setShowClassShiftSelector(false);
      } catch (err) {
        console.error('Class move to shift failed:', err);
      }
      setConfirmAction(null);
      return;
    }

    // REST API persists to DB + relays via socket to online students
    try {
      await sendTaskCommand(studentId, action as 'skip-task' | 'reset-task' | 'reset-shift' | 'send-to-task', taskId);
      // If student is offline, refresh their cached status
      if (!onlineStudents.has(studentId)) {
        refreshOfflineStatus(studentId);
      }
    } catch (err) {
      console.error('Task command failed:', err);
    }
    setConfirmAction(null);
  }, [confirmAction, onlineStudents, refreshOfflineStatus, loadStudents, selectedClassId]);

  const actionLabels: Record<string, string> = {
    'skip-task': 'Skip Current Task',
    'reset-task': 'Reset Current Task',
    'reset-shift': 'Reset Entire Shift',
    'send-to-task': 'Send to Task',
    'delete-student': 'Permanently Delete Student',
    'delete-all': 'Delete ALL Students',
    'move-to-shift': 'Move to Shift',
    'move-class-to-shift': 'Move Class to Shift',
  };

  // Available shifts — derived from narrative route, filtered to built content
  const AVAILABLE_SHIFTS = getAvailableShifts(narrativeRoute);

  if (loading && students.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm text-indigo-500 animate-pulse">Loading class data...</div>
      </div>
    );
  }

  // Merge REST student list with real-time online data + last-known status
  const merged = students
    .map((s) => ({
      ...s,
      online: onlineStudents.get(s.id) ?? null,
      lastKnown: lastKnownStatus.get(s.id) ?? null,
      offlineShift: offlineStatus.get(s.id) ?? null,
    }))
    .sort((a, b) => {
      if (a.online && !b.online) return -1;
      if (!a.online && b.online) return 1;
      return (a.designation ?? '').localeCompare(b.designation ?? '');
    });

  const onlineCount = merged.filter((s) => s.online).length;

  // Struggle flag summary
  let okCount = 0;
  let warnCount = 0;
  let alertCount = 0;
  for (const s of merged) {
    if (!s.online) continue;
    const flag = getFlag(s.online.taskStartedAt, s.online.failCount, now);
    if (flag === 'ok') okCount++;
    else if (flag === 'warn') warnCount++;
    else alertCount++;
  }

  return (
    <div className="space-y-4">
      {/* Pause / Resume button */}
      <div className="flex items-center gap-3">
        {classPaused ? (
          <button
            onClick={handleResume}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 text-white font-semibold text-sm shadow-md hover:bg-emerald-700 transition-colors animate-pulse"
          >
            <span>&#9654;</span> RESUME ALL
          </button>
        ) : (
          <button
            onClick={handlePause}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-red-600 text-white font-semibold text-sm shadow-md hover:bg-red-700 transition-colors"
          >
            <span>&#9208;</span> PAUSE ALL STUDENTS
          </button>
        )}
        {classPaused && pauseElapsed > 0 && (
          <span className="text-sm text-slate-500">
            Paused for {formatElapsed(pauseElapsed)}
          </span>
        )}
        {students.length > 0 && (
          <button
            onClick={() => {
              setShowReviewShiftSelector(v => !v);
              if (showClassShiftSelector) setShowClassShiftSelector(false);
            }}
            className={`px-3 py-2 text-xs rounded-lg border transition-colors ${
              showReviewShiftSelector
                ? 'bg-indigo-100 text-indigo-700 border-indigo-300'
                : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
            }`}
            title="See every student's work for a specific shift"
          >
            Review Shift
          </button>
        )}
        {students.length > 0 && (
          <button
            onClick={() => {
              setShowClassShiftSelector(v => !v);
              if (showReviewShiftSelector) setShowReviewShiftSelector(false);
            }}
            className={`px-3 py-2 text-xs rounded-lg border transition-colors ${
              showClassShiftSelector
                ? 'bg-indigo-100 text-indigo-700 border-indigo-300'
                : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
            }`}
          >
            Move Class to Shift
          </button>
        )}
      </div>
      {showReviewShiftSelector && (
        <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-4 py-2">
          <span className="text-xs text-slate-500 mr-1">Review which shift:</span>
          {AVAILABLE_SHIFTS.map((wn) => (
            <button
              key={wn}
              className="px-3 py-1 text-xs rounded-md border bg-white text-slate-600 border-slate-200 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 transition-colors"
              onClick={() => {
                setReviewShiftNumber(wn);
                setShowReviewShiftSelector(false);
              }}
            >
              Shift {wn}
            </button>
          ))}
        </div>
      )}
      {showClassShiftSelector && (
        <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-4 py-2">
          <span className="text-xs text-slate-500 mr-1">Move all students to:</span>
          {AVAILABLE_SHIFTS.map((wn) => (
            <button
              key={wn}
              className="px-3 py-1 text-xs rounded-md border bg-white text-slate-600 border-slate-200 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 transition-colors"
              onClick={() => setConfirmAction({
                studentId: '',
                designation: '',
                action: 'move-class-to-shift',
                weekNumber: wn,
              })}
            >
              Shift {wn}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-slate-800">
            Live Class Monitor
          </h2>
          {/* Socket connection indicator */}
          <span
            className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full ${
              socketStatus === 'connected'
                ? 'bg-emerald-50 text-emerald-600'
                : socketStatus === 'connecting'
                ? 'bg-amber-50 text-amber-600'
                : socketStatus === 'error'
                ? 'bg-red-50 text-red-600'
                : 'bg-slate-100 text-slate-400'
            }`}
            title={
              socketStatus === 'connected'
                ? 'Real-time updates active'
                : socketStatus === 'connecting'
                ? 'Connecting to server...'
                : socketStatus === 'error'
                ? 'Connection error — retrying...'
                : 'Disconnected'
            }
          >
            <span
              className={`inline-block w-1.5 h-1.5 rounded-full ${
                socketStatus === 'connected'
                  ? 'bg-emerald-500'
                  : socketStatus === 'connecting'
                  ? 'bg-amber-500 animate-pulse'
                  : socketStatus === 'error'
                  ? 'bg-red-500'
                  : 'bg-slate-400'
              }`}
            />
            {socketStatus === 'connected'
              ? 'Live'
              : socketStatus === 'connecting'
              ? 'Connecting'
              : socketStatus === 'error'
              ? 'Error'
              : 'Offline'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadStudents}
            className="text-xs px-2.5 py-1 rounded-md bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors"
            title="Refresh student list"
          >
            Refresh
          </button>
          {students.length > 0 && (
            <button
              onClick={() => setConfirmAction({
                studentId: '',
                designation: '',
                action: 'delete-all',
              })}
              className="text-xs px-2.5 py-1 rounded-md bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-700 transition-colors"
              title="Delete all students permanently"
            >
              Delete All
            </button>
          )}
          <span className="text-sm text-slate-500">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-1.5" />
            {onlineCount} online / {students.length} total
          </span>
        </div>
      </div>

      {/* Struggle flag summary */}
      {onlineCount > 0 && (
        <div className="flex items-center gap-4 text-xs text-slate-600 bg-slate-50 rounded-lg px-4 py-2">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500" />
            {okCount} on track
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-400" />
            {warnCount} may need help
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500" />
            {alertCount} stuck
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {merged.map((student) => {
          const flag = student.online
            ? getFlag(student.online.taskStartedAt, student.online.failCount, now)
            : 'ok';
          const flagBorder =
            flag === 'alert'
              ? 'border-red-400 bg-red-50/50'
              : flag === 'warn'
              ? 'border-amber-300 bg-amber-50/50'
              : 'border-slate-200';
          const isExpanded = expandedStudent === student.id;
          const lk = student.lastKnown;
          const shiftStatus = student.offlineShift;

          // Determine task list for "Send to Task" — prefer online, then last-known (preserved
          // on disconnect), then DB-fetched shift status. lastKnown keeps the task list available
          // immediately when a student's socket drops due to idle/background-tab throttling.
          const taskList = student.online?.tasks && student.online.tasks.length > 0
            ? student.online.tasks
            : lk?.tasks && lk.tasks.length > 0
              ? lk.tasks
              : shiftStatus?.tasks ?? [];
          const currentTaskId = student.online?.taskId
            ?? lk?.taskId
            ?? (shiftStatus && shiftStatus.currentTaskIndex >= 0 ? shiftStatus.tasks[shiftStatus.currentTaskIndex]?.id : null);

          return (
            <div
              key={student.id}
              className={`rounded-xl border shadow-sm p-4 ${flagBorder} cursor-pointer`}
              onClick={() => {
                const nextExpanded = isExpanded ? null : student.id;
                setExpandedStudent(nextExpanded);
                // Auto-fetch shift status for offline students when expanding
                if (nextExpanded && !student.online) {
                  loadOfflineStatus(student.id);
                }
              }}
            >
              <div className="flex items-start gap-3">
                {/* Designation badge */}
                <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0 relative">
                  <span className="text-xs font-bold text-indigo-600">
                    {student.designation || '??'}
                  </span>
                  {flag === 'alert' && (
                    <span className="absolute -top-1 -right-1 text-xs" title="Stuck">&#128308;</span>
                  )}
                  {flag === 'warn' && (
                    <span className="absolute -top-1 -right-1 text-xs" title="May need help">&#9888;&#65039;</span>
                  )}
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
                    <span className="text-[10px] text-slate-300 ml-auto shrink-0">
                      {isExpanded ? '▲' : '▼'}
                    </span>
                  </div>

                  {student.online ? (
                    <div className="mt-1 space-y-0.5">
                      <div className="text-xs text-slate-500">
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

                      {/* Task info + time on task */}
                      {student.online.taskLabel ? (
                        <div className="text-[11px] text-slate-400 flex items-center gap-2">
                          <span className="truncate">
                            Task: {student.online.taskLabel}
                          </span>
                          {student.online.taskStartedAt && (
                            <span className={`shrink-0 font-medium ${
                              flag === 'alert' ? 'text-red-500' : flag === 'warn' ? 'text-amber-500' : ''
                            }`}>
                              {formatElapsed(now - new Date(student.online.taskStartedAt).getTime())}
                            </span>
                          )}
                          {student.online.failCount > 0 && (
                            <span className="shrink-0 text-red-400" title="Failed attempts">
                              {student.online.failCount} fail{student.online.failCount !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      ) : student.online.weekNumber ? (
                        <div className="text-[11px] text-slate-400 animate-pulse">
                          Loading task info...
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="mt-1 space-y-0.5">
                      <div className="text-xs text-slate-400">
                        Offline
                        {/* Show last-known shift/task from socket memory */}
                        {lk?.weekNumber && (
                          <span className="text-slate-500 ml-1">
                            — last seen: Shift {lk.weekNumber}
                            {lk.taskLabel && <>, {lk.taskLabel}</>}
                          </span>
                        )}
                      </div>
                      {/* Show DB-based progress if fetched */}
                      {shiftStatus && (
                        <div className="text-[11px] text-indigo-500">
                          Shift {shiftStatus.weekNumber}: {shiftStatus.completedTasks}/{shiftStatus.totalTasks} tasks done
                          {shiftStatus.currentTaskIndex >= 0 && shiftStatus.tasks[shiftStatus.currentTaskIndex] && (
                            <span className="text-slate-500">
                              {' '}— next: {shiftStatus.tasks[shiftStatus.currentTaskIndex].label}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-1.5 flex items-center gap-3 text-xs text-slate-400">
                    <span>{student.weeksCompleted}/18 shifts</span>
                    {student.lastLoginAt && (
                      <span>
                        Last: {new Date(student.lastLoginAt).toLocaleDateString()}
                      </span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmAction({
                          studentId: student.id,
                          designation: student.designation ?? student.displayName,
                          action: 'delete-student',
                        });
                      }}
                      className="ml-auto text-[10px] text-red-400 hover:text-red-600 transition-colors"
                      title="Delete student permanently"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>

              {/* Expanded task controls */}
              {isExpanded && (
                <div
                  className="mt-3 pt-3 border-t border-slate-200 space-y-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                    Task Controls
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      className="px-2.5 py-1 text-[11px] rounded-md bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors"
                      onClick={() => setConfirmAction({
                        studentId: student.id,
                        designation: student.designation ?? '??',
                        action: 'skip-task',
                      })}
                    >
                      Skip Task
                    </button>
                    <button
                      className="px-2.5 py-1 text-[11px] rounded-md bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
                      onClick={() => setConfirmAction({
                        studentId: student.id,
                        designation: student.designation ?? '??',
                        action: 'reset-task',
                      })}
                    >
                      Reset Task
                    </button>
                    <button
                      className="px-2.5 py-1 text-[11px] rounded-md bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-colors"
                      onClick={() => setConfirmAction({
                        studentId: student.id,
                        designation: student.designation ?? '??',
                        action: 'reset-shift',
                      })}
                    >
                      Reset Shift
                    </button>
                  </div>

                  {/* Send to specific task — works for BOTH online and offline students */}
                  {taskList.length > 0 && (
                    <div className="mt-1">
                      <div className="text-[10px] text-slate-400 mb-1">
                        Send to task{!student.online && ' (from saved progress)'}:
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {taskList.map((t) => {
                          const isCurrent = student.online
                            ? student.online.taskId === t.id
                            : currentTaskId === t.id;
                          const isComplete = 'complete' in t && (t as { complete?: boolean }).complete;
                          return (
                            <button
                              key={t.id}
                              className={`px-2 py-0.5 text-[10px] rounded border transition-colors ${
                                isCurrent
                                  ? 'bg-indigo-100 text-indigo-700 border-indigo-300 font-semibold'
                                  : isComplete
                                  ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                  : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                              }`}
                              onClick={() => setConfirmAction({
                                studentId: student.id,
                                designation: student.designation ?? '??',
                                action: 'send-to-task',
                                taskId: t.id,
                                taskLabel: t.label,
                              })}
                            >
                              {isComplete && <span className="mr-0.5">&#10003;</span>}
                              {t.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {!student.online && statusLoading.has(student.id) && taskList.length === 0 && (
                    <div className="text-[10px] text-slate-400 animate-pulse">Loading task list...</div>
                  )}

                  {/* Difficulty Tier selector */}
                  <div className="mt-2 pt-2 border-t border-slate-200">
                    <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      Difficulty Tier
                    </div>
                    <div className="flex items-center gap-1.5">
                      {([1, 2, 3] as const).map((tier) => {
                        const isCurrent = student.lane === tier;
                        const labels = ['Guided', 'Standard', 'Independent'] as const;
                        const colors = isCurrent
                          ? tier === 1
                            ? 'bg-sky-100 text-sky-700 border-sky-300 font-semibold'
                            : tier === 2
                            ? 'bg-slate-200 text-slate-700 border-slate-400 font-semibold'
                            : 'bg-amber-100 text-amber-700 border-amber-300 font-semibold'
                          : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100 hover:text-slate-600';
                        return (
                          <button
                            key={tier}
                            className={`px-2.5 py-1 text-[11px] rounded-md border transition-colors ${colors}`}
                            onClick={() => {
                              if (isCurrent) return;
                              void setStudentLane(student.id, tier).then(loadStudents);
                            }}
                          >
                            {tier} {labels[tier - 1]}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-[9px] text-slate-400 mt-1">
                      {student.lane === 1
                        ? 'Sentence starters, Chinese word bank, 20-word min, grammar hints'
                        : student.lane === 3
                        ? 'No scaffolding, 40-word min, bonus prompts, stricter evaluation'
                        : 'English word list, 30-word min, standard evaluation'}
                    </p>
                  </div>

                  {/* Move to Shift */}
                  <div className="mt-2 pt-2 border-t border-slate-200">
                    <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      Move to Shift
                    </div>
                    <div className="flex items-center gap-1.5">
                      {AVAILABLE_SHIFTS.map((wn) => {
                        const studentWeek = student.online?.weekNumber ?? lk?.weekNumber ?? shiftStatus?.weekNumber ?? 1;
                        const isCurrent = studentWeek === wn;
                        return (
                          <button
                            key={wn}
                            className={`px-2.5 py-1 text-[11px] rounded-md border transition-colors ${
                              isCurrent
                                ? 'bg-indigo-100 text-indigo-700 border-indigo-300 font-semibold'
                                : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100 hover:text-slate-700'
                            }`}
                            onClick={() => setConfirmAction({
                              studentId: student.id,
                              designation: student.designation ?? '??',
                              action: 'move-to-shift',
                              weekNumber: wn,
                            })}
                          >
                            {isCurrent && <span className="mr-0.5">&#9679;</span>}
                            Shift {wn}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Clarity Minder: teacher↔student direct messaging */}
                  <div className="mt-2 pt-2 border-t border-slate-200">
                    <ClarityMinderThread
                      studentId={student.id}
                      designation={student.designation ?? '??'}
                      weekNumber={student.online?.weekNumber ?? lk?.weekNumber ?? shiftStatus?.weekNumber ?? null}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {students.length === 0 && (
        <div className="text-center py-12 text-sm text-slate-400">
          No students registered yet.
        </div>
      )}

      {/* Confirmation dialog */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4 space-y-4">
            <h3 className="text-base font-semibold text-slate-800">
              {confirmAction.action === 'delete-student' || confirmAction.action === 'delete-all'
                ? 'Confirm Deletion'
                : 'Confirm Action'}
            </h3>
            <p className="text-sm text-slate-600">
              {confirmAction.action === 'delete-all' ? (
                <>
                  Delete <span className="font-semibold text-red-600">ALL {students.length} students</span> and their data permanently? This cannot be undone.
                </>
              ) : confirmAction.action === 'delete-student' ? (
                <>
                  Permanently delete <span className="font-semibold text-red-600">{confirmAction.designation}</span> and all their scores, recordings, and progress? This cannot be undone.
                </>
              ) : confirmAction.action === 'move-class-to-shift' ? (
                <>
                  Move <span className="font-semibold text-indigo-600">ALL {students.length} students</span> to <span className="font-semibold">Shift {confirmAction.weekNumber}</span>? Progress from Shift {confirmAction.weekNumber} onward will be reset for every student.
                </>
              ) : confirmAction.action === 'move-to-shift' ? (
                <>
                  Move <span className="font-semibold">{confirmAction.designation}</span> to <span className="font-semibold text-indigo-600">Shift {confirmAction.weekNumber}</span>? Progress from Shift {confirmAction.weekNumber} onward will be reset.
                </>
              ) : (
                <>
                  {actionLabels[confirmAction.action]} for <span className="font-semibold">{confirmAction.designation}</span>
                  {confirmAction.taskLabel && (
                    <> — <span className="text-indigo-600">{confirmAction.taskLabel}</span></>
                  )}
                  ?
                </>
              )}
            </p>
            {confirmAction.action !== 'delete-student' && confirmAction.action !== 'delete-all' && (
              <p className="text-xs text-slate-400">
                {confirmAction.action === 'move-class-to-shift'
                  ? 'Online students will be redirected immediately.'
                  : onlineStudents.has(confirmAction.studentId)
                  ? 'The student will see a PEARL notification about this action.'
                  : 'This will take effect when the student logs back in.'}
              </p>
            )}
            <div className="flex gap-2 justify-end pt-2">
              <button
                className="px-4 py-2 text-sm rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                onClick={() => setConfirmAction(null)}
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button
                className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors disabled:opacity-50 ${
                  confirmAction.action === 'delete-student' || confirmAction.action === 'delete-all'
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
                onClick={executeAction}
                disabled={deleteLoading}
              >
                {deleteLoading ? 'Deleting...' : confirmAction.action === 'delete-student' || confirmAction.action === 'delete-all' ? 'Delete' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
      {reviewShiftNumber !== null && classId && (
        <ShiftReviewModal
          classId={classId}
          weekNumber={reviewShiftNumber}
          onClose={() => setReviewShiftNumber(null)}
        />
      )}
    </div>
  );
}
