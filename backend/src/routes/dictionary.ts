import { Router, Request, Response } from 'express';
import { authenticate, requirePair, getPairId } from '../middleware/auth';
import { isPairPayload } from '../utils/jwt';
import prisma from '../utils/prisma';

const router = Router();
router.use(authenticate);

// GET /api/dictionary — Words filtered by pair's current week, with progress
router.get('/', async (req: Request, res: Response) => {
  try {
    const pairId = getPairId(req);
    if (!pairId) {
      res.status(403).json({ error: 'Pair authentication required' });
      return;
    }

    // Determine pair's current week (highest unlocked week in their class)
    const enrollment = await prisma.classEnrollment.findFirst({
      where: { pairId },
      select: { classId: true },
    });

    let currentWeek = 1;
    if (enrollment) {
      const unlocks = await prisma.classWeekUnlock.findMany({
        where: { classId: enrollment.classId },
        include: { week: { select: { weekNumber: true } } },
      });
      const maxWeek = Math.max(...unlocks.map((u) => u.week.weekNumber), 1);
      currentWeek = maxWeek;
    }

    // Fetch all words introduced up to current week
    const words = await prisma.dictionaryWord.findMany({
      where: { weekIntroduced: { lte: currentWeek } },
      include: {
        progress: { where: { pairId }, take: 1 },
        statusEvents: {
          where: { weekNumber: { lte: currentWeek } },
          orderBy: { weekNumber: 'asc' },
        },
      },
      orderBy: [{ weekIntroduced: 'asc' }, { word: 'asc' }],
    });

    // Apply status events to compute current status for each word
    const result = words.map((w) => {
      let currentStatus = w.initialStatus;
      for (const evt of w.statusEvents) {
        currentStatus = evt.toStatus;
      }

      const prog = w.progress[0];
      return {
        id: w.id,
        word: w.word,
        partOfSpeech: w.partOfSpeech,
        phonetic: w.phonetic,
        partyDefinition: w.partyDefinition,
        trueDefinition: currentWeek >= 7 ? w.trueDefinition : '', // Unlocked in Act II
        exampleSentence: w.exampleSentence,
        toeicCategory: w.toeicCategory,
        wordFamilyGroup: w.wordFamilyGroup,
        weekIntroduced: w.weekIntroduced,
        isWorldBuilding: w.isWorldBuilding,
        status: currentStatus,
        mastery: prog?.mastery ?? 0,
        encounters: prog?.encounters ?? 0,
        isRecovered: prog?.isRecovered ?? false,
        studentNotes: prog?.studentNotes ?? '',
        lastSeenAt: prog?.lastSeenAt?.toISOString() ?? null,
      };
    });

    res.json({ words: result, currentWeek });
  } catch (err) {
    console.error('Dictionary fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch dictionary' });
  }
});

// GET /api/dictionary/stats — Aggregate counts by status, mastery totals
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const pairId = getPairId(req);
    if (!pairId) {
      res.status(403).json({ error: 'Pair authentication required' });
      return;
    }

    const progress = await prisma.pairDictionaryProgress.findMany({
      where: { pairId },
      include: { word: { select: { isWorldBuilding: true } } },
    });

    const stats = {
      total: progress.length,
      targetWords: progress.filter((p) => !p.word.isWorldBuilding).length,
      worldBuildingWords: progress.filter((p) => p.word.isWorldBuilding).length,
      byStatus: {} as Record<string, number>,
      averageMastery: 0,
      totalEncounters: 0,
    };

    for (const p of progress) {
      stats.byStatus[p.status] = (stats.byStatus[p.status] || 0) + 1;
      stats.totalEncounters += p.encounters;
    }

    const targetProgress = progress.filter((p) => !p.word.isWorldBuilding);
    if (targetProgress.length > 0) {
      stats.averageMastery =
        targetProgress.reduce((sum, p) => sum + p.mastery, 0) / targetProgress.length;
    }

    res.json(stats);
  } catch (err) {
    console.error('Dictionary stats error:', err);
    res.status(500).json({ error: 'Failed to fetch dictionary stats' });
  }
});

