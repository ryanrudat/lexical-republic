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
    headers: { 'Content-Type': undefined },
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
  /** Top-level PEARL in-character feedback saved alongside the score (Unit 4). */
  pearlFeedback?: string | null;
  /** Top-level teacher comment on this score (Unit 4). */
  teacherComment?: string | null;
  mission: {
    id: string;
    missionType: string;
    weekId: string;
    week: { weekNumber: number } | null;
  };
}

/** Single multi-choice answer record rendered in the Gradebook drill-down (Unit 3). */
export interface AnswerLogEntry {
  questionId?: string;
  prompt?: string;
  chosen?: string;
  correct?: string;
  wasCorrect?: boolean;
  attempts?: number;
}

export interface GradebookShiftResult {
  weekNumber: number;
  documentsProcessed: number;
  documentsTotal: number;
  errorsFound: number;
  errorsTotal: number;
  vocabScore: number;
  grammarAccuracy: number;
  targetWordsUsed: number;
  concernScoreDelta: number;
  completedAt: string | null;
  /** Extra metrics stashed by ShiftClosing (PR #18): writingScore,
   *  overallScore, targetWordsHit, wordsWritten. Optional — absent on
   *  ShiftResults written before the new payload shape existed. */
  taskResults?: Record<string, unknown> | null;
}

export interface GradebookStudent {
  id: string;
  designation: string | null;
  displayName: string;
  missionScores: GradebookMissionScore[];
  shiftResults?: GradebookShiftResult[];
}

