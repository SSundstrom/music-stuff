import { shuffle } from "./arrayHelper";
import {
  createMatch,
  getSongs,
  updateMatch,
  updateTournament,
} from "./game-session";
import type { Song, TournamentMatch, Tournament } from "@/types/game";

/**
 * Initializes tournament with single-elimination format
 */
export async function initializeTournament(
  tournamentId: string,
): Promise<TournamentMatch> {
  // Get all submitted songs (round 0 is submission phase)
  const allSongs = await getSongs(tournamentId);

  if (allSongs.length < 2) {
    throw new Error("Need at least 2 songs to start tournament");
  }

  const [first, ...rest] = shuffle(allSongs);
  const matchBuilder = ({ id }: Song, index: number) =>
    createMatch({ tournamentId, songId: id, round: index });

  // Generate all matches
  const matches = await Promise.all(rest.map(matchBuilder));

  // Add the second song to the first match
  const firstMatch = matches.at(0);
  if (!firstMatch) throw new Error("Something went wrong with match creation");

  return await updateMatch(firstMatch.id, { songAId: first.id });
}

/**
 * Gets undefeated songs that haven't been played yet
 * For initial match: all songs
 * For subsequent matches: all songs except eliminated ones
 */
function getUndefeatedSongs(songs: Song[], eliminatedIds: string[]): Song[] {
  return songs.filter((song) => !eliminatedIds.includes(song.id));
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
  const availableForNewOpponent = getUndefeatedSongs(
    allSongs,
    eliminatedIds,
  ).filter((song) => song.id !== lastWinnerId);

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
  if (!match.winnerId) {
    throw new Error(`Match ${match.id} completed but has no winner`);
  }

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
export function determineMatchWinner({
  songAId,
  songBId,
  votesA,
  votesB,
}: TournamentMatch): string {
  // If one side is null (bye), the other side wins automatically
  if (!songAId || !songBId) {
    throw new Error("Match needs two songs");
  }

  if (votesA > votesB) return songAId;
  if (votesA < votesB) return songBId;

  // Tie - random selection (could also pick based on submission order)
  return Math.random() < 0.5 ? songAId : songBId;
}

export function nextPicker(
  t: Tournament | undefined,
  nbrOfPlayers: number,
): number {
  const currentPicker = t?.currentPickerIndex ?? -1;
  return (currentPicker + 1) % nbrOfPlayers;
}
