// Inscription Pool socket event handlers.
//
// Phase 1 (live now): real-time keystroke + word-complete broadcast between
// any sockets watching the same drill room (`inscription:drill:${drillId}`).
// Class-pause integration freezes active drills; resume thaws and accumulates
// pause time so the timer math is correct. Force-abort is teacher → student.
//
// Phase 2 lobby state machine (full matchmaking) is intentionally deferred —
// the ghost-fill system already delivers the multiplayer feel by replaying
// real classmate recordings within 14 days. A future Phase 3 can add
// synchronous live pools.

import type { Server, Socket } from 'socket.io';
import prisma from '../utils/prisma';
import { MAX_INPUT_CHARS_PER_SEC } from '../utils/inscriptionConstants';
import { joinPoolQueue, leavePoolQueue } from './inscriptionMatchmaking';

/** Called once per socket connection, after the socket has joined its student/teacher rooms. */
export function registerInscriptionSocketHandlers(io: Server, socket: Socket): void {
  const entityId = (socket as { entityId?: string }).entityId;
  const role = (socket as { role?: string }).role;
  if (!entityId) return;

  // ── Student: subscribe to live drill room when starting a drill ──
  socket.on('inscription:enter-drill', async (data: { drillId: string }) => {
    if (role !== 'student' || !data?.drillId) return;
    try {
      const drill = await prisma.inscriptionDrill.findUnique({
        where: { id: data.drillId },
        select: { id: true, pairId: true, classId: true, status: true, pausedAt: true, totalPausedMs: true, lobbyId: true },
      });
      if (!drill || drill.pairId !== entityId) return;
      socket.join(`inscription:drill:${drill.id}`);
      // Live Open Pool: also (re)join the lobby room, or after a mid-race
      // reconnect this socket never receives participant-progress again and
      // every real opponent's desk freezes for the rest of the race.
      if (drill.lobbyId) {
        socket.join(`inscription:lobby:${drill.lobbyId}`);
      }
      // Replay paused state on reconnect — analog of class-pause replay
      if (drill.pausedAt) {
        socket.emit('inscription:paused', {
          drillId: drill.id,
          pausedAt_ms: drill.pausedAt.getTime(),
        });
      } else if (drill.totalPausedMs > 0) {
        // Reconnected AFTER a pause→resume window: replay the resume or the
        // client that missed inscription:resumed stays stuck on its paused
        // overlay with a frozen clock.
        socket.emit('inscription:resumed', {
          drillId: drill.id,
          resumedAt_ms: Date.now(),
          totalPausedMs: drill.totalPausedMs,
        });
      }
    } catch {
      /* swallow */
    }
  });

  socket.on('inscription:leave-drill', (data: { drillId: string }) => {
    if (!data?.drillId) return;
    socket.leave(`inscription:drill:${data.drillId}`);
  });

  // NOTE: the keystroke-tick → inscription:keystroke rebroadcast was removed
  // 2026-06-11. No frontend ever rendered it, and the drill room only ever
  // contains the drill's OWNER (enter-drill rejects non-owners), so even a
  // listener would just hear its own typing echoed back. Removing it also
  // kills the never-evicting per-(drill,pair) throttle map and the
  // per-keystroke socket traffic from every typing student.

  // ── Live word-complete echo (for spectators / future co-drill mode) ──
  // The REST endpoint /drills/:id/word is the source of truth; this is
  // purely informational broadcast for any other socket watching this drill.
  socket.on(
    'inscription:word-broadcast',
    (data: { drillId: string; wordIdx: number; finishedAt_ms: number }) => {
      if (role !== 'student' || !data?.drillId) return;
      io.to(`inscription:drill:${data.drillId}`).emit('inscription:word-complete', {
        pairId: entityId,
        wordIdx: data.wordIdx,
        finishedAt_ms: data.finishedAt_ms,
      });
    },
  );

  // ── Heartbeat (anti-cheat soft signal + reconnect detection) ──
  socket.on('inscription:heartbeat', (data: { drillId: string; charsTyped?: number }) => {
    if (role !== 'student' || !data?.drillId) return;
    // Soft anti-cheat: if charsTyped/sec exceeds MAX_INPUT_CHARS_PER_SEC for a
    // sustained burst, log it. Don't reject — just flag for teacher review.
    if (typeof data.charsTyped === 'number' && data.charsTyped > MAX_INPUT_CHARS_PER_SEC) {
      console.warn(
        `[inscription] Suspicious typing rate from pair=${entityId} drill=${data.drillId} chars/s=${data.charsTyped}`,
      );
    }
  });

  // ── Teacher: schedule a Sector Trial ──
  socket.on(
    'inscription:schedule-trial',
    async (data: { classId: string; trialId?: string; startsAt_ms?: number; durationSec?: number; wordCount?: number }) => {
      if (role !== 'teacher' || !data?.classId) return;
      const teacherId = entityId;
      const owned = await prisma.class.findFirst({
        where: { id: data.classId, teacherId },
        select: { id: true },
      });
      if (!owned) return;
      const startsAt_ms = data.startsAt_ms ?? Date.now() + 60_000;
      io.to(`class:${data.classId}`).emit('inscription:trial-scheduled', {
        classId: data.classId,
        trialId: data.trialId ?? null,
        startsAt_ms,
        durationSec: data.durationSec ?? 90,
        wordCount: data.wordCount ?? 15,
      });
    },
  );

  // ── Live Open Pool: join the matchmaking queue ──
  socket.on('inscription:join-queue', async (data: { weekNumber?: number }) => {
    if (role !== 'student' || typeof data?.weekNumber !== 'number') return;
    try {
      const pair = await prisma.pair.findUnique({
        where: { id: entityId },
        select: { lane: true, designation: true },
      });
      if (!pair) return;
      const enrollment = await prisma.classEnrollment.findFirst({
        where: { pairId: entityId },
        select: { classId: true },
      });
      if (!enrollment) return;
      await joinPoolQueue(io, socket.id, {
        pairId: entityId,
        designation: pair.designation,
        classId: enrollment.classId,
        lane: pair.lane,
        weekNumber: data.weekNumber,
      });
    } catch (err) {
      console.error('[inscription] join-queue error', err);
    }
  });

  // ── Live Open Pool: cancel queue (student backed out) ──
  socket.on('inscription:leave-queue', () => {
    if (role !== 'student') return;
    leavePoolQueue(io, socket.id);
  });

  // Drop out of any pending queue if this socket disconnects mid-wait.
  socket.on('disconnect', () => {
    leavePoolQueue(io, socket.id);
  });
}

