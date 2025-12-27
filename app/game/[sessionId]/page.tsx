"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useGameSession } from "@/hooks/useGameSession";
import CategoryPhase from "@/components/game/CategoryPhase";
import SongSubmissionPhase from "@/components/game/SongSubmissionPhase";
import TournamentPhase from "@/components/game/TournamentPhase";
import SpotifyPlayer from "@/components/SpotifyPlayer";

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

  const {
    session: gameSession,
    tournament,
    players,
    songs,
    matches,
    loading,
    error,
    isConnected,
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

  const isOwner = gameSession?.ownerId === authSession?.user?.id;
  const currentPickerIndex = tournament?.currentPickerIndex || 0;
  const currentPicker = players[currentPickerIndex];

  return (
    <div className="min-h-screen bg-linear-to-br from-green-500 to-green-700 p-4">
      {!isConnected && (
        <div className="mb-4 rounded-lg bg-red-500 px-4 py-2 text-white flex items-center gap-2">
          <span className="text-lg">🔌</span>
          <span className="font-semibold">
            Connection lost - refresh to reconnect...
          </span>
        </div>
      )}
      <div className="mx-auto max-w-4xl space-y-4">
        {isOwner && <SpotifyPlayer />}

        {!tournament ? (
          <p>something went wrong</p>
        ) : (
          <>
            {tournament.status === "category_selection" && (
              <CategoryPhase
                sessionId={sessionId}
                currentPicker={currentPicker}
                isCurrentPicker={currentPlayerId === currentPicker?.id}
              />
            )}
            {tournament.status === "song_submission" && (
              <SongSubmissionPhase
                sessionId={sessionId}
                category={tournament.category || ""}
                currentPlayerId={currentPlayerId}
                isOwner={isOwner}
                submittedCount={songs.length}
                playerCount={players.length}
              />
            )}

            {tournament.status === "tournament" && (
              <TournamentPhase
                sessionId={sessionId}
                roundNumber={tournament.currentRound}
                isOwner={isOwner}
                currentPlayerId={currentPlayerId}
                songs={songs}
                matches={matches}
              />
            )}

            {tournament.status === "finished" &&
              (() => {
                const winningSong = songs.find(
                  (song) => song.id === tournament.winningSongId,
                );
                return (
                  <div className="rounded-lg bg-white p-8 shadow-lg text-center">
                    <h1 className="mb-4 text-4xl font-bold text-green-600">
                      🎉 Tournament Complete!
                    </h1>
                    {winningSong ? (
                      <div className="space-y-4">
                        {winningSong.imageUrl && (
                          <Image
                            src={winningSong.imageUrl}
                            alt={winningSong.songName}
                            className="mx-auto h-48 w-48 rounded-lg object-cover shadow"
                          />
                        )}
                        <div>
                          <p className="text-2xl font-bold text-gray-900">
                            {winningSong.songName}
                          </p>
                          <p className="text-lg text-gray-600">
                            by {winningSong.artistName}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-lg text-gray-700">
                        Tournament winner determined!
                      </p>
                    )}
                  </div>
                );
              })()}
          </>
        )}
      </div>
    </div>
  );
}
