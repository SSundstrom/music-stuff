import { shuffle } from "./arrayHelper";
import prisma from "./db-prisma";
import {
  createMatch,
  getMatch,
  getMatches,
  getMatchVoteCount,
  getPlayers,
  getSession,
  getSongs,
  getTournament,
  updateMatch,
  updateTournament,
} from "./game-session";
import type {
  Song,
  TournamentMatch,
  Tournament,
  MatchEndedMessage,
  SSEMessage,
} from "@/types/game";
import { sseManager } from "./sse-manager";

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
  | { finished: false; roundNumber: number }
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

  const roundNumber = currentRound + 1;
  // Update the roundNumber in tournament
  await prisma.tournament.update({
    where: { id: tournament.id },
    data: { currentRound: roundNumber },
  });

  return {
    finished: false,
    roundNumber,
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

type MatchIds = {
  sessionId: string;
  tournamentId: string;
  matchId: string;
};
export async function voteValidation(data: MatchIds) {
  const { sessionId, matchId } = data;

  // Check if all players have voted
  const voteCount = await getMatchVoteCount(matchId);
  const players = await getPlayers(sessionId);

  if (voteCount === players.length) {
    // All players have voted, emit match:completed event
    await matchCompletionValidation(data);
  }
}

export async function matchCompletionValidation(data: MatchIds) {
  const { sessionId, tournamentId, matchId } = data;

  const match = await getMatch(matchId);
  if (!match) return;

  const tournament = await getTournament(tournamentId);
  if (!tournament) return;

  // Determine the winner
  const winnerId = determineMatchWinner(match);

  // Update match with winner
  await updateMatch(matchId, {
    winnerId: winnerId,
    status: "completed",
  });

  sseManager.broadcast(sessionId, {
    type: "match_ended",
    data: {
      matchId,
      winnerId,
      votesA: match.votesA,
      votesB: match.votesB,
    },
  } satisfies MatchEndedMessage);

  // Process elimination and check if tournament is over
  const result = await advanceToNextMatch(tournamentId);

  if (result.finished) {
    await finishTournament({
      tournamentId,
      sessionId,
      winningSongId: result.winningSongId,
    });
  } else {
    sseManager.broadcast(sessionId, {
      type: "round_complete",
      data: {
        roundNumber: result.roundNumber,
      },
    } satisfies SSEMessage);
    try {
      // Broadcast updated game state
      const session = await getSession(sessionId);
      const updatedTournament = await getTournament(tournamentId);
      if (session && updatedTournament) {
        const [players, songs, matches] = await Promise.all([
          getPlayers(sessionId),
          getSongs(tournamentId),
          getMatches(tournamentId),
        ]);
        sseManager.broadcast(sessionId, {
          type: "game_state",
          data: {
            session,
            tournament: updatedTournament,
            players,
            songs,
            matches,
          },
        } satisfies SSEMessage);
      }
    } catch (error) {
      console.error("[EventHandler] Error creating next match:", error);
    }
  }
}

async function finishTournament({
  tournamentId,
  winningSongId,
  sessionId,
}: {
  tournamentId: string;
  sessionId: string;
  winningSongId: string;
}) {
  // Tournament finished
  await updateTournament(tournamentId, {
    status: "finished",
    winningSongId: winningSongId,
  });

  // Broadcast updated game state after tournament is updated
  const session = await getSession(sessionId);
  const updatedTournament = await getTournament(tournamentId);
  if (session && updatedTournament) {
    const [players, songs, matches] = await Promise.all([
      getPlayers(sessionId),
      getSongs(tournamentId),
      getMatches(tournamentId),
    ]);
    sseManager.broadcast(sessionId, {
      type: "game_winner",
      data: {
        winningSongId: winningSongId,
      },
    } satisfies SSEMessage);
    sseManager.broadcast(sessionId, {
      type: "game_state",
      data: {
        session,
        tournament: updatedTournament,
        players,
        songs,
        matches,
      },
    } satisfies SSEMessage);
  }
}
