import {
  getSession,
  getActiveTournament,
  updateTournament,
  getSongs,
  getPlayers,
  getMatches,
} from "@/lib/game-session";
import { initializeTournament } from "@/lib/tournament";
import { sseManager } from "@/lib/sse-manager";
import type { SSEMessage } from "@/types/game";

export async function POST(
  _: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await params;

    const session = await getSession(sessionId);
    if (!session) {
      return new Response(JSON.stringify({ error: "Session not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const tournament = await getActiveTournament(sessionId);
    if (!tournament) {
      return new Response(
        JSON.stringify({ error: "No active tournament found" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    if (tournament.status !== "song_submission") {
      return new Response(
        JSON.stringify({ error: "Not in song submission phase" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Get submitted songs
    const songs = await getSongs(tournament.id);

    if (songs.length < 2) {
      return new Response(
        JSON.stringify({ error: "Need at least 2 songs to start tournament" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Initialize tournament with first match
    await initializeTournament(tournament.id);

    // Update tournament status
    await updateTournament(tournament.id, {
      status: "tournament",
    });

    // Broadcast updated game state to all players
    const updatedTournament = await getActiveTournament(sessionId);
    if (updatedTournament) {
      const [players, matches] = await Promise.all([
        getPlayers(sessionId),
        getMatches(tournament.id),
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

    return new Response(
      JSON.stringify({
        status: "tournament",
        songs_submitted: songs.length,
        message: "Tournament initialized with first match",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
}
