-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "expiresAt" DATETIME NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" DATETIME,
    "refreshTokenExpiresAt" DATETIME,
    "scope" TEXT,
    "password" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Verification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "GameSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "owner_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "Tournament" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "session_id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'waiting',
    "current_round" INTEGER NOT NULL DEFAULT 1,
    "current_picker_index" INTEGER NOT NULL DEFAULT 0,
    "winning_song_id" TEXT,
    "eliminated_song_ids" TEXT NOT NULL DEFAULT '[]',
    "created_at" INTEGER NOT NULL,
    CONSTRAINT "Tournament_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "GameSession" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "session_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "spotify_device_id" TEXT,
    "is_owner" INTEGER NOT NULL DEFAULT 0,
    "join_order" INTEGER NOT NULL,
    "created_at" INTEGER NOT NULL,
    CONSTRAINT "Player_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "GameSession" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Song" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tournament_id" TEXT NOT NULL,
    "round_number" INTEGER NOT NULL,
    "spotify_id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "start_time" INTEGER NOT NULL,
    "song_name" TEXT NOT NULL,
    "artist_name" TEXT NOT NULL,
    "image_url" TEXT,
    "created_at" INTEGER NOT NULL,
    CONSTRAINT "Song_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "Tournament" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Song_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "Player" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TournamentMatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tournament_id" TEXT NOT NULL,
    "round_number" INTEGER NOT NULL,
    "match_number" INTEGER NOT NULL,
    "song_a_id" TEXT,
    "song_b_id" TEXT,
    "winner_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "votes_a" INTEGER NOT NULL DEFAULT 0,
    "votes_b" INTEGER NOT NULL DEFAULT 0,
    "currently_playing_song_id" TEXT,
    "created_at" INTEGER NOT NULL,
    CONSTRAINT "TournamentMatch_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "Tournament" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TournamentMatch_song_a_id_fkey" FOREIGN KEY ("song_a_id") REFERENCES "Song" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "TournamentMatch_song_b_id_fkey" FOREIGN KEY ("song_b_id") REFERENCES "Song" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "TournamentMatch_currently_playing_song_id_fkey" FOREIGN KEY ("currently_playing_song_id") REFERENCES "Song" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Vote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "match_id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "song_id" TEXT NOT NULL,
    "created_at" INTEGER NOT NULL,
    CONSTRAINT "Vote_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "TournamentMatch" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Vote_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "Player" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Vote_song_id_fkey" FOREIGN KEY ("song_id") REFERENCES "Song" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE INDEX "Verification_identifier_idx" ON "Verification"("identifier");

-- CreateIndex
CREATE INDEX "idx_sessions_owner" ON "GameSession"("owner_id");

-- CreateIndex
CREATE INDEX "idx_tournaments_session" ON "Tournament"("session_id");

-- CreateIndex
CREATE INDEX "idx_players_session" ON "Player"("session_id");

-- CreateIndex
CREATE INDEX "idx_songs_tournament" ON "Song"("tournament_id");

-- CreateIndex
CREATE INDEX "idx_songs_round" ON "Song"("tournament_id", "round_number");

-- CreateIndex
CREATE INDEX "idx_matches_tournament" ON "TournamentMatch"("tournament_id");

-- CreateIndex
CREATE INDEX "idx_matches_round" ON "TournamentMatch"("tournament_id", "round_number");

-- CreateIndex
CREATE INDEX "idx_votes_match" ON "Vote"("match_id");

-- CreateIndex
CREATE UNIQUE INDEX "votes_match_id_player_id_key" ON "Vote"("match_id", "player_id");
