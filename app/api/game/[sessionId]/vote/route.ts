import {
  getSession,
  getActiveTournament,
  getPlayer,
  addVote,
  getMatch,
} from "@/lib/game-session";
import { VoteRequestSchema, type Session } from "@/types/game";
import { voteValidation } from "@/lib/tournament";

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

async function validateSession(sessionId: string): Promise<Session | Response> {
  const session = await getSession(sessionId);
  if (!session) {
    return errorResponse("Session not found", 404);
  }
  return session;
}

async function validatePlayer(
  playerId: string | null,
  sessionId: string,
): Promise<ReturnType<typeof getPlayer> | Response> {
  if (!playerId) {
    return errorResponse("Player ID required", 401);
  }

  const player = await getPlayer(playerId);
  if (!player || player.sessionId !== sessionId) {
    return errorResponse("Player not in this session", 403);
  }
  return player;
}

async function validateMatch(
  matchId: string,
  tournamentId: string,
  songId: string,
): Promise<ReturnType<typeof getMatch> | Response> {
  const match = await getMatch(matchId);
  if (!match || match.tournamentId !== tournamentId) {
    return errorResponse("Match not found", 404);
  }

  if (songId !== match.songAId && songId !== match.songBId) {
    return errorResponse("Song not in this match", 400);
  }

  return match;
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
    const sessionResult = await validateSession(sessionId);
    if (sessionResult instanceof Response) return sessionResult;

    // Get active tournament
    const tournament = await getActiveTournament(sessionId);
    if (!tournament) {
      return errorResponse("No active tournament found", 404);
    }

    // Validate player
    const playerId = request.headers.get("X-Player-ID");
    const playerResult = await validatePlayer(playerId, sessionId);
    if (playerResult instanceof Response) return playerResult;

    // Validate match and song
    const matchResult = await validateMatch(
      validated.matchId,
      tournament.id,
      validated.songId,
    );
    if (matchResult instanceof Response) return matchResult;

    // Record vote
    await addVote(validated.matchId, playerId!, validated.songId);

    // Emit vote:cast event for async processing
    // Event handlers will determine if the match/round/game is complete
    await voteValidation({
      matchId: validated.matchId,
      sessionId,
      tournamentId: tournament.id,
    });

    return successResponse({
      matchId: validated.matchId,
      playerId: playerId,
      votedFor: validated.songId,
      message: "Vote recorded",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return errorResponse(message, 400);
  }
}
