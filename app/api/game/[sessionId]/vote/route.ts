import {
  getSession,
  getPlayer,
  addVote,
  getMatch,
  getPlayers,
  getSongs,
  getMatches,
  updateMatch,
} from "@/lib/game-session";
import { VoteRequestSchema } from "@/types/game";
import { sseManager } from "@/lib/sse-manager";
import { determineMatchWinner } from "@/lib/tournament";
import { getDb } from "@/lib/db";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
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
      return new Response(
        JSON.stringify({ error: "Player not in this session" }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        },
      );
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
    if (
      validated.song_id !== match.song_a_id &&
      validated.song_id !== match.song_b_id
    ) {
      return new Response(JSON.stringify({ error: "Song not in this match" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Record vote (replaces previous vote if exists)
    addVote(validated.match_id, playerId, validated.song_id);

    // Check if all players have voted
    const players = getPlayers(sessionId);
    const db = getDb();
    const voteCountStmt = db.prepare(
      "SELECT COUNT(DISTINCT player_id) as vote_count FROM votes WHERE match_id = ?"
    );
    const { vote_count } = voteCountStmt.get(validated.match_id) as { vote_count: number };

    if (vote_count === players.length) {
      // All players have voted - complete the match
      const updatedMatch = getMatch(validated.match_id);
      if (updatedMatch) {
        const winnerId = determineMatchWinner(updatedMatch);
        updateMatch(validated.match_id, {
          winner_id: winnerId,
          status: "completed",
        });

        // Broadcast match_ended event
        const completedMatch = getMatch(validated.match_id);
        sseManager.broadcast(sessionId, {
          type: "match_ended",
          data: {
            match_id: validated.match_id,
            winner_id: winnerId,
            votes_a: completedMatch?.votes_a || 0,
            votes_b: completedMatch?.votes_b || 0,
          },
        });
      }
    }

    // Broadcast updated game state to all players
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
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
}
