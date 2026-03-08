/*
  Warnings:

  - You are about to drop the column `partyDefinition` on the `dictionary_words` table. All the data in the column will be lost.
  - You are about to drop the column `trueDefinition` on the `dictionary_words` table. All the data in the column will be lost.
  - Added the required column `definition` to the `dictionary_words` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "dictionary_words" DROP COLUMN "partyDefinition",
DROP COLUMN "trueDefinition",
ADD COLUMN     "definition" TEXT NOT NULL;
