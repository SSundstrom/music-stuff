"use client";

import { useSpotifyPlayer } from "./SpotifyPlayerProvider";

const PLACEHOLDER_TRACK_ID = "placeholder-sims-2-theme";
const SIMS_THEME_SPOTIFY_ID = "30xHm3p2stFpmHyq0Rfm9x";

export default function SpotifyPlayer() {
  const { state, pause, resume, seek, play } = useSpotifyPlayer();

  if (!state.currentTrack) {
    return null;
  }

  const progressPercent = state.duration > 0 ? (state.position / state.duration) * 100 : 0;

  return (
    <div className="flex items-center gap-4">
      {/* Progress Bar */}
      <div className="flex-1 relative cursor-pointer group h-1">
        <div className="absolute inset-0 bg-gray-700 rounded-full" />
        <div
          className="absolute inset-y-0 left-0 bg-green-500 group-hover:bg-green-400 transition-colors rounded-full"
          style={{ width: `${progressPercent}%` }}
        />
        <div
          className="absolute inset-0 rounded-full"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            seek(percent * state.duration);
          }}
        />
      </div>

      {/* Play/Pause Button */}
      <button
        onClick={() => {
          if (state.isPaused) {
            if (state.currentTrack?.id === PLACEHOLDER_TRACK_ID) {
              play(SIMS_THEME_SPOTIFY_ID);
            } else {
              resume();
            }
          } else {
            pause();
          }
        }}
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
