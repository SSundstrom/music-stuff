import { getSession, createTournament, updateTournament, getPlayers, getSongs, getMatches } from "@/lib/game-session";
import { sseManager } from "@/lib/sse-manager";
import type { SSEMessage } from "@/types/game";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    const session = await getSession(sessionId);
    if (!session) {
      return new Response(JSON.stringify({ error: "Session not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Create a new tournament in waiting status
    const tournament = await createTournament(sessionId, "");

    // Update tournament to category_selection status so players can select a category
    await updateTournament(tournament.id, {
      status: "category_selection",
      current_picker_index: 0,
    });

    // Get players to set initial picker
    const players = await getPlayers(sessionId);

    // Broadcast updated game state to all players
    const updatedTournament = {
      ...tournament,
      status: "category_selection" as const,
      current_picker_index: 0,
    };
    const [songs, matches] = await Promise.all([
      getSongs(tournament.id, updatedTournament.current_round),
      getMatches(tournament.id, updatedTournament.current_round),
    ]);

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
        message: "Tournament initialized",
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
