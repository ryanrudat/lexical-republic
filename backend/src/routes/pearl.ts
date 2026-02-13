import { Router, Request, Response } from 'express';
import prisma from '../utils/prisma';

const router = Router();

// GET /api/pearl/messages — return active messages, shuffled
router.get('/messages', async (_req: Request, res: Response) => {
  try {
    const messages = await prisma.pearlMessage.findMany({
      where: { isActive: true },
    });

    // Fisher-Yates shuffle
    for (let i = messages.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [messages[i], messages[j]] = [messages[j], messages[i]];
    }

    res.json({ messages });
  } catch (err) {
    console.error('PEARL messages error:', err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

export default router;
