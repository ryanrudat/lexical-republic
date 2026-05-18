import prisma from './prisma';
import { getWeekConfig } from '../data/week-configs';

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
