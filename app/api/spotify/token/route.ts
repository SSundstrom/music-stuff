import { auth, getSpotifyAccessToken } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      console.log("[token] No session found");
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log(`[token] Getting token for user: ${session.user.id}`);
    const accessToken = await getSpotifyAccessToken(session.user.id);

    if (!accessToken) {
      console.log("[token] No access token found for user - Spotify re-authentication required");
      return new Response(
        JSON.stringify({
          error: "Not authenticated with Spotify",
          needsReauth: true,
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    console.log(
      `[token] Returning token for user ${session.user.id}, token length: ${accessToken.length}`,
    );
    return new Response(
      JSON.stringify({
        accessToken,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[token] Error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
