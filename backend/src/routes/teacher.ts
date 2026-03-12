import { Prisma } from '@prisma/client';
import { Router, Request, Response } from 'express';
import { authenticate, requireRole, getTeacherId } from '../middleware/auth';
import path from 'path';
import fs from 'fs';
import { uploadVideo } from '../middleware/upload';
import prisma from '../utils/prisma';
import { io, getOnlineStudents } from '../socketServer';
import { findAlternative } from '../data/activityPool';
import { getWeekConfig } from '../data/week-configs';

const router = Router();
router.use(authenticate, requireRole('teacher'));

// ── Ownership helpers ──────────────────────────────────────────────

/** Returns class IDs owned by this teacher. */
async function getTeacherClassIds(teacherId: string): Promise<string[]> {
  const classes = await prisma.class.findMany({
    where: { teacherId },
    select: { id: true },
  });
  return classes.map(c => c.id);
}

/** Returns true if the pair belongs to one of the teacher's classes. */
async function teacherOwnsPair(teacherId: string, pairId: string): Promise<boolean> {
  const classIds = await getTeacherClassIds(teacherId);
  if (classIds.length === 0) return false;
  const enrollment = await prisma.classEnrollment.findFirst({
    where: { pairId, classId: { in: classIds } },
  });
  return !!enrollment;
}

/** Returns true if the MissionScore belongs to a student in teacher's classes. */
async function teacherOwnsScore(teacherId: string, scoreId: string): Promise<boolean> {
  const score = await prisma.missionScore.findUnique({
    where: { id: scoreId },
    select: { pairId: true, userId: true },
  });
  if (!score) return false;
  const classIds = await getTeacherClassIds(teacherId);
  if (classIds.length === 0) return false;
  if (score.pairId) {
    const enrollment = await prisma.classEnrollment.findFirst({
      where: { pairId: score.pairId, classId: { in: classIds } },
    });
    return !!enrollment;
  }
  if (score.userId) {
    const enrollment = await prisma.classEnrollment.findFirst({
      where: { userId: score.userId, classId: { in: classIds } },
    });
    return !!enrollment;
  }
  return false;
}
const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';
const BRIEFING_UPLOAD_DIR = process.env.BRIEFING_UPLOAD_DIR || path.join(UPLOAD_DIR, 'briefings');
// URL prefix for stored video paths — always relative, served by express.static('/uploads')
const BRIEFING_URL_PREFIX = '/uploads/briefings';
type VideoSlot = 'primary' | 'clipA' | 'clipB';

const VIDEO_SLOT_FIELDS: Record<VideoSlot, { urlKey: string; filenameKey: string }> = {
  primary: { urlKey: 'uploadedVideoUrl', filenameKey: 'uploadedVideoFilename' },
  clipA: { urlKey: 'clipAUploadedVideoUrl', filenameKey: 'clipAUploadedVideoFilename' },
  clipB: { urlKey: 'clipBUploadedVideoUrl', filenameKey: 'clipBUploadedVideoFilename' },
};

