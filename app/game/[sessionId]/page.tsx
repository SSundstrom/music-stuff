"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useGameSession } from "@/hooks/useGameSession";
import CategoryPhase from "@/components/game/CategoryPhase";
import SongSubmissionPhase from "@/components/game/SongSubmissionPhase";
import TournamentPhase from "@/components/game/TournamentPhase";

export default function GamePage() {
  const params = useParams();
  const authSession = useAuthSession();
  const sessionId = params.sessionId as string;

  const [currentPlayerId] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(`player_${sessionId}`);
    }
    return null;
  });

  // Use WebSocket-based game session hook
  const {
    session: gameSession,
    players,
    songs,
    loading,
    error,
  } = useGameSession({
    sessionId,
    playerId: currentPlayerId,
  });

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-green-500 to-green-700">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-white border-t-transparent" />
          <p className="text-white">Loading game...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-green-500 to-green-700 p-4">
        <div className="rounded-lg bg-white p-8 text-center shadow-lg">
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  const isOwner = gameSession?.owner_id === authSession?.user?.id;
  const currentPickerIndex = gameSession?.current_picker_index || 0;
  const currentPicker = players[currentPickerIndex];

  return (
    <div className="min-h-screen bg-linear-to-br from-green-500 to-green-700 p-4">
      <div className="mx-auto max-w-4xl">
        {gameSession?.status === "category_selection" && (
          <CategoryPhase
            sessionId={sessionId}
            currentPicker={currentPicker}
            isCurrentPicker={currentPlayerId === currentPicker?.id}
            onCategorySubmitted={() => {
              // WebSocket will automatically update the game session
            }}
          />
        )}

        {gameSession?.status === "song_submission" && (
          <SongSubmissionPhase
            sessionId={sessionId}
            category={gameSession.current_category || ""}
            currentPlayerId={currentPlayerId}
            currentPickerId={currentPicker?.id}
            isOwner={isOwner}
            submittedCount={songs.length}
            playerCount={players.length}
            onAllSubmitted={() => {
              // WebSocket will automatically update the game session
            }}
          />
        )}

        {gameSession?.status === "tournament" && (
          <TournamentPhase
            sessionId={sessionId}
            roundNumber={gameSession.current_round}
            isOwner={isOwner}
            currentPlayerId={currentPlayerId}
          />
        )}
      </div>
    </div>
  );
}
