import { Server } from 'socket.io';
import { createServer } from 'http';
import type { Express } from 'express';
import { verifyToken, normalizePayload, isTeacherPayload, isPairPayload } from './utils/jwt';
import cookie from 'cookie';
import prisma from './utils/prisma';
import {
  registerInscriptionSocketHandlers,
  freezeActiveInscriptionDrillsForClass,
  thawPausedInscriptionDrillsForClass,
} from './socket/inscriptionSocket';

export let io: Server;

// ── Live student tracking ──────────────────────────────────────────

export interface StudentStatus {
  /** pairId for pair tokens, userId for legacy */
  userId: string;
  socketId: string;
  designation: string | null;
  displayName: string;
  classId: string | null;
  className: string | null;
  weekNumber: number | null;
  stepId: string | null;
  connectedAt: string;
  lastActivityAt: string;
  taskId: string | null;
  taskLabel: string | null;
  taskStartedAt: string | null;
  failCount: number;
  /** Task category — used by ClassMonitor to pick task-aware flag thresholds (e.g. Writing tolerates more time + more attempts). */
  taskKind: string | null;
  /** Sub-progress shown next to the task label, e.g. "Writing: 47 words". Cleared on taskId change. */
  progressLabel: string | null;
  tasks: { id: string; label: string }[];
}

// Track multiple sockets per entityId (handles multi-tab)
const entitySockets = new Map<string, Set<string>>();
const onlineStudents = new Map<string, StudentStatus>();

// Grace period timers for disconnect debouncing
const disconnectTimers = new Map<string, ReturnType<typeof setTimeout>>();
const DISCONNECT_GRACE_MS = 5000;

// ── Class pause state (in-memory; lost on restart — acceptable for now) ──
// Used to replay `session:paused` to late-joining or refreshing students so
// they don't bypass the lock-screen overlay while their classmates are still locked.
type ClassPauseState = { paused: boolean; message?: string; ts: number };
const classPauseState = new Map<string, ClassPauseState>();

const DEFAULT_PAUSE_MESSAGE = 'ATTENTION: SUPERVISOR BRIEFING IN PROGRESS. PLEASE LOOK UP.';

export function getOnlineStudents(classId?: string): StudentStatus[] {
  const all = Array.from(onlineStudents.values());
  if (classId) return all.filter((s) => s.classId === classId);
  return all;
}

/** Remove a student from all in-memory tracking (called after deletion) */
export function purgeOnlineStudent(entityId: string): void {
  onlineStudents.delete(entityId);
  entitySockets.delete(entityId);
  const timer = disconnectTimers.get(entityId);
  if (timer) {
    clearTimeout(timer);
    disconnectTimers.delete(entityId);
  }
}

/** Emit to the class room of an online student, or warn if classless. */
function emitToStudentClass(studentId: string, event: string, payload: unknown): void {
  const classId = onlineStudents.get(studentId)?.classId;
  if (classId) {
    io.to(`class:${classId}`).emit(event, payload);
  } else {
    // No classId in the in-memory map → the relay silently no-ops and the
    // teacher never sees this student's live update. Surface it so the gap is
    // diagnosable (enrollment lookup failed at connect, or student unenrolled).
    console.warn(`[socket] dropped ${event} for student ${studentId}: no classId in onlineStudents (teacher live update lost)`);
  }
}

/** Broadcast the live online-student count for a class to everyone in its room. */
function emitClassPresence(classId: string): void {
  io.to(`class:${classId}`).emit('class:presence', {
    classId,
    online: getOnlineStudents(classId).length,
  });
}

// ── Init ───────────────────────────────────────────────────────────

