import prisma from "./db-prisma";
import { v4 as uuidv4 } from "uuid";
import type {
  Session,
  Tournament,
  Player,
  Song,
  TournamentMatch,
} from "@/types/game";

// Session functions

export async function createSession(ownerId: string): Promise<Session> {
  const sessionId = uuidv4();
  const now = new Date();

  const result = await prisma.gameSession.create({
    data: {
      id: sessionId,
      ownerId: ownerId,
      status: "active",
      createdAt: now,
    },
  });

  return {
    id: result.id,
    ownerId: result.ownerId,
    status: result.status,
    createdAt: result.createdAt,
  };
}

export async function getSession(sessionId: string): Promise<Session | null> {
  const result = await prisma.gameSession.findUnique({
    where: { id: sessionId },
  });

  return result;
}

export async function updateSession(
  sessionId: string,
  updates: Partial<Session>,
): Promise<void> {
  const dataToUpdate: Record<string, string> = {};

  if (updates.status !== undefined) dataToUpdate.status = updates.status;

  if (Object.keys(dataToUpdate).length === 0) return;

  await prisma.session.update({
    where: { id: sessionId },
    data: dataToUpdate,
  });
}

// Tournament functions

export async function createTournament(data: {
  sessionId: string;
  pickerIndex: number;
}) {
  const tournamentId = uuidv4();

  const result = await prisma.tournament.create({
    data: {
      id: tournamentId,
      sessionId: data.sessionId,
      category: "",
      status: "category_selection",
      currentPickerIndex: data.pickerIndex,
      createdAt: new Date(),
    },
    include: { songs: true, matches: true },
  });

  return result;
}

export async function getTournament(
  tournamentId: string,
): Promise<Tournament | null> {
  const result = await prisma.tournament.findUnique({
    where: { id: tournamentId },
  });

  return result;
}

export async function getActiveTournament(
  sessionId: string,
): Promise<Tournament | null> {
  const result = await prisma.tournament.findFirst({
    where: {
      sessionId: sessionId,
      status: { not: "finished" },
    },
    orderBy: { createdAt: "desc" },
  });

  return result;
}

export async function updateTournament(
  tournamentId: string,
  updates: Partial<Tournament>,
): Promise<Tournament> {
  return await prisma.tournament.update({
    where: { id: tournamentId },
    data: updates,
  });
}

export async function addPlayer(
  sessionId: string,
  name: string,
  isOwner: boolean = false,
): Promise<Player> {
  const playerId = uuidv4();
  const now = new Date();

  // Get join order
  const count = await prisma.player.count({
    where: { sessionId: sessionId },
  });

  const result = await prisma.player.create({
    data: {
      id: playerId,
      sessionId: sessionId,
      name,
      isOwner,
      joinOrder: count,
      createdAt: now,
    },
  });

  return {
    id: result.id,
    sessionId: result.sessionId,
    name: result.name,
    spotifyDeviceId: result.spotifyDeviceId,
    isOwner: result.isOwner,
    joinOrder: result.joinOrder,
    createdAt: result.createdAt,
  };
}

export async function getPlayers(sessionId: string): Promise<Player[]> {
  const results = await prisma.player.findMany({
    where: { sessionId: sessionId },
    orderBy: { joinOrder: "asc" },
  });

  return results.map((result) => ({
    id: result.id,
    sessionId: result.sessionId,
    name: result.name,
    spotifyDeviceId: result.spotifyDeviceId,
    isOwner: result.isOwner,
    joinOrder: result.joinOrder,
    createdAt: result.createdAt,
  }));
}

export async function getPlayer(playerId: string): Promise<Player | null> {
  const result = await prisma.player.findUnique({
    where: { id: playerId },
  });

  return result
    ? {
        id: result.id,
        sessionId: result.sessionId,
        name: result.name,
        spotifyDeviceId: result.spotifyDeviceId,
        isOwner: result.isOwner,
        joinOrder: result.joinOrder,
        createdAt: result.createdAt,
      }
    : null;
}

export async function updatePlayer(
  playerId: string,
  updates: Partial<Player>,
): Promise<void> {
  const dataToUpdate: Record<string, string | number | boolean | null> = {};

  if (updates.name !== undefined) dataToUpdate.name = updates.name;
  if (updates.spotifyDeviceId !== undefined)
    dataToUpdate.spotifyDeviceId = updates.spotifyDeviceId;

  if (Object.keys(dataToUpdate).length === 0) return;

  await prisma.player.update({
    where: { id: playerId },
    data: dataToUpdate,
  });
}

