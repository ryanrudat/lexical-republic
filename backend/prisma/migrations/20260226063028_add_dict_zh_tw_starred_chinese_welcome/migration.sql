-- DropForeignKey
ALTER TABLE "class_enrollments" DROP CONSTRAINT "class_enrollments_userId_fkey";

-- DropForeignKey
ALTER TABLE "harmony_posts" DROP CONSTRAINT "harmony_posts_userId_fkey";

-- DropForeignKey
ALTER TABLE "mission_scores" DROP CONSTRAINT "mission_scores_userId_fkey";

-- DropForeignKey
ALTER TABLE "narrative_choices" DROP CONSTRAINT "narrative_choices_userId_fkey";

-- DropForeignKey
ALTER TABLE "pearl_conversations" DROP CONSTRAINT "pearl_conversations_userId_fkey";

-- DropForeignKey
ALTER TABLE "recordings" DROP CONSTRAINT "recordings_userId_fkey";

-- AlterTable
ALTER TABLE "dictionary_words" ADD COLUMN     "translationZhTw" TEXT;

-- AlterTable
ALTER TABLE "pair_dictionary_progress" ADD COLUMN     "chineseRevealed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "starred" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "pairs" ADD COLUMN     "hasWatchedWelcome" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "recordings" ADD CONSTRAINT "recordings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mission_scores" ADD CONSTRAINT "mission_scores_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pearl_conversations" ADD CONSTRAINT "pearl_conversations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "narrative_choices" ADD CONSTRAINT "narrative_choices_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "harmony_posts" ADD CONSTRAINT "harmony_posts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_enrollments" ADD CONSTRAINT "class_enrollments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
