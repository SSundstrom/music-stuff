import prisma from "./db-prisma";
import { v4 as uuidv4 } from "uuid";
import { shuffle } from "./arrayHelper";
import { sseManager } from "./sse-manager";
import { calculateScore } from "./guess-scoring";
import { getTrackIsrc } from "./spotify";
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
    },
  });
}

export async function updateGuessConfig(
  sessionId: string,
  updates: { guessTimeSec?: number; maxRounds?: number | null },
): Promise<GuessConfig> {
  const config = await getOrCreateGuessConfig(sessionId);
  return await prisma.guessConfig.update({
    where: { id: config.id },
    data: updates,
  });
}

export async function startGuessGame(sessionId: string): Promise<GuessTurn> {
  const players = await prisma.player.findMany({
    where: { sessionId },
    orderBy: { joinOrder: "asc" },
  });

  if (players.length < 2) {
    throw new Error("Need at least 2 players to start");
  }

  // Find the last turn number so we don't collide with previous games on this session
  const lastTurn = await prisma.guessTurn.findFirst({
    where: { sessionId },
    orderBy: { turnNumber: "desc" },
  });
  const nextTurnNumber = (lastTurn?.turnNumber ?? 0) + 1;

  // Round 1 is random; the shuffled order becomes the fixed rotation reused for
  // every subsequent round (see selectNextPicker).
  const pickOrder = shuffle(players).map((p) => p.id);
  const config = await getOrCreateGuessConfig(sessionId);
  await prisma.guessConfig.update({
    where: { id: config.id },
    data: { pickOrder },
  });

  const firstPicker = players.find((p) => p.id === pickOrder[0])!;

  const turn = await prisma.guessTurn.create({
    data: {
      id: uuidv4(),
      sessionId,
      roundNumber: 1,
      turnNumber: nextTurnNumber,
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
      turnNumber: nextTurnNumber,
    },
  } satisfies SSEMessage);

  return turn;
}

/**
 * Returns the picking rotation for a session, healing any drift between the
 * stored order and the current player roster:
 *  - stale ids (players who left) are dropped
 *  - players missing from the order are appended (a safety net; mid-game joiners
 *    are normally placed by insertJoinedPlayerIntoPickOrder at join time)
 *  - a legacy game with no stored order is seeded from the order players have
 *    already picked in, then by join order
 * The reconciled order is persisted when it changed so it stays stable.
 */
async function ensurePickOrder(
  sessionId: string,
  configId: string,
  storedOrder: string[],
): Promise<{ id: string; name: string }[]> {
  const players = await prisma.player.findMany({
    where: { sessionId },
    orderBy: { joinOrder: "asc" },
  });
  const byId = new Map(players.map((p) => [p.id, { id: p.id, name: p.name }]));

  const order = storedOrder.filter((id) => byId.has(id));

  // Legacy/empty order: seed from the order players have already picked in.
  if (order.length === 0) {
    const priorTurns = await prisma.guessTurn.findMany({
      where: { sessionId },
      orderBy: { turnNumber: "asc" },
      select: { pickerId: true },
    });
    const seen = new Set<string>();
    for (const t of priorTurns) {
      if (byId.has(t.pickerId) && !seen.has(t.pickerId)) {
        seen.add(t.pickerId);
        order.push(t.pickerId);
      }
    }
  }

  // Append any players not yet represented (defensive — they pick last).
  const inOrder = new Set(order);
  for (const p of players) {
    if (!inOrder.has(p.id)) order.push(p.id);
  }

  if (order.length !== storedOrder.length || order.some((id, i) => id !== storedOrder[i])) {
    await prisma.guessConfig.update({ where: { id: configId }, data: { pickOrder: order } });
  }

  return order.map((id) => byId.get(id)!);
}

export async function selectNextPicker(
  sessionId: string,
): Promise<{ picker: { id: string; name: string }; roundNumber: number; turnNumber: number }> {
  const [config, lastTurn] = await Promise.all([
    getOrCreateGuessConfig(sessionId),
    prisma.guessTurn.findFirst({
      where: { sessionId },
      orderBy: { turnNumber: "desc" },
    }),
  ]);

  const order = await ensurePickOrder(sessionId, config.id, config.pickOrder);

  const currentRound = lastTurn?.roundNumber ?? 1;
  const nextTurnNumber = (lastTurn?.turnNumber ?? 0) + 1;

  // Who has already picked this round
  const pickersThisRound = await prisma.guessTurn.findMany({
    where: { sessionId, roundNumber: currentRound },
    select: { pickerId: true },
  });
  const pickedIds = new Set(pickersThisRound.map((t) => t.pickerId));

  // Walk the fixed rotation; the next picker is the first player in order who
  // hasn't picked this round yet. When everyone has, roll over to a new round
  // starting again from the top of the order — same sequence every round.
  let roundNumber = currentRound;
  let nextPicker = order.find((p) => !pickedIds.has(p.id));
  if (!nextPicker) {
    roundNumber = currentRound + 1;
    nextPicker = order[0];
  }

  return {
    picker: { id: nextPicker.id, name: nextPicker.name },
    roundNumber,
    turnNumber: nextTurnNumber,
  };
}

/**
 * Splice a player who joined mid-game into the picking rotation. They are placed
 * to pick after at most 3 more players, or last in the current round — whichever
 * comes first — so they get a turn soon without jumping the queue. A no-op if the
 * guess game hasn't started or the player is already in the rotation.
 */
