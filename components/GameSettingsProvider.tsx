"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";

interface GameSettingsContextType {
  /** When true, the host's client advances host-gated steps automatically. */
  autoAdvance: boolean;
  /** Seconds on the "Get ready" countdown before playback starts. */
  getReadyDelaySec: number;
  /** Seconds on the scoreboard before advancing to the next turn. */
  scoreboardDelaySec: number;
  setAutoAdvance: (value: boolean) => void;
  setGetReadyDelaySec: (value: number) => void;
  setScoreboardDelaySec: (value: number) => void;
}

// Exported so Storybook (and other tests) can wrap components in a provider
// with mock values instead of the real localStorage-backed state.
export const GameSettingsContext = createContext<
  GameSettingsContextType | undefined
>(undefined);

export type { GameSettingsContextType };

export function useGameSettings() {
  const context = useContext(GameSettingsContext);
  if (!context) {
    throw new Error("useGameSettings must be used within GameSettingsProvider");
  }
  return context;
}

// These are device-local host preferences (they shape how the host's client
// drives the game), so they live in localStorage and persist across games on
// this device rather than in the shared, server-side game config.
const AUTO_ADVANCE_KEY = "gameAutoAdvance";
const GET_READY_DELAY_KEY = "gameGetReadyDelaySec";
const SCOREBOARD_DELAY_KEY = "gameScoreboardDelaySec";
// Legacy key: a single delay drove both steps before they were split.
const LEGACY_DELAY_KEY = "gameAutoAdvanceDelaySec";
const DEFAULT_AUTO_ADVANCE = false;
const DEFAULT_GET_READY_DELAY = 5;
const DEFAULT_SCOREBOARD_DELAY = 8;
const MIN_ADVANCE_DELAY = 2;
const MAX_ADVANCE_DELAY = 30;

function readStoredNumber(
  key: string,
  fallback: number,
  min: number,
  max: number,
): number {
  if (typeof window === "undefined") return fallback;
  const raw = window.localStorage.getItem(key);
  if (raw === null) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function readStoredBoolean(key: string, fallback: boolean): boolean {
  if (typeof window === "undefined") return fallback;
  const raw = window.localStorage.getItem(key);
  if (raw === null) return fallback;
  return raw === "true";
}

export default function GameSettingsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [autoAdvance, setAutoAdvanceState] = useState(() =>
    readStoredBoolean(AUTO_ADVANCE_KEY, DEFAULT_AUTO_ADVANCE),
  );
  const [getReadyDelaySec, setGetReadyDelaySecState] = useState(() =>
    readStoredNumber(
      GET_READY_DELAY_KEY,
      // Fall back to the legacy single delay, then the default.
      readStoredNumber(
        LEGACY_DELAY_KEY,
        DEFAULT_GET_READY_DELAY,
        MIN_ADVANCE_DELAY,
        MAX_ADVANCE_DELAY,
      ),
      MIN_ADVANCE_DELAY,
      MAX_ADVANCE_DELAY,
    ),
  );
  const [scoreboardDelaySec, setScoreboardDelaySecState] = useState(() =>
    readStoredNumber(
      SCOREBOARD_DELAY_KEY,
      readStoredNumber(
        LEGACY_DELAY_KEY,
        DEFAULT_SCOREBOARD_DELAY,
        MIN_ADVANCE_DELAY,
        MAX_ADVANCE_DELAY,
      ),
      MIN_ADVANCE_DELAY,
      MAX_ADVANCE_DELAY,
    ),
  );

  const setAutoAdvance = useCallback((value: boolean) => {
    setAutoAdvanceState(value);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(AUTO_ADVANCE_KEY, String(value));
    }
  }, []);

  const setGetReadyDelaySec = useCallback((value: number) => {
    const clamped = Math.max(
      MIN_ADVANCE_DELAY,
      Math.min(MAX_ADVANCE_DELAY, value),
    );
    setGetReadyDelaySecState(clamped);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(GET_READY_DELAY_KEY, String(clamped));
    }
  }, []);

  const setScoreboardDelaySec = useCallback((value: number) => {
    const clamped = Math.max(
      MIN_ADVANCE_DELAY,
      Math.min(MAX_ADVANCE_DELAY, value),
    );
    setScoreboardDelaySecState(clamped);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SCOREBOARD_DELAY_KEY, String(clamped));
    }
  }, []);

  return (
    <GameSettingsContext.Provider
      value={{
        autoAdvance,
        getReadyDelaySec,
        scoreboardDelaySec,
        setAutoAdvance,
        setGetReadyDelaySec,
        setScoreboardDelaySec,
      }}
    >
      {children}
    </GameSettingsContext.Provider>
  );
}
