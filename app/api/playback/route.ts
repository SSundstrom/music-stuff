import { auth, getSpotifyAccessToken } from "@/lib/auth";
import { startPlayback } from "@/lib/spotify";

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

    // Get the Spotify access token from the database
    const accessToken = await getSpotifyAccessToken(session.user.id);

    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: "Not authenticated with Spotify" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const body = (await request.json()) as {
      spotifyId: string;
      deviceId: string;
    };

    if (!body.spotifyId || !body.deviceId) {
      return new Response(
        JSON.stringify({ error: "Missing spotifyId or deviceId" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Start playback using Spotify API
    await startPlayback(body.deviceId, body.spotifyId, accessToken);

    return new Response(
      JSON.stringify({
        status: "playing",
        spotifyId: body.spotifyId,
        message: "Playback started",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
