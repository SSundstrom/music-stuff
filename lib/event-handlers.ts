import { eventBus } from "./event-bus";
import { sseManager } from "./sse-manager";
import {
  getMatch,
  getMatches,
  getPlayers,
  getSongs,
  getSession,
  getTournament,
  updateMatch,
  updateTournament,
  getMatchVoteCount,
} from "./game-session";
import { determineMatchWinner, advanceToNextMatch } from "./tournament";
import type { MatchEndedMessage, SSEMessage } from "@/types/game";

let initialized = false;

export function initializeEventHandlers(): void {
  if (initialized) return;
  initialized = true;
  // Handle vote:cast event
  eventBus.on("vote:cast", async (data) => {
    console.log(`[vote:cast]: ${JSON.stringify(data)}`);
    try {
      const { sessionId, tournamentId, matchId } = data;

      // Check if all players have voted
      const voteCount = await getMatchVoteCount(matchId);
      const players = await getPlayers(sessionId);

      if (voteCount === players.length) {
        // All players have voted, emit match:completed event
        eventBus.emit("match:completed", {
          matchId,
          sessionId,
          tournamentId,
        });
      }
    } catch (error) {
      console.error("[EventHandler] Error handling vote:cast event:", error);
    }
  });

  // Handle match:completed event
  eventBus.on("match:completed", async (data) => {
    console.log(`[match:completed]: ${JSON.stringify(data)}`);
    try {
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
    } catch (error) {
      console.error(
        "[EventHandler] Error handling match:completed event:",
        error,
      );
    }
  });

  eventBus.on("round:advanced", (data) => {
    console.log(`[round:advanced]: ${JSON.stringify(data)}`);
  });

  eventBus.on("game:finished", (data) => {
    console.log(`[game:finished]: ${JSON.stringify(data)}`);
  });
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
  eventBus.emit("game:finished", {
    sessionId,
    tournamentId,
    winningSongId,
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
