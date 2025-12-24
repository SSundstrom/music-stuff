import { auth } from "@/lib/auth";
import { getSession, addPlayer } from "@/lib/game-session";
import { JoinSessionRequestSchema, type SSEMessage } from "@/types/game";
import { sseManager } from "@/lib/sse-manager";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const body = await request.json();
    const validated = JoinSessionRequestSchema.parse({
      session_id: sessionId,
      ...body,
    });

    // Check if session exists
    const session = getSession(validated.session_id);
    if (!session) {
      return new Response(JSON.stringify({ error: "Session not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get current user to check if they're the owner
    const authSession = await auth.api.getSession({
      headers: request.headers,
    });

    const isOwner = authSession?.user?.id === session.owner_id;

    // Add player to session
    const player = addPlayer(validated.session_id, validated.player_name, isOwner);

    // Broadcast player_joined message to all players in the session
    sseManager.broadcast(validated.session_id, {
      type: "player_joined",
      data: player,
    } satisfies SSEMessage);

    return new Response(JSON.stringify(player), {
      status: 201,
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