// GET /api/teacher/students — Students in teacher's classes only
router.get('/students', async (req: Request, res: Response) => {
  try {
    const teacherId = getTeacherId(req)!;
    const classIds = await getTeacherClassIds(teacherId);
    const requestedClassId = typeof req.query.classId === 'string' ? req.query.classId : undefined;

    // If a specific classId is requested, verify teacher owns it
    if (requestedClassId && !classIds.includes(requestedClassId)) {
      res.status(403).json({ error: 'Not your class' });
      return;
    }

    const filterClassIds = requestedClassId ? [requestedClassId] : classIds;

    // Fetch pairs (new system) — scoped to teacher's classes
    const pairs = await prisma.pair.findMany({
      where: { enrollments: { some: { classId: { in: filterClassIds } } } },
      include: {
        missionScores: {
          include: {
            mission: { select: { weekId: true, missionType: true } },
          },
        },
        enrollments: {
          include: { class: { select: { id: true, name: true } } },
          take: 1,
        },
      },
      orderBy: { designation: 'asc' },
    });

    const pairResults = pairs.map((p) => {
      const clockedOutWeeks = new Set(
        p.missionScores
          .filter(
            (ms) =>
              ms.mission.missionType === 'clock_out' &&
              (ms.details as any)?.status === 'complete'
          )
          .map((ms) => ms.mission.weekId)
      );
      const enrollment = p.enrollments[0];
      return {
        id: p.id,
        designation: p.designation,
        displayName: `${p.studentAName}${p.studentBName ? ` & ${p.studentBName}` : ''}`,
        studentAName: p.studentAName,
        studentBName: p.studentBName,
        lane: p.lane,
        xp: p.xp,
        concernScore: p.concernScore,
        weeksCompleted: clockedOutWeeks.size,
        lastLoginAt: p.lastLoginAt,
        classId: enrollment?.class.id ?? null,
        className: enrollment?.class.name ?? null,
        isPair: true,
      };
    });

    // Also fetch legacy User-based students — scoped to teacher's classes
    const legacyStudents = await prisma.user.findMany({
      where: {
        role: 'student',
        enrollments: { some: { classId: { in: filterClassIds } } },
      },
      include: {
        missionScores: {
          include: {
            mission: { select: { weekId: true, missionType: true } },
          },
        },
        enrollments: {
          include: { class: { select: { id: true, name: true } } },
          take: 1,
        },
      },
      orderBy: { designation: 'asc' },
    });

    const legacyResults = legacyStudents.map((s) => {
      const clockedOutWeeks = new Set(
        s.missionScores
          .filter(
            (ms) =>
              ms.mission.missionType === 'clock_out' &&
              (ms.details as any)?.status === 'complete'
          )
          .map((ms) => ms.mission.weekId)
      );
      const enrollment = s.enrollments[0];
      return {
        id: s.id,
        designation: s.designation,
        displayName: s.displayName,
        lane: s.lane,
        xp: s.xp,
        concernScore: 0,
        weeksCompleted: clockedOutWeeks.size,
        lastLoginAt: s.lastLoginAt,
        classId: enrollment?.class.id ?? null,
        className: enrollment?.class.name ?? null,
        isPair: false,
      };
    });

    res.json({ students: [...pairResults, ...legacyResults] });
  } catch (err) {
    console.error('Teacher students fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
});

// GET /api/teacher/weeks — week list with briefing mission metadata
router.get('/weeks', async (_req: Request, res: Response) => {
  try {
    const weeks = await prisma.week.findMany({
      orderBy: { weekNumber: 'asc' },
      include: {
        missions: {
          where: { missionType: 'briefing' },
          select: {
            id: true,
            config: true,
          },
          take: 1,
        },
      },
    });

    const payload = weeks.map((week) => {
      const briefing = week.missions[0];
      const config = briefing?.config;
      const safeConfig =
        config && typeof config === 'object' && !Array.isArray(config)
          ? (config as Record<string, unknown>)
          : {};
      const checks = Array.isArray(safeConfig.checks) ? safeConfig.checks : [];

      return {
        id: week.id,
        weekNumber: week.weekNumber,
        title: week.title,
        description: week.description,
        briefingMissionId: briefing?.id || null,
        episodeTitle: typeof safeConfig.episodeTitle === 'string' ? safeConfig.episodeTitle : '',
        episodeSubtitle: typeof safeConfig.episodeSubtitle === 'string' ? safeConfig.episodeSubtitle : '',
        embedUrl: typeof safeConfig.embedUrl === 'string' ? safeConfig.embedUrl : '',
        clipAEmbedUrl: typeof safeConfig.clipAEmbedUrl === 'string' ? safeConfig.clipAEmbedUrl : '',
        clipBEmbedUrl: typeof safeConfig.clipBEmbedUrl === 'string' ? safeConfig.clipBEmbedUrl : '',
        videoSource:
          safeConfig.videoSource === 'upload' || safeConfig.videoSource === 'embed' || safeConfig.videoSource === 'auto'
            ? safeConfig.videoSource
            : 'auto',
        nowShowingStage:
          safeConfig.nowShowingStage === 'clip_a' || safeConfig.nowShowingStage === 'activity' || safeConfig.nowShowingStage === 'clip_b' || safeConfig.nowShowingStage === 'free'
            ? safeConfig.nowShowingStage
            : 'free',
        uploadedVideoUrl: typeof safeConfig.uploadedVideoUrl === 'string' ? safeConfig.uploadedVideoUrl : '',
        uploadedVideoFilename: typeof safeConfig.uploadedVideoFilename === 'string' ? safeConfig.uploadedVideoFilename : '',
        clipAUploadedVideoUrl: typeof safeConfig.clipAUploadedVideoUrl === 'string' ? safeConfig.clipAUploadedVideoUrl : '',
        clipAUploadedVideoFilename: typeof safeConfig.clipAUploadedVideoFilename === 'string' ? safeConfig.clipAUploadedVideoFilename : '',
        clipBUploadedVideoUrl: typeof safeConfig.clipBUploadedVideoUrl === 'string' ? safeConfig.clipBUploadedVideoUrl : '',
        clipBUploadedVideoFilename: typeof safeConfig.clipBUploadedVideoFilename === 'string' ? safeConfig.clipBUploadedVideoFilename : '',
        fallbackText: typeof safeConfig.fallbackText === 'string' ? safeConfig.fallbackText : '',
        checksCount: checks.length,
      };
    });

    res.json({ weeks: payload });
  } catch (err) {
    console.error('Teacher weeks fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch week briefing settings' });
  }
});

async function handleBriefingVideoUpload(req: Request, res: Response, slot: VideoSlot) {
  try {
    const weekId = req.params.weekId as string;

    if (!req.file) {
      res.status(400).json({ error: 'No video file provided' });
      return;
    }

    const briefingMission = await prisma.mission.findFirst({
      where: { weekId, missionType: 'briefing' },
    });

    if (!briefingMission) {
      res.status(404).json({ error: 'Briefing mission not found for this week' });
      return;
    }

    const existingConfig =
      briefingMission.config &&
      typeof briefingMission.config === 'object' &&
      !Array.isArray(briefingMission.config)
        ? (briefingMission.config as Record<string, unknown>)
        : {};

    const uploadedVideoUrl = `${BRIEFING_URL_PREFIX}/${req.file.filename}`;

    const updatedMission = await prisma.mission.update({
      where: { id: briefingMission.id },
      data: {
        config: {
          ...existingConfig,
          [VIDEO_SLOT_FIELDS[slot].urlKey]: uploadedVideoUrl,
          [VIDEO_SLOT_FIELDS[slot].filenameKey]: req.file.originalname,
          ...(slot === 'primary' ? { videoSource: 'upload' } : {}),
        } as Prisma.InputJsonValue,
      },
      select: {
        id: true,
        weekId: true,
        config: true,
      },
    });

    res.status(201).json({
      missionId: updatedMission.id,
      weekId: updatedMission.weekId,
      config: updatedMission.config,
      slot,
      uploadedVideoUrl,
      uploadedVideoFilename: req.file.originalname,
    });
  } catch (err) {
    console.error('Teacher briefing video upload error:', err);
    res.status(500).json({ error: 'Failed to upload briefing video' });
  }
}

// POST /api/teacher/weeks/:weekId/briefing/video — upload primary briefing video file
router.post('/weeks/:weekId/briefing/video', uploadVideo.single('video'), async (req: Request, res: Response) => {
  await handleBriefingVideoUpload(req, res, 'primary');
});

// POST /api/teacher/weeks/:weekId/briefing/video/:slot — upload clipA or clipB
router.post('/weeks/:weekId/briefing/video/:slot', uploadVideo.single('video'), async (req: Request, res: Response) => {
  const slot = req.params.slot as string;
  if (slot !== 'clipA' && slot !== 'clipB') {
    res.status(400).json({ error: "slot must be 'clipA' or 'clipB'" });
    return;
  }
  await handleBriefingVideoUpload(req, res, slot);
});

// PATCH /api/teacher/weeks/:weekId/briefing — update briefing metadata/video URL
router.patch('/weeks/:weekId/briefing', async (req: Request, res: Response) => {
  try {
    const weekId = req.params.weekId as string;
    const {
      embedUrl,
      clipAEmbedUrl,
      clipBEmbedUrl,
      episodeTitle,
      episodeSubtitle,
      fallbackText,
      videoSource,
      nowShowingStage,
    } = req.body as {
      embedUrl?: unknown;
      clipAEmbedUrl?: unknown;
      clipBEmbedUrl?: unknown;
      episodeTitle?: unknown;
      episodeSubtitle?: unknown;
      fallbackText?: unknown;
      videoSource?: unknown;
      nowShowingStage?: unknown;
    };

    const updates: Record<string, unknown> = {};

    const stringFields: Array<[string, unknown]> = [
      ['embedUrl', embedUrl],
      ['clipAEmbedUrl', clipAEmbedUrl],
      ['clipBEmbedUrl', clipBEmbedUrl],
      ['episodeTitle', episodeTitle],
      ['episodeSubtitle', episodeSubtitle],
      ['fallbackText', fallbackText],
    ];

    for (const [key, value] of stringFields) {
      if (value === undefined) continue;
      if (typeof value !== 'string') {
        res.status(400).json({ error: `${key} must be a string` });
        return;
      }
      updates[key] = value.trim();
    }

    if (videoSource !== undefined) {
      if (videoSource !== 'upload' && videoSource !== 'embed' && videoSource !== 'auto') {
        res.status(400).json({ error: "videoSource must be one of: 'upload', 'embed', 'auto'" });
        return;
      }
      updates.videoSource = videoSource;
    }

    if (nowShowingStage !== undefined) {
      if (nowShowingStage !== 'clip_a' && nowShowingStage !== 'activity' && nowShowingStage !== 'clip_b' && nowShowingStage !== 'free') {
        res.status(400).json({ error: "nowShowingStage must be one of: 'clip_a', 'activity', 'clip_b', 'free'" });
        return;
      }
      updates.nowShowingStage = nowShowingStage;
    }

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: 'No valid fields provided for update' });
      return;
    }

    const briefingMission = await prisma.mission.findFirst({
      where: { weekId, missionType: 'briefing' },
    });

    if (!briefingMission) {
      res.status(404).json({ error: 'Briefing mission not found for this week' });
      return;
    }

    const existingConfig =
      briefingMission.config &&
      typeof briefingMission.config === 'object' &&
      !Array.isArray(briefingMission.config)
        ? (briefingMission.config as Record<string, unknown>)
        : {};

    const updatedMission = await prisma.mission.update({
      where: { id: briefingMission.id },
      data: {
        config: {
          ...existingConfig,
          ...updates,
        } as Prisma.InputJsonValue,
      },
      select: {
        id: true,
        weekId: true,
        config: true,
      },
    });

    // Emit real-time update to students in this week's room
    if (updates.nowShowingStage !== undefined) {
      io.to(`week:${weekId}`).emit('briefing:stage-changed', {
        weekId,
        nowShowingStage: updates.nowShowingStage,
        missionId: updatedMission.id,
      });
    }

    res.json({
      missionId: updatedMission.id,
      weekId: updatedMission.weekId,
      config: updatedMission.config,
    });
  } catch (err) {
    console.error('Teacher briefing update error:', err);
    res.status(500).json({ error: 'Failed to update briefing settings' });
  }
});

