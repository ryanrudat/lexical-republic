import { useEffect, useState, useCallback } from 'react';
import { fetchStudents } from '../../api/teacher';
import { useTeacherStore } from '../../stores/teacherStore';
import { getSocket } from '../../utils/socket';
import { STEP_ORDER } from '../../types/shifts';
import type { StudentSummary } from '../../types/shifts';

const stepLabel = (stepId: string) =>
  STEP_ORDER.find((s) => s.id === stepId)?.label ?? stepId;

const WARN_TIME_MS = 5 * 60 * 1000;   // 5 min → yellow
const ALERT_TIME_MS = 8 * 60 * 1000;  // 8 min → red
const FAIL_ALERT_THRESHOLD = 2;        // 2 fails → red

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

export default function ClassMonitor({ classId }: { classId?: string | null }) {
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [pauseElapsed, setPauseElapsed] = useState(0);
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    studentId: string;
    designation: string;
    action: 'skip-task' | 'reset-task' | 'reset-shift' | 'send-to-task';
    taskId?: string;
    taskLabel?: string;
  } | null>(null);
  const onlineStudents = useTeacherStore((s) => s.onlineStudents);
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

  const executeAction = useCallback(() => {
    if (!confirmAction) return;
    const sock = getSocket();
    if (!sock) return;

    const { studentId, action, taskId } = confirmAction;
    switch (action) {
      case 'skip-task':
        sock.emit('teacher:skip-task', { studentId });
        break;
      case 'reset-task':
        sock.emit('teacher:reset-task', { studentId });
        break;
      case 'reset-shift':
        sock.emit('teacher:reset-shift', { studentId });
        break;
      case 'send-to-task':
        if (taskId) sock.emit('teacher:send-to-task', { studentId, taskId });
        break;
    }
    setConfirmAction(null);
  }, [confirmAction]);

  const actionLabels: Record<string, string> = {
    'skip-task': 'Skip Current Task',
    'reset-task': 'Reset Current Task',
    'reset-shift': 'Reset Entire Shift',
    'send-to-task': 'Send to Task',
  };

  if (loading && students.length === 0) {
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
      </div>

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

          return (
            <div
              key={student.id}
              className={`rounded-xl border shadow-sm p-4 ${flagBorder} ${
                student.online ? 'cursor-pointer' : ''
              }`}
              onClick={() => {
                if (student.online) {
                  setExpandedStudent(isExpanded ? null : student.id);
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
                    {student.online && (
                      <span className="text-[10px] text-slate-300 ml-auto shrink-0">
                        {isExpanded ? '▲' : '▼'}
                      </span>
                    )}
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
                      {student.online.taskLabel && (
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

              {/* Expanded task controls */}
              {isExpanded && student.online && (
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

                  {/* Send to specific task — only if task list is available */}
                  {student.online.tasks && student.online.tasks.length > 0 && (
                    <div className="mt-1">
                      <div className="text-[10px] text-slate-400 mb-1">Send to task:</div>
                      <div className="flex flex-wrap gap-1">
                        {student.online.tasks.map((t) => (
                          <button
                            key={t.id}
                            className={`px-2 py-0.5 text-[10px] rounded border transition-colors ${
                              student.online?.taskId === t.id
                                ? 'bg-indigo-100 text-indigo-700 border-indigo-300 font-semibold'
                                : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                            }`}
                            disabled={student.online?.taskId === t.id}
                            onClick={() => setConfirmAction({
                              studentId: student.id,
                              designation: student.designation ?? '??',
                              action: 'send-to-task',
                              taskId: t.id,
                              taskLabel: t.label,
                            })}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
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
              Confirm Action
            </h3>
            <p className="text-sm text-slate-600">
              {actionLabels[confirmAction.action]} for <span className="font-semibold">{confirmAction.designation}</span>
              {confirmAction.taskLabel && (
                <> — <span className="text-indigo-600">{confirmAction.taskLabel}</span></>
              )}
              ?
            </p>
            <p className="text-xs text-slate-400">
              The student will see a PEARL notification about this action.
            </p>
            <div className="flex gap-2 justify-end pt-2">
              <button
                className="px-4 py-2 text-sm rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                onClick={() => setConfirmAction(null)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors font-medium"
                onClick={executeAction}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
