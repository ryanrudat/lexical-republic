import prisma from './prisma';

/**
 * Boot-time recovery for inscription drills.
 *
 * Mirror of `ensureQueueMissionsForAllWeeks` pattern: idempotent, fire-and-forget,
 * runs on every backend start.
 *
 * On Railway redeploys, in-memory socket state is wiped. Drills that were `active`
 * at the moment of restart have no chance of reconnecting. We mark any active drill
 * that hasn't had activity in the last 5 minutes as abandoned to free students from
 * "concurrent active drill" errors after the bounce.
 *
 * Active lobbies are similarly closed if they predate the most recent boot by more
 * than the lobby expiry window.
 */
export async function recoverAbandonedInscriptionDrills(): Promise<void> {
  const cutoff = new Date(Date.now() - 5 * 60 * 1000);
  try {
    const result = await prisma.inscriptionDrill.updateMany({
      where: {
        status: 'active',
        startedAt: { lt: cutoff },
      },
      data: {
        status: 'abandoned',
        completedAt: new Date(),
      },
    });
    if (result.count > 0) {
      console.log(`[inscription] Recovered ${result.count} orphaned active drill(s) from prior boot.`);
    }
  } catch (err) {
    console.error('[inscription] Drill recovery failed:', err);
  }

  try {
    const closed = await prisma.inscriptionLobby.updateMany({
      where: {
        status: { in: ['waiting', 'countdown', 'active'] },
        expiresAt: { lt: new Date() },
      },
      data: { status: 'closed' },
    });
    if (closed.count > 0) {
      console.log(`[inscription] Closed ${closed.count} expired lobby/lobbies.`);
    }
  } catch (err) {
    console.error('[inscription] Lobby recovery failed:', err);
  }
}
