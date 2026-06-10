// Live Open Pool matchmaking (Phase 3).
//
// In-memory queue keyed by `classId:lane:weekNumber`. Students who pick
// "Open Pool" join the queue; a pool forms when it reaches POOL_MAX_PLAYERS
// or POOL_WAIT_MS after the first joiner — whichever comes first. Each pool
// member gets their OWN InscriptionDrill sharing one `lobbyId`, an identical
// `wordQueue`, and a synchronized `startAt`. Opponents render as live desks
// (progress synced through the `inscription:lobby:${lobbyId}` room). Small
// pools are topped up with ghosts so a lone student is never stuck.
//
// The queue is ephemeral: it lives only in process memory and rebuilds as
// students re-queue. A socket that drops while queued is removed on disconnect.

import { randomUUID } from 'crypto';
import type { Server } from 'socket.io';
import { Prisma } from '@prisma/client';
import prisma from '../utils/prisma';
import { pickInscriptionPrompts, type InscriptionWord } from '../utils/inscriptionWordPool';
import { pickGhostRecordings } from '../utils/inscriptionGhosts';
import {
  POOL_MAX_PLAYERS,
  POOL_TARGET_DESKS,
  POOL_WAIT_MS,
  COUNTDOWN_DURATION_MS,
  DEFAULT_WORD_COUNT,
  DEFAULT_POOL_STRATEGY,
  durationForLane,
  type PoolStrategy,
} from '../utils/inscriptionConstants';

interface QueueEntry {
  pairId: string;
  designation: string;
  classId: string;
  lane: number;
  weekNumber: number;
  socketId: string;
  joinedAt: number;
}

interface PoolQueue {
  entries: QueueEntry[];
  timer: ReturnType<typeof setTimeout> | null;
  /** Wall-clock ms when the pool will auto-form — drives the waiting-room countdown. */
  formsAt: number | null;
}

interface PoolDesk {
  desk: number;
  pairId: string | null;
  citizenNumber: string;
  isGhost: boolean;
  wordTimings: unknown[];
  keystrokeLog: unknown[];
  wordsCorrect: number;
  finishedAt_ms: number | null;
}

interface PoolDrillPayload {
  drillId: string;
  lobbyId: string;
  mode: 'open';
  durationSec: number;
  wordCount: number;
  lane: number;
  weekNumber: number;
  words: InscriptionWord[];
  desks: PoolDesk[];
}

const queues = new Map<string, PoolQueue>();

function keyOf(classId: string, lane: number, weekNumber: number): string {
  return `${classId}:${lane}:${weekNumber}`;
}

function emitQueueUpdate(io: Server, q: PoolQueue): void {
  const count = q.entries.length;
  const designations = q.entries.map((e) => e.designation);
  for (const e of q.entries) {
    io.to(e.socketId).emit('inscription:queue-update', {
      count,
      max: POOL_MAX_PLAYERS,
      designations,
      formsAt_ms: q.formsAt,
    });
  }
}

/** Student joined the Open Pool queue. */
export async function joinPoolQueue(
  io: Server,
  socketId: string,
  entry: Omit<QueueEntry, 'socketId' | 'joinedAt'>,
): Promise<void> {
  // Reject if this pair already has an active drill (refresh / double-join).
  const active = await prisma.inscriptionDrill.findFirst({
    where: { pairId: entry.pairId, status: 'active' },
    select: { id: true },
  });
  if (active) {
    io.to(socketId).emit('inscription:queue-error', {
      error: 'active_drill',
      message: 'You already have an active drill.',
      drillId: active.id,
    });
    return;
  }

  const key = keyOf(entry.classId, entry.lane, entry.weekNumber);
  let q = queues.get(key);
  if (!q) {
    q = { entries: [], timer: null, formsAt: null };
    queues.set(key, q);
  }
  // De-dupe: drop any prior entry for this pair (re-join / multi-tab).
  q.entries = q.entries.filter((e) => e.pairId !== entry.pairId);
  q.entries.push({ ...entry, socketId, joinedAt: Date.now() });

  if (q.entries.length >= POOL_MAX_PLAYERS) {
    emitQueueUpdate(io, q);
    void formPool(io, key);
    return;
  }
  // First joiner arms the auto-form timer + sets the shared countdown deadline.
  if (!q.timer) {
    q.formsAt = Date.now() + POOL_WAIT_MS;
    q.timer = setTimeout(() => {
      void formPool(io, key);
    }, POOL_WAIT_MS);
  }
  emitQueueUpdate(io, q);
}

/** Remove a socket from whatever queue it sits in (cancel / disconnect). */
export function leavePoolQueue(io: Server, socketId: string): void {
  for (const [key, q] of queues.entries()) {
    const before = q.entries.length;
    q.entries = q.entries.filter((e) => e.socketId !== socketId);
    if (q.entries.length === before) continue;
    if (q.entries.length === 0) {
      if (q.timer) {
        clearTimeout(q.timer);
        q.timer = null;
      }
      queues.delete(key);
    } else {
      emitQueueUpdate(io, q);
    }
    return;
  }
}

