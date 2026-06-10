import { Router } from 'express';
import { authenticate, getPairId } from '../middleware/auth';
import prisma from '../utils/prisma';

const router = Router();
router.use(authenticate);

/**
 * POST /api/clarity-check/complete
 *
 * Body: { checkId: string; weekNumber: number; words: Array<{ word: string; correct: boolean }> }
 *
 * Fire-once recording of a completed Clarity Check. Correctly answered words get
 * a small dictionary mastery bump (+0.03, matching the Harmony spaced-review rate).
 * No MissionScore is written — Clarity Checks are lightweight verifications, not tasks.
 */
router.post('/complete', async (req, res) => {
  try {
    const pairId = getPairId(req);
    if (!pairId) {
      res.status(403).json({ error: 'Pair auth required' });
      return;
    }

    const { checkId, weekNumber, words } = req.body as {
      checkId?: string;
      weekNumber?: number;
      words?: Array<{ word: string; correct: boolean }>;
    };

    if (
      typeof checkId !== 'string' ||
      typeof weekNumber !== 'number' ||
      !Array.isArray(words)
    ) {
      res.status(400).json({ error: 'checkId, weekNumber, and words[] are required' });
      return;
    }

    const existing = await prisma.clarityCheckResult.findUnique({
      where: { pairId_checkId: { pairId, checkId } },
      select: { completedAt: true },
    });
    if (existing?.completedAt) {
      res.json({ success: true, alreadyCompleted: true });
      return;
    }

    const correctWords = words
      .filter((w) => w && typeof w.word === 'string' && w.correct === true)
      .map((w) => w.word.trim().toLowerCase())
      .filter((w) => w.length > 0);

    const totalCount = words.length;
    const correctCount = correctWords.length;

    const dictWords = correctWords.length
      ? await prisma.dictionaryWord.findMany({
          where: { word: { in: correctWords } },
          select: { id: true, word: true },
        })
      : [];

    let updates = 0;
    await prisma.$transaction(async (tx) => {
      for (const dw of dictWords) {
        const prog = await tx.pairDictionaryProgress.upsert({
          where: { pairId_wordId: { pairId, wordId: dw.id } },
          update: { encounters: { increment: 1 }, lastSeenAt: new Date() },
          create: {
            pairId,
            wordId: dw.id,
            encounters: 1,
            mastery: 0.1,
            lastSeenAt: new Date(),
          },
        });
        if (prog.mastery < 1.0) {
          await tx.pairDictionaryProgress.update({
            where: { id: prog.id },
            data: { mastery: Math.min(1.0, prog.mastery + 0.03) },
          });
          updates++;
        }
      }

      await tx.clarityCheckResult.upsert({
        where: { pairId_checkId: { pairId, checkId } },
        update: { completedAt: new Date(), correctCount, totalCount, weekNumber },
        create: { pairId, checkId, weekNumber, totalCount, correctCount, completedAt: new Date() },
      });
    });

    res.json({
      success: true,
      checkId,
      weekNumber,
      correctCount,
      masteryUpdates: updates,
    });
  } catch (err) {
    console.error('Clarity check complete error:', err);
    res.status(500).json({ error: 'Failed to record clarity check' });
  }
});

/**
 * GET /api/clarity-check/completed?weekNumber=N
 *
 * Returns the pair's completed Clarity Check ids (optionally filtered to one
 * week). The frontend one-shot gate used to be client-memory only
 * (completedClarityCheckIdsRef), so every refresh replayed the shift_start
 * check as a screen-locking quiz — this endpoint lets ShiftQueue hydrate the
 * gate from the server, mirroring the Compliance Check pattern.
 */
router.get('/completed', async (req, res) => {
  try {
    const pairId = getPairId(req);
    if (!pairId) {
      res.status(403).json({ error: 'Pair auth required' });
      return;
    }
    const weekRaw = req.query.weekNumber;
    const weekNumber =
      typeof weekRaw === 'string' && weekRaw.length > 0 ? Number(weekRaw) : null;

    const rows = await prisma.clarityCheckResult.findMany({
      where: {
        pairId,
        completedAt: { not: null },
        ...(weekNumber !== null && Number.isFinite(weekNumber) ? { weekNumber } : {}),
      },
      select: { checkId: true },
    });
    res.json({ checkIds: rows.map((r) => r.checkId) });
  } catch (err) {
    console.error('Clarity check completed fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch completed clarity checks' });
  }
});

export default router;
