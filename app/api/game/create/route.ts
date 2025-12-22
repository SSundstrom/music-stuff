import { auth } from "@/lib/auth";
import { createSession } from "@/lib/game-session";
import { CreateSessionRequestSchema } from "@/types/game";

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = await request.json();
    const validated = CreateSessionRequestSchema.parse(body);

    if (validated.owner_id !== session.user.id) {
      return new Response(
        JSON.stringify({ error: "Cannot create session for another user" }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Create the session
    const gameSession = createSession(session.user.id);

    return new Response(JSON.stringify(gameSession), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(error);
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
}
