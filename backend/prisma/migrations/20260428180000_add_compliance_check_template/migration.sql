-- CreateTable
CREATE TABLE "compliance_check_templates" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "placement" TEXT NOT NULL,
    "afterTaskId" TEXT,
    "title" TEXT,
    "words" JSONB NOT NULL,
    "questionCount" INTEGER NOT NULL DEFAULT 3,
    "cumulativeReviewCount" INTEGER NOT NULL DEFAULT 2,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compliance_check_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "compliance_check_templates_classId_weekNumber_idx" ON "compliance_check_templates"("classId", "weekNumber");

-- CreateIndex
CREATE UNIQUE INDEX "compliance_check_templates_classId_weekNumber_placement_aft_key" ON "compliance_check_templates"("classId", "weekNumber", "placement", "afterTaskId");

-- AddForeignKey
ALTER TABLE "compliance_check_templates" ADD CONSTRAINT "compliance_check_templates_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_check_templates" ADD CONSTRAINT "compliance_check_templates_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "compliance_check_results" ADD COLUMN "templateId" TEXT;

-- CreateIndex
CREATE INDEX "compliance_check_results_templateId_idx" ON "compliance_check_results"("templateId");

-- CreateIndex
CREATE UNIQUE INDEX "compliance_check_results_pairId_templateId_key" ON "compliance_check_results"("pairId", "templateId");

-- AddForeignKey
ALTER TABLE "compliance_check_results" ADD CONSTRAINT "compliance_check_results_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "compliance_check_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
