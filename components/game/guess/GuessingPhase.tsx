"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import SongSearcher from "@/components/game/SongSearcher";
import type { SongSelection } from "@/components/game/types";
import type { GuessTurn, Player } from "@/types/game";

interface GuessingPhaseProps {
  sessionId: string;
  playerId: string;
  currentTurn: GuessTurn;
  players: Player[];
  endsAt: string | null;
}

export default function GuessingPhase({
  sessionId,
  playerId,
  currentTurn,
  players,
  endsAt,
}: GuessingPhaseProps) {
  const isCurrentPicker = useMemo(
    () => currentTurn.pickerId === playerId,
    [currentTurn.pickerId, playerId],
  );

  const [hasGuessed, setHasGuessed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Timer derived from endsAt
  useEffect(() => {
    if (!endsAt) return;

    const endTime = new Date(endsAt).getTime();

    function updateTimer() {
      const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
      setTimeRemaining(remaining);
      if (remaining <= 0 && intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    updateTimer();
    intervalRef.current = setInterval(updateTimer, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [endsAt]);

  async function handleSongSelected(song: SongSelection) {
    setSubmitting(true);
    setError("");

    try {
      const response = await fetch(
        `/api/game/${sessionId}/guess/submit-guess`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            playerId,
            spotifyId: song.id,
            songName: song.name,
            artistName: song.artists[0]?.name ?? "Unknown",
          }),
        },
      );

      if (!response.ok) {
        const data = (await response.json()) as { error: string };
        throw new Error(data.error || "Failed to submit guess");
      }

      setHasGuessed(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit guess");
    } finally {
      setSubmitting(false);
    }
  }

  const picker = players.find((p) => p.id === currentTurn.pickerId);

  if (isCurrentPicker) {
    return (
      <div className="rounded-lg bg-white p-8 shadow-lg text-center">
        <h2 className="mb-2 text-2xl font-bold text-black">
          Waiting for guesses...
        </h2>
        <p className="text-gray-600">Others are trying to guess your song!</p>
        {timeRemaining !== null && (
          <div className="mt-4 text-4xl font-bold text-green-600">
            {timeRemaining}s
          </div>
        )}
      </div>
    );
  }

  if (hasGuessed) {
    return (
      <div className="rounded-lg bg-white p-8 shadow-lg text-center">
        <h2 className="mb-2 text-2xl font-bold text-green-600">
          Guess submitted!
        </h2>
        <p className="text-gray-600">Waiting for others to guess...</p>
        {timeRemaining !== null && (
          <div className="mt-4 text-4xl font-bold text-green-600">
            {timeRemaining}s
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-black">
            Guess the Song!
          </h2>
          <p className="text-gray-600">
            {picker?.name ?? "Someone"} is playing a song
          </p>
        </div>
        {timeRemaining !== null && (
          <div
            className={`text-3xl font-bold ${
              timeRemaining <= 5 ? "text-red-600" : "text-green-600"
            }`}
          >
            {timeRemaining}s
          </div>
        )}
      </div>
      {error && (
        <div className="mb-4 rounded bg-red-100 p-3 text-red-700">{error}</div>
      )}
      <SongSearcher
        onSongSelected={handleSongSelected}
        disabled={submitting || timeRemaining === 0}
      />
    </div>
  );
}
