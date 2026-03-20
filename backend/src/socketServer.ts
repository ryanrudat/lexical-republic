import { Server } from 'socket.io';
import { createServer } from 'http';
import type { Express } from 'express';
import { verifyToken, normalizePayload, isTeacherPayload, isPairPayload } from './utils/jwt';
import cookie from 'cookie';
import prisma from './utils/prisma';

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
  tasks: { id: string; label: string }[];
}

// Track multiple sockets per entityId (handles multi-tab)
const entitySockets = new Map<string, Set<string>>();
const onlineStudents = new Map<string, StudentStatus>();

// Grace period timers for disconnect debouncing
const disconnectTimers = new Map<string, ReturnType<typeof setTimeout>>();
const DISCONNECT_GRACE_MS = 5000;

export function getOnlineStudents(classId?: string): StudentStatus[] {
  const all = Array.from(onlineStudents.values());
  if (classId) return all.filter((s) => s.classId === classId);
  return all;
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

    // ── Teacher auto-joins teacher room ──
    if (role === 'teacher') {
      socket.join('teacher');
      // Send current class snapshot
      socket.emit('teacher:class-snapshot', getOnlineStudents());
    }

    // ── Teacher pause/resume ──
    if (role === 'teacher') {
      socket.on('teacher:pause-all', (data?: { classId?: string }) => {
        const msg = 'ATTENTION: SUPERVISOR BRIEFING IN PROGRESS. PLEASE LOOK UP.';
        if (data?.classId) {
          io.to(`class:${data.classId}`).emit('session:paused', { message: msg });
        } else {
          io.emit('session:paused', { message: msg });
        }
        io.to('teacher').emit('teacher:pause-state', { paused: true });
      });

      socket.on('teacher:resume-all', (data?: { classId?: string }) => {
        if (data?.classId) {
          io.to(`class:${data.classId}`).emit('session:resumed');
        } else {
          io.emit('session:resumed');
        }
        io.to('teacher').emit('teacher:pause-state', { paused: false });
      });

      // ── Per-student task controls ──
      socket.on('teacher:skip-task', (data: { studentId: string }) => {
        io.to(`student:${data.studentId}`).emit('session:task-command', { action: 'skip-task' });
      });

      socket.on('teacher:reset-task', (data: { studentId: string }) => {
        io.to(`student:${data.studentId}`).emit('session:task-command', { action: 'reset-task' });
      });

      socket.on('teacher:reset-shift', (data: { studentId: string }) => {
        io.to(`student:${data.studentId}`).emit('session:task-command', { action: 'reset-shift' });
      });

      socket.on('teacher:send-to-task', (data: { studentId: string; taskId: string }) => {
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
        tasks: existing?.tasks ?? [],
      };
      onlineStudents.set(entityId, status);

      // Join class-specific room + personal room for teacher commands
      socket.join(`student:${entityId}`);
      if (classId) {
        socket.join(`class:${classId}`);
      }

      io.to('teacher').emit('student:connected', status);
    }

    // ── Student shift/step events ──
    socket.on('student:enter-shift', (data: { weekNumber: number; stepId?: string }) => {
      const existing = onlineStudents.get(entityId);
      if (existing) {
        existing.weekNumber = data.weekNumber;
        existing.stepId = data.stepId || null;
        existing.lastActivityAt = new Date().toISOString();
        io.to('teacher').emit('student:status-updated', existing);
      }
    });

    socket.on('student:change-step', (data: { stepId: string }) => {
      const existing = onlineStudents.get(entityId);
      if (existing) {
        existing.stepId = data.stepId;
        existing.lastActivityAt = new Date().toISOString();
        io.to('teacher').emit('student:status-updated', existing);
      }
    });

    socket.on('student:shift-tasks', (data: { id: string; label: string }[]) => {
      const existing = onlineStudents.get(entityId);
      if (existing) {
        existing.tasks = Array.isArray(data) ? data : [];
        io.to('teacher').emit('student:status-updated', existing);
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
        }
        existing.taskId = data.taskId;
        existing.taskLabel = data.taskLabel;
        existing.lastActivityAt = new Date().toISOString();
        if (data.failCount !== undefined) existing.failCount = data.failCount;
        io.to('teacher').emit('student:status-updated', existing);
      }
    });

    // ── Existing week room logic (unchanged) ──
    socket.on('join:week', (weekId: string) => {
      socket.join(`week:${weekId}`);
    });
    socket.on('leave:week', (weekId: string) => {
      socket.leave(`week:${weekId}`);
    });

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
          onlineStudents.delete(entityId);
          io.to('teacher').emit('student:disconnected', {
            userId: entityId,
            designation: status?.designation ?? null,
          });
        }, DISCONNECT_GRACE_MS);
        disconnectTimers.set(entityId, timer);
      }
    });
  });

  return httpServer;
}
