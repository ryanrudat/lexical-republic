-- AlterTable
ALTER TABLE "harmony_posts" ADD COLUMN     "censureData" JSONB,
ADD COLUMN     "isGenerated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "postType" TEXT NOT NULL DEFAULT 'feed';

-- CreateTable
CREATE TABLE "harmony_censure_responses" (
    "id" TEXT NOT NULL,
    "pairId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "harmony_censure_responses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "harmony_censure_responses_pairId_postId_key" ON "harmony_censure_responses"("pairId", "postId");

-- AddForeignKey
ALTER TABLE "harmony_censure_responses" ADD CONSTRAINT "harmony_censure_responses_pairId_fkey" FOREIGN KEY ("pairId") REFERENCES "pairs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "harmony_censure_responses" ADD CONSTRAINT "harmony_censure_responses_postId_fkey" FOREIGN KEY ("postId") REFERENCES "harmony_posts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
