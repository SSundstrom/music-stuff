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
      sessionId: sessionId,
      ...body,
    });

    // Check if session exists
    const session = await getSession(validated.sessionId);
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

    const isOwner = authSession?.user?.id === session.ownerId;

    // Add player to session
    const player = await addPlayer(validated.sessionId, validated.playerName, isOwner);

    // Broadcast player_joined message to all players in the session
    sseManager.broadcast(validated.sessionId, {
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
