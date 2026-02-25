-- CreateTable
CREATE TABLE "pairs" (
    "id" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "pin" TEXT NOT NULL,
    "studentAName" TEXT NOT NULL,
    "studentBName" TEXT NOT NULL DEFAULT '',
    "lane" INTEGER NOT NULL DEFAULT 2,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "concernScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pairs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pairs_designation_key" ON "pairs"("designation");

-- AlterTable: Make userId nullable on student tables
ALTER TABLE "recordings" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "mission_scores" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "harmony_posts" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "pearl_conversations" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "narrative_choices" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "class_enrollments" ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable: Add pairId columns
ALTER TABLE "recordings" ADD COLUMN "pairId" TEXT;
ALTER TABLE "mission_scores" ADD COLUMN "pairId" TEXT;
ALTER TABLE "harmony_posts" ADD COLUMN "pairId" TEXT;
ALTER TABLE "pearl_conversations" ADD COLUMN "pairId" TEXT;
ALTER TABLE "narrative_choices" ADD COLUMN "pairId" TEXT;
ALTER TABLE "class_enrollments" ADD COLUMN "pairId" TEXT;

-- CreateIndex: unique constraints for pair-based lookups
CREATE UNIQUE INDEX "mission_scores_pairId_missionId_key" ON "mission_scores"("pairId", "missionId");
CREATE UNIQUE INDEX "class_enrollments_pairId_classId_key" ON "class_enrollments"("pairId", "classId");

-- AddForeignKey
ALTER TABLE "recordings" ADD CONSTRAINT "recordings_pairId_fkey" FOREIGN KEY ("pairId") REFERENCES "pairs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "mission_scores" ADD CONSTRAINT "mission_scores_pairId_fkey" FOREIGN KEY ("pairId") REFERENCES "pairs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "harmony_posts" ADD CONSTRAINT "harmony_posts_pairId_fkey" FOREIGN KEY ("pairId") REFERENCES "pairs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "pearl_conversations" ADD CONSTRAINT "pearl_conversations_pairId_fkey" FOREIGN KEY ("pairId") REFERENCES "pairs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "narrative_choices" ADD CONSTRAINT "narrative_choices_pairId_fkey" FOREIGN KEY ("pairId") REFERENCES "pairs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "class_enrollments" ADD CONSTRAINT "class_enrollments_pairId_fkey" FOREIGN KEY ("pairId") REFERENCES "pairs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
