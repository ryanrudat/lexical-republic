import { Router } from 'express';
import type { Request, Response } from 'express';
import { authenticate, getPairId, getTeacherId } from '../middleware/auth';
import prisma from '../utils/prisma';
import { io } from '../socketServer';
import { pickInscriptionPrompts, type InscriptionWord } from '../utils/inscriptionWordPool';
import { pickGhostRecordings } from '../utils/inscriptionGhosts';
import { calcInscriptionScore, utcDateKey } from '../utils/inscriptionScoring';
import { assignCitizenNumber } from '../utils/citizenNumber';
import {
  COOLDOWN_SECONDS,
  DEFAULT_WORD_COUNT,
  DEFAULT_POOL_STRATEGY,
  POOL_STRATEGIES,
  durationForLane,
  DAILY_SOLO_PI_CAP,
  type DrillMode,
  type PoolStrategy,
} from '../utils/inscriptionConstants';

const router = Router();
router.use(authenticate);

const VALID_MODES: DrillMode[] = ['solo', 'open', 'trial'];

// ─── Helpers ─────────────────────────────────────────────────────

interface ResolvedContext {
  pairId: string;
  classId: string;
  lane: number;
  citizenNumber: string;
  /** In-world identity shown to the student (e.g. "CA-1"), NOT the internal random C-XXXX. */
  designation: string;
}

async function resolvePairContext(req: Request, res: Response): Promise<ResolvedContext | null> {
  const pairId = getPairId(req);
  if (!pairId) {
    res.status(403).json({ error: 'Pair auth required' });
    return null;
  }
  const pair = await prisma.pair.findUnique({
    where: { id: pairId },
    select: { id: true, lane: true, citizenNumber: true, designation: true },
  });
  if (!pair) {
    res.status(404).json({ error: 'Pair not found' });
    return null;
  }
  const enrollment = await prisma.classEnrollment.findFirst({
    where: { pairId },
    select: { classId: true },
  });
  if (!enrollment) {
    res.status(400).json({ error: 'Pair has no class enrollment' });
    return null;
  }
  const citizenNumber = pair.citizenNumber || (await assignCitizenNumber(pair.id));
  return {
    pairId: pair.id,
    classId: enrollment.classId,
    lane: pair.lane,
    citizenNumber,
    designation: pair.designation,
  };
}

function normalizeWord(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z'-]/g, '')
    .trim();
}

/**
 * Sentence comparison normalizer — lowercase, collapse runs of whitespace
 * to a single space, strip a trailing period/comma/semicolon (forgiving
 * about whether the student typed the final stop). Preserves internal
 * punctuation and apostrophes so students still learn punctuation.
 */
function normalizeSentence(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[.,;]\s*$/, '')
    .trim();
}

// ─── POST /api/inscription/drills (start a drill) ─────────────────

