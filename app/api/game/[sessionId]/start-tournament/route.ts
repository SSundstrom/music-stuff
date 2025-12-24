import { getSession, getActiveTournament, updateTournament, getSongs, getPlayers, getMatches } from "@/lib/game-session";
import { generateTournamentBracket } from "@/lib/tournament";
import { sseManager } from "@/lib/sse-manager";
import type { SSEMessage } from "@/types/game";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    const session = getSession(sessionId);
    if (!session) {
      return new Response(JSON.stringify({ error: "Session not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const tournament = getActiveTournament(sessionId);
    if (!tournament) {
      return new Response(JSON.stringify({ error: "No active tournament found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (tournament.status !== "song_submission") {
      return new Response(JSON.stringify({ error: "Not in song submission phase" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get submitted songs
    const songs = getSongs(tournament.id, tournament.current_round);

    if (songs.length < 2) {
      return new Response(
        JSON.stringify({ error: "Need at least 2 songs to start tournament" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Generate bracket
    generateTournamentBracket(tournament.id, tournament.current_round);

    // Update tournament status
    updateTournament(tournament.id, {
      status: "tournament",
    });

    // Broadcast updated game state to all players
    const updatedTournament = getActiveTournament(sessionId);
    if (updatedTournament) {
      const players = getPlayers(sessionId);
      const matches = getMatches(tournament.id, updatedTournament.current_round);

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

    return new Response(
      JSON.stringify({
        status: "tournament",
        songs_submitted: songs.length,
        message: "Tournament bracket generated",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
}
