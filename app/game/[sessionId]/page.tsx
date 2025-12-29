"use client";

import { useState, useRef } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { MdSettings } from "react-icons/md";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useGameSession } from "@/hooks/useGameSession";
import type { JoinSessionRequest, Player } from "@/types/game";
import CategoryPhase from "@/components/game/CategoryPhase";
import SongSubmissionPhase from "@/components/game/SongSubmissionPhase";
import TournamentPhase from "@/components/game/TournamentPhase";
import SpotifyPlayer from "@/components/SpotifyPlayer";
import PlayersModal from "@/components/game/PlayersModal";

export default function GamePage() {
  const params = useParams();
  const authSession = useAuthSession();
  const sessionId = params.sessionId as string;

  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(`player_${sessionId}`);
    }
    return null;
  });
  const [showPlayersModal, setShowPlayersModal] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState("");
  const optionsButtonRef = useRef<HTMLButtonElement>(null);

  async function handleNewRound() {
    await fetch(`/api/game/${sessionId}/new-round`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
  }

  async function handleJoinGame() {
    if (!playerName.trim()) {
      setJoinError("Please enter your name");
      return;
    }

    setJoinLoading(true);
    setJoinError("");

    try {
      const response = await fetch(`/api/game/${sessionId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerName,
          sessionId,
        } satisfies JoinSessionRequest),
      });

      if (!response.ok) throw new Error("Failed to join game");

      const player = (await response.json()) as Player;
      setCurrentPlayerId(player.id);
      localStorage.setItem(`player_${sessionId}`, player.id);
      setPlayerName("");
      // SSE will automatically update the players list
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setJoinLoading(false);
    }
  }

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
  const hasJoined = !!currentPlayerId;

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
        {/* Show join form if player hasn't joined yet */}
        {!hasJoined && tournament && tournament.status !== "category_selection" && (
          <div className="rounded-lg bg-white p-6 shadow-lg">
            <h2 className="mb-4 text-2xl font-bold text-black">Join Game</h2>
            <p className="mb-4 text-gray-600">
              The tournament has started. You can still join to vote!
            </p>
            {joinError && (
              <div className="mb-4 rounded-lg bg-red-100 p-3 text-red-700">
                {joinError}
              </div>
            )}
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Enter your name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-green-500 focus:outline-none"
              />
              <button
                onClick={handleJoinGame}
                disabled={joinLoading}
                className="w-full rounded-lg bg-green-600 px-4 py-3 font-semibold text-white hover:bg-green-700 disabled:opacity-50"
              >
                {joinLoading ? "Joining..." : "Join Game"}
              </button>
            </div>
          </div>
        )}

        {/* Top bar with options icon and Spotify player */}
        {isOwner && (
          <div className="flex justify-between items-center">
            <div className="flex-1">
              <SpotifyPlayer />
            </div>
            <button
              ref={optionsButtonRef}
              onClick={() => setShowPlayersModal(true)}
              className="text-gray-600 hover:text-gray-900 transition-colors p-2 ml-4"
              aria-label="Options"
            >
              <MdSettings size={28} />
            </button>
          </div>
        )}

        <PlayersModal
          isOpen={showPlayersModal}
          onClose={() => setShowPlayersModal(false)}
          players={players}
          isOwner={isOwner}
          sessionId={sessionId}
          currentPlayerId={currentPlayerId}
          buttonRef={optionsButtonRef}
        />
        {!tournament ? (
          <p>something went wrong</p>
        ) : (
          <>
            {tournament.status === "category_selection" && (
              <CategoryPhase
                sessionId={sessionId}
                tournamentId={tournament.id}
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
                            width={192}
                            height={192}
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
                    <button
                      onClick={handleNewRound}
                      className="w-full rounded-lg bg-green-600 px-4 py-3 font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      {"Pick new category!"}
                    </button>
                  </div>
                );
              })()}
          </>
        )}
      </div>
    </div>
  );
}
