-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "WordStatus" AS ENUM ('approved', 'monitored', 'grey', 'proscribed', 'recovered');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "dictionary_words" (
    "id" TEXT NOT NULL,
    "word" TEXT NOT NULL,
    "partOfSpeech" TEXT NOT NULL DEFAULT 'noun',
    "phonetic" TEXT NOT NULL DEFAULT '',
    "partyDefinition" TEXT NOT NULL,
    "trueDefinition" TEXT NOT NULL DEFAULT '',
    "exampleSentence" TEXT NOT NULL DEFAULT '',
    "toeicCategory" TEXT NOT NULL DEFAULT '',
    "wordFamilyGroup" TEXT,
    "weekIntroduced" INTEGER NOT NULL,
    "initialStatus" "WordStatus" NOT NULL DEFAULT 'approved',
    "isWorldBuilding" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dictionary_words_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "pair_dictionary_progress" (
    "id" TEXT NOT NULL,
    "pairId" TEXT NOT NULL,
    "wordId" TEXT NOT NULL,
    "status" "WordStatus" NOT NULL DEFAULT 'approved',
    "mastery" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "encounters" INTEGER NOT NULL DEFAULT 0,
    "isRecovered" BOOLEAN NOT NULL DEFAULT false,
    "studentNotes" TEXT NOT NULL DEFAULT '',
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pair_dictionary_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "word_status_events" (
    "id" TEXT NOT NULL,
    "wordId" TEXT NOT NULL,
    "fromStatus" "WordStatus" NOT NULL,
    "toStatus" "WordStatus" NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "word_status_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "word_families" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "rootWord" TEXT NOT NULL,
    "members" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "word_families_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "dictionary_words_word_weekIntroduced_key" ON "dictionary_words"("word", "weekIntroduced");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "pair_dictionary_progress_pairId_wordId_key" ON "pair_dictionary_progress"("pairId", "wordId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "word_families_groupId_key" ON "word_families"("groupId");

-- AddForeignKey
ALTER TABLE "pair_dictionary_progress" ADD CONSTRAINT "pair_dictionary_progress_pairId_fkey" FOREIGN KEY ("pairId") REFERENCES "pairs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pair_dictionary_progress" ADD CONSTRAINT "pair_dictionary_progress_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "dictionary_words"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "word_status_events" ADD CONSTRAINT "word_status_events_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "dictionary_words"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
