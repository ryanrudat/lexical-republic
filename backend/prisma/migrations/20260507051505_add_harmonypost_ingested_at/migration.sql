-- AlterTable
ALTER TABLE "harmony_posts" ADD COLUMN     "ingestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Backfill: existing rows get ingestedAt = createdAt so they don't all show as NEW after deploy.
-- New rows continue to default to now() at insert time.
UPDATE "harmony_posts" SET "ingestedAt" = "createdAt";
