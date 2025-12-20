"use client";

import { useState, useEffect } from "react";
import SongSearcher from "./SongSearcher";
import type { SpotifySearchResult } from "@/lib/spotify";

interface SongSubmissionPhaseProps {
  sessionId: string;
  category: string;
  currentPlayerId: string | null;
  currentPickerId: string | null;
  isOwner: boolean;
  onAllSubmitted: () => void;
}

export default function SongSubmissionPhase({
  sessionId,
  category,
  currentPlayerId,
  currentPickerId,
  isOwner,
  onAllSubmitted,
}: SongSubmissionPhaseProps) {
  const [submitted, setSubmitted] = useState(false);
  const [submittedCount, setSubmittedCount] = useState(0);
  const [playerCount, setPlayerCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isCategoryPicker = currentPlayerId === currentPickerId;

  useEffect(() => {
    const fetchSubmissionStatus = async () => {
      try {
        const response = await fetch(`/api/game/${sessionId}`);
        const data = (await response.json()) as {
          songs: Array<{ id: string }>;
          players: Array<{ id: string; is_owner: boolean }>;
        };

        // Count non-picker submissions
        const nonPickerPlayers = data.players.filter(
          (p) => p.id !== currentPickerId
        ).length;
        setPlayerCount(nonPickerPlayers);
        setSubmittedCount(data.songs.length);

        if (data.songs.length === nonPickerPlayers && nonPickerPlayers > 0) {
          onAllSubmitted();
        }
      } catch (err) {
        console.error("Failed to fetch submission status:", err);
      }
    };

    const interval = setInterval(fetchSubmissionStatus, 2000);
    fetchSubmissionStatus();
    return () => clearInterval(interval);
  }, [sessionId, currentPickerId, onAllSubmitted]);

  const handleSongSelected = async (song: SpotifySearchResult) => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/game/${sessionId}/submit-song`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Player-ID": currentPlayerId || "",
        },
        body: JSON.stringify({
          spotify_id: song.id,
          song_name: song.name,
          artist_name: song.artists[0]?.name || "Unknown",
          start_time: 0,
          image_url: song.images[0]?.url || null,
        }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error: string };
        throw new Error(data.error);
      }

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleStartTournament = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/game/${sessionId}/start-tournament`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const data = (await response.json()) as { error: string };
        throw new Error(data.error);
      }

      onAllSubmitted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg bg-white p-8 shadow-lg">
      <h1 className="mb-2 text-3xl font-bold text-black">
        Submit Songs for "{category}"
      </h1>
      <p className="mb-6 text-lg text-gray-700">
        Find a song that fits this category
      </p>

      {error && (
        <div className="mb-4 rounded-lg bg-red-100 p-4 text-base text-red-800">
          {error}
        </div>
      )}

      {isCategoryPicker ? (
        <div className="rounded-lg bg-yellow-50 p-4 text-base text-yellow-800">
          You picked the category, so you don't submit a song this round.
        </div>
      ) : submitted ? (
        <div className="rounded-lg bg-green-50 p-4 text-base text-green-800">
          Your song has been submitted! Waiting for others...
        </div>
      ) : (
        <div className="mb-6">
          <SongSearcher onSongSelected={handleSongSelected} disabled={loading} />
        </div>
      )}

      {/* Submission Status */}
      <div className="mt-6 rounded-lg bg-gray-50 p-4">
        <p className="text-base text-gray-700">
          Songs submitted: {submittedCount} / {playerCount}
        </p>
      </div>

      {/* Start Tournament Button (Owner only, when all submitted) */}
      {isOwner && submittedCount === playerCount && playerCount > 0 && (
        <button
          onClick={handleStartTournament}
          disabled={loading}
          className="mt-4 w-full rounded-lg bg-green-600 px-4 py-3 font-semibold text-white hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? "Starting..." : "Start Tournament"}
        </button>
      )}
    </div>
  );
}
