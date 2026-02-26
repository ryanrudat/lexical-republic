import client from './client';
import { setStoredToken, clearStoredToken } from './client';

export interface User {
  id: string;
  displayName: string;
  designation: string | null;
  username: string | null;
  role: 'student' | 'teacher';
  lane: number;
  xp: number;
  streak: number;
  lastLoginAt: string | null;
  classId?: string | null;
  className?: string | null;
  classes?: Array<{ id: string; name: string; joinCode: string }>;
  // Pair-specific fields (present when role === 'student' and this is a pair login)
  pairId?: string | null;
  studentAName?: string | null;
  studentBName?: string | null;
  concernScore?: number;
  hasWatchedWelcome?: boolean;
}

export async function loginStudent(designation: string, pin: string) {
  const { data } = await client.post('/auth/login', { designation, pin });
  if (data.token) setStoredToken(data.token);
  return data.user as User;
}

export async function loginTeacher(username: string, password: string) {
  const { data } = await client.post('/auth/login', { username, password });
  if (data.token) setStoredToken(data.token);
  return data.user as User;
}

export async function registerStudent(
  studentNumber: string,
  pin: string,
  displayName?: string,
  classCode?: string,
  studentAName?: string,
  studentBName?: string
) {
  const { data } = await client.post('/auth/register', {
    studentNumber,
    pin,
    displayName,
    classCode,
    studentAName,
    studentBName,
  });
  if (data.token) setStoredToken(data.token);
  return data.user as User;
}

export async function logout() {
  await client.post('/auth/logout');
  clearStoredToken();
}

export async function getMe() {
  const { data } = await client.get('/auth/me');
  if (data.token) setStoredToken(data.token);
  return data.user as User;
}
