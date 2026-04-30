import { Router } from 'express';
import { authenticate, getPairId } from '../middleware/auth';
import prisma from '../utils/prisma';
import { buildComplianceQuestions } from '../utils/complianceDistractors';
import { io } from '../socketServer';

const router = Router();
router.use(authenticate);

const TRIGGER_REASONS = new Set(['rate_warned', 'rate_double', 'absolute_3']);

const COOLDOWN_BY_CORRECT = [0, 0.5, 1.0, 1.5] as const;

const DEBOUNCE_BY_PRIOR_COUNT_SECS = [0, 90, 60, 30, 0] as const;

function debounceSecondsForPriorCount(priorCompletedCount: number): number {
  if (priorCompletedCount < DEBOUNCE_BY_PRIOR_COUNT_SECS.length) {
    return DEBOUNCE_BY_PRIOR_COUNT_SECS[priorCompletedCount]!;
  }
  return 0;
}

async function pickRemediationWords(pairId: string, weekNumber: number): Promise<string[]> {
  const progress = await prisma.pairDictionaryProgress.findMany({
    where: {
      pairId,
      mastery: { lt: 0.6 },
      word: { weekIntroduced: { lte: weekNumber } },
    },
    include: { word: { select: { word: true } } },
    orderBy: [{ mastery: 'asc' }, { lastSeenAt: 'asc' }],
    take: 30,
  });

  const candidateWords: string[] = [];
  for (const p of progress) {
    const w = p.word?.word?.toLowerCase().trim();
    if (w && !candidateWords.includes(w)) candidateWords.push(w);
  }

  if (candidateWords.length < 5) {
    const fallback = await prisma.dictionaryWord.findMany({
      where: { weekIntroduced: { lte: weekNumber } },
      select: { word: true },
      take: 30,
    });
    for (const row of fallback) {
      const w = row.word.toLowerCase().trim();
      if (w && !candidateWords.includes(w)) candidateWords.push(w);
    }
  }

  return candidateWords;
}

// ─── Student: Trigger remediation ────────────────────────────────

router.post('/trigger', async (req, res) => {
  try {
    const pairId = getPairId(req);
    if (!pairId) {
      res.status(403).json({ error: 'Pair auth required' });
      return;
    }

    const weekNumber = Number(req.body?.weekNumber);
    const triggerReason = typeof req.body?.triggerReason === 'string' ? req.body.triggerReason : '';

    if (!Number.isFinite(weekNumber) || !TRIGGER_REASONS.has(triggerReason)) {
      res.status(400).json({ error: 'weekNumber and valid triggerReason required' });
      return;
    }

    // Refresh restoration: if there's an open row for this pair (any week), return it.
    const open = await prisma.remediationModuleResult.findFirst({
      where: { pairId, completedAt: null },
      orderBy: { triggeredAt: 'desc' },
    });
    if (open) {
      res.json({
        moduleId: open.id,
        weekNumber: open.weekNumber,
        questions: open.questions,
        triggerReason: open.triggerReason,
        resumed: true,
      });
      return;
    }

    // Debounce: count completed remediations this pair this shift, find the most recent.
    const priorCompleted = await prisma.remediationModuleResult.findMany({
      where: { pairId, weekNumber, completedAt: { not: null } },
      orderBy: { completedAt: 'desc' },
      take: 5,
    });
    const debounceSecs = debounceSecondsForPriorCount(priorCompleted.length);
    if (debounceSecs > 0 && priorCompleted[0]?.completedAt) {
      const elapsedMs = Date.now() - priorCompleted[0].completedAt.getTime();
      if (elapsedMs < debounceSecs * 1000) {
        const retryInSeconds = Math.ceil((debounceSecs * 1000 - elapsedMs) / 1000);
        res.json({ debounced: true, retryInSeconds });
        return;
      }
    }

    const candidateWords = await pickRemediationWords(pairId, weekNumber);
    const questions = await buildComplianceQuestions(candidateWords, 3);
    if (questions.length === 0) {
      res.json({ debounced: false, noQuestionsAvailable: true });
      return;
    }

    const pair = await prisma.pair.findUnique({
      where: { id: pairId },
      select: { concernScore: true, designation: true },
    });
    const concernAtTrigger = pair?.concernScore ?? 0;

    const row = await prisma.remediationModuleResult.create({
      data: {
        pairId,
        weekNumber,
        triggerReason,
        concernAtTrigger,
        questions: questions as object,
        totalCount: questions.length,
      },
    });

    io.to('teacher').emit('student:remediation-fired', {
      pairId,
      designation: pair?.designation ?? null,
      moduleId: row.id,
      weekNumber,
      triggerReason,
      concernAtTrigger,
      triggeredAt: row.triggeredAt,
    });

    res.json({
      moduleId: row.id,
      weekNumber,
      questions,
      triggerReason,
      resumed: false,
    });
  } catch (err) {
    console.error('Remediation trigger error:', err);
    res.status(500).json({ error: 'Failed to trigger remediation' });
  }
});

// ─── Student: Complete remediation ───────────────────────────────

