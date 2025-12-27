import {
  getSession,
  getActiveTournament,
  getPlayers,
  getSongs,
  getMatches,
  updateSession,
} from "@/lib/game-session";
import { sseManager } from "@/lib/sse-manager";
import type { SSEMessage } from "@/types/game";

export async function GET(
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
    const [players, songs, matches] = await Promise.all([
      getPlayers(sessionId),
      tournament ? getSongs(tournament.id) : Promise.resolve([]),
      tournament ? getMatches(tournament.id) : Promise.resolve([]),
    ]);

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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await params;
    const body = await request.json();

    if ("owner_id" in body) {
      return new Response(
        JSON.stringify({ error: "Cannot modify session owner" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    if ("status" in body) {
      return new Response(
        JSON.stringify({ error: "Cannot modify session status directly" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    await updateSession(sessionId, body);

    // Broadcast updated game state to all players
    const updatedSession = await getSession(sessionId);
    if (updatedSession) {
      const tournament = await getActiveTournament(sessionId);
      const [players, songs, matches] = await Promise.all([
        getPlayers(sessionId),
        tournament ? getSongs(tournament.id) : Promise.resolve([]),
        tournament ? getMatches(tournament.id) : Promise.resolve([]),
      ]);

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
