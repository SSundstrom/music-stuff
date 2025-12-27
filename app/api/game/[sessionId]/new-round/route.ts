import { auth } from "@/lib/auth";
import prisma from "@/lib/db-prisma";
import { createTournament } from "@/lib/game-session";
import { sseManager } from "@/lib/sse-manager";
import { nextPicker } from "@/lib/tournament";
import { GameStateMessage } from "@/types/game";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await params;

    const session = await prisma.gameSession.findUnique({
      where: { id: sessionId },
      include: { tournaments: { orderBy: { createdAt: "desc" } } },
    });

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

    if (session.ownerId !== authSession?.user?.id) {
      return new Response(
        JSON.stringify({ error: "Only the owner can kick players" }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
    const lastTournament = session.tournaments.at(0);

    // Get current picker
    const players = await prisma.player.findMany({
      where: { sessionId: sessionId },
      orderBy: { joinOrder: "asc" }, //TODO: better way to pick player order
    });
    const currentPickerIndex = nextPicker(lastTournament, players.length);
    const currentPicker = players[currentPickerIndex];

    if (!currentPicker) {
      return new Response(JSON.stringify({ error: "No valid picker found" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Create a new tournament with this category
    const { matches, songs, ...tournament } = await createTournament({
      sessionId,
      pickerIndex: currentPickerIndex,
    });

    if (lastTournament) {
      await prisma.tournament.update({
        where: { id: lastTournament.id },
        data: { status: "archived" },
      });
    }

    sseManager.broadcast(sessionId, {
      type: "game_state",
      data: {
        session,
        tournament,
        players,
        songs,
        matches,
      },
    } satisfies GameStateMessage);

    return new Response(
      JSON.stringify({
        tournamentId: tournament.id,
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
