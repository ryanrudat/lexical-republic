-- AlterTable
ALTER TABLE "pairs" ADD COLUMN     "clearanceLevel" TEXT NOT NULL DEFAULT 'PROBATIONARY',
ADD COLUMN     "consecutiveQualifyingShifts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "harmonyUnlockedAt" TIMESTAMP(3),
ADD COLUMN     "laneLocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "suggestedLane" INTEGER;

-- CreateTable
CREATE TABLE "character_messages" (
    "id" TEXT NOT NULL,
    "pairId" TEXT NOT NULL,
    "characterName" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "messageText" TEXT NOT NULL,
    "replyType" TEXT NOT NULL DEFAULT 'canned',
    "replyOptions" JSONB,
    "triggerType" TEXT NOT NULL,
    "triggerConfig" JSONB NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "studentReply" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "character_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "citizen_4488_interactions" (
    "id" TEXT NOT NULL,
    "pairId" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "context" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "citizen_4488_interactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shift_results" (
    "id" TEXT NOT NULL,
    "pairId" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "documentsProcessed" INTEGER NOT NULL DEFAULT 0,
    "documentsTotal" INTEGER NOT NULL DEFAULT 0,
    "errorsFound" INTEGER NOT NULL DEFAULT 0,
    "errorsTotal" INTEGER NOT NULL DEFAULT 0,
    "vocabScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "grammarAccuracy" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "targetWordsUsed" INTEGER NOT NULL DEFAULT 0,
    "concernScoreDelta" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taskResults" JSONB NOT NULL DEFAULT '{}',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shift_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "citizen_4488_interactions_pairId_weekNumber_key" ON "citizen_4488_interactions"("pairId", "weekNumber");

-- CreateIndex
CREATE UNIQUE INDEX "shift_results_pairId_weekNumber_key" ON "shift_results"("pairId", "weekNumber");

-- AddForeignKey
ALTER TABLE "character_messages" ADD CONSTRAINT "character_messages_pairId_fkey" FOREIGN KEY ("pairId") REFERENCES "pairs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "citizen_4488_interactions" ADD CONSTRAINT "citizen_4488_interactions_pairId_fkey" FOREIGN KEY ("pairId") REFERENCES "pairs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_results" ADD CONSTRAINT "shift_results_pairId_fkey" FOREIGN KEY ("pairId") REFERENCES "pairs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
