import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../utils/prisma';
import { signToken } from '../utils/jwt';
import { authenticate } from '../middleware/auth';

const router = Router();

const configuredSameSite = (process.env.COOKIE_SAMESITE || (process.env.NODE_ENV === 'production' ? 'none' : 'lax')).toLowerCase();
const sameSite: 'lax' | 'strict' | 'none' = configuredSameSite === 'strict'
  ? 'strict'
  : configuredSameSite === 'none'
    ? 'none'
    : 'lax';
const secureCookie = process.env.NODE_ENV === 'production' || sameSite === 'none';

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  const { designation, pin, username, password } = req.body;

  try {
    let user;

    if (designation && pin) {
      // Student login via designation + pin
      user = await prisma.user.findUnique({ where: { designation } });
      if (!user || !user.pin) {
        res.status(401).json({ error: 'Invalid designation or PIN' });
        return;
      }
      const valid = await bcrypt.compare(pin, user.pin);
      if (!valid) {
        res.status(401).json({ error: 'Invalid designation or PIN' });
        return;
      }
    } else if (username && password) {
      // Teacher login via username + password
      user = await prisma.user.findUnique({ where: { username } });
      if (!user || !user.passwordHash) {
        res.status(401).json({ error: 'Invalid username or password' });
        return;
      }
      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        res.status(401).json({ error: 'Invalid username or password' });
        return;
      }
    } else {
      res.status(400).json({ error: 'Provide designation+pin or username+password' });
      return;
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const token = signToken({ userId: user.id, role: user.role });

    res.cookie('token', token, {
      httpOnly: true,
      secure: secureCookie,
      sameSite,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Fetch class enrollment for students
    let classId: string | null = null;
    let className: string | null = null;
    if (user.role === 'student') {
      const enrollment = await prisma.classEnrollment.findFirst({
        where: { userId: user.id },
        include: { class: { select: { id: true, name: true } } },
      });
      if (enrollment) {
        classId = enrollment.class.id;
        className = enrollment.class.name;
      }
    }

    res.json({
      user: {
        id: user.id,
        displayName: user.displayName,
        designation: user.designation,
        role: user.role,
        lane: user.lane,
        xp: user.xp,
        streak: user.streak,
        classId,
        className,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/register — student self-registration
router.post('/register', async (req: Request, res: Response) => {
  const { studentNumber, pin, displayName, classCode } = req.body as {
    studentNumber?: string;
    pin?: string;
    displayName?: string;
    classCode?: string;
  };

  if (!classCode || typeof classCode !== 'string' || !classCode.trim()) {
    res.status(400).json({ error: 'Class code is required' });
    return;
  }

  if (!studentNumber || typeof studentNumber !== 'string' || !studentNumber.trim()) {
    res.status(400).json({ error: 'Student number is required' });
    return;
  }

  if (!pin || typeof pin !== 'string' || !/^\d{4,8}$/.test(pin)) {
    res.status(400).json({ error: 'PIN must be 4-8 digits' });
    return;
  }

  const designation = studentNumber.trim().toUpperCase();
  const code = classCode.trim().toUpperCase();

  try {
    // Validate class code
    const cls = await prisma.class.findUnique({ where: { joinCode: code } });
    if (!cls || !cls.isActive) {
      res.status(400).json({ error: 'Invalid class code' });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { designation } });
    if (existing) {
      res.status(409).json({ error: 'Student number already registered' });
      return;
    }

    const pinHash = await bcrypt.hash(pin, 10);
    const user = await prisma.user.create({
      data: {
        designation,
        pin: pinHash,
        displayName: (displayName && displayName.trim()) || `Citizen ${designation}`,
        role: 'student',
        lane: 1,
      },
    });

    // Enroll in class
    await prisma.classEnrollment.create({
      data: { userId: user.id, classId: cls.id },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const token = signToken({ userId: user.id, role: user.role });

    res.cookie('token', token, {
      httpOnly: true,
      secure: secureCookie,
      sameSite,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
      user: {
        id: user.id,
        displayName: user.displayName,
        designation: user.designation,
        role: user.role,
        lane: user.lane,
        xp: user.xp,
        streak: user.streak,
        classId: cls.id,
        className: cls.name,
      },
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/logout
router.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: secureCookie,
    sameSite,
  });
  res.json({ message: 'Logged out' });
});

// GET /api/auth/me
router.get('/me', authenticate, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true,
        displayName: true,
        designation: true,
        username: true,
        role: true,
        lane: true,
        xp: true,
        streak: true,
        lastLoginAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Add class info based on role
    if (user.role === 'student') {
      const enrollment = await prisma.classEnrollment.findFirst({
        where: { userId: user.id },
        include: { class: { select: { id: true, name: true } } },
      });
      res.json({
        user: {
          ...user,
          classId: enrollment?.class.id ?? null,
          className: enrollment?.class.name ?? null,
        },
      });
    } else if (user.role === 'teacher') {
      const classes = await prisma.class.findMany({
        where: { teacherId: user.id },
        select: { id: true, name: true, joinCode: true },
        orderBy: { createdAt: 'asc' },
      });
      res.json({
        user: {
          ...user,
          classes,
        },
      });
    } else {
      res.json({ user });
    }
  } catch (err) {
    console.error('Me error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
