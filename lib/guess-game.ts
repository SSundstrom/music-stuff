import prisma from "./db-prisma";
import { v4 as uuidv4 } from "uuid";
import { shuffle } from "./arrayHelper";
import { sseManager } from "./sse-manager";
import { calculateScore } from "./guess-scoring";
import type {
  GuessConfig,
  GuessTurn,
  PlayerScore,
  GuessState,
  SSEMessage,
} from "@/types/game";

export async function getOrCreateGuessConfig(
  sessionId: string,
): Promise<GuessConfig> {
  const existing = await prisma.guessConfig.findUnique({
    where: { sessionId },
  });
  if (existing) return existing;

  return await prisma.guessConfig.create({
    data: {
      id: uuidv4(),
      sessionId,
      guessTimeSec: 30,
      hostPlays: false,
    },
  });
}

export async function updateGuessConfig(
  sessionId: string,
  updates: { guessTimeSec?: number; maxRounds?: number | null; hostPlays?: boolean },
): Promise<GuessConfig> {
  const config = await getOrCreateGuessConfig(sessionId);
  return await prisma.guessConfig.update({
    where: { id: config.id },
    data: updates,
  });
}

export async function startGuessGame(sessionId: string): Promise<GuessTurn> {
  const config = await getOrCreateGuessConfig(sessionId);
  const players = await prisma.player.findMany({
    where: { sessionId },
    orderBy: { joinOrder: "asc" },
  });

  const eligiblePlayers = config.hostPlays
    ? players
    : players.filter((p) => !p.isOwner);

  if (eligiblePlayers.length < 2) {
    throw new Error("Need at least 2 eligible players to start");
  }

  const [firstPicker] = shuffle(eligiblePlayers);

  const turn = await prisma.guessTurn.create({
    data: {
      id: uuidv4(),
      sessionId,
      roundNumber: 1,
      turnNumber: 1,
      pickerId: firstPicker.id,
      status: "picking",
      createdAt: new Date(),
    },
  });

  sseManager.broadcast(sessionId, {
    type: "guess_game_started",
    data: {
      pickerId: firstPicker.id,
      playerName: firstPicker.name,
      roundNumber: 1,
      turnNumber: 1,
    },
  } satisfies SSEMessage);

  return turn;
}

export async function selectNextPicker(
  sessionId: string,
): Promise<{ picker: { id: string; name: string }; roundNumber: number; turnNumber: number }> {
  const [config, players, turns] = await Promise.all([
    getOrCreateGuessConfig(sessionId),
    prisma.player.findMany({ where: { sessionId }, orderBy: { joinOrder: "asc" } }),
    prisma.guessTurn.findMany({
      where: { sessionId },
      orderBy: { turnNumber: "desc" },
      take: 1,
    }),
  ]);

  const lastTurn = turns[0];
  const currentRound = lastTurn?.roundNumber ?? 1;
  const nextTurnNumber = (lastTurn?.turnNumber ?? 0) + 1;

  const eligiblePlayers = config.hostPlays
    ? players
    : players.filter((p) => !p.isOwner);

  // Find who has already picked this round
  const pickersThisRound = await prisma.guessTurn.findMany({
    where: { sessionId, roundNumber: currentRound },
    select: { pickerId: true },
  });
  const pickedIds = new Set(pickersThisRound.map((t) => t.pickerId));

  let remaining = eligiblePlayers.filter((p) => !pickedIds.has(p.id));
  let roundNumber = currentRound;

  // If everyone has picked, start a new round
  if (remaining.length === 0) {
    roundNumber = currentRound + 1;
    remaining = eligiblePlayers;
  }

  const [nextPicker] = shuffle(remaining);

  return {
    picker: { id: nextPicker.id, name: nextPicker.name },
    roundNumber,
    turnNumber: nextTurnNumber,
  };
}

