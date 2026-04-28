import { Router } from 'express';
import { authenticate, requireRole, getPairId, getTeacherId } from '../middleware/auth';
import prisma from '../utils/prisma';
import { buildComplianceQuestions } from '../utils/complianceDistractors';
import { getWeekConfig } from '../data/week-configs';

const router = Router();
router.use(authenticate);

const PLACEMENT_VALUES = new Set(['shift_start', 'shift_end', 'after_task']);

async function teacherOwnsClass(teacherId: string, classId: string): Promise<boolean> {
  const cls = await prisma.class.findUnique({
    where: { id: classId },
    select: { teacherId: true },
  });
  return !!cls && cls.teacherId === teacherId;
}

async function teacherOwnsTemplate(teacherId: string, templateId: string): Promise<boolean> {
  const tpl = await prisma.complianceCheckTemplate.findUnique({
    where: { id: templateId },
    select: { class: { select: { teacherId: true } } },
  });
  return !!tpl && tpl.class.teacherId === teacherId;
}

function normalizeWords(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return Array.from(
    new Set(
      input
        .filter((w): w is string => typeof w === 'string')
        .map((w) => w.trim().toLowerCase())
        .filter((w) => w.length > 0),
    ),
  );
}

// ─── Teacher: Slot resolver (for Shifts tab) ────────────────────

router.get('/teacher/shifts/:weekNumber/slots', requireRole('teacher'), (req, res) => {
  const weekNumber = Number(req.params.weekNumber);
  const cfg = getWeekConfig(weekNumber);
  if (!cfg) {
    res.json({ weekNumber, tasks: [] });
    return;
  }
  const tasks = cfg.tasks.map((t) => ({
    id: t.id,
    type: t.type,
    label: t.label || t.id,
  }));
  res.json({ weekNumber, tasks });
});

// ─── Teacher: Template CRUD ─────────────────────────────────────

router.get('/templates', requireRole('teacher'), async (req, res) => {
  try {
    const teacherId = getTeacherId(req)!;
    const classId = typeof req.query.classId === 'string' ? req.query.classId : '';
    const weekFilter = req.query.weekNumber ? Number(req.query.weekNumber) : null;
    if (!classId) {
      res.status(400).json({ error: 'classId required' });
      return;
    }
    if (!(await teacherOwnsClass(teacherId, classId))) {
      res.status(403).json({ error: 'Not your class' });
      return;
    }
    const where: { classId: string; weekNumber?: number } = { classId };
    if (weekFilter && Number.isFinite(weekFilter)) where.weekNumber = weekFilter;
    const rows = await prisma.complianceCheckTemplate.findMany({
      where,
      orderBy: [{ weekNumber: 'asc' }, { placement: 'asc' }],
    });
    res.json({ templates: rows });
  } catch (err) {
    console.error('Compliance template list error:', err);
    res.status(500).json({ error: 'Failed to load templates' });
  }
});

