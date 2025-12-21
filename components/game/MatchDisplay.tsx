"use client";

import { useState, useEffect, useRef } from "react";
import type { TournamentMatch, Song } from "@/types/game";

interface MatchDisplayProps {
  match: TournamentMatch;
  songA: Song;
  songB: Song;
  playerId: string | null;
  isOwner: boolean;
  sessionId: string;
  onMatchComplete: (winnerId: string) => void;
}

export default function MatchDisplay({
  match,
  songA,
  songB,
  playerId,
  isOwner,
  sessionId,
}: MatchDisplayProps) {
  const [userVote, setUserVote] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [matchState, setMatchState] = useState(match);
  const [isPlaying, setIsPlaying] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    // Connect to SSE stream with playerId
    const playerId_ = playerId || "guest";
    const eventSource = new EventSource(
      `/api/game/${sessionId}/stream?playerId=${encodeURIComponent(playerId_)}`,
    );

    eventSource.addEventListener("message", (event) => {
      try {
        const parsedEvent = JSON.parse(event.data);

        if (parsedEvent.type === "game_state") {
          const { matches } = parsedEvent.data;
          const updated = matches.find(
            (m: TournamentMatch) => m.id === match.id,
          );
          if (updated) {
            setMatchState(updated);
          }
        }
      } catch (err) {
        console.error("Failed to parse SSE message:", err);
      }
    });

    eventSource.onerror = () => {
      console.error("SSE connection error");
      eventSource.close();
    };

    eventSourceRef.current = eventSource;

    return () => {
      eventSource.close();
    };
  }, [match.id, sessionId, playerId]);

  const handleVote = async (songId: string) => {
    if (!playerId) {
      setError("Player ID not found");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/game/${sessionId}/vote`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Player-ID": playerId,
        },
        body: JSON.stringify({
          match_id: match.id,
          song_id: songId,
        }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error: string };
        throw new Error(data.error);
      }

      setUserVote(songId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handlePlaySong = async (songId: string) => {
    if (!isOwner) {
      setError("Only the owner can control playback");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/game/${sessionId}/playback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "play",
          match_id: match.id,
          songId: songId,
        }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error: string };
        throw new Error(data.error);
      }

      setIsPlaying(true);

      // Auto-pause after duration
      const duration = matchState.round_number === 1 ? 30 : 15;
      setTimeout(() => {
        setIsPlaying(false);
        handlePauseSong();
      }, duration * 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handlePauseSong = async () => {
    if (!isOwner) return;

    try {
      await fetch(`/api/game/${sessionId}/playback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "pause" }),
      });
    } catch (err) {
      console.error("Failed to pause:", err);
    }
  };

  const canVote =
    playerId && songA.player_id !== playerId && songB.player_id !== playerId;
  const duration = matchState.round_number === 1 ? 30 : 15;

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-100 p-4 text-base text-red-800">
          {error}
        </div>
      )}

      {/* Song Comparison */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Song A */}
        <div
          className={`rounded-lg border-2 p-6 ${
            matchState.votes_a > matchState.votes_b
              ? "border-green-500 bg-green-50"
              : "border-gray-300"
          }`}
        >
          <div className="mb-4">
            {songA.image_url && (
              <img
                src={songA.image_url}
                alt={songA.song_name}
                className="mb-4 h-40 w-full rounded-lg object-cover"
              />
            )}
            <h3 className="text-lg font-bold text-black">{songA.song_name}</h3>
            <p className="text-base text-gray-700">{songA.artist_name}</p>
          </div>

          <div className="space-y-3">
            {/* Play Button (Owner only) */}
            {isOwner && (
              <button
                onClick={() => handlePlaySong(songA.id)}
                disabled={loading || isPlaying}
                className="w-full rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {isPlaying ? "Playing..." : `Play (${duration}s)`}
              </button>
            )}

            {/* Vote Button */}
            {canVote && (
              <button
                onClick={() => handleVote(songA.id)}
                disabled={loading}
                className={`w-full rounded-lg px-4 py-2 font-semibold ${
                  userVote === songA.id
                    ? "bg-green-600 text-white"
                    : "border-2 border-gray-300 text-black hover:border-green-600"
                }`}
              >
                {userVote === songA.id ? "✓ You voted" : "Vote"}
              </button>
            )}

            {/* Vote Count */}
            <div className="text-center text-base font-semibold text-black">
              Votes: {matchState.votes_a}
            </div>
          </div>
        </div>

        {/* Song B */}
        <div
          className={`rounded-lg border-2 p-6 ${
            matchState.votes_b > matchState.votes_a
              ? "border-green-500 bg-green-50"
              : "border-gray-300"
          }`}
        >
          <div className="mb-4">
            {songB.image_url && (
              <img
                src={songB.image_url}
                alt={songB.song_name}
                className="mb-4 h-40 w-full rounded-lg object-cover"
              />
            )}
            <h3 className="text-lg font-bold text-black">{songB.song_name}</h3>
            <p className="text-base text-gray-700">{songB.artist_name}</p>
          </div>

          <div className="space-y-3">
            {/* Play Button (Owner only) */}
            {isOwner && (
              <button
                onClick={() => handlePlaySong(songB.id)}
                disabled={loading || isPlaying}
                className="w-full rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {isPlaying ? "Playing..." : `Play (${duration}s)`}
              </button>
            )}

            {/* Vote Button */}
            {canVote && (
              <button
                onClick={() => handleVote(songB.id)}
                disabled={loading}
                className={`w-full rounded-lg px-4 py-2 font-semibold ${
                  userVote === songB.id
                    ? "bg-green-600 text-white"
                    : "border-2 border-gray-300 text-black hover:border-green-600"
                }`}
              >
                {userVote === songB.id ? "✓ You voted" : "Vote"}
              </button>
            )}

            {/* Vote Count */}
            <div className="text-center text-base font-semibold text-black">
              Votes: {matchState.votes_b}
            </div>
          </div>
        </div>
      </div>

      {/* VS Divider */}
      <div className="flex items-center justify-center gap-3">
        <div className="flex-1 border-t-2 border-gray-300" />
        <span className="text-lg font-bold text-gray-800">VS</span>
        <div className="flex-1 border-t-2 border-gray-300" />
      </div>
    </div>
  );
}
