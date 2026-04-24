import { Router, type Request } from 'express';
import { authenticate, getPairId, getTeacherId } from '../middleware/auth';
import prisma from '../utils/prisma';
import { getCurrentWeekNumberForPair } from '../utils/progression';
import { getHarmonyReviewContext } from '../data/harmonyFeed';
import { ensureHarmonyPostsExist } from '../utils/harmonyGenerator';
import { generateNpcReplies } from '../utils/harmonyReplies';
import { moderatePost } from '../utils/harmonyModeration';
import { getRouteWeeks } from '../data/narrative-routes';
import { io } from '../socketServer';

const router = Router();

/** Post types that appear in the feed tab (not the censure queue). */
const FEED_POST_TYPES = ['feed', 'bulletin', 'pearl_tip', 'community_notice', 'sector_report'];
/** Post types that appear in the censure review queue. */
const CENSURE_POST_TYPES = ['censure_grammar', 'censure_vocab', 'censure_replace'];

type HarmonyViewerContext = {
  pairId: string | null;
  userId: string | null;
  classId: string | null;
  accessibleClassIds: string[];
  currentWeekNumber: number;
  harmonyOpen: boolean;
  narrativeRoute: string;
};

function getClassFilter(accessibleClassIds: string[]) {
  if (accessibleClassIds.length === 1) {
    return { classId: accessibleClassIds[0] };
  }

  return { classId: { in: accessibleClassIds } };
}

/** Prisma where-clause filter for weeks visible to this viewer's narrative route. */
function getRouteWeekFilter(viewer: HarmonyViewerContext) {
  const routeWeeks = getRouteWeeks(viewer.narrativeRoute);
  const visibleWeeks = routeWeeks.filter(w => w <= viewer.currentWeekNumber);
  return {
    OR: [
      { weekNumber: null },
      { weekNumber: { in: visibleWeeks } },
    ],
  };
}

