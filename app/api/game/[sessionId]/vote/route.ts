import {
  getSession,
  getPlayer,
  addVote,
  getMatch,
  getSong,
  getPlayers,
  getSongs,
  getMatches,
} from "@/lib/game-session";
import { VoteRequestSchema } from "@/types/game";
import { sseManager } from "@/lib/sse-manager";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const body = await request.json();
    const validated = VoteRequestSchema.parse(body);

    const session = getSession(sessionId);
    if (!session) {
      return new Response(JSON.stringify({ error: "Session not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get player ID from headers
    const playerId = request.headers.get("X-Player-ID");
    if (!playerId) {
      return new Response(JSON.stringify({ error: "Player ID required" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Verify player exists and is in this session
    const player = getPlayer(playerId);
    if (!player || player.session_id !== sessionId) {
      return new Response(JSON.stringify({ error: "Player not in this session" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get the match
    const match = getMatch(validated.match_id);
    if (!match || match.session_id !== sessionId) {
      return new Response(JSON.stringify({ error: "Match not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Verify the voted song is in this match
    if (validated.song_id !== match.song_a_id && validated.song_id !== match.song_b_id) {
      return new Response(JSON.stringify({ error: "Song not in this match" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Check if player is submitter of either song (cannot vote for their own)
    const votedSong = getSong(validated.song_id);
    if (votedSong && votedSong.player_id === playerId) {
      return new Response(JSON.stringify({ error: "Cannot vote for your own song" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Record vote (replaces previous vote if exists)
    addVote(validated.match_id, playerId, validated.song_id);

    // Broadcast updated game state to all players
    const players = getPlayers(sessionId);
    const songs = getSongs(sessionId, session.current_round);
    const matches = getMatches(sessionId, session.current_round);

    sseManager.broadcast(sessionId, {
      type: "game_state",
      data: {
        session,
        players,
        songs,
        matches,
      },
    });

    return new Response(
      JSON.stringify({
        match_id: validated.match_id,
        player_id: playerId,
        voted_for: validated.song_id,
        message: "Vote recorded",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
}
