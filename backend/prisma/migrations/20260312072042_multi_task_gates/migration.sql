/*
  Warnings:

  - You are about to drop the column `taskGateIndex` on the `class_week_unlocks` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "class_week_unlocks" DROP COLUMN "taskGateIndex",
ADD COLUMN     "taskGates" INTEGER[] DEFAULT ARRAY[]::INTEGER[];
