"use client";

import { useState } from "react";
import SongSearcher from "./SongSearcher";
import { SongSelection } from "./types";
import { SubmitSongRequest } from "@/types/game";

interface SongSubmissionPhaseProps {
  sessionId: string;
  category: string;
  currentPlayerId: string | null;
  isOwner: boolean;
  submittedCount: number;
  playerCount: number;
}

export default function SongSubmissionPhase({
  sessionId,
  category,
  currentPlayerId,
  isOwner,
  submittedCount,
  playerCount,
}: SongSubmissionPhaseProps) {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSongSelected = async (song: SongSelection) => {
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
          start_time: song.startTimeS,
          image_url: song.images[0]?.url || null,
        } satisfies SubmitSongRequest),
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg bg-white p-8 shadow-lg">
      <h1 className="mb-2 text-3xl font-bold text-black">
        Submit Songs for &quot;{category}&quot;
      </h1>
      <p className="mb-6 text-lg text-gray-700">
        Find a song that fits this category
      </p>

      {error && (
        <div className="mb-4 rounded-lg bg-red-100 p-4 text-base text-red-800">
          {error}
        </div>
      )}

      {submitted ? (
        <div className="rounded-lg bg-green-50 p-4 text-base text-green-800">
          Your song has been submitted! Waiting for others...
        </div>
      ) : (
        <div className="mb-6">
          <SongSearcher
            onSongSelected={handleSongSelected}
            disabled={loading}
          />
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
