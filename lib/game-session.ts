import { prisma } from "./db-prisma";
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
  const now = Date.now();

  const result = await prisma.session.create({
    data: {
      id: sessionId,
      owner_id: ownerId,
      status: "active",
      created_at: now,
    },
  });

  return {
    id: result.id,
    owner_id: result.owner_id,
    status: result.status as "active" | "archived",
    created_at: result.created_at,
  };
}

export async function getSession(sessionId: string): Promise<Session | null> {
  const result = await prisma.session.findUnique({
    where: { id: sessionId },
  });

  return result
    ? {
        id: result.id,
        owner_id: result.owner_id,
        status: result.status as "active" | "archived",
        created_at: result.created_at,
      }
    : null;
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

export async function createTournament(
  sessionId: string,
  category: string,
): Promise<Tournament> {
  const tournamentId = uuidv4();
  const now = Date.now();

  const result = await prisma.tournament.create({
    data: {
      id: tournamentId,
      session_id: sessionId,
      category,
      status: "waiting",
      current_round: 1,
      current_picker_index: 0,
      created_at: now,
    },
  });

  return {
    id: result.id,
    session_id: result.session_id,
    category: result.category,
    status: result.status,
    current_round: result.current_round,
    current_picker_index: result.current_picker_index,
    winning_song_id: result.winning_song_id,
    created_at: result.created_at,
  };
}

export async function getTournament(
  tournamentId: string,
): Promise<Tournament | null> {
  const result = await prisma.tournament.findUnique({
    where: { id: tournamentId },
  });

  return result
    ? {
        id: result.id,
        session_id: result.session_id,
        category: result.category,
        status: result.status,
        current_round: result.current_round,
        current_picker_index: result.current_picker_index,
        winning_song_id: result.winning_song_id,
        created_at: result.created_at,
      }
    : null;
}

export async function getTournamentsBySession(
  sessionId: string,
): Promise<Tournament[]> {
  const results = await prisma.tournament.findMany({
    where: { session_id: sessionId },
    orderBy: { created_at: "asc" },
  });

  return results.map((result) => ({
    id: result.id,
    session_id: result.session_id,
    category: result.category,
    status: result.status,
    current_round: result.current_round,
    current_picker_index: result.current_picker_index,
    winning_song_id: result.winning_song_id,
    created_at: result.created_at,
  }));
}

export async function getActiveTournament(
  sessionId: string,
): Promise<Tournament | null> {
  const result = await prisma.tournament.findFirst({
    where: {
      session_id: sessionId,
      status: { not: "finished" },
    },
    orderBy: { created_at: "desc" },
  });

  return result
    ? {
        id: result.id,
        session_id: result.session_id,
        category: result.category,
        status: result.status,
        current_round: result.current_round,
        current_picker_index: result.current_picker_index,
        winning_song_id: result.winning_song_id,
        created_at: result.created_at,
      }
    : null;
}

export async function updateTournament(
  tournamentId: string,
  updates: Partial<Tournament>,
): Promise<void> {
  const dataToUpdate: Record<string, string | number | null> = {};

  if (updates.status !== undefined) dataToUpdate.status = updates.status;
  if (updates.current_round !== undefined)
    dataToUpdate.current_round = updates.current_round;
  if (updates.current_picker_index !== undefined)
    dataToUpdate.current_picker_index = updates.current_picker_index;
  if (updates.winning_song_id !== undefined)
    dataToUpdate.winning_song_id = updates.winning_song_id;
  if (updates.eliminated_song_ids !== undefined)
    dataToUpdate.eliminated_song_ids = updates.eliminated_song_ids;

  if (Object.keys(dataToUpdate).length === 0) return;

  await prisma.tournament.update({
    where: { id: tournamentId },
    data: dataToUpdate,
  });
}

export async function addPlayer(
  sessionId: string,
  name: string,
  isOwner: boolean = false,
): Promise<Player> {
  const playerId = uuidv4();
  const now = Date.now();

  // Get join order
  const count = await prisma.player.count({
    where: { session_id: sessionId },
  });

  const result = await prisma.player.create({
    data: {
      id: playerId,
      session_id: sessionId,
      name,
      is_owner: isOwner ? 1 : 0,
      join_order: count,
      created_at: now,
    },
  });

  return {
    id: result.id,
    session_id: result.session_id,
    name: result.name,
    spotify_device_id: result.spotify_device_id,
    is_owner: result.is_owner === 1,
    join_order: result.join_order,
    created_at: result.created_at,
  };
}

export async function getPlayers(sessionId: string): Promise<Player[]> {
  const results = await prisma.player.findMany({
    where: { session_id: sessionId },
    orderBy: { join_order: "asc" },
  });

  return results.map((result) => ({
    id: result.id,
    session_id: result.session_id,
    name: result.name,
    spotify_device_id: result.spotify_device_id,
    is_owner: result.is_owner === 1,
    join_order: result.join_order,
    created_at: result.created_at,
  }));
}

export async function getPlayer(playerId: string): Promise<Player | null> {
  const result = await prisma.player.findUnique({
    where: { id: playerId },
  });

  return result
    ? {
        id: result.id,
        session_id: result.session_id,
        name: result.name,
        spotify_device_id: result.spotify_device_id,
        is_owner: result.is_owner === 1,
        join_order: result.join_order,
        created_at: result.created_at,
      }
    : null;
}

export async function updatePlayer(
  playerId: string,
  updates: Partial<Player>,
): Promise<void> {
  const dataToUpdate: Record<string, string | number | boolean | null> = {};

  if (updates.name !== undefined) dataToUpdate.name = updates.name;
  if (updates.spotify_device_id !== undefined)
    dataToUpdate.spotify_device_id = updates.spotify_device_id;

  if (Object.keys(dataToUpdate).length === 0) return;

  await prisma.player.update({
    where: { id: playerId },
    data: dataToUpdate,
  });
}

export async function addSong(
  tournamentId: string,
  playerId: string,
  roundNumber: number,
  spotifyId: string,
  songName: string,
  artistName: string,
  startTime: number,
  imageUrl: string | null = null,
): Promise<Song> {
  const songId = uuidv4();
  const now = Date.now();

  const result = await prisma.song.create({
    data: {
      id: songId,
      tournament_id: tournamentId,
      round_number: roundNumber,
      spotify_id: spotifyId,
      player_id: playerId,
      start_time: startTime,
      song_name: songName,
      artist_name: artistName,
      image_url: imageUrl,
      created_at: now,
    },
  });

  return {
    id: result.id,
    tournament_id: result.tournament_id,
    round_number: result.round_number,
    spotify_id: result.spotify_id,
    player_id: result.player_id,
    start_time: result.start_time,
    song_name: result.song_name,
    artist_name: result.artist_name,
    image_url: result.image_url,
    created_at: result.created_at,
  };
}

export async function getSongs(
  tournamentId: string,
  roundNumber: number,
): Promise<Song[]> {
  const results = await prisma.song.findMany({
    where: { tournament_id: tournamentId, round_number: roundNumber },
    orderBy: { created_at: "asc" },
  });

  return results.map((result) => ({
    id: result.id,
    tournament_id: result.tournament_id,
    round_number: result.round_number,
    spotify_id: result.spotify_id,
    player_id: result.player_id,
    start_time: result.start_time,
    song_name: result.song_name,
    artist_name: result.artist_name,
    image_url: result.image_url,
    created_at: result.created_at,
  }));
}

export async function getSong(songId: string): Promise<Song | null> {
  const result = await prisma.song.findUnique({
    where: { id: songId },
  });

  return result
    ? {
        id: result.id,
        tournament_id: result.tournament_id,
        round_number: result.round_number,
        spotify_id: result.spotify_id,
        player_id: result.player_id,
        start_time: result.start_time,
        song_name: result.song_name,
        artist_name: result.artist_name,
        image_url: result.image_url,
        created_at: result.created_at,
      }
    : null;
}

export async function createMatch(
  tournamentId: string,
  roundNumber: number,
  matchNumber: number,
  songAId: string | null,
  songBId: string | null,
): Promise<TournamentMatch> {
  const matchId = uuidv4();
  const now = Date.now();

  const result = await prisma.tournamentMatch.create({
    data: {
      id: matchId,
      tournament_id: tournamentId,
      round_number: roundNumber,
      match_number: matchNumber,
      song_a_id: songAId,
      song_b_id: songBId,
      status: "pending",
      created_at: now,
    },
  });

  return {
    id: result.id,
    tournament_id: result.tournament_id,
    round_number: result.round_number,
    match_number: result.match_number,
    song_a_id: result.song_a_id,
    song_b_id: result.song_b_id,
    winner_id: result.winner_id,
    status: result.status,
    votes_a: result.votes_a,
    votes_b: result.votes_b,
    currently_playing_song_id: result.currently_playing_song_id,
    created_at: result.created_at,
  };
}

export async function getMatches(
  tournamentId: string,
  roundNumber: number,
): Promise<TournamentMatch[]> {
  const results = await prisma.tournamentMatch.findMany({
    where: { tournament_id: tournamentId, round_number: roundNumber },
    orderBy: { match_number: "asc" },
  });

  return results.map((result) => ({
    id: result.id,
    tournament_id: result.tournament_id,
    round_number: result.round_number,
    match_number: result.match_number,
    song_a_id: result.song_a_id,
    song_b_id: result.song_b_id,
    winner_id: result.winner_id,
    status: result.status,
    votes_a: result.votes_a,
    votes_b: result.votes_b,
    currently_playing_song_id: result.currently_playing_song_id,
    created_at: result.created_at,
  }));
}

export async function getMatch(
  matchId: string,
): Promise<TournamentMatch | null> {
  const result = await prisma.tournamentMatch.findUnique({
    where: { id: matchId },
  });

  return result
    ? {
        id: result.id,
        tournament_id: result.tournament_id,
        round_number: result.round_number,
        match_number: result.match_number,
        song_a_id: result.song_a_id,
        song_b_id: result.song_b_id,
        winner_id: result.winner_id,
        status: result.status,
        votes_a: result.votes_a,
        votes_b: result.votes_b,
        currently_playing_song_id: result.currently_playing_song_id,
        created_at: result.created_at,
      }
    : null;
}

export async function updateMatch(
  matchId: string,
  updates: Partial<TournamentMatch>,
): Promise<void> {
  const dataToUpdate: Record<
    string,
    string | number | boolean | null | undefined
  > = {};

  if (updates.round_number !== undefined)
    dataToUpdate.round_number = updates.round_number;
  if (updates.match_number !== undefined)
    dataToUpdate.match_number = updates.match_number;
  if (updates.song_a_id !== undefined)
    dataToUpdate.song_a_id = updates.song_a_id;
  if (updates.song_b_id !== undefined)
    dataToUpdate.song_b_id = updates.song_b_id;
  if (updates.winner_id !== undefined)
    dataToUpdate.winner_id = updates.winner_id;
  if (updates.status !== undefined) dataToUpdate.status = updates.status;
  if (updates.votes_a !== undefined) dataToUpdate.votes_a = updates.votes_a;
  if (updates.votes_b !== undefined) dataToUpdate.votes_b = updates.votes_b;
  if (updates.currently_playing_song_id !== undefined)
    dataToUpdate.currently_playing_song_id = updates.currently_playing_song_id;

  if (Object.keys(dataToUpdate).length === 0) return;

  await prisma.tournamentMatch.update({
    where: { id: matchId },
    data: dataToUpdate,
  });
}

export async function addVote(
  matchId: string,
  playerId: string,
  songId: string,
): Promise<void> {
  const voteId = uuidv4();
  const now = Date.now();

  await prisma.vote.upsert({
    where: { match_id_player_id: { match_id: matchId, player_id: playerId } },
    update: { song_id: songId, created_at: now },
    create: {
      id: voteId,
      match_id: matchId,
      player_id: playerId,
      song_id: songId,
      created_at: now,
    },
  });

  // Update vote counts
  const match = await getMatch(matchId);
  if (!match) return;

  let votesA = 0;
  let votesB = 0;

  if (match.song_a_id) {
    votesA = await prisma.vote.count({
      where: { match_id: matchId, song_id: match.song_a_id },
    });
  }

  if (match.song_b_id) {
    votesB = await prisma.vote.count({
      where: { match_id: matchId, song_id: match.song_b_id },
    });
  }

  await updateMatch(matchId, { votes_a: votesA, votes_b: votesB });
}

export async function getPlayerVote(
  matchId: string,
  playerId: string,
): Promise<string | null> {
  const result = await prisma.vote.findFirst({
    where: { match_id: matchId, player_id: playerId },
    select: { song_id: true },
  });

  return result?.song_id || null;
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
    by: ["player_id"],
    where: { match_id: matchId },
    _count: true,
  });

  return result.length;
}
