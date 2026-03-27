"use client";

import { useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { GuessState } from "@/types/guess";
import type { Player } from "@/types/shared";
import type { TurnResult } from "@/hooks/useGuessSession";
import { useSpotifyPlayer } from "@/components/SpotifyPlayerProvider";
import PickSongPhase from "./PickSongPhase";
import WaitingForPicker from "./WaitingForPicker";
import GuessingPhase from "./GuessingPhase";
import GuessScoreboard from "./GuessScoreboard";
import FinalScoreboard from "./FinalScoreboard";

interface GuessGameOrchestratorProps {
  sessionId: string;
  playerId: string | null;
  players: Player[];
  guessState: GuessState;
  isOwner: boolean;
  turnResults: TurnResult[];
  endsAt: string | null;
}

export default function GuessGameOrchestrator({
  sessionId,
  playerId,
  players,
  guessState,
  isOwner,
  turnResults,
  endsAt,
}: GuessGameOrchestratorProps) {
  const router = useRouter();
  const { play } = useSpotifyPlayer();
  const currentTurn = guessState.currentTurn;
  const isCurrentPicker = useMemo(
    () => currentTurn?.pickerId === playerId,
    [currentTurn?.pickerId, playerId],
  );

  const picker = useMemo(
    () => players.find((p) => p.id === currentTurn?.pickerId),
    [players, currentTurn?.pickerId],
  );

  const handleStartPlayback = useCallback(async () => {
    try {
      if (!currentTurn?.spotifyId) return;

      // Start Spotify playback on the host's device
      await play(currentTurn.spotifyId, currentTurn.startTime * 1000);

      // Then update game state to guessing phase
      await fetch(`/api/game/${sessionId}/guess/start-playback`, {
        method: "POST",
      });
    } catch {
      // silently fail
    }
  }, [sessionId, currentTurn?.spotifyId, currentTurn?.startTime, play]);

  const handleNextTurn = useCallback(async () => {
    try {
      await fetch(`/api/game/${sessionId}/guess/next-turn`, {
        method: "POST",
      });
    } catch {
      // silently fail
    }
  }, [sessionId]);

  const handlePlayAgain = useCallback(async () => {
    try {
      const res = await fetch(`/api/game/${sessionId}/guess/restart`, {
        method: "POST",
      });
      if (res.ok) {
        router.push(`/lobby/${sessionId}`);
      }
    } catch {
      // silently fail
    }
  }, [sessionId, router]);

  if (guessState.status === "ended") {
    return (
      <FinalScoreboard
        scores={guessState.scores}
        isOwner={isOwner}
        onPlayAgain={handlePlayAgain}
      />
    );
  }

  if (!currentTurn) {
    return (
      <div className="rounded-lg bg-white p-8 shadow-lg text-center">
        <p className="text-gray-600">Waiting for the game to start...</p>
      </div>
    );
  }

  // Picking phase
  if (currentTurn.status === "picking") {
    if (isCurrentPicker && playerId) {
      return <PickSongPhase sessionId={sessionId} playerId={playerId} />;
    }
    return <WaitingForPicker picker={picker} />;
  }

  // Countdown phase — host needs to start playback
  if (currentTurn.status === "countdown") {
    return (
      <div className="rounded-lg bg-white p-8 shadow-lg text-center">
        <h2 className="mb-2 text-2xl font-bold text-black">Song selected!</h2>
        <p className="mb-4 text-gray-600">
          {isCurrentPicker
            ? "Waiting for the host to start playback..."
            : "Get ready to guess!"}
        </p>
        {isOwner && (
          <button
            onClick={handleStartPlayback}
            className="rounded-lg bg-green-600 px-6 py-3 font-semibold text-white hover:bg-green-700"
          >
            Start Playback
          </button>
        )}
      </div>
    );
  }

  // Guessing phase
  if (currentTurn.status === "guessing") {
    if (!playerId) {
      return (
        <div className="rounded-lg bg-white p-8 shadow-lg text-center">
          <h2 className="mb-2 text-2xl font-bold text-black">Guessing in progress...</h2>
          <p className="text-gray-600">Players are guessing the song</p>
        </div>
      );
    }
    return (
      <GuessingPhase
        sessionId={sessionId}
        playerId={playerId}
        currentTurn={currentTurn}
        players={players}
        endsAt={endsAt}
      />
    );
  }

  // Scoreboard phase
  if (currentTurn.status === "scoreboard") {
    return (
      <GuessScoreboard
        sessionId={sessionId}
        currentTurn={currentTurn}
        scores={guessState.scores}
        turnResults={turnResults}
        isOwner={isOwner}
        onNextTurn={handleNextTurn}
      />
    );
  }

  return null;
}