export async function addSong(
  tournamentId: string,
  playerId: string,
  spotifyId: string,
  songName: string,
  artistName: string,
  startTime: number,
  imageUrl: string | null = null,
): Promise<Song> {
  const songId = uuidv4();
  const now = new Date();

  const result = await prisma.song.create({
    data: {
      id: songId,
      tournamentId: tournamentId,
      spotifyId: spotifyId,
      playerId: playerId,
      startTime: startTime,
      songName: songName,
      artistName: artistName,
      imageUrl: imageUrl,
      createdAt: now,
    },
  });

  return result;
}

export async function getSongs(tournamentId: string): Promise<Song[]> {
  const results = await prisma.song.findMany({
    where: { tournamentId: tournamentId },
    orderBy: { createdAt: "asc" },
  });

  return results;
}

export async function getSong(songId: string): Promise<Song | null> {
  const result = await prisma.song.findUnique({
    where: { id: songId },
  });

  return result;
}

export async function createMatch({
  tournamentId,
  round,
  songId,
}: {
  tournamentId: string;
  round: number;
  songId: string | null;
}): Promise<TournamentMatch> {
  const matchId = uuidv4();
  const now = new Date();

  const result = await prisma.tournamentMatch.create({
    data: {
      id: matchId,
      tournamentId: tournamentId,
      roundNumber: round,
      songAId: null,
      songBId: songId,
      status: "pending",
      createdAt: now,
    },
  });

  return result;
}

export async function getMatches(
  tournamentId: string,
): Promise<TournamentMatch[]> {
  const results = await prisma.tournamentMatch.findMany({
    where: { tournamentId: tournamentId },
    orderBy: { roundNumber: "asc" },
  });

  return results;
}

export async function getMatch(
  matchId: string,
): Promise<TournamentMatch | null> {
  const result = await prisma.tournamentMatch.findUnique({
    where: { id: matchId },
  });

  return result;
}

export async function updateMatch(
  matchId: string,
  updates: Partial<TournamentMatch>,
): Promise<TournamentMatch> {
  return await prisma.tournamentMatch.update({
    where: { id: matchId },
    data: updates,
  });
}

export async function addVote(
  matchId: string,
  playerId: string,
  songId: string,
): Promise<void> {
  const voteId = uuidv4();
  const now = new Date();

  const { match } = await prisma.vote.upsert({
    where: { matchId_playerId: { matchId: matchId, playerId: playerId } },
    update: { songId: songId, createdAt: now },
    create: {
      id: voteId,
      matchId: matchId,
      playerId: playerId,
      songId: songId,
      createdAt: now,
    },
    include: { match: true },
  });

  // Update vote counts
  if (!match) return;

  let votesA = 0;
  let votesB = 0;

  if (match.songAId) {
    votesA = await prisma.vote.count({
      where: { matchId: matchId, songId: match.songAId },
    });
  }

  if (match.songBId) {
    votesB = await prisma.vote.count({
      where: { matchId: matchId, songId: match.songBId },
    });
  }

  await updateMatch(matchId, { votesA: votesA, votesB: votesB });
}

export async function getPlayerVote(
  matchId: string,
  playerId: string,
): Promise<string | null> {
  const result = await prisma.vote.findFirst({
    where: { matchId: matchId, playerId: playerId },
    select: { songId: true },
  });

  return result?.songId || null;
}

export async function deletePlayer(playerId: string): Promise<void> {
  // Cascade delete is handled by Prisma relations in schema
  await prisma.player.delete({
    where: { id: playerId },
  });
}

export async function deleteTournament(tournamentId: string): Promise<void> {
  // Cascade delete is handled by Prisma relations in schema
  await prisma.tournament.delete({
    where: { id: tournamentId },
  });
}

export async function deleteSession(sessionId: string): Promise<void> {
  // Cascade delete is handled by Prisma relations in schema
  await prisma.session.delete({
    where: { id: sessionId },
  });
}

export async function getMatchVoteCount(matchId: string): Promise<number> {
  const result = await prisma.vote.groupBy({
    by: ["playerId"],
    where: { matchId: matchId },
    _count: true,
  });

  return result.length;
}
