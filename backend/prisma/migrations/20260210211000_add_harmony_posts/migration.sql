-- CreateEnum
CREATE TYPE "HarmonyStatus" AS ENUM ('pending_review', 'approved', 'flagged', 'redacted');

-- CreateTable
CREATE TABLE "harmony_posts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" "HarmonyStatus" NOT NULL DEFAULT 'pending_review',
    "pearlNote" TEXT,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "harmony_posts_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "harmony_posts" ADD CONSTRAINT "harmony_posts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "harmony_posts" ADD CONSTRAINT "harmony_posts_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "harmony_posts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
