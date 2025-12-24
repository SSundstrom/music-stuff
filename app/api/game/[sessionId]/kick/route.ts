import { auth } from "@/lib/auth";
import { getSession, getPlayer, deletePlayer } from "@/lib/game-session";
import { sseManager } from "@/lib/sse-manager";
import type { SSEMessage } from "@/types/game";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const { playerId } = await request.json();

    if (!playerId) {
      return new Response(JSON.stringify({ error: "Player ID is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const session = getSession(sessionId);
    if (!session) {
      return new Response(JSON.stringify({ error: "Session not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Verify the requester is the owner
    const authSession = await auth.api.getSession({
      headers: request.headers,
    });
    if (session.owner_id !== authSession?.user?.id) {
      return new Response(JSON.stringify({ error: "Only the owner can kick players" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    const player = getPlayer(playerId);
    if (!player || player.session_id !== sessionId) {
      return new Response(JSON.stringify({ error: "Player not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    deletePlayer(playerId);

    // Broadcast player_left message to all players
    sseManager.broadcast(sessionId, {
      type: "player_left",
      data: { player_id: playerId },
    } satisfies SSEMessage);

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
