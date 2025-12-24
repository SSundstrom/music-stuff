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
} from "./game-session";
import { determineMatchWinner, advanceToNextMatch, getNextMatch } from "./tournament";
import { getDb } from "./db";
import type { SSEMessage } from "@/types/game";

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

      const match = getMatch(matchId);
      if (!match) return;

      const tournament = getTournament(tournamentId);
      if (!tournament) return;

      // Determine the winner
      const winnerId = determineMatchWinner(match);

      // Update match with winner
      updateMatch(matchId, {
        winner_id: winnerId,
        status: "completed",
      });

      // Process elimination and check if tournament is over
      const { finished, winningSongId } = advanceToNextMatch(
        tournamentId,
        { ...match, winner_id: winnerId, status: "completed" },
        tournament,
      );

      if (finished && winningSongId) {
        // Tournament finished
        updateTournament(tournamentId, {
          status: "finished",
          winning_song_id: winningSongId,
        });
        eventBus.emit("game:finished", {
          sessionId,
          tournamentId,
          winningSongId,
        });

        // Broadcast updated game state after tournament is updated
        const session = getSession(sessionId);
        const updatedTournament = getTournament(tournamentId);
        if (session && updatedTournament) {
          const players = getPlayers(sessionId);
          const songs = getSongs(tournamentId, 0);
          const matches = getMatches(tournamentId, 0);
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
      } else {
        // Continue tournament with next match
        const allSongs = getSongs(tournamentId, 0);
        const eliminatedIds = JSON.parse(tournament.eliminated_song_ids || "[]");

        try {
          const nextMatch = getNextMatch(tournamentId, allSongs, winnerId, eliminatedIds);

          eventBus.emit("match:ready", {
            sessionId,
            tournamentId,
            matchId: nextMatch.id,
          });

          // Broadcast updated game state
          const session = getSession(sessionId);
          const updatedTournament = getTournament(tournamentId);
          if (session && updatedTournament) {
            const players = getPlayers(sessionId);
            const songs = getSongs(tournamentId, 0);
            const matches = getMatches(tournamentId, 0);
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
