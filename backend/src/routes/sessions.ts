import { Router, Request, Response } from 'express';
import { authenticate, requirePair, getPairId } from '../middleware/auth';
import prisma from '../utils/prisma';

const router = Router();
router.use(authenticate);

// Merge details JSON while protecting non-empty string fields from being clobbered
// by an empty-string snapshot. Mirrors the helper in shifts.ts so phase-completion
// upserts here don't wipe fields (writingText, pearlFeedback, vocabUsed, answerLog,
// etc.) written by /shifts/.../score or /submissions/evaluate against the same
// MissionScore row.
function mergeDetails(
  existing: Record<string, unknown>,
  incoming: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...existing };
  for (const [key, value] of Object.entries(incoming)) {
    if (typeof value === 'string' && value.length === 0) {
      const existingVal = out[key];
      if (typeof existingVal === 'string' && existingVal.length > 0) {
        continue;
      }
    }
    out[key] = value;
  }
  return out;
}

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

      // Same ClassWeekUnlock gate as POST /shifts/.../score — this legacy
      // phase path writes the same MissionScore rows, so without the gate it
      // was a crafted-request route to pre-credit locked weeks.
      const enrollment = await prisma.classEnrollment.findFirst({
        where: { pairId },
        select: { classId: true },
      });
      if (!enrollment) {
        res.status(403).json({ error: 'Not enrolled in any class' });
        return;
      }
      const unlock = await prisma.classWeekUnlock.findFirst({
        where: { classId: enrollment.classId, weekId },
        select: { id: true },
      });
      if (!unlock) {
        res.status(403).json({ error: 'Week is not unlocked for this class' });
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

      // Pin missionId to a local const so TS narrowing survives into the
      // $transaction callback (TS drops nullable narrowing across that boundary).
      const missionId: string = phase.missionId;
      const finalScore = score ?? 1.0;
      const incomingDetails =
        details && typeof details === 'object' && !Array.isArray(details)
          ? (details as Record<string, unknown>)
          : ({ status: 'complete' } as Record<string, unknown>);

      // Merge incoming details on top of whatever's already stored so this
      // phase-completion save does NOT wipe fields written by an earlier
      // /shifts/.../score or /submissions/evaluate against the same row
      // (writingText, pearlFeedback, vocabUsed, answerLog, etc.). mergeDetails
      // additionally protects non-empty string fields from empty-string clobber.
      const result = await prisma.$transaction(async (tx) => {
        const current = await tx.missionScore.findUnique({
          where: { pairId_missionId: { pairId, missionId } },
          select: { details: true },
        });
        const existingDetails =
          current?.details && typeof current.details === 'object' && !Array.isArray(current.details)
            ? (current.details as Record<string, unknown>)
            : {};
        const mergedDetails = mergeDetails(existingDetails, incomingDetails) as any;
        return tx.missionScore.upsert({
          where: { pairId_missionId: { pairId, missionId } },
          update: {
            score: finalScore,
            details: mergedDetails,
          },
          create: {
            pairId,
            missionId,
            score: finalScore,
            details: mergedDetails,
          },
        });
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
