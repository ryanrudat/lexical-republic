import { Router, Request, Response } from 'express';
import { authenticate, requirePair, requireRole, getPairId } from '../middleware/auth';
import { isPairPayload } from '../utils/jwt';
import prisma from '../utils/prisma';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const uploadPath = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');

const router = Router();
router.use(authenticate);

// GET /api/dictionary — Words filtered by pair's current week, with progress
// Accessible by both pairs and teachers (teachers see all words, no progress)
router.get('/', async (req: Request, res: Response) => {
  try {
    const pairId = getPairId(req);

    // Determine current week: pair uses their class unlocks, teacher sees all
    let currentWeek = 18; // Teachers see everything
    if (pairId) {
      const enrollment = await prisma.classEnrollment.findFirst({
        where: { pairId },
        select: { classId: true },
      });
      currentWeek = 1;
      if (enrollment) {
        const unlocks = await prisma.classWeekUnlock.findMany({
          where: { classId: enrollment.classId },
          include: { week: { select: { weekNumber: true } } },
        });
        const maxWeek = Math.max(...unlocks.map((u) => u.week.weekNumber), 1);
        currentWeek = maxWeek;
      }
    }

    // Fetch all words introduced up to current week
    const words = await prisma.dictionaryWord.findMany({
      where: { weekIntroduced: { lte: currentWeek } },
      include: {
        ...(pairId
          ? { progress: { where: { pairId }, take: 1 } }
          : {}),
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

      const prog = 'progress' in w && Array.isArray(w.progress) ? w.progress[0] : null;
      return {
        id: w.id,
        word: w.word,
        partOfSpeech: w.partOfSpeech,
        phonetic: w.phonetic,
        partyDefinition: w.partyDefinition,
        trueDefinition: currentWeek >= 7 ? w.trueDefinition : '', // Unlocked in Act II
        exampleSentence: w.exampleSentence,
        translationZhTw: w.translationZhTw ?? null,
        toeicCategory: w.toeicCategory,
        wordFamilyGroup: w.wordFamilyGroup,
        weekIntroduced: w.weekIntroduced,
        isWorldBuilding: w.isWorldBuilding,
        status: currentStatus,
        mastery: prog?.mastery ?? 0,
        encounters: prog?.encounters ?? 0,
        isRecovered: prog?.isRecovered ?? false,
        starred: prog?.starred ?? false,
        chineseRevealed: prog?.chineseRevealed ?? false,
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
// Accessible by both pairs and teachers (teachers see empty stats)
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const pairId = getPairId(req);

    const progress = pairId
      ? await prisma.pairDictionaryProgress.findMany({
          where: { pairId },
          include: { word: { select: { isWorldBuilding: true } } },
        })
      : [];

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

// POST /api/dictionary/welcome-watched — Mark pair as having watched welcome video
router.post('/welcome-watched', requirePair, async (req: Request, res: Response) => {
  try {
    const pairId = getPairId(req)!;
    await prisma.pair.update({
      where: { id: pairId },
      data: { hasWatchedWelcome: true },
    });
    res.json({ success: true });
  } catch (err) {
    console.error('Welcome watched error:', err);
    res.status(500).json({ error: 'Failed to mark welcome as watched' });
  }
});

// POST /api/dictionary/welcome-video — Teacher uploads welcome video
const welcomeStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.isAbsolute(uploadPath)
      ? path.join(uploadPath, 'welcome')
      : path.join(__dirname, '../../', uploadPath, 'welcome');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, _file, cb) => {
    cb(null, 'welcome-video.mp4');
  },
});
const welcomeUpload = multer({ storage: welcomeStorage, limits: { fileSize: 200 * 1024 * 1024 } });

router.post('/welcome-video', requireRole('teacher'), welcomeUpload.single('video'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No video file provided' });
      return;
    }
    res.json({ success: true, filename: req.file.filename });
  } catch (err) {
    console.error('Welcome video upload error:', err);
    res.status(500).json({ error: 'Failed to upload welcome video' });
  }
});

// GET /api/dictionary/welcome-video — Serve the welcome video file
router.get('/welcome-video', async (_req: Request, res: Response) => {
  try {
    const dir = path.isAbsolute(uploadPath)
      ? path.join(uploadPath, 'welcome')
      : path.join(__dirname, '../../', uploadPath, 'welcome');
    const filePath = path.join(dir, 'welcome-video.mp4');
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'No welcome video uploaded yet' });
      return;
    }
    res.sendFile(filePath);
  } catch (err) {
    console.error('Welcome video serve error:', err);
    res.status(500).json({ error: 'Failed to serve welcome video' });
  }
});

// PATCH /api/dictionary/:wordId/starred — Toggle starred status
router.patch('/:wordId/starred', requirePair, async (req: Request, res: Response) => {
  try {
    const wordId = req.params.wordId as string;
    const pairId = getPairId(req)!;

    const existing = await prisma.pairDictionaryProgress.findUnique({
      where: { pairId_wordId: { pairId, wordId } },
    });

    if (existing) {
      const updated = await prisma.pairDictionaryProgress.update({
        where: { id: existing.id },
        data: { starred: !existing.starred },
      });
      res.json({ starred: updated.starred });
    } else {
      const created = await prisma.pairDictionaryProgress.create({
        data: { pairId, wordId, starred: true },
      });
      res.json({ starred: created.starred });
    }
  } catch (err) {
    console.error('Dictionary starred toggle error:', err);
    res.status(500).json({ error: 'Failed to toggle starred' });
  }
});

// PATCH /api/dictionary/:wordId/chinese-revealed — Mark Chinese translation as revealed (one-way)
router.patch('/:wordId/chinese-revealed', requirePair, async (req: Request, res: Response) => {
  try {
    const wordId = req.params.wordId as string;
    const pairId = getPairId(req)!;

    await prisma.pairDictionaryProgress.upsert({
      where: { pairId_wordId: { pairId, wordId } },
      update: { chineseRevealed: true },
      create: { pairId, wordId, chineseRevealed: true },
    });
    res.json({ chineseRevealed: true });
  } catch (err) {
    console.error('Dictionary chinese-revealed error:', err);
    res.status(500).json({ error: 'Failed to reveal Chinese translation' });
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
      translationZhTw: word.translationZhTw ?? null,
      mastery: prog?.mastery ?? 0,
      encounters: prog?.encounters ?? 0,
      isRecovered: prog?.isRecovered ?? false,
      starred: prog?.starred ?? false,
      chineseRevealed: prog?.chineseRevealed ?? false,
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
