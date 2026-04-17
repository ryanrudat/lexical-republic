import { Router, Request, Response } from 'express';
import { authenticate, getPairId } from '../middleware/auth';
import prisma from '../utils/prisma';
import { getWeekConfig } from '../data/week-configs';

const router = Router();
router.use(authenticate);

/** Count of WeekConfigs with content (treated as the student's total available shifts). Computed once at module load. */
const TOTAL_AVAILABLE_SHIFTS = (() => {
  let count = 0;
  for (let w = 1; w <= 18; w++) {
    if (getWeekConfig(w)) count += 1;
  }
  return count;
})();

// GET /api/student/profile-summary — Aggregated dossier data for the logged-in pair
router.get('/profile-summary', async (req: Request, res: Response) => {
  try {
    const pairId = getPairId(req);
    if (!pairId) {
      res.status(403).json({ error: 'Pair authentication required' });
      return;
    }

    const [
      pair,
      shiftResults,
      dictionaryProgress,
      harmonyPostsWritten,
      censureResponses,
      narrativeChoicesCount,
      citizen4488Count,
    ] = await Promise.all([
      prisma.pair.findUnique({
        where: { id: pairId },
        select: {
          designation: true,
          xp: true,
          concernScore: true,
          lane: true,
          consecutiveQualifyingShifts: true,
          laneLocked: true,
          harmonyUnlockedAt: true,
          createdAt: true,
        },
      }),
      prisma.shiftResult.findMany({
        where: { pairId, completedAt: { not: null } },
        orderBy: { weekNumber: 'asc' },
        select: {
          weekNumber: true,
          completedAt: true,
          vocabScore: true,
          grammarAccuracy: true,
          targetWordsUsed: true,
          errorsFound: true,
          errorsTotal: true,
          concernScoreDelta: true,
        },
      }),
      prisma.pairDictionaryProgress.findMany({
        where: { pairId },
        select: {
          status: true,
          mastery: true,
          encounters: true,
          starred: true,
          isRecovered: true,
        },
      }),
      prisma.harmonyPost.count({
        where: { pairId, isGenerated: false },
      }),
      prisma.harmonyCensureResponse.findMany({
        where: { pairId },
        select: { isCorrect: true },
      }),
      prisma.narrativeChoice.count({ where: { pairId } }),
      prisma.citizen4488Interaction.count({ where: { pairId } }),
    ]);

    if (!pair) {
      res.status(404).json({ error: 'Citizen file not found' });
      return;
    }

    // Vocabulary aggregates (single pass)
    const totalWords = dictionaryProgress.length;
    const byStatus = {
      approved: 0,
      monitored: 0,
      grey: 0,
      proscribed: 0,
      recovered: 0,
    };
    let totalEncounters = 0;
    let masterySum = 0;
    let starredCount = 0;
    for (const entry of dictionaryProgress) {
      totalEncounters += entry.encounters;
      masterySum += entry.mastery;
      if (entry.isRecovered) {
        byStatus.recovered += 1;
      } else {
        byStatus[entry.status] += 1;
      }
      if (entry.starred) starredCount += 1;
    }
    const averageMastery = totalWords > 0 ? masterySum / totalWords : 0;

    // Harmony censure aggregates
    const censureResponsesTotal = censureResponses.length;
    let censureCorrect = 0;
    for (const r of censureResponses) if (r.isCorrect) censureCorrect += 1;
    const censureCorrectnessRate = censureResponsesTotal > 0
      ? censureCorrect / censureResponsesTotal
      : 0;

    // Pair table does not track a streak field (legacy User field only), so surface 0.
    const streak = 0;

    res.json({
      citizen: {
        designation: pair.designation,
        xp: pair.xp,
        streak,
        lane: pair.lane,
        concernScore: pair.concernScore,
        consecutiveQualifyingShifts: pair.consecutiveQualifyingShifts,
        laneLocked: pair.laneLocked,
        harmonyUnlockedAt: pair.harmonyUnlockedAt,
        createdAt: pair.createdAt,
      },
      shifts: {
        totalCompleted: shiftResults.length,
        totalAvailable: TOTAL_AVAILABLE_SHIFTS,
        recentResults: shiftResults.map(r => ({
          weekNumber: r.weekNumber,
          completedAt: r.completedAt,
          vocabScore: r.vocabScore,
          grammarAccuracy: r.grammarAccuracy,
          targetWordsUsed: r.targetWordsUsed,
          errorsFound: r.errorsFound,
          errorsTotal: r.errorsTotal,
          concernScoreDelta: r.concernScoreDelta,
        })),
      },
      vocabulary: {
        totalWords,
        averageMastery,
        totalEncounters,
        byStatus,
        starredCount,
      },
      harmony: {
        postsWritten: harmonyPostsWritten,
        censureResponsesTotal,
        censureCorrect,
        censureCorrectnessRate,
      },
      character: {
        narrativeChoicesMade: narrativeChoicesCount,
        citizen4488InteractionsCount: citizen4488Count,
      },
    });
  } catch (err) {
    console.error('Profile summary error:', err);
    res.status(500).json({ error: 'Failed to load citizen file' });
  }
});

export default router;
