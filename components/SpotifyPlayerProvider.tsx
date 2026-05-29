"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { useAuthSession } from "@/hooks/useAuthSession";

export interface SpotifyDevice {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
}

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
  play: (spotifyId: string, positionMs?: number) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  seek: (positionMs: number) => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
  error: string | null;
  devices: SpotifyDevice[];
  selectedDevice: SpotifyDevice | null;
  selectDevice: (device: SpotifyDevice | null) => void;
  refreshDevices: () => Promise<void>;
}

const SpotifyPlayerContext = createContext<
  SpotifyPlayerContextType | undefined
>(undefined);

export function useSpotifyPlayer() {
  const context = useContext(SpotifyPlayerContext);
  if (!context) {
    throw new Error(
      "useSpotifyPlayer must be used within SpotifyPlayerProvider",
    );
  }
  return context;
}

const PLACEHOLDER_TRACK_ID = "placeholder-sims-2-theme";
export const WEB_PLAYER_NAME = "Spotify Tournament";

export default function SpotifyPlayerProvider({
  children,
}: {
  children: ReactNode;
}) {
  const session = useAuthSession();
  const playerRef = useRef<Spotify.Player | null>(null);
  const lastPositionRef = useRef<number>(0);
  const lastTimestampRef = useRef<number>(0);
  const tokenCacheRef = useRef<{ token: string; expiresAt: number } | null>(
    null,
  );
  const tokenRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [state, setState] = useState<PlayerState>({
    deviceId: null,
    isReady: false,
    isPaused: true,
    currentTrack: {
      id: PLACEHOLDER_TRACK_ID,
      name: "The Sims 2 Theme",
      artist: "Goldmund",
      image: "https://i.scdn.co/image/ab67616d0000b273e0b4b7c0e0b4b7c0e0b4b7c0",
    },
    position: 0,
    duration: 59000,
  });
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<SpotifyDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<SpotifyDevice | null>(
    null,
  );

  // Whether we're using an external device (not the Web SDK)
  const isRemoteDevice = selectedDevice !== null;

  // Effective device ID for API calls
  const activeDeviceId = selectedDevice?.id ?? state.deviceId;

  // The player is ready if Web SDK is ready OR an external device is selected
  const isReady = state.isReady || isRemoteDevice;

  const refreshDevices = useCallback(async () => {
    try {
      const res = await fetch("/api/spotify/devices");
      if (!res.ok) return;
      const data = (await res.json()) as { devices: SpotifyDevice[] };
      // Filter out the Web SDK device to avoid duplication (shown as "This Browser")
      const externalDevices = data.devices.filter(
        (d) => d.id !== state.deviceId && d.name !== WEB_PLAYER_NAME,
      );
      setDevices(externalDevices);
    } catch {
      // silently fail
    }
  }, [state.deviceId]);

  const selectDevice = useCallback((device: SpotifyDevice | null) => {
    setSelectedDevice(device);
  }, []);

  useEffect(() => {
    if (!session?.user) {
      return;
    }

    let mounted = true;
    let timeoutId: NodeJS.Timeout | null = null;

    // Schedule token refresh based on actual expiry time
    const scheduleTokenRefresh = () => {
      if (tokenRefreshIntervalRef.current) {
        clearTimeout(tokenRefreshIntervalRef.current);
      }

      const cache = tokenCacheRef.current;
      if (!cache) return;

      // Refresh 2 minutes before the client-side cache expires, minimum 30s
      const refreshIn = Math.max(
        cache.expiresAt - Date.now() - 120_000,
        30_000,
      );
      console.log(
        `[SpotifyPlayer] Next token refresh scheduled in ${Math.round(refreshIn / 1000)}s`,
      );

      tokenRefreshIntervalRef.current = setTimeout(async () => {
        console.log("[SpotifyPlayer] Scheduled token refresh...");
        try {
          const res = await fetch("/api/spotify/token");
          if (res.ok) {
            const data = (await res.json()) as {
              accessToken: string;
              expiresAt: number;
            };
            if (data.accessToken) {
              tokenCacheRef.current = {
                token: data.accessToken,
                expiresAt: data.expiresAt - 30_000,
              };
              console.log(
                `[SpotifyPlayer] Token refresh successful, expires in ${Math.round((data.expiresAt - Date.now()) / 1000)}s`,
              );
              scheduleTokenRefresh();
            }
          } else {
            console.error(
              `[SpotifyPlayer] Token refresh failed: ${res.status}`,
            );
            tokenRefreshIntervalRef.current = setTimeout(
              scheduleTokenRefresh,
              30_000,
            );
          }
        } catch (err) {
          console.error("[SpotifyPlayer] Token refresh error:", err);
          tokenRefreshIntervalRef.current = setTimeout(
            scheduleTokenRefresh,
            30_000,
          );
        }
      }, refreshIn);
    };

    const getOAuthToken = async (callback: (token: string) => void) => {
      try {
        // Check if we have a cached token that's still valid
        const now = Date.now();
        if (tokenCacheRef.current && tokenCacheRef.current.expiresAt > now) {
          const timeLeft = Math.round(
            (tokenCacheRef.current.expiresAt - now) / 1000,
          );
          console.log(
            `[SpotifyPlayer] Using cached token, expires in ${timeLeft}s`,
          );
          callback(tokenCacheRef.current.token);
          return;
        }

        console.log(
          `[SpotifyPlayer] Fetching new token from /api/spotify/token`,
        );
        // Fetch a new token from the server
        const res = await fetch("/api/spotify/token");
        if (!res.ok) {
          throw new Error(
            `Failed to get token: ${res.status} ${res.statusText}`,
          );
        }

        const data = (await res.json()) as {
          accessToken: string;
          expiresAt: number;
        };
        if (!data.accessToken) {
          throw new Error("No access token in response");
        }

        console.log(
          `[SpotifyPlayer] Got new token from server, length: ${data.accessToken.length}, expires in ${Math.round((data.expiresAt - now) / 1000)}s`,
        );

        // Cache the token using server-provided expiry with 30s extra client buffer
        tokenCacheRef.current = {
          token: data.accessToken,
          expiresAt: data.expiresAt - 30_000,
        };

        scheduleTokenRefresh();
        callback(data.accessToken);
      } catch (err) {
        console.error(
          `[SpotifyPlayer] Error getting token:`,
          err instanceof Error ? err.message : err,
        );
        if (mounted) {
          const errorMsg = err instanceof Error ? err.message : "Unknown error";
          const needsReauth =
            errorMsg.includes("401") || errorMsg.includes("Not authenticated");
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
          name: WEB_PLAYER_NAME,
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
              image: track.album.images[0]?.url || "/placeholder-album.png",
            },
          }));
        });

        player.addListener("authentication_error", ({ message }) => {
          console.log(
            "[SpotifyPlayer] Authentication error, clearing token cache",
          );
          tokenCacheRef.current = null;
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
            err instanceof Error ? err.message : "Failed to initialize player",
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
      if (tokenRefreshIntervalRef.current) {
        clearTimeout(tokenRefreshIntervalRef.current);
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

    if (isReady && !state.isPaused && state.currentTrack) {
      lastTimestampRef.current = Date.now();
      intervalId = setInterval(updatePosition, 100);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isReady, state.isPaused, state.currentTrack]);

  const play = async (spotifyId: string, positionMs?: number) => {
    if (!activeDeviceId) {
      setError("No device available. Select a device or wait for the browser player to connect.");
      return;
    }

    try {
      const response = await fetch("/api/playback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spotifyId,
          deviceId: activeDeviceId,
          positionMs,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to start playback");
      }

      // For remote devices, manually update state since Web SDK events won't fire
      if (isRemoteDevice) {
        lastPositionRef.current = positionMs ?? 0;
        lastTimestampRef.current = Date.now();
        setState((prev) => ({
          ...prev,
          isPaused: false,
          position: positionMs ?? 0,
        }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Playback failed");
      throw err;
    }
  };

  const pause = async () => {
    if (isRemoteDevice) {
      try {
        const response = await fetch("/api/playback/pause", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deviceId: activeDeviceId }),
        });
        if (!response.ok) throw new Error("Failed to pause playback");
        setState((prev) => ({ ...prev, isPaused: true }));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Pause failed");
      }
    } else if (playerRef.current) {
      try {
        await playerRef.current.pause();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Pause failed");
      }
    }
  };

  const resume = async () => {
    if (isRemoteDevice) {
      try {
        const response = await fetch("/api/playback/resume", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deviceId: activeDeviceId }),
        });
        if (!response.ok) throw new Error("Failed to resume playback");
        lastTimestampRef.current = Date.now();
        setState((prev) => ({ ...prev, isPaused: false }));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Resume failed");
      }
    } else if (playerRef.current) {
      try {
        await playerRef.current.resume();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Resume failed");
      }
    }
  };

  const seek = async (positionMs: number) => {
    if (isRemoteDevice) {
      try {
        const response = await fetch("/api/playback/seek", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deviceId: activeDeviceId, positionMs }),
        });
        if (!response.ok) throw new Error("Failed to seek");
        lastPositionRef.current = positionMs;
        lastTimestampRef.current = Date.now();
        setState((prev) => ({ ...prev, position: positionMs }));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Seek failed");
      }
    } else if (playerRef.current) {
      try {
        await playerRef.current.seek(positionMs);
        lastPositionRef.current = positionMs;
        lastTimestampRef.current = Date.now();
        setState((prev) => ({ ...prev, position: positionMs }));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Seek failed");
      }
    }
  };

  const setVolume = useCallback(async (volume: number) => {
    // Volume control is only supported on the Web SDK player (the host's
    // browser); remote Spotify devices have no SDK volume hook.
    if (!playerRef.current) return;
    try {
      await playerRef.current.setVolume(Math.max(0, Math.min(1, volume)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Volume control failed");
    }
  }, []);

  return (
    <SpotifyPlayerContext.Provider
      value={{
        state: { ...state, isReady },
        play,
        pause,
        resume,
        seek,
        setVolume,
        error,
        devices,
        selectedDevice,
        selectDevice,
        refreshDevices,
      }}
    >
      {children}
    </SpotifyPlayerContext.Provider>
  );
}
