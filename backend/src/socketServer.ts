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
}

const onlineStudents = new Map<string, StudentStatus>();

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

    // ── Student tracking ──
    if (role === 'student') {
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

      const status: StudentStatus = {
        userId: entityId,
        socketId: socket.id,
        designation: (socket as any).designation,
        displayName: (socket as any).displayName,
        classId,
        className,
        weekNumber: null,
        stepId: null,
        connectedAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString(),
      };
      onlineStudents.set(entityId, status);

      // Join class-specific room
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
        const status = onlineStudents.get(entityId);
        onlineStudents.delete(entityId);
        io.to('teacher').emit('student:disconnected', {
          userId: entityId,
          designation: status?.designation ?? null,
        });
      }
    });
  });

  return httpServer;
}
