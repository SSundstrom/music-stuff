"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useTournamentSession } from "@/hooks/useTournamentSession";
import type { JoinSessionRequest, Player } from "@/types/shared";
import CategoryPhase from "@/components/game/CategoryPhase";
import SongSubmissionPhase from "@/components/game/SongSubmissionPhase";
import TournamentPhase from "@/components/game/TournamentPhase";
import GameShell from "@/components/game/GameShell";

export default function TournamentPage() {
  const params = useParams();
  const authSession = useAuthSession();
  const sessionId = params.sessionId as string;

  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(`player_${sessionId}`);
    }
    return null;
  });
  const [playerName, setPlayerName] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState("");

  const {
    session: gameSession,
    tournament,
    players,
    songs,
    matches,
    loading,
    error,
    isConnected,
  } = useTournamentSession({ sessionId, playerId: currentPlayerId });

  const isOwner = gameSession?.ownerId === authSession?.user?.id;
  const currentPickerIndex = tournament?.currentPickerIndex || 0;
  const currentPicker = players[currentPickerIndex];
  const hasJoined = !!currentPlayerId;

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
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setJoinLoading(false);
    }
  }

  async function handleNewRound() {
    await fetch(`/api/game/${sessionId}/new-round`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
  }

  return (
    <GameShell
      sessionId={sessionId}
      isOwner={isOwner}
      isConnected={isConnected}
      players={players}
      currentPlayerId={currentPlayerId}
      loading={loading}
      error={error}
    >
      {/* Join form for late joiners */}
      {!hasJoined &&
        tournament &&
        tournament.status !== "category_selection" && (
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

      {/* Tournament mode */}
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
                    Tournament Complete!
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
                  {isOwner && (
                    <button
                      onClick={handleNewRound}
                      className="w-full rounded-lg bg-green-600 px-4 py-3 font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      {"Pick new category!"}
                    </button>
                  )}
                </div>
              );
            })()}
        </>
      )}
    </GameShell>
  );
}
