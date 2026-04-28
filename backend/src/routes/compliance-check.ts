import { Router } from 'express';
import { authenticate, requireRole, getPairId, getTeacherId } from '../middleware/auth';
import prisma from '../utils/prisma';
import { io } from '../socketServer';
import { buildComplianceQuestions } from '../utils/complianceDistractors';

const router = Router();
router.use(authenticate);

async function teacherOwnsPair(teacherId: string, pairId: string): Promise<boolean> {
  const classes = await prisma.class.findMany({
    where: { teacherId },
    select: { id: true },
  });
  if (classes.length === 0) return false;
  const enrollment = await prisma.classEnrollment.findFirst({
    where: { pairId, classId: { in: classes.map((c) => c.id) } },
  });
  return !!enrollment;
}

async function teacherOwnsClass(teacherId: string, classId: string): Promise<boolean> {
  const cls = await prisma.class.findUnique({
    where: { id: classId },
    select: { teacherId: true },
  });
  return !!cls && cls.teacherId === teacherId;
}

/**
 * POST /api/compliance-check/teacher/students/:studentId/issue
 * Teacher issues a Compliance Check to one student.
 * Body: { weekNumber, questionCount }
 */
router.post('/teacher/students/:studentId/issue', requireRole('teacher'), async (req, res) => {
  try {
    const teacherId = getTeacherId(req)!;
    const pairId = req.params.studentId as string;
    const weekNumber = Number(req.body?.weekNumber);
    const questionCount = Math.max(1, Math.min(5, Number(req.body?.questionCount) || 3));

    if (!Number.isFinite(weekNumber) || weekNumber < 1) {
      res.status(400).json({ error: 'weekNumber required' });
      return;
    }

    if (!(await teacherOwnsPair(teacherId, pairId))) {
      res.status(403).json({ error: 'Not your student' });
      return;
    }

    const questions = await buildComplianceQuestions(weekNumber, questionCount);
    if (questions.length === 0) {
      res.status(400).json({ error: 'No vocabulary available for that week' });
      return;
    }

    const enrollment = await prisma.classEnrollment.findFirst({
      where: { pairId, class: { teacherId } },
      select: { classId: true },
    });

    const record = await prisma.complianceCheckResult.create({
      data: {
        pairId,
        teacherId,
        classId: enrollment?.classId ?? null,
        weekIssued: weekNumber,
        questions: questions as object,
        totalCount: questions.length,
      },
    });

    io.to(`student:${pairId}`).emit('compliance-check:issued', {
      checkId: record.id,
      weekIssued: weekNumber,
      questions,
    });

    res.json({ success: true, checkId: record.id, totalCount: questions.length });
  } catch (err) {
    console.error('Compliance check issue error:', err);
    res.status(500).json({ error: 'Failed to issue compliance check' });
  }
});

/**
 * POST /api/compliance-check/teacher/classes/:classId/issue
 * Teacher issues a Compliance Check to ALL students in a class.
 * Body: { weekNumber, questionCount }
 */
router.post('/teacher/classes/:classId/issue', requireRole('teacher'), async (req, res) => {
  try {
    const teacherId = getTeacherId(req)!;
    const classId = req.params.classId as string;
    const weekNumber = Number(req.body?.weekNumber);
    const questionCount = Math.max(1, Math.min(5, Number(req.body?.questionCount) || 3));

    if (!Number.isFinite(weekNumber) || weekNumber < 1) {
      res.status(400).json({ error: 'weekNumber required' });
      return;
    }

    if (!(await teacherOwnsClass(teacherId, classId))) {
      res.status(403).json({ error: 'Not your class' });
      return;
    }

    const enrollments = await prisma.classEnrollment.findMany({
      where: { classId, pairId: { not: null } },
      select: { pairId: true },
    });

    if (enrollments.length === 0) {
      res.status(400).json({ error: 'No students in class' });
      return;
    }

    let issued = 0;
    for (const enr of enrollments) {
      if (!enr.pairId) continue;
      const questions = await buildComplianceQuestions(weekNumber, questionCount);
      if (questions.length === 0) continue;

      const record = await prisma.complianceCheckResult.create({
        data: {
          pairId: enr.pairId,
          teacherId,
          classId,
          weekIssued: weekNumber,
          questions: questions as object,
          totalCount: questions.length,
        },
      });

      io.to(`student:${enr.pairId}`).emit('compliance-check:issued', {
        checkId: record.id,
        weekIssued: weekNumber,
        questions,
      });
      issued++;
    }

    res.json({ success: true, issued, classId, weekNumber });
  } catch (err) {
    console.error('Compliance check class-issue error:', err);
    res.status(500).json({ error: 'Failed to issue compliance check to class' });
  }
});

/**
 * POST /api/compliance-check/complete
 * Student submits results for a previously-issued check.
 * Body: { checkId, words: [{ word, correct }] }
 */
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

    if (record.classId) {
      io.to(`class:${record.classId}`).emit('compliance-check:completed', {
        checkId,
        pairId,
        weekIssued: record.weekIssued,
        correctCount,
        totalCount: record.totalCount,
      });
    }

    res.json({ success: true, checkId, correctCount, totalCount: record.totalCount, masteryUpdates });
  } catch (err) {
    console.error('Compliance check complete error:', err);
    res.status(500).json({ error: 'Failed to record compliance check' });
  }
});

/**
 * GET /api/compliance-check/teacher/classes/:classId/results
 * Teacher result review. Optional ?weekNumber=N filter.
 */
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
