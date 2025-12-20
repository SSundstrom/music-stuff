import Database from "better-sqlite3";
import path from "path";

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    const dbPath = path.join(process.cwd(), "data", "game.db");
    db = new Database(dbPath);
    db.pragma("journal_mode = WAL");
    initializeDatabase();
  }
  return db;
}

function initializeDatabase() {
  if (!db) return;

  // Sessions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'waiting',
      current_category TEXT,
      current_round INTEGER DEFAULT 1,
      current_picker_index INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL
    )
  `);

  // Players table
  db.exec(`
    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      name TEXT NOT NULL,
      spotify_device_id TEXT,
      is_owner INTEGER NOT NULL DEFAULT 0,
      join_order INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (session_id) REFERENCES sessions(id)
    )
  `);

  // Songs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS songs (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      round_number INTEGER NOT NULL,
      spotify_id TEXT NOT NULL,
      player_id TEXT NOT NULL,
      start_time INTEGER NOT NULL,
      song_name TEXT NOT NULL,
      artist_name TEXT NOT NULL,
      image_url TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (session_id) REFERENCES sessions(id),
      FOREIGN KEY (player_id) REFERENCES players(id)
    )
  `);

  // Tournament matches table
  db.exec(`
    CREATE TABLE IF NOT EXISTS tournament_matches (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      round_number INTEGER NOT NULL,
      match_number INTEGER NOT NULL,
      song_a_id TEXT,
      song_b_id TEXT,
      winner_id TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      votes_a INTEGER DEFAULT 0,
      votes_b INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (session_id) REFERENCES sessions(id),
      FOREIGN KEY (song_a_id) REFERENCES songs(id),
      FOREIGN KEY (song_b_id) REFERENCES songs(id)
    )
  `);

  // Votes table
  db.exec(`
    CREATE TABLE IF NOT EXISTS votes (
      id TEXT PRIMARY KEY,
      match_id TEXT NOT NULL,
      player_id TEXT NOT NULL,
      song_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      UNIQUE(match_id, player_id),
      FOREIGN KEY (match_id) REFERENCES tournament_matches(id),
      FOREIGN KEY (player_id) REFERENCES players(id),
      FOREIGN KEY (song_id) REFERENCES songs(id)
    )
  `);

  // Create indexes for common queries
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_players_session ON players(session_id);
    CREATE INDEX IF NOT EXISTS idx_songs_session ON songs(session_id);
    CREATE INDEX IF NOT EXISTS idx_songs_round ON songs(session_id, round_number);
    CREATE INDEX IF NOT EXISTS idx_matches_session ON tournament_matches(session_id);
    CREATE INDEX IF NOT EXISTS idx_matches_round ON tournament_matches(session_id, round_number);
    CREATE INDEX IF NOT EXISTS idx_votes_match ON votes(match_id);
  `);
}

export function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}
