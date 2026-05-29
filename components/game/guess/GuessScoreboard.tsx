"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { GuessTurn, PlayerScore } from "@/types/game";
import AutoAdvanceIndicator from "./AutoAdvanceIndicator";

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
  onOneMoreRound: () => void;
  maxRounds: number | null;
  /** Seconds until auto-advance fires, or null when auto-advance is off. */
  autoAdvanceSec: number | null;
  /**
   * The player whose turn it is to pick. Used to highlight them in the
   * standings while the rest of the group waits on the scoreboard during the
   * picking phase (currentTurn.status === "picking").
   */
  picker?: { id: string; name: string };
}

function useAnimatedScore(target: number, duration = 1200) {
  const [display, setDisplay] = useState(target);
  const prevTarget = useRef(target);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = prevTarget.current;
    const diff = target - from;
    prevTarget.current = target;

    if (diff === 0) {
      setDisplay(target);
      return;
    }

    const start = performance.now();

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + diff * eased));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  return display;
}

function ScoreRow({
  score,
  index,
  pointsGained,
  isPicking,
}: {
  score: PlayerScore;
  index: number;
  pointsGained: number;
  /** Whether this player is currently choosing the next song. */
  isPicking: boolean;
}) {
  const animatedPoints = useAnimatedScore(score.totalPoints);
  const [showGain, setShowGain] = useState(false);

  useEffect(() => {
    if (pointsGained > 0) {
      setShowGain(true);
      const timer = setTimeout(() => setShowGain(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [pointsGained]);

  return (
    <div
      className={`flex items-center justify-between rounded-lg px-4 py-2 transition-all duration-500 ${
        isPicking
          ? "bg-green-50 ring-2 ring-green-500"
          : "bg-gray-50"
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="text-lg font-bold text-gray-400">#{index + 1}</span>
        <span className="font-semibold text-black">{score.playerName}</span>
        {isPicking && (
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
            🎵 picking
          </span>
        )}
      </div>
      <div className="relative flex items-center gap-2">
        {showGain && (
          <span className="animate-score-pop text-sm font-bold text-green-500">
            +{pointsGained}
          </span>
        )}
        <span className="text-lg font-bold text-green-600 tabular-nums">
          {animatedPoints} pts
        </span>
      </div>
    </div>
  );
}

export default function GuessScoreboard({
  currentTurn,
  scores,
  turnResults,
  isOwner,
  onNextTurn,
  onOneMoreRound,
  maxRounds,
  autoAdvanceSec,
  picker,
}: GuessScoreboardProps) {
  // While the next picker is choosing a song, the rest of the group stays here
  // on the scoreboard instead of a separate waiting screen. In that mode we
  // swap the song reveal for a "who's picking" banner and hide the per-turn
  // results and host controls — there's nothing to reveal or advance yet.
  const isPicking = currentTurn.status === "picking";
  // The game is already set to finish on (or before) the round in progress, so
  // there is nothing left to wrap up.
  const endAlreadyScheduled =
    maxRounds !== null && currentTurn.roundNumber >= maxRounds;
  const sortedScores = [...scores].sort(
    (a, b) => b.totalPoints - a.totalPoints,
  );

  const pointsMap = new Map(
    turnResults.map((r) => [r.playerId, r.points]),
  );

  return (
    // Leave room at the bottom so the pinned auto-advance bar never covers the
    // host's buttons.
    <div className={`space-y-4 ${autoAdvanceSec !== null ? "pb-24" : ""}`}>
      {isPicking ? (
        /* Picking banner — shown to guessers and the host while the picker chooses */
        <div className="rounded-lg bg-white p-6 shadow-lg text-center">
          <div className="mb-3 text-5xl">🎵</div>
          <h2 className="mb-1 text-2xl font-bold text-black">
            {picker?.name ?? "Someone"} is picking the next song...
          </h2>
          <p className="text-gray-600">Get ready to guess what they play!</p>
          <div className="mt-4 flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-500 border-t-transparent" />
          </div>
        </div>
      ) : (
        /* Song reveal */
        <div className="rounded-lg bg-white p-6 shadow-lg text-center">
          <h2 className="mb-2 text-xl font-bold text-gray-700">
            The song was...
          </h2>
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
      )}

      {/* Turn results */}
      {!isPicking && turnResults.length > 0 && (
        <div className="rounded-lg bg-white p-6 shadow-lg">
          <h3 className="mb-3 text-lg font-bold text-black">Guesses</h3>
          <div className="space-y-2">
            {turnResults.map((result) => {
              const isPicker = result.songName === "" && result.artistName === "";
              return (
                <div
                  key={result.playerId}
                  className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-2"
                >
                  <div>
                    <p className="font-semibold text-black">
                      {result.playerName}
                    </p>
                    <p className="text-sm text-gray-600">
                      {isPicker
                        ? "Picker (avg. score)"
                        : `${result.songName} - ${result.artistName}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">+{result.points}</p>
                    {!isPicker && result.songCorrect && result.artistCorrect && (
                      <p className="text-xs text-green-600">Exact match!</p>
                    )}
                    {!isPicker && result.songCorrect && !result.artistCorrect && (
                      <p className="text-xs text-yellow-600">Right song</p>
                    )}
                    {!isPicker && !result.songCorrect && result.artistCorrect && (
                      <p className="text-xs text-yellow-600">Right artist</p>
                    )}
                    {!isPicker && !result.songCorrect && !result.artistCorrect && (
                      <p className="text-xs text-gray-400">Wrong</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Running scores */}
      <div className="rounded-lg bg-white p-6 shadow-lg">
        <h3 className="mb-3 text-lg font-bold text-black">Standings</h3>
        <div className="space-y-2">
          {sortedScores.map((score, index) => (
            <ScoreRow
              key={score.playerId}
              score={score}
              index={index}
              pointsGained={pointsMap.get(score.playerId) ?? 0}
              isPicking={isPicking && score.playerId === picker?.id}
            />
          ))}
        </div>
      </div>

      {isOwner && !isPicking && (
        <div className="space-y-2">
          <button
            onClick={onNextTurn}
            className="w-full rounded-lg bg-green-600 px-4 py-3 font-semibold text-white hover:bg-green-700"
          >
            Next Turn
          </button>
          {endAlreadyScheduled ? (
            <p className="text-center text-sm font-medium text-amber-600">
              Final round — the game ends when this round finishes
            </p>
          ) : (
            <button
              onClick={onOneMoreRound}
              className="w-full rounded-lg border border-green-600 px-4 py-3 font-semibold text-green-700 hover:bg-green-50"
            >
              One more round
            </button>
          )}
          {autoAdvanceSec !== null && (
            <AutoAdvanceIndicator
              key={currentTurn.id}
              delaySec={autoAdvanceSec}
              label={endAlreadyScheduled ? "Game ends in" : "Next song in"}
            />
          )}
        </div>
      )}
    </div>
  );
}
