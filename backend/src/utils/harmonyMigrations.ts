import prisma from './prisma';

/**
 * Rename old-format Harmony authorLabels to the unified Citizen-XXXX format.
 * Idempotent — safe to run on every server startup. Skips if no old labels found.
 */
const LABEL_RENAMES: Record<string, string> = {
  'CA-18': 'Citizen-0018',
  'WA-07': 'Citizen-0007',
  'WA-15': 'Citizen-0015',
  'CA-09': 'Citizen-0009',
  'CA-31': 'Citizen-0031',
  'CA-22': 'Citizen-0022',
  'WA-33': 'Citizen-0033',
  'CA-41': 'Citizen-0041',
  'CA-27': 'Citizen-0027',
  'WA-19': 'Citizen-0019',
  'WA-42': 'Citizen-0042',
  'CA-38': 'Citizen-0038',
};

export async function migrateHarmonyAuthorLabels(): Promise<void> {
  const oldLabels = Object.keys(LABEL_RENAMES);

  const count = await prisma.harmonyPost.count({
    where: { authorLabel: { in: oldLabels } },
  });

  if (count === 0) return;

  console.log(`[Harmony Migration] Renaming ${count} posts with old-format authorLabels...`);

  for (const [oldLabel, newLabel] of Object.entries(LABEL_RENAMES)) {
    const result = await prisma.harmonyPost.updateMany({
      where: { authorLabel: oldLabel },
      data: { authorLabel: newLabel },
    });
    if (result.count > 0) {
      console.log(`[Harmony Migration]   ${oldLabel} → ${newLabel} (${result.count} posts)`);
    }
  }

  console.log('[Harmony Migration] Done.');
}
