"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useGameSession } from "@/hooks/useGameSession";
import type { Player } from "@/types/game";

export default function LobbyPage() {
  const params = useParams();
  const router = useRouter();
  const authSession = useAuthSession();
  const sessionId = params.sessionId as string;

  const [playerName, setPlayerName] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);

  // Load player ID from localStorage after hydration
  useEffect(() => {
    const storedPlayerId = localStorage.getItem(`player_${sessionId}`);
    setCurrentPlayerId(storedPlayerId);
  }, [sessionId]);

  const {
    session: gameSession,
    tournament,
    players,
    error: sessionError,
    isConnected,
  } = useGameSession({
    sessionId,
    playerId: currentPlayerId,
  });

  const isOwner = gameSession?.owner_id === authSession?.user?.id;
  const hasJoined = !!currentPlayerId;

  const [joinError, setJoinError] = useState("");

  // Auto-redirect to game page when game starts
  useEffect(() => {
    if (hasJoined && tournament?.status === "category_selection") {
      router.push(`/game/${sessionId}`);
    }
  }, [tournament?.status, hasJoined, sessionId, router]);

  const handleJoinGame = async () => {
    if (!playerName.trim()) {
      setJoinError("Please enter your name");
      return;
    }

    setLoading(true);
    setJoinError("");

    try {
      const response = await fetch(`/api/game/${sessionId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ player_name: playerName }),
      });

      if (!response.ok) throw new Error("Failed to join game");

      const player = (await response.json()) as Player;
      setCurrentPlayerId(player.id);
      localStorage.setItem(`player_${sessionId}`, player.id);
      // SSE will automatically update the players list
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleStartGame = async () => {
    if (!isOwner) return;

    setLoading(true);
    setJoinError("");

    try {
      // Just redirect to game page - category selection happens there
      router.push(`/game/${sessionId}`);
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const copySessionCode = () => {
    navigator.clipboard.writeText(sessionId);
  };

  const handleKickPlayer = async (playerId: string) => {
    if (!isOwner) return;

    if (playerId === currentPlayerId) return;

    try {
      const response = await fetch(`/api/game/${sessionId}/kick`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId }),
      });

      if (!response.ok) throw new Error("Failed to kick player");
      // SSE will automatically update the players list
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const error = joinError || sessionError;

  return (
    <div className="min-h-screen bg-linear-to-br from-green-500 to-green-700 p-4">
      {!isConnected && (
        <div className="mb-4 rounded-lg bg-red-500 px-4 py-2 text-white flex items-center gap-2">
          <span className="text-lg">🔌</span>
          <span className="font-semibold">Connection lost - reconnecting...</span>
        </div>
      )}
      <div className="mx-auto max-w-2xl">
        {error && (
          <div className="mb-4 rounded-lg bg-red-100 p-4 text-red-700">
            {error}
          </div>
        )}

        <div className="rounded-lg bg-white p-8 shadow-lg">
          <h1 className="mb-2 text-3xl font-bold text-black">
            Spotify Tournament
          </h1>
          <p className="mb-6 text-gray-600">Game Lobby</p>

          {/* Session Code and QR Code */}
          <div className="mb-6 rounded-lg bg-gray-50 p-4">
            <p className="text-sm text-gray-600 mb-4">Join Game</p>
            <div className="flex flex-col sm:flex-row gap-6 items-center">
              <div className="flex-1">
                <p className="text-xs text-gray-600 mb-2">Session Code</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xl font-mono font-bold text-black">
                    {sessionId.slice(0, 8).toUpperCase()}
                  </code>
                  <button
                    onClick={copySessionCode}
                    className="rounded bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700"
                  >
                    Copy
                  </button>
                </div>
                <p className="mt-2 text-xs text-gray-600">
                  Share this code with others
                </p>
              </div>
              <div className="flex flex-col items-center">
                <p className="text-xs text-gray-600 mb-2">Or scan QR code</p>
                <div className="bg-white p-2 rounded border border-gray-300">
                  <QRCodeSVG
                    value={
                      typeof window !== "undefined"
                        ? `${window.location.origin}/lobby/${sessionId}`
                        : `https://192.168.32.7:3000/lobby/${sessionId}`
                    }
                    size={120}
                    level="H"
                    includeMargin={true}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Players */}
          <div className="mb-6">
            <h2 className="mb-3 text-xl font-bold text-black">Players</h2>
            <div className="space-y-2">
              {players.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-2"
                >
                  <div>
                    <p className="font-semibold text-black">{player.name}</p>
                    {player.is_owner && (
                      <p className="text-sm text-green-600">Owner</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {player.id === currentPlayerId && (
                      <span className="text-xs font-semibold text-green-600">
                        You
                      </span>
                    )}
                    {isOwner && player.id !== currentPlayerId && (
                      <button
                        onClick={() => handleKickPlayer(player.id)}
                        className="text-xs font-semibold text-red-600 hover:text-red-800 px-2 py-1 rounded hover:bg-red-50"
                      >
                        Kick
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Join or Start */}
          {!hasJoined ? (
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
                disabled={loading}
                className="w-full rounded-lg bg-green-600 px-4 py-3 font-semibold text-white hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? "Joining..." : "Join Game"}
              </button>
            </div>
          ) : (
            <>
              {isOwner && (
                <button
                  onClick={handleStartGame}
                  disabled={loading || players.length < 2}
                  className="w-full rounded-lg bg-green-600 px-4 py-3 font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? "Starting..." : "Start Game"}
                </button>
              )}
              {!isOwner && hasJoined && (
                <div className="rounded-lg bg-blue-50 p-4 text-blue-700">
                  Waiting for the owner to start the game...
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
