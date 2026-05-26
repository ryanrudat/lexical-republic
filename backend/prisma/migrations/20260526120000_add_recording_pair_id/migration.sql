-- AlterTable: attribute live-pool opponent desks to a real classmate Pair.
-- Null for the self desk, ghost desks, and Ministry NPC desks.
ALTER TABLE "inscription_recordings" ADD COLUMN "pairId" TEXT;

-- CreateIndex
CREATE INDEX "inscription_recordings_pairId_idx" ON "inscription_recordings"("pairId");
