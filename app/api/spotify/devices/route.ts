import { auth, getSpotifyAccessToken } from "@/lib/auth";
import { getAvailableDevices } from "@/lib/spotify";

export async function GET(request: Request) {
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

    const devices = await getAvailableDevices(tokenResult.accessToken);

    return new Response(JSON.stringify({ devices }), {
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
