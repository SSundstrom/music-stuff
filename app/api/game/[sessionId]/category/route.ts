import { createTournament } from "@/lib/game-session";
import {
  CategoryAnnouncedMessage,
  GameStateMessage,
  SubmitCategoryRequestSchema,
} from "@/types/game";
import { sseManager } from "@/lib/sse-manager";
import prisma from "@/lib/db-prisma";
import { nextPicker } from "@/lib/tournament";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await params;
    const body = await request.json();
    const validated = SubmitCategoryRequestSchema.parse(body);

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

    const lastTournament = session.tournaments.at(0);

    // Get current picker
    const players = await prisma.player.findMany({
      where: { sessionId: sessionId },
      orderBy: { joinOrder: "asc" },
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
      category: validated.category,
      pickerIndex: currentPickerIndex,
    });

    sseManager.broadcast(sessionId, {
      type: "category_announced",
      data: { category: validated.category },
    } satisfies CategoryAnnouncedMessage);

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
        category: validated.category,
        pickerId: currentPicker.id,
        pickerName: currentPicker.name,
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
