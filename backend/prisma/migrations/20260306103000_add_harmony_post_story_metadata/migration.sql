-- AlterTable
ALTER TABLE "harmony_posts"
ADD COLUMN IF NOT EXISTS "authorLabel" TEXT,
ADD COLUMN IF NOT EXISTS "weekNumber" INTEGER;
