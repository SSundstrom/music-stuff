import { auth, getSpotifyAccessToken } from "@/lib/auth";
import { getSession, getActiveTournament, getMatch, getSong, updateMatch } from "@/lib/game-session";
import { startPlayback, pausePlayback } from "@/lib/spotify";
import { getPlaybackDuration } from "@/lib/tournament";
import { sseManager } from "@/lib/sse-manager";
import type { SSEMessage } from "@/types/game";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await params;
    const body = (await request.json()) as {
      action: "play" | "pause";
      match_id?: string;
      song_id?: string;
      device_id?: string;
    };
    const songId = body.song_id;
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

    const gameSession = await getSession(sessionId);
    if (!gameSession) {
      return new Response(JSON.stringify({ error: "Session not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Only session owner can trigger playback
    if (gameSession.owner_id !== session.user?.id) {
      return new Response(
        JSON.stringify({ error: "Only session owner can control playback" }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Note: In a real implementation, would fetch from database properly
    // For now, we'll work with the device_id provided
    const deviceId = body.device_id;

    if (!deviceId) {
      return new Response(
        JSON.stringify({ error: "No device selected for playback" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    if (body.action === "pause") {
      await pausePlayback(deviceId, accessToken);

      // Clear currently playing song
      if (body.match_id) {
        await updateMatch(body.match_id, { currently_playing_song_id: null });
        sseManager.broadcast(sessionId, {
          type: "playback_stopped",
          data: { match_id: body.match_id },
        } satisfies SSEMessage);
      }

      return new Response(
        JSON.stringify({
          status: "paused",
          message: "Playback paused",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    if (body.action === "play") {
      const match = await getMatch(body.match_id || "");
      if (!match) {
        return new Response(JSON.stringify({ error: "Match not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (!songId) {
        return new Response(JSON.stringify({ error: "No song in match" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const song = await getSong(songId);
      if (!song) {
        return new Response(JSON.stringify({ error: "Song not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Start playback at specified time
      await startPlayback(
        deviceId,
        song.spotify_id,
        accessToken,
        song.start_time * 1000, // Convert seconds to milliseconds
      );

      // Update match to track currently playing song
      await updateMatch(body.match_id || "", { currently_playing_song_id: songId });

      // Broadcast playback started event
      sseManager.broadcast(sessionId, {
        type: "playback_started",
        data: {
          match_id: body.match_id || "",
          song_id: songId,
          song_name: song.song_name,
          artist_name: song.artist_name,
        },
      } satisfies SSEMessage);

      const tournament = await getActiveTournament(sessionId);
      if (!tournament) {
        return new Response(JSON.stringify({ error: "No active tournament found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      const duration = getPlaybackDuration(tournament.current_round);

      return new Response(
        JSON.stringify({
          status: "playing",
          song_id: songId,
          song_name: song.song_name,
          artist_name: song.artist_name,
          duration: duration,
          start_time: song.start_time,
          message: `Now playing for ${duration} seconds`,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
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