async function getViewerContext(req: Request): Promise<HarmonyViewerContext | null> {
  const pairId = getPairId(req);
  if (pairId) {
    const [enrollment, currentWeekNumber] = await Promise.all([
      prisma.classEnrollment.findFirst({
        where: { pairId },
        select: { classId: true, class: { select: { harmonyOpen: true, narrativeRoute: true } } },
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
      narrativeRoute: enrollment?.class?.narrativeRoute ?? 'full',
    };
  }

  const teacherId = getTeacherId(req);
  if (!teacherId) {
    return null;
  }

  const classes = await prisma.class.findMany({
    where: { teacherId },
    select: { id: true, narrativeRoute: true },
  });

  return {
    pairId: null,
    userId: teacherId,
    classId: classes[0]?.id ?? null,
    accessibleClassIds: classes.map((entry) => entry.id),
    currentWeekNumber: 18,
    harmonyOpen: true,
    narrativeRoute: classes[0]?.narrativeRoute ?? 'full',
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
      ...getRouteWeekFilter(viewer),
    },
  });
}

/** Look up mastery for the error/correction word of each censure item. Used to prioritize review. */
async function getReviewItemMasteries(
  pairId: string,
  items: Array<{ id: string; censureData: unknown }>,
): Promise<Map<string, number>> {
  // Collect all words to look up in one batch
  const itemWords: Array<{ itemId: string; word: string }> = [];
  for (const item of items) {
    const data = item.censureData as Record<string, unknown> | null;
    const word = (data?.errorWord as string) ?? (data?.correction as string) ?? '';
    if (word) itemWords.push({ itemId: item.id, word: word.toLowerCase() });
  }

  if (itemWords.length === 0) {
    return new Map(items.map(i => [i.id, 0]));
  }

  // Batch lookup dictionary words
  const uniqueWords = [...new Set(itemWords.map(iw => iw.word))];
  const dictWords = await prisma.dictionaryWord.findMany({
    where: { word: { in: uniqueWords } },
    select: { id: true, word: true },
  });
  const wordToId = new Map(dictWords.map(d => [d.word, d.id]));

  // Batch lookup mastery
  const wordIds = dictWords.map(d => d.id);
  const progressRecords = wordIds.length > 0
    ? await prisma.pairDictionaryProgress.findMany({
        where: { pairId, wordId: { in: wordIds } },
        select: { wordId: true, mastery: true },
      })
    : [];
  const wordIdToMastery = new Map(progressRecords.map(p => [p.wordId, p.mastery]));

  // Map item IDs to mastery
  const result = new Map<string, number>();
  for (const item of items) {
    const iw = itemWords.find(w => w.itemId === item.id);
    if (!iw) { result.set(item.id, 0); continue; }
    const dictId = wordToId.get(iw.word);
    if (!dictId) { result.set(item.id, 0); continue; }
    result.set(item.id, wordIdToMastery.get(dictId) ?? 0);
  }
  return result;
}

// All harmony routes require authentication
router.use(authenticate);

// GET /api/harmony/has-new — lightweight check for new content since last visit
router.get('/has-new', async (req, res) => {
  try {
    const viewer = await getViewerContext(req);
    if (!viewer?.pairId || !viewer.harmonyOpen) {
      res.json({ hasNew: false });
      return;
    }

    const pair = await prisma.pair.findUnique({
      where: { id: viewer.pairId },
      select: { lastHarmonyVisit: true },
    });

    if (!pair?.lastHarmonyVisit) {
      // Never visited — check if any approved posts exist
      const count = await prisma.harmonyPost.count({
        where: {
          ...getClassFilter(viewer.accessibleClassIds),
          status: 'approved',
          parentId: null,
        },
      });
      res.json({ hasNew: count > 0 });
      return;
    }

    const count = await prisma.harmonyPost.count({
      where: {
        ...getClassFilter(viewer.accessibleClassIds),
        status: 'approved',
        parentId: null,
        createdAt: { gt: pair.lastHarmonyVisit },
      },
    });
    res.json({ hasNew: count > 0 });
  } catch (err) {
    console.error('Failed to check harmony new content:', err);
    res.json({ hasNew: false });
  }
});

// GET /api/harmony/archives — vocabulary by week, 4488 timeline, bulletin archive
router.get('/archives', async (req, res) => {
  try {
    const viewer = await getViewerContext(req);
    if (!viewer?.pairId) {
      res.status(403).json({ error: 'Pair auth required' });
      return;
    }
    if (!viewer.harmonyOpen) {
      res.json({ locked: true, vocabulary: [], timeline: [], bulletins: [] });
      return;
    }

    const section = (req.query.section as string) || 'all';
    const routeWeeks = getRouteWeeks(viewer.narrativeRoute);
    const completedWeeks = routeWeeks.filter(w => w <= viewer.currentWeekNumber);

    const result: {
      locked: false;
      vocabulary?: Array<{
        weekNumber: number;
        words: Array<{
          word: string;
          definition: string;
          exampleSentence: string;
          mastery: number;
          encounters: number;
        }>;
      }>;
      timeline?: Array<{
        id: string;
        weekNumber: number | null;
        content: string;
        authorLabel: string;
        createdAt: string;
        studentAction: string | null;
      }>;
      bulletins?: Array<{
        id: string;
        weekNumber: number | null;
        content: string;
        authorLabel: string;
        createdAt: string;
        bulletinData: unknown;
      }>;
    } = { locked: false as const };

    // Vocabulary by week
    if (section === 'all' || section === 'vocabulary') {
      const dictWords = await prisma.dictionaryWord.findMany({
        where: { weekIntroduced: { in: completedWeeks } },
        orderBy: [{ weekIntroduced: 'asc' }, { word: 'asc' }],
        select: { id: true, word: true, definition: true, exampleSentence: true, weekIntroduced: true },
      });

      const progressRecords = await prisma.pairDictionaryProgress.findMany({
        where: { pairId: viewer.pairId, wordId: { in: dictWords.map(d => d.id) } },
        select: { wordId: true, mastery: true, encounters: true },
      });
      const progressMap = new Map(progressRecords.map(p => [p.wordId, p]));

      const weekMap = new Map<number, typeof result.vocabulary extends (infer U)[] | undefined ? U extends Array<infer V> ? V : never : never>();
      for (const w of completedWeeks) {
        const weekWords = dictWords
          .filter(d => d.weekIntroduced === w)
          .map(d => {
            const prog = progressMap.get(d.id);
            return {
              word: d.word,
              definition: d.definition,
              exampleSentence: d.exampleSentence,
              mastery: prog?.mastery ?? 0,
              encounters: prog?.encounters ?? 0,
            };
          });
        if (weekWords.length > 0) {
          weekMap.set(w, { weekNumber: w, words: weekWords } as never);
        }
      }
      result.vocabulary = completedWeeks
        .filter(w => weekMap.has(w))
        .map(w => weekMap.get(w)!);
    }

    // Citizen-4488 timeline
    if (section === 'all' || section === 'timeline') {
      const posts4488 = await prisma.harmonyPost.findMany({
        where: {
          ...getClassFilter(viewer.accessibleClassIds),
          status: { in: ['approved', 'flagged'] },
          authorLabel: { startsWith: 'Citizen-4488' },
          parentId: null,
          ...getRouteWeekFilter(viewer),
        },
        orderBy: [{ weekNumber: 'asc' }, { createdAt: 'asc' }],
        select: { id: true, weekNumber: true, content: true, authorLabel: true, createdAt: true },
      });

      const interactions = await prisma.citizen4488Interaction.findMany({
        where: { pairId: viewer.pairId },
        select: { weekNumber: true, action: true },
      });
      const actionMap = new Map(interactions.map(i => [i.weekNumber, i.action]));

      result.timeline = posts4488.map(p => ({
        id: p.id,
        weekNumber: p.weekNumber,
        content: p.content,
        authorLabel: p.authorLabel ?? 'Citizen-4488',
        createdAt: p.createdAt.toISOString(),
        studentAction: p.weekNumber ? (actionMap.get(p.weekNumber) ?? null) : null,
      }));
    }

    // Bulletin archive
    if (section === 'all' || section === 'bulletins') {
      const bulletins = await prisma.harmonyPost.findMany({
        where: {
          ...getClassFilter(viewer.accessibleClassIds),
          postType: 'bulletin',
          status: 'approved',
          parentId: null,
          ...getRouteWeekFilter(viewer),
        },
        orderBy: [{ weekNumber: 'desc' }, { createdAt: 'desc' }],
        select: { id: true, weekNumber: true, content: true, authorLabel: true, createdAt: true, bulletinData: true },
      });
      result.bulletins = bulletins.map(b => ({
        id: b.id,
        weekNumber: b.weekNumber,
        content: b.content,
        authorLabel: b.authorLabel ?? 'Ministry of Clarity',
        createdAt: b.createdAt.toISOString(),
        bulletinData: b.bulletinData,
      }));
    }

    res.json(result);
  } catch (err) {
    console.error('Failed to fetch harmony archives:', err);
    res.status(500).json({ error: 'Failed to fetch archives' });
  }
});

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
        recentWords: [],
        deepReviewWords: [],
      });
      return;
    }

    // Harmony access is gated by teacher toggle (harmonyOpen).
    // Teachers open Harmony when students are ready — no separate week-1 gate needed.

    const reviewContext = getHarmonyReviewContext(viewer.currentWeekNumber, viewer.narrativeRoute);
    if (viewer.accessibleClassIds.length === 0) {
      res.json({
        locked: false,
        posts: [],
        ...reviewContext,
      });
      return;
    }

    // Sweep stale pending posts (safety net if server restarted during setTimeout approval).
    // Threshold is 3s to reliably close the gap after the 2-5s auto-approve setTimeout fires.
    if (viewer.classId) {
      await prisma.harmonyPost.updateMany({
        where: {
          classId: viewer.classId,
          status: 'pending_review',
          isGenerated: false,
          createdAt: { lt: new Date(Date.now() - 3_000) },
        },
        data: { status: 'approved', pearlNote: 'Content reviewed and approved by the Ministry.' },
      });
    }

    // Ensure AI-generated posts exist for visible weeks
    if (viewer.classId) {
      await ensureHarmonyPostsExist(viewer.currentWeekNumber, viewer.classId, viewer.narrativeRoute);
    }

    // Capture prior lastHarmonyVisit BEFORE updating — NEW badges need the previous request's timestamp
    let lastVisit: Date | null = null;
    if (viewer.pairId) {
      const priorPair = await prisma.pair.findUnique({
        where: { id: viewer.pairId },
        select: { lastHarmonyVisit: true },
      });
      lastVisit = priorPair?.lastHarmonyVisit ?? null;

      await prisma.pair.update({
        where: { id: viewer.pairId },
        data: { lastHarmonyVisit: new Date() },
      });
    }

    const ownFilter = viewer.pairId
      ? { pairId: viewer.pairId }
      : { userId: viewer.userId ?? '' };

    const posts = await prisma.harmonyPost.findMany({
      where: {
        parentId: null,
        postType: { in: FEED_POST_TYPES },
        ...getClassFilter(viewer.accessibleClassIds),
        OR: [
          { status: 'approved' },
          { ...ownFilter, status: 'pending_review' },
          { ...ownFilter, status: 'flagged' },
        ],
        AND: [getRouteWeekFilter(viewer)],
      },
      include: {
        user: { select: { designation: true, displayName: true } },
        pair: { select: { designation: true, studentAName: true } },
        _count: { select: { replies: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // Sort by content type priority: bulletins first, then tips, reports, notices, feed
    const typeOrder: Record<string, number> = {
      bulletin: 0, pearl_tip: 1, sector_report: 2, community_notice: 3, feed: 4,
    };
    const sorted = [...posts].sort((a, b) => {
      const aOrder = typeOrder[a.postType] ?? 5;
      const bOrder = typeOrder[b.postType] ?? 5;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    res.json({
      locked: false,
      // isFirstVisit is true only on the pair's very first feed load (before the
      // server-side lastHarmonyVisit update we just performed). The banner is
      // one-time ambient onboarding — see HarmonyApp.tsx.
      isFirstVisit: viewer.pairId ? lastVisit === null : false,
      posts: sorted.map((post) => ({
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
        postType: post.postType,
        bulletinData: post.bulletinData ?? null,
        isNew: lastVisit ? post.createdAt > lastVisit : false,
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

    // Harmony access is gated by teacher toggle (harmonyOpen).

    if (!viewer.classId) {
      res.json({ locked: false, items: [], stats: { total: 0, completed: 0 } });
      return;
    }

    // Ensure posts exist
    await ensureHarmonyPostsExist(viewer.currentWeekNumber, viewer.classId, viewer.narrativeRoute);

    // Get censure posts scoped to route weeks
    const routeWeeks = getRouteWeeks(viewer.narrativeRoute);
    const visibleWeeks = routeWeeks.filter(w => w <= viewer.currentWeekNumber);

    const censurePosts = await prisma.harmonyPost.findMany({
      where: {
        classId: viewer.classId,
        postType: { in: CENSURE_POST_TYPES },
        weekNumber: { in: visibleWeeks },
        status: 'approved',
      },
      include: {
        censureResponses: {
          where: { pairId: viewer.pairId },
          select: { action: true, isCorrect: true, createdAt: true },
        },
      },
      orderBy: [{ weekNumber: 'desc' }, { createdAt: 'asc' }],
    });

    // Separate current-week items from review candidates.
    // Review candidates use spaced-repetition rules so items from previous shifts
    // re-surface over time rather than disappearing after a single correct response.
    const currentWeekItems = censurePosts.filter(p => p.weekNumber === viewer.currentWeekNumber);

    const SPACED_REPETITION_DAYS = 7;
    const now = Date.now();
    const MS_PER_DAY = 1000 * 60 * 60 * 24;
    const reviewCandidates = censurePosts.filter(p => {
      if (p.weekNumber === viewer.currentWeekNumber) return false;
      const r = p.censureResponses[0];
      if (!r) return true;                // never answered
      if (!r.isCorrect) return true;      // answered wrong — keep surfacing until they get it right
      const ageDays = (now - r.createdAt.getTime()) / MS_PER_DAY;
      return ageDays > SPACED_REPETITION_DAYS;   // correct but stale — spaced repetition re-eligible
    });

    // Select up to 3 review items, prioritized by lowest mastery
    let selectedReviewItems = reviewCandidates;
    if (reviewCandidates.length > 3 && viewer.pairId) {
      const wordMasteries = await getReviewItemMasteries(viewer.pairId, reviewCandidates);
      selectedReviewItems = reviewCandidates
        .sort((a, b) => (wordMasteries.get(a.id) ?? 0) - (wordMasteries.get(b.id) ?? 0))
        .slice(0, 3);
    } else if (reviewCandidates.length > 3) {
      selectedReviewItems = reviewCandidates.slice(0, 3);
    }

    // Items the student has completed on a past shift that aren't currently in the
    // active review rotation — show in read-only "completed" section.
    const selectedReviewIds = new Set(selectedReviewItems.map(p => p.id));
    const reviewedOlderItems = censurePosts.filter(p =>
      p.weekNumber !== viewer.currentWeekNumber &&
      p.censureResponses.length > 0 &&
      !selectedReviewIds.has(p.id),
    );

    const allItems = [...currentWeekItems, ...selectedReviewItems, ...reviewedOlderItems];
    const totalItems = allItems.length;
    // "Completed" count = items in the read-only section. Items in active review
    // (even if they have a prior response) count as outstanding work.
    const completedItems = reviewedOlderItems.length +
      currentWeekItems.filter(p => p.censureResponses.length > 0).length;

    res.json({
      locked: false,
      items: allItems.map((post) => {
        const isCurrent = post.weekNumber === viewer.currentWeekNumber;
        const isActiveReview = selectedReviewIds.has(post.id);
        const hasResponse = post.censureResponses.length > 0;
        return {
          id: post.id,
          designation: post.authorLabel || 'Unknown',
          content: post.content,
          postType: post.postType,
          weekNumber: post.weekNumber,
          censureData: post.censureData,
          // Only render as "reviewed" (read-only) when it's a completed item not in active rotation.
          // Items re-surfaced by spaced repetition are actionable again even with a prior response.
          reviewed: !isCurrent && !isActiveReview && hasResponse,
          wasCorrect: post.censureResponses[0]?.isCorrect ?? null,
          studentAction: post.censureResponses[0]?.action ?? null,
          isReview: !isCurrent,
        };
      }),
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

    // Refresh createdAt on re-answer so the spaced-repetition clock restarts.
    // createdAt doubles as "last answered at" for the review-candidate filter.
    const response = await prisma.harmonyCensureResponse.upsert({
      where: { pairId_postId: { pairId, postId } },
      update: { action, isCorrect, createdAt: new Date() },
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
          // Differentiated mastery: current-week items get +0.05, review items get +0.03
          const currentWeek = await getCurrentWeekNumberForPair(pairId);
          const masteryDelta = post.weekNumber === currentWeek ? 0.05 : 0.03;

          // Wrap encounter increment + mastery bump in a single transaction so they can't diverge
          await prisma.$transaction(async (tx) => {
            const progress = await tx.pairDictionaryProgress.upsert({
              where: { pairId_wordId: { pairId, wordId: dictWord.id } },
              update: { encounters: { increment: 1 }, lastSeenAt: new Date() },
              create: { pairId, wordId: dictWord.id, encounters: 1, mastery: 0.1, lastSeenAt: new Date() },
            });
            if (progress.mastery < 1.0) {
              await tx.pairDictionaryProgress.update({
                where: { id: progress.id },
                data: { mastery: Math.min(1.0, progress.mastery + masteryDelta) },
              });
            }
          });
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

// POST /api/harmony/bulletins/:id/respond — submit bulletin comprehension answer
router.post('/bulletins/:id/respond', async (req, res) => {
  try {
    const pairId = getPairId(req);
    if (!pairId) {
      res.status(403).json({ error: 'Pair auth required' });
      return;
    }

    const postId = req.params.id as string;
    const { questionIndex, selectedIndex } = req.body;

    const post = await prisma.harmonyPost.findUnique({
      where: { id: postId },
    });

    if (!post || post.postType !== 'bulletin' || !post.bulletinData) {
      res.status(404).json({ error: 'Bulletin not found' });
      return;
    }

    const bulletinData = post.bulletinData as { questions: Array<{ correctIndex: number }> };
    const question = bulletinData.questions?.[questionIndex];
    if (!question) {
      res.status(400).json({ error: 'Invalid question index' });
      return;
    }

    const isCorrect = selectedIndex === question.correctIndex;
    res.json({ isCorrect, correctIndex: question.correctIndex });
  } catch (err) {
    console.error('Bulletin response error:', err);
    res.status(500).json({ error: 'Failed to submit bulletin response' });
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

    const trimmed = content.trim();

    // Moderation: may hit OpenAI, defaults to approved on failure.
    const moderation = await moderatePost(trimmed, viewer.currentWeekNumber);

    const post = await prisma.harmonyPost.create({
      data: {
        pairId,
        content: trimmed,
        status: moderation.verdict === 'flagged' ? 'flagged' : 'approved',
        pearlNote: moderation.pearlNote,
        postType: 'feed',
        classId: viewer.classId,
        weekNumber: viewer.currentWeekNumber,
      },
    });

    // Broadcast to class only on approved posts (flagged posts are private to the author).
    if (moderation.verdict === 'approved') {
      io?.to(`class:${viewer.classId}`).emit('harmony:new-content', {
        weekNumber: viewer.currentWeekNumber,
        count: 1,
      });
      generateNpcReplies(post.id, trimmed, viewer.currentWeekNumber, viewer.classId);
    }

    res.status(201).json({
      id: post.id,
      status: post.status,
      pearlNote: post.pearlNote,
      moderation: {
        verdict: moderation.verdict,
        reason: moderation.reason,
      },
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

    const trimmed = content.trim();
    const moderation = await moderatePost(trimmed, parent.weekNumber ?? viewer.currentWeekNumber);

    const reply = await prisma.harmonyPost.create({
      data: {
        pairId,
        content: trimmed,
        parentId: parent.id,
        status: moderation.verdict === 'flagged' ? 'flagged' : 'approved',
        pearlNote: moderation.pearlNote,
        postType: 'feed',
        classId: parent.classId,
        weekNumber: parent.weekNumber,
      },
    });

    if (parent.classId && moderation.verdict === 'approved') {
      io?.to(`class:${parent.classId}`).emit('harmony:new-content', {
        weekNumber: parent.weekNumber ?? viewer.currentWeekNumber,
        count: 1,
      });
    }

    res.status(201).json({
      id: reply.id,
      status: reply.status,
      pearlNote: reply.pearlNote,
      moderation: {
        verdict: moderation.verdict,
        reason: moderation.reason,
      },
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
    if (!post) {
      res.status(404).json({ error: 'Post not found' });
      return;
    }

    // Prevent cross-class censure even if findVisiblePost would have surfaced the post
    if (post.classId !== viewer.classId) {
      res.status(403).json({ error: 'Cross-class action not permitted' });
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
