"use client";

import { authClient } from "@/components/SessionProvider";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthSession } from "@/hooks/useAuthSession";

export default function Home() {
  const router = useRouter();
  const session = useAuthSession();
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSignIn = async () => {
    await authClient.signIn.social({
      provider: "spotify",
    });
    // Refetch session after signin completes
    const { data: newSession } = await authClient.getSession();
    setSession(newSession);
  };

  const handleCreateGame = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/game/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner_id: session?.user?.id }),
      });

      if (!response.ok) {
        throw new Error("Failed to create game session");
      }

      const data = (await response.json()) as { id: string };
      router.push(`/lobby/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGame = async () => {
    if (!joinCode.trim()) {
      setError("Please enter a session code");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Try to join the session
      const response = await fetch(`/api/game/${joinCode}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ player_name: "Player" }),
      });

      if (!response.ok) {
        throw new Error("Invalid session code");
      }

      const player = (await response.json()) as { session_id: string };
      router.push(`/lobby/${player.session_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-green-500 to-green-700">
      <main className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
        <h1 className="mb-2 text-center text-4xl font-bold text-black">
          Spotify Tournament
        </h1>
        <p className="mb-8 text-center text-lg text-gray-700">
          Vote on songs that fit the category
        </p>

        {error && (
          <div className="mb-4 rounded-lg bg-red-100 p-4 text-base text-red-700">
            {error}
          </div>
        )}

        {session?.user && (
          <div className="mb-6 rounded-lg bg-gray-50 p-4 text-center">
            <p className="text-base text-gray-700">Signed in as</p>
            <p className="text-lg font-semibold text-black">
              {session.user?.name}
            </p>
          </div>
        )}

        <div className="space-y-4">
          {session === null ? (
            <button
              disabled
              className="w-full rounded-lg bg-gray-400 px-4 py-3 font-semibold text-white"
            >
              Loading...
            </button>
          ) : !session?.user ? (
            <button
              onClick={handleSignIn}
              className="w-full rounded-lg bg-green-600 px-4 py-3 font-semibold text-white hover:bg-green-700"
            >
              Sign in with Spotify
            </button>
          ) : (
            <button
              onClick={handleCreateGame}
              disabled={loading}
              className="w-full rounded-lg bg-green-600 px-4 py-3 font-semibold text-white hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create New Game"}
            </button>
          )}

          <div className="relative flex items-center">
            <div className="flex-1 border-t border-gray-300" />
            <span className="px-3 text-base text-gray-700">or</span>
            <div className="flex-1 border-t border-gray-300" />
          </div>

          <div className="space-y-2">
            <input
              type="text"
              placeholder="Enter session code"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-lg focus:border-green-500 focus:outline-none"
            />
            <button
              onClick={handleJoinGame}
              disabled={loading}
              className="w-full rounded-lg border border-green-600 px-4 py-3 font-semibold text-green-600 hover:bg-green-50 disabled:opacity-50"
            >
              {loading ? "Joining..." : "Join Game"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
