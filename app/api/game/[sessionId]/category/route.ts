import { getSession, createTournament, updateTournament, getPlayers, getSongs, getMatches } from "@/lib/game-session";
import { SubmitCategoryRequestSchema, type SSEMessage } from "@/types/game";
import { sseManager } from "@/lib/sse-manager";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const body = await request.json();
    const validated = SubmitCategoryRequestSchema.parse(body);

    const session = await getSession(sessionId);
    if (!session) {
      return new Response(JSON.stringify({ error: "Session not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get current picker
    const players = await getPlayers(sessionId);
    const currentPickerIndex = 0; // For now, start with first player
    const currentPicker = players[currentPickerIndex];

    if (!currentPicker) {
      return new Response(JSON.stringify({ error: "No valid picker found" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Create a new tournament with this category
    const tournament = await createTournament(sessionId, validated.category);

    // Move tournament to song submission phase
    await updateTournament(tournament.id, {
      status: "song_submission",
      current_picker_index: currentPickerIndex,
    });

    // Broadcast category_announced and game_state to all players
    const updatedTournament = {
      ...tournament,
      status: "song_submission" as const,
      current_picker_index: currentPickerIndex,
    };
    const [songs, matches] = await Promise.all([
      getSongs(tournament.id, updatedTournament.current_round),
      getMatches(tournament.id, updatedTournament.current_round),
    ]);

    sseManager.broadcast(sessionId, {
      type: "category_announced",
      data: { category: validated.category },
    } satisfies SSEMessage);

    sseManager.broadcast(sessionId, {
      type: "game_state",
      data: {
        session,
        tournament: updatedTournament,
        players,
        songs,
        matches,
      },
    } satisfies SSEMessage);

    return new Response(
      JSON.stringify({
        tournament_id: tournament.id,
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
