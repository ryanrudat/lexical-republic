import { Prisma } from '@prisma/client';
import { Router, Request, Response } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import path from 'path';
import { uploadVideo } from '../middleware/upload';
import prisma from '../utils/prisma';
import { io, getOnlineStudents } from '../socketServer';
import { getAlternatives, findAlternative } from '../data/activityPool';

const router = Router();
router.use(authenticate, requireRole('teacher'));
const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';
const BRIEFING_UPLOAD_DIR = process.env.BRIEFING_UPLOAD_DIR || path.join(UPLOAD_DIR, 'briefings');
type VideoSlot = 'primary' | 'clipA' | 'clipB';

const VIDEO_SLOT_FIELDS: Record<VideoSlot, { urlKey: string; filenameKey: string }> = {
  primary: { urlKey: 'uploadedVideoUrl', filenameKey: 'uploadedVideoFilename' },
  clipA: { urlKey: 'clipAUploadedVideoUrl', filenameKey: 'clipAUploadedVideoFilename' },
  clipB: { urlKey: 'clipBUploadedVideoUrl', filenameKey: 'clipBUploadedVideoFilename' },
};

// GET /api/teacher/students — All students with progress summary
router.get('/students', async (_req: Request, res: Response) => {
  try {
    const students = await prisma.user.findMany({
      where: { role: 'student' },
      include: {
        missionScores: {
          include: {
            mission: { select: { weekId: true, missionType: true } },
          },
        },
      },
      orderBy: { designation: 'asc' },
    });

    const result = students.map((s) => {
      // Count weeks where clock_out is complete
      const clockedOutWeeks = new Set(
        s.missionScores
          .filter(
            (ms) =>
              ms.mission.missionType === 'clock_out' &&
              (ms.details as any)?.status === 'complete'
          )
          .map((ms) => ms.mission.weekId)
      );
      return {
        id: s.id,
        designation: s.designation,
        displayName: s.displayName,
        lane: s.lane,
        xp: s.xp,
        streak: s.streak,
        weeksCompleted: clockedOutWeeks.size,
        lastLoginAt: s.lastLoginAt,
      };
    });

    res.json({ students: result });
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

    const uploadedVideoUrl = `/${BRIEFING_UPLOAD_DIR.replace(/\\/g, '/')}/${req.file.filename}`;

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

// GET /api/teacher/students/:id — Single student detail
router.get('/students/:id', async (req: Request, res: Response) => {
  try {
    const studentId = req.params.id as string;
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
    });
  } catch (err) {
    console.error('Teacher student detail error:', err);
    res.status(500).json({ error: 'Failed to fetch student details' });
  }
});

// GET /api/teacher/online-students — REST fallback for live student tracking
router.get('/online-students', (_req: Request, res: Response) => {
  res.json({ students: getOnlineStudents() });
});

// GET /api/teacher/gradebook — All students + all mission scores for the gradebook
router.get('/gradebook', async (_req: Request, res: Response) => {
  try {
    const students = await prisma.user.findMany({
      where: { role: 'student' },
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

    const weeks = await prisma.week.findMany({
      orderBy: { weekNumber: 'asc' },
      select: {
        id: true,
        weekNumber: true,
        title: true,
      },
    });

    res.json({ students, weeks });
  } catch (err) {
    console.error('Teacher gradebook fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch gradebook data' });
  }
});

// ── Storyboard Routes ──────────────────────────────────────────────

const STEP_ORDER = [
  { id: 'recap', label: 'Shift Intake', location: 'intake', icon: '\uD83D\uDCCD' },
  { id: 'briefing', label: 'Broadcast', location: 'broadcast', icon: '\uD83C\uDFAC' },
  { id: 'grammar', label: 'Language Lab', location: 'language-lab', icon: '\uD83D\uDD24' },
  { id: 'listening', label: 'Evidence Desk', location: 'evidence-desk', icon: '\uD83C\uDFA7' },
  { id: 'voice_log', label: 'Voice Booth', location: 'voice-booth', icon: '\uD83C\uDFA4' },
  { id: 'case_file', label: 'Filing Desk', location: 'filing-desk', icon: '\u270D\uFE0F' },
  { id: 'clock_out', label: 'Clock-Out', location: 'intake', icon: '\uD83D\uDD1A' },
];

function safeConfig(config: unknown): Record<string, unknown> {
  if (config && typeof config === 'object' && !Array.isArray(config)) {
    return config as Record<string, unknown>;
  }
  return {};
}

// GET /api/teacher/weeks/:weekId/storyboard — Full 7-step storyboard with summaries
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

    const steps = STEP_ORDER.map((step, idx) => {
      const mission = week.missions.find(m => m.missionType === step.id);
      const cfg = safeConfig(mission?.config);
      const storyBeat = cfg.storyBeat as Record<string, unknown> | undefined;
      const teacherOverride = cfg.teacherOverride as Record<string, unknown> | undefined;
      const alternatives = getAlternatives(step.id);

      // Build summary text from storyBeat or mission description
      const summary = storyBeat
        ? (typeof storyBeat.objective === 'string' ? storyBeat.objective : '')
        : (mission?.description || '');

      // Grammar summary
      const grammarFocus = storyBeat && typeof storyBeat.learningFocus === 'string'
        ? storyBeat.learningFocus : '';

      // Vocab summary
      const knownWords = Array.isArray(storyBeat?.knownWords) ? storyBeat.knownWords as string[] : [];
      const newWords = Array.isArray(storyBeat?.newWords) ? storyBeat.newWords as string[] : [];

      // Briefing-specific fields
      const briefingFields = step.id === 'briefing' ? {
        episodeTitle: typeof cfg.episodeTitle === 'string' ? cfg.episodeTitle : '',
        episodeSubtitle: typeof cfg.episodeSubtitle === 'string' ? cfg.episodeSubtitle : '',
        nowShowingStage: typeof cfg.nowShowingStage === 'string' ? cfg.nowShowingStage : 'free',
        videoSource: typeof cfg.videoSource === 'string' ? cfg.videoSource : 'auto',
        clipAUploadedVideoUrl: typeof cfg.clipAUploadedVideoUrl === 'string' ? cfg.clipAUploadedVideoUrl : '',
        clipAUploadedVideoFilename: typeof cfg.clipAUploadedVideoFilename === 'string' ? cfg.clipAUploadedVideoFilename : '',
        clipBUploadedVideoUrl: typeof cfg.clipBUploadedVideoUrl === 'string' ? cfg.clipBUploadedVideoUrl : '',
        clipBUploadedVideoFilename: typeof cfg.clipBUploadedVideoFilename === 'string' ? cfg.clipBUploadedVideoFilename : '',
        uploadedVideoUrl: typeof cfg.uploadedVideoUrl === 'string' ? cfg.uploadedVideoUrl : '',
        uploadedVideoFilename: typeof cfg.uploadedVideoFilename === 'string' ? cfg.uploadedVideoFilename : '',
        embedUrl: typeof cfg.embedUrl === 'string' ? cfg.embedUrl : '',
        clipAEmbedUrl: typeof cfg.clipAEmbedUrl === 'string' ? cfg.clipAEmbedUrl : '',
        clipBEmbedUrl: typeof cfg.clipBEmbedUrl === 'string' ? cfg.clipBEmbedUrl : '',
        fallbackText: typeof cfg.fallbackText === 'string' ? cfg.fallbackText : '',
        checksCount: Array.isArray(cfg.checks) ? cfg.checks.length : 0,
      } : {};

      return {
        orderIndex: idx,
        missionId: mission?.id || null,
        missionType: step.id,
        label: step.label,
        icon: step.icon,
        location: step.location,
        summary,
        grammarFocus,
        knownWords,
        newWords,
        currentActivityId: teacherOverride && typeof teacherOverride.activityId === 'string'
          ? teacherOverride.activityId : 'default',
        alternatives: alternatives.map(a => ({ id: a.id, label: a.label, description: a.description })),
        videoClipUrl: teacherOverride && typeof teacherOverride.videoClipUrl === 'string'
          ? teacherOverride.videoClipUrl : '',
        videoClipFilename: teacherOverride && typeof teacherOverride.videoClipFilename === 'string'
          ? teacherOverride.videoClipFilename : '',
        ...briefingFields,
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
    const { activityId, reset, removeVideo } = req.body as {
      activityId?: string;
      reset?: boolean;
      removeVideo?: boolean;
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
      // Remove just the video clip from override
      const { videoClipUrl: _v, videoClipFilename: _f, ...restOverride } = existingOverride;
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

    res.status(400).json({ error: 'Provide activityId, reset: true, or removeVideo: true' });
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
    const videoClipUrl = `/${BRIEFING_UPLOAD_DIR.replace(/\\/g, '/')}/${req.file.filename}`;

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

export default router;
