import { createMatch, getSongs, updateTournament } from "./game-session";
import type { Song, TournamentMatch, Tournament } from "@/types/game";

/**
 * Initializes tournament with single-elimination format
 * Selects 2 random undefeated songs for the first match
 */
export function initializeTournament(
  tournamentId: string,
): TournamentMatch {
  // Get all submitted songs (round 0 is submission phase)
  const allSongs = getSongs(tournamentId, 0);

  if (allSongs.length < 2) {
    throw new Error("Need at least 2 songs to start tournament");
  }

  // Select 2 random songs
  const selectedSongs = getRandomUndefeatedSongs(allSongs, [], 2);

  // Create first match
  const match = createMatch(
    tournamentId,
    0, // no longer using round_number for tracking
    0, // no longer using match_number for tracking
    selectedSongs[0].id,
    selectedSongs[1].id,
  );

  return match;
}

/**
 * Gets undefeated songs that haven't been played yet
 * For initial match: all songs
 * For subsequent matches: all songs except eliminated ones
 */
function getUndefeatedSongs(
  songs: Song[],
  eliminatedIds: string[],
): Song[] {
  return songs.filter((song) => !eliminatedIds.includes(song.id));
}

/**
 * Selects N random songs from a list
 */
function getRandomUndefeatedSongs(
  availableSongs: Song[],
  eliminatedIds: string[],
  count: number,
): Song[] {
  const undefeated = getUndefeatedSongs(availableSongs, eliminatedIds);

  if (undefeated.length < count) {
    throw new Error(
      `Not enough undefeated songs. Need ${count}, have ${undefeated.length}`,
    );
  }

  // Shuffle and pick first N
  const shuffled = [...undefeated].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Creates the next match in single-elimination tournament
 * Requires one song to be undefeated (the winner from previous match)
 * Selects a new random undefeated song to face it
 */
export function getNextMatch(
  tournamentId: string,
  allSongs: Song[],
  lastWinnerId: string,
  eliminatedIds: string[],
): TournamentMatch {
  // Get available songs (not eliminated and not the previous winner)
  const availableForNewOpponent = getUndefeatedSongs(allSongs, eliminatedIds).filter(
    (song) => song.id !== lastWinnerId,
  );

  if (availableForNewOpponent.length === 0) {
    throw new Error("No undefeated songs available for next match");
  }

  // Pick random opponent
  const opponent =
    availableForNewOpponent[
      Math.floor(Math.random() * availableForNewOpponent.length)
    ];

  // Create match between winner and new opponent
  const match = createMatch(tournamentId, 0, 0, lastWinnerId, opponent.id);

  return match;
}

/**
 * Processes match completion in single-elimination tournament
 * Eliminates the loser, checks if tournament is over
 * Returns tournament state after elimination
 */
export function advanceToNextMatch(
  tournamentId: string,
  match: TournamentMatch,
  tournamentRecord: Tournament,
): { finished: boolean; winningSongId: string | null } {
  if (!match.winner_id) {
    throw new Error(`Match ${match.id} completed but has no winner`);
  }

  // Determine loser
  const loserId =
    match.song_a_id === match.winner_id ? match.song_b_id : match.song_a_id;

  if (!loserId) {
    throw new Error("Cannot determine loser from match");
  }

  // Update eliminated songs
  const eliminatedIds = JSON.parse(tournamentRecord.eliminated_song_ids || "[]");
  eliminatedIds.push(loserId);

  // Get all songs to count undefeated
  const allSongs = getSongs(tournamentId, 0);
  const undefeatedSongs = getUndefeatedSongs(allSongs, eliminatedIds);

  // If only 1 undefeated song remains, tournament is finished
  if (undefeatedSongs.length === 1) {
    return {
      finished: true,
      winningSongId: undefeatedSongs[0].id,
    };
  }

  // Update tournament with new eliminated list
  updateTournament(tournamentId, {
    eliminated_song_ids: JSON.stringify(eliminatedIds),
  });

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
