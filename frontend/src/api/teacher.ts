import client from './client';
import type { StudentSummary } from '../types/shifts';

export interface StudentDetail {
  id: string;
  designation: string | null;
  displayName: string;
  lane: number;
  xp: number;
  streak: number;
  lastLoginAt: string | null;
  scores: Array<{
    id: string;
    mission: {
      weekId: string;
      missionType: string;
      title: string;
      week?: {
        weekNumber: number;
      } | null;
    };
  }>;
  recordings: Array<{
    id: string;
    filename: string;
    status: string;
  }>;
  vocabulary: Array<{
    word: string;
    tier: 'approved' | 'grey' | 'black';
    mastery: number;
    encounters: number;
  }>;
}

export interface WeekBriefingSetting {
  id: string;
  weekNumber: number;
  title: string;
  description: string | null;
  briefingMissionId: string | null;
  episodeTitle: string;
  episodeSubtitle: string;
  nowShowingStage: 'clip_a' | 'activity' | 'clip_b' | 'free';
  videoSource: 'auto' | 'upload' | 'embed';
  embedUrl: string;
  clipAEmbedUrl: string;
  clipBEmbedUrl: string;
  uploadedVideoUrl: string;
  uploadedVideoFilename: string;
  clipAUploadedVideoUrl: string;
  clipAUploadedVideoFilename: string;
  clipBUploadedVideoUrl: string;
  clipBUploadedVideoFilename: string;
  fallbackText: string;
  checksCount: number;
}

export async function fetchStudents(classId?: string): Promise<StudentSummary[]> {
  const params = classId ? { classId } : {};
  const { data } = await client.get('/teacher/students', { params });
  return data.students;
}

export async function fetchStudentDetail(studentId: string): Promise<StudentDetail> {
  const { data } = await client.get(`/teacher/students/${studentId}`);
  return data as StudentDetail;
}

export async function fetchWeekBriefings(): Promise<WeekBriefingSetting[]> {
  const { data } = await client.get('/teacher/weeks');
  return data.weeks as WeekBriefingSetting[];
}

export async function updateWeekBriefing(
  weekId: string,
  payload: {
    embedUrl?: string;
    clipAEmbedUrl?: string;
    clipBEmbedUrl?: string;
    episodeTitle?: string;
    episodeSubtitle?: string;
    fallbackText?: string;
    videoSource?: 'auto' | 'upload' | 'embed';
    nowShowingStage?: 'clip_a' | 'activity' | 'clip_b' | 'free';
  }
): Promise<void> {
  await client.patch(`/teacher/weeks/${weekId}/briefing`, payload);
}

