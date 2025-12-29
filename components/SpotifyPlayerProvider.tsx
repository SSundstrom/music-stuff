"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from "react";
import { useAuthSession } from "@/hooks/useAuthSession";

interface PlayerState {
  deviceId: string | null;
  isReady: boolean;
  isPaused: boolean;
  currentTrack: {
    id: string;
    name: string;
    artist: string;
    image: string;
  } | null;
  position: number;
  duration: number;
}

interface SpotifyPlayerContextType {
  state: PlayerState;
  play: (spotifyId: string) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  seek: (positionMs: number) => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
  error: string | null;
}

const SpotifyPlayerContext = createContext<SpotifyPlayerContextType | undefined>(
  undefined,
);

export function useSpotifyPlayer() {
  const context = useContext(SpotifyPlayerContext);
  if (!context) {
    throw new Error("useSpotifyPlayer must be used within SpotifyPlayerProvider");
  }
  return context;
}

export default function SpotifyPlayerProvider({
  children,
}: {
  children: ReactNode;
}) {
  const session = useAuthSession();
  const playerRef = useRef<Spotify.Player | null>(null);
  const lastPositionRef = useRef<number>(0);
  const lastTimestampRef = useRef<number>(0);
  const tokenCacheRef = useRef<{ token: string; expiresAt: number } | null>(null);
  const tokenRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [state, setState] = useState<PlayerState>({
    deviceId: null,
    isReady: false,
    isPaused: true,
    currentTrack: null,
    position: 0,
    duration: 0,
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.user) {
      return;
    }

    let mounted = true;
    let timeoutId: NodeJS.Timeout | null = null;

    const getOAuthToken = async (callback: (token: string) => void) => {
      try {
        // Check if we have a cached token that's still valid
        const now = Date.now();
        if (tokenCacheRef.current && tokenCacheRef.current.expiresAt > now) {
          const timeLeft = Math.round((tokenCacheRef.current.expiresAt - now) / 1000);
          console.log(`[SpotifyPlayer] Using cached token, expires in ${timeLeft}s`);
          callback(tokenCacheRef.current.token);
          return;
        }

        console.log(`[SpotifyPlayer] Fetching new token from /api/spotify/token`);
        // Fetch a new token from the server
        const res = await fetch("/api/spotify/token");
        if (!res.ok) {
          throw new Error(`Failed to get token: ${res.status} ${res.statusText}`);
        }

        const data = (await res.json()) as { accessToken: string };
        if (!data.accessToken) {
          throw new Error("No access token in response");
        }

        console.log(
          `[SpotifyPlayer] Got new token from server, length: ${data.accessToken.length}`,
        );

        // Cache the token with an expiration time (typically 3600s, we'll use 3000s as buffer)
        tokenCacheRef.current = {
          token: data.accessToken,
          expiresAt: now + 3000 * 1000, // Conservative 3000 second expiration
        };

        callback(data.accessToken);
      } catch (err) {
        console.error(
          `[SpotifyPlayer] Error getting token:`,
          err instanceof Error ? err.message : err,
        );
        if (mounted) {
          const errorMsg = err instanceof Error ? err.message : "Unknown error";
          const needsReauth = errorMsg.includes("401") || errorMsg.includes("Not authenticated");
          setError(
            needsReauth
              ? "Spotify authentication expired. Please sign in again to reconnect."
              : "Failed to get Spotify token: " + errorMsg,
          );
        }
      }
    };

    const initializePlayer = async () => {
      if (!mounted) return;

      if (!window.Spotify) {
        timeoutId = setTimeout(() => initializePlayer(), 500);
        return;
      }

      try {
        const player = new window.Spotify.Player({
          name: "Spotify Tournament",
          getOAuthToken,
          volume: 0.5,
        });

        player.addListener("ready", ({ device_id }) => {
          if (mounted) {
            setState((prev) => ({
              ...prev,
              deviceId: device_id,
              isReady: true,
            }));
          }
        });

        player.addListener("not_ready", ({ device_id }) => {
          if (mounted) {
            setState((prev) => ({
              ...prev,
              deviceId: device_id,
              isReady: false,
            }));
          }
        });

        player.addListener("player_state_changed", (playbackState) => {
          if (!mounted || !playbackState) return;

          const track = playbackState.track_window.current_track;
          const artists = track.artists.map((a) => a.name).join(", ");

          // Update refs for continuous position tracking
          lastPositionRef.current = playbackState.position;
          lastTimestampRef.current = Date.now();

          setState((prev) => ({
            ...prev,
            isPaused: playbackState.paused,
            position: playbackState.position,
            duration: track.duration_ms,
            currentTrack: {
              id: track.id,
              name: track.name,
              artist: artists,
              image:
                track.album.images[0]?.url || "/placeholder-album.png",
            },
          }));
        });

        player.addListener("authentication_error", ({ message }) => {
          if (mounted) {
            setError(message);
          }
        });

        player.addListener("playback_error", ({ message }) => {
          if (mounted) {
            setError(message);
          }
        });

        player.connect();
        playerRef.current = player;
      } catch (err) {
        if (mounted) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to initialize player",
          );
        }
      }
    };

    initializePlayer();

    // Set up background token refresh every 2500 seconds (about 42 minutes)
    // This ensures we always have a fresh token without relying on SDK callbacks
    tokenRefreshIntervalRef.current = setInterval(async () => {
      console.log("[SpotifyPlayer] Background token refresh check...");
      try {
        const res = await fetch("/api/spotify/token");
        if (res.ok) {
          const data = (await res.json()) as { accessToken: string };
          if (data.accessToken) {
            const now = Date.now();
            tokenCacheRef.current = {
              token: data.accessToken,
              expiresAt: now + 3000 * 1000,
            };
            console.log(
              `[SpotifyPlayer] Background token refresh successful, new token length: ${data.accessToken.length}`,
            );
          }
        } else {
          console.error(
            `[SpotifyPlayer] Background token refresh failed: ${res.status}`,
          );
        }
      } catch (err) {
        console.error(
          "[SpotifyPlayer] Failed to refresh Spotify token in background:",
          err,
        );
      }
    }, 2500 * 1000); // Refresh every 2500 seconds

    return () => {
      mounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (tokenRefreshIntervalRef.current) {
        clearInterval(tokenRefreshIntervalRef.current);
        tokenRefreshIntervalRef.current = null;
      }
      if (playerRef.current) {
        playerRef.current.disconnect();
        playerRef.current = null;
      }
    };
  }, [session?.user]);

  // Continuous position update effect
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    const updatePosition = () => {
      setState((prev) => {
        if (prev.isPaused || !prev.currentTrack) {
          return prev;
        }

        const now = Date.now();
        const elapsed = now - lastTimestampRef.current;
        const newPosition = Math.min(
          lastPositionRef.current + elapsed,
          prev.duration,
        );

        return {
          ...prev,
          position: newPosition,
        };
      });
    };

    if (state.isReady && !state.isPaused && state.currentTrack) {
      lastTimestampRef.current = Date.now();
      intervalId = setInterval(updatePosition, 100);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [state.isReady, state.isPaused, state.currentTrack]);

  const play = async (spotifyId: string) => {
    if (!playerRef.current || !state.deviceId) {
      setError("Player not ready");
      return;
    }

    try {
      const response = await fetch("/api/playback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spotifyId,
          deviceId: state.deviceId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to start playback");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Playback failed");
      throw err;
    }
  };

  const pause = async () => {
    if (!playerRef.current) return;
    try {
      await playerRef.current.pause();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Pause failed");
    }
  };

  const resume = async () => {
    if (!playerRef.current) return;
    try {
      await playerRef.current.resume();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Resume failed");
    }
  };

  const seek = async (positionMs: number) => {
    if (!playerRef.current) return;
    try {
      await playerRef.current.seek(positionMs);
      // Update position tracking refs after seeking
      lastPositionRef.current = positionMs;
      lastTimestampRef.current = Date.now();
      setState((prev) => ({
        ...prev,
        position: positionMs,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Seek failed");
    }
  };

  const setVolume = async (volume: number) => {
    if (!playerRef.current) return;
    try {
      await playerRef.current.setVolume(Math.max(0, Math.min(1, volume)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Volume control failed");
    }
  };

  return (
    <SpotifyPlayerContext.Provider
      value={{
        state,
        play,
        pause,
        resume,
        seek,
        setVolume,
        error,
      }}
    >
      {children}
    </SpotifyPlayerContext.Provider>
  );
}
