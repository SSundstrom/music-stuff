-- CreateEnum
CREATE TYPE "GameType" AS ENUM ('tournament', 'guess_the_song');

-- CreateEnum
CREATE TYPE "GuessTurnStatus" AS ENUM ('picking', 'countdown', 'guessing', 'scoreboard');

-- AlterTable
ALTER TABLE "GameSession" ADD COLUMN     "gameType" "GameType" NOT NULL DEFAULT 'tournament';

-- CreateTable
CREATE TABLE "GuessConfig" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "maxRounds" INTEGER,
    "guessTimeSec" INTEGER NOT NULL DEFAULT 30,
    "hostPlays" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "GuessConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuessTurn" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "turnNumber" INTEGER NOT NULL,
    "pickerId" TEXT NOT NULL,
    "spotifyId" TEXT,
    "songName" TEXT,
    "artistName" TEXT,
    "imageUrl" TEXT,
    "startTime" INTEGER NOT NULL DEFAULT 0,
    "status" "GuessTurnStatus" NOT NULL DEFAULT 'picking',
    "guessingStartedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuessTurn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Guess" (
    "id" TEXT NOT NULL,
    "guessTurnId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "spotifyId" TEXT NOT NULL,
    "songName" TEXT NOT NULL,
    "artistName" TEXT NOT NULL,
    "guessedAt" TIMESTAMP(3) NOT NULL,
    "songCorrect" BOOLEAN NOT NULL DEFAULT false,
    "artistCorrect" BOOLEAN NOT NULL DEFAULT false,
    "points" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Guess_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GuessConfig_sessionId_key" ON "GuessConfig"("sessionId");

-- CreateIndex
CREATE INDEX "GuessTurn_sessionId_idx" ON "GuessTurn"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "GuessTurn_sessionId_turnNumber_key" ON "GuessTurn"("sessionId", "turnNumber");

-- CreateIndex
CREATE INDEX "Guess_guessTurnId_idx" ON "Guess"("guessTurnId");

-- CreateIndex
CREATE UNIQUE INDEX "Guess_guessTurnId_playerId_key" ON "Guess"("guessTurnId", "playerId");

-- AddForeignKey
ALTER TABLE "GuessConfig" ADD CONSTRAINT "GuessConfig_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "GameSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuessTurn" ADD CONSTRAINT "GuessTurn_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "GameSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuessTurn" ADD CONSTRAINT "GuessTurn_pickerId_fkey" FOREIGN KEY ("pickerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Guess" ADD CONSTRAINT "Guess_guessTurnId_fkey" FOREIGN KEY ("guessTurnId") REFERENCES "GuessTurn"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Guess" ADD CONSTRAINT "Guess_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
