-- AlterTable
ALTER TABLE "pairs" ADD COLUMN     "citizenNumber" TEXT,
ADD COLUMN     "inscriptionSoloCounterDate" TEXT,
ADD COLUMN     "inscriptionSoloPiAwardsToday" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastInscriptionDrillCompletedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "inscription_drills" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "pairId" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "lane" INTEGER NOT NULL,
    "mode" TEXT NOT NULL,
    "durationSec" INTEGER NOT NULL,
    "wordCount" INTEGER NOT NULL,
    "poolStrategy" TEXT NOT NULL,
    "wordQueue" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pausedAt" TIMESTAMP(3),
    "totalPausedMs" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "finalRank" INTEGER,
    "piAwarded" INTEGER NOT NULL DEFAULT 0,
    "piCapped" BOOLEAN NOT NULL DEFAULT false,
    "commendationTier" TEXT,
    "lobbyId" TEXT,

    CONSTRAINT "inscription_drills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inscription_recordings" (
    "id" TEXT NOT NULL,
    "drillId" TEXT NOT NULL,
    "isGhost" BOOLEAN NOT NULL DEFAULT false,
    "sourceDrillId" TEXT,
    "citizenNumber" TEXT NOT NULL,
    "desk" INTEGER NOT NULL,
    "wordTimings" JSONB NOT NULL,
    "keystrokeLog" JSONB NOT NULL,
    "wordsCorrect" INTEGER NOT NULL DEFAULT 0,
    "finalRank" INTEGER,
    "finishedAt_ms" INTEGER,

    CONSTRAINT "inscription_recordings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inscription_lobbies" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "lane" INTEGER NOT NULL,
    "mode" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "drillId" TEXT,
    "startedAt" TIMESTAMP(3),
    "pausedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inscription_lobbies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sector_trial_templates" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "durationSecLane2" INTEGER NOT NULL DEFAULT 90,
    "wordCount" INTEGER NOT NULL DEFAULT 15,
    "poolStrategy" TEXT NOT NULL DEFAULT 'recent',
    "placement" TEXT NOT NULL DEFAULT 'after_shift_report',
    "scheduledAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sector_trial_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "inscription_drills_classId_completedAt_idx" ON "inscription_drills"("classId", "completedAt");

-- CreateIndex
CREATE INDEX "inscription_drills_pairId_startedAt_idx" ON "inscription_drills"("pairId", "startedAt");

-- CreateIndex
CREATE INDEX "inscription_drills_classId_weekNumber_lane_idx" ON "inscription_drills"("classId", "weekNumber", "lane");

-- CreateIndex
CREATE INDEX "inscription_recordings_drillId_idx" ON "inscription_recordings"("drillId");

-- CreateIndex
CREATE INDEX "inscription_recordings_sourceDrillId_idx" ON "inscription_recordings"("sourceDrillId");

-- CreateIndex
CREATE INDEX "inscription_lobbies_classId_status_lane_idx" ON "inscription_lobbies"("classId", "status", "lane");

-- CreateIndex
CREATE INDEX "sector_trial_templates_classId_weekNumber_idx" ON "sector_trial_templates"("classId", "weekNumber");

-- AddForeignKey
ALTER TABLE "inscription_drills" ADD CONSTRAINT "inscription_drills_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inscription_drills" ADD CONSTRAINT "inscription_drills_pairId_fkey" FOREIGN KEY ("pairId") REFERENCES "pairs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inscription_recordings" ADD CONSTRAINT "inscription_recordings_drillId_fkey" FOREIGN KEY ("drillId") REFERENCES "inscription_drills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inscription_lobbies" ADD CONSTRAINT "inscription_lobbies_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sector_trial_templates" ADD CONSTRAINT "sector_trial_templates_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