router.post('/templates', requireRole('teacher'), async (req, res) => {
  try {
    const teacherId = getTeacherId(req)!;
    const classId = typeof req.body?.classId === 'string' ? req.body.classId : '';
    const weekNumber = Number(req.body?.weekNumber);
    const placement = typeof req.body?.placement === 'string' ? req.body.placement : '';
    const afterTaskId = typeof req.body?.afterTaskId === 'string' ? req.body.afterTaskId : null;
    const title = typeof req.body?.title === 'string' && req.body.title.trim() ? req.body.title.trim() : null;
    const words = normalizeWords(req.body?.words);
    const questionCount = Math.max(1, Math.min(5, Number(req.body?.questionCount) || 3));
    const cumulativeReviewCount = Math.max(0, Math.min(10, Number(req.body?.cumulativeReviewCount) ?? 2));

    if (!classId || !Number.isFinite(weekNumber) || !PLACEMENT_VALUES.has(placement)) {
      res.status(400).json({ error: 'classId, weekNumber, placement required' });
      return;
    }
    if (placement === 'after_task' && !afterTaskId) {
      res.status(400).json({ error: 'afterTaskId required when placement is after_task' });
      return;
    }
    if (words.length === 0) {
      res.status(400).json({ error: 'At least one word required' });
      return;
    }
    if (!(await teacherOwnsClass(teacherId, classId))) {
      res.status(403).json({ error: 'Not your class' });
      return;
    }

    try {
      const tpl = await prisma.complianceCheckTemplate.create({
        data: {
          classId,
          weekNumber,
          placement,
          afterTaskId,
          title,
          words: words as object,
          questionCount,
          cumulativeReviewCount,
          createdById: teacherId,
        },
      });
      res.json({ template: tpl });
    } catch (err) {
      if ((err as { code?: string })?.code === 'P2002') {
        res.status(409).json({ error: 'Template already exists for this slot — edit it instead' });
        return;
      }
      throw err;
    }
  } catch (err) {
    console.error('Compliance template create error:', err);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

router.put('/templates/:id', requireRole('teacher'), async (req, res) => {
  try {
    const teacherId = getTeacherId(req)!;
    const id = req.params.id as string;
    if (!(await teacherOwnsTemplate(teacherId, id))) {
      res.status(403).json({ error: 'Not your template' });
      return;
    }
    const data: {
      title?: string | null;
      words?: object;
      questionCount?: number;
      cumulativeReviewCount?: number;
    } = {};
    if ('title' in req.body) {
      data.title = typeof req.body.title === 'string' && req.body.title.trim() ? req.body.title.trim() : null;
    }
    if ('words' in req.body) {
      const words = normalizeWords(req.body.words);
      if (words.length === 0) {
        res.status(400).json({ error: 'At least one word required' });
        return;
      }
      data.words = words as object;
    }
    if ('questionCount' in req.body) {
      data.questionCount = Math.max(1, Math.min(5, Number(req.body.questionCount) || 3));
    }
    if ('cumulativeReviewCount' in req.body) {
      data.cumulativeReviewCount = Math.max(0, Math.min(10, Number(req.body.cumulativeReviewCount) || 0));
    }
    const tpl = await prisma.complianceCheckTemplate.update({ where: { id }, data });
    res.json({ template: tpl });
  } catch (err) {
    console.error('Compliance template update error:', err);
    res.status(500).json({ error: 'Failed to update template' });
  }
});

router.delete('/templates/:id', requireRole('teacher'), async (req, res) => {
  try {
    const teacherId = getTeacherId(req)!;
    const id = req.params.id as string;
    if (!(await teacherOwnsTemplate(teacherId, id))) {
      res.status(403).json({ error: 'Not your template' });
      return;
    }
    await prisma.complianceCheckTemplate.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    console.error('Compliance template delete error:', err);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

// ─── Student: Pending check fetch (cascade-driven) ──────────────

router.get('/pending', async (req, res) => {
  try {
    const pairId = getPairId(req);
    if (!pairId) {
      res.status(403).json({ error: 'Pair auth required' });
      return;
    }
    const weekNumber = Number(req.query.weekNumber);
    const placement = typeof req.query.placement === 'string' ? req.query.placement : '';
    const afterTaskId = typeof req.query.afterTaskId === 'string' ? req.query.afterTaskId : null;

    if (!Number.isFinite(weekNumber) || !PLACEMENT_VALUES.has(placement)) {
      res.status(400).json({ error: 'weekNumber + placement required' });
      return;
    }

    // Find the student's class enrollment(s) — pick the first one with a matching template.
    const enrollments = await prisma.classEnrollment.findMany({
      where: { pairId },
      select: { classId: true },
    });
    if (enrollments.length === 0) {
      res.json({ pending: null });
      return;
    }

    const template = await prisma.complianceCheckTemplate.findFirst({
      where: {
        classId: { in: enrollments.map((e) => e.classId) },
        weekNumber,
        placement,
        afterTaskId: placement === 'after_task' ? afterTaskId : null,
      },
    });
    if (!template) {
      res.json({ pending: null });
      return;
    }

    // One-shot: skip if this pair already completed this template
    const existing = await prisma.complianceCheckResult.findUnique({
      where: { pairId_templateId: { pairId, templateId: template.id } },
    });
    if (existing && existing.completedAt) {
      res.json({ pending: null });
      return;
    }

    const words = Array.isArray(template.words) ? (template.words as unknown[]).filter((w): w is string => typeof w === 'string') : [];
    const questions = await buildComplianceQuestions(words, template.questionCount);
    if (questions.length === 0) {
      res.json({ pending: null });
      return;
    }

    // Create or reuse the in-flight ComplianceCheckResult row so completion can update it
    const record = existing ?? await prisma.complianceCheckResult.create({
      data: {
        pairId,
        templateId: template.id,
        teacherId: template.createdById,
        classId: template.classId,
        weekIssued: template.weekNumber,
        questions: questions as object,
        totalCount: questions.length,
      },
    });

    res.json({
      pending: {
        checkId: record.id,
        templateId: template.id,
        weekIssued: template.weekNumber,
        title: template.title,
        questions,
      },
    });
  } catch (err) {
    console.error('Compliance pending fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch pending compliance check' });
  }
});

// ─── Student: Complete (records answers + mastery bump) ─────────

router.post('/complete', async (req, res) => {
  try {
    const pairId = getPairId(req);
    if (!pairId) {
      res.status(403).json({ error: 'Pair auth required' });
      return;
    }

    const checkId = req.body?.checkId;
    const words = req.body?.words;

    if (typeof checkId !== 'string' || !Array.isArray(words)) {
      res.status(400).json({ error: 'checkId and words[] required' });
      return;
    }

    const record = await prisma.complianceCheckResult.findUnique({ where: { id: checkId } });
    if (!record || record.pairId !== pairId) {
      res.status(404).json({ error: 'Check not found' });
      return;
    }
    if (record.completedAt) {
      res.json({ success: true, alreadyCompleted: true });
      return;
    }

    const correctWords = words
      .filter((w: unknown): w is { word: string; correct: boolean } =>
        !!w && typeof (w as { word?: unknown }).word === 'string' && (w as { correct?: unknown }).correct === true,
      )
      .map((w) => w.word.trim().toLowerCase())
      .filter((w) => w.length > 0);

    const correctCount = correctWords.length;

    const dictWords = correctWords.length
      ? await prisma.dictionaryWord.findMany({
          where: { word: { in: correctWords } },
          select: { id: true, word: true },
        })
      : [];

    let masteryUpdates = 0;
    await prisma.$transaction(async (tx) => {
      await tx.complianceCheckResult.update({
        where: { id: checkId },
        data: {
          results: words as object,
          correctCount,
          completedAt: new Date(),
        },
      });

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
          masteryUpdates++;
        }
      }
    });

    res.json({ success: true, checkId, correctCount, totalCount: record.totalCount, masteryUpdates });
  } catch (err) {
    console.error('Compliance check complete error:', err);
    res.status(500).json({ error: 'Failed to record compliance check' });
  }
});

// ─── Teacher: Results review ────────────────────────────────────

router.get('/teacher/classes/:classId/results', requireRole('teacher'), async (req, res) => {
  try {
    const teacherId = getTeacherId(req)!;
    const classId = req.params.classId as string;
    const weekFilter = req.query.weekNumber ? Number(req.query.weekNumber) : null;

    if (!(await teacherOwnsClass(teacherId, classId))) {
      res.status(403).json({ error: 'Not your class' });
      return;
    }

    const rows = await prisma.complianceCheckResult.findMany({
      where: {
        classId,
        ...(weekFilter && Number.isFinite(weekFilter) ? { weekIssued: weekFilter } : {}),
      },
      orderBy: { issuedAt: 'desc' },
      include: {
        pair: { select: { id: true, designation: true } },
      },
      take: 200,
    });

    res.json({
      classId,
      weekFilter,
      results: rows.map((r) => ({
        checkId: r.id,
        pairId: r.pairId,
        designation: r.pair?.designation ?? null,
        weekIssued: r.weekIssued,
        templateId: r.templateId,
        totalCount: r.totalCount,
        correctCount: r.correctCount,
        issuedAt: r.issuedAt,
        completedAt: r.completedAt,
      })),
    });
  } catch (err) {
    console.error('Compliance check results error:', err);
    res.status(500).json({ error: 'Failed to fetch compliance check results' });
  }
});

export default router;