router.post('/drills', async (req, res) => {
  try {
    const ctx = await resolvePairContext(req, res);
    if (!ctx) return;

    const mode = (typeof req.body?.mode === 'string' ? req.body.mode : 'solo') as DrillMode;
    if (!VALID_MODES.includes(mode)) {
      res.status(400).json({ error: `mode must be one of ${VALID_MODES.join(',')}` });
      return;
    }

    const weekNumber = Number(req.body?.weekNumber);
    if (!Number.isFinite(weekNumber) || weekNumber < 1) {
      res.status(400).json({ error: 'weekNumber required' });
      return;
    }

    const poolStrategy = (
      typeof req.body?.poolStrategy === 'string' &&
        POOL_STRATEGIES.includes(req.body.poolStrategy)
        ? req.body.poolStrategy
        : DEFAULT_POOL_STRATEGY
    ) as PoolStrategy;

    // Cooldown check (skipped for trial since trial is teacher-driven)
    if (mode !== 'trial') {
      const pair = await prisma.pair.findUnique({
        where: { id: ctx.pairId },
        select: { lastInscriptionDrillCompletedAt: true },
      });
      if (pair?.lastInscriptionDrillCompletedAt) {
        const since = Date.now() - pair.lastInscriptionDrillCompletedAt.getTime();
        const remaining = COOLDOWN_SECONDS * 1000 - since;
        if (remaining > 0) {
          res.status(429).json({
            error: 'cooldown',
            message: 'Productivity Allocation cooldown active.',
            retryInSeconds: Math.ceil(remaining / 1000),
          });
          return;
        }
      }
    }

    // Reject concurrent active drill
    const existingActive = await prisma.inscriptionDrill.findFirst({
      where: { pairId: ctx.pairId, status: 'active' },
      select: { id: true },
    });
    if (existingActive) {
      res.status(409).json({
        error: 'active_drill',
        message: 'You already have an active drill in progress.',
        drillId: existingActive.id,
      });
      return;
    }

    // Resolve duration + wordCount
    const wordCount = clampInt(req.body?.wordCount, DEFAULT_WORD_COUNT, 5, 30);

    let durationSec: number;
    if (mode === 'trial' && typeof req.body?.durationSec === 'number') {
      durationSec = durationForLane(ctx.lane, clampInt(req.body.durationSec, 90, 30, 300));
    } else {
      durationSec = durationForLane(ctx.lane);
    }

    // Pick words + sentences (hybrid drill). Default split: ~60% words /
    // ~40% sentences, with a minimum of 2 words as warm-up so the first
    // couple of prompts are spelling-only before the sentence challenge.
    // Teacher-set trials override to all words (no sentences) for now —
    // keeps existing trial behavior intact until sentence trials get a UI.
    const sentenceCount = mode === 'trial'
      ? 0
      : Math.max(0, Math.floor(wordCount * 0.4));
    const words = await pickInscriptionPrompts({
      classId: ctx.classId,
      weekNumber,
      count: wordCount,
      pairId: ctx.pairId,
      poolStrategy,
      sentenceCount,
    });
    if (words.length === 0) {
      res.status(400).json({
        error: 'no_words',
        message: 'No TOEIC words available for this shift. Configure WeekConfig.targetWords first.',
      });
      return;
    }

    const ghostCount = mode === 'trial' ? 0 : 3;
    const excludeDigits = new Set<string>([ctx.citizenNumber.replace(/[^0-9]/g, '')]);
    const ghosts = await pickGhostRecordings({
      classId: ctx.classId,
      weekNumber,
      lane: ctx.lane,
      durationSec,
      wordCount,
      count: ghostCount,
      excludeCitizenDigits: excludeDigits,
      selfPairId: ctx.pairId,
    });

    // Create the drill + self-recording (desk 1) + ghost recordings (desks 2..N)
    const drill = await prisma.inscriptionDrill.create({
      data: {
        classId: ctx.classId,
        pairId: ctx.pairId,
        weekNumber,
        lane: ctx.lane,
        mode,
        durationSec,
        wordCount: words.length,
        poolStrategy,
        wordQueue: words as unknown as object,
        status: 'active',
        recordings: {
          create: [
            {
              isGhost: false,
              // Self desk shows the student's own designation (e.g. CA-1), the
              // identity they log in with — not the internal random C-XXXX.
              citizenNumber: ctx.designation,
              desk: 1,
              wordTimings: [],
              keystrokeLog: [],
              wordsCorrect: 0,
            },
            ...ghosts.map((g, idx) => ({
              isGhost: true,
              sourceDrillId: g.sourceDrillId,
              citizenNumber: g.citizenNumber,
              desk: idx + 2,
              wordTimings: g.wordTimings as unknown as object,
              keystrokeLog: g.keystrokeLog as unknown as object,
              wordsCorrect: g.wordsCorrect,
              finishedAt_ms: g.finishedAt_ms,
            })),
          ],
        },
      },
      include: { recordings: true },
    });

    res.json({
      drillId: drill.id,
      mode: drill.mode,
      durationSec: drill.durationSec,
      wordCount: drill.wordCount,
      lane: drill.lane,
      weekNumber: drill.weekNumber,
      // Send the FULL word queue to the client. Client only reveals the
      // current word in UI but server still validates per-word on submit.
      words,
      desks: drill.recordings.map((r) => ({
        desk: r.desk,
        citizenNumber: r.citizenNumber,
        isGhost: r.isGhost,
        wordTimings: r.isGhost ? r.wordTimings : [],
        keystrokeLog: r.isGhost ? r.keystrokeLog : [],
        wordsCorrect: r.wordsCorrect,
        finishedAt_ms: r.finishedAt_ms,
      })),
    });
  } catch (err) {
    console.error('[inscription] POST /drills error', err);
    res.status(500).json({ error: 'Failed to start drill' });
  }
});

