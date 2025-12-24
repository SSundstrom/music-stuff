import { getSession, getActiveTournament, getPlayers, getSongs, getMatches, updateSession } from "@/lib/game-session";
import { sseManager } from "@/lib/sse-manager";
import type { SSEMessage } from "@/types/game";

export async function GET(
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
    const players = getPlayers(sessionId);
    const songs = tournament ? getSongs(tournament.id, tournament.current_round) : [];
    const matches = tournament ? getMatches(tournament.id, tournament.current_round) : [];

    return new Response(
      JSON.stringify({
        session,
        tournament,
        players,
        songs,
        matches,
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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const body = await request.json();

    if ("owner_id" in body) {
      return new Response(JSON.stringify({ error: "Cannot modify session owner" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if ("status" in body) {
      return new Response(JSON.stringify({ error: "Cannot modify session status directly" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    updateSession(sessionId, body);

    // Broadcast updated game state to all players
    const updatedSession = getSession(sessionId);
    if (updatedSession) {
      const tournament = getActiveTournament(sessionId);
      const players = getPlayers(sessionId);
      const songs = tournament ? getSongs(tournament.id, tournament.current_round) : [];
      const matches = tournament ? getMatches(tournament.id, tournament.current_round) : [];

      sseManager.broadcast(sessionId, {
        type: "game_state",
        data: {
          session: updatedSession,
          tournament: tournament ?? undefined,
          players,
          songs,
          matches,
        },
      } satisfies SSEMessage);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
}
