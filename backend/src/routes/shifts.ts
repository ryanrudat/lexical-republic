import { Router, Request, Response } from 'express';
import { authenticate, getPairId } from '../middleware/auth';
import { isPairPayload } from '../utils/jwt';
import prisma from '../utils/prisma';
import { getWeekConfig } from '../data/week-configs';
import { getNarrativeRoute, getRouteWeeks } from '../data/narrative-routes';
import { ensureHarmonyPostsExist } from '../utils/harmonyGenerator';
import { ensureShiftResultRegistered, getClosingTaskType } from '../utils/shiftResultRegistration';

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

// Merge details JSON while protecting non-empty string fields from being clobbered
// by an empty-string snapshot. Writing tasks can send writingText='' when the
// student's state is reset or when attempt-3 auto-pass fires with no typed text;
// we don't want that to wipe a writingText that the /submissions/evaluate call
// already stored correctly.
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

// GET /api/shifts/season — All weeks with arc info + student's completion per week
router.get('/season', async (req: Request, res: Response) => {
  try {
    const ctx = getAuthContext(req);

    // Determine student's class, unlocked weeks, and narrative route
    let unlockedWeekIds: Set<string> | null = null;
    let narrativeRouteId: string = 'full';
    const enrollment = await prisma.classEnrollment.findFirst({
      where: ctx.enrollmentWhere,
    });
    if (enrollment) {
      const [unlocks, cls] = await Promise.all([
        prisma.classWeekUnlock.findMany({
          where: { classId: enrollment.classId },
          select: { weekId: true },
        }),
        prisma.class.findUnique({
          where: { id: enrollment.classId },
          select: { narrativeRoute: true },
        }),
      ]);
      unlockedWeekIds = new Set(unlocks.map((u) => u.weekId));
      narrativeRouteId = cls?.narrativeRoute ?? 'full';
    }
    const narrativeRoute = getNarrativeRoute(narrativeRouteId);
    const routeWeekSet = new Set(narrativeRoute.weeks);

    // Fetch ShiftResult records to supplement clockedOut check
    // (teacher-initiated moves create ShiftResult with completedAt but no MissionScores).
    // Pair-gated: ShiftResult has NO userId column, so passing the legacy-branch
    // scoreFilter {userId} here threw a Prisma validation error — any teacher
    // token hitting /season got a 500. Teachers have no shift completions anyway.
    const seasonPairId = getPairId(req);
    const shiftResults = seasonPairId
      ? await prisma.shiftResult.findMany({
          where: { pairId: seasonPairId },
          select: { weekNumber: true, completedAt: true },
        })
      : [];
    const completedWeeks = new Set(
      shiftResults
        .filter(sr => sr.completedAt !== null)
        .map(sr => sr.weekNumber)
    );

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
              (m.missionType === 'clock_out' || m.missionType === 'shift_report') &&
              m.missionScores.some(
                (s) => (s.details as any)?.status === 'complete'
              )
          ) || completedWeeks.has(week.weekNumber),
          isUnlocked: unlockedWeekIds === null ? true : unlockedWeekIds.has(week.id),
        };
      })
    );

    // Filter weeks to only those in the active narrative route
    const filteredWeeks = weeks.filter((w) => routeWeekSet.has(w.weekNumber));

    res.json({
      title: 'Approved Shift Rotation',
      subtitle: `${filteredWeeks.length} Shifts \u2022 50 minutes each \u2022 Ministry-assigned`,
      weeks: filteredWeeks,
      narrativeRoute: narrativeRouteId,
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
      // Reject non-finite / out-of-range scores — both legit clients send
      // [0,1], so anything else is a bug or tampering (a string used to 500
      // in Prisma; out-of-range floats persisted and skewed per-task views).
      if (typeof score !== 'number' || !Number.isFinite(score) || score < 0 || score > 1) {
        res.status(400).json({ error: 'score must be a finite number between 0 and 1' });
        return;
      }
      const mission = await prisma.mission.findUnique({
        where: { id: missionId },
        include: { week: { select: { weekNumber: true } } },
      });

      if (!mission || mission.weekId !== weekId) {
        res.status(404).json({ error: 'Mission not found' });
        return;
      }

      // Reject score writes for weeks the student's class hasn't unlocked yet,
      // otherwise students can pre-credit themselves on future weeks. Row
      // presence in ClassWeekUnlock is the unlock signal — there's no boolean.
      const enrollment = await prisma.classEnrollment.findFirst({
        where: ctx.enrollmentWhere,
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

      // Merge incoming details on top of whatever's already stored so a later
      // save (e.g. the /shifts/.../score call after a writing task) does NOT
      // wipe fields written by an earlier save (e.g. grammarScore/pearlFeedback
      // from /submissions/evaluate). Both endpoints write to the same row.
      // mergeDetails additionally protects non-empty string fields (writingText,
      // text) from being overwritten by an empty-string snapshot.
      const result = await prisma.$transaction(async (tx) => {
        const existing = await tx.missionScore.findUnique({
          where: ctx.scoreWhere(mission.id),
          select: { details: true },
        });
        const existingDetails =
          existing?.details && typeof existing.details === 'object' && !Array.isArray(existing.details)
            ? (existing.details as Record<string, unknown>)
            : {};
        const incomingDetails =
          details && typeof details === 'object' && !Array.isArray(details)
            ? (details as Record<string, unknown>)
            : {};
        const mergedDetails = mergeDetails(existingDetails, incomingDetails) as any;
        return tx.missionScore.upsert({
          where: ctx.scoreWhere(mission.id),
          update: { score, details: mergedDetails },
          create: ctx.scoreCreate(mission.id, score, mergedDetails),
        });
      });

      // Server-side convergence: the moment the week's FINAL task is marked
      // complete, ensure a ShiftResult exists so the grade registers on the
      // teacher view even if the frontend ShiftClosing POST is lost or never
      // reached (e.g. the W4 epilogue gating ShiftClosing). Keyed on the week's
      // closing task type — NOT a hardcoded shift_report/clock_out list — so
      // weeks like W2 (which close on contradiction_report) are also covered.
      // The frontend POST still refines this with the richer client aggregate.
      // Non-fatal: the score is already committed above — never 500 the save.
      const pairId = getPairId(req);
      const closingType = mission.week ? getClosingTaskType(mission.week.weekNumber) : null;
      const isClosingTask = !!closingType && mission.missionType === closingType;
      const markedComplete = (result.details as Record<string, unknown> | null)?.status === 'complete';
      if (pairId && isClosingTask && markedComplete && mission.week) {
        try {
          await ensureShiftResultRegistered({ pairId, weekNumber: mission.week.weekNumber });
        } catch (convErr) {
          console.error('ShiftResult convergence failed (score still saved):', convErr);
        }
      }

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

      // Same ClassWeekUnlock gate as the /score sibling — this endpoint writes
      // the same MissionScore rows (incl. status:'complete' at score 1), so
      // without the gate it was a crafted-request path to pre-credit locked weeks.
      const enrollment = await prisma.classEnrollment.findFirst({
        where: ctx.enrollmentWhere,
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

      // Merge incoming details on top of existing — without this, a status-only
      // update from this path would clobber writingText/pearlFeedback/answerLog
      // already stored by /submissions/evaluate or the /score handler above
      // (both endpoints write to the same MissionScore row).
      const newScore = status === 'complete' ? 1 : 0;
      const incomingDetails: Record<string, unknown> = {
        status,
        ...(data && typeof data === 'object' && !Array.isArray(data)
          ? (data as Record<string, unknown>)
          : {}),
      };
      const result = await prisma.$transaction(async (tx) => {
        const existing = await tx.missionScore.findUnique({
          where: ctx.scoreWhere(mission.id),
          select: { details: true },
        });
        const existingDetails =
          existing?.details && typeof existing.details === 'object' && !Array.isArray(existing.details)
            ? (existing.details as Record<string, unknown>)
            : {};
        const mergedDetails = mergeDetails(existingDetails, incomingDetails) as any;
        return tx.missionScore.upsert({
          where: ctx.scoreWhere(mission.id),
          update: { score: newScore, details: mergedDetails },
          create: ctx.scoreCreate(mission.id, newScore, mergedDetails),
        });
      });

      res.json(result);
    } catch (err) {
      console.error('Step progress error:', err);
      res.status(500).json({ error: 'Failed to update step progress' });
    }
  }
);

// GET /api/shifts/weeks/:weekId/config — Return WeekConfig for queue-based weeks
// Merges teacher overrides (video clips, activity swaps) from DB Mission records
router.get('/weeks/:weekId/config', async (req: Request, res: Response) => {
  try {
    const weekId = req.params.weekId as string;
    const week = await prisma.week.findUnique({ where: { id: weekId } });
    if (!week) {
      res.status(404).json({ error: 'Week not found' });
      return;
    }
    const config = getWeekConfig(week.weekNumber);
    if (!config) {
      res.status(404).json({ error: 'No queue config for this week' });
      return;
    }

    // Fetch all mission records for this week to get teacher overrides
    const missions = await prisma.mission.findMany({
      where: { weekId },
      select: { missionType: true, config: true },
    });

    // Merge teacher overrides into matching task configs
    const enrichedTasks = config.tasks.map(task => {
      const mission = missions.find(m => m.missionType === task.type);
      if (!mission) return task;
      const missionConfig = mission.config as Record<string, unknown> | null;
      const teacherOverride = missionConfig?.teacherOverride as Record<string, unknown> | undefined;
      if (!teacherOverride || typeof teacherOverride !== 'object') return task;

      // Populate clipAfter from dismissal upload
      const dismissalUrl = typeof teacherOverride.dismissalClipUrl === 'string'
        ? teacherOverride.dismissalClipUrl : '';

      return {
        ...task,
        clipAfter: dismissalUrl || task.clipAfter || '',
        config: { ...task.config, teacherOverride },
      };
    });

    // Look up task gates + narrative route for the student's class
    const ctx = getAuthContext(req);
    const enrollment = await prisma.classEnrollment.findFirst({
      where: ctx.enrollmentWhere,
    });
    let taskGates: number[] = [];
    let bridgingBriefing = null;
    if (enrollment) {
      const [unlock, cls] = await Promise.all([
        prisma.classWeekUnlock.findUnique({
          where: { classId_weekId: { classId: enrollment.classId, weekId } },
          select: { taskGates: true },
        }),
        prisma.class.findUnique({
          where: { id: enrollment.classId },
          select: { narrativeRoute: true },
        }),
      ]);
      taskGates = unlock?.taskGates ?? [];

      // Inject bridging briefing if this week follows skipped weeks in the route
      const route = getNarrativeRoute(cls?.narrativeRoute ?? 'full');
      bridgingBriefing = route.bridgingBriefings[week.weekNumber] ?? null;
    }

    res.json({ ...config, tasks: enrichedTasks, taskGates, bridgingBriefing });
  } catch (err) {
    console.error('Week config fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch week config' });
  }
});

// POST /api/shifts/weeks/:weekId/shift-result — Create/update ShiftResult
router.post('/weeks/:weekId/shift-result', async (req: Request, res: Response) => {
  try {
    const pairId = getPairId(req);
    if (!pairId) {
      res.status(403).json({ error: 'Pair auth required' });
      return;
    }
    const weekId = req.params.weekId as string;
    const week = await prisma.week.findUnique({ where: { id: weekId } });
    if (!week) {
      res.status(404).json({ error: 'Week not found' });
      return;
    }
    const body = req.body;
    // ShiftClosing (PR #18) renamed the payload field from `targetWordsUsed`
    // to `wordsWritten` and added new fields (writingScore, overallScore,
    // targetWordsHit). Accept both old + new names so old frontend bundles
    // keep working, and stash the extra metrics in the existing
    // `taskResults` JSON catch-all so teacher views can read them later.
    const wordsWrittenValue = body.wordsWritten ?? body.targetWordsUsed ?? 0;
    const taskResultsPayload: Record<string, number> = {};
    if (typeof body.writingScore === 'number') taskResultsPayload.writingScore = body.writingScore;
    if (typeof body.overallScore === 'number') taskResultsPayload.overallScore = body.overallScore;
    if (typeof body.targetWordsHit === 'number') taskResultsPayload.targetWordsHit = body.targetWordsHit;
    if (typeof body.wordsWritten === 'number') taskResultsPayload.wordsWritten = body.wordsWritten;
    const data = {
      documentsProcessed: body.documentsProcessed ?? 0,
      documentsTotal: body.documentsTotal ?? 0,
      errorsFound: body.errorsFound ?? 0,
      errorsTotal: body.errorsTotal ?? 0,
      vocabScore: body.vocabScore ?? 0,
      grammarAccuracy: body.grammarAccuracy ?? 0,
      targetWordsUsed: wordsWrittenValue,
      concernScoreDelta: body.concernScoreDelta ?? 0,
      taskResults: taskResultsPayload,
    };
    const result = await prisma.shiftResult.upsert({
      where: { pairId_weekNumber: { pairId, weekNumber: week.weekNumber } },
      update: {
        ...data,
        // Re-entering an already-completed shift remounts ShiftClosing, which
        // re-posts with a freshly-zeroed concernScoreDelta — don't let that
        // stomp the recorded delta (Prisma skips undefined). A genuine redo
        // hits this UPDATE branch against the completedAt:null MARKER that
        // teacher reset-shift / send-to-task now leave behind — the marker's
        // delta is 0 (reset) or the prior value (partial redo), so keeping it
        // on a zero-delta repost is correct in both cases.
        ...(!data.concernScoreDelta ? { concernScoreDelta: undefined } : {}),
        completedAt: new Date(),
      },
      create: { pairId, weekNumber: week.weekNumber, ...data, completedAt: new Date() },
    });

    // Proactively prepare next-week Harmony content in the background so it's ready
    // when the student starts the next shift. Fire-and-forget: never blocks the response.
    void (async () => {
      try {
        const enrollment = await prisma.classEnrollment.findFirst({
          where: { pairId },
          select: { classId: true, class: { select: { narrativeRoute: true } } },
        });
        if (!enrollment?.classId) return;
        const routeId = enrollment.class?.narrativeRoute ?? 'full';
        const routeWeeks = getRouteWeeks(routeId);
        const nextWeek = routeWeeks.find(w => w > week.weekNumber);
        if (nextWeek === undefined) return;
        await ensureHarmonyPostsExist(nextWeek, enrollment.classId, routeId);
      } catch (err) {
        console.error('Proactive Harmony generation failed:', err);
      }
    })();

    res.json(result);
  } catch (err) {
    console.error('Shift result error:', err);
    res.status(500).json({ error: 'Failed to save shift result' });
  }
});

// PATCH /api/shifts/clearance — Update Pair.clearanceLevel
router.patch('/clearance', async (req: Request, res: Response) => {
  try {
    const pairId = getPairId(req);
    if (!pairId) {
      res.status(403).json({ error: 'Pair auth required' });
      return;
    }
    const { clearanceLevel } = req.body;
    if (!clearanceLevel) {
      res.status(400).json({ error: 'clearanceLevel required' });
      return;
    }
    const pair = await prisma.pair.update({
      where: { id: pairId },
      data: { clearanceLevel },
    });
    res.json({ clearanceLevel: pair.clearanceLevel });
  } catch (err) {
    console.error('Clearance update error:', err);
    res.status(500).json({ error: 'Failed to update clearance' });
  }
});

// PATCH /api/shifts/concern — Increment Pair.concernScore by delta
router.patch('/concern', async (req: Request, res: Response) => {
  try {
    const pairId = getPairId(req);
    if (!pairId) {
      res.status(403).json({ error: 'Pair auth required' });
      return;
    }
    // Clamp to ±1.0 per request — matches the Remediation Module's documented
    // per-event thresholds (Stage A +0.4/30s, Stage B +0.7/60s) so a single
    // client call can't self-zero or fake-trigger Remediation by sending a
    // huge value. NaN/Infinity rejected outright.
    const rawDelta = req.body?.delta;
    if (typeof rawDelta !== 'number' || !Number.isFinite(rawDelta)) {
      res.status(400).json({ error: 'delta must be a finite number' });
      return;
    }
    const delta = Math.max(-1, Math.min(1, rawDelta));
    // Read-modify-write with a [0, 100] clamp on the RESULT — a raw increment
    // had no floor, so scripted delta:-1 spam could bank an arbitrarily
    // negative score (suppressing the 3.0 remediation backstop and the
    // teacher's Concern chip for the rest of the semester). Transactional so
    // concurrent patches can't race past the clamp.
    const pair = await prisma.$transaction(async (tx) => {
      const current = await tx.pair.findUnique({
        where: { id: pairId },
        select: { concernScore: true },
      });
      const next = Math.max(0, Math.min(100, (current?.concernScore ?? 0) + delta));
      return tx.pair.update({
        where: { id: pairId },
        data: { concernScore: next },
      });
    });
    res.json({ concernScore: pair.concernScore });
  } catch (err) {
    console.error('Concern update error:', err);
    res.status(500).json({ error: 'Failed to update concern score' });
  }
});

// DELETE /api/shifts/weeks/:weekId/scores — Reset mission scores for a week
// Optional body { missionTypes: string[] } to delete only specific mission types
router.delete('/weeks/:weekId/scores', async (req: Request, res: Response) => {
  try {
    const ctx = getAuthContext(req);
    const weekId = req.params.weekId as string;
    const { missionTypes } = req.body as { missionTypes?: string[] };

    // Find missions for this week, optionally filtered by type
    const missions = await prisma.mission.findMany({
      where: {
        weekId,
        ...(Array.isArray(missionTypes) && missionTypes.length > 0
          ? { missionType: { in: missionTypes } }
          : {}),
      },
      select: { id: true },
    });
    const missionIds = missions.map(m => m.id);

    // Delete scores for this student's missions
    const result = await prisma.missionScore.deleteMany({
      where: {
        missionId: { in: missionIds },
        ...ctx.scoreFilter,
      },
    });

    res.json({ success: true, deleted: result.count });
  } catch (err) {
    console.error('Reset shift scores error:', err);
    res.status(500).json({ error: 'Failed to reset shift scores' });
  }
});

export default router;
