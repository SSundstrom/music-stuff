-- AlterTable
ALTER TABLE "GuessConfig" ADD COLUMN     "guessingVolume" INTEGER NOT NULL DEFAULT 80,
ADD COLUMN     "betweenVolume" INTEGER NOT NULL DEFAULT 30;
