import { getDb } from "./db";
import { v4 as uuidv4 } from "uuid";
import type { Session, Player, Song, TournamentMatch } from "@/types/game";

export function createSession(ownerId: string): Session {
  const db = getDb();
  const sessionId = uuidv4();
  const now = Date.now();

  const stmt = db.prepare(
    "INSERT INTO sessions (id, owner_id, status, current_round, current_picker_index, created_at) VALUES (?, ?, ?, ?, ?, ?)"
  );

  stmt.run(sessionId, ownerId, "waiting", 1, 0, now);

  return {
    id: sessionId,
    owner_id: ownerId,
    status: "waiting",
    current_category: null,
    current_round: 1,
    current_picker_index: 0,
    created_at: now,
  };
}

export function getSession(sessionId: string): Session | null {
  const db = getDb();
  const stmt = db.prepare("SELECT * FROM sessions WHERE id = ?");
  return (stmt.get(sessionId) as Session) || null;
}

export function updateSession(sessionId: string, updates: Partial<Session>): void {
  const db = getDb();

  const fields = Object.keys(updates)
    .filter((k) => k !== "id" && k !== "created_at" && k !== "owner_id")
    .map((k) => `${k} = ?`);

  if (fields.length === 0) return;

  const values = Object.entries(updates)
    .filter(([k]) => k !== "id" && k !== "created_at" && k !== "owner_id")
    .map(([, v]) => v);

  const stmt = db.prepare(`UPDATE sessions SET ${fields.join(", ")} WHERE id = ?`);
  stmt.run(...values, sessionId);
}

export function addPlayer(sessionId: string, name: string, isOwner: boolean = false): Player {
  const db = getDb();
  const playerId = uuidv4();
  const now = Date.now();

  // Get join order
  const countStmt = db.prepare("SELECT COUNT(*) as count FROM players WHERE session_id = ?");
  const { count } = countStmt.get(sessionId) as { count: number };

  const stmt = db.prepare(
    "INSERT INTO players (id, session_id, name, is_owner, join_order, created_at) VALUES (?, ?, ?, ?, ?, ?)"
  );

  stmt.run(playerId, sessionId, name, isOwner ? 1 : 0, count, now);

  return {
    id: playerId,
    session_id: sessionId,
    name,
    spotify_device_id: null,
    is_owner: isOwner,
    join_order: count,
    created_at: now,
  };
}

export function getPlayers(sessionId: string): Player[] {
  const db = getDb();
  const stmt = db.prepare("SELECT * FROM players WHERE session_id = ? ORDER BY join_order ASC");
  return stmt.all(sessionId) as Player[];
}

export function getPlayer(playerId: string): Player | null {
  const db = getDb();
  const stmt = db.prepare("SELECT * FROM players WHERE id = ?");
  return (stmt.get(playerId) as Player) || null;
}

export function updatePlayer(playerId: string, updates: Partial<Player>): void {
  const db = getDb();

  const fields = Object.keys(updates)
    .filter((k) => k !== "id" && k !== "created_at" && k !== "session_id" && k !== "is_owner")
    .map((k) => `${k} = ?`);

  if (fields.length === 0) return;

  const values = Object.entries(updates)
    .filter(([k]) => k !== "id" && k !== "created_at" && k !== "session_id" && k !== "is_owner")
    .map(([, v]) => (typeof v === "boolean" ? (v ? 1 : 0) : v));

  const stmt = db.prepare(`UPDATE players SET ${fields.join(", ")} WHERE id = ?`);
  stmt.run(...values, playerId);
}

