import { getSession, updateSession, getPlayers, getSongs, getMatches } from "@/lib/game-session";
import { SubmitCategoryRequestSchema } from "@/types/game";
import { sseManager } from "@/lib/sse-manager";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const body = await request.json();
    const validated = SubmitCategoryRequestSchema.parse(body);

    const session = getSession(sessionId);
    if (!session) {
      return new Response(JSON.stringify({ error: "Session not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get current picker
    const players = getPlayers(sessionId);
    const currentPicker = players[session.current_picker_index];

    if (!currentPicker) {
      return new Response(JSON.stringify({ error: "No valid picker found" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Update session with category and move to song submission phase
    updateSession(sessionId, {
      current_category: validated.category,
      status: "song_submission",
    });

    // Broadcast category_announced and game_state to all players
    const updatedSession = getSession(sessionId)!;
    const songs = getSongs(sessionId, updatedSession.current_round);
    const matches = getMatches(sessionId, updatedSession.current_round);

    sseManager.broadcast(sessionId, {
      type: "category_announced",
      data: { category: validated.category },
    });

    sseManager.broadcast(sessionId, {
      type: "game_state",
      data: {
        session: updatedSession,
        players,
        songs,
        matches,
      },
    });

    return new Response(
      JSON.stringify({
        category: validated.category,
        picker_id: currentPicker.id,
        picker_name: currentPicker.name,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
}