router.post('/:id/complete', async (req, res) => {
  try {
    const pairId = getPairId(req);
    if (!pairId) {
      res.status(403).json({ error: 'Pair auth required' });
      return;
    }
    const id = req.params.id as string;
    const correctCountRaw = Number(req.body?.correctCount);

    if (!Number.isFinite(correctCountRaw) || correctCountRaw < 0 || correctCountRaw > 3) {
      res.status(400).json({ error: 'correctCount must be 0-3' });
      return;
    }
    const correctCount = Math.floor(correctCountRaw);
    const results: unknown[] = Array.isArray(req.body?.results)
      ? (req.body.results as unknown[])
      : [];

    const row = await prisma.remediationModuleResult.findUnique({ where: { id } });
    if (!row || row.pairId !== pairId) {
      res.status(404).json({ error: 'Remediation not found' });
      return;
    }
    if (row.completedAt) {
      res.json({
        success: true,
        alreadyCompleted: true,
        newConcernScore: row.concernAfterCooldown ?? null,
        cooldownApplied: 0,
      });
      return;
    }

    const cooldownApplied = COOLDOWN_BY_CORRECT[correctCount] ?? 0;

    const correctWords = results
      .filter((r: unknown): r is { word: string; correct: boolean } =>
        !!r &&
        typeof (r as { word?: unknown }).word === 'string' &&
        (r as { correct?: unknown }).correct === true,
      )
      .map((r) => r.word.trim().toLowerCase())
      .filter((w) => w.length > 0);

    const dictWords = correctWords.length
      ? await prisma.dictionaryWord.findMany({
          where: { word: { in: correctWords } },
          select: { id: true, word: true },
        })
      : [];

    const updated = await prisma.$transaction(async (tx) => {
      const pair = await tx.pair.findUnique({
        where: { id: pairId },
        select: { concernScore: true, designation: true },
      });
      const currentScore = pair?.concernScore ?? 0;
      const newScore = Math.max(0, currentScore - cooldownApplied);

      await tx.pair.update({
        where: { id: pairId },
        data: { concernScore: newScore },
      });

      await tx.remediationModuleResult.update({
        where: { id },
        data: {
          completedAt: new Date(),
          correctCount,
          concernAfterCooldown: newScore,
          results: results as object,
        },
      });

      // Bump dictionary mastery +0.03 per correct word (mirrors clarity-check pattern)
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
        }
      }

      return { newScore, designation: pair?.designation ?? null };
    });

    io.to('teacher').emit('student:remediation-completed', {
      pairId,
      designation: updated.designation,
      moduleId: id,
      weekNumber: row.weekNumber,
      correctCount,
      totalCount: row.totalCount,
      cooldownApplied,
      newConcernScore: updated.newScore,
      completedAt: new Date(),
    });

    res.json({
      success: true,
      newConcernScore: updated.newScore,
      cooldownApplied,
      correctCount,
      totalCount: row.totalCount,
    });
  } catch (err) {
    console.error('Remediation complete error:', err);
    res.status(500).json({ error: 'Failed to complete remediation' });
  }
});

// ─── Student: Clawback (called when grinding resumes within 60s of close) ─

router.post('/:id/clawback', async (req, res) => {
  try {
    const pairId = getPairId(req);
    if (!pairId) {
      res.status(403).json({ error: 'Pair auth required' });
      return;
    }
    const id = req.params.id as string;

    const row = await prisma.remediationModuleResult.findUnique({ where: { id } });
    if (!row || row.pairId !== pairId) {
      res.status(404).json({ error: 'Remediation not found' });
      return;
    }
    if (!row.completedAt) {
      res.status(400).json({ error: 'Cannot clawback an incomplete remediation' });
      return;
    }
    if (row.clawedBack) {
      res.json({
        success: true,
        alreadyClawedBack: true,
        newConcernScore: null,
        restoredAmount: 0,
      });
      return;
    }

    const restoredAmount = COOLDOWN_BY_CORRECT[row.correctCount ?? 0] ?? 0;
    if (restoredAmount === 0) {
      // Nothing was cooled down (0/3). Mark clawed-back for telemetry, no score change.
      await prisma.remediationModuleResult.update({
        where: { id },
        data: { clawedBack: true },
      });
      res.json({ success: true, newConcernScore: null, restoredAmount: 0 });
      return;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const pair = await tx.pair.findUnique({
        where: { id: pairId },
        select: { concernScore: true, designation: true },
      });
      const currentScore = pair?.concernScore ?? 0;
      const newScore = currentScore + restoredAmount;

      await tx.pair.update({
        where: { id: pairId },
        data: { concernScore: newScore },
      });
      await tx.remediationModuleResult.update({
        where: { id },
        data: { clawedBack: true },
      });

      return { newScore, designation: pair?.designation ?? null };
    });

    io.to('teacher').emit('student:remediation-clawback', {
      pairId,
      designation: updated.designation,
      moduleId: id,
      weekNumber: row.weekNumber,
      restoredAmount,
      newConcernScore: updated.newScore,
    });

    res.json({
      success: true,
      newConcernScore: updated.newScore,
      restoredAmount,
    });
  } catch (err) {
    console.error('Remediation clawback error:', err);
    res.status(500).json({ error: 'Failed to clawback remediation' });
  }
});

// ─── Student: Refresh-safe pending fetch ─────────────────────────

router.get('/pending', async (req, res) => {
  try {
    const pairId = getPairId(req);
    if (!pairId) {
      res.status(403).json({ error: 'Pair auth required' });
      return;
    }

    const open = await prisma.remediationModuleResult.findFirst({
      where: { pairId, completedAt: null },
      orderBy: { triggeredAt: 'desc' },
    });

    if (!open) {
      res.json({ pending: null });
      return;
    }

    res.json({
      pending: {
        moduleId: open.id,
        weekNumber: open.weekNumber,
        triggerReason: open.triggerReason,
        questions: open.questions,
        totalCount: open.totalCount,
        triggeredAt: open.triggeredAt,
      },
    });
  } catch (err) {
    console.error('Remediation pending fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch pending remediation' });
  }
});

export default router;
