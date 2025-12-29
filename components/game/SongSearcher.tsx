"use client";

import { useState, useEffect } from "react";
import type { SpotifySearchResult } from "@/lib/spotify";
import { SongSelection } from "./types";

interface SongSearcherProps {
  onSongSelected: (song: SongSelection) => void;
  disabled?: boolean;
}

export default function SongSearcher({
  onSongSelected,
  disabled = false,
}: SongSearcherProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SpotifySearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedTimeMap, setSelectedTimeMap] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }

    const searchDebounced = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          `/api/spotify/search?q=${encodeURIComponent(query)}`,
        );
        if (!response.ok) throw new Error("Search failed");

        const data = (await response.json()) as SpotifySearchResult[];
        setResults(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Search failed");
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(searchDebounced, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSelectSong = (song: SpotifySearchResult) => {
    onSongSelected({
      ...song,
      preview_url: song.preview_url,
      duration_ms: song.duration_ms,
      startTimeS: selectedTimeMap[song.id] || 0,
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <input
          type="text"
          placeholder="Search for a song..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={disabled}
          className="w-full rounded-lg border border-gray-300 px-4 py-3 text-lg focus:border-green-500 focus:outline-none disabled:bg-gray-100"
        />
        {error && <p className="mt-2 text-base text-red-600">{error}</p>}
      </div>

      {loading && (
        <p className="text-center text-lg text-gray-700">Searching...</p>
      )}

      {results.length > 0 && (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {results.map((song) => {
            const songDurationS = Math.floor(song.duration_ms / 1000);
            const currentStartTime = selectedTimeMap[song.id] || 0;

            return (
              <div
                key={song.id}
                className="rounded-lg border border-gray-200 p-3 hover:bg-gray-50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-base font-semibold text-black">
                      {song.name}
                    </p>
                    <p className="text-base text-gray-700">
                      {song.artists[0]?.name || "Unknown"}
                    </p>
                    <p className="text-sm text-gray-600">
                      {songDurationS}s
                    </p>
                  </div>
                  <button
                    onClick={() => handleSelectSong(song)}
                    disabled={disabled}
                    className="rounded bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    Select
                  </button>
                </div>

                {song.preview_url && (
                  <div className="mt-2">
                    <audio src={song.preview_url} controls className="w-full" />
                  </div>
                )}

                {/* Start time selector */}
                <div className="mt-3 space-y-2">
                  <label className="text-sm font-semibold text-gray-700">
                    Start time (seconds)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max={songDurationS}
                    value={currentStartTime}
                    onChange={(e) => setSelectedTimeMap((prev) => ({
                      ...prev,
                      [song.id]: parseInt(e.target.value),
                    }))}
                    className="w-full"
                  />
                  <p className="text-sm text-gray-600">
                    Start at {currentStartTime}s
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && results.length === 0 && query.length >= 2 && (
        <p className="text-center text-lg text-gray-700">No results found</p>
      )}
    </div>
  );
}
