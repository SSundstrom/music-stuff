import { updateSession } from "@/lib/game-session";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const body = await request.json();

    if ("owner_id" in body) {
      return new Response(JSON.stringify({ error: "Cannot modify session owner" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    updateSession(sessionId, body);

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
