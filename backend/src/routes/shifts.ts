import { Router, Request, Response } from 'express';
import { authenticate, getPairId } from '../middleware/auth';
import { isPairPayload } from '../utils/jwt';
import prisma from '../utils/prisma';

const router = Router();
router.use(authenticate);

// Helper: get the entity ID and enrollment query for the current auth context
function getAuthContext(req: Request) {
  const pairId = getPairId(req);
  if (pairId) {
    return {
      entityId: pairId,
      enrollmentWhere: { pairId } as const,
      scoreWhere: (missionId: string) => ({ pairId_missionId: { pairId, missionId } }),
      scoreFilter: { pairId } as Record<string, string>,
      scoreCreate: (missionId: string, score: number, details: any) => ({
        pairId, missionId, score, details,
      }),
    };
  }
  // Legacy user token
  const userId = req.user!.userId;
  return {
    entityId: userId,
    enrollmentWhere: { userId } as const,
    scoreWhere: (missionId: string) => ({ userId_missionId: { userId, missionId } }),
    scoreFilter: { userId } as Record<string, string>,
    scoreCreate: (missionId: string, score: number, details: any) => ({
      userId, missionId, score, details,
    }),
  };
}

// GET /api/shifts/season — All weeks with arc info + student's completion per week
router.get('/season', async (req: Request, res: Response) => {
  try {
    const ctx = getAuthContext(req);

    // Determine student's class and unlocked weeks
    let unlockedWeekIds: Set<string> | null = null;
    const enrollment = await prisma.classEnrollment.findFirst({
      where: ctx.enrollmentWhere,
    });
    if (enrollment) {
      const unlocks = await prisma.classWeekUnlock.findMany({
        where: { classId: enrollment.classId },
        select: { weekId: true },
      });
      unlockedWeekIds = new Set(unlocks.map((u) => u.weekId));
    }

    const arcs = await prisma.arc.findMany({
      orderBy: { orderIndex: 'asc' },
      include: {
        weeks: {
          orderBy: { weekNumber: 'asc' },
          include: {
            missions: {
              include: {
                missionScores: { where: ctx.scoreFilter },
              },
            },
          },
        },
      },
    });

    const weeks = arcs.flatMap((arc) =>
      arc.weeks.map((week) => {
        const stepsCompleted = week.missions.filter((m) =>
          m.missionScores.some(
            (s) => (s.details as any)?.status === 'complete'
          )
        ).length;
        return {
          id: week.id,
          weekNumber: week.weekNumber,
          title: week.title,
          description: week.description,
          arcId: arc.id,
          arcName: arc.name,
          arcOrder: arc.orderIndex,
          totalSteps: week.missions.length,
          stepsCompleted,
          clockedOut: week.missions.some(
            (m) =>
              m.missionType === 'clock_out' &&
              m.missionScores.some(
                (s) => (s.details as any)?.status === 'complete'
              )
          ),
          isUnlocked: unlockedWeekIds === null ? true : unlockedWeekIds.has(week.id),
        };
      })
    );

    res.json({
      title: 'Approved Shift Rotation',
      subtitle: '18 Shifts \u2022 50 minutes each \u2022 Ministry-assigned',
      weeks,
    });
  } catch (err) {
    console.error('Season fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch season data' });
  }
});

// GET /api/shifts/weeks/:weekId — Week detail with missions
router.get('/weeks/:weekId', async (req: Request, res: Response) => {
  try {
    const ctx = getAuthContext(req);
    const weekId = req.params.weekId as string;

    // Check if student's class has this week unlocked
    const enrollment = await prisma.classEnrollment.findFirst({
      where: ctx.enrollmentWhere,
    });
    if (enrollment) {
      const unlock = await prisma.classWeekUnlock.findFirst({
        where: { classId: enrollment.classId, weekId },
      });
      if (!unlock) {
        res.status(403).json({ error: 'This shift has not been unlocked for your class' });
        return;
      }
    }

    const week = await prisma.week.findUnique({
      where: { id: weekId },
      include: {
        arc: true,
        missions: {
          orderBy: { orderIndex: 'asc' },
          include: {
            missionScores: { where: ctx.scoreFilter },
          },
        },
      },
    });

    if (!week) {
      res.status(404).json({ error: 'Week not found' });
      return;
    }

    const missions = week.missions.map((m) => ({
      id: m.id,
      orderIndex: m.orderIndex,
      title: m.title,
      description: m.description,
      missionType: m.missionType,
      config: m.config,
      score: m.missionScores[0] || null,
    }));

    res.json({
      id: week.id,
      weekNumber: week.weekNumber,
      title: week.title,
      description: week.description,
      arcName: week.arc.name,
      arcOrder: week.arc.orderIndex,
      missions,
    });
  } catch (err) {
    console.error('Week fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch week data' });
  }
});

