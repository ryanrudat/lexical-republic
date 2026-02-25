import { Router } from 'express';
import { authenticate, getPairId } from '../middleware/auth';
import prisma from '../utils/prisma';

const router = Router();

// All harmony routes require authentication
router.use(authenticate);

// GET /api/harmony/posts — list approved posts (+ own pending), scoped by class
router.get('/posts', async (req, res) => {
  try {
    const userId = req.user!.userId;
    const pairId = getPairId(req);

    // Determine student's classId for scoping
    let studentClassId: string | null = null;
    const enrollment = await prisma.classEnrollment.findFirst({
      where: pairId ? { pairId } : { userId },
      select: { classId: true },
    });
    if (enrollment) {
      studentClassId = enrollment.classId;
    }

    // Build ownership filter for "own pending" posts
    const ownFilter = pairId ? { pairId } : { userId };

    const posts = await prisma.harmonyPost.findMany({
      where: {
        parentId: null,
        ...(studentClassId ? { classId: studentClassId } : {}),
        OR: [
          { status: 'approved' },
          { ...ownFilter, status: 'pending_review' },
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
      posts: posts.map((p) => ({
        id: p.id,
        designation: p.pair?.designation || p.user?.designation || p.user?.displayName || 'Unknown',
        content: p.content,
        status: p.status,
        pearlNote: p.pearlNote,
        replyCount: p._count.replies,
        createdAt: p.createdAt.toISOString(),
        isOwn: pairId ? p.pairId === pairId : p.userId === userId,
      })),
    });
  } catch (err) {
    console.error('Failed to fetch harmony posts:', err);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// POST /api/harmony/posts — create a new post
router.post('/posts', async (req, res) => {
  try {
    const userId = req.user!.userId;
    const pairId = getPairId(req);
    const { content } = req.body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      res.status(400).json({ error: 'Content is required' });
      return;
    }

    if (content.length > 280) {
      res.status(400).json({ error: 'Content must be 280 characters or less' });
      return;
    }

    // Get student's classId
    let classId: string | null = null;
    const enrollment = await prisma.classEnrollment.findFirst({
      where: pairId ? { pairId } : { userId },
      select: { classId: true },
    });
    if (enrollment) {
      classId = enrollment.classId;
    }

    const post = await prisma.harmonyPost.create({
      data: {
        userId: pairId ? undefined : userId,
        pairId: pairId ?? undefined,
        content: content.trim(),
        status: 'pending_review',
        classId,
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
    });
  } catch (err) {
    console.error('Failed to create harmony post:', err);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// GET /api/harmony/posts/:id/replies — get replies to a post
router.get('/posts/:id/replies', async (req, res) => {
  try {
    const postId = req.params.id as string;
    const replies = await prisma.harmonyPost.findMany({
      where: {
        parentId: postId,
        status: 'approved',
      },
      include: {
        user: { select: { designation: true, displayName: true } },
        pair: { select: { designation: true, studentAName: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json({
      replies: replies.map((r) => ({
        id: r.id,
        designation: r.pair?.designation || r.user?.designation || r.user?.displayName || 'Unknown',
        content: r.content,
        createdAt: r.createdAt.toISOString(),
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
    const userId = req.user!.userId;
    const pairId = getPairId(req);
    const parentId = req.params.id as string;
    const { content } = req.body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      res.status(400).json({ error: 'Content is required' });
      return;
    }

    // Verify parent exists
    const parent = await prisma.harmonyPost.findUnique({ where: { id: parentId } });
    if (!parent) {
      res.status(404).json({ error: 'Post not found' });
      return;
    }

    const reply = await prisma.harmonyPost.create({
      data: {
        userId: pairId ? undefined : userId,
        pairId: pairId ?? undefined,
        content: content.trim(),
        parentId,
        status: 'pending_review',
        classId: parent.classId, // Inherit parent's class
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

export default router;
