-- Safe migration: consolidate partyDefinition + trueDefinition into definition
-- Step 1: Add definition column as nullable
ALTER TABLE "dictionary_words" ADD COLUMN "definition" TEXT;

-- Step 2: Copy existing data (prefer trueDefinition, fall back to partyDefinition)
UPDATE "dictionary_words" SET "definition" = COALESCE("trueDefinition", "partyDefinition", '');

-- Step 3: Make definition NOT NULL
ALTER TABLE "dictionary_words" ALTER COLUMN "definition" SET NOT NULL;

-- Step 4: Drop old columns
ALTER TABLE "dictionary_words" DROP COLUMN "partyDefinition";
ALTER TABLE "dictionary_words" DROP COLUMN "trueDefinition";
