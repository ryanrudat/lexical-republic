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

    const correctWords = words
      .filter((w) => w && typeof w.word === 'string' && w.correct === true)
      .map((w) => w.word.trim().toLowerCase())
      .filter((w) => w.length > 0);

    if (correctWords.length === 0) {
      res.json({ success: true, masteryUpdates: 0 });
      return;
    }

    // Look up dictionary ids for the correct words
    const dictWords = await prisma.dictionaryWord.findMany({
      where: { word: { in: correctWords } },
      select: { id: true, word: true },
    });

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
    });

    res.json({
      success: true,
      checkId,
      weekNumber,
      correctCount: correctWords.length,
      masteryUpdates: updates,
    });
  } catch (err) {
    console.error('Clarity check complete error:', err);
    res.status(500).json({ error: 'Failed to record clarity check' });
  }
});

export default router;
