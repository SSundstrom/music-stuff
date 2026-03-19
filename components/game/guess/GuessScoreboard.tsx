"use client";

import Image from "next/image";
import type { GuessTurn, PlayerScore } from "@/types/game";

interface TurnResult {
  playerId: string;
  playerName: string;
  songName: string;
  artistName: string;
  songCorrect: boolean;
  artistCorrect: boolean;
  points: number;
}

interface GuessScoreboardProps {
  sessionId: string;
  currentTurn: GuessTurn;
  scores: PlayerScore[];
  turnResults: TurnResult[];
  isOwner: boolean;
  onNextTurn: () => void;
}

export default function GuessScoreboard({
  currentTurn,
  scores,
  turnResults,
  isOwner,
  onNextTurn,
}: GuessScoreboardProps) {
  const sortedScores = [...scores].sort(
    (a, b) => b.totalPoints - a.totalPoints,
  );

  return (
    <div className="space-y-4">
      {/* Song reveal */}
      <div className="rounded-lg bg-white p-6 shadow-lg text-center">
        <h2 className="mb-2 text-xl font-bold text-gray-700">The song was...</h2>
        <div className="flex flex-col items-center gap-3">
          {currentTurn.imageUrl && (
            <Image
              src={currentTurn.imageUrl}
              alt={currentTurn.songName ?? "Song"}
              width={128}
              height={128}
              className="h-32 w-32 rounded-lg object-cover shadow"
            />
          )}
          <div>
            <p className="text-2xl font-bold text-black">
              {currentTurn.songName}
            </p>
            <p className="text-lg text-gray-600">
              by {currentTurn.artistName}
            </p>
          </div>
        </div>
      </div>

      {/* Turn results */}
      {turnResults.length > 0 && (
        <div className="rounded-lg bg-white p-6 shadow-lg">
          <h3 className="mb-3 text-lg font-bold text-black">Guesses</h3>
          <div className="space-y-2">
            {turnResults.map((result) => (
              <div
                key={result.playerId}
                className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-2"
              >
                <div>
                  <p className="font-semibold text-black">
                    {result.playerName}
                  </p>
                  <p className="text-sm text-gray-600">
                    {result.songName} - {result.artistName}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-600">+{result.points}</p>
                  {result.songCorrect && (
                    <p className="text-xs text-green-600">Exact match!</p>
                  )}
                  {!result.songCorrect && result.artistCorrect && (
                    <p className="text-xs text-yellow-600">Right artist</p>
                  )}
                  {!result.songCorrect && !result.artistCorrect && (
                    <p className="text-xs text-gray-400">Wrong</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Running scores */}
      <div className="rounded-lg bg-white p-6 shadow-lg">
        <h3 className="mb-3 text-lg font-bold text-black">Standings</h3>
        <div className="space-y-2">
          {sortedScores.map((score, index) => (
            <div
              key={score.playerId}
              className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-2"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-gray-400">
                  #{index + 1}
                </span>
                <span className="font-semibold text-black">
                  {score.playerName}
                </span>
              </div>
              <span className="text-lg font-bold text-green-600">
                {score.totalPoints} pts
              </span>
            </div>
          ))}
        </div>
      </div>

      {isOwner && (
        <button
          onClick={onNextTurn}
          className="w-full rounded-lg bg-green-600 px-4 py-3 font-semibold text-white hover:bg-green-700"
        >
          Next Turn
        </button>
      )}
    </div>
  );
}