// ─── POST /api/inscription/drills/:id/word ────────────────────────

router.post('/drills/:id/word', async (req, res) => {
  try {
    const pairId = getPairId(req);
    if (!pairId) {
      res.status(403).json({ error: 'Pair auth required' });
      return;
    }
    const drillId = req.params.id as string;
    const wordIdx = Number(req.body?.wordIdx);
    const finalText = typeof req.body?.finalText === 'string' ? req.body.finalText : '';
    const finishedAt_ms = Number(req.body?.finishedAt_ms);
    const errorsRecovered = Number(req.body?.errorsRecovered) || 0;

    if (!Number.isFinite(wordIdx) || !Number.isFinite(finishedAt_ms)) {
      res.status(400).json({ error: 'wordIdx and finishedAt_ms required' });
      return;
    }

    const drill = await prisma.inscriptionDrill.findUnique({
      where: { id: drillId },
      include: {
        recordings: { where: { isGhost: false, desk: 1 } },
      },
    });
    if (!drill || drill.pairId !== pairId) {
      res.status(404).json({ error: 'Drill not found' });
      return;
    }
    if (drill.status !== 'active') {
      res.status(400).json({ error: 'Drill not active', status: drill.status });
      return;
    }
    if (drill.pausedAt) {
      res.status(409).json({ error: 'Drill paused', message: 'Inscription paused for administrative review.' });
      return;
    }

    const wordQueue = drill.wordQueue as unknown as InscriptionWord[];
    if (!Array.isArray(wordQueue) || wordIdx < 0 || wordIdx >= wordQueue.length) {
      res.status(400).json({ error: 'wordIdx out of range' });
      return;
    }
    // Sentence prompts compare against the full sentence; word prompts
    // compare against the word. The two normalizers differ — sentence
    // mode preserves internal punctuation + spacing; word mode strips
    // everything but letters/hyphens/apostrophes.
    const prompt = wordQueue[wordIdx];
    const isSentencePrompt = typeof prompt.sentence === 'string' && prompt.sentence.length > 0;
    const expected = isSentencePrompt
      ? normalizeSentence(prompt.sentence as string)
      : normalizeWord(prompt.word);
    const submitted = isSentencePrompt
      ? normalizeSentence(finalText)
      : normalizeWord(finalText);
    // Backward-compat: if the student's frontend bundle is stale (deploy
    // window) and only knows about word prompts, accept the bare target
    // word as a correct submission for sentence prompts so the deploy
    // doesn't penalize in-flight drills.
    const stalefrontendFallback =
      isSentencePrompt && normalizeWord(prompt.word) === normalizeWord(finalText);
    const correct =
      expected.length > 0 && (expected === submitted || stalefrontendFallback);

    const myRec = drill.recordings[0];
    if (!myRec) {
      res.status(500).json({ error: 'Self-recording missing' });
      return;
    }
    const existingTimings = coerceWordTimings(myRec.wordTimings);
    const existingIdxs = new Set(existingTimings.map((t) => t.wordIdx));
    if (existingIdxs.has(wordIdx)) {
      // Refresh-safe / duplicate suppression: don't double-count.
      res.json({ correct, duplicate: true });
      return;
    }
    existingTimings.push({
      wordIdx,
      finishedAt_ms,
      correct,
      errorsRecovered,
    });

    const newCorrectCount = existingTimings.filter((t) => t.correct).length;

    await prisma.inscriptionRecording.update({
      where: { id: myRec.id },
      data: {
        wordTimings: existingTimings as unknown as object,
        wordsCorrect: newCorrectCount,
      },
    });

    // Broadcast (Phase 2 socket will pick this up; Phase 1 emit lands in pair's room)
    if (drill.lobbyId) {
      io.to(`inscription:lobby:${drill.lobbyId}`).emit('inscription:word-complete', {
        desk: myRec.desk,
        wordIdx,
        finishedAt_ms,
        correct,
      });
    }

    res.json({ correct, wordsCorrect: newCorrectCount });
  } catch (err) {
    console.error('[inscription] POST /word error', err);
    res.status(500).json({ error: 'Failed to submit word' });
  }
});