export async function uploadWeekBriefingVideo(
  weekId: string,
  file: File,
  slot: 'primary' | 'clipA' | 'clipB' = 'primary'
): Promise<{
  uploadedVideoUrl: string;
  uploadedVideoFilename: string;
}> {
  const formData = new FormData();
  formData.append('video', file);
  const endpoint = slot === 'primary'
    ? `/teacher/weeks/${weekId}/briefing/video`
    : `/teacher/weeks/${weekId}/briefing/video/${slot}`;
  const { data } = await client.post(endpoint, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return {
    uploadedVideoUrl: data.uploadedVideoUrl,
    uploadedVideoFilename: data.uploadedVideoFilename,
  };
}

// ── Live Monitoring ──────────────────────────────────────────────

export interface OnlineStudentData {
  userId: string;
  socketId: string;
  designation: string | null;
  displayName: string;
  weekNumber: number | null;
  stepId: string | null;
  connectedAt: string;
  lastActivityAt: string;
}

export async function fetchOnlineStudents(): Promise<OnlineStudentData[]> {
  const { data } = await client.get('/teacher/online-students');
  return data.students as OnlineStudentData[];
}

// ── Gradebook ───────────────────────────────────────────────────

export interface GradebookMissionScore {
  id: string;
  score: number;
  details: Record<string, unknown> | null;
  mission: {
    id: string;
    missionType: string;
    weekId: string;
    week: { weekNumber: number } | null;
  };
}

export interface GradebookStudent {
  id: string;
  designation: string | null;
  displayName: string;
  missionScores: GradebookMissionScore[];
}

export interface GradebookWeek {
  id: string;
  weekNumber: number;
  title: string;
}

export interface GradebookData {
  students: GradebookStudent[];
  weeks: GradebookWeek[];
}

export async function fetchGradebook(classId?: string): Promise<GradebookData> {
  const params = classId ? { classId } : {};
  const { data } = await client.get('/teacher/gradebook', { params });
  return data as GradebookData;
}

// ── Class Management ───────────────────────────────────────────

export interface ClassInfo {
  id: string;
  name: string;
  joinCode: string;
  isActive: boolean;
  studentCount: number;
  unlockedWeekIds: string[];
  createdAt: string;
}

export async function fetchClasses(): Promise<ClassInfo[]> {
  const { data } = await client.get('/classes');
  return data.classes as ClassInfo[];
}

export async function createClass(name: string): Promise<ClassInfo> {
  const { data } = await client.post('/classes', { name });
  return data as ClassInfo;
}

export async function updateClass(classId: string, updates: { name?: string; isActive?: boolean }): Promise<void> {
  await client.patch(`/classes/${classId}`, updates);
}

export async function regenerateClassCode(classId: string): Promise<string> {
  const { data } = await client.post(`/classes/${classId}/regenerate-code`);
  return data.joinCode as string;
}

export async function unlockWeek(classId: string, weekId: string): Promise<void> {
  await client.post(`/classes/${classId}/unlock-week`, { weekId });
}

export async function lockWeek(classId: string, weekId: string): Promise<void> {
  await client.delete(`/classes/${classId}/unlock-week/${weekId}`);
}

// ── Storyboard API ──────────────────────────────────────────────

export interface StoryboardAlternative {
  id: string;
  label: string;
  description: string;
}

export interface StoryboardStep {
  orderIndex: number;
  missionId: string | null;
  missionType: string;
  label: string;
  icon: string;
  location: string;
  summary: string;
  grammarFocus: string;
  knownWords: string[];
  newWords: string[];
  currentActivityId: string;
  alternatives: StoryboardAlternative[];
  videoClipUrl: string;
  videoClipFilename: string;
  // Briefing-specific
  episodeTitle?: string;
  episodeSubtitle?: string;
  nowShowingStage?: string;
  videoSource?: string;
  clipAUploadedVideoUrl?: string;
  clipAUploadedVideoFilename?: string;
  clipBUploadedVideoUrl?: string;
  clipBUploadedVideoFilename?: string;
  uploadedVideoUrl?: string;
  uploadedVideoFilename?: string;
  embedUrl?: string;
  clipAEmbedUrl?: string;
  clipBEmbedUrl?: string;
  fallbackText?: string;
  checksCount?: number;
}

export interface StoryboardData {
  weekId: string;
  weekNumber: number;
  title: string;
  description: string | null;
  steps: StoryboardStep[];
}

export async function fetchWeekStoryboard(weekId: string): Promise<StoryboardData> {
  const { data } = await client.get(`/teacher/weeks/${weekId}/storyboard`);
  return data as StoryboardData;
}

export async function updateStepActivity(
  weekId: string,
  missionType: string,
  payload: { activityId?: string; reset?: boolean; removeVideo?: boolean }
): Promise<void> {
  await client.patch(`/teacher/weeks/${weekId}/steps/${missionType}`, payload);
}

export async function uploadStepVideo(
  weekId: string,
  missionType: string,
  file: File
): Promise<{ videoClipUrl: string; videoClipFilename: string }> {
  const formData = new FormData();
  formData.append('video', file);
  const { data } = await client.post(
    `/teacher/weeks/${weekId}/steps/${missionType}/video`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return {
    videoClipUrl: data.videoClipUrl,
    videoClipFilename: data.videoClipFilename,
  };
}