// GET /api/dictionary/families — All word families with member availability
router.get('/families', async (req: Request, res: Response) => {
  try {
    const families = await prisma.wordFamily.findMany({
      orderBy: { rootWord: 'asc' },
    });

    res.json({ families });
  } catch (err) {
    console.error('Dictionary families error:', err);
    res.status(500).json({ error: 'Failed to fetch word families' });
  }
});

// GET /api/dictionary/:wordId — Single word detail + status history
router.get('/:wordId', async (req: Request, res: Response) => {
  try {
    const wordId = req.params.wordId as string;
    const pairId = getPairId(req);

    const word = await prisma.dictionaryWord.findUnique({
      where: { id: wordId },
      include: {
        progress: pairId ? { where: { pairId }, take: 1 } : false,
        statusEvents: { orderBy: { weekNumber: 'asc' } },
      },
    });

    if (!word) {
      res.status(404).json({ error: 'Word not found' });
      return;
    }

    const prog = Array.isArray(word.progress) ? word.progress[0] : null;

    res.json({
      ...word,
      mastery: prog?.mastery ?? 0,
      encounters: prog?.encounters ?? 0,
      isRecovered: prog?.isRecovered ?? false,
      studentNotes: prog?.studentNotes ?? '',
      lastSeenAt: prog?.lastSeenAt?.toISOString() ?? null,
    });
  } catch (err) {
    console.error('Dictionary word fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch word' });
  }
});

// PATCH /api/dictionary/:wordId/notes — Update student notes
router.patch('/:wordId/notes', requirePair, async (req: Request, res: Response) => {
  try {
    const wordId = req.params.wordId as string;
    const pairId = getPairId(req)!;
    const { notes } = req.body as { notes?: string };

    if (typeof notes !== 'string') {
      res.status(400).json({ error: 'notes must be a string' });
      return;
    }

    const result = await prisma.pairDictionaryProgress.upsert({
      where: { pairId_wordId: { pairId, wordId } },
      update: { studentNotes: notes.slice(0, 500) },
      create: {
        pairId,
        wordId,
        studentNotes: notes.slice(0, 500),
      },
    });

    res.json({ id: result.id, studentNotes: result.studentNotes });
  } catch (err) {
    console.error('Dictionary notes update error:', err);
    res.status(500).json({ error: 'Failed to update notes' });
  }
});

// POST /api/dictionary/:wordId/encounter — Increment encounters, update mastery
router.post('/:wordId/encounter', requirePair, async (req: Request, res: Response) => {
  try {
    const wordId = req.params.wordId as string;
    const pairId = getPairId(req)!;

    const existing = await prisma.pairDictionaryProgress.findUnique({
      where: { pairId_wordId: { pairId, wordId } },
    });

    if (existing) {
      const newEncounters = existing.encounters + 1;
      const newMastery = Math.min(1.0, existing.mastery + 0.1);
      const updated = await prisma.pairDictionaryProgress.update({
        where: { id: existing.id },
        data: {
          encounters: newEncounters,
          mastery: newMastery,
          lastSeenAt: new Date(),
        },
      });
      res.json(updated);
    } else {
      const created = await prisma.pairDictionaryProgress.create({
        data: {
          pairId,
          wordId,
          encounters: 1,
          mastery: 0.1,
          lastSeenAt: new Date(),
        },
      });
      res.json(created);
    }
  } catch (err) {
    console.error('Dictionary encounter error:', err);
    res.status(500).json({ error: 'Failed to record encounter' });
  }
});

// POST /api/dictionary/:wordId/recover — Mark proscribed word as recovered
router.post('/:wordId/recover', requirePair, async (req: Request, res: Response) => {
  try {
    const wordId = req.params.wordId as string;
    const pairId = getPairId(req)!;

    const result = await prisma.pairDictionaryProgress.upsert({
      where: { pairId_wordId: { pairId, wordId } },
      update: { isRecovered: true, status: 'recovered' },
      create: {
        pairId,
        wordId,
        isRecovered: true,
        status: 'recovered',
      },
    });

    res.json(result);
  } catch (err) {
    console.error('Dictionary recover error:', err);
    res.status(500).json({ error: 'Failed to recover word' });
  }
});

export default router;
