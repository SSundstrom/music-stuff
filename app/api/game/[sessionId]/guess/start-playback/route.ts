import { auth } from "@/lib/auth";
import { getSession, getPlayers } from "@/lib/game-session";
import { startGuessingPhase, getGuessState } from "@/lib/guess-game";
import { sseManager } from "@/lib/sse-manager";
import type { SSEMessage } from "@/types/game";
import prisma from "@/lib/db-prisma";

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
        JSON.stringify({ error: "Only the owner can start playback" }),
        { status: 403, headers: { "Content-Type": "application/json" } },
      );
    }

    const currentTurn = await prisma.guessTurn.findFirst({
      where: { sessionId },
      orderBy: { turnNumber: "desc" },
    });

    if (!currentTurn || currentTurn.status !== "countdown") {
      return new Response(
        JSON.stringify({ error: "Not in countdown phase" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const { endsAt } = await startGuessingPhase(currentTurn.id);

    // Broadcast updated state
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

    return new Response(JSON.stringify({ endsAt: endsAt.toISOString() }), {
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
