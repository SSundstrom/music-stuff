"use client";

import { useSpotifyPlayer } from "./SpotifyPlayerProvider";

export default function SpotifyPlayer() {
  const { state, pause, resume, seek } = useSpotifyPlayer();

  if (!state.isReady) {
    return (
      <div className="flex items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-700 border-t-green-500" />
        <p className="mx-1">Spotify error: try reauthenticting</p>
      </div>
    );
  }

  if (!state.currentTrack) {
    return null;
  }

  const progressPercent = (state.position / state.duration) * 100;

  return (
    <div className="flex items-center gap-4">
      {/* Progress Bar */}
      <div className="flex-1 bg-gray-700 h-1 rounded-full overflow-hidden cursor-pointer group">
        <div
          className="bg-green-500 h-full group-hover:bg-green-400 transition-colors"
          style={{ width: `${progressPercent}%` }}
          onClick={(e) => {
            const rect = e.currentTarget.parentElement?.getBoundingClientRect();
            if (rect) {
              const percent = (e.clientX - rect.left) / rect.width;
              seek(percent * state.duration);
            }
          }}
        />
      </div>

      {/* Play/Pause Button */}
      <button
        onClick={state.isPaused ? resume : pause}
        className="w-8 h-8 rounded-full bg-green-500 hover:bg-green-400 text-white flex items-center justify-center transition-colors shrink-0"
        aria-label={state.isPaused ? "Play" : "Pause"}
      >
        {state.isPaused ? (
          <svg
            className="w-4 h-4 ml-0.5"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
          </svg>
        )}
      </button>
    </div>
  );
}
