"use client";

import { useMemo, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { GuessState } from "@/types/guess";
import type { Player } from "@/types/shared";
import type { TurnResult } from "@/hooks/useGuessSession";
import { useSpotifyPlayer } from "@/components/SpotifyPlayerProvider";
import { useGameSettings } from "@/components/GameSettingsProvider";
import PickSongPhase from "./PickSongPhase";
import GuessingPhase from "./GuessingPhase";
import GuessScoreboard from "./GuessScoreboard";
import FinalScoreboard from "./FinalScoreboard";
import AutoAdvanceIndicator from "./AutoAdvanceIndicator";

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
  const { play, setVolume, guessingVolume, betweenVolume } = useSpotifyPlayer();
  const { autoAdvance, getReadyDelaySec, scoreboardDelaySec } =
    useGameSettings();
  const currentTurn = guessState.currentTurn;
  const config = guessState.config;

  // Drive the host's player volume from the game phase: louder while players
  // are guessing, quieter between songs. The volumes are a host-device
  // preference (localStorage); only the host's Web SDK player is actually
  // playing the music, so setVolume is a no-op for everyone else.
  const phaseStatus = currentTurn?.status;
  useEffect(() => {
    if (!isOwner) return;
    const targetPercent =
      phaseStatus === "guessing" ? guessingVolume : betweenVolume;
    setVolume(targetPercent / 100);
  }, [isOwner, phaseStatus, guessingVolume, betweenVolume, setVolume]);
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

  const handleOneMoreRound = useCallback(async () => {
    try {
      await fetch(`/api/game/${sessionId}/guess/one-more-round`, {
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

  // Auto-advance: when the host enables it, the two host-gated steps
  // (Start Playback in countdown, Next Turn on the scoreboard) fire on a timer
  // instead of waiting for a button press. We keep the action behind a ref so
  // the timer arms exactly once per phase/turn — handleStartPlayback's identity
  // changes on every render (it closes over the non-memoized `play`), so
  // depending on it directly would keep resetting the countdown.
  const turnId = currentTurn?.id;
  const autoAdvanceActionRef = useRef<() => void>(() => {});
  autoAdvanceActionRef.current = () => {
    if (phaseStatus === "countdown") {
      handleStartPlayback();
    } else if (phaseStatus === "scoreboard") {
      handleNextTurn();
    }
  };
  useEffect(() => {
    if (!isOwner || !autoAdvance) return;
    if (phaseStatus !== "countdown" && phaseStatus !== "scoreboard") return;
    const delaySec =
      phaseStatus === "countdown" ? getReadyDelaySec : scoreboardDelaySec;
    const timer = setTimeout(
      () => autoAdvanceActionRef.current(),
      delaySec * 1000,
    );
    return () => clearTimeout(timer);
  }, [
    isOwner,
    autoAdvance,
    getReadyDelaySec,
    scoreboardDelaySec,
    phaseStatus,
    turnId,
  ]);

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

  // Picking phase — only the picker advances to the song search. Everyone else
  // (guessers and the host) stays on the scoreboard so the group keeps seeing
  // the standings and who's up next, rather than a dead-end waiting screen.
  if (currentTurn.status === "picking") {
    if (isCurrentPicker && playerId) {
      return <PickSongPhase sessionId={sessionId} playerId={playerId} />;
    }
    return (
      <GuessScoreboard
        sessionId={sessionId}
        currentTurn={currentTurn}
        scores={guessState.scores}
        turnResults={turnResults}
        isOwner={isOwner}
        onNextTurn={handleNextTurn}
        onOneMoreRound={handleOneMoreRound}
        maxRounds={config?.maxRounds ?? null}
        autoAdvanceSec={null}
        picker={picker}
      />
    );
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
        {isOwner && autoAdvance && (
          <AutoAdvanceIndicator
            key={turnId}
            delaySec={getReadyDelaySec}
            label="Song starts in"
          />
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
        onOneMoreRound={handleOneMoreRound}
        maxRounds={config?.maxRounds ?? null}
        autoAdvanceSec={isOwner && autoAdvance ? scoreboardDelaySec : null}
      />
    );
  }

  return null;
}
