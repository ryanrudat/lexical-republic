-- CreateTable
CREATE TABLE "clarity_check_results" (
    "id" TEXT NOT NULL,
    "pairId" TEXT NOT NULL,
    "checkId" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "totalCount" INTEGER NOT NULL DEFAULT 0,
    "correctCount" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clarity_check_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "clarity_check_results_pairId_idx" ON "clarity_check_results"("pairId");

-- CreateIndex
CREATE UNIQUE INDEX "clarity_check_results_pairId_checkId_key" ON "clarity_check_results"("pairId", "checkId");

-- AddForeignKey
ALTER TABLE "clarity_check_results" ADD CONSTRAINT "clarity_check_results_pairId_fkey" FOREIGN KEY ("pairId") REFERENCES "pairs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
