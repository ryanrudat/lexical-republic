import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import prisma from '../utils/prisma';

const router = Router();
router.use(authenticate);

// GET /api/vocabulary — Student's vocabulary with mastery
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const vocab = await prisma.vocabulary.findMany({
      include: {
        studentVocab: { where: { userId } },
        week: { select: { weekNumber: true } },
      },
      orderBy: { word: 'asc' },
    });

    const words = vocab.map((v) => ({
      id: v.id,
      word: v.word,
      tier: v.tier,
      source: v.source,
      weekNumber: v.week?.weekNumber || null,
      mastery: v.studentVocab[0]?.mastery || 0,
      encounters: v.studentVocab[0]?.encounters || 0,
    }));

    res.json({ words });
  } catch (err) {
    console.error('Vocabulary fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch vocabulary' });
  }
});

// POST /api/vocabulary/:vocabId/encounter — Record encounter
router.post('/:vocabId/encounter', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const vocabId = req.params.vocabId as string;

    const existing = await prisma.studentVocabulary.findUnique({
      where: { userId_vocabId: { userId, vocabId } },
    });

    if (existing) {
      const newEncounters = existing.encounters + 1;
      // Simple mastery: increases with encounters, caps at 1.0
      const newMastery = Math.min(1.0, existing.mastery + 0.1);
      const updated = await prisma.studentVocabulary.update({
        where: { id: existing.id },
        data: {
          encounters: newEncounters,
          mastery: newMastery,
          lastSeenAt: new Date(),
        },
      });
      res.json(updated);
    } else {
      const created = await prisma.studentVocabulary.create({
        data: {
          userId,
          vocabId,
          encounters: 1,
          mastery: 0.1,
          lastSeenAt: new Date(),
        },
      });
      res.json(created);
    }
  } catch (err) {
    console.error('Vocabulary encounter error:', err);
    res.status(500).json({ error: 'Failed to record encounter' });
  }
});

export default router;
