import { auth } from "@/lib/auth";
import { getSession, getPlayers } from "@/lib/game-session";
import { startGuessGame, getGuessState } from "@/lib/guess-game";
import { sseManager } from "@/lib/sse-manager";
import type { SSEMessage } from "@/types/game";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const authSession = await auth.api.getSession({
      headers: request.headers,
    });
    if (!authSession?.user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { sessionId } = await params;
    const session = await getSession(sessionId);
    if (!session) {
      return new Response(JSON.stringify({ error: "Session not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (session.ownerId !== authSession.user.id) {
      return new Response(
        JSON.stringify({ error: "Only the owner can start the game" }),
        { status: 403, headers: { "Content-Type": "application/json" } },
      );
    }

    if (session.gameType !== "guess_the_song") {
      return new Response(
        JSON.stringify({ error: "Session is not a guess_the_song game" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    await startGuessGame(sessionId);

    // Broadcast full game state
    const [players, guessState] = await Promise.all([
      getPlayers(sessionId),
      getGuessState(sessionId),
    ]);

    sseManager.broadcast(sessionId, {
      type: "game_state",
      data: {
        session,
        tournament: null,
        players,
        songs: [],
        matches: [],
        guessState,
      },
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
