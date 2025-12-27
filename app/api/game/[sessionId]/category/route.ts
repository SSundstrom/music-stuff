import {
  CategoryAnnouncedMessage,
  GameStateMessage,
  SubmitCategoryRequestSchema,
} from "@/types/game";
import { sseManager } from "@/lib/sse-manager";
import prisma from "@/lib/db-prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tournamentId: string }> },
) {
  try {
    const { tournamentId } = await params;
    const body = await request.json();
    const validated = SubmitCategoryRequestSchema.parse(body);

    const { matches, songs, ...tournament } = await prisma.tournament.update({
      where: { id: tournamentId },
      data: { category: validated.category },
      include: { songs: true, matches: true },
    });

    const { sessionId } = tournament;

    const sessionData = await prisma.gameSession.findUnique({
      where: { id: sessionId },
      include: { players: true },
    });

    if (!sessionData) {
      throw new Error("Missing session");
    }

    const { players, ...session } = sessionData;

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
