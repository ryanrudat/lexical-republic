import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../utils/prisma';
import { signToken } from '../utils/jwt';
import { authenticate, getPairId, getTeacherId } from '../middleware/auth';
import { isTeacherPayload, isPairPayload } from '../utils/jwt';
import { io } from '../socketServer';

const router = Router();

const configuredSameSite = (process.env.COOKIE_SAMESITE || (process.env.NODE_ENV === 'production' ? 'none' : 'lax')).toLowerCase();
const sameSite: 'lax' | 'strict' | 'none' = configuredSameSite === 'strict'
  ? 'strict'
  : configuredSameSite === 'none'
    ? 'none'
    : 'lax';
const secureCookie = process.env.NODE_ENV === 'production' || sameSite === 'none';

function setCookie(res: Response, token: string) {
  res.cookie('token', token, {
    httpOnly: true,
    secure: secureCookie,
    sameSite,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  const { designation, pin, username, password } = req.body;

  try {
    // ── Teacher login ──
    if (username && password) {
      const user = await prisma.user.findUnique({ where: { username } });
      if (!user || !user.passwordHash) {
        res.status(401).json({ error: 'Invalid username or password' });
        return;
      }
      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        res.status(401).json({ error: 'Invalid username or password' });
        return;
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      const token = signToken({ type: 'teacher', userId: user.id, role: 'teacher' });
      setCookie(res, token);

      const classes = await prisma.class.findMany({
        where: { teacherId: user.id },
        select: { id: true, name: true, joinCode: true },
        orderBy: { createdAt: 'asc' },
      });

      res.json({
        token,
        user: {
          id: user.id,
          displayName: user.displayName,
          designation: user.designation,
          username: user.username,
          role: user.role,
          lane: user.lane,
          xp: user.xp,
          streak: user.streak,
          classes,
        },
      });
      return;
    }

    // ── Student (pair) login ──
    if (designation && pin) {
      const normalised = typeof designation === 'string' ? designation.trim().toUpperCase() : designation;

      // Try Pair first (new system)
      const pair = await prisma.pair.findUnique({ where: { designation: normalised } });
      if (pair) {
        const valid = await bcrypt.compare(pin, pair.pin);
        if (!valid) {
          res.status(401).json({ error: 'Invalid designation or PIN' });
          return;
        }

        await prisma.pair.update({
          where: { id: pair.id },
          data: { lastLoginAt: new Date() },
        });

        // Get class enrollment
        const enrollment = await prisma.classEnrollment.findFirst({
          where: { pairId: pair.id },
          include: { class: { select: { id: true, name: true } } },
        });

        const token = signToken({
          type: 'pair',
          pairId: pair.id,
          designation: pair.designation,
          classId: enrollment?.class.id ?? '',
          lane: pair.lane,
        });
        setCookie(res, token);

        res.json({
          token,
          user: {
            id: pair.id,
            pairId: pair.id,
            displayName: `${pair.studentAName}${pair.studentBName ? ` & ${pair.studentBName}` : ''}`,
            designation: pair.designation,
            studentAName: pair.studentAName,
            studentBName: pair.studentBName,
            role: 'student',
            lane: pair.lane,
            xp: pair.xp,
            concernScore: pair.concernScore,
            hasWatchedWelcome: pair.hasWatchedWelcome,
            classId: enrollment?.class.id ?? null,
            className: enrollment?.class.name ?? null,
          },
        });
        return;
      }

      // Fallback: try legacy User table for backward compat
      const user = await prisma.user.findUnique({ where: { designation: normalised } });
      if (!user || !user.pin || user.role !== 'student') {
        res.status(401).json({ error: 'Invalid designation or PIN' });
        return;
      }
      const valid = await bcrypt.compare(pin, user.pin);
      if (!valid) {
        res.status(401).json({ error: 'Invalid designation or PIN' });
        return;
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      // Auto-migrate legacy student to Pair model
      const enrollment = await prisma.classEnrollment.findFirst({
        where: { userId: user.id },
        include: { class: { select: { id: true, name: true } } },
      });

      // Create a Pair record from the legacy User, then issue a proper pair token
      const legacyDesignation = user.designation || normalised;
      let migratedPair = await prisma.pair.findUnique({ where: { designation: legacyDesignation } });
      if (!migratedPair) {
        migratedPair = await prisma.pair.create({
          data: {
            designation: legacyDesignation,
            pin: user.pin!, // already hashed — validated non-null above
            studentAName: user.displayName || `Citizen ${user.designation}`,
            lane: user.lane,
            xp: user.xp,
            lastLoginAt: new Date(),
          },
        });
        // Migrate enrollment if exists
        if (enrollment) {
          await prisma.classEnrollment.create({
            data: { pairId: migratedPair.id, classId: enrollment.classId },
          });
        }
      }

      const token = signToken({
        type: 'pair',
        pairId: migratedPair.id,
        designation: migratedPair.designation,
        classId: enrollment?.class.id ?? '',
        lane: migratedPair.lane,
      });
      setCookie(res, token);

      res.json({
        token,
        user: {
          id: migratedPair.id,
          pairId: migratedPair.id,
          displayName: migratedPair.studentAName,
          designation: migratedPair.designation,
          role: 'student',
          lane: migratedPair.lane,
          xp: migratedPair.xp,
          concernScore: migratedPair.concernScore,
          hasWatchedWelcome: migratedPair.hasWatchedWelcome,
          classId: enrollment?.class.id ?? null,
          className: enrollment?.class.name ?? null,
        },
      });
      return;
    }

    res.status(400).json({ error: 'Provide designation+pin or username+password' });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/register — pair self-registration
router.post('/register', async (req: Request, res: Response) => {
  const { studentNumber, pin, displayName, classCode, studentAName, studentBName } = req.body as {
    studentNumber?: string;
    pin?: string;
    displayName?: string;
    classCode?: string;
    studentAName?: string;
    studentBName?: string;
  };

  if (!classCode || typeof classCode !== 'string' || !classCode.trim()) {
    res.status(400).json({ error: 'Class code is required' });
    return;
  }

  if (!studentNumber || typeof studentNumber !== 'string' || !studentNumber.trim()) {
    res.status(400).json({ error: 'Designation is required' });
    return;
  }

  if (!pin || typeof pin !== 'string' || !/^\d{4,8}$/.test(pin)) {
    res.status(400).json({ error: 'PIN must be 4-8 digits' });
    return;
  }

  const designation = studentNumber.trim().toUpperCase();
  const code = classCode.trim().toUpperCase();
  const nameA = (studentAName || displayName || '').trim() || `Citizen ${designation}`;
  const nameB = (studentBName || '').trim();

  try {
    // Validate class code
    const cls = await prisma.class.findUnique({ where: { joinCode: code } });
    if (!cls || !cls.isActive) {
      res.status(400).json({ error: 'Invalid class code' });
      return;
    }

    // Check if designation already exists in Pair table
    const existingPair = await prisma.pair.findUnique({ where: { designation } });
    if (existingPair) {
      res.status(409).json({ error: 'Designation already registered — ask your teacher for your PIN.' });
      return;
    }

    // Also check legacy User table
    const existingUser = await prisma.user.findUnique({ where: { designation } });
    if (existingUser) {
      res.status(409).json({ error: 'Designation already registered' });
      return;
    }

    const pinHash = await bcrypt.hash(pin, 10);
    const pair = await prisma.pair.create({
      data: {
        designation,
        pin: pinHash,
        studentAName: nameA,
        studentBName: nameB,
        lane: cls.defaultLane,
      },
    });

    // Enroll in class
    await prisma.classEnrollment.create({
      data: { pairId: pair.id, classId: cls.id },
    });

    await prisma.pair.update({
      where: { id: pair.id },
      data: { lastLoginAt: new Date() },
    });

    const token = signToken({
      type: 'pair',
      pairId: pair.id,
      designation: pair.designation,
      classId: cls.id,
      lane: pair.lane,
    });
    setCookie(res, token);

    // Notify teacher dashboard that a new student registered
    if (io) {
      io.to('teacher').emit('student:registered', {
        id: pair.id,
        designation: pair.designation,
        displayName: `${pair.studentAName}${pair.studentBName ? ` & ${pair.studentBName}` : ''}`,
        classId: cls.id,
        className: cls.name,
      });
    }

    res.status(201).json({
      token,
      user: {
        id: pair.id,
        pairId: pair.id,
        displayName: `${pair.studentAName}${pair.studentBName ? ` & ${pair.studentBName}` : ''}`,
        designation: pair.designation,
        studentAName: pair.studentAName,
        studentBName: pair.studentBName,
        role: 'student',
        lane: pair.lane,
        xp: pair.xp,
        concernScore: pair.concernScore,
        hasWatchedWelcome: pair.hasWatchedWelcome,
        classId: cls.id,
        className: cls.name,
      },
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/register-teacher — teacher self-registration with secret code
router.post('/register-teacher', async (req: Request, res: Response) => {
  const { username, password, displayName, registrationCode } = req.body as {
    username?: string;
    password?: string;
    displayName?: string;
    registrationCode?: string;
  };

  const expectedCode = process.env.TEACHER_REGISTRATION_CODE;
  if (!expectedCode) {
    res.status(403).json({ error: 'Teacher registration is not enabled' });
    return;
  }

  if (!registrationCode || registrationCode !== expectedCode) {
    res.status(403).json({ error: 'Invalid registration code' });
    return;
  }

  if (!username || typeof username !== 'string' || !username.trim()) {
    res.status(400).json({ error: 'Username is required' });
    return;
  }

  if (!password || typeof password !== 'string' || password.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters' });
    return;
  }

  const cleanUsername = username.trim().toLowerCase();
  const name = (displayName || '').trim() || `Director ${cleanUsername}`;

  try {
    const existing = await prisma.user.findUnique({ where: { username: cleanUsername } });
    if (existing) {
      res.status(409).json({ error: 'Username already taken' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        username: cleanUsername,
        passwordHash,
        displayName: name,
        role: 'teacher',
      },
    });

    // Create a default class for the new teacher
    const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let joinCode = '';
    for (let i = 0; i < 6; i++) {
      joinCode += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    }

    const cls = await prisma.class.create({
      data: {
        name: 'My Class',
        joinCode,
        teacherId: user.id,
      },
    });

    // Auto-unlock week 1
    const week1 = await prisma.week.findFirst({ where: { weekNumber: 1 } });
    if (week1) {
      await prisma.classWeekUnlock.create({
        data: { classId: cls.id, weekId: week1.id },
      });
    }

    const token = signToken({ type: 'teacher', userId: user.id, role: 'teacher' });
    setCookie(res, token);

    res.status(201).json({
      token,
      user: {
        id: user.id,
        displayName: user.displayName,
        designation: user.designation,
        username: user.username,
        role: user.role,
        lane: user.lane,
        xp: user.xp,
        streak: user.streak,
        classes: [{ id: cls.id, name: cls.name, joinCode: cls.joinCode }],
      },
    });
  } catch (err) {
    console.error('Teacher registration error:', err);
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
    const existingToken =
      req.cookies?.token ||
      req.headers.authorization?.replace('Bearer ', '');

    const auth = req.auth!;

    if (isTeacherPayload(auth)) {
      const user = await prisma.user.findUnique({
        where: { id: auth.userId },
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

      // Only actual teachers should have teacher tokens
      if (user.role !== 'teacher') {
        res.status(401).json({ error: 'Session expired — please log in again' });
        return;
      }

      const classes = await prisma.class.findMany({
        where: { teacherId: user.id },
        select: { id: true, name: true, joinCode: true },
        orderBy: { createdAt: 'asc' },
      });
      res.json({ token: existingToken, user: { ...user, classes } });
    } else if (isPairPayload(auth)) {
      const pair = await prisma.pair.findUnique({
        where: { id: auth.pairId },
      });

      if (!pair) {
        res.status(404).json({ error: 'Pair not found' });
        return;
      }

      const enrollment = await prisma.classEnrollment.findFirst({
        where: { pairId: pair.id },
        include: { class: { select: { id: true, name: true } } },
      });

      res.json({
        token: existingToken,
        user: {
          id: pair.id,
          pairId: pair.id,
          displayName: `${pair.studentAName}${pair.studentBName ? ` & ${pair.studentBName}` : ''}`,
          designation: pair.designation,
          studentAName: pair.studentAName,
          studentBName: pair.studentBName,
          role: 'student',
          lane: pair.lane,
          xp: pair.xp,
          concernScore: pair.concernScore,
          hasWatchedWelcome: pair.hasWatchedWelcome,
          classId: enrollment?.class.id ?? null,
          className: enrollment?.class.name ?? null,
        },
      });
    } else {
      res.status(401).json({ error: 'Invalid token type' });
    }
  } catch (err) {
    console.error('Me error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
