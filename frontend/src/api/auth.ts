import client from './client';

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
}

export async function loginStudent(designation: string, pin: string) {
  const { data } = await client.post('/auth/login', { designation, pin });
  return data.user as User;
}

export async function loginTeacher(username: string, password: string) {
  const { data } = await client.post('/auth/login', { username, password });
  return data.user as User;
}

export async function registerStudent(studentNumber: string, pin: string, displayName?: string) {
  const { data } = await client.post('/auth/register', { studentNumber, pin, displayName });
  return data.user as User;
}

export async function logout() {
  await client.post('/auth/logout');
}

export async function getMe() {
  const { data } = await client.get('/auth/me');
  return data.user as User;
}
