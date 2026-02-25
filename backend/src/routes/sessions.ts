import { Router, Request, Response } from 'express';
import type { Prisma } from '@prisma/client';
import { authenticate, requirePair, getPairId } from '../middleware/auth';
import prisma from '../utils/prisma';

const router = Router();
router.use(authenticate);

// GET /api/sessions/week/:weekId — return SessionConfig with expanded phase configs
router.get('/week/:weekId', async (req: Request, res: Response) => {
  try {
    const weekId = req.params.weekId as string;

    const config = await prisma.sessionConfig.findUnique({
      where: { weekId },
      include: {
        week: {
          select: {
            weekNumber: true,
            title: true,
            description: true,
          },
        },
      },
    });

    if (!config) {
      res.status(404).json({ error: 'No session config for this week' });
      return;
    }

    res.json({
      id: config.id,
      weekId: config.weekId,
      weekNumber: config.week.weekNumber,
      weekTitle: config.week.title,
      phases: config.phases,
      totalMinutes: config.totalMinutes,
      isActive: config.isActive,
    });
  } catch (err) {
    console.error('Session config fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch session config' });
  }
});

// GET /api/sessions/week/:weekId/progress — pair's phase completion status
// Accessible by both pairs and teachers (teachers see no progress)
router.get('/week/:weekId/progress', async (req: Request, res: Response) => {
  try {
    const weekId = req.params.weekId as string;
    const pairId = getPairId(req);

    const config = await prisma.sessionConfig.findUnique({
      where: { weekId },
    });

    if (!config) {
      res.json({ phases: [] });
      return;
    }

    // Get all missionIds from phases
    const phases = config.phases as Array<{ id: string; missionId?: string }>;
    const missionIds = phases.map((p) => p.missionId).filter(Boolean) as string[];

    // Query existing scores for these missions (empty for teachers)
    const scores = pairId
      ? await prisma.missionScore.findMany({
          where: {
            pairId,
            missionId: { in: missionIds },
          },
          select: {
            missionId: true,
            score: true,
            details: true,
            createdAt: true,
          },
        })
      : [];

    const scoreMap = new Map(scores.map((s) => [s.missionId, s]));

    const progress = phases.map((phase) => ({
      phaseId: phase.id,
      missionId: phase.missionId || null,
      completed: phase.missionId ? scoreMap.has(phase.missionId) : false,
      score: phase.missionId ? scoreMap.get(phase.missionId)?.score ?? null : null,
    }));

    res.json({ phases: progress });
  } catch (err) {
    console.error('Session progress fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch session progress' });
  }
});

// POST /api/sessions/week/:weekId/phase/:phaseId/complete — save phase completion
router.post(
  '/week/:weekId/phase/:phaseId/complete',
  requirePair,
  async (req: Request, res: Response) => {
    try {
      const weekId = req.params.weekId as string;
      const phaseId = req.params.phaseId as string;
      const pairId = getPairId(req)!;
      const { score, details } = req.body as { score?: number; details?: Record<string, unknown> };

      const config = await prisma.sessionConfig.findUnique({
        where: { weekId },
      });

      if (!config) {
        res.status(404).json({ error: 'No session config for this week' });
        return;
      }

      const phases = config.phases as Array<{ id: string; missionId?: string }>;
      const phase = phases.find((p) => p.id === phaseId);

      if (!phase) {
        res.status(404).json({ error: 'Phase not found in session config' });
        return;
      }

      if (!phase.missionId) {
        // Phase has no backing mission (e.g. settle) — just acknowledge
        res.json({ completed: true, phaseId });
        return;
      }

      // Upsert mission score
      const detailsJson = (details ?? { status: 'complete' }) as Prisma.InputJsonValue;
      const result = await prisma.missionScore.upsert({
        where: { pairId_missionId: { pairId, missionId: phase.missionId } },
        update: {
          score: score ?? 1.0,
          details: detailsJson,
        },
        create: {
          pairId,
          missionId: phase.missionId,
          score: score ?? 1.0,
          details: detailsJson,
        },
      });

      res.json({
        completed: true,
        phaseId,
        missionScoreId: result.id,
        score: result.score,
      });
    } catch (err) {
      console.error('Phase completion error:', err);
      res.status(500).json({ error: 'Failed to save phase completion' });
    }
  }
);

export default router;
