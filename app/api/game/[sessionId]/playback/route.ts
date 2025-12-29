import { sseManager } from "@/lib/sse-manager";
import type { PlaybackStartedMessage, PlaybackStoppedMessage } from "@/types/game";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await params;
    const body = (await request.json()) as {
      action: "started" | "stopped";
      matchId: string;
      songId?: string;
      songName?: string;
      artistName?: string;
    };

    if (body.action === "started") {
      if (!body.songId || !body.songName || !body.artistName) {
        return new Response(
          JSON.stringify({
            error: "Missing songId, songName, or artistName for playback_started",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      const message: PlaybackStartedMessage = {
        type: "playback_started",
        data: {
          matchId: body.matchId,
          songId: body.songId,
          songName: body.songName,
          artistName: body.artistName,
        },
      };

      sseManager.broadcast(sessionId, message);
    } else if (body.action === "stopped") {
      const message: PlaybackStoppedMessage = {
        type: "playback_stopped",
        data: {
          matchId: body.matchId,
        },
      };

      sseManager.broadcast(sessionId, message);
    } else {
      return new Response(
        JSON.stringify({ error: "Invalid action" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({ status: "ok" }),
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
