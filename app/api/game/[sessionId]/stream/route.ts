import { sseManager } from "@/lib/sse-manager";
import {
  getSession,
  getActiveTournament,
  getPlayers,
  getSongs,
  getMatches,
} from "@/lib/game-session";
import { ensureEventHandlersInitialized } from "@/lib/initialize-events";
import type { SSEMessage } from "@/types/game";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;
  const url = new URL(request.url);
  const playerId = url.searchParams.get("playerId") || "guest"; // Allow guests without a playerId

  // Ensure event handlers are initialized on first request
  ensureEventHandlersInitialized();

  // Verify session exists
  const session = await getSession(sessionId);
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
    async start(ctrl) {
      controller = ctrl;
      // Send initial game state
      const tournament = await getActiveTournament(sessionId);
      const [players, songs, matches] = await Promise.all([
        getPlayers(sessionId),
        tournament ? getSongs(tournament.id) : Promise.resolve([]),
        tournament ? getMatches(tournament.id) : Promise.resolve([]),
      ]);

      const initialState = {
        type: "game_state",
        data: {
          session,
          tournament,
          players,
          songs,
          matches,
        },
      } satisfies SSEMessage;

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

      // Send keepalive comment every 15 seconds to keep connection alive
      // (Vercel serverless timeout is 25s, so we need to send before that)
      keepaliveInterval = setInterval(() => {
        try {
          ctrl.enqueue(new TextEncoder().encode(":keepalive\n\n"));
        } catch {
          if (keepaliveInterval) {
            clearInterval(keepaliveInterval);
            keepaliveInterval = null;
          }
        }
      }, 15000);
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