// GET /api/teacher/students/:id — Single student detail (pair or legacy user)
router.get('/students/:id', async (req: Request, res: Response) => {
  try {
    const teacherId = getTeacherId(req)!;
    const studentId = req.params.id as string;

    // Verify this student belongs to one of the teacher's classes
    const classIds = await getTeacherClassIds(teacherId);
    const enrollment = await prisma.classEnrollment.findFirst({
      where: {
        classId: { in: classIds },
        OR: [{ pairId: studentId }, { userId: studentId }],
      },
    });
    if (!enrollment) {
      res.status(404).json({ error: 'Student not found' });
      return;
    }

    // Try Pair first
    const pair = await prisma.pair.findUnique({
      where: { id: studentId },
      include: {
        missionScores: {
          include: {
            mission: {
              select: {
                weekId: true,
                missionType: true,
                title: true,
                week: { select: { weekNumber: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        recordings: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (pair) {
      res.json({
        id: pair.id,
        designation: pair.designation,
        displayName: `${pair.studentAName}${pair.studentBName ? ` & ${pair.studentBName}` : ''}`,
        studentAName: pair.studentAName,
        studentBName: pair.studentBName,
        lane: pair.lane,
        xp: pair.xp,
        concernScore: pair.concernScore,
        lastLoginAt: pair.lastLoginAt,
        scores: pair.missionScores,
        recordings: pair.recordings,
        vocabulary: [],
        isPair: true,
      });
      return;
    }

    // Fallback: legacy User
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      include: {
        missionScores: {
          include: {
            mission: {
              select: {
                weekId: true,
                missionType: true,
                title: true,
                week: { select: { weekNumber: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        recordings: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        studentVocab: {
          include: {
            vocabulary: { select: { word: true, tier: true } },
          },
          orderBy: { mastery: 'desc' },
        },
      },
    });

    if (!student || student.role !== 'student') {
      res.status(404).json({ error: 'Student not found' });
      return;
    }

    res.json({
      id: student.id,
      designation: student.designation,
      displayName: student.displayName,
      lane: student.lane,
      xp: student.xp,
      streak: student.streak,
      lastLoginAt: student.lastLoginAt,
      scores: student.missionScores,
      recordings: student.recordings,
      vocabulary: student.studentVocab.map((sv) => ({
        word: sv.vocabulary.word,
        tier: sv.vocabulary.tier,
        mastery: sv.mastery,
        encounters: sv.encounters,
      })),
      isPair: false,
    });
  } catch (err) {
    console.error('Teacher student detail error:', err);
    res.status(500).json({ error: 'Failed to fetch student details' });
  }
});

// GET /api/teacher/online-students — REST fallback for live student tracking
router.get('/online-students', (req: Request, res: Response) => {
  const classId = typeof req.query.classId === 'string' ? req.query.classId : undefined;
  const students = getOnlineStudents(classId);
  res.json({ students });
});

// GET /api/teacher/gradebook — Students in teacher's classes + mission scores
router.get('/gradebook', async (req: Request, res: Response) => {
  try {
    const teacherId = getTeacherId(req)!;
    const classIds = await getTeacherClassIds(teacherId);
    const requestedClassId = typeof req.query.classId === 'string' ? req.query.classId : undefined;

    if (requestedClassId && !classIds.includes(requestedClassId)) {
      res.status(403).json({ error: 'Not your class' });
      return;
    }

    const filterClassIds = requestedClassId ? [requestedClassId] : classIds;

    // Pairs — scoped to teacher's classes
    const pairs = await prisma.pair.findMany({
      where: { enrollments: { some: { classId: { in: filterClassIds } } } },
      select: {
        id: true,
        designation: true,
        studentAName: true,
        studentBName: true,
        missionScores: {
          select: {
            id: true,
            score: true,
            details: true,
            mission: {
              select: {
                id: true,
                missionType: true,
                weekId: true,
                week: { select: { weekNumber: true } },
              },
            },
          },
        },
      },
      orderBy: { designation: 'asc' },
    });

    const pairStudents = pairs.map((p) => ({
      id: p.id,
      designation: p.designation,
      displayName: `${p.studentAName}${p.studentBName ? ` & ${p.studentBName}` : ''}`,
      missionScores: p.missionScores,
      isPair: true,
    }));

    // Legacy users — scoped to teacher's classes
    const legacyStudents = await prisma.user.findMany({
      where: {
        role: 'student',
        enrollments: { some: { classId: { in: filterClassIds } } },
      },
      select: {
        id: true,
        designation: true,
        displayName: true,
        missionScores: {
          select: {
            id: true,
            score: true,
            details: true,
            mission: {
              select: {
                id: true,
                missionType: true,
                weekId: true,
                week: { select: { weekNumber: true } },
              },
            },
          },
        },
      },
      orderBy: { designation: 'asc' },
    });

    const legacyResults = legacyStudents.map((s) => ({
      ...s,
      isPair: false,
    }));

    const weeks = await prisma.week.findMany({
      orderBy: { weekNumber: 'asc' },
      select: {
        id: true,
        weekNumber: true,
        title: true,
      },
    });

    // Annotate weeks with shift type and task types
    const annotatedWeeks = weeks.map(w => {
      const config = getWeekConfig(w.weekNumber);
      if (config) {
        return {
          ...w,
          shiftType: 'queue' as const,
          taskTypes: config.tasks.map(t => ({ id: t.id, type: t.type, title: t.label })),
        };
      }
      return { ...w, shiftType: 'phase' as const, taskTypes: null };
    });

    res.json({ students: [...pairStudents, ...legacyResults], weeks: annotatedWeeks });
  } catch (err) {
    console.error('Teacher gradebook fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch gradebook data' });
  }
});

// ── Grade Management ──────────────────────────────────────────────

// PATCH /api/teacher/scores/:scoreId — Edit a MissionScore
router.patch('/scores/:scoreId', async (req: Request, res: Response) => {
  try {
    const teacherId = getTeacherId(req)!;
    const scoreId = req.params.scoreId as string;

    if (!(await teacherOwnsScore(teacherId, scoreId))) {
      res.status(404).json({ error: 'Score not found' });
      return;
    }

    const { score, details } = req.body;
    const updateData: Record<string, unknown> = {};
    if (typeof score === 'number') updateData.score = score;
    if (details !== undefined) updateData.details = details;

    const result = await prisma.missionScore.update({
      where: { id: scoreId },
      data: updateData,
    });
    res.json(result);
  } catch (err) {
    console.error('Teacher score edit error:', err);
    res.status(500).json({ error: 'Failed to update score' });
  }
});

// DELETE /api/teacher/scores/:scoreId — Delete a MissionScore (reset single task)
router.delete('/scores/:scoreId', async (req: Request, res: Response) => {
  try {
    const teacherId = getTeacherId(req)!;
    const scoreId = req.params.scoreId as string;

    if (!(await teacherOwnsScore(teacherId, scoreId))) {
      res.status(404).json({ error: 'Score not found' });
      return;
    }

    await prisma.missionScore.delete({ where: { id: scoreId } });
    res.json({ success: true });
  } catch (err) {
    console.error('Teacher score delete error:', err);
    res.status(500).json({ error: 'Failed to delete score' });
  }
});

// DELETE /api/teacher/students/:pairId/weeks/:weekId/progress — Reset all progress for a week
router.delete('/students/:pairId/weeks/:weekId/progress', async (req: Request, res: Response) => {
  try {
    const teacherId = getTeacherId(req)!;
    const pairId = req.params.pairId as string;
    const weekId = req.params.weekId as string;

    if (!(await teacherOwnsPair(teacherId, pairId))) {
      res.status(404).json({ error: 'Pair not found' });
      return;
    }

    const pair = await prisma.pair.findUnique({ where: { id: pairId } });
    if (!pair) {
      res.status(404).json({ error: 'Pair not found' });
      return;
    }

    const week = await prisma.week.findUnique({ where: { id: weekId } });
    if (!week) {
      res.status(404).json({ error: 'Week not found' });
      return;
    }

    // Delete all mission scores for this pair in this week
    const missions = await prisma.mission.findMany({
      where: { weekId },
      select: { id: true },
    });
    const missionIds = missions.map(m => m.id);

    await prisma.missionScore.deleteMany({
      where: { pairId, missionId: { in: missionIds } },
    });

    // Delete shift result for this week
    await prisma.shiftResult.deleteMany({
      where: { pairId, weekNumber: week.weekNumber },
    });

    // Delete character messages for this week
    await prisma.characterMessage.deleteMany({
      where: { pairId, weekNumber: week.weekNumber },
    });

    res.json({ success: true, weekNumber: week.weekNumber });
  } catch (err) {
    console.error('Teacher progress reset error:', err);
    res.status(500).json({ error: 'Failed to reset progress' });
  }
});

// PATCH /api/teacher/students/:pairId/concern — Override concern score
router.patch('/students/:pairId/concern', async (req: Request, res: Response) => {
  try {
    const teacherId = getTeacherId(req)!;
    const pairId = req.params.pairId as string;
    const { concernScore } = req.body;
    if (typeof concernScore !== 'number') {
      res.status(400).json({ error: 'concernScore (number) required' });
      return;
    }
    if (!(await teacherOwnsPair(teacherId, pairId))) {
      res.status(404).json({ error: 'Pair not found' });
      return;
    }
    const pair = await prisma.pair.update({
      where: { id: pairId },
      data: { concernScore },
    });
    res.json({ concernScore: pair.concernScore });
  } catch (err) {
    console.error('Teacher concern override error:', err);
    res.status(500).json({ error: 'Failed to update concern score' });
  }
});

// DELETE /api/teacher/students/:studentId — Permanently delete a student (Pair or User) and all data
router.delete('/students/:studentId', async (req: Request, res: Response) => {
  try {
    const teacherId = getTeacherId(req)!;
    const studentId = req.params.studentId as string;

    // Try Pair first, then legacy User
    const pair = await prisma.pair.findUnique({ where: { id: studentId } });
    if (pair) {
      // Cascade delete all Pair-related records
      await prisma.$transaction([
        prisma.pairDictionaryProgress.deleteMany({ where: { pairId: studentId } }),
        prisma.missionScore.deleteMany({ where: { pairId: studentId } }),
        prisma.recording.deleteMany({ where: { pairId: studentId } }),
        prisma.pearlConversation.deleteMany({ where: { pairId: studentId } }),
        prisma.narrativeChoice.deleteMany({ where: { pairId: studentId } }),
        prisma.harmonyPost.deleteMany({ where: { pairId: studentId } }),
        prisma.harmonyCensureResponse.deleteMany({ where: { pairId: studentId } }),
        prisma.classEnrollment.deleteMany({ where: { pairId: studentId } }),
        prisma.characterMessage.deleteMany({ where: { pairId: studentId } }),
        prisma.citizen4488Interaction.deleteMany({ where: { pairId: studentId } }),
        prisma.shiftResult.deleteMany({ where: { pairId: studentId } }),
        prisma.pair.delete({ where: { id: studentId } }),
      ]);
      res.json({ deleted: true, type: 'pair' });
      return;
    }

    // Legacy User-based student
    const user = await prisma.user.findUnique({ where: { id: studentId } });
    if (user && user.role === 'student') {
      await prisma.$transaction([
        prisma.studentVocabulary.deleteMany({ where: { userId: studentId } }),
        prisma.missionScore.deleteMany({ where: { userId: studentId } }),
        prisma.recording.deleteMany({ where: { userId: studentId } }),
        prisma.pearlConversation.deleteMany({ where: { userId: studentId } }),
        prisma.narrativeChoice.deleteMany({ where: { userId: studentId } }),
        prisma.harmonyPost.deleteMany({ where: { userId: studentId } }),
        prisma.classEnrollment.deleteMany({ where: { userId: studentId } }),
        prisma.user.delete({ where: { id: studentId } }),
      ]);
      res.json({ deleted: true, type: 'user' });
      return;
    }

    res.status(404).json({ error: 'Student not found' });
  } catch (err) {
    console.error('Delete student error:', err);
    res.status(500).json({ error: 'Failed to delete student' });
  }
});

// DELETE /api/teacher/students — Bulk delete ALL students in teacher's classes (or orphans)
router.delete('/students', async (req: Request, res: Response) => {
  try {
    const teacherId = getTeacherId(req)!;

    // Get all pairs and legacy students
    const allPairs = await prisma.pair.findMany({ select: { id: true } });
    const allLegacyStudents = await prisma.user.findMany({
      where: { role: 'student' },
      select: { id: true },
    });

    // Delete all pairs with cascade
    for (const pair of allPairs) {
      await prisma.$transaction([
        prisma.pairDictionaryProgress.deleteMany({ where: { pairId: pair.id } }),
        prisma.missionScore.deleteMany({ where: { pairId: pair.id } }),
        prisma.recording.deleteMany({ where: { pairId: pair.id } }),
        prisma.pearlConversation.deleteMany({ where: { pairId: pair.id } }),
        prisma.narrativeChoice.deleteMany({ where: { pairId: pair.id } }),
        prisma.harmonyPost.deleteMany({ where: { pairId: pair.id } }),
        prisma.harmonyCensureResponse.deleteMany({ where: { pairId: pair.id } }),
        prisma.classEnrollment.deleteMany({ where: { pairId: pair.id } }),
        prisma.characterMessage.deleteMany({ where: { pairId: pair.id } }),
        prisma.citizen4488Interaction.deleteMany({ where: { pairId: pair.id } }),
        prisma.shiftResult.deleteMany({ where: { pairId: pair.id } }),
        prisma.pair.delete({ where: { id: pair.id } }),
      ]);
    }

    // Delete all legacy students with cascade
    for (const stu of allLegacyStudents) {
      await prisma.$transaction([
        prisma.studentVocabulary.deleteMany({ where: { userId: stu.id } }),
        prisma.missionScore.deleteMany({ where: { userId: stu.id } }),
        prisma.recording.deleteMany({ where: { userId: stu.id } }),
        prisma.pearlConversation.deleteMany({ where: { userId: stu.id } }),
        prisma.narrativeChoice.deleteMany({ where: { userId: stu.id } }),
        prisma.harmonyPost.deleteMany({ where: { userId: stu.id } }),
        prisma.classEnrollment.deleteMany({ where: { userId: stu.id } }),
        prisma.user.delete({ where: { id: stu.id } }),
      ]);
    }

    res.json({ deleted: true, pairsDeleted: allPairs.length, usersDeleted: allLegacyStudents.length });
  } catch (err) {
    console.error('Bulk delete students error:', err);
    res.status(500).json({ error: 'Failed to delete students' });
  }
});

// ── Storyboard Routes ──────────────────────────────────────────────

// Icons for WeekConfig task types shown in the Storyboard
const TASK_ICONS: Record<string, string> = {
  intake_form: '\uD83D\uDCCB',
  word_match: '\uD83D\uDD24',
  cloze_fill: '\uD83D\uDCDD',
  vocab_clearance: '\u2705',
  document_review: '\uD83D\uDCC4',
  shift_report: '\u270D\uFE0F',
  contradiction_report: '\uD83D\uDD0D',
  priority_briefing: '\uD83D\uDCCA',
  priority_sort: '\uD83D\uDCC2',
  evidence_assembly: '\uD83E\uDDE9',
  word_sort: '\uD83D\uDDC2\uFE0F',
  custom: '\u2699\uFE0F',
};

function safeConfig(config: unknown): Record<string, unknown> {
  if (config && typeof config === 'object' && !Array.isArray(config)) {
    return config as Record<string, unknown>;
  }
  return {};
}

/** Ensure a Mission record exists for each WeekConfig task (auto-create if missing) */
async function ensureWeekMissions(weekId: string, weekNumber: number) {
  const weekConfig = getWeekConfig(weekNumber);
  if (!weekConfig) return;
  for (let i = 0; i < weekConfig.tasks.length; i++) {
    const task = weekConfig.tasks[i];
    const existing = await prisma.mission.findFirst({
      where: { weekId, missionType: task.type },
    });
    if (!existing) {
      await prisma.mission.create({
        data: {
          weekId,
          orderIndex: i,
          title: task.label,
          description: `Queue task: ${task.label}`,
          missionType: task.type,
          config: { weekConfigTask: task.id },
        },
      });
    }
  }
}

// GET /api/teacher/weeks/:weekId/storyboard — Steps derived from WeekConfig tasks
router.get('/weeks/:weekId/storyboard', async (req: Request, res: Response) => {
  try {
    const weekId = req.params.weekId as string;

    const week = await prisma.week.findUnique({
      where: { id: weekId },
      include: {
        missions: {
          orderBy: { orderIndex: 'asc' },
          select: {
            id: true,
            missionType: true,
            title: true,
            description: true,
            orderIndex: true,
            config: true,
          },
        },
      },
    });

    if (!week) {
      res.status(404).json({ error: 'Week not found' });
      return;
    }

    const weekConfig = getWeekConfig(week.weekNumber);
    if (!weekConfig) {
      res.status(404).json({ error: 'No config for this week' });
      return;
    }

    // Auto-create any missing Mission records so uploads/overrides always work
    await ensureWeekMissions(weekId, week.weekNumber);
    // Re-fetch missions after possible creation
    const freshMissions = await prisma.mission.findMany({
      where: { weekId },
      select: { id: true, missionType: true, title: true, description: true, orderIndex: true, config: true },
    });

    const steps = weekConfig.tasks.map((task, idx) => {
      // Find the Mission record that matches this WeekConfig task type
      const mission = freshMissions.find(m => m.missionType === task.type);
      const cfg = safeConfig(mission?.config);
      const teacherOverride = cfg.teacherOverride as Record<string, unknown> | undefined;

      return {
        orderIndex: idx,
        missionId: mission?.id || null,
        missionType: task.type,
        label: task.label,
        icon: TASK_ICONS[task.type] || '\uD83D\uDCCB',
        location: task.location,
        summary: '',
        grammarFocus: '',
        knownWords: [] as string[],
        newWords: [] as string[],
        currentActivityId: teacherOverride && typeof teacherOverride.activityId === 'string'
          ? teacherOverride.activityId : 'default',
        alternatives: [] as { id: string; label: string; description: string }[],
        videoClipUrl: teacherOverride && typeof teacherOverride.videoClipUrl === 'string'
          ? teacherOverride.videoClipUrl : '',
        videoClipFilename: teacherOverride && typeof teacherOverride.videoClipFilename === 'string'
          ? teacherOverride.videoClipFilename : '',
        videoClipEmbedUrl: teacherOverride && typeof teacherOverride.videoClipEmbedUrl === 'string'
          ? teacherOverride.videoClipEmbedUrl : '',
        videoClipHidden: teacherOverride?.videoClipHidden === true,
      };
    });

    res.json({
      weekId: week.id,
      weekNumber: week.weekNumber,
      title: week.title,
      description: week.description,
      steps,
    });
  } catch (err) {
    console.error('Teacher storyboard fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch storyboard' });
  }
});

// PATCH /api/teacher/weeks/:weekId/steps/:missionType — Swap activity, reset, or remove video
router.patch('/weeks/:weekId/steps/:missionType', async (req: Request, res: Response) => {
  try {
    const weekId = req.params.weekId as string;
    const missionType = req.params.missionType as string;
    const { activityId, reset, removeVideo, videoClipEmbedUrl, videoClipHidden } = req.body as {
      activityId?: string;
      reset?: boolean;
      removeVideo?: boolean;
      videoClipEmbedUrl?: string;
      videoClipHidden?: boolean;
    };

    const mission = await prisma.mission.findFirst({
      where: { weekId, missionType },
    });

    if (!mission) {
      res.status(404).json({ error: 'Mission not found for this week and type' });
      return;
    }

    const existingConfig = safeConfig(mission.config);
    const existingOverride = (existingConfig.teacherOverride || {}) as Record<string, unknown>;

    if (reset) {
      // Remove the entire teacher override
      const { teacherOverride: _, ...cleanConfig } = existingConfig;
      await prisma.mission.update({
        where: { id: mission.id },
        data: { config: cleanConfig as Prisma.InputJsonValue },
      });
      res.json({ status: 'reset', missionId: mission.id });
      return;
    }

    if (removeVideo) {
      // Remove video clip and embed URL from override
      const { videoClipUrl: _v, videoClipFilename: _f, videoClipEmbedUrl: _e, videoClipHidden: _h, ...restOverride } = existingOverride;
      const updatedConfig = Object.keys(restOverride).length > 0
        ? { ...existingConfig, teacherOverride: restOverride }
        : (() => { const { teacherOverride: _, ...clean } = existingConfig; return clean; })();
      await prisma.mission.update({
        where: { id: mission.id },
        data: { config: updatedConfig as Prisma.InputJsonValue },
      });
      res.json({ status: 'video_removed', missionId: mission.id });
      return;
    }

    if (typeof videoClipEmbedUrl === 'string') {
      const newOverride = { ...existingOverride, videoClipEmbedUrl: videoClipEmbedUrl.trim() };
      // If embed URL is being cleared, remove the field
      if (!videoClipEmbedUrl.trim()) {
        delete (newOverride as Record<string, unknown>).videoClipEmbedUrl;
      }
      const updatedConfig = Object.keys(newOverride).length > 0
        ? { ...existingConfig, teacherOverride: newOverride }
        : (() => { const { teacherOverride: _, ...clean } = existingConfig; return clean; })();
      await prisma.mission.update({
        where: { id: mission.id },
        data: { config: updatedConfig as Prisma.InputJsonValue },
      });
      res.json({ status: 'embed_url_updated', missionId: mission.id });
      return;
    }

    if (typeof videoClipHidden === 'boolean') {
      const newOverride = { ...existingOverride, videoClipHidden };
      if (!videoClipHidden) delete (newOverride as Record<string, unknown>).videoClipHidden;
      const updatedConfig = Object.keys(newOverride).length > 0
        ? { ...existingConfig, teacherOverride: newOverride }
        : (() => { const { teacherOverride: _, ...clean } = existingConfig; return clean; })();
      await prisma.mission.update({
        where: { id: mission.id },
        data: { config: updatedConfig as Prisma.InputJsonValue },
      });
      res.json({ status: videoClipHidden ? 'video_hidden' : 'video_shown', missionId: mission.id });
      return;
    }

    if (activityId) {
      // Validate the activity exists in the pool
      const alt = findAlternative(missionType, activityId);
      if (!alt) {
        res.status(400).json({ error: `Activity "${activityId}" not found in pool for "${missionType}"` });
        return;
      }

      const newOverride = { ...existingOverride, activityId };
      await prisma.mission.update({
        where: { id: mission.id },
        data: {
          config: {
            ...existingConfig,
            teacherOverride: newOverride,
          } as Prisma.InputJsonValue,
        },
      });
      res.json({ status: 'activity_swapped', missionId: mission.id, activityId });
      return;
    }

    res.status(400).json({ error: 'Provide activityId, videoClipEmbedUrl, reset: true, or removeVideo: true' });
  } catch (err) {
    console.error('Teacher step update error:', err);
    res.status(500).json({ error: 'Failed to update step' });
  }
});

// POST /api/teacher/weeks/:weekId/steps/:missionType/video — Upload video clip to any step
router.post('/weeks/:weekId/steps/:missionType/video', uploadVideo.single('video'), async (req: Request, res: Response) => {
  try {
    const weekId = req.params.weekId as string;
    const missionType = req.params.missionType as string;

    if (!req.file) {
      res.status(400).json({ error: 'No video file provided' });
      return;
    }

    const mission = await prisma.mission.findFirst({
      where: { weekId, missionType },
    });

    if (!mission) {
      res.status(404).json({ error: 'Mission not found for this week and type' });
      return;
    }

    const existingConfig = safeConfig(mission.config);
    const existingOverride = (existingConfig.teacherOverride || {}) as Record<string, unknown>;
    const videoClipUrl = `${BRIEFING_URL_PREFIX}/${req.file.filename}`;

    const newOverride = {
      ...existingOverride,
      videoClipUrl,
      videoClipFilename: req.file.originalname,
    };

    await prisma.mission.update({
      where: { id: mission.id },
      data: {
        config: {
          ...existingConfig,
          teacherOverride: newOverride,
        } as Prisma.InputJsonValue,
      },
    });

    res.status(201).json({
      status: 'video_uploaded',
      missionId: mission.id,
      videoClipUrl,
      videoClipFilename: req.file.originalname,
    });
  } catch (err) {
    console.error('Teacher step video upload error:', err);
    res.status(500).json({ error: 'Failed to upload step video' });
  }
});

// PATCH /api/teacher/dictionary/:wordId — Teacher edits dictionary word fields
router.patch('/dictionary/:wordId', async (req: Request, res: Response) => {
  try {
    const wordId = req.params.wordId as string;
    const {
      definition,
      exampleSentence,
      translationZhTw,
      initialStatus,
      isWorldBuilding,
      toeicCategory,
    } = req.body;

    const data: Record<string, unknown> = {};
    if (definition !== undefined) data.definition = definition;
    if (exampleSentence !== undefined) data.exampleSentence = exampleSentence;
    if (translationZhTw !== undefined) data.translationZhTw = translationZhTw;
    if (initialStatus !== undefined) data.initialStatus = initialStatus;
    if (isWorldBuilding !== undefined) data.isWorldBuilding = isWorldBuilding;
    if (toeicCategory !== undefined) data.toeicCategory = toeicCategory;

    if (Object.keys(data).length === 0) {
      res.status(400).json({ error: 'No fields to update' });
      return;
    }

    const updated = await prisma.dictionaryWord.update({
      where: { id: wordId },
      data,
    });

    res.json(updated);
  } catch (err) {
    console.error('Teacher dictionary edit error:', err);
    res.status(500).json({ error: 'Failed to update dictionary word' });
  }
});

// GET /api/teacher/debug/uploads — Check what files exist in the uploads directory
router.get('/debug/uploads', (_req: Request, res: Response) => {
  const rawDir = process.env.UPLOAD_DIR || 'uploads';
  const resolvedDir = path.isAbsolute(rawDir) ? rawDir : path.resolve(__dirname, '../../', rawDir);
  const briefingsDir = path.join(resolvedDir, 'briefings');
  const welcomeDir = path.join(resolvedDir, 'welcome');

  const result: Record<string, unknown> = {
    UPLOAD_DIR_env: process.env.UPLOAD_DIR || '(not set, default: uploads)',
    resolvedDir,
    dirExists: fs.existsSync(resolvedDir),
    briefingsDir,
    briefingsDirExists: fs.existsSync(briefingsDir),
    briefingFiles: fs.existsSync(briefingsDir) ? fs.readdirSync(briefingsDir) : [],
    welcomeDir,
    welcomeDirExists: fs.existsSync(welcomeDir),
    welcomeFiles: fs.existsSync(welcomeDir) ? fs.readdirSync(welcomeDir) : [],
  };

  res.json(result);
});

export default router;
