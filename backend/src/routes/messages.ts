import { Router, Request, Response } from 'express';
import type { Prisma } from '@prisma/client';
import { authenticate, getPairId, getTeacherId } from '../middleware/auth';
import prisma from '../utils/prisma';
import { io } from '../socketServer';

interface ThreadEntry {
  sender: 'teacher' | 'student';
  text: string;
  timestamp: string;
}

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

    // When filtering by weekNumber, also include thread messages (Clarity Minder)
    // so they persist across shifts
    const where = weekNumber
      ? { pairId, OR: [{ weekNumber }, { replyType: 'thread' }] }
      : { pairId };

    const allMessages = await prisma.characterMessage.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });

    // Deduplicate: keep first message per character+trigger+week+taskId
    // Skip dedup for thread messages (each is unique)
    const seen = new Set<string>();
    const messages = allMessages.filter(m => {
      if (m.replyType === 'thread') return true;
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
      // Primary dedup: exact match on character+trigger+week+taskId
      const existing = await tx.characterMessage.findFirst({ where: dedupWhere });
      if (existing) return existing;

      // Fallback dedup: same character+week+text (catches mismatched taskId)
      const textMatch = await tx.characterMessage.findFirst({
        where: { pairId, weekNumber, characterName, triggerType, messageText },
      });
      if (textMatch) return textMatch;

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

// ─── Static routes BEFORE parameterized /:id routes ──────────

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

// POST /api/messages/direct — Teacher sends a direct message to a student
router.post('/direct', async (req: Request, res: Response) => {
  try {
    const teacherId = getTeacherId(req);
    if (!teacherId) {
      res.status(403).json({ error: 'Teacher auth required' });
      return;
    }
    const { pairId, text, weekNumber } = req.body;

    if (!pairId || typeof pairId !== 'string') {
      res.status(400).json({ error: 'pairId required' });
      return;
    }
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      res.status(400).json({ error: 'text required' });
      return;
    }
    if (text.length > 500) {
      res.status(400).json({ error: 'text must be 500 characters or less' });
      return;
    }

    // Validate pairId exists
    const pair = await prisma.pair.findUnique({ where: { id: pairId } });
    if (!pair) {
      res.status(404).json({ error: 'Student not found' });
      return;
    }

    const message = await prisma.characterMessage.create({
      data: {
        pairId,
        characterName: 'Clarity Minder',
        designation: 'Ministry Oversight',
        messageText: text.trim(),
        replyType: 'thread',
        triggerType: 'direct_message',
        triggerConfig: { teacherId },
        weekNumber: weekNumber ?? 0,
        thread: [],
      },
    });

    // Notify student in real-time
    io.to(`student:${pairId}`).emit('session:clarity-message', { message });

    res.status(201).json(message);
  } catch (err) {
    console.error('Direct message error:', err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// GET /api/messages/direct/:pairId — Teacher fetches threads for a student
router.get('/direct/:pairId', async (req: Request, res: Response) => {
  try {
    const teacherId = getTeacherId(req);
    if (!teacherId) {
      res.status(403).json({ error: 'Teacher auth required' });
      return;
    }
    const pairId = req.params.pairId as string;

    const messages = await prisma.characterMessage.findMany({
      where: { pairId, replyType: 'thread' },
      orderBy: { createdAt: 'asc' },
    });

    res.json({ messages });
  } catch (err) {
    console.error('Direct messages fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// ─── Parameterized /:id routes ───────────────────────────────

// POST /api/messages/:id/thread — Append to thread (teacher or student)
router.post('/:id/thread', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { text } = req.body;

    const teacherId = getTeacherId(req);
    const pairId = getPairId(req);
    const isTeacher = !!teacherId;

    if (!teacherId && !pairId) {
      res.status(403).json({ error: 'Authentication required' });
      return;
    }

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      res.status(400).json({ error: 'text required' });
      return;
    }

    const maxLen = isTeacher ? 500 : 200;
    if (text.length > maxLen) {
      res.status(400).json({ error: `text must be ${maxLen} characters or less` });
      return;
    }

    // Atomic read→append→write
    const message = await prisma.$transaction(async (tx) => {
      const msg = await tx.characterMessage.findUnique({ where: { id } });
      if (!msg) return null;

      // Auth check: student must own the message
      if (!isTeacher && msg.pairId !== pairId) return null;

      // Must be a thread-type message
      if (msg.replyType !== 'thread') return null;

      const currentThread = (msg.thread as ThreadEntry[] | null) ?? [];
      if (currentThread.length >= 50) {
        throw new Error('THREAD_CAP');
      }

      const entry: ThreadEntry = {
        sender: isTeacher ? 'teacher' : 'student',
        text: text.trim(),
        timestamp: new Date().toISOString(),
      };

      return tx.characterMessage.update({
        where: { id },
        data: {
          thread: [...currentThread, entry] as unknown as Prisma.InputJsonValue,
          // Reset isRead when teacher sends so student sees the new entry
          ...(isTeacher ? { isRead: false } : {}),
        },
      });
    });

    if (message === null) {
      res.status(404).json({ error: 'Message not found or access denied' });
      return;
    }

    // Build the entry for socket emit
    const thread = message.thread as unknown as ThreadEntry[];
    const entry = thread[thread.length - 1];

    if (!isTeacher) {
      // Student sent — notify teacher
      io.to('teacher').emit('teacher:clarity-reply', {
        messageId: id,
        pairId: message.pairId,
        entry,
      });
    } else {
      // Teacher sent — notify student
      io.to(`student:${message.pairId}`).emit('session:clarity-message', {
        messageId: id,
        entry,
      });
    }

    res.json(message);
  } catch (err) {
    if (err instanceof Error && err.message === 'THREAD_CAP') {
      res.status(400).json({ error: 'Thread has reached the maximum of 50 messages' });
      return;
    }
    console.error('Thread append error:', err);
    res.status(500).json({ error: 'Failed to append to thread' });
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

    // Verify message belongs to this pair
    const existing = await prisma.characterMessage.findUnique({ where: { id } });
    if (!existing || existing.pairId !== pairId) {
      res.status(404).json({ error: 'Message not found' });
      return;
    }

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

    // Verify message belongs to this pair
    const existing = await prisma.characterMessage.findUnique({ where: { id } });
    if (!existing || existing.pairId !== pairId) {
      res.status(404).json({ error: 'Message not found' });
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

export default router;
