"use client";

import { useSpotifyPlayer } from "./SpotifyPlayerProvider";
import { useState } from "react";

export default function SpotifyPlayer() {
  const { state, pause, resume, seek, error } = useSpotifyPlayer();
  const [volumeLevel, setVolumeLevel] = useState(50);

  if (!state.isReady) {
    return (
      <div className="rounded-lg bg-gray-900 p-4 shadow-lg">
        <div className="flex items-center gap-3 text-gray-400">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-700 border-t-green-500" />
          <span>Initializing Spotify player...</span>
        </div>
        {error && <div className="mt-2 text-sm text-red-400">{error}</div>}
      </div>
    );
  }

  if (!state.currentTrack) {
    return (
      <div className="flex items-center justify-center rounded-lg bg-gray-900 p-4 text-gray-400 shadow-lg">
        No track playing
      </div>
    );
  }

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  const progressPercent = (state.position / state.duration) * 100;

  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg p-6 shadow-lg">
      {error && (
        <div className="mb-4 rounded-lg bg-red-900 p-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="flex gap-4">
        {/* Album Art */}
        <div className="w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden shadow-md">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={state.currentTrack.image}
            alt={state.currentTrack.name}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Track Info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold text-lg truncate">
            {state.currentTrack.name}
          </h3>
          <p className="text-gray-400 text-sm truncate">
            {state.currentTrack.artist}
          </p>

          {/* Progress Bar */}
          <div className="mt-4 space-y-2">
            <div className="bg-gray-700 h-1 rounded-full overflow-hidden cursor-pointer group">
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
            <div className="flex justify-between text-xs text-gray-400">
              <span>{formatTime(state.position)}</span>
              <span>{formatTime(state.duration)}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="mt-4 flex items-center gap-4">
            <button
              onClick={state.isPaused ? resume : pause}
              className="w-10 h-10 rounded-full bg-green-500 hover:bg-green-400 text-white flex items-center justify-center transition-colors"
              aria-label={state.isPaused ? "Play" : "Pause"}
            >
              {state.isPaused ? (
                <svg
                  className="w-5 h-5 ml-0.5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              ) : (
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              )}
            </button>

            {/* Volume Control */}
            <div className="flex items-center gap-2 ml-auto">
              <svg
                className="w-4 h-4 text-gray-400"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.26 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
              </svg>
              <input
                type="range"
                min="0"
                max="100"
                value={volumeLevel}
                onChange={(e) => setVolumeLevel(Number(e.target.value))}
                className="w-20 h-1 bg-gray-700 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, rgb(34, 197, 94) 0%, rgb(34, 197, 94) ${volumeLevel}%, rgb(55, 65, 81) ${volumeLevel}%, rgb(55, 65, 81) 100%)`,
                }}
              />
              <span className="text-xs text-gray-400 w-6">{volumeLevel}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
