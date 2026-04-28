import { Router, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { authenticate, requirePair, getPairId } from '../middleware/auth';
import prisma from '../utils/prisma';

const router = Router();
router.use(authenticate);

// POST /api/narrative-choices — store a student's choice from a B moment or other branching point.
router.post('/', requirePair, async (req: Request, res: Response) => {
  try {
    const pairId = getPairId(req)!;
    const { choiceKey, value, weekNumber, context } = req.body as {
      choiceKey?: string;
      value?: string;
      weekNumber?: number;
      context?: Record<string, unknown>;
    };

    if (!choiceKey || typeof choiceKey !== 'string') {
      res.status(400).json({ error: 'choiceKey is required' });
      return;
    }
    if (!value || typeof value !== 'string') {
      res.status(400).json({ error: 'value is required' });
      return;
    }

    const mergedContext = {
      ...(context ?? {}),
      ...(weekNumber !== undefined ? { weekNumber } : {}),
    } as Prisma.InputJsonValue;

    const choice = await prisma.narrativeChoice.create({
      data: {
        pairId,
        choiceKey,
        value,
        context: mergedContext,
      },
    });

    res.json({ id: choice.id });
  } catch (err) {
    console.error('Narrative choice create error:', err);
    res.status(500).json({ error: 'Failed to save choice' });
  }
});

// GET /api/narrative-choices — list this pair's choices, optionally filtered by weekNumber.
router.get('/', requirePair, async (req: Request, res: Response) => {
  try {
    const pairId = getPairId(req)!;
    const weekNumberRaw = req.query.weekNumber;
    const weekNumber =
      typeof weekNumberRaw === 'string' ? parseInt(weekNumberRaw, 10) : undefined;

    const choices = await prisma.narrativeChoice.findMany({
      where: { pairId },
      orderBy: { createdAt: 'asc' },
    });

    const filtered =
      weekNumber !== undefined && !Number.isNaN(weekNumber)
        ? choices.filter(
            (c) =>
              (c.context as Record<string, unknown> | null)?.weekNumber === weekNumber,
          )
        : choices;

    res.json({
      choices: filtered.map((c) => ({
        id: c.id,
        choiceKey: c.choiceKey,
        value: c.value,
        context: c.context,
        createdAt: c.createdAt,
      })),
    });
  } catch (err) {
    console.error('Narrative choice list error:', err);
    res.status(500).json({ error: 'Failed to load choices' });
  }
});

export default router;