export async function submitPickedSong(
  guessTurnId: string,
  songData: {
    spotifyId: string;
    songName: string;
    artistName: string;
    startTime: number;
    imageUrl?: string | null;
  },
): Promise<GuessTurn> {
  const turn = await prisma.guessTurn.update({
    where: { id: guessTurnId },
    data: {
      spotifyId: songData.spotifyId,
      songName: songData.songName,
      artistName: songData.artistName,
      startTime: songData.startTime,
      imageUrl: songData.imageUrl ?? null,
      status: "countdown",
    },
  });

  sseManager.broadcast(turn.sessionId, {
    type: "guess_song_picked",
    data: { guessTurnId },
  } satisfies SSEMessage);

  return turn;
}

export async function startGuessingPhase(
  guessTurnId: string,
): Promise<{ endsAt: Date }> {
  const turn = await prisma.guessTurn.findUnique({
    where: { id: guessTurnId },
  });
  if (!turn) throw new Error("Turn not found");

  const config = await getOrCreateGuessConfig(turn.sessionId);
  const now = new Date();
  const endsAt = new Date(now.getTime() + config.guessTimeSec * 1000);

  await prisma.guessTurn.update({
    where: { id: guessTurnId },
    data: {
      status: "guessing",
      guessingStartedAt: now,
    },
  });

  sseManager.broadcast(turn.sessionId, {
    type: "guess_phase_started",
    data: {
      guessTurnId,
      endsAt: endsAt.toISOString(),
    },
  } satisfies SSEMessage);

  return { endsAt };
}

export async function processGuess(
  guessTurnId: string,
  playerId: string,
  guessData: { spotifyId: string; songName: string; artistName: string },
): Promise<{ songCorrect: boolean; artistCorrect: boolean; points: number }> {
  const [turn, config, player] = await Promise.all([
    prisma.guessTurn.findUnique({ where: { id: guessTurnId } }),
    prisma.guessTurn
      .findUnique({ where: { id: guessTurnId } })
      .then((t) => (t ? getOrCreateGuessConfig(t.sessionId) : null)),
    prisma.player.findUnique({ where: { id: playerId } }),
  ]);

  if (!turn || !config || !player) throw new Error("Turn, config, or player not found");
  if (turn.status !== "guessing") throw new Error("Not in guessing phase");
  if (turn.pickerId === playerId) throw new Error("Picker cannot guess");
  if (!turn.spotifyId || !turn.artistName) throw new Error("No song set for this turn");

  const now = new Date();
  const scoreResult = calculateScore({
    guessSpotifyId: guessData.spotifyId,
    guessArtistName: guessData.artistName,
    correctSpotifyId: turn.spotifyId,
    correctArtistName: turn.artistName,
    guessTimestamp: now,
    phaseStartTimestamp: turn.guessingStartedAt ?? now,
    guessTimeSec: config.guessTimeSec,
  });

  await prisma.guess.upsert({
    where: { guessTurnId_playerId: { guessTurnId, playerId } },
    update: {
      spotifyId: guessData.spotifyId,
      songName: guessData.songName,
      artistName: guessData.artistName,
      guessedAt: now,
      songCorrect: scoreResult.songCorrect,
      artistCorrect: scoreResult.artistCorrect,
      points: scoreResult.points,
    },
    create: {
      id: uuidv4(),
      guessTurnId,
      playerId,
      spotifyId: guessData.spotifyId,
      songName: guessData.songName,
      artistName: guessData.artistName,
      guessedAt: now,
      songCorrect: scoreResult.songCorrect,
      artistCorrect: scoreResult.artistCorrect,
      points: scoreResult.points,
      createdAt: now,
    },
  });

  sseManager.broadcast(turn.sessionId, {
    type: "guess_submitted",
    data: { playerId, playerName: player.name },
  } satisfies SSEMessage);

  // Check if all eligible players have guessed
  const allPlayers = await prisma.player.findMany({
    where: { sessionId: turn.sessionId },
  });
  const eligibleGuessers = config.hostPlays
    ? allPlayers.filter((p) => p.id !== turn.pickerId)
    : allPlayers.filter((p) => !p.isOwner && p.id !== turn.pickerId);

  const guessCount = await prisma.guess.count({ where: { guessTurnId } });

  if (guessCount >= eligibleGuessers.length) {
    await endGuessingPhase(guessTurnId);
  }

  return scoreResult;
}