export interface GradebookWeek {
  id: string;
  weekNumber: number;
  title: string;
  shiftType: 'queue' | 'phase';
  taskTypes: Array<{ id: string; type: string; title: string }> | null;
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

// ── Writing Review ──────────────────────────────────────────────
//
// Class-wide, per-shift view of every written submission. Matches the
// response shape defined for parallel Unit 4 (`GET /api/teacher/classes/
// :classId/writing-review?week=N`). If that endpoint isn't live yet,
// `fetchWritingReview` falls back to transforming `/teacher/gradebook`
// client-side — see the fallback path below.

export interface WritingReviewEntry {
  scoreId: string;
  studentId: string;
  designation: string | null;
  displayName: string;
  taskType: string;
  taskTitle: string;
  score: number;
  submittedAt: string | null;
  writingText: string;
  label: string | null;
  /** Optional per-score submittedAnyway flag populated by Unit 1's ShiftReport fallback. */
  submittedAnyway: boolean;
  /** AI evaluation metadata — may be absent on legacy scores. */
  grammarScore: number | null;
  grammarNotes: string[];
  vocabUsed: string[];
  vocabMissed: string[];
  taskNotes: string | null;
  pearlFeedback: string | null;
  teacherComment: string | null;
}

export interface WritingReviewData {
  weekNumber: number;
  weekTitle: string | null;
  entries: WritingReviewEntry[];
}

const QUEUE_TASK_TITLE_FALLBACK: Record<string, string> = {
  intake_form: 'Intake Form',
  vocab_clearance: 'Vocab Clearance',
  document_review: 'Document Review',
  contradiction_report: 'Contradiction Report',
  shift_report: 'Shift Report',
  priority_briefing: 'Priority Briefing',
  priority_sort: 'Priority Sort',
};

// Extract every writing payload stored on a MissionScore's details blob
// into one or more WritingReviewEntry rows. Matches the priority order
// documented in the Unit 6 brief: writingText → text → writingSubmissions.
function entriesFromScoreDetails(
  score: GradebookMissionScore,
  student: GradebookStudent,
  taskTitleMap: Record<string, string>,
): WritingReviewEntry[] {
  const details = (score.details ?? {}) as Record<string, unknown>;
  const texts: Array<{ text: string; label: string | null }> = [];

  if (typeof details.writingText === 'string' && details.writingText.trim().length > 0) {
    texts.push({ text: details.writingText, label: null });
  }
  if (typeof details.text === 'string' && details.text.trim().length > 0) {
    texts.push({ text: details.text, label: null });
  }
  if (details.writingSubmissions && typeof details.writingSubmissions === 'object') {
    const subs = details.writingSubmissions as Record<string, string>;
    Object.entries(subs).forEach(([key, text]) => {
      if (typeof text === 'string' && text.trim().length > 0) {
        texts.push({ text, label: `Card ${Number(key) + 1}` });
      }
    });
  }
  if (details.justifications && typeof details.justifications === 'object') {
    const justs = details.justifications as Record<string, string>;
    Object.entries(justs).forEach(([caseId, text]) => {
      if (typeof text === 'string' && text.trim().length > 0) {
        texts.push({ text, label: `Case ${caseId}` });
      }
    });
  }

  // Deduplicate: if writingText and text are the same string (common), keep one.
  const seen = new Set<string>();
  const unique = texts.filter((t) => {
    const key = `${t.label ?? ''}::${t.text}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (unique.length === 0) return [];

  const taskType = score.mission.missionType;
  const taskTitle = taskTitleMap[taskType] ?? QUEUE_TASK_TITLE_FALLBACK[taskType] ?? taskType;
  const pearlFeedback = typeof details.pearlFeedback === 'string' ? details.pearlFeedback : null;
  const teacherComment = typeof details.teacherComment === 'string' ? details.teacherComment : null;
  const grammarScore = typeof details.grammarScore === 'number' ? details.grammarScore : null;
  const grammarNotes = Array.isArray(details.grammarNotes)
    ? (details.grammarNotes as unknown[]).filter((n): n is string => typeof n === 'string')
    : [];
  const vocabUsed = Array.isArray(details.vocabUsed)
    ? (details.vocabUsed as unknown[]).filter((n): n is string => typeof n === 'string')
    : [];
  const vocabMissed = Array.isArray(details.vocabMissed)
    ? (details.vocabMissed as unknown[]).filter((n): n is string => typeof n === 'string')
    : [];
  const taskNotes = typeof details.taskNotes === 'string' ? details.taskNotes : null;
  const submittedAnyway = details.submittedAnyway === true;

  return unique.map((t) => ({
    scoreId: score.id,
    studentId: student.id,
    designation: student.designation,
    displayName: student.displayName,
    taskType,
    taskTitle,
    score: score.score,
    submittedAt: null,
    writingText: t.text,
    label: t.label,
    submittedAnyway,
    grammarScore,
    grammarNotes,
    vocabUsed,
    vocabMissed,
    taskNotes,
    pearlFeedback,
    teacherComment,
  }));
}

export async function fetchWritingReview(
  classId: string,
  weekNumber: number,
): Promise<WritingReviewData> {
  try {
    const { data } = await client.get(
      `/teacher/classes/${classId}/writing-review`,
      { params: { week: weekNumber } },
    );
    return data as WritingReviewData;
  } catch (err) {
    // TODO(unit-4): remove this fallback once the dedicated writing-review
    // endpoint lands. Until then, transform the gradebook response client-side
    // so the teacher UI works end-to-end.
    const status = (err as { response?: { status?: number } }).response?.status;
    if (status && status !== 404) throw err;

    const gradebook = await fetchGradebook(classId);
    const week = gradebook.weeks.find((w) => w.weekNumber === weekNumber) ?? null;
    const taskTitleMap: Record<string, string> = {};
    (week?.taskTypes ?? []).forEach((t) => {
      taskTitleMap[t.type] = t.title;
    });

    const entries: WritingReviewEntry[] = [];
    for (const student of gradebook.students) {
      const weekScores = week
        ? student.missionScores.filter((ms) => ms.mission.weekId === week.id)
        : [];
      for (const score of weekScores) {
        entries.push(...entriesFromScoreDetails(score, student, taskTitleMap));
      }
    }

    return {
      weekNumber,
      weekTitle: week?.title ?? null,
      entries,
    };
  }
}

// ── Grade Management ─────────────────────────────────────────

export async function updateScore(scoreId: string, score: number, details?: Record<string, unknown>): Promise<void> {
  await client.patch(`/teacher/scores/${scoreId}`, { score, details });
}

// Writes a teacher comment onto a MissionScore's details blob. Unit 4's
// dedicated `PATCH /teacher/scores/:scoreId/comment` endpoint is preferred;
// if it's missing, we fall back to the existing PATCH endpoint by merging
// `teacherComment` into `details`.
export async function updateScoreComment(
  scoreId: string,
  teacherComment: string,
  existingDetails?: Record<string, unknown> | null,
): Promise<void> {
  try {
    await client.patch(`/teacher/scores/${scoreId}/comment`, { comment: teacherComment });
  } catch (err) {
    const status = (err as { response?: { status?: number } }).response?.status;
    if (status && status !== 404) throw err;
    const merged = { ...(existingDetails ?? {}), teacherComment };
    await client.patch(`/teacher/scores/${scoreId}`, { details: merged });
  }
}

export async function deleteScore(scoreId: string): Promise<void> {
  await client.delete(`/teacher/scores/${scoreId}`);
}

/**
 * PATCH teacher comment on a mission score (Unit 4 — backend endpoint).
 * Returns the updated MissionScore payload on success. Will 404 until the
 * backend route ships; callers should handle that gracefully.
 */
export async function patchMissionScoreComment(
  scoreId: string,
  comment: string | null,
): Promise<GradebookMissionScore> {
  const { data } = await client.patch(`/teacher/scores/${scoreId}/comment`, { comment });
  return data as GradebookMissionScore;
}

export async function resetWeekProgress(pairId: string, weekId: string): Promise<void> {
  await client.delete(`/teacher/students/${pairId}/weeks/${weekId}/progress`);
}

export async function overrideConcern(pairId: string, concernScore: number): Promise<void> {
  await client.patch(`/teacher/students/${pairId}/concern`, { concernScore });
}

export async function setStudentLane(pairId: string, lane: number): Promise<void> {
  await client.patch(`/teacher/students/${pairId}/lane`, { lane });
}

export async function setClassDefaultLane(classId: string, defaultLane: number): Promise<void> {
  await client.patch(`/classes/${classId}`, { defaultLane });
}

export async function setNarrativeRoute(classId: string, narrativeRoute: string): Promise<void> {
  await client.patch(`/classes/${classId}`, { narrativeRoute });
}

export async function deleteStudent(studentId: string): Promise<void> {
  await client.delete(`/teacher/students/${studentId}`);
}

export async function deleteAllStudents(): Promise<{ pairsDeleted: number; usersDeleted: number }> {
  const { data } = await client.delete('/teacher/students');
  return data as { pairsDeleted: number; usersDeleted: number };
}

export interface ShiftStatus {
  weekNumber: number;
  weekTitle?: string;
  tasks: Array<{ id: string; label: string; complete: boolean }>;
  currentTaskIndex: number;
  totalTasks: number;
  completedTasks: number;
}

export async function fetchShiftStatus(studentId: string): Promise<ShiftStatus> {
  const { data } = await client.get(`/teacher/students/${studentId}/shift-status`);
  return data as ShiftStatus;
}

export async function sendTaskCommand(
  studentId: string,
  action: 'skip-task' | 'reset-task' | 'reset-shift' | 'send-to-task',
  taskId?: string,
): Promise<void> {
  await client.post(`/teacher/students/${studentId}/task-command`, { action, taskId });
}

export async function moveStudentToShift(studentId: string, weekNumber: number): Promise<void> {
  await client.post(`/teacher/students/${studentId}/move-to-shift`, { weekNumber });
}

export async function moveClassToShift(classId: string, weekNumber: number): Promise<void> {
  await client.post(`/teacher/classes/${classId}/move-to-shift`, { weekNumber });
}

// ── Class Management ───────────────────────────────────────────

export interface ClassInfo {
  id: string;
  name: string;
  joinCode: string;
  isActive: boolean;
  harmonyOpen: boolean;
  defaultLane: number;
  narrativeRoute: string;
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

export async function toggleHarmony(classId: string, open: boolean): Promise<void> {
  await client.patch(`/classes/${classId}/harmony`, { open });
}

export async function deleteClass(classId: string): Promise<void> {
  await client.delete(`/classes/${classId}`);
}

export async function removeStudentFromClass(classId: string, studentId: string): Promise<void> {
  await client.delete(`/classes/${classId}/students/${studentId}`);
}

export interface ClassStudent {
  id: string;
  designation: string | null;
  displayName: string;
  lane: number;
  xp: number;
  lastLoginAt: string | null;
  enrolledAt: string;
  isPair: boolean;
}

export interface ClassDetail {
  id: string;
  name: string;
  joinCode: string;
  isActive: boolean;
  createdAt: string;
  students: ClassStudent[];
  unlockedWeeks: { weekId: string; weekNumber: number; title: string; unlockedAt: string }[];
}

export async function fetchClassDetail(classId: string): Promise<ClassDetail> {
  const { data } = await client.get(`/classes/${classId}`);
  return data as ClassDetail;
}

// ── Task Gate API ───────────────────────────────────────────────

export async function fetchTaskGates(
  classId: string,
  weekId: string
): Promise<{ taskGates: number[] }> {
  const { data } = await client.get(`/classes/${classId}/weeks/${weekId}/task-gate`);
  return data as { taskGates: number[] };
}

export async function setTaskGates(
  classId: string,
  weekId: string,
  taskGates: number[]
): Promise<{ taskGates: number[] }> {
  const { data } = await client.patch(`/classes/${classId}/weeks/${weekId}/task-gate`, { taskGates });
  return data as { taskGates: number[] };
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
  videoClipEmbedUrl: string;
  videoClipHidden: boolean;
  dismissalClipUrl: string;
  dismissalClipFilename: string;
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
  payload: { activityId?: string; reset?: boolean; removeVideo?: boolean; removeDismissalVideo?: boolean; videoClipEmbedUrl?: string; videoClipHidden?: boolean }
): Promise<void> {
  await client.patch(`/teacher/weeks/${weekId}/steps/${missionType}`, payload);
}

export async function uploadStepVideo(
  weekId: string,
  missionType: string,
  file: File,
  slot?: 'primary' | 'dismissal',
): Promise<{ videoClipUrl: string; videoClipFilename: string }> {
  const formData = new FormData();
  formData.append('video', file);
  const url = slot && slot !== 'primary'
    ? `/teacher/weeks/${weekId}/steps/${missionType}/video?slot=${slot}`
    : `/teacher/weeks/${weekId}/steps/${missionType}/video`;
  const { data } = await client.post(url, formData, {
    headers: { 'Content-Type': undefined },
  });
  return {
    videoClipUrl: data.videoClipUrl || data.dismissalClipUrl,
    videoClipFilename: data.videoClipFilename || data.dismissalClipFilename,
  };
}
