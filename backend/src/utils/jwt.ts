import jwt, { SignOptions } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Discriminated union for JWT payloads
export interface TeacherPayload {
  type: 'teacher';
  userId: string;
  role: 'teacher';
}

export interface PairPayload {
  type: 'pair';
  pairId: string;
  designation: string;
  classId: string;
  lane: number;
}

// Legacy tokens (pre-pair system) have no `type` field
export interface LegacyPayload {
  userId: string;
  role: string;
}

export type JwtPayload = TeacherPayload | PairPayload;

// Decoded payload may include legacy tokens without `type`
export type DecodedPayload = JwtPayload | LegacyPayload;

export function signToken(payload: JwtPayload): string {
  const options: SignOptions = { expiresIn: JWT_EXPIRES_IN as any };
  return jwt.sign(payload, JWT_SECRET, options);
}

export function verifyToken(token: string): DecodedPayload {
  return jwt.verify(token, JWT_SECRET) as DecodedPayload;
}

// Type guards
export function isTeacherPayload(p: DecodedPayload): p is TeacherPayload {
  return 'type' in p && p.type === 'teacher' && (p as TeacherPayload).role === 'teacher';
}

export function isPairPayload(p: DecodedPayload): p is PairPayload {
  return 'type' in p && p.type === 'pair';
}

/** Returns true for legacy User-table student tokens (no `type` field, role=student). */
export function isLegacyStudentPayload(p: DecodedPayload): p is LegacyPayload {
  return !('type' in p) && (p as LegacyPayload).role === 'student';
}

// Normalize decoded tokens — legacy tokens without `type` are REJECTED (not elevated)
export function normalizePayload(p: DecodedPayload): JwtPayload | null {
  if ('type' in p) return p as JwtPayload;
  // Legacy token without type field — check role explicitly
  const legacy = p as LegacyPayload;
  if (legacy.role === 'teacher') {
    return { type: 'teacher', userId: legacy.userId, role: 'teacher' };
  }
  // Legacy student tokens are NOT converted to teacher — return null (rejected)
  return null;
}
