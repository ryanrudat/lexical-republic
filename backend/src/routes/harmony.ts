import { Router, type Request } from 'express';
import { authenticate, getPairId, getTeacherId } from '../middleware/auth';
import prisma from '../utils/prisma';
import { getCurrentWeekNumberForPair } from '../utils/progression';
import { getHarmonyReviewContext } from '../data/harmonyFeed';

const router = Router();

type HarmonyViewerContext = {
  pairId: string | null;
  userId: string | null;
  classId: string | null;
  accessibleClassIds: string[];
  currentWeekNumber: number;
};

function getClassFilter(accessibleClassIds: string[]) {
  if (accessibleClassIds.length === 1) {
    return { classId: accessibleClassIds[0] };
  }

  return { classId: { in: accessibleClassIds } };
}

async function getViewerContext(req: Request): Promise<HarmonyViewerContext | null> {
  const pairId = getPairId(req);
  if (pairId) {
    const [enrollment, currentWeekNumber] = await Promise.all([
      prisma.classEnrollment.findFirst({
        where: { pairId },
        select: { classId: true },
      }),
      getCurrentWeekNumberForPair(pairId),
    ]);

    const classId = enrollment?.classId ?? null;
    return {
      pairId,
      userId: null,
      classId,
      accessibleClassIds: classId ? [classId] : [],
      currentWeekNumber,
    };
  }

  const teacherId = getTeacherId(req);
  if (!teacherId) {
    return null;
  }

  const classes = await prisma.class.findMany({
    where: { teacherId },
    select: { id: true },
  });

  return {
    pairId: null,
    userId: teacherId,
    classId: classes[0]?.id ?? null,
    accessibleClassIds: classes.map((entry) => entry.id),
    currentWeekNumber: 18,
  };
}

async function findVisiblePost(postId: string, viewer: HarmonyViewerContext) {
  if (viewer.accessibleClassIds.length === 0) {
    return null;
  }

  return prisma.harmonyPost.findFirst({
    where: {
      id: postId,
      ...getClassFilter(viewer.accessibleClassIds),
      OR: [
        { weekNumber: null },
        { weekNumber: { lte: viewer.currentWeekNumber } },
      ],
    },
  });
}

// All harmony routes require authentication
router.use(authenticate);

