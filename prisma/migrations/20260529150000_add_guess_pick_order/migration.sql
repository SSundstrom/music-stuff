-- AlterTable
ALTER TABLE "GuessConfig" ADD COLUMN     "pickOrder" TEXT[] DEFAULT ARRAY[]::TEXT[];