// ─── POST /api/inscription/drills/:id/complete ────────────────────

router.post('/drills/:id/complete', async (req, res) => {
  try {
    const pairId = getPairId(req);
    if (!pairId) {
      res.status(403).json({ error: 'Pair auth required' });
      return;
    }
    const drillId = req.params.id as string;
    const abandoned = req.body?.abandoned === true;

    const result = await finalizeDrill({ drillId, pairId, abandoned });
    if (!result) {
      res.status(404).json({ error: 'Drill not found' });
      return;
    }
    res.json(result);
  } catch (err) {
    console.error('[inscription] POST /complete error', err);
    res.status(500).json({ error: 'Failed to complete drill' });
  }
});

// ─── POST /api/inscription/drills/:id/abort (teacher) ─────────────

router.post('/drills/:id/abort', async (req, res) => {
  try {
    const teacherId = getTeacherId(req);
    if (!teacherId) {
      res.status(403).json({ error: 'Teacher auth required' });
      return;
    }
    const drillId = req.params.id as string;

    const drill = await prisma.inscriptionDrill.findUnique({
      where: { id: drillId },
      select: { id: true, pairId: true, classId: true, status: true },
    });
    if (!drill) {
      res.status(404).json({ error: 'Drill not found' });
      return;
    }

    // Teacher ownership check
    const owned = await prisma.class.findFirst({
      where: { id: drill.classId, teacherId },
      select: { id: true },
    });
    if (!owned) {
      res.status(403).json({ error: 'Not your class' });
      return;
    }
    if (drill.status !== 'active') {
      res.json({ ok: true, alreadyTerminal: true, status: drill.status });
      return;
    }

    await prisma.inscriptionDrill.update({
      where: { id: drillId },
      data: { status: 'abandoned', completedAt: new Date() },
    });

    if (drill.classId) {
      io.to(`class:${drill.classId}`).emit('inscription:force-aborted', {
        drillId,
        pairId: drill.pairId,
      });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('[inscription] POST /abort error', err);
    res.status(500).json({ error: 'Failed to abort drill' });
  }
});

// ─── GET /api/inscription/state (current pair status) ─────────────

router.get('/state', async (req, res) => {
  try {
    const ctx = await resolvePairContext(req, res);
    if (!ctx) return;

    const pair = await prisma.pair.findUnique({
      where: { id: ctx.pairId },
      select: {
        citizenNumber: true,
        lastInscriptionDrillCompletedAt: true,
        inscriptionSoloPiAwardsToday: true,
        inscriptionSoloCounterDate: true,
      },
    });

    const activeDrill = await prisma.inscriptionDrill.findFirst({
      where: { pairId: ctx.pairId, status: 'active' },
      select: { id: true, mode: true, weekNumber: true, durationSec: true, wordCount: true, startedAt: true },
    });

    const todayKey = utcDateKey();
    const soloUsedToday =
      pair?.inscriptionSoloCounterDate === todayKey
        ? pair.inscriptionSoloPiAwardsToday
        : 0;

    const cooldownRemaining = pair?.lastInscriptionDrillCompletedAt
      ? Math.max(
          0,
          Math.ceil(
            (COOLDOWN_SECONDS * 1000 -
              (Date.now() - pair.lastInscriptionDrillCompletedAt.getTime())) /
              1000,
          ),
        )
      : 0;

    res.json({
      // Lobby shows the student's designation (e.g. CA-1), not the internal random C-XXXX.
      citizenNumber: ctx.designation,
      classId: ctx.classId,
      cooldownRemainingSec: cooldownRemaining,
      soloUsedToday,
      soloCap: DAILY_SOLO_PI_CAP,
      activeDrill,
    });
  } catch (err) {
    console.error('[inscription] GET /state error', err);
    res.status(500).json({ error: 'Failed to load state' });
  }
});

// ─── GET /api/inscription/roll/:classId (Roll of Distinction) ─────

router.get('/roll/:classId', async (req, res) => {
  try {
    const classId = req.params.classId as string;
    if (!classId) {
      res.status(400).json({ error: 'classId required' });
      return;
    }

    const drills = await prisma.inscriptionDrill.findMany({
      where: {
        classId,
        status: 'completed',
        piAwarded: { gt: 0 },
      },
      select: {
        pairId: true,
        piAwarded: true,
      },
      orderBy: { completedAt: 'desc' },
      take: 500,
    });

    // Aggregate P.I. per pair
    const piByPair = new Map<string, number>();
    for (const d of drills) {
      piByPair.set(d.pairId, (piByPair.get(d.pairId) ?? 0) + d.piAwarded);
    }

    // Look up citizen numbers
    const pairIds = Array.from(piByPair.keys());
    const pairs = await prisma.pair.findMany({
      where: { id: { in: pairIds } },
      select: { id: true, designation: true },
    });
    const cnByPair = new Map<string, string>();
    for (const p of pairs) cnByPair.set(p.id, p.designation);

    const ranked = Array.from(piByPair.entries())
      .map(([pairId, pi]) => ({
        citizenNumber: cnByPair.get(pairId) || 'C-????',
        piTotal: pi,
      }))
      .sort((a, b) => b.piTotal - a.piTotal)
      .slice(0, 5);

    res.json({ roll: ranked });
  } catch (err) {
    console.error('[inscription] GET /roll error', err);
    res.status(500).json({ error: 'Failed to load Roll of Distinction' });
  }
});

// ─── Internal helper: finalize a drill ────────────────────────────

export async function finalizeDrill(opts: {
  drillId: string;
  pairId: string;
  abandoned: boolean;
}): Promise<{
  drillId: string;
  finalRank: number | null;
  piAwarded: number;
  piCapped: boolean;
  commendationTier: string | null;
  standings: Array<{ desk: number; citizenNumber: string; wordsCorrect: number; finishedAt_ms: number | null; rank: number | null; isGhost: boolean }>;
  personalBreakdown: {
    wordsCorrect: number;
    wordsTotal: number;
    averagePerWordSec: number | null;
    fastestWord: { word: string; secs: number } | null;
    slowestWord: { word: string; secs: number } | null;
  } | null;
} | null> {
  const drill = await prisma.inscriptionDrill.findUnique({
    where: { id: opts.drillId },
    include: { recordings: true },
  });
  if (!drill || drill.pairId !== opts.pairId) return null;
  if (drill.status !== 'active') {
    // Already finalized — return current state
    return summarizeFinalized(drill.id);
  }

  const wordQueue = (drill.wordQueue as unknown as InscriptionWord[]) || [];
  const selfRec = drill.recordings.find((r) => !r.isGhost && r.desk === 1);
  if (!selfRec) return null;

  const selfTimings = coerceWordTimings(selfRec.wordTimings);
  const wordsCorrect = selfTimings.filter((t) => t.correct).length;

  // Compute final rank vs ghosts
  interface RankedDesk {
    id: string;
    desk: number;
    citizenNumber: string;
    isGhost: boolean;
    wordsCorrect: number;
    finishedAt_ms: number | null;
    rank: number;
  }
  const standings = drill.recordings.map((r) => {
    const t = coerceWordTimings(r.wordTimings);
    const wc = t.filter((x) => x.correct).length;
    const last = t.length > 0 ? t[t.length - 1].finishedAt_ms : null;
    const finished = wc === drill.wordCount ? last : null;
    return {
      id: r.id,
      desk: r.desk,
      citizenNumber: r.citizenNumber,
      isGhost: r.isGhost,
      wordsCorrect: wc,
      finishedAt_ms: r.isGhost ? r.finishedAt_ms : finished,
    };
  });
  // Rank: more words correct = better; if tied, faster finishedAt_ms = better
  const sorted = [...standings].sort((a, b) => {
    if (a.wordsCorrect !== b.wordsCorrect) return b.wordsCorrect - a.wordsCorrect;
    const aFin = a.finishedAt_ms ?? Number.MAX_SAFE_INTEGER;
    const bFin = b.finishedAt_ms ?? Number.MAX_SAFE_INTEGER;
    return aFin - bFin;
  });
  const ranked: RankedDesk[] = sorted.map((s, i) => ({ ...s, rank: i + 1 }));
  const selfRanked = ranked.find((r) => r.id === selfRec.id);
  const finalRank = selfRanked ? selfRanked.rank : null;

  // P.I. + commendation
  const todayKey = utcDateKey();
  const pair = await prisma.pair.findUnique({
    where: { id: opts.pairId },
    select: { inscriptionSoloPiAwardsToday: true, inscriptionSoloCounterDate: true },
  });
  const soloUsedToday =
    pair?.inscriptionSoloCounterDate === todayKey ? pair.inscriptionSoloPiAwardsToday : 0;

  let piAwarded = 0;
  let piCapped = false;
  let commendationTier: string | null = null;

  if (!opts.abandoned) {
    const score = calcInscriptionScore({
      wordsCorrect,
      wordsTotal: drill.wordCount,
      finalRank: finalRank ?? standings.length,
      totalParticipants: standings.length,
      mode: drill.mode as DrillMode,
      soloPiAwardsToday: soloUsedToday,
    });
    piAwarded = score.piAwarded;
    piCapped = score.piCapped;
    commendationTier = score.commendationTier;
  }

  // Persist: drill row + self-recording rank + Pair counters
  await prisma.$transaction(async (tx) => {
    await tx.inscriptionDrill.update({
      where: { id: drill.id },
      data: {
        status: opts.abandoned ? 'abandoned' : 'completed',
        completedAt: new Date(),
        finalRank: finalRank ?? null,
        piAwarded,
        piCapped,
        commendationTier,
      },
    });
    // Persist final ranks on every recording for future ghost matchmaking
    for (const r of ranked) {
      await tx.inscriptionRecording.update({
        where: { id: r.id },
        data: { finalRank: r.rank },
      });
    }
    // Update pair counters atomically
    const updates: Record<string, unknown> = {};
    if (!opts.abandoned) {
      updates.lastInscriptionDrillCompletedAt = new Date();
      if (drill.mode === 'solo') {
        const isNewDay =
          (pair?.inscriptionSoloCounterDate ?? '') !== todayKey;
        updates.inscriptionSoloCounterDate = todayKey;
        updates.inscriptionSoloPiAwardsToday = isNewDay
          ? piCapped ? 0 : 1
          : piCapped
            ? soloUsedToday
            : soloUsedToday + 1;
      }
    }
    if (Object.keys(updates).length > 0) {
      await tx.pair.update({ where: { id: opts.pairId }, data: updates });
    }
  });

  // Broadcast drill-complete to lobby room (if any) + class room (for Roll updates)
  if (drill.lobbyId) {
    io.to(`inscription:lobby:${drill.lobbyId}`).emit('inscription:drill-complete', {
      drillId: drill.id,
      standings: ranked.map((r) => ({
        desk: r.desk,
        citizenNumber: r.citizenNumber,
        wordsCorrect: r.wordsCorrect,
        finishedAt_ms: r.finishedAt_ms,
        rank: r.rank,
        isGhost: r.isGhost,
      })),
    });
  }
  io.to(`class:${drill.classId}`).emit('inscription:roll-updated', { classId: drill.classId });

  // Personal breakdown
  let fastestWord: { word: string; secs: number } | null = null;
  let slowestWord: { word: string; secs: number } | null = null;
  let totalElapsedMs = 0;
  let prevMs = 0;
  for (const t of selfTimings) {
    if (!t.correct) continue;
    const elapsed = t.finishedAt_ms - prevMs;
    if (elapsed > 0) {
      totalElapsedMs += elapsed;
      const w = wordQueue[t.wordIdx]?.word ?? '';
      const secs = elapsed / 1000;
      if (!fastestWord || secs < fastestWord.secs) fastestWord = { word: w, secs };
      if (!slowestWord || secs > slowestWord.secs) slowestWord = { word: w, secs };
    }
    prevMs = t.finishedAt_ms;
  }
  const averagePerWordSec =
    wordsCorrect > 0 ? totalElapsedMs / 1000 / wordsCorrect : null;

  return {
    drillId: drill.id,
    finalRank: finalRank ?? null,
    piAwarded,
    piCapped,
    commendationTier,
    standings: ranked.map((r) => ({
      desk: r.desk,
      citizenNumber: r.citizenNumber,
      wordsCorrect: r.wordsCorrect,
      finishedAt_ms: r.finishedAt_ms,
      rank: r.rank,
      isGhost: r.isGhost,
    })),
    personalBreakdown: {
      wordsCorrect,
      wordsTotal: drill.wordCount,
      averagePerWordSec,
      fastestWord,
      slowestWord,
    },
  };
}

async function summarizeFinalized(drillId: string) {
  const drill = await prisma.inscriptionDrill.findUnique({
    where: { id: drillId },
    include: { recordings: true },
  });
  if (!drill) return null;
  const wordQueue = (drill.wordQueue as unknown as InscriptionWord[]) || [];
  const selfRec = drill.recordings.find((r) => !r.isGhost && r.desk === 1);

  const standings = drill.recordings.map((r) => ({
    desk: r.desk,
    citizenNumber: r.citizenNumber,
    wordsCorrect: r.wordsCorrect,
    finishedAt_ms: r.finishedAt_ms,
    rank: r.finalRank,
    isGhost: r.isGhost,
  }));

  let personalBreakdown = null;
  if (selfRec) {
    const timings = coerceWordTimings(selfRec.wordTimings);
    const wordsCorrect = timings.filter((t) => t.correct).length;
    let totalElapsedMs = 0;
    let prevMs = 0;
    let fastestWord: { word: string; secs: number } | null = null;
    let slowestWord: { word: string; secs: number } | null = null;
    for (const t of timings) {
      if (!t.correct) continue;
      const elapsed = t.finishedAt_ms - prevMs;
      if (elapsed > 0) {
        totalElapsedMs += elapsed;
        const w = wordQueue[t.wordIdx]?.word ?? '';
        const secs = elapsed / 1000;
        if (!fastestWord || secs < fastestWord.secs) fastestWord = { word: w, secs };
        if (!slowestWord || secs > slowestWord.secs) slowestWord = { word: w, secs };
      }
      prevMs = t.finishedAt_ms;
    }
    personalBreakdown = {
      wordsCorrect,
      wordsTotal: drill.wordCount,
      averagePerWordSec: wordsCorrect > 0 ? totalElapsedMs / 1000 / wordsCorrect : null,
      fastestWord,
      slowestWord,
    };
  }

  return {
    drillId: drill.id,
    finalRank: drill.finalRank,
    piAwarded: drill.piAwarded,
    piCapped: drill.piCapped,
    commendationTier: drill.commendationTier,
    standings,
    personalBreakdown,
  };
}

function coerceWordTimings(raw: unknown): Array<{
  wordIdx: number;
  finishedAt_ms: number;
  correct: boolean;
  errorsRecovered: number;
}> {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((r: unknown) => {
      if (!r || typeof r !== 'object') return null;
      const t = r as Record<string, unknown>;
      const wordIdx = typeof t.wordIdx === 'number' ? t.wordIdx : null;
      const finishedAt_ms = typeof t.finishedAt_ms === 'number' ? t.finishedAt_ms : null;
      if (wordIdx === null || finishedAt_ms === null) return null;
      return {
        wordIdx,
        finishedAt_ms,
        correct: t.correct !== false,
        errorsRecovered: typeof t.errorsRecovered === 'number' ? t.errorsRecovered : 0,
      };
    })
    .filter((x): x is { wordIdx: number; finishedAt_ms: number; correct: boolean; errorsRecovered: number } => x !== null);
}

function clampInt(v: unknown, fallback: number, min: number, max: number): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

export default router;
