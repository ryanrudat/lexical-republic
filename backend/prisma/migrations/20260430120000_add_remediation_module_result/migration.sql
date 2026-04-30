-- CreateTable
CREATE TABLE "remediation_module_results" (
    "id" TEXT NOT NULL,
    "pairId" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "triggerReason" TEXT NOT NULL,
    "concernAtTrigger" DOUBLE PRECISION NOT NULL,
    "concernAfterCooldown" DOUBLE PRECISION,
    "questions" JSONB NOT NULL,
    "results" JSONB,
    "correctCount" INTEGER,
    "totalCount" INTEGER NOT NULL DEFAULT 3,
    "clawedBack" BOOLEAN NOT NULL DEFAULT false,
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "remediation_module_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "remediation_module_results_pairId_weekNumber_idx" ON "remediation_module_results"("pairId", "weekNumber");

-- AddForeignKey
ALTER TABLE "remediation_module_results" ADD CONSTRAINT "remediation_module_results_pairId_fkey" FOREIGN KEY ("pairId") REFERENCES "pairs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
