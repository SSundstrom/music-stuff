/*
  Warnings:

  - You are about to drop the column `betweenVolume` on the `GuessConfig` table. All the data in the column will be lost.
  - You are about to drop the column `guessingVolume` on the `GuessConfig` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "GuessConfig" DROP COLUMN "betweenVolume",
DROP COLUMN "guessingVolume";
