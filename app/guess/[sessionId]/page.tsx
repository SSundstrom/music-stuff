"use client";

import { useState, useMemo, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useGuessSession } from "@/hooks/useGuessSession";
import GameShell from "@/components/game/GameShell";
import dynamic from "next/dynamic";

const GuessGameOrchestrator = dynamic(
  () => import("@/components/game/guess/GuessGameOrchestrator"),
);

export default function GuessPage() {
  const params = useParams();
  const router = useRouter();
  const authSession = useAuthSession();
  const sessionId = params.sessionId as string;

  const [currentPlayerId] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(`player_${sessionId}`);
    }
    return null;
  });

  const {
    session: gameSession,
    players,
    guessState,
    lastTurnResults,
    lastGuessEndsAt,
    loading,
    error,
    isConnected,
  } = useGuessSession({ sessionId, playerId: currentPlayerId });

  const isOwner = gameSession?.ownerId === authSession?.user?.id;

  // Redirect back to lobby when game is restarted
  useEffect(() => {
    if (guessState?.status === "lobby") {
      router.push(`/lobby/${sessionId}`);
    }
  }, [guessState?.status, sessionId, router]);

  // During countdown or guessing phases, provide the current song to the top player
  // so the host can pause/play/restart from the correct position
  const activeTrack = useMemo(() => {
    const turn = guessState?.currentTurn;
    if (!turn?.spotifyId) return undefined;
    if (turn.status !== "countdown" && turn.status !== "guessing") return undefined;
    return {
      spotifyId: turn.spotifyId,
      startTimeMs: turn.startTime * 1000,
    };
  }, [guessState?.currentTurn]);

  return (
    <GameShell
      sessionId={sessionId}
      isOwner={isOwner}
      isConnected={isConnected}
      players={players}
      currentPlayerId={currentPlayerId}
      loading={loading}
      error={error}
      activeTrack={activeTrack}
    >
      {guessState && (currentPlayerId || isOwner) && (
        <GuessGameOrchestrator
          sessionId={sessionId}
          playerId={currentPlayerId}
          players={players}
          guessState={guessState}
          isOwner={isOwner}
          turnResults={lastTurnResults}
          endsAt={lastGuessEndsAt}
        />
      )}
    </GameShell>
  );
}
