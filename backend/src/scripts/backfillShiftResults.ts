// ─── Backfill: register closing grades for already-stuck students ──────
//
// Recovers students who finished a shift (the week's closing task was marked
// complete) but whose ShiftResult never registered on the teacher view —
// because the old frontend ShiftClosing POST failed silently or was never
// reached (e.g. the W4 Drop Box → Recruitment epilogue gating it). The closing
// task is the week's FINAL task, whatever its type (W1/W3/W4 = shift_report,
// W2 = contradiction_report), so Shift 2 is covered too.
//
// For every (pair, week) that has a COMPLETE closing-task MissionScore but no
// ShiftResult with completedAt, this creates the ShiftResult with an aggregate
// computed from that week's per-task MissionScores. The closing task's
// createdAt is used as completedAt so recovered rows carry a realistic time.
//
// Symptom-A students (never finished the closing task) are intentionally NOT
// recovered here — they genuinely have no grade to register.
//
// USAGE (dry-run by default — prints what it WOULD do, writes nothing):
//   cd backend && npx tsx src/scripts/backfillShiftResults.ts
//
// To actually write (review the dry-run first):
//   cd backend && npx tsx src/scripts/backfillShiftResults.ts --commit
//
// Against PROD: prefix with the prod connection string, e.g.
//   DATABASE_URL="<prod DATABASE_PUBLIC_URL>" npx tsx src/scripts/backfillShiftResults.ts
// (see memory: project_prod_db_access_and_designations.md)

import prisma from '../utils/prisma';
import { ensureShiftResultRegistered, getClosingTaskType } from '../utils/shiftResultRegistration';

interface Candidate {
  pairId: string;
  weekNumber: number;
  completedAt: Date; // closing task's createdAt
}

async function main() {
  const commit = process.argv.includes('--commit');
  console.log(
    `\n=== Backfill ShiftResults — ${commit ? 'COMMIT (writing)' : 'DRY RUN (no writes)'} ===\n`,
  );

  // 1. Map each week to its closing (final) task type. Weeks close on different
  //    types (W1/W3/W4 = shift_report, W2 = contradiction_report).
  const weeks = await prisma.week.findMany({ select: { weekNumber: true } });
  const closingTypeByWeek = new Map<number, string>();
  for (const wk of weeks) {
    const t = getClosingTaskType(wk.weekNumber);
    if (t) closingTypeByWeek.set(wk.weekNumber, t);
  }
  const allClosingTypes = [...new Set(closingTypeByWeek.values())];
  if (allClosingTypes.length === 0) {
    console.log('No week configs with a closing task found. Nothing to do.\n');
    return;
  }

  // 2. Find pair-based scores on any week's closing type, keep the ones marked
  //    complete that are the closing task FOR THEIR OWN week.
  const closingScores = await prisma.missionScore.findMany({
    where: {
      pairId: { not: null },
      mission: { missionType: { in: allClosingTypes } },
    },
    select: {
      pairId: true,
      createdAt: true,
      details: true,
      mission: { select: { missionType: true, week: { select: { weekNumber: true } } } },
    },
  });

  // 3. Collapse to one candidate per (pair, week); keep the latest completion time.
  const candidates = new Map<string, Candidate>();
  for (const ms of closingScores) {
    const status = (ms.details as Record<string, unknown> | null)?.status;
    if (status !== 'complete') continue;
    const pairId = ms.pairId;
    const weekNumber = ms.mission.week?.weekNumber;
    if (!pairId || typeof weekNumber !== 'number') continue;
    // Guard against a type that is a closing task in one week but a mid-shift
    // task in another — only count it when it's THIS week's closing task.
    if (closingTypeByWeek.get(weekNumber) !== ms.mission.missionType) continue;
    const key = `${pairId}::${weekNumber}`;
    const prev = candidates.get(key);
    if (!prev || ms.createdAt > prev.completedAt) {
      candidates.set(key, { pairId, weekNumber, completedAt: ms.createdAt });
    }
  }

  if (candidates.size === 0) {
    console.log('No completed closing tasks found. Nothing to do.\n');
    return;
  }

  // 4. Look up which candidates already have a registered (completedAt) ShiftResult.
  const pairIds = [...new Set([...candidates.values()].map((c) => c.pairId))];
  const [existingResults, pairs] = await Promise.all([
    prisma.shiftResult.findMany({
      where: { pairId: { in: pairIds } },
      select: { pairId: true, weekNumber: true, completedAt: true },
    }),
    prisma.pair.findMany({
      where: { id: { in: pairIds } },
      select: { id: true, designation: true, studentAName: true, studentBName: true },
    }),
  ]);
  const resultState = new Map<string, Date | null>();
  for (const r of existingResults) {
    resultState.set(`${r.pairId}::${r.weekNumber}`, r.completedAt);
  }
  const pairLabel = new Map<string, string>();
  for (const p of pairs) {
    const names = [p.studentAName, p.studentBName].filter(Boolean).join(' & ');
    pairLabel.set(p.id, `${p.designation ?? p.id}${names ? ` (${names})` : ''}`);
  }

  // 5. Process. Dry-run only reports; commit calls the shared helper.
  let toCreate = 0;
  let toUpdateMarker = 0;
  let alreadyOk = 0;
  let noScores = 0;

  const sorted = [...candidates.values()].sort(
    (a, b) =>
      a.weekNumber - b.weekNumber ||
      (pairLabel.get(a.pairId) ?? '').localeCompare(pairLabel.get(b.pairId) ?? ''),
  );

  for (const c of sorted) {
    const key = `${c.pairId}::${c.weekNumber}`;
    const label = pairLabel.get(c.pairId) ?? c.pairId;
    const existingCompletedAt = resultState.get(key);

    if (existingCompletedAt) {
      alreadyOk++;
      continue; // already registered — skip silently
    }

    if (commit) {
      const res = await ensureShiftResultRegistered({
        pairId: c.pairId,
        weekNumber: c.weekNumber,
        completedAt: c.completedAt,
      });
      if (res.action === 'created') toCreate++;
      else if (res.action === 'updated-marker') toUpdateMarker++;
      else if (res.action === 'skipped-no-scores') noScores++;
      else alreadyOk++;
      const score = res.overallScore == null ? '—' : `${Math.round(res.overallScore * 100)}%`;
      console.log(
        `  [${res.action}] Shift ${c.weekNumber} · ${label} · overall ${score} · completedAt ${c.completedAt.toISOString()}`,
      );
    } else {
      // Dry run: report intent based on whether a (null-completedAt) marker exists.
      const hasMarker = resultState.has(key); // present but completedAt null
      if (hasMarker) toUpdateMarker++;
      else toCreate++;
      console.log(
        `  [would ${hasMarker ? 'update-marker' : 'create'}] Shift ${c.weekNumber} · ${label} · completedAt ${c.completedAt.toISOString()}`,
      );
    }
  }

  console.log('\n=== Summary ===');
  console.log(`  Candidates (completed closing task):  ${candidates.size}`);
  console.log(`  Already registered (skipped):         ${alreadyOk}`);
  console.log(`  ${commit ? 'Created' : 'Would create'}:                        ${toCreate}`);
  console.log(`  ${commit ? 'Updated markers' : 'Would update markers'}:        ${toUpdateMarker}`);
  if (noScores > 0) console.log(`  Skipped (no scores found):            ${noScores}`);
  if (!commit) {
    console.log('\n  DRY RUN — nothing was written. Re-run with --commit to apply.\n');
  } else {
    console.log('\n  Done.\n');
  }
}

main()
  .catch((err) => {
    console.error('Backfill failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
