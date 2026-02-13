import { Router, Request, Response } from 'express';
import prisma from '../utils/prisma';
import { authenticate } from '../middleware/auth';
import { uploadAudio } from '../middleware/upload';

const router = Router();

// POST /api/recordings — upload audio recording
router.post('/', authenticate, uploadAudio.single('audio'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No audio file provided' });
      return;
    }

    const recording = await prisma.recording.create({
      data: {
        userId: req.user!.userId,
        missionId: req.body.missionId || null,
        filename: req.file.filename,
        duration: req.body.duration ? parseFloat(req.body.duration) : null,
        status: 'processing',
      },
    });

    res.status(201).json({ recording });
  } catch (err) {
    console.error('Recording upload error:', err);
    res.status(500).json({ error: 'Failed to save recording' });
  }
});

// GET /api/recordings — list user's recordings
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const recordings = await prisma.recording.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    res.json({ recordings });
  } catch (err) {
    console.error('Recordings fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch recordings' });
  }
});

export default router;
