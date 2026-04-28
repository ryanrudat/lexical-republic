-- CreateTable
CREATE TABLE "compliance_check_results" (
    "id" TEXT NOT NULL,
    "pairId" TEXT NOT NULL,
    "teacherId" TEXT,
    "classId" TEXT,
    "weekIssued" INTEGER NOT NULL,
    "questions" JSONB NOT NULL,
    "results" JSONB,
    "correctCount" INTEGER,
    "totalCount" INTEGER NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "compliance_check_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "compliance_check_results_pairId_idx" ON "compliance_check_results"("pairId");

-- CreateIndex
CREATE INDEX "compliance_check_results_classId_weekIssued_idx" ON "compliance_check_results"("classId", "weekIssued");

-- AddForeignKey
ALTER TABLE "compliance_check_results" ADD CONSTRAINT "compliance_check_results_pairId_fkey" FOREIGN KEY ("pairId") REFERENCES "pairs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_check_results" ADD CONSTRAINT "compliance_check_results_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
