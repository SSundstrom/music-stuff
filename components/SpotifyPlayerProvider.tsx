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

    const initializePlayer = async () => {
      if (!mounted) return;

      if (!window.Spotify) {
        timeoutId = setTimeout(() => initializePlayer(), 500);
        return;
      }

      try {
        const player = new window.Spotify.Player({
          name: "Spotify Tournament",
          getOAuthToken: (callback) => {
            // Fetch the access token from the server when the SDK needs it
            fetch("/api/spotify/token")
              .then((res) => {
                if (!res.ok) {
                  throw new Error(
                    `Failed to get token: ${res.status} ${res.statusText}`,
                  );
                }
                return res.json();
              })
              .then((data) => {
                if (!data.accessToken) {
                  throw new Error("No access token in response");
                }
                callback(data.accessToken);
              })
              .catch((err) => {
                if (mounted) {
                  setError(
                    "Failed to get Spotify token: " +
                      (err instanceof Error ? err.message : "Unknown error"),
                  );
                }
              });
          },
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

    return () => {
      mounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
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
