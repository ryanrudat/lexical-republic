import prisma from './prisma';

export async function getCurrentWeekNumberForPair(pairId: string): Promise<number> {
  const [latestScore, latestResult] = await Promise.all([
    prisma.missionScore.findFirst({
      where: { pairId },
      include: { mission: { include: { week: { select: { weekNumber: true } } } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.shiftResult.findFirst({
      where: { pairId },
      orderBy: { weekNumber: 'desc' },
      select: { weekNumber: true },
    }),
  ]);

  return Math.max(
    latestScore?.mission?.week?.weekNumber ?? 0,
    latestResult?.weekNumber ?? 0,
    1,
  );
}
