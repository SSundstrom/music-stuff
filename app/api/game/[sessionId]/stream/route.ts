import { sseManager } from "@/lib/sse-manager";
import {
  getSession,
  getPlayers,
  getSongs,
  getMatches,
} from "@/lib/game-session";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;
  const url = new URL(request.url);
  const playerId = url.searchParams.get("playerId") || "guest"; // Allow guests without a playerId

  // Verify session exists
  const session = getSession(sessionId);
  if (!session) {
    return new Response(JSON.stringify({ error: "Session not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Create a ReadableStream for SSE that stays open
  let keepaliveInterval: NodeJS.Timeout | null = null;
  let controller: ReadableStreamDefaultController<Uint8Array> | null = null;

  const stream = new ReadableStream({
    start(ctrl) {
      controller = ctrl;
      // Send initial game state
      const players = getPlayers(sessionId);
      const songs = getSongs(sessionId, session.current_round);
      const matches = getMatches(sessionId, session.current_round);

      const initialState = {
        type: "game_state",
        data: {
          session,
          players,
          songs,
          matches,
        },
      };

      const encoder = new TextEncoder();
      const message = `data: ${JSON.stringify(initialState)}\n\n`;
      ctrl.enqueue(encoder.encode(message));

      // Register this connection with SSE manager with cleanup callback
      sseManager.addConnection(sessionId, playerId, ctrl, () => {
        if (keepaliveInterval) {
          clearInterval(keepaliveInterval);
        }
        console.log(
          `[SSE] Connection cleaned up for session ${sessionId}, player ${playerId}`,
        );
      });

      // Send keepalive comment every 30 seconds to keep connection alive
      keepaliveInterval = setInterval(() => {
        try {
          ctrl.enqueue(new TextEncoder().encode(":keepalive\n\n"));
        } catch {
          if (keepaliveInterval) {
            clearInterval(keepaliveInterval);
            keepaliveInterval = null;
          }
        }
      }, 30000);
    },
    cancel() {
      if (controller) {
        sseManager.removeConnection(sessionId, controller);
      }
      if (keepaliveInterval) {
        clearInterval(keepaliveInterval);
      }
      console.log(
        `[SSE] Stream cancelled for session ${sessionId}, player ${playerId}`,
      );
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "X-Accel-Buffering": "no",
      Pragma: "no-cache",
    },
  });
}