export function initSocketServer(app: Express, allowedOrigins: string[]) {
  const httpServer = createServer(app);

  io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
    },
    // Increase timeouts to tolerate browser tab backgrounding.
    // Browsers throttle timers in background tabs, causing default
    // 20s pingTimeout to expire. 120s gives plenty of room.
    pingInterval: 25000,
    pingTimeout: 120000,
  });

  io.use((socket, next) => {
    try {
      // Try cookie first, then auth.token (Bearer fallback for Safari)
      const cookies = cookie.parse(socket.handshake.headers.cookie || '');
      const token = cookies.token
        || (socket.handshake.auth as { token?: string })?.token;
      if (!token) {
        next(new Error('Authentication required'));
        return;
      }
      const raw = verifyToken(token);
      const payload = normalizePayload(raw);

      if (!payload) {
        next(new Error('Invalid token — please log in again'));
        return;
      }

      if (isPairPayload(payload)) {
        (socket as any).entityId = payload.pairId;
        (socket as any).role = 'student';
        (socket as any).designation = payload.designation;
        (socket as any).displayName = '';
      } else if (isTeacherPayload(payload)) {
        (socket as any).entityId = payload.userId;
        (socket as any).role = payload.role;
      }

      // Accept optional metadata from handshake query
      const query = socket.handshake.query;
      if (typeof query.designation === 'string') {
        (socket as any).designation = query.designation;
      }
      if (typeof query.displayName === 'string') {
        (socket as any).displayName = query.displayName;
      }

      // Keep backward compat field
      (socket as any).userId = (socket as any).entityId;

      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    const entityId = (socket as any).entityId as string;
    const role = (socket as any).role as string;

    // ── Teacher: join per-class rooms + personal room ──
    if (role === 'teacher') {
      const teacherId = entityId;
      let teacherClassIds: string[] = [];
      try {
        const classes = await prisma.class.findMany({
          where: { teacherId },
          select: { id: true },
        });
        teacherClassIds = classes.map((c) => c.id);
      } catch {
        // Non-fatal: proceed with empty class list (teacher will just see no students)
      }

      // Personal room for teacher-targeted events with no per-student context
      socket.join(`teacher:${teacherId}`);
      // Per-class rooms — receives student events scoped to this teacher's classes
      for (const classId of teacherClassIds) {
        socket.join(`class:${classId}`);
      }

      // Send filtered class snapshot — only this teacher's students
      const ownedClassIds = new Set(teacherClassIds);
      const filteredSnapshot = Array.from(onlineStudents.values()).filter(
        (s) => s.classId !== null && ownedClassIds.has(s.classId),
      );
      socket.emit('teacher:class-snapshot', filteredSnapshot);

      // ── Teacher pause/resume — class-scoped, ownership-checked ──
      socket.on('teacher:pause-all', async (data?: { classId?: string; message?: string }) => {
        const classId = data?.classId;
        if (!classId) return; // refuse to fall back to a global broadcast
        const owned = await prisma.class.findFirst({
          where: { id: classId, teacherId },
          select: { id: true },
        });
        if (!owned) return;

        const message = data?.message || DEFAULT_PAUSE_MESSAGE;
        const ts = Date.now();
        classPauseState.set(classId, { paused: true, message, ts });
        io.to(`class:${classId}`).emit('session:paused', { message, ts });
        // Notify all teacher sockets joined to this class room (including this one)
        io.to(`class:${classId}`).emit('teacher:pause-state', { classId, paused: true });
        // Freeze any active inscription drills in this class
        void freezeActiveInscriptionDrillsForClass(io, classId);
      });

      socket.on('teacher:resume-all', async (data?: { classId?: string }) => {
        const classId = data?.classId;
        if (!classId) return;
        const owned = await prisma.class.findFirst({
          where: { id: classId, teacherId },
          select: { id: true },
        });
        if (!owned) return;

        classPauseState.delete(classId);
        io.to(`class:${classId}`).emit('session:resumed');
        io.to(`class:${classId}`).emit('teacher:pause-state', { classId, paused: false });
        // Thaw any paused inscription drills in this class
        void thawPausedInscriptionDrillsForClass(io, classId);
      });

      // ── Per-student task controls — ownership-checked ──
      const verifyOwnsStudent = async (studentId: string): Promise<boolean> => {
        if (!studentId) return false;
        const enrollment = await prisma.classEnrollment.findFirst({
          where: {
            OR: [{ pairId: studentId }, { userId: studentId }],
            class: { teacherId },
          },
          select: { id: true },
        });
        return enrollment !== null;
      };

      socket.on('teacher:skip-task', async (data: { studentId: string }) => {
        if (!(await verifyOwnsStudent(data.studentId))) return;
        io.to(`student:${data.studentId}`).emit('session:task-command', { action: 'skip-task' });
      });

      socket.on('teacher:reset-task', async (data: { studentId: string }) => {
        if (!(await verifyOwnsStudent(data.studentId))) return;
        io.to(`student:${data.studentId}`).emit('session:task-command', { action: 'reset-task' });
      });

      socket.on('teacher:reset-shift', async (data: { studentId: string }) => {
        if (!(await verifyOwnsStudent(data.studentId))) return;
        io.to(`student:${data.studentId}`).emit('session:task-command', { action: 'reset-shift' });
      });

      socket.on('teacher:send-to-task', async (data: { studentId: string; taskId: string }) => {
        if (!(await verifyOwnsStudent(data.studentId))) return;
        io.to(`student:${data.studentId}`).emit('session:task-command', {
          action: 'send-to-task',
          taskId: data.taskId,
        });
      });
    }

    // ── Student tracking ──
    if (role === 'student') {
      // Cancel any pending disconnect grace timer
      const pendingTimer = disconnectTimers.get(entityId);
      if (pendingTimer) {
        clearTimeout(pendingTimer);
        disconnectTimers.delete(entityId);
      }

      // Register this socket for the entity
      if (!entitySockets.has(entityId)) {
        entitySockets.set(entityId, new Set());
      }
      entitySockets.get(entityId)!.add(socket.id);

      // Look up class enrollment — try pairId first, then userId
      let classId: string | null = null;
      let className: string | null = null;
      try {
        const enrollment = await prisma.classEnrollment.findFirst({
          where: {
            OR: [
              { pairId: entityId },
              { userId: entityId },
            ],
          },
          include: { class: { select: { id: true, name: true } } },
        });
        if (enrollment) {
          classId = enrollment.class.id;
          className = enrollment.class.name;
        }
      } catch {
        // Non-fatal: proceed without class info
      }

      const existing = onlineStudents.get(entityId);
      const status: StudentStatus = {
        userId: entityId,
        socketId: socket.id,
        designation: (socket as any).designation,
        displayName: (socket as any).displayName,
        classId,
        className,
        weekNumber: existing?.weekNumber ?? null,
        stepId: existing?.stepId ?? null,
        connectedAt: existing?.connectedAt ?? new Date().toISOString(),
        lastActivityAt: new Date().toISOString(),
        taskId: existing?.taskId ?? null,
        taskLabel: existing?.taskLabel ?? null,
        taskStartedAt: existing?.taskStartedAt ?? null,
        failCount: existing?.failCount ?? 0,
        taskKind: existing?.taskKind ?? null,
        progressLabel: existing?.progressLabel ?? null,
        tasks: existing?.tasks ?? [],
      };
      onlineStudents.set(entityId, status);

      // Join class-specific room + personal room for teacher commands
      socket.join(`student:${entityId}`);
      if (classId) {
        socket.join(`class:${classId}`);
        // Replay pause state — late joiner / refresher must not bypass the overlay
        const pause = classPauseState.get(classId);
        if (pause?.paused) {
          socket.emit('session:paused', { message: pause.message, ts: pause.ts });
        }
        io.to(`class:${classId}`).emit('student:connected', status);
        emitClassPresence(classId);
      }
    }

    // Reply with the current class online count — lets a student opening Harmony
    // get an immediate presence value without waiting for the next connect/disconnect.
    socket.on('student:presence-request', () => {
      const cid = onlineStudents.get(entityId)?.classId;
      if (cid) {
        socket.emit('class:presence', { classId: cid, online: getOnlineStudents(cid).length });
      }
    });

    // ── Student shift/step events ──
    socket.on('student:enter-shift', (data: { weekNumber: number; stepId?: string }) => {
      const existing = onlineStudents.get(entityId);
      if (existing) {
        existing.weekNumber = data.weekNumber;
        existing.stepId = data.stepId || null;
        existing.lastActivityAt = new Date().toISOString();
        emitToStudentClass(entityId, 'student:status-updated', existing);
      }
    });

    socket.on('student:change-step', (data: { stepId: string }) => {
      const existing = onlineStudents.get(entityId);
      if (existing) {
        existing.stepId = data.stepId;
        existing.lastActivityAt = new Date().toISOString();
        emitToStudentClass(entityId, 'student:status-updated', existing);
      }
    });

    socket.on('student:shift-tasks', (data: { id: string; label: string }[]) => {
      const existing = onlineStudents.get(entityId);
      if (existing) {
        existing.tasks = Array.isArray(data) ? data : [];
        emitToStudentClass(entityId, 'student:status-updated', existing);
      }
    });

    socket.on('student:task-update', (data: {
      taskId: string;
      taskLabel: string;
      failCount?: number;
    }) => {
      const existing = onlineStudents.get(entityId);
      if (existing) {
        if (existing.taskId !== data.taskId) {
          existing.taskStartedAt = new Date().toISOString();
          existing.failCount = 0;
          existing.taskKind = null;
          existing.progressLabel = null;
        }
        existing.taskId = data.taskId;
        existing.taskLabel = data.taskLabel;
        existing.lastActivityAt = new Date().toISOString();
        if (data.failCount !== undefined) existing.failCount = data.failCount;
        emitToStudentClass(entityId, 'student:status-updated', existing);
      }
    });

    // Partial update — does NOT change taskId/taskLabel or reset taskStartedAt.
    // Used by sub-component progress (e.g. WritingEvaluator word count + attempt counter).
    socket.on('student:task-progress', (data: {
      taskKind?: string | null;
      progressLabel?: string | null;
      failCount?: number;
    }) => {
      const existing = onlineStudents.get(entityId);
      if (!existing) return;
      if (data.taskKind !== undefined) existing.taskKind = data.taskKind;
      if (data.progressLabel !== undefined) existing.progressLabel = data.progressLabel;
      if (data.failCount !== undefined) existing.failCount = data.failCount;
      existing.lastActivityAt = new Date().toISOString();
      // Per-class scoping: the global 'teacher' room no longer exists; teachers
      // join class:${classId}. Match the sibling task-update handler (line ~365).
      emitToStudentClass(entityId, 'student:status-updated', existing);
    });

    // ── Existing week room logic (unchanged) ──
    socket.on('join:week', (weekId: string) => {
      socket.join(`week:${weekId}`);
    });
    socket.on('leave:week', (weekId: string) => {
      socket.leave(`week:${weekId}`);
    });

    // ── Inscription Pool socket events (Phase 2) ──
    registerInscriptionSocketHandlers(io, socket);

    // ── Disconnect cleanup ──
    socket.on('disconnect', () => {
      if (role === 'student') {
        // Remove this socket from the entity's set
        const sockets = entitySockets.get(entityId);
        if (sockets) {
          sockets.delete(socket.id);
          if (sockets.size > 0) {
            // Other tabs still connected — update socketId to one of the remaining
            const remainingSocketId = sockets.values().next().value;
            const existing = onlineStudents.get(entityId);
            if (existing && remainingSocketId) {
              existing.socketId = remainingSocketId;
            }
            return; // Don't mark offline
          }
          entitySockets.delete(entityId);
        }

        // All sockets gone — start grace period before marking offline
        const timer = setTimeout(() => {
          disconnectTimers.delete(entityId);
          // Double-check no new sockets appeared during grace period
          const currentSockets = entitySockets.get(entityId);
          if (currentSockets && currentSockets.size > 0) return;

          const status = onlineStudents.get(entityId);
          // Capture classId BEFORE deleting the map entry so we can scope the emit.
          const classIdAtDisconnect = status?.classId ?? null;
          onlineStudents.delete(entityId);

          const payload = {
            userId: entityId,
            designation: status?.designation ?? null,
          };
          if (classIdAtDisconnect) {
            io.to(`class:${classIdAtDisconnect}`).emit('student:disconnected', payload);
            emitClassPresence(classIdAtDisconnect);
          }
        }, DISCONNECT_GRACE_MS);
        disconnectTimers.set(entityId, timer);
      }
    });
  });

  return httpServer;
}
