"use client";

import type { PlayerScore } from "@/types/game";

interface FinalScoreboardProps {
  scores: PlayerScore[];
}

export default function FinalScoreboard({ scores }: FinalScoreboardProps) {
  const sortedScores = [...scores].sort(
    (a, b) => b.totalPoints - a.totalPoints,
  );

  const winner = sortedScores[0];

  return (
    <div className="rounded-lg bg-white p-8 shadow-lg text-center">
      <h1 className="mb-4 text-4xl font-bold text-green-600">
        Game Over!
      </h1>

      {winner && (
        <div className="mb-6">
          <p className="text-lg text-gray-600">Winner</p>
          <p className="text-3xl font-bold text-black">{winner.playerName}</p>
          <p className="text-xl text-green-600">{winner.totalPoints} points</p>
        </div>
      )}

      <div className="space-y-2">
        {sortedScores.map((score, index) => (
          <div
            key={score.playerId}
            className={`flex items-center justify-between rounded-lg px-4 py-3 ${
              index === 0
                ? "bg-yellow-50 border border-yellow-200"
                : "bg-gray-50"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold text-gray-400">
                #{index + 1}
              </span>
              <div className="text-left">
                <p className="font-semibold text-black">{score.playerName}</p>
                <p className="text-xs text-gray-500">
                  {score.correctSongs} correct songs, {score.correctArtists}{" "}
                  correct artists
                </p>
              </div>
            </div>
            <span className="text-lg font-bold text-green-600">
              {score.totalPoints} pts
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
