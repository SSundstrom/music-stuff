import { getSession } from "@/lib/game-session";
import { processGuess } from "@/lib/guess-game";
import { SubmitGuessRequestSchema } from "@/types/game";
import prisma from "@/lib/db-prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await params;
    const body = await request.json();
    const { playerId, ...guessData } = body;

    if (!playerId) {
      return new Response(JSON.stringify({ error: "playerId is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const validated = SubmitGuessRequestSchema.parse(guessData);

    const session = await getSession(sessionId);
    if (!session) {
      return new Response(JSON.stringify({ error: "Session not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const currentTurn = await prisma.guessTurn.findFirst({
      where: { sessionId },
      orderBy: { turnNumber: "desc" },
    });

    if (!currentTurn || currentTurn.status !== "guessing") {
      return new Response(
        JSON.stringify({ error: "Not in guessing phase" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    if (currentTurn.pickerId === playerId) {
      return new Response(
        JSON.stringify({ error: "Picker cannot guess" }),
        { status: 403, headers: { "Content-Type": "application/json" } },
      );
    }

    const result = await processGuess(currentTurn.id, playerId, validated);

    return new Response(JSON.stringify(result), {
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
