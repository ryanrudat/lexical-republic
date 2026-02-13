import { Server } from 'socket.io';
import { createServer } from 'http';
import type { Express } from 'express';
import { verifyToken } from './utils/jwt';
import cookie from 'cookie';

export let io: Server;

// ── Live student tracking ──────────────────────────────────────────

export interface StudentStatus {
  userId: string;
  socketId: string;
  designation: string | null;
  displayName: string;
  weekNumber: number | null;
  stepId: string | null;
  connectedAt: string;
  lastActivityAt: string;
}

const onlineStudents = new Map<string, StudentStatus>();

export function getOnlineStudents(): StudentStatus[] {
  return Array.from(onlineStudents.values());
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
      const cookies = cookie.parse(socket.handshake.headers.cookie || '');
      const token = cookies.token;
      if (!token) {
        next(new Error('Authentication required'));
        return;
      }
      const payload = verifyToken(token);
      (socket as any).userId = payload.userId;
      (socket as any).role = payload.role;

      // Accept optional metadata from handshake query
      const query = socket.handshake.query;
      (socket as any).designation = typeof query.designation === 'string' ? query.designation : null;
      (socket as any).displayName = typeof query.displayName === 'string' ? query.displayName : 'Unknown';

      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = (socket as any).userId as string;
    const role = (socket as any).role as string;

    // ── Teacher auto-joins teacher room ──
    if (role === 'teacher') {
      socket.join('teacher');
      // Send current class snapshot
      socket.emit('teacher:class-snapshot', getOnlineStudents());
    }

    // ── Student tracking ──
    if (role === 'student') {
      const status: StudentStatus = {
        userId,
        socketId: socket.id,
        designation: (socket as any).designation,
        displayName: (socket as any).displayName,
        weekNumber: null,
        stepId: null,
        connectedAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString(),
      };
      onlineStudents.set(userId, status);
      io.to('teacher').emit('student:connected', status);
    }

    // ── Student shift/step events ──
    socket.on('student:enter-shift', (data: { weekNumber: number; stepId?: string }) => {
      const existing = onlineStudents.get(userId);
      if (existing) {
        existing.weekNumber = data.weekNumber;
        existing.stepId = data.stepId || null;
        existing.lastActivityAt = new Date().toISOString();
        io.to('teacher').emit('student:status-updated', existing);
      }
    });

    socket.on('student:change-step', (data: { stepId: string }) => {
      const existing = onlineStudents.get(userId);
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
        const status = onlineStudents.get(userId);
        onlineStudents.delete(userId);
        io.to('teacher').emit('student:disconnected', {
          userId,
          designation: status?.designation ?? null,
        });
      }
    });
  });

  return httpServer;
}
