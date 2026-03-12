import { Router, Request, Response } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import prisma from '../utils/prisma';
import { io } from '../socketServer';

const router = Router();

// Characters for join code (no O/0/I/1 ambiguity)
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateJoinCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

async function uniqueJoinCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateJoinCode();
    const existing = await prisma.class.findUnique({ where: { joinCode: code } });
    if (!existing) return code;
  }
  throw new Error('Failed to generate unique join code');
}

// GET /api/classes/validate/:code — Public: validate a join code exists
router.get('/validate/:code', async (req: Request, res: Response) => {
  try {
    const code = (req.params.code as string).toUpperCase().trim();
    const cls = await prisma.class.findUnique({
      where: { joinCode: code },
      select: { id: true, name: true, isActive: true },
    });

    if (!cls || !cls.isActive) {
      res.json({ valid: false });
      return;
    }

    res.json({ valid: true, classId: cls.id, className: cls.name });
  } catch (err) {
    console.error('Validate code error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// All remaining routes require teacher auth
router.use(authenticate, requireRole('teacher'));

// POST /api/classes — Create a new class
router.post('/', async (req: Request, res: Response) => {
  try {
    const teacherId = req.user!.userId;
    const { name } = req.body as { name?: string };

    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ error: 'Class name is required' });
      return;
    }

    const joinCode = await uniqueJoinCode();

    const cls = await prisma.class.create({
      data: {
        name: name.trim(),
        joinCode,
        teacherId,
      },
    });

    // Auto-unlock week 1
    const week1 = await prisma.week.findFirst({
      where: { weekNumber: 1 },
    });
    if (week1) {
      await prisma.classWeekUnlock.create({
        data: { classId: cls.id, weekId: week1.id },
      });
    }

    res.status(201).json({
      id: cls.id,
      name: cls.name,
      joinCode: cls.joinCode,
      isActive: cls.isActive,
      createdAt: cls.createdAt,
    });
  } catch (err) {
    console.error('Create class error:', err);
    res.status(500).json({ error: 'Failed to create class' });
  }
});

// GET /api/classes — List teacher's classes
router.get('/', async (req: Request, res: Response) => {
  try {
    const teacherId = req.user!.userId;
    const classes = await prisma.class.findMany({
      where: { teacherId },
      include: {
        _count: { select: { enrollments: true } },
        weekUnlocks: { select: { weekId: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json({
      classes: classes.map((c) => ({
        id: c.id,
        name: c.name,
        joinCode: c.joinCode,
        isActive: c.isActive,
        harmonyOpen: c.harmonyOpen,
        studentCount: c._count.enrollments,
        unlockedWeekIds: c.weekUnlocks.map((u) => u.weekId),
        createdAt: c.createdAt,
      })),
    });
  } catch (err) {
    console.error('List classes error:', err);
    res.status(500).json({ error: 'Failed to list classes' });
  }
});

// GET /api/classes/:classId — Class detail with enrolled students (pairs + legacy)
router.get('/:classId', async (req: Request, res: Response) => {
  try {
    const classId = req.params.classId as string;
    const teacherId = req.user!.userId;
    const cls = await prisma.class.findUnique({
      where: { id: classId, teacherId },
      include: {
        enrollments: {
          include: {
            user: {
              select: {
                id: true,
                designation: true,
                displayName: true,
                lane: true,
                xp: true,
                streak: true,
                lastLoginAt: true,
              },
            },
            pair: {
              select: {
                id: true,
                designation: true,
                studentAName: true,
                studentBName: true,
                lane: true,
                xp: true,
                lastLoginAt: true,
              },
            },
          },
          orderBy: { enrolledAt: 'asc' },
        },
        weekUnlocks: {
          include: { week: { select: { id: true, weekNumber: true, title: true } } },
          orderBy: { unlockedAt: 'asc' },
        },
      },
    });

    if (!cls) {
      res.status(404).json({ error: 'Class not found' });
      return;
    }

    const students = cls.enrollments.map((e) => {
      if (e.pair) {
        return {
          id: e.pair.id,
          designation: e.pair.designation,
          displayName: `${e.pair.studentAName}${e.pair.studentBName ? ` & ${e.pair.studentBName}` : ''}`,
          lane: e.pair.lane,
          xp: e.pair.xp,
          lastLoginAt: e.pair.lastLoginAt,
          enrolledAt: e.enrolledAt,
          isPair: true,
        };
      }
      return {
        ...e.user,
        enrolledAt: e.enrolledAt,
        isPair: false,
      };
    });

    res.json({
      id: cls.id,
      name: cls.name,
      joinCode: cls.joinCode,
      isActive: cls.isActive,
      createdAt: cls.createdAt,
      students,
      unlockedWeeks: cls.weekUnlocks.map((u) => ({
        weekId: u.week.id,
        weekNumber: u.week.weekNumber,
        title: u.week.title,
        unlockedAt: u.unlockedAt,
      })),
    });
  } catch (err) {
    console.error('Class detail error:', err);
    res.status(500).json({ error: 'Failed to fetch class details' });
  }
});

// PATCH /api/classes/:classId — Update name or active status
router.patch('/:classId', async (req: Request, res: Response) => {
  try {
    const classId = req.params.classId as string;
    const teacherId = req.user!.userId;
    const { name, isActive } = req.body as { name?: string; isActive?: boolean };

    // Verify ownership
    const existing = await prisma.class.findUnique({ where: { id: classId } });
    if (!existing || existing.teacherId !== teacherId) {
      res.status(404).json({ error: 'Class not found' });
      return;
    }

    const updates: Record<string, unknown> = {};
    if (typeof name === 'string' && name.trim()) updates.name = name.trim();
    if (typeof isActive === 'boolean') updates.isActive = isActive;

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: 'No valid fields to update' });
      return;
    }

    const cls = await prisma.class.update({
      where: { id: classId },
      data: updates,
    });

    res.json({
      id: cls.id,
      name: cls.name,
      joinCode: cls.joinCode,
      isActive: cls.isActive,
    });
  } catch (err) {
    console.error('Update class error:', err);
    res.status(500).json({ error: 'Failed to update class' });
  }
});

// DELETE /api/classes/:classId — Delete a class and all associated data
router.delete('/:classId', async (req: Request, res: Response) => {
  try {
    const classId = req.params.classId as string;
    const teacherId = req.user!.userId;

    // Verify ownership
    const existing = await prisma.class.findUnique({ where: { id: classId } });
    if (!existing || existing.teacherId !== teacherId) {
      res.status(404).json({ error: 'Class not found' });
      return;
    }

    // Cascade delete in transaction
    await prisma.$transaction([
      prisma.classWeekUnlock.deleteMany({ where: { classId } }),
      prisma.harmonyPost.deleteMany({ where: { classId } }),
      prisma.classEnrollment.deleteMany({ where: { classId } }),
      prisma.class.delete({ where: { id: classId } }),
    ]);

    res.json({ deleted: true });
  } catch (err) {
    console.error('Delete class error:', err);
    res.status(500).json({ error: 'Failed to delete class' });
  }
});

// DELETE /api/classes/:classId/students/:studentId — Remove a student from a class
router.delete('/:classId/students/:studentId', async (req: Request, res: Response) => {
  try {
    const classId = req.params.classId as string;
    const studentId = req.params.studentId as string;
    const teacherId = req.user!.userId;

    // Verify ownership
    const cls = await prisma.class.findUnique({ where: { id: classId } });
    if (!cls || cls.teacherId !== teacherId) {
      res.status(404).json({ error: 'Class not found' });
      return;
    }

    // Find enrollment by pairId or userId
    const enrollment = await prisma.classEnrollment.findFirst({
      where: {
        classId,
        OR: [{ pairId: studentId }, { userId: studentId }],
      },
    });

    if (!enrollment) {
      res.status(404).json({ error: 'Student not found in this class' });
      return;
    }

    await prisma.classEnrollment.delete({ where: { id: enrollment.id } });

    res.json({ deleted: true });
  } catch (err) {
    console.error('Remove student error:', err);
    res.status(500).json({ error: 'Failed to remove student' });
  }
});

// POST /api/classes/:classId/regenerate-code — Generate new join code
router.post('/:classId/regenerate-code', async (req: Request, res: Response) => {
  try {
    const classId = req.params.classId as string;
    const teacherId = req.user!.userId;

    // Verify ownership
    const existing = await prisma.class.findUnique({ where: { id: classId } });
    if (!existing || existing.teacherId !== teacherId) {
      res.status(404).json({ error: 'Class not found' });
      return;
    }

    const joinCode = await uniqueJoinCode();

    const cls = await prisma.class.update({
      where: { id: classId },
      data: { joinCode },
    });

    res.json({ id: cls.id, joinCode: cls.joinCode });
  } catch (err) {
    console.error('Regenerate code error:', err);
    res.status(500).json({ error: 'Failed to regenerate join code' });
  }
});

// POST /api/classes/:classId/unlock-week — Unlock a week for this class
router.post('/:classId/unlock-week', async (req: Request, res: Response) => {
  try {
    const classId = req.params.classId as string;
    const teacherId = req.user!.userId;
    const { weekId } = req.body as { weekId?: string };

    // Verify ownership
    const cls = await prisma.class.findUnique({ where: { id: classId } });
    if (!cls || cls.teacherId !== teacherId) {
      res.status(404).json({ error: 'Class not found' });
      return;
    }

    if (!weekId) {
      res.status(400).json({ error: 'weekId is required' });
      return;
    }

    // Verify week exists
    const week = await prisma.week.findUnique({ where: { id: weekId } });
    if (!week) {
      res.status(404).json({ error: 'Week not found' });
      return;
    }

    const unlock = await prisma.classWeekUnlock.upsert({
      where: { classId_weekId: { classId, weekId } },
      update: {},
      create: { classId, weekId },
    });

    res.status(201).json({
      classId,
      weekId,
      unlockedAt: unlock.unlockedAt,
    });
  } catch (err) {
    console.error('Unlock week error:', err);
    res.status(500).json({ error: 'Failed to unlock week' });
  }
});

// DELETE /api/classes/:classId/unlock-week/:weekId — Lock a week
router.delete('/:classId/unlock-week/:weekId', async (req: Request, res: Response) => {
  try {
    const classId = req.params.classId as string;
    const teacherId = req.user!.userId;
    const weekId = req.params.weekId as string;

    // Verify ownership
    const cls = await prisma.class.findUnique({ where: { id: classId } });
    if (!cls || cls.teacherId !== teacherId) {
      res.status(404).json({ error: 'Class not found' });
      return;
    }

    await prisma.classWeekUnlock.deleteMany({
      where: { classId, weekId },
    });

    res.json({ classId, weekId, locked: true });
  } catch (err) {
    console.error('Lock week error:', err);
    res.status(500).json({ error: 'Failed to lock week' });
  }
});

// GET /api/classes/:classId/unlocked-weeks — List unlocked week IDs
router.get('/:classId/unlocked-weeks', async (req: Request, res: Response) => {
  try {
    const classId = req.params.classId as string;
    const teacherId = req.user!.userId;

    // Verify ownership
    const cls = await prisma.class.findUnique({ where: { id: classId } });
    if (!cls || cls.teacherId !== teacherId) {
      res.status(404).json({ error: 'Class not found' });
      return;
    }

    const unlocks = await prisma.classWeekUnlock.findMany({
      where: { classId },
      include: { week: { select: { id: true, weekNumber: true, title: true } } },
      orderBy: { unlockedAt: 'asc' },
    });

    res.json({
      classId,
      weeks: unlocks.map((u) => ({
        weekId: u.week.id,
        weekNumber: u.week.weekNumber,
        title: u.week.title,
        unlockedAt: u.unlockedAt,
      })),
    });
  } catch (err) {
    console.error('List unlocked weeks error:', err);
    res.status(500).json({ error: 'Failed to list unlocked weeks' });
  }
});

// PATCH /api/classes/:classId/harmony — Toggle Harmony open/closed for a class
router.patch('/:classId/harmony', async (req: Request, res: Response) => {
  try {
    const classId = req.params.classId as string;
    const teacherId = req.user!.userId;
    const { open } = req.body as { open?: boolean };

    if (typeof open !== 'boolean') {
      res.status(400).json({ error: 'open (boolean) is required' });
      return;
    }

    const cls = await prisma.class.findUnique({ where: { id: classId } });
    if (!cls || cls.teacherId !== teacherId) {
      res.status(404).json({ error: 'Class not found' });
      return;
    }

    const updated = await prisma.class.update({
      where: { id: classId },
      data: { harmonyOpen: open },
    });

    res.json({ classId, harmonyOpen: updated.harmonyOpen });
  } catch (err) {
    console.error('Toggle harmony error:', err);
    res.status(500).json({ error: 'Failed to toggle Harmony' });
  }
});

// GET /api/classes/:classId/weeks/:weekId/task-gate — Read current gates
router.get('/:classId/weeks/:weekId/task-gate', async (req: Request, res: Response) => {
  try {
    const classId = req.params.classId as string;
    const weekId = req.params.weekId as string;
    const teacherId = req.user!.userId;

    const cls = await prisma.class.findUnique({ where: { id: classId } });
    if (!cls || cls.teacherId !== teacherId) {
      res.status(404).json({ error: 'Class not found' });
      return;
    }

    const unlock = await prisma.classWeekUnlock.findUnique({
      where: { classId_weekId: { classId, weekId } },
      select: { taskGates: true },
    });

    res.json({ taskGates: unlock?.taskGates ?? [] });
  } catch (err) {
    console.error('Get task gate error:', err);
    res.status(500).json({ error: 'Failed to get task gate' });
  }
});

// PATCH /api/classes/:classId/weeks/:weekId/task-gate — Set gates (array of positions)
router.patch('/:classId/weeks/:weekId/task-gate', async (req: Request, res: Response) => {
  try {
    const classId = req.params.classId as string;
    const weekId = req.params.weekId as string;
    const teacherId = req.user!.userId;
    const { taskGates } = req.body as { taskGates: number[] };

    if (!Array.isArray(taskGates) || taskGates.some(g => typeof g !== 'number' || g < 0)) {
      res.status(400).json({ error: 'taskGates must be an array of non-negative integers' });
      return;
    }

    const cls = await prisma.class.findUnique({ where: { id: classId } });
    if (!cls || cls.teacherId !== teacherId) {
      res.status(404).json({ error: 'Class not found' });
      return;
    }

    const unlock = await prisma.classWeekUnlock.findUnique({
      where: { classId_weekId: { classId, weekId } },
    });
    if (!unlock) {
      res.status(404).json({ error: 'Week not unlocked for this class' });
      return;
    }

    // Dedupe and sort
    const sorted = [...new Set(taskGates)].sort((a, b) => a - b);

    await prisma.classWeekUnlock.update({
      where: { classId_weekId: { classId, weekId } },
      data: { taskGates: sorted },
    });

    // Broadcast to all students in the class — single emit to the room, O(1)
    if (io) {
      io.to(`class:${classId}`).emit('session:gate-updated', { weekId, taskGates: sorted });
    }

    res.json({ classId, weekId, taskGates: sorted });
  } catch (err) {
    console.error('Set task gate error:', err);
    res.status(500).json({ error: 'Failed to set task gate' });
  }
});

export default router;
