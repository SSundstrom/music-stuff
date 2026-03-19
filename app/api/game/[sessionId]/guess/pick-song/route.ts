import { getSession, getPlayers } from "@/lib/game-session";
import { submitPickedSong, getGuessState } from "@/lib/guess-game";
import { sseManager } from "@/lib/sse-manager";
import { PickSongRequestSchema } from "@/types/game";
import type { SSEMessage } from "@/types/game";
import prisma from "@/lib/db-prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await params;
    const body = await request.json();
    const { playerId, ...songData } = body;

    if (!playerId) {
      return new Response(JSON.stringify({ error: "playerId is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const validated = PickSongRequestSchema.parse(songData);

    const session = await getSession(sessionId);
    if (!session) {
      return new Response(JSON.stringify({ error: "Session not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get current turn
    const currentTurn = await prisma.guessTurn.findFirst({
      where: { sessionId },
      orderBy: { turnNumber: "desc" },
    });

    if (!currentTurn) {
      return new Response(JSON.stringify({ error: "No active turn" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (currentTurn.pickerId !== playerId) {
      return new Response(
        JSON.stringify({ error: "You are not the current picker" }),
        { status: 403, headers: { "Content-Type": "application/json" } },
      );
    }

    if (currentTurn.status !== "picking") {
      return new Response(
        JSON.stringify({ error: "Not in picking phase" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    await submitPickedSong(currentTurn.id, validated);

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
