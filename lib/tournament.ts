import { createMatch, getSongs, getMatches, updateMatch } from "./game-session";
import type { Song, TournamentMatch } from "@/types/game";

/**
 * Generates a single-elimination tournament bracket from submitted songs
 * Handles odd numbers by creating a balanced bracket with byes
 */
export function generateTournamentBracket(
  sessionId: string,
  roundNumber: number,
): void {
  const songs = getSongs(sessionId, roundNumber);

  if (songs.length < 2) {
    throw new Error("Need at least 2 songs to start tournament");
  }

  createBracket(sessionId, roundNumber, songs);
  // Matches are automatically stored in createBracket
}

function createBracket(
  sessionId: string,
  roundNumber: number,
  songs: Song[],
): TournamentMatch[] {
  const matches: TournamentMatch[] = [];
  let matchNumber = 0;

  // Create initial matches
  for (let i = 0; i < songs.length; i += 2) {
    const songA = songs[i];
    const songB = i + 1 < songs.length ? songs[i + 1] : null;

    const match = createMatch(
      sessionId,
      roundNumber,
      matchNumber,
      songA.id,
      songB?.id || null,
    );
    matches.push(match);
    matchNumber++;
  }

  // Handle odd number of songs (add bye matches if needed)
  if (songs.length % 2 === 1) {
    // Last song already paired with null, which represents a bye
    // The song will automatically advance
  }

  return matches;
}

/**
 * Advances winners from completed matches to the next round
 * Returns true if tournament is finished (1 winner remaining)
 */
export function advanceRound(
  sessionId: string,
  currentRoundNumber: number,
): { finished: boolean; winningSongId: string | null } {
  const currentMatches = getMatches(sessionId, currentRoundNumber);

  // Check if all matches are completed
  const allCompleted = currentMatches.every((m) => m.status === "completed");
  if (!allCompleted) {
    throw new Error("Not all matches in current round are completed");
  }

  // Collect winners
  const winners: Song[] = [];

  for (const match of currentMatches) {
    if (!match.winner_id) {
      throw new Error(`Match ${match.id} completed but has no winner`);
    }

    // Winner could be from song_a or song_b, or if one is null (bye), that song wins
    const winningSong = match.winner_id;
    winners.push({
      id: winningSong,
      session_id: sessionId,
      round_number: currentRoundNumber,
      spotify_id: "",
      player_id: "",
      start_time: 0,
      song_name: "",
      artist_name: "",
      image_url: null,
      created_at: 0,
    } as unknown as Song);
  }

  // If only 1 winner, tournament is finished
  if (winners.length === 1) {
    return {
      finished: true,
      winningSongId: winners[0].id,
    };
  }

  // Otherwise, create bracket for next round
  const nextRoundNumber = currentRoundNumber + 1;

  // Import getSongs at top to get full song details
  const fullWinners = currentMatches
    .filter((m) => m.winner_id)
    .map((m) => {
      // Return the actual song object for next bracket
      // This is simplified; in practice you'd fetch the song details
      return m.winner_id;
    });

  let matchNumber = 0;
  for (let i = 0; i < fullWinners.length; i += 2) {
    const songA = fullWinners[i];
    const songB = i + 1 < fullWinners.length ? fullWinners[i + 1] : null;

    createMatch(sessionId, nextRoundNumber, matchNumber, songA, songB);
    matchNumber++;
  }

  return {
    finished: false,
    winningSongId: null,
  };
}

/**
 * Determines winner of a match based on votes
 * Returns the winning song ID
 */
export function determineMatchWinner(match: TournamentMatch): string {
  // If one side is null (bye), the other side wins automatically
  if (!match.song_a_id) {
    if (!match.song_b_id) {
      throw new Error("Match has no songs");
    }
    return match.song_b_id;
  }

  if (!match.song_b_id) {
    return match.song_a_id;
  }

  // Both sides present - compare votes
  if (match.votes_a > match.votes_b) {
    return match.song_a_id;
  } else if (match.votes_b > match.votes_a) {
    return match.song_b_id;
  } else {
    // Tie - random selection (could also pick based on submission order)
    return Math.random() < 0.5 ? match.song_a_id : match.song_b_id;
  }
}

/**
 * Gets the display duration for a song in a match
 * First match: 30 seconds, subsequent matches: 15 seconds
 */
export function getPlaybackDuration(roundNumber: number): number {
  return roundNumber === 1 ? 30 : 15;
}
