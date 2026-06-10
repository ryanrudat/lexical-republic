import prisma from './prisma';
import { getWeekConfig } from '../data/week-configs';
import { WORD_ENRICHMENT } from '../data/week-configs/wordEnrichment';

/**
 * Ensure a Mission row exists for every task in every WeekConfig.
 *
 * Why: Railway prod runs `prisma migrate deploy` on boot but NOT `npm run seed`.
 * When a new week ships with a WeekConfig (e.g. W4 Activity Reconciliation),
 * the production DB has only the legacy 7-step Mission rows from
 * `createDefaultWeekMissions` — none of the queue task types
 * (`word_match`, `document_review`, `cloze_fill`, `vocab_clearance`,
 * `shift_report`) have a matching Mission row. Student scoring writes
 * (which key off Mission by missionType) then break.
 *
 * Idempotent: scans every Week row, looks up its WeekConfig by weekNumber,
 * creates only missions that don't yet exist. Preserves teacherOverride on
 * existing rows. Safe to run on every server boot.
 */
export async function ensureQueueMissionsForAllWeeks(): Promise<void> {
  const weeks = await prisma.week.findMany({
    select: { id: true, weekNumber: true },
    orderBy: { weekNumber: 'asc' },
  });

  let totalCreated = 0;
  const createdByWeek: Record<number, number> = {};

  for (const week of weeks) {
    const config = getWeekConfig(week.weekNumber);
    if (!config) continue;

    for (let i = 0; i < config.tasks.length; i++) {
      const task = config.tasks[i];
      const existing = await prisma.mission.findFirst({
        where: { weekId: week.id, missionType: task.type },
        select: { id: true },
      });
      if (existing) continue;

      await prisma.mission.create({
        data: {
          weekId: week.id,
          orderIndex: i,
          title: task.label,
          description: `Queue task: ${task.label}`,
          missionType: task.type,
          config: { weekConfigTask: task.id },
        },
      });
      totalCreated += 1;
      createdByWeek[week.weekNumber] = (createdByWeek[week.weekNumber] ?? 0) + 1;
    }
  }

  if (totalCreated === 0) return;

  console.log(`[Week Migration] Created ${totalCreated} missing queue Mission rows:`);
  for (const [wk, n] of Object.entries(createdByWeek)) {
    console.log(`[Week Migration]   week ${wk}: +${n} missions`);
  }
  console.log('[Week Migration] Done.');
}

/**
 * Ensure a `DictionaryWord` row exists for every TOEIC `targetWords` entry in
 * every WeekConfig.
 *
 * Why: `prisma/seed.ts` is the ONLY writer of `DictionaryWord` rows, it stops at
 * week 3, and it does NOT run on Railway deploys (only `prisma migrate deploy`
 * does). So in prod the W4 (and any future week's) target words have no row,
 * which silently breaks three subsystems: Shift-Report writing never bumps
 * mastery for those words; `buildComplianceQuestions` does `if (!row) continue`
 * so teachers can't author a Compliance Check on the real targets; and Clarity/
 * Remediation mastery bumps no-op. Mirrors `ensureQueueMissionsForAllWeeks`.
 *
 * Idempotent + non-destructive: only CREATES rows that don't exist, so it never
 * overwrites the richer W1–3 seed data. Words without authored enrichment data
 * are skipped (a hollow empty-definition row would be useless to Compliance).
 * Black Words are excluded by construction — they're not in `targetWords`.
 */
export async function ensureDictionaryWordsForAllWeeks(): Promise<void> {
  const weeks = await prisma.week.findMany({
    select: { weekNumber: true },
    orderBy: { weekNumber: 'asc' },
  });

  let totalCreated = 0;
  const createdByWeek: Record<number, number> = {};

  for (const week of weeks) {
    const config = getWeekConfig(week.weekNumber);
    if (!config) continue;

    for (const rawWord of config.targetWords) {
      const word = rawWord.toLowerCase();
      const enrich = WORD_ENRICHMENT[word];
      if (!enrich) continue; // no authored data — don't insert a hollow row

      // Skip if the word exists in ANY week, not just this one. The seed
      // already holds W1-era rows for some W4 targets (e.g. 'record', 'verify');
      // creating a second row per word would double-bump mastery in the
      // submissions encounter loop (which matches rows by word string) and
      // show the word twice in dictionary surfaces. The existing earlier-week
      // row already serves Compliance/Clarity/Remediation lookups for W4.
      const existing = await prisma.dictionaryWord.findFirst({
        where: { word },
        select: { id: true },
      });
      if (existing) continue;

      try {
        await prisma.dictionaryWord.create({
          data: {
            word,
            weekIntroduced: week.weekNumber,
            partOfSpeech: enrich.partOfSpeech,
            phonetic: enrich.phonetic,
            definition: enrich.definition,
            exampleSentence: enrich.exampleSentence,
            translationZhTw: enrich.translationZhTw,
            toeicCategory: enrich.toeicCategory,
            wordFamilyGroup: enrich.wordFamilyGroup ?? null,
            isWorldBuilding: false,
          },
        });
      } catch (err) {
        // P2002 = another instance created the row between our findFirst and
        // create (overlapping Railway boots). Benign — skip and continue so one
        // collision doesn't abort the rest of the loop.
        if ((err as { code?: string })?.code === 'P2002') continue;
        throw err;
      }
      totalCreated += 1;
      createdByWeek[week.weekNumber] = (createdByWeek[week.weekNumber] ?? 0) + 1;
    }
  }

  if (totalCreated === 0) return;

  console.log(`[Week Migration] Created ${totalCreated} missing DictionaryWord rows:`);
  for (const [wk, n] of Object.entries(createdByWeek)) {
    console.log(`[Week Migration]   week ${wk}: +${n} dictionary words`);
  }
  console.log('[Week Migration] Done.');
}
