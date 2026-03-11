import { Router, type Request } from 'express';
import { authenticate, getPairId, getTeacherId } from '../middleware/auth';
import prisma from '../utils/prisma';
import { getCurrentWeekNumberForPair } from '../utils/progression';
import { getHarmonyReviewContext } from '../data/harmonyFeed';
import { ensureHarmonyPostsExist } from '../utils/harmonyGenerator';

const router = Router();

type HarmonyViewerContext = {
  pairId: string | null;
  userId: string | null;
  classId: string | null;
  accessibleClassIds: string[];
  currentWeekNumber: number;
  harmonyOpen: boolean;
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
        select: { classId: true, class: { select: { harmonyOpen: true } } },
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
      harmonyOpen: enrollment?.class?.harmonyOpen ?? false,
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
    harmonyOpen: true,
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

// GET /api/harmony/posts — list approved feed posts (+ own pending), scoped by class/week
router.get('/posts', async (req, res) => {
  try {
    const viewer = await getViewerContext(req);
    if (!viewer) {
      res.status(403).json({ error: 'Unsupported Harmony session' });
      return;
    }

    // Teacher gate — Harmony must be opened by teacher for the class
    if (viewer.pairId && !viewer.harmonyOpen) {
      res.json({
        locked: true,
        lockMessage: 'Harmony is not yet available. Your supervisor will open access when ready.',
        posts: [],
        currentWeekNumber: viewer.currentWeekNumber,
        focusWords: [],
        reviewWords: [],
      });
      return;
    }

    // Week 1 lock — unless teacher has opened Harmony for this class
    if (viewer.pairId && !viewer.harmonyOpen && viewer.currentWeekNumber <= 1) {
      const shift1Complete = await prisma.shiftResult.findFirst({
        where: { pairId: viewer.pairId, weekNumber: 1 },
        select: { id: true },
      });
      if (!shift1Complete) {
        res.json({
          locked: true,
          lockMessage: 'Harmony access requires completion of your first shift. Return after Shift 1 clearance.',
          posts: [],
          currentWeekNumber: viewer.currentWeekNumber,
          focusWords: [],
          reviewWords: [],
        });
        return;
      }
    }

    const reviewContext = getHarmonyReviewContext(viewer.currentWeekNumber);
    if (viewer.accessibleClassIds.length === 0) {
      res.json({
        locked: false,
        posts: [],
        ...reviewContext,
      });
      return;
    }

    // Ensure AI-generated posts exist for visible weeks
    if (viewer.classId) {
      await ensureHarmonyPostsExist(viewer.currentWeekNumber, viewer.classId);
    }

    const ownFilter = viewer.pairId
      ? { pairId: viewer.pairId }
      : { userId: viewer.userId ?? '' };

    const posts = await prisma.harmonyPost.findMany({
      where: {
        parentId: null,
        postType: 'feed',
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
      locked: false,
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

// GET /api/harmony/censure-queue — get censure items for review
router.get('/censure-queue', async (req, res) => {
  try {
    const viewer = await getViewerContext(req);
    if (!viewer?.pairId) {
      res.status(403).json({ error: 'Pair auth required' });
      return;
    }

    // Teacher gate
    if (!viewer.harmonyOpen) {
      res.json({ locked: true, items: [], stats: { total: 0, completed: 0 } });
      return;
    }

    // Week 1 lock — unless teacher has opened Harmony
    if (!viewer.harmonyOpen && viewer.currentWeekNumber <= 1) {
      const shift1Complete = await prisma.shiftResult.findFirst({
        where: { pairId: viewer.pairId, weekNumber: 1 },
        select: { id: true },
      });
      if (!shift1Complete) {
        res.json({ locked: true, items: [], stats: { total: 0, completed: 0 } });
        return;
      }
    }

    if (!viewer.classId) {
      res.json({ locked: false, items: [], stats: { total: 0, completed: 0 } });
      return;
    }

    // Ensure posts exist
    await ensureHarmonyPostsExist(viewer.currentWeekNumber, viewer.classId);

    // Get censure posts the student hasn't reviewed yet
    const censurePosts = await prisma.harmonyPost.findMany({
      where: {
        classId: viewer.classId,
        postType: { not: 'feed' },
        weekNumber: { lte: viewer.currentWeekNumber },
        status: 'approved',
      },
      include: {
        censureResponses: {
          where: { pairId: viewer.pairId },
          select: { action: true, isCorrect: true },
        },
      },
      orderBy: [{ weekNumber: 'desc' }, { createdAt: 'asc' }],
    });

    const totalItems = censurePosts.length;
    const completedItems = censurePosts.filter(p => p.censureResponses.length > 0).length;

    res.json({
      locked: false,
      items: censurePosts.map((post) => ({
        id: post.id,
        designation: post.authorLabel || 'Unknown',
        content: post.content,
        postType: post.postType,
        weekNumber: post.weekNumber,
        censureData: post.censureData,
        reviewed: post.censureResponses.length > 0,
        wasCorrect: post.censureResponses[0]?.isCorrect ?? null,
        studentAction: post.censureResponses[0]?.action ?? null,
      })),
      stats: { total: totalItems, completed: completedItems },
    });
  } catch (err) {
    console.error('Failed to fetch censure queue:', err);
    res.status(500).json({ error: 'Failed to fetch censure queue' });
  }
});

// POST /api/harmony/censure-queue/:id/respond — submit censure review response
router.post('/censure-queue/:id/respond', async (req, res) => {
  try {
    const pairId = getPairId(req);
    if (!pairId) {
      res.status(403).json({ error: 'Pair auth required' });
      return;
    }

    const postId = req.params.id as string;
    const { action, selectedIndex } = req.body;

    const post = await prisma.harmonyPost.findUnique({
      where: { id: postId },
    });

    if (!post || post.postType === 'feed') {
      res.status(404).json({ error: 'Censure item not found' });
      return;
    }

    // Determine correctness
    const censureData = post.censureData as Record<string, unknown> | null;
    const correctIndex = censureData?.correctIndex as number | undefined;
    const isCorrect = correctIndex !== undefined && selectedIndex === correctIndex;

    const response = await prisma.harmonyCensureResponse.upsert({
      where: { pairId_postId: { pairId, postId } },
      update: { action, isCorrect },
      create: { pairId, postId, action, isCorrect },
    });

    // Track vocab encounters if the word was correctly identified
    if (isCorrect && censureData) {
      const word = (censureData.errorWord as string) || (censureData.correction as string);
      if (word) {
        const dictWord = await prisma.dictionaryWord.findFirst({
          where: { word: word.toLowerCase() },
          select: { id: true },
        });
        if (dictWord) {
          const progress = await prisma.pairDictionaryProgress.upsert({
            where: { pairId_wordId: { pairId, wordId: dictWord.id } },
            update: { encounters: { increment: 1 }, lastSeenAt: new Date() },
            create: { pairId, wordId: dictWord.id, encounters: 1, mastery: 0.1, lastSeenAt: new Date() },
          });
          if (progress.mastery < 1.0) {
            await prisma.pairDictionaryProgress.update({
              where: { id: progress.id },
              data: { mastery: Math.min(1.0, progress.mastery + 0.05) },
            });
          }
        }
      }
    }

    res.json({
      id: response.id,
      isCorrect,
      correction: censureData?.correction ?? null,
      explanation: censureData?.explanation ?? null,
    });
  } catch (err) {
    console.error('Censure response error:', err);
    res.status(500).json({ error: 'Failed to submit response' });
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
        postType: 'feed',
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
        postType: 'feed',
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

// DELETE /api/harmony/posts/:id — delete own post
router.delete('/posts/:id', async (req, res) => {
  try {
    const pairId = getPairId(req);
    const teacherId = getTeacherId(req);
    if (!pairId && !teacherId) {
      res.status(403).json({ error: 'Auth required' });
      return;
    }

    const postId = req.params.id as string;
    const post = await prisma.harmonyPost.findUnique({
      where: { id: postId },
      select: { id: true, pairId: true, userId: true },
    });

    if (!post) {
      res.status(404).json({ error: 'Post not found' });
      return;
    }

    // Students can only delete their own posts; teachers can delete any
    if (pairId && post.pairId !== pairId) {
      res.status(403).json({ error: 'You can only delete your own posts' });
      return;
    }

    // Cascade: delete censure responses on replies, replies, censure responses on post, then post
    const replyIds = (await prisma.harmonyPost.findMany({
      where: { parentId: postId },
      select: { id: true },
    })).map(r => r.id);

    if (replyIds.length > 0) {
      await prisma.harmonyCensureResponse.deleteMany({
        where: { postId: { in: replyIds } },
      });
      await prisma.harmonyPost.deleteMany({
        where: { parentId: postId },
      });
    }

    await prisma.harmonyCensureResponse.deleteMany({
      where: { postId },
    });
    await prisma.harmonyPost.delete({ where: { id: postId } });

    res.json({ success: true });
  } catch (err) {
    console.error('Failed to delete harmony post:', err);
    res.status(500).json({ error: 'Failed to delete post' });
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
