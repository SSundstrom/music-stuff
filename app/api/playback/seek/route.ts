import { auth, getSpotifyAccessToken } from "@/lib/auth";
import { seekPlayback } from "@/lib/spotify";

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const tokenResult = await getSpotifyAccessToken(session.user.id);

    if (!tokenResult) {
      return new Response(
        JSON.stringify({ error: "Not authenticated with Spotify" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const body = (await request.json()) as {
      deviceId: string;
      positionMs: number;
    };

    if (!body.deviceId || body.positionMs === undefined) {
      return new Response(
        JSON.stringify({ error: "Missing deviceId or positionMs" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    await seekPlayback(body.deviceId, body.positionMs, tokenResult.accessToken);

    return new Response(JSON.stringify({ status: "seeked" }), {
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
