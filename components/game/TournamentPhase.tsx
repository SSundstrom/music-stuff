"use client";

import { useEffect, useState } from "react";
import MatchDisplay from "./MatchDisplay";
import type { TournamentMatch, Song, Session } from "@/types/game";

interface TournamentPhaseProps {
  sessionId: string;
  roundNumber: number;
  isOwner: boolean;
  currentPlayerId: string | null;
  accessToken: string;
}

export default function TournamentPhase({
  sessionId,
  roundNumber,
  isOwner,
  currentPlayerId,
  accessToken,
}: TournamentPhaseProps) {
  const [matches, setMatches] = useState<TournamentMatch[]>([]);
  const [songs, setSongs] = useState<Map<string, Song>>(new Map());
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [gameSession, setGameSession] = useState<Session | null>(null);

  const currentMatch = matches[currentMatchIndex];

  useEffect(() => {
    const fetchTournamentState = async () => {
      try {
        const response = await fetch(`/api/game/${sessionId}`);
        if (!response.ok) throw new Error("Failed to fetch tournament state");

        const data = (await response.json()) as {
          session: Session;
          matches: TournamentMatch[];
          songs: Song[];
        };

        setGameSession(data.session);
        setMatches(data.matches.filter((m) => m.round_number === roundNumber));

        // Create a map of songs for easy lookup
        const songMap = new Map<string, Song>();
        data.songs.forEach((song) => {
          songMap.set(song.id, song);
        });
        setSongs(songMap);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      }
    };

    const interval = setInterval(fetchTournamentState, 2000);
    fetchTournamentState();
    return () => clearInterval(interval);
  }, [sessionId, roundNumber]);

  const handleMatchComplete = async (winnerId: string) => {
    if (!isOwner) return;

    setLoading(true);
    setError("");

    try {
      // The match is completed server-side via voting
      // Move to next match
      if (currentMatchIndex < matches.length - 1) {
        setCurrentMatchIndex(currentMatchIndex + 1);
      } else {
        // Tournament round complete, advance to next round
        // This will be handled by the game logic
        setError("Round complete! Advancing to next round...");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (!currentMatch) {
    return (
      <div className="rounded-lg bg-white p-8 shadow-lg text-center">
        <p className="text-lg text-gray-700">Loading tournament...</p>
      </div>
    );
  }

  const songA = currentMatch.song_a_id ? songs.get(currentMatch.song_a_id) : null;
  const songB = currentMatch.song_b_id ? songs.get(currentMatch.song_b_id) : null;

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-white p-8 shadow-lg">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="mb-2 text-3xl font-bold text-black">
              Round {roundNumber}
            </h1>
            <p className="text-lg text-gray-700">
              Match {currentMatchIndex + 1} of {matches.length}
            </p>
          </div>
          <div className="text-right">
            <p className="text-base text-gray-700">Tournament Progress</p>
            <p className="text-2xl font-bold text-green-600">
              {currentMatchIndex + 1}/{matches.length}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-100 p-4 text-base text-red-800">
            {error}
          </div>
        )}

        {currentMatch.status !== "completed" && songA && songB && (
          <MatchDisplay
            match={currentMatch}
            songA={songA}
            songB={songB}
            playerId={currentPlayerId}
            isOwner={isOwner}
            sessionId={sessionId}
            onMatchComplete={handleMatchComplete}
          />
        )}

        {currentMatch.status === "completed" && (
          <div className="rounded-lg bg-green-50 p-4 text-base text-green-800">
            <p className="font-semibold">Match Complete!</p>
            <p>Winner advances to next round.</p>
          </div>
        )}
      </div>

      {/* Bracket Overview */}
      <div className="rounded-lg bg-white p-8 shadow-lg">
        <h2 className="mb-4 text-xl font-bold text-black">Round Matches</h2>
        <div className="space-y-2">
          {matches.map((match, idx) => (
            <div
              key={match.id}
              className={`rounded-lg border-2 p-3 ${
                idx === currentMatchIndex
                  ? "border-green-600 bg-green-50"
                  : match.status === "completed"
                    ? "border-gray-300 bg-gray-50"
                    : "border-gray-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-base font-semibold">Match {idx + 1}</span>
                <span className="rounded bg-gray-200 px-2 py-1 text-sm font-semibold">
                  {match.status}
                </span>
              </div>
              {match.status === "completed" && match.winner_id && (
                <p className="mt-1 text-base text-gray-700">
                  Winner: {songs.get(match.winner_id)?.song_name}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
