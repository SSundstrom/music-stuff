import {
  getSession,
  getPlayer,
  addVote,
  getMatch,
  getPlayers,
  getSongs,
  getMatches,
  updateMatch,
  updateSession,
} from "@/lib/game-session";
import { VoteRequestSchema } from "@/types/game";
import { sseManager } from "@/lib/sse-manager";
import { determineMatchWinner, advanceRound } from "@/lib/tournament";
import { getDb } from "@/lib/db";

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

function validateSession(sessionId: string): ReturnType<typeof getSession> | Response {
  const session = getSession(sessionId);
  if (!session) {
    return errorResponse("Session not found", 404);
  }
  return session;
}

function validatePlayer(playerId: string | null, sessionId: string): ReturnType<typeof getPlayer> | Response {
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

function getVoteCount(matchId: string): number {
  const db = getDb();
  const stmt = db.prepare(
    "SELECT COUNT(DISTINCT player_id) as vote_count FROM votes WHERE match_id = ?"
  );
  const result = stmt.get(matchId) as { vote_count: number };
  return result.vote_count;
}

function broadcastMatchEnded(
  sessionId: string,
  matchId: string,
  winnerId: string,
): void {
  const completedMatch = getMatch(matchId);
  sseManager.broadcast(sessionId, {
    type: "match_ended",
    data: {
      match_id: matchId,
      winner_id: winnerId,
      votes_a: completedMatch?.votes_a || 0,
      votes_b: completedMatch?.votes_b || 0,
    },
  });
}

function broadcastGameState(sessionId: string, session: unknown): void {
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

async function handleMatchCompletion(
  sessionId: string,
  matchId: string,
): Promise<void> {
  const updatedMatch = getMatch(matchId);
  if (!updatedMatch) return;

  const winnerId = determineMatchWinner(updatedMatch);
  updateMatch(matchId, {
    winner_id: winnerId,
    status: "completed",
  });

  broadcastMatchEnded(sessionId, matchId, winnerId);

  const currentSession = getSession(sessionId);
  if (!currentSession) return;

  const currentRoundMatches = getMatches(sessionId, currentSession.current_round);
  const allMatchesCompleted = currentRoundMatches.every((m) => m.status === "completed");

  if (!allMatchesCompleted) return;

  const { finished, winningSongId } = advanceRound(
    sessionId,
    currentSession.current_round
  );

  if (finished && winningSongId) {
    updateSession(sessionId, { status: "finished" });
    sseManager.broadcast(sessionId, {
      type: "game_winner",
      data: { winning_song_id: winningSongId },
    });
  } else {
    updateSession(sessionId, {
      current_round: currentSession.current_round + 1,
    });
    sseManager.broadcast(sessionId, {
      type: "round_complete",
      data: { round_number: currentSession.current_round },
    });
  }
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
    const matchResult = validateMatch(validated.match_id, sessionId, validated.song_id);
    if (matchResult instanceof Response) return matchResult;

    // Record vote
    addVote(validated.match_id, playerId!, validated.song_id);

    // Check if all players have voted and handle match completion
    const players = getPlayers(sessionId);
    const voteCount = getVoteCount(validated.match_id);

    if (voteCount === players.length) {
      await handleMatchCompletion(sessionId, validated.match_id);
    }

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
