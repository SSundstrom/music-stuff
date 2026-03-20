import { auth } from "@/lib/auth";
import { getSession } from "@/lib/game-session";
import { restartGuessGame } from "@/lib/guess-game";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const authSession = await auth.api.getSession({
      headers: request.headers,
    });
    if (!authSession?.user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { sessionId } = await params;
    const session = await getSession(sessionId);
    if (!session) {
      return new Response(JSON.stringify({ error: "Session not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (session.ownerId !== authSession.user.id) {
      return new Response(
        JSON.stringify({ error: "Only the owner can restart the game" }),
        { status: 403, headers: { "Content-Type": "application/json" } },
      );
    }

    if (session.gameType !== "guess_the_song") {
      return new Response(
        JSON.stringify({ error: "Session is not a guess_the_song game" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    await restartGuessGame(sessionId);

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
