import { prisma } from './prisma';
import { anonymizedCitizenNumber } from './citizenNumber';
import {
  getStenographerTemplates,
  synthesizeStenographerTimings,
} from '../data/ministryStenographerGhosts';

export interface GhostRecording {
  citizenNumber: string;
  sourceDrillId: string | null;
  wordTimings: Array<{
    wordIdx: number;
    finishedAt_ms: number;
    correct: boolean;
    errorsRecovered: number;
  }>;
  keystrokeLog: Array<{ wordIdx: number; charIdx: number; t_ms: number }>;
  wordsCorrect: number;
  finishedAt_ms: number | null;
  isStenographer: boolean;
}

interface PickGhostsOpts {
  classId: string;
  weekNumber: number;
  lane: number;
  durationSec: number;
  wordCount: number;
  count: number;                       // how many ghosts to return
  excludeCitizenDigits?: Set<string>;  // active classmate Citizen-XXXX digits to avoid collision
}

/**
 * Pick ghost recordings for an inscription drill.
 * Source preference: real classmate recordings (same class + lane + 14-day window
 * + matching durationSec). Falls back to Ministry Stenographer NPCs when the pool
 * is empty.
 */
export async function pickGhostRecordings(opts: PickGhostsOpts): Promise<GhostRecording[]> {
  const { classId, lane, durationSec, count, wordCount, excludeCitizenDigits } = opts;
  if (count <= 0) return [];

  const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  // Real classmate recordings: pull from non-ghost recordings whose parent drill
  // was in the same class+lane and was completed recently with matching duration.
  const candidates = await prisma.inscriptionRecording.findMany({
    where: {
      isGhost: false,
      drill: {
        classId,
        lane,
        durationSec,
        status: 'completed',
        completedAt: { gte: cutoff },
      },
    },
    include: {
      drill: { select: { id: true } },
    },
    take: count * 5,    // over-sample then random-pick
    orderBy: { drill: { completedAt: 'desc' } },
  });

  const excluded = new Set<string>(excludeCitizenDigits ?? []);
  const ghosts: GhostRecording[] = [];

  if (candidates.length > 0) {
    shuffle(candidates);
    for (const c of candidates) {
      if (ghosts.length >= count) break;
      const cn = anonymizedCitizenNumber(excluded);
      const cnDigits = cn.replace(/[^0-9]/g, '');
      excluded.add(cnDigits);
      ghosts.push({
        citizenNumber: cn,
        sourceDrillId: c.drillId,
        wordTimings: coerceWordTimings(c.wordTimings),
        keystrokeLog: coerceKeystrokeLog(c.keystrokeLog),
        wordsCorrect: c.wordsCorrect,
        finishedAt_ms: c.finishedAt_ms,
        isStenographer: false,
      });
    }
  }

  // Cold-start / not enough real ghosts: fill with Ministry Stenographers
  if (ghosts.length < count) {
    const templates = getStenographerTemplates(lane);
    let templateIdx = 0;
    while (ghosts.length < count) {
      const tpl = templates[templateIdx % templates.length];
      const cn = anonymizedCitizenNumber(excluded);
      const cnDigits = cn.replace(/[^0-9]/g, '');
      excluded.add(cnDigits);

      // For stenographers we use their canonical citizen number, not anonymized
      const usedCn = tpl.citizenNumber;
      const synth = synthesizeStenographerTimings(tpl, wordCount, durationSec);
      ghosts.push({
        citizenNumber: usedCn,
        sourceDrillId: null,
        wordTimings: synth.wordTimings,
        keystrokeLog: [], // stenographers don't emit keystroke pulses
        wordsCorrect: synth.wordsCorrect,
        finishedAt_ms: synth.finishedAt_ms,
        isStenographer: true,
      });
      templateIdx += 1;
    }
  }

  return ghosts;
}

function shuffle<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function coerceWordTimings(raw: unknown): GhostRecording['wordTimings'] {
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
    .filter((x): x is GhostRecording['wordTimings'][number] => x !== null);
}

function coerceKeystrokeLog(raw: unknown): GhostRecording['keystrokeLog'] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((r: unknown) => {
      if (!r || typeof r !== 'object') return null;
      const t = r as Record<string, unknown>;
      const wordIdx = typeof t.wordIdx === 'number' ? t.wordIdx : null;
      const charIdx = typeof t.charIdx === 'number' ? t.charIdx : null;
      const t_ms = typeof t.t_ms === 'number' ? t.t_ms : null;
      if (wordIdx === null || charIdx === null || t_ms === null) return null;
      return { wordIdx, charIdx, t_ms };
    })
    .filter((x): x is GhostRecording['keystrokeLog'][number] => x !== null);
}
