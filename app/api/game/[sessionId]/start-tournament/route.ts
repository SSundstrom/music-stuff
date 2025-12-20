import { getSession, updateSession, getSongs } from "@/lib/game-session";
import { generateTournamentBracket } from "@/lib/tournament";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    const session = getSession(sessionId);
    if (!session) {
      return new Response(JSON.stringify({ error: "Session not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (session.status !== "song_submission") {
      return new Response(JSON.stringify({ error: "Not in song submission phase" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get submitted songs
    const songs = getSongs(sessionId, session.current_round);

    if (songs.length < 2) {
      return new Response(
        JSON.stringify({ error: "Need at least 2 songs to start tournament" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Generate bracket
    generateTournamentBracket(sessionId, session.current_round);

    // Update session status
    updateSession(sessionId, {
      status: "tournament",
    });

    return new Response(
      JSON.stringify({
        status: "tournament",
        songs_submitted: songs.length,
        message: "Tournament bracket generated",
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