export function addSong(
  sessionId: string,
  playerId: string,
  roundNumber: number,
  spotifyId: string,
  songName: string,
  artistName: string,
  startTime: number,
  imageUrl: string | null = null
): Song {
  const db = getDb();
  const songId = uuidv4();
  const now = Date.now();

  const stmt = db.prepare(
    "INSERT INTO songs (id, session_id, round_number, spotify_id, player_id, start_time, song_name, artist_name, image_url, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  );

  stmt.run(
    songId,
    sessionId,
    roundNumber,
    spotifyId,
    playerId,
    startTime,
    songName,
    artistName,
    imageUrl,
    now
  );

  return {
    id: songId,
    session_id: sessionId,
    round_number: roundNumber,
    spotify_id: spotifyId,
    player_id: playerId,
    start_time: startTime,
    song_name: songName,
    artist_name: artistName,
    image_url: imageUrl,
    created_at: now,
  };
}

export function getSongs(sessionId: string, roundNumber: number): Song[] {
  const db = getDb();
  const stmt = db.prepare(
    "SELECT * FROM songs WHERE session_id = ? AND round_number = ? ORDER BY created_at ASC"
  );
  return stmt.all(sessionId, roundNumber) as Song[];
}

export function getSong(songId: string): Song | null {
  const db = getDb();
  const stmt = db.prepare("SELECT * FROM songs WHERE id = ?");
  return (stmt.get(songId) as Song) || null;
}

export function createMatch(
  sessionId: string,
  roundNumber: number,
  matchNumber: number,
  songAId: string | null,
  songBId: string | null
): TournamentMatch {
  const db = getDb();
  const matchId = uuidv4();
  const now = Date.now();

  const stmt = db.prepare(
    "INSERT INTO tournament_matches (id, session_id, round_number, match_number, song_a_id, song_b_id, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  );

  stmt.run(matchId, sessionId, roundNumber, matchNumber, songAId, songBId, "pending", now);

  return {
    id: matchId,
    session_id: sessionId,
    round_number: roundNumber,
    match_number: matchNumber,
    song_a_id: songAId,
    song_b_id: songBId,
    winner_id: null,
    status: "pending",
    votes_a: 0,
    votes_b: 0,
    currently_playing_song_id: null,
    created_at: now,
  };
}

export function getMatches(sessionId: string, roundNumber: number): TournamentMatch[] {
  const db = getDb();
  const stmt = db.prepare(
    "SELECT * FROM tournament_matches WHERE session_id = ? AND round_number = ? ORDER BY match_number ASC"
  );
  return stmt.all(sessionId, roundNumber) as TournamentMatch[];
}

export function getMatch(matchId: string): TournamentMatch | null {
  const db = getDb();
  const stmt = db.prepare("SELECT * FROM tournament_matches WHERE id = ?");
  return (stmt.get(matchId) as TournamentMatch) || null;
}

export function updateMatch(matchId: string, updates: Partial<TournamentMatch>): void {
  const db = getDb();

  const fields = Object.keys(updates)
    .filter((k) => k !== "id" && k !== "created_at" && k !== "session_id")
    .map((k) => `${k} = ?`);

  if (fields.length === 0) return;

  const values = Object.entries(updates)
    .filter(([k]) => k !== "id" && k !== "created_at" && k !== "session_id")
    .map(([, v]) => v);

  const stmt = db.prepare(`UPDATE tournament_matches SET ${fields.join(", ")} WHERE id = ?`);
  stmt.run(...values, matchId);
}

export function addVote(matchId: string, playerId: string, songId: string): void {
  const db = getDb();
  const voteId = uuidv4();
  const now = Date.now();

  const stmt = db.prepare(
    "INSERT OR REPLACE INTO votes (id, match_id, player_id, song_id, created_at) VALUES (?, ?, ?, ?, ?)"
  );

  stmt.run(voteId, matchId, playerId, songId, now);

  // Update vote counts
  const match = getMatch(matchId);
  if (!match) return;

  const voteStmt = db.prepare(
    "SELECT COUNT(*) as count FROM votes WHERE match_id = ? AND song_id = ?"
  );

  let votesA = 0;
  let votesB = 0;

  if (match.song_a_id) {
    const { count } = voteStmt.get(matchId, match.song_a_id) as { count: number };
    votesA = count;
  }

  if (match.song_b_id) {
    const { count } = voteStmt.get(matchId, match.song_b_id) as { count: number };
    votesB = count;
  }

  updateMatch(matchId, { votes_a: votesA, votes_b: votesB });
}

export function getPlayerVote(matchId: string, playerId: string): string | null {
  const db = getDb();
  const stmt = db.prepare("SELECT song_id FROM votes WHERE match_id = ? AND player_id = ?");
  const result = stmt.get(matchId, playerId) as { song_id: string } | undefined;
  return result?.song_id || null;
}

export function deletePlayer(playerId: string): void {
  const db = getDb();

  // Delete in order of dependencies
  db.prepare("DELETE FROM votes WHERE player_id = ?").run(playerId);
  db.prepare("DELETE FROM songs WHERE player_id = ?").run(playerId);
  db.prepare("DELETE FROM players WHERE id = ?").run(playerId);
}

export function deleteSession(sessionId: string): void {
  const db = getDb();

  // Delete in order of dependencies
  db.prepare("DELETE FROM votes WHERE match_id IN (SELECT id FROM tournament_matches WHERE session_id = ?)").run(
    sessionId
  );
  db.prepare("DELETE FROM tournament_matches WHERE session_id = ?").run(sessionId);
  db.prepare("DELETE FROM songs WHERE session_id = ?").run(sessionId);
  db.prepare("DELETE FROM players WHERE session_id = ?").run(sessionId);
  db.prepare("DELETE FROM sessions WHERE id = ?").run(sessionId);
}
