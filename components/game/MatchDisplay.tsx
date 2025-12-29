"use client";

import { useState, useEffect, useRef } from "react";
import {
  type TournamentMatch,
  type Song,
  SSEMessageSchema,
  VoteRequest,
} from "@/types/game";
import { useSpotifyPlayer } from "../SpotifyPlayerProvider";
import SongMatchCard from "./SongMatchCard";

interface MatchDisplayProps {
  match: TournamentMatch;
  songA: Song;
  songB: Song;
  playerId: string | null;
  isOwner: boolean;
  sessionId: string;
}

export default function MatchDisplay({
  match,
  songA,
  songB,
  playerId,
  isOwner,
  sessionId,
}: MatchDisplayProps) {
  const { play, pause, seek } = useSpotifyPlayer();
  const [userVote, setUserVote] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const playbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    // Keep SSE connection alive - match state updates come from parent props
    // but we need the connection active to allow server to broadcast to this client
    const playerId_ = playerId || "guest";
    const eventSource = new EventSource(
      `/api/game/${sessionId}/stream?playerId=${encodeURIComponent(playerId_)}`,
    );

    eventSource.addEventListener("message", (event) => {
      try {
        const parsedEvent = SSEMessageSchema.parse(JSON.parse(event.data));
        // We don't manage state here - just keep connection alive
        // State updates come from parent props via useGameSession hook
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const _unused = parsedEvent;
      } catch (err) {
        console.error("Failed to parse SSE message:", err);
      }
    });

    eventSource.onerror = () => {
      console.error("SSE connection error");
      eventSource.close();
    };

    eventSourceRef.current = eventSource;

    return () => {
      eventSource.close();
    };
  }, [match.id, sessionId, playerId]);

  const handleVote = async (songId: string) => {
    if (!playerId) {
      setError("Player ID not found");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/game/${sessionId}/vote`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Player-ID": playerId,
        },
        body: JSON.stringify({
          matchId: match.id,
          songId: songId,
        } satisfies VoteRequest),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error: string };
        throw new Error(data.error);
      }

      setUserVote(songId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handlePlaySong = async (songId: string) => {
    if (!isOwner) {
      setError("Only the owner can control playback");
      return;
    }

    // If this song is already playing, pause it instead
    if (match.currentlyPlayingSongId === songId && isPlaying) {
      await handlePauseSong();
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Find the track to get Spotify ID and start time
      const song = songA.id === songId ? songA : songB;

      // Use Web Playback SDK to play the song
      const spotifyId = song.spotifyId || song.id;
      await play(spotifyId);

      // Seek to the start time if specified (convert seconds to milliseconds)
      const startTimeMs = song.startTime * 1000;
      await new Promise((resolve) => setTimeout(resolve, 100)); // Small delay to ensure playback started
      await seek(startTimeMs);

      setIsPlaying(true);

      // Notify server that playback started
      await fetch(`/api/game/${sessionId}/playback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "started",
          matchId: match.id,
          songId: song.id,
          songName: song.songName,
          artistName: song.artistName,
        }),
      });

      // Auto-pause after duration (default to 30 seconds)
      const duration = 30;
      if (playbackTimeoutRef.current) {
        clearTimeout(playbackTimeoutRef.current);
      }
      playbackTimeoutRef.current = setTimeout(() => {
        setIsPlaying(false);
        handlePauseSong();
      }, duration * 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to play song");
    } finally {
      setLoading(false);
    }
  };

  const handlePauseSong = async () => {
    if (!isOwner) return;

    try {
      await pause();
      setIsPlaying(false);

      // Notify server that playback stopped
      await fetch(`/api/game/${sessionId}/playback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "stopped",
          matchId: match.id,
        }),
      });
    } catch (err) {
      console.error("Failed to pause:", err);
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (playbackTimeoutRef.current) {
        clearTimeout(playbackTimeoutRef.current);
      }
    };
  }, []);

  const duration = 30; // Default duration in seconds

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-100 p-4 text-base text-red-800">
          {error}
        </div>
      )}

      {/* Song Comparison */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <SongMatchCard
          song={songA}
          isPlaying={isPlaying}
          isCurrentlyPlaying={match.currentlyPlayingSongId === songA.id}
          userVoted={userVote === songA.id}
          isLoading={loading}
          isOwner={isOwner}
          duration={duration}
          onPlay={handlePlaySong}
          onVote={handleVote}
          orderClass="order-1"
        />

        <SongMatchCard
          song={songB}
          isPlaying={isPlaying}
          isCurrentlyPlaying={match.currentlyPlayingSongId === songB.id}
          userVoted={userVote === songB.id}
          isLoading={loading}
          isOwner={isOwner}
          duration={duration}
          onPlay={handlePlaySong}
          onVote={handleVote}
          orderClass="order-3 md:order-2"
        />

        <div className="order-2 md:order-3 md:col-span-2 flex items-center justify-center gap-3">
          <div className="flex-1 border-t-2 border-gray-300" />
          <span className="text-lg font-bold text-gray-800">VS</span>
          <div className="flex-1 border-t-2 border-gray-300" />
        </div>
      </div>
    </div>
  );
}
