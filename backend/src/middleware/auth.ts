import { Request, Response, NextFunction } from 'express';
import { verifyToken, normalizePayload, isTeacherPayload, isPairPayload } from '../utils/jwt';
import type { JwtPayload, TeacherPayload, PairPayload } from '../utils/jwt';

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
    const payload = normalizePayload(raw);
    req.auth = payload;

    // Backward compat: populate req.user so existing route code doesn't break
    if (isTeacherPayload(payload)) {
      req.user = { ...payload, userId: payload.userId, role: 'teacher' };
    } else if (isPairPayload(payload)) {
      // For pair tokens, set userId to pairId so existing code that reads req.user!.userId
      // gets the pair identifier. role = 'student' for role checks.
      req.user = { ...payload, userId: payload.pairId, role: 'student' };
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
