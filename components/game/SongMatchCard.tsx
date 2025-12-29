"use client";

import type { Song } from "@/types/game";
import { FaPlay, FaPause } from "react-icons/fa";

interface SongMatchCardProps {
  song: Song;
  isPlaying: boolean;
  isCurrentlyPlaying: boolean;
  userVoted: boolean;
  isLoading: boolean;
  isOwner: boolean;
  duration: number;
  onPlay: (songId: string) => void;
  onVote: (songId: string) => void;
  orderClass: string;
}

export default function SongMatchCard({
  song,
  isPlaying,
  isCurrentlyPlaying,
  userVoted,
  isLoading,
  isOwner,
  duration,
  onPlay,
  onVote,
  orderClass,
}: SongMatchCardProps) {
  return (
    <div
      className={`${orderClass} rounded-3xl border-2 relative transition-all overflow-hidden min-h-64 flex ${
        isCurrentlyPlaying
          ? "border-blue-500 shadow-lg"
          : "border-gray-300"
      }`}
    >
      {isCurrentlyPlaying && (
        <div className="absolute top-4 left-4 z-10 flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
          <span className="inline-block h-2 w-2 rounded-full bg-white animate-pulse" />
          Now Playing
        </div>
      )}

      {/* Vote Button - Takes up 80% on owner's card, 100% for non-owners */}
      <button
        onClick={() => onVote(song.id)}
        disabled={isLoading}
        className={`flex-1 font-bold text-xl transition-all flex items-center justify-center ${
          isOwner ? "w-4/5" : "w-full"
        } ${
          userVoted
            ? "bg-green-600 text-white hover:bg-green-700"
            : "bg-white hover:bg-green-50"
        }`}
      >
        {userVoted ? "✓ Voted" : "Vote"}
      </button>

      {/* Play Button (Owner only) - Takes up 20% on right side */}
      {isOwner && (
        <button
          onClick={() => onPlay(song.id)}
          disabled={isLoading}
          className={`w-1/5 font-semibold transition-all flex items-center justify-center border-l-2 border-gray-300 text-white disabled:opacity-50 ${
            isCurrentlyPlaying && isPlaying
              ? "bg-blue-600 hover:bg-blue-700"
              : "bg-blue-500 hover:bg-blue-600"
          }`}
          title={isCurrentlyPlaying && isPlaying ? "Pause" : `Play (${duration}s)`}
        >
          {isCurrentlyPlaying && isPlaying ? (
            <FaPause size={20} />
          ) : (
            <FaPlay size={20} />
          )}
        </button>
      )}
    </div>
  );
}
