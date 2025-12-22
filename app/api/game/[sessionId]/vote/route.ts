import {
  getSession,
  getPlayer,
  addVote,
  getMatch,
  getPlayers,
  getSongs,
  getMatches,
} from "@/lib/game-session";
import { Session, VoteRequestSchema } from "@/types/game";
import { sseManager } from "@/lib/sse-manager";
import { eventBus } from "@/lib/event-bus";

function errorResponse(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function successResponse(data: unknown, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function validateSession(sessionId: string): Session | Response {
  const session = getSession(sessionId);
  if (!session) {
    return errorResponse("Session not found", 404);
  }
  return session;
}

function validatePlayer(
  playerId: string | null,
  sessionId: string,
): ReturnType<typeof getPlayer> | Response {
  if (!playerId) {
    return errorResponse("Player ID required", 401);
  }

  const player = getPlayer(playerId);
  if (!player || player.session_id !== sessionId) {
    return errorResponse("Player not in this session", 403);
  }
  return player;
}

function validateMatch(
  matchId: string,
  sessionId: string,
  songId: string,
): ReturnType<typeof getMatch> | Response {
  const match = getMatch(matchId);
  if (!match || match.session_id !== sessionId) {
    return errorResponse("Match not found", 404);
  }

  if (songId !== match.song_a_id && songId !== match.song_b_id) {
    return errorResponse("Song not in this match", 400);
  }

  return match;
}

function broadcastGameState(sessionId: string, session: Session): void {
  const players = getPlayers(sessionId);
  const updatedSession = session || getSession(sessionId);
  if (!updatedSession) return;

  const songs = getSongs(sessionId, updatedSession.current_round);
  const matches = getMatches(sessionId, updatedSession.current_round);

  sseManager.broadcast(sessionId, {
    type: "game_state",
    data: {
      session: updatedSession,
      players,
      songs,
      matches,
    },
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await params;
    const body = await request.json();
    const validated = VoteRequestSchema.parse(body);

    // Validate session
    const sessionResult = validateSession(sessionId);
    if (sessionResult instanceof Response) return sessionResult;
    const session = sessionResult;

    // Validate player
    const playerId = request.headers.get("X-Player-ID");
    const playerResult = validatePlayer(playerId, sessionId);
    if (playerResult instanceof Response) return playerResult;

    // Validate match and song
    const matchResult = validateMatch(
      validated.match_id,
      sessionId,
      validated.song_id,
    );
    if (matchResult instanceof Response) return matchResult;

    // Record vote
    addVote(validated.match_id, playerId!, validated.song_id);

    // Emit vote:cast event for async processing
    eventBus.emit("vote:cast", {
      playerId: playerId!,
      matchId: validated.match_id,
      songId: validated.song_id,
      sessionId,
    });

    // Broadcast updated game state
    broadcastGameState(sessionId, session);

    return successResponse({
      match_id: validated.match_id,
      player_id: playerId,
      voted_for: validated.song_id,
      message: "Vote recorded",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return errorResponse(message, 400);
  }
}
