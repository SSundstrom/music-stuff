"use client";

import { useState } from "react";
import SongSearcher from "@/components/game/SongSearcher";
import type { SongSelection } from "@/components/game/types";

interface PickSongPhaseProps {
  sessionId: string;
  playerId: string;
}

export default function PickSongPhase({ sessionId, playerId }: PickSongPhaseProps) {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  async function handleSongSelected(song: SongSelection) {
    setSubmitting(true);
    setError("");

    try {
      const response = await fetch(`/api/game/${sessionId}/guess/pick-song`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId,
          spotifyId: song.id,
          songName: song.name,
          artistName: song.artists[0]?.name ?? "Unknown",
          startTime: song.startTimeS,
          imageUrl: song.images?.[0]?.url ?? null,
        }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error: string };
        throw new Error(data.error || "Failed to pick song");
      }

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to pick song");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-lg bg-white p-8 shadow-lg text-center">
        <h2 className="mb-2 text-2xl font-bold text-green-600">Song picked!</h2>
        <p className="text-gray-600">Waiting for the host to start playback...</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow-lg">
      <h2 className="mb-2 text-2xl font-bold text-black">Your Turn to Pick!</h2>
      <p className="mb-4 text-gray-600">Choose a song for others to guess.</p>
      {error && <div className="mb-4 rounded bg-red-100 p-3 text-red-700">{error}</div>}
      <SongSearcher
        onSongSelected={handleSongSelected}
        disabled={submitting}
        sessionId={sessionId}
      />
    </div>
  );
}
