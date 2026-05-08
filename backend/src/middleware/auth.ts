import { Request, Response, NextFunction } from 'express';
import { verifyToken, normalizePayload, isTeacherPayload, isPairPayload, isLegacyStudentPayload } from '../utils/jwt';
import type { JwtPayload, TeacherPayload, PairPayload } from '../utils/jwt';
import prisma from '../utils/prisma';

// ─── Activity tracking (lastSeenAt) ────────────────────────────────
// Throttled to once per actor per minute. The teacher ClassMonitor reads
// `Pair.lastSeenAt` / `User.lastSeenAt` to render the Active/Recent/Idle/
// Offline indicator and to survive backend restarts (the in-memory
// `onlineStudents` socket Map gets wiped on every Railway redeploy).

const ACTIVITY_THROTTLE_MS = 60_000;
const lastSeenWritten = new Map<string, number>();

function bumpLastSeen(actor: 'pair' | 'user', id: string): void {
  if (!id) return;
  const key = `${actor}:${id}`;
  const now = Date.now();
  const previous = lastSeenWritten.get(key);
  if (previous && now - previous < ACTIVITY_THROTTLE_MS) return;
  lastSeenWritten.set(key, now);
  // Fire-and-forget: never block the request on this. If the row was
  // deleted between the JWT being issued and now, the update no-ops.
  const ts = new Date(now);
  if (actor === 'pair') {
    prisma.pair
      .update({ where: { id }, data: { lastSeenAt: ts } })
      .catch(() => { /* deleted/race — ignore */ });
  } else {
    prisma.user
      .update({ where: { id }, data: { lastSeenAt: ts } })
      .catch(() => { /* deleted/race — ignore */ });
  }
}

declare global {
  namespace Express {
    interface Request {
      auth?: JwtPayload;
      /** @deprecated Use req.auth instead. Kept for backward compat during migration. */
      user?: JwtPayload & { userId: string; role: string };
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const token =
    req.cookies?.token ||
    req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    const raw = verifyToken(token);

    // Reject legacy student tokens — they must re-login to get a proper pair token
    if (isLegacyStudentPayload(raw)) {
      res.status(401).json({ error: 'Session expired — please log in again' });
      return;
    }

    const payload = normalizePayload(raw);
    if (!payload) {
      res.status(401).json({ error: 'Invalid token format' });
      return;
    }
    req.auth = payload;

    // Backward compat: populate req.user so existing route code doesn't break
    if (isTeacherPayload(payload)) {
      req.user = { ...payload, userId: payload.userId, role: 'teacher' };
      bumpLastSeen('user', payload.userId);
    } else if (isPairPayload(payload)) {
      // For pair tokens, set userId to pairId so existing code that reads req.user!.userId
      // gets the pair identifier. role = 'student' for role checks.
      req.user = { ...payload, userId: payload.pairId, role: 'student' };
      bumpLastSeen('pair', payload.pairId);
    }

    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.auth) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const role = isTeacherPayload(req.auth) ? 'teacher' : 'student';
    if (!roles.includes(role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    next();
  };
}

export function requirePair(req: Request, res: Response, next: NextFunction): void {
  if (!req.auth || !isPairPayload(req.auth)) {
    res.status(403).json({ error: 'Pair authentication required' });
    return;
  }
  next();
}

// Helper extractors
export function getPairId(req: Request): string | null {
  if (req.auth && isPairPayload(req.auth)) return req.auth.pairId;
  return null;
}

export function getTeacherId(req: Request): string | null {
  if (req.auth && isTeacherPayload(req.auth)) return req.auth.userId;
  return null;
}

export function getAuthId(req: Request): string {
  if (req.auth && isTeacherPayload(req.auth)) return req.auth.userId;
  if (req.auth && isPairPayload(req.auth)) return req.auth.pairId;
  return '';
}