/** Form a pool from the queued players and start a synchronized drill. */
async function formPool(io: Server, key: string): Promise<void> {
  const q = queues.get(key);
  if (!q) return;
  if (q.timer) {
    clearTimeout(q.timer);
    q.timer = null;
  }
  const group = q.entries.splice(0, POOL_MAX_PLAYERS);
  // Overflow players keep waiting for the next pool.
  if (q.entries.length === 0) {
    queues.delete(key);
  } else {
    q.formsAt = Date.now() + POOL_WAIT_MS;
    q.timer = setTimeout(() => {
      void formPool(io, key);
    }, POOL_WAIT_MS);
    emitQueueUpdate(io, q);
  }
  if (group.length === 0) return;

  const startAt_ms = Date.now() + COUNTDOWN_DURATION_MS;
  try {
    const drills = await createPooledDrills(group, startAt_ms);
    for (const entry of group) {
      const payload = drills.get(entry.pairId);
      if (!payload) continue;
      // Subscribe the participant's socket to the shared lobby room.
      io.in(entry.socketId).socketsJoin(`inscription:lobby:${payload.lobbyId}`);
      io.to(entry.socketId).emit('inscription:pool-formed', {
        ...payload,
        startAt_ms,
      });
    }
  } catch (err) {
    console.error('[inscription] formPool error', err);
    for (const entry of group) {
      io.to(entry.socketId).emit('inscription:queue-error', {
        error: 'pool_failed',
        message: 'Could not start the pool. Please try again.',
      });
    }
  }
}

/**
 * Create one drill per pool member. Each drill shares the lobbyId, wordQueue,
 * and startAt. Recordings: self (desk 1) + each live opponent (desk 2..N, real
 * pairId, no timings — synced live) + ghost top-up to POOL_TARGET_DESKS.
 */
async function createPooledDrills(
  group: QueueEntry[],
  startAt_ms: number,
): Promise<Map<string, PoolDrillPayload>> {
  const { classId, lane, weekNumber } = group[0];
  const durationSec = durationForLane(lane);
  const wordCount = DEFAULT_WORD_COUNT;
  const sentenceCount = Math.max(0, Math.floor(wordCount * 0.4));

  const words = await pickInscriptionPrompts({
    classId,
    weekNumber,
    count: wordCount,
    pairId: group[0].pairId,
    // Shared-queue fairness: the anti-fatigue filter considers ALL members —
    // a word is excluded only when every racer has mastered it (group[0]'s
    // mastery alone used to govern the whole pool).
    pairIds: group.map((g) => g.pairId),
    poolStrategy: DEFAULT_POOL_STRATEGY as PoolStrategy,
    sentenceCount,
  });
  if (words.length === 0) {
    throw new Error(`No TOEIC words available for class=${classId} week=${weekNumber}`);
  }

  const lobbyId = randomUUID();
  const ghostTopUp = Math.max(0, POOL_TARGET_DESKS - group.length);
  const ghosts = await pickGhostRecordings({
    classId,
    weekNumber,
    lane,
    durationSec,
    wordCount,
    count: ghostTopUp,
    excludePairIds: group.map((g) => g.pairId),
  });

  const result = new Map<string, PoolDrillPayload>();

  for (const me of group) {
    const opponents = group.filter((g) => g.pairId !== me.pairId);
    const recordings: Prisma.InscriptionRecordingCreateWithoutDrillInput[] = [];

    recordings.push({
      isGhost: false,
      pairId: me.pairId,
      citizenNumber: me.designation,
      desk: 1,
      wordTimings: [],
      keystrokeLog: [],
      wordsCorrect: 0,
    });

    let desk = 2;
    for (const opp of opponents) {
      recordings.push({
        isGhost: false,
        pairId: opp.pairId,
        citizenNumber: opp.designation,
        desk,
        wordTimings: [],
        keystrokeLog: [],
        wordsCorrect: 0,
      });
      desk += 1;
    }
    for (const g of ghosts) {
      recordings.push({
        isGhost: true,
        sourceDrillId: g.sourceDrillId,
        citizenNumber: g.citizenNumber,
        desk,
        wordTimings: g.wordTimings as unknown as Prisma.InputJsonValue,
        keystrokeLog: g.keystrokeLog as unknown as Prisma.InputJsonValue,
        wordsCorrect: g.wordsCorrect,
        finishedAt_ms: g.finishedAt_ms,
      });
      desk += 1;
    }

    const drill = await prisma.inscriptionDrill.create({
      data: {
        classId,
        pairId: me.pairId,
        weekNumber,
        lane,
        mode: 'open',
        durationSec,
        wordCount: words.length,
        poolStrategy: DEFAULT_POOL_STRATEGY,
        wordQueue: words as unknown as Prisma.InputJsonValue,
        status: 'active',
        startedAt: new Date(startAt_ms),
        lobbyId,
        recordings: { create: recordings },
      },
      include: { recordings: true },
    });

    result.set(me.pairId, {
      drillId: drill.id,
      lobbyId,
      mode: 'open',
      durationSec,
      wordCount: drill.wordCount,
      lane,
      weekNumber,
      words,
      desks: drill.recordings
        .slice()
        .sort((a, b) => a.desk - b.desk)
        .map((r) => ({
          desk: r.desk,
          pairId: r.pairId,
          citizenNumber: r.citizenNumber,
          isGhost: r.isGhost,
          // Ghost desks carry their recorded timings (client-side ticker);
          // self + live opponents start empty and update from live input.
          wordTimings: r.isGhost ? (r.wordTimings as unknown[]) : [],
          keystrokeLog: r.isGhost ? (r.keystrokeLog as unknown[]) : [],
          wordsCorrect: r.wordsCorrect,
          finishedAt_ms: r.finishedAt_ms,
        })),
    });
  }

  return result;
}