// GET /api/harmony/posts — list approved posts (+ own pending), scoped by class/week
router.get('/posts', async (req, res) => {
  try {
    const viewer = await getViewerContext(req);
    if (!viewer) {
      res.status(403).json({ error: 'Unsupported Harmony session' });
      return;
    }

    const reviewContext = getHarmonyReviewContext(viewer.currentWeekNumber);
    if (viewer.accessibleClassIds.length === 0) {
      res.json({
        posts: [],
        ...reviewContext,
      });
      return;
    }

    const ownFilter = viewer.pairId
      ? { pairId: viewer.pairId }
      : { userId: viewer.userId ?? '' };

    const posts = await prisma.harmonyPost.findMany({
      where: {
        parentId: null,
        ...getClassFilter(viewer.accessibleClassIds),
        OR: [
          { status: 'approved' },
          { ...ownFilter, status: 'pending_review' },
        ],
        AND: [
          {
            OR: [
              { weekNumber: null },
              { weekNumber: { lte: viewer.currentWeekNumber } },
            ],
          },
        ],
      },
      include: {
        user: { select: { designation: true, displayName: true } },
        pair: { select: { designation: true, studentAName: true } },
        _count: { select: { replies: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json({
      posts: posts.map((post) => ({
        id: post.id,
        designation:
          post.authorLabel ||
          post.pair?.designation ||
          post.user?.designation ||
          post.user?.displayName ||
          'Unknown',
        content: post.content,
        status: post.status,
        pearlNote: post.pearlNote,
        replyCount: post._count.replies,
        createdAt: post.createdAt.toISOString(),
        isOwn: viewer.pairId ? post.pairId === viewer.pairId : post.userId === viewer.userId,
        weekNumber: post.weekNumber,
      })),
      ...reviewContext,
    });
  } catch (err) {
    console.error('Failed to fetch harmony posts:', err);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// POST /api/harmony/posts — create a new post
router.post('/posts', async (req, res) => {
  try {
    const pairId = getPairId(req);
    if (!pairId) {
      res.status(403).json({ error: 'Pair auth required' });
      return;
    }

    const viewer = await getViewerContext(req);
    if (!viewer?.classId) {
      res.status(400).json({ error: 'Class enrollment required' });
      return;
    }

    const { content } = req.body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      res.status(400).json({ error: 'Content is required' });
      return;
    }

    if (content.length > 280) {
      res.status(400).json({ error: 'Content must be 280 characters or less' });
      return;
    }

    const post = await prisma.harmonyPost.create({
      data: {
        pairId,
        content: content.trim(),
        status: 'pending_review',
        classId: viewer.classId,
        weekNumber: viewer.currentWeekNumber,
      },
    });

    // Auto-approve after a fake delay (simulating Ministry review)
    setTimeout(async () => {
      try {
        await prisma.harmonyPost.update({
          where: { id: post.id },
          data: {
            status: 'approved',
            pearlNote: 'Content reviewed and approved by the Ministry.',
          },
        });
      } catch {
        // Post may have been deleted
      }
    }, 2000 + Math.random() * 3000);

    res.status(201).json({
      id: post.id,
      status: post.status,
      createdAt: post.createdAt.toISOString(),
      weekNumber: post.weekNumber,
    });
  } catch (err) {
    console.error('Failed to create harmony post:', err);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// GET /api/harmony/posts/:id/replies — get replies to a post
router.get('/posts/:id/replies', async (req, res) => {
  try {
    const viewer = await getViewerContext(req);
    if (!viewer) {
      res.status(403).json({ error: 'Unsupported Harmony session' });
      return;
    }

    const parent = await findVisiblePost(req.params.id as string, viewer);
    if (!parent) {
      res.status(404).json({ error: 'Post not found' });
      return;
    }

    const replies = await prisma.harmonyPost.findMany({
      where: {
        parentId: parent.id,
        status: 'approved',
        ...getClassFilter(viewer.accessibleClassIds),
      },
      include: {
        user: { select: { designation: true, displayName: true } },
        pair: { select: { designation: true, studentAName: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json({
      replies: replies.map((reply) => ({
        id: reply.id,
        designation:
          reply.authorLabel ||
          reply.pair?.designation ||
          reply.user?.designation ||
          reply.user?.displayName ||
          'Unknown',
        content: reply.content,
        createdAt: reply.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    console.error('Failed to fetch replies:', err);
    res.status(500).json({ error: 'Failed to fetch replies' });
  }
});

// POST /api/harmony/posts/:id/replies — reply to a post
router.post('/posts/:id/replies', async (req, res) => {
  try {
    const pairId = getPairId(req);
    if (!pairId) {
      res.status(403).json({ error: 'Pair auth required' });
      return;
    }

    const viewer = await getViewerContext(req);
    if (!viewer?.classId) {
      res.status(400).json({ error: 'Class enrollment required' });
      return;
    }

    const { content } = req.body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      res.status(400).json({ error: 'Content is required' });
      return;
    }

    const parent = await findVisiblePost(req.params.id as string, viewer);
    if (!parent || parent.classId !== viewer.classId) {
      res.status(404).json({ error: 'Post not found' });
      return;
    }

    const reply = await prisma.harmonyPost.create({
      data: {
        pairId,
        content: content.trim(),
        parentId: parent.id,
        status: 'pending_review',
        classId: parent.classId,
        weekNumber: parent.weekNumber,
      },
    });

    // Auto-approve
    setTimeout(async () => {
      try {
        await prisma.harmonyPost.update({
          where: { id: reply.id },
          data: { status: 'approved' },
        });
      } catch {
        // Reply may have been deleted
      }
    }, 1500 + Math.random() * 2000);

    res.status(201).json({
      id: reply.id,
      status: reply.status,
      createdAt: reply.createdAt.toISOString(),
    });
  } catch (err) {
    console.error('Failed to create reply:', err);
    res.status(500).json({ error: 'Failed to create reply' });
  }
});

// POST /api/harmony/posts/:id/censure — APPROVE/CORRECT/FLAG action on NPC post
router.post('/posts/:id/censure', async (req, res) => {
  try {
    const viewer = await getViewerContext(req);
    if (!viewer?.pairId || !viewer.classId) {
      res.status(403).json({ error: 'Pair auth required' });
      return;
    }

    const postId = req.params.id as string;
    const { action, weekNumber } = req.body;
    if (!action || !['approve', 'correct', 'flag'].includes(action)) {
      res.status(400).json({ error: 'action must be approve, correct, or flag' });
      return;
    }

    const post = await findVisiblePost(postId, viewer);
    if (!post || post.classId !== viewer.classId) {
      res.status(404).json({ error: 'Post not found' });
      return;
    }

    // Log Citizen-4488 interaction if NPC post (userId === null && pairId === null)
    if (!post.userId && !post.pairId && weekNumber) {
      await prisma.citizen4488Interaction.upsert({
        where: { pairId_weekNumber: { pairId: viewer.pairId, weekNumber } },
        update: { action, context: { postId } },
        create: { pairId: viewer.pairId, weekNumber, action, context: { postId } },
      });
    }

    if (action === 'flag') {
      await prisma.harmonyPost.update({
        where: { id: postId },
        data: { status: 'flagged', pearlNote: 'Flag received. Forwarded for Wellness Review.' },
      });
    }

    res.json({ success: true, action });
  } catch (err) {
    console.error('Censure action error:', err);
    res.status(500).json({ error: 'Failed to process censure action' });
  }
});

export default router;
