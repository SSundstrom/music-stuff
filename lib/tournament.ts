import { shuffle } from "./arrayHelper";
import prisma from "./db-prisma";
import { createMatch, getSongs, updateMatch } from "./game-session";
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
 * Processes match completion in single-elimination tournament
 * Eliminates the loser, checks if tournament is over
 * Returns tournament state after elimination
 */
export async function advanceToNextMatch(tournamentId: string): Promise<
  | {
      finished: true;
      winningSongId: string;
    }
  | { finished: false }
> {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: { matches: { orderBy: { roundNumber: "asc" } } },
  });

  if (!tournament) {
    throw new Error(
      `Could not find a tournament with this id: ${tournamentId}`,
    );
  }

  const { currentRound, matches } = tournament;

  const finishedMatch = matches[currentRound];

  if (!finishedMatch || finishedMatch.status !== "completed") {
    throw new Error("Match was not finished.");
  }

  const { winnerId } = finishedMatch;
  if (!winnerId) {
    throw new Error("Finished match did not have a winner.");
  }

  const nextMatch = matches[currentRound + 1];

  // Check if we are finnished
  if (!nextMatch) {
    return { finished: true, winningSongId: winnerId };
  }

  // Set new match to playing and add the winner
  await prisma.tournamentMatch.update({
    where: { id: nextMatch.id },
    data: { songAId: winnerId, status: "playing" },
  });

  // Update the roundNumber in tournament
  await prisma.tournament.update({
    where: { id: tournament.id },
    data: { currentRound: currentRound + 1 },
  });

  return {
    finished: false,
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