export async function endGuessingPhase(guessTurnId: string): Promise<void> {
  const turn = await prisma.guessTurn.findUnique({
    where: { id: guessTurnId },
    include: { guesses: { include: { player: true } } },
  });
  if (!turn) throw new Error("Turn not found");

  await prisma.guessTurn.update({
    where: { id: guessTurnId },
    data: { status: "scoreboard" },
  });

  sseManager.broadcast(turn.sessionId, {
    type: "guess_turn_ended",
    data: {
      song: {
        spotifyId: turn.spotifyId ?? "",
        songName: turn.songName ?? "",
        artistName: turn.artistName ?? "",
        imageUrl: turn.imageUrl,
      },
      results: turn.guesses.map((g) => ({
        playerId: g.playerId,
        playerName: g.player.name,
        songName: g.songName,
        artistName: g.artistName,
        songCorrect: g.songCorrect,
        artistCorrect: g.artistCorrect,
        points: g.points,
      })),
    },
  } satisfies SSEMessage);
}

export async function advanceToNextTurn(
  sessionId: string,
): Promise<{ ended: boolean }> {
  const config = await getOrCreateGuessConfig(sessionId);
  const { picker, roundNumber, turnNumber } =
    await selectNextPicker(sessionId);

  // Check if we've exceeded maxRounds
  if (config.maxRounds && roundNumber > config.maxRounds) {
    const scores = await getScores(sessionId);
    sseManager.broadcast(sessionId, {
      type: "guess_game_ended",
      data: { scores },
    } satisfies SSEMessage);
    return { ended: true };
  }

  await prisma.guessTurn.create({
    data: {
      id: uuidv4(),
      sessionId,
      roundNumber,
      turnNumber,
      pickerId: picker.id,
      status: "picking",
      createdAt: new Date(),
    },
  });

  sseManager.broadcast(sessionId, {
    type: "guess_picker_selected",
    data: {
      pickerId: picker.id,
      playerName: picker.name,
      roundNumber,
      turnNumber,
    },
  } satisfies SSEMessage);

  return { ended: false };
}

export async function getScores(sessionId: string): Promise<PlayerScore[]> {
  const players = await prisma.player.findMany({
    where: { sessionId },
    include: {
      guesses: {
        where: { guessTurn: { sessionId } },
      },
    },
  });

  return players.map((player) => ({
    playerId: player.id,
    playerName: player.name,
    totalPoints: player.guesses.reduce((sum, g) => sum + g.points, 0),
    correctSongs: player.guesses.filter((g) => g.songCorrect).length,
    correctArtists: player.guesses.filter(
      (g) => g.artistCorrect && !g.songCorrect,
    ).length,
  }));
}

export async function getGuessState(sessionId: string): Promise<GuessState> {
  const [config, currentTurn, scores] = await Promise.all([
    prisma.guessConfig.findUnique({ where: { sessionId } }),
    prisma.guessTurn.findFirst({
      where: { sessionId },
      orderBy: { turnNumber: "desc" },
    }),
    getScores(sessionId),
  ]);

  // Determine status
  let status: "lobby" | "playing" | "ended" = "lobby";
  if (currentTurn) {
    // Check if game has ended (last turn is scoreboard and we've hit maxRounds)
    const isLastRound =
      config?.maxRounds && currentTurn.roundNumber >= config.maxRounds;
    const allPickedThisRound = await prisma.player
      .findMany({ where: { sessionId } })
      .then(async (players) => {
        const eligible = config?.hostPlays
          ? players
          : players.filter((p) => !p.isOwner);
        const pickedCount = await prisma.guessTurn.count({
          where: { sessionId, roundNumber: currentTurn.roundNumber },
        });
        return pickedCount >= eligible.length;
      });

    if (
      isLastRound &&
      allPickedThisRound &&
      currentTurn.status === "scoreboard"
    ) {
      status = "ended";
    } else {
      status = "playing";
    }
  }

  return {
    config,
    currentTurn,
    scores,
    status,
  };
}
