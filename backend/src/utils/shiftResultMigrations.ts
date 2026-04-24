import prisma from './prisma';

/**
 * Clamp any ShiftResult.vocabScore and ShiftResult.grammarAccuracy values that
 * fall outside the valid [0, 1] range back into range. A historical aggregator
 * or client-side bug wrote values like grammarAccuracy = 2.0, causing teacher
 * gradebook and student shift summaries to display 200%. The frontend aggregator
 * and backend endpoint now clamp at write time; this migration cleans up rows
 * that were saved before those guards were in place.
 *
 * Idempotent — after a successful run, subsequent calls find zero rows to update.
 */
export async function clampShiftResultRatios(): Promise<void> {
  const badRows = await prisma.shiftResult.findMany({
    where: {
      OR: [
        { vocabScore: { lt: 0 } },
        { vocabScore: { gt: 1 } },
        { grammarAccuracy: { lt: 0 } },
        { grammarAccuracy: { gt: 1 } },
      ],
    },
    select: {
      id: true,
      vocabScore: true,
      grammarAccuracy: true,
      pairId: true,
      weekNumber: true,
    },
  });

  if (badRows.length === 0) return;

  console.log(
    `[ShiftResult Migration] Clamping ${badRows.length} ShiftResult row(s) with out-of-range ratios...`,
  );

  const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
  let updated = 0;

  for (const row of badRows) {
    const newVocab = clamp01(row.vocabScore);
    const newGrammar = clamp01(row.grammarAccuracy);
    await prisma.shiftResult.update({
      where: { id: row.id },
      data: { vocabScore: newVocab, grammarAccuracy: newGrammar },
    });
    console.log(
      `[ShiftResult Migration]   Pair ${row.pairId} W${row.weekNumber}: ` +
        `vocab ${row.vocabScore.toFixed(2)}→${newVocab.toFixed(2)}, ` +
        `grammar ${row.grammarAccuracy.toFixed(2)}→${newGrammar.toFixed(2)}`,
    );
    updated++;
  }

  console.log(`[ShiftResult Migration] Done. ${updated} row(s) clamped.`);
}