export async function insertJoinedPlayerIntoPickOrder(
  sessionId: string,
  playerId: string,
): Promise<void> {
  const config = await prisma.guessConfig.findUnique({ where: { sessionId } });
  // No config or empty order => game hasn't started; startGuessGame will include
  // this player when it shuffles the initial rotation.
  if (!config || config.pickOrder.length === 0) return;
  if (config.pickOrder.includes(playerId)) return;

  const lastTurn = await prisma.guessTurn.findFirst({
    where: { sessionId },
    orderBy: { turnNumber: "desc" },
  });
  if (!lastTurn) return;

  // Turns already created this round == index of the next pick in the rotation.
  // Placing the joiner at (that index + 3) lets exactly 3 more players pick
  // first; capping at the end of the rotation makes them pick last instead when
  // fewer than 3 remain this round.
  const turnsThisRound = await prisma.guessTurn.count({
    where: { sessionId, roundNumber: lastTurn.roundNumber },
  });
  const insertIndex = Math.min(turnsThisRound + 3, config.pickOrder.length);

  const newOrder = [...config.pickOrder];
  newOrder.splice(insertIndex, 0, playerId);

  await prisma.guessConfig.update({
    where: { id: config.id },
    data: { pickOrder: newOrder },
  });
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
  let isrc: string | null = null;
  try {
    isrc = await getTrackIsrc(songData.spotifyId);
  } catch {
    // Fall back to ID-only matching if ISRC lookup fails
  }

  const turn = await prisma.guessTurn.update({
    where: { id: guessTurnId },
    data: {
      spotifyId: songData.spotifyId,
      songName: songData.songName,
      artistName: songData.artistName,
      startTime: songData.startTime,
      imageUrl: songData.imageUrl ?? null,
      isrc,
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

  // Auto-end guessing phase when timer expires
  setTimeout(() => {
    endGuessingPhase(guessTurnId).catch(() => {
      // Ignore errors — phase may have already ended because all players guessed
    });
  }, config.guessTimeSec * 1000);

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
  if (!turn.spotifyId || !turn.songName || !turn.artistName) throw new Error("No song set for this turn");

  let guessIsrc: string | null = null;
  if (guessData.spotifyId !== turn.spotifyId) {
    try {
      guessIsrc = await getTrackIsrc(guessData.spotifyId);
    } catch {
      // Fall back to ID-only matching if ISRC lookup fails
    }
  }

  const now = new Date();
  const scoreResult = calculateScore({
    guessSpotifyId: guessData.spotifyId,
    guessSongName: guessData.songName,
    guessArtistName: guessData.artistName,
    guessIsrc,
    correctSpotifyId: turn.spotifyId,
    correctSongName: turn.songName,
    correctArtistName: turn.artistName,
    correctIsrc: turn.isrc,
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
  const eligibleGuessers = allPlayers.filter((p) => p.id !== turn.pickerId);

  const guessCount = await prisma.guess.count({ where: { guessTurnId } });

  if (guessCount >= eligibleGuessers.length) {
    await endGuessingPhase(guessTurnId);
  }

  return scoreResult;
}

export async function endGuessingPhase(guessTurnId: string): Promise<void> {
  const turn = await prisma.guessTurn.findUnique({
    where: { id: guessTurnId },
    include: { guesses: { include: { player: true } }, picker: true },
  });
  if (!turn) throw new Error("Turn not found");

  // Already moved past guessing — nothing to do
  if (turn.status !== "guessing") return;

  // Award the picker the average score from this turn's guesses
  const guesserPoints = turn.guesses.map((g) => g.points);
  const averagePoints =
    guesserPoints.length > 0
      ? Math.round(
          guesserPoints.reduce((sum, p) => sum + p, 0) / guesserPoints.length,
        )
      : 0;

  await prisma.guess.create({
    data: {
      id: uuidv4(),
      guessTurnId,
      playerId: turn.pickerId,
      spotifyId: "",
      songName: "",
      artistName: "",
      guessedAt: new Date(),
      songCorrect: false,
      artistCorrect: false,
      points: averagePoints,
      createdAt: new Date(),
    },
  });

  await prisma.guessTurn.update({
    where: { id: guessTurnId },
    data: { status: "scoreboard" },
  });

  const scores = await getScores(turn.sessionId);

  const results = turn.guesses.map((g) => ({
    playerId: g.playerId,
    playerName: g.player.name,
    songName: g.songName,
    artistName: g.artistName,
    songCorrect: g.songCorrect,
    artistCorrect: g.artistCorrect,
    points: g.points,
  }));

  // Add the picker's result
  results.push({
    playerId: turn.pickerId,
    playerName: turn.picker.name,
    songName: "",
    artistName: "",
    songCorrect: false,
    artistCorrect: false,
    points: averagePoints,
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
      results,
      scores,
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
    correctSongs: player.guesses.filter((g) => g.songCorrect && g.artistCorrect).length,
    correctArtists: player.guesses.filter(
      (g) => g.artistCorrect && !g.songCorrect,
    ).length,
  }));
}

export async function restartGuessGame(sessionId: string): Promise<void> {
  // Delete all guesses for this session's turns
  const turnIds = await prisma.guessTurn.findMany({
    where: { sessionId },
    select: { id: true },
  });

  if (turnIds.length > 0) {
    await prisma.guess.deleteMany({
      where: { guessTurnId: { in: turnIds.map((t) => t.id) } },
    });
  }

  // Delete all turns
  await prisma.guessTurn.deleteMany({ where: { sessionId } });

  sseManager.broadcast(sessionId, {
    type: "guess_game_restarted",
    data: {},
  } satisfies SSEMessage);
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
        const pickedCount = await prisma.guessTurn.count({
          where: { sessionId, roundNumber: currentTurn.roundNumber },
        });
        return pickedCount >= players.length;
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