/**
 * Freeze all active drills for a class when teacher fires Pause All.
 * Called from socketServer.ts inside the existing `teacher:pause-all` handler.
 */
export async function freezeActiveInscriptionDrillsForClass(
  io: Server,
  classId: string,
): Promise<void> {
  const now = new Date();
  try {
    const drills = await prisma.inscriptionDrill.findMany({
      where: { classId, status: 'active', pausedAt: null },
      select: { id: true, pairId: true },
    });
    if (drills.length === 0) return;
    await prisma.inscriptionDrill.updateMany({
      where: { id: { in: drills.map((d) => d.id) } },
      data: { pausedAt: now },
    });
    for (const d of drills) {
      io.to(`inscription:drill:${d.id}`).emit('inscription:paused', {
        drillId: d.id,
        pausedAt_ms: now.getTime(),
      });
    }
  } catch (err) {
    console.error('[inscription] freezeActiveDrills error', err);
  }
}

/**
 * Thaw all paused drills for a class when teacher fires Resume All.
 * Accumulates pause time so the timer math stays correct.
 */
export async function thawPausedInscriptionDrillsForClass(
  io: Server,
  classId: string,
): Promise<void> {
  const now = Date.now();
  try {
    const drills = await prisma.inscriptionDrill.findMany({
      where: { classId, status: 'active', pausedAt: { not: null } },
      select: { id: true, pausedAt: true, totalPausedMs: true },
    });
    if (drills.length === 0) return;
    for (const d of drills) {
      const pausedMs = d.pausedAt ? now - d.pausedAt.getTime() : 0;
      await prisma.inscriptionDrill.update({
        where: { id: d.id },
        data: {
          pausedAt: null,
          totalPausedMs: { increment: pausedMs },
        },
      });
      io.to(`inscription:drill:${d.id}`).emit('inscription:resumed', {
        drillId: d.id,
        resumedAt_ms: now,
        totalPausedMs: d.totalPausedMs + pausedMs,
      });
    }
  } catch (err) {
    console.error('[inscription] thawPausedDrills error', err);
  }
}