// GET /api/shifts/weeks/:weekId/missions/:missionId — Single mission
router.get(
  '/weeks/:weekId/missions/:missionId',
  async (req: Request, res: Response) => {
    try {
      const ctx = getAuthContext(req);
      const weekId = req.params.weekId as string;
      const missionId = req.params.missionId as string;
      const mission = await prisma.mission.findUnique({
        where: { id: missionId },
        include: {
          missionScores: { where: ctx.scoreFilter },
        },
      });

      if (!mission || mission.weekId !== weekId) {
        res.status(404).json({ error: 'Mission not found' });
        return;
      }

      res.json({
        id: mission.id,
        orderIndex: mission.orderIndex,
        title: mission.title,
        description: mission.description,
        missionType: mission.missionType,
        config: mission.config,
        score: mission.missionScores[0] || null,
      });
    } catch (err) {
      console.error('Mission fetch error:', err);
      res.status(500).json({ error: 'Failed to fetch mission data' });
    }
  }
);

// POST /api/shifts/weeks/:weekId/missions/:missionId/score — Upsert score
router.post(
  '/weeks/:weekId/missions/:missionId/score',
  async (req: Request, res: Response) => {
    try {
      const ctx = getAuthContext(req);
      const weekId = req.params.weekId as string;
      const missionId = req.params.missionId as string;
      const { score, details } = req.body;
      const mission = await prisma.mission.findUnique({
        where: { id: missionId },
      });

      if (!mission || mission.weekId !== weekId) {
        res.status(404).json({ error: 'Mission not found' });
        return;
      }

      const result = await prisma.missionScore.upsert({
        where: ctx.scoreWhere(mission.id),
        update: { score, details },
        create: ctx.scoreCreate(mission.id, score, details),
      });

      res.json(result);
    } catch (err) {
      console.error('Score upsert error:', err);
      res.status(500).json({ error: 'Failed to save score' });
    }
  }
);

// GET /api/shifts/progress — Student's full progress
router.get('/progress', async (req: Request, res: Response) => {
  try {
    const ctx = getAuthContext(req);
    const scores = await prisma.missionScore.findMany({
      where: ctx.scoreFilter,
      include: {
        mission: { select: { weekId: true, missionType: true } },
      },
    });

    // Group by weekId
    const progress: Record<string, any[]> = {};
    for (const s of scores) {
      const wId = s.mission.weekId;
      if (!progress[wId]) progress[wId] = [];
      progress[wId].push({
        missionId: s.missionId,
        missionType: s.mission.missionType,
        score: s.score,
        details: s.details,
      });
    }

    res.json({ progress });
  } catch (err) {
    console.error('Progress fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
});

// POST /api/shifts/progress/:weekId/:stepId — Update step status
router.post(
  '/progress/:weekId/:stepId',
  async (req: Request, res: Response) => {
    try {
      const ctx = getAuthContext(req);
      const weekId = req.params.weekId as string;
      const stepId = req.params.stepId as string;
      const { status, data } = req.body;

      const mission = await prisma.mission.findFirst({
        where: { weekId, missionType: stepId },
      });

      if (!mission) {
        res.status(404).json({ error: 'Step not found' });
        return;
      }

      const result = await prisma.missionScore.upsert({
        where: ctx.scoreWhere(mission.id),
        update: {
          score: status === 'complete' ? 1 : 0,
          details: { status, ...data },
        },
        create: ctx.scoreCreate(mission.id, status === 'complete' ? 1 : 0, { status, ...data }),
      });

      res.json(result);
    } catch (err) {
      console.error('Step progress error:', err);
      res.status(500).json({ error: 'Failed to update step progress' });
    }
  }
);

export default router;
