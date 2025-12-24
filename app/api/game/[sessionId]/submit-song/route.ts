import { getSession, getActiveTournament, addSong, getPlayer } from "@/lib/game-session";
import { SubmitSongRequestSchema, type SSEMessage } from "@/types/game";
import { sseManager } from "@/lib/sse-manager";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const body = await request.json();

    const session = getSession(sessionId);
    if (!session) {
      return new Response(JSON.stringify({ error: "Session not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const tournament = getActiveTournament(sessionId);
    if (!tournament) {
      return new Response(JSON.stringify({ error: "No active tournament found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (tournament.status !== "song_submission") {
      return new Response(JSON.stringify({ error: "Not in song submission phase" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Validate request body
    const validated = SubmitSongRequestSchema.parse(body);

    // Get player ID from headers (in real app, would come from auth)
    const playerId = request.headers.get("X-Player-ID");
    if (!playerId) {
      return new Response(JSON.stringify({ error: "Player ID required" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Verify player exists and is in this session
    const player = getPlayer(playerId);
    if (!player || player.session_id !== sessionId) {
      return new Response(JSON.stringify({ error: "Player not in this session" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Add song to database
    const song = addSong(
      tournament.id,
      playerId,
      tournament.current_round,
      validated.spotify_id,
      validated.song_name,
      validated.artist_name,
      validated.start_time,
      validated.image_url || null
    );

    // Broadcast song_submitted message to all players
    sseManager.broadcast(sessionId, {
      type: "song_submitted",
      data: song,
    } satisfies SSEMessage);

    return new Response(JSON.stringify(song), {
      status: 201,
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
