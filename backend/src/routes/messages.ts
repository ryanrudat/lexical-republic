import { Router, Request, Response } from 'express';
import { authenticate, getPairId } from '../middleware/auth';
import prisma from '../utils/prisma';

const router = Router();
router.use(authenticate);

// GET /api/messages — List character messages for the authenticated pair
router.get('/', async (req: Request, res: Response) => {
  try {
    const pairId = getPairId(req);
    if (!pairId) {
      res.status(403).json({ error: 'Pair auth required' });
      return;
    }
    const weekNumber = req.query.weekNumber ? Number(req.query.weekNumber) : undefined;
    const where: Record<string, unknown> = { pairId };
    if (weekNumber) where.weekNumber = weekNumber;

    const allMessages = await prisma.characterMessage.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });

    // Deduplicate: keep first message per character+trigger+week+taskId
    const seen = new Set<string>();
    const messages = allMessages.filter(m => {
      const taskId = (m.triggerConfig as Record<string, unknown>)?.taskId ?? '';
      const key = `${m.characterName}:${m.triggerType}:${m.weekNumber}:${taskId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    res.json({ messages });
  } catch (err) {
    console.error('Messages fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// POST /api/messages — Create a character message
router.post('/', async (req: Request, res: Response) => {
  try {
    const pairId = getPairId(req);
    if (!pairId) {
      res.status(403).json({ error: 'Pair auth required' });
      return;
    }
    const { characterName, designation, messageText, replyType, replyOptions, triggerType, triggerConfig, weekNumber } = req.body;

    // Atomic dedup: transaction ensures no race condition between check + create
    const taskId = triggerConfig?.taskId;
    const dedupWhere = {
      pairId,
      weekNumber,
      characterName,
      triggerType,
      ...(taskId ? { triggerConfig: { path: ['taskId'] as string[], equals: taskId } } : {}),
    };

    const message = await prisma.$transaction(async (tx) => {
      const existing = await tx.characterMessage.findFirst({ where: dedupWhere });
      if (existing) return existing;

      return tx.characterMessage.create({
        data: {
          pairId,
          characterName,
          designation: designation || '',
          messageText,
          replyType: replyType || 'canned',
          replyOptions: replyOptions || null,
          triggerType,
          triggerConfig: triggerConfig || {},
          weekNumber,
        },
      });
    });

    res.status(201).json(message);
  } catch (err) {
    console.error('Message create error:', err);
    res.status(500).json({ error: 'Failed to create message' });
  }
});

// PATCH /api/messages/:id/read — Mark message as read
router.patch('/:id/read', async (req: Request, res: Response) => {
  try {
    const pairId = getPairId(req);
    if (!pairId) {
      res.status(403).json({ error: 'Pair auth required' });
      return;
    }
    const id = req.params.id as string;
    const message = await prisma.characterMessage.update({
      where: { id },
      data: { isRead: true },
    });
    res.json(message);
  } catch (err) {
    console.error('Message read error:', err);
    res.status(500).json({ error: 'Failed to mark message as read' });
  }
});

// PATCH /api/messages/:id/reply — Store student reply + create NarrativeChoice
router.patch('/:id/reply', async (req: Request, res: Response) => {
  try {
    const pairId = getPairId(req);
    if (!pairId) {
      res.status(403).json({ error: 'Pair auth required' });
      return;
    }
    const id = req.params.id as string;
    const { reply } = req.body;
    if (!reply || typeof reply !== 'string') {
      res.status(400).json({ error: 'reply text required' });
      return;
    }

    const message = await prisma.characterMessage.update({
      where: { id },
      data: { studentReply: reply, isRead: true },
    });

    // Log to NarrativeChoice for future branching
    await prisma.narrativeChoice.create({
      data: {
        pairId,
        choiceKey: `msg_${id}`,
        value: reply,
        context: { weekNumber: message.weekNumber, characterName: message.characterName },
      },
    });

    res.json(message);
  } catch (err) {
    console.error('Message reply error:', err);
    res.status(500).json({ error: 'Failed to save reply' });
  }
});

// GET /api/messages/unread-count — Count unread messages
router.get('/unread-count', async (req: Request, res: Response) => {
  try {
    const pairId = getPairId(req);
    if (!pairId) {
      res.status(403).json({ error: 'Pair auth required' });
      return;
    }
    const count = await prisma.characterMessage.count({
      where: { pairId, isRead: false },
    });
    res.json({ count });
  } catch (err) {
    console.error('Unread count error:', err);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
});

export default router;
