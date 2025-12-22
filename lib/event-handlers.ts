import { eventBus } from "./event-bus";
import { sseManager } from "./sse-manager";
import {
  getMatch,
  getMatches,
  getPlayers,
  getSongs,
  getSession,
  updateMatch,
  updateSession,
} from "./game-session";
import { determineMatchWinner, advanceRound } from "./tournament";
import { getDb } from "./db";

let initialized = false;

export function initializeEventHandlers(): void {
  if (initialized) return;
  initialized = true;
  // Handle vote:cast event
  eventBus.on("vote:cast", async (data) => {
    console.log(`[vote:cast]: ${JSON.stringify(data)}`);
    try {
      const { sessionId, matchId } = data;

      // Check if all players have voted
      const db = getDb();
      const stmt = db.prepare(
        "SELECT COUNT(DISTINCT player_id) as vote_count FROM votes WHERE match_id = ?",
      );
      const result = stmt.get(matchId) as { vote_count: number };
      const voteCount = result.vote_count;

      const players = getPlayers(sessionId);

      if (voteCount === players.length) {
        // All players have voted, emit match:completed event
        eventBus.emit("match:completed", {
          matchId,
          sessionId,
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
      const { sessionId, matchId } = data;

      const match = getMatch(matchId);
      if (!match) return;

      // Determine the winner
      const winnerId = determineMatchWinner(match);

      // Update match with winner
      updateMatch(matchId, {
        winner_id: winnerId,
        status: "completed",
      });

      // Check if all matches in the current round are completed
      const currentMatches = getMatches(sessionId, match.round_number);
      const allMatchesCompleted = currentMatches.every(
        (m) => m.status === "completed",
      );

      if (allMatchesCompleted) {
        // All matches completed, advance to next round
        const { finished, winningSongId } = advanceRound(
          sessionId,
          match.round_number,
        );

        if (finished && winningSongId) {
          // Tournament finished
          updateSession(sessionId, { status: "finished" });
          eventBus.emit("game:finished", {
            sessionId,
            winningSongId,
          });

          // Broadcast updated game state after session is updated
          const updatedSession = getSession(sessionId);
          if (updatedSession) {
            const players = getPlayers(sessionId);
            const songs = getSongs(sessionId, updatedSession.current_round);
            const matches = getMatches(sessionId, updatedSession.current_round);
            sseManager.broadcast(sessionId, {
              type: "game_state",
              data: {
                session: updatedSession,
                players,
                songs,
                matches,
              },
            });
          }
        } else {
          // Round advanced
          updateSession(sessionId, {
            current_round: match.round_number + 1,
          });
          eventBus.emit("round:advanced", {
            sessionId,
            roundNumber: match.round_number + 1,
          });

          // Broadcast updated game state after session is updated
          const updatedSession = getSession(sessionId);
          if (updatedSession) {
            const players = getPlayers(sessionId);
            const songs = getSongs(sessionId, updatedSession.current_round);
            const matches = getMatches(sessionId, updatedSession.current_round);
            sseManager.broadcast(sessionId, {
              type: "game_state",
              data: {
                session: updatedSession,
                players,
                songs,
                matches,
              },
            });
          }
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
