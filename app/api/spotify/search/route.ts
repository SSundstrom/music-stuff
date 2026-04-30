import { getUserMarket, searchSpotify } from "@/lib/spotify";
import { getSession } from "@/lib/game-session";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    const sessionId = searchParams.get("sessionId");

    if (!query) {
      return new Response(JSON.stringify({ error: "Query parameter 'q' required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (query.length < 2) {
      return new Response(JSON.stringify({ error: "Query must be at least 2 characters" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    let market: string | undefined;
    if (sessionId) {
      const gameSession = await getSession(sessionId);
      if (gameSession) {
        const ownerMarket = await getUserMarket(gameSession.ownerId);
        if (ownerMarket) market = ownerMarket;
      }
    }

    const results = await searchSpotify(query, market);

    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
