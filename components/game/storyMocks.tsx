"use client";

// Test/Storybook-only helpers. This file is intentionally not a `*.stories`
// file so Storybook won't load it as a story; the guess-the-song stories import
// `MockProviders` from here to wrap components that depend on the Spotify player
// and game settings contexts without the real Spotify Web SDK / network wiring.

import { useState, type ReactNode } from "react";
import {
  SpotifyPlayerContext,
  type SpotifyDevice,
} from "@/components/SpotifyPlayerProvider";
import { GameSettingsContext } from "@/components/GameSettingsProvider";

type SpotifyValue = NonNullable<React.ContextType<typeof SpotifyPlayerContext>>;
type SettingsValue = NonNullable<React.ContextType<typeof GameSettingsContext>>;

const noopAsync = async () => {};

// A few external devices to populate the settings modal's device list.
export const mockDevices: SpotifyDevice[] = [
  { id: "device-living-room", name: "Living Room", type: "speaker", isActive: false },
  { id: "device-phone", name: "iPhone", type: "smartphone", isActive: false },
  { id: "device-laptop", name: "MacBook Pro", type: "computer", isActive: false },
];

export interface MockProvidersProps {
  children: ReactNode;
  devices?: SpotifyDevice[];
  initialSelectedDevice?: SpotifyDevice | null;
  initialGuessingVolume?: number;
  initialBetweenVolume?: number;
  initialAutoAdvance?: boolean;
  initialGetReadyDelaySec?: number;
  initialScoreboardDelaySec?: number;
}

/**
 * Wraps children in stateful mock Spotify-player and game-settings contexts so
 * interactive controls (device selection, volume sliders, the auto-advance
 * toggle) behave in Storybook without touching the network or the Web SDK.
 */
export function MockProviders({
  children,
  devices = [],
  initialSelectedDevice = null,
  initialGuessingVolume = 80,
  initialBetweenVolume = 30,
  initialAutoAdvance = false,
  initialGetReadyDelaySec = 5,
  initialScoreboardDelaySec = 8,
}: MockProvidersProps) {
  const [selectedDevice, setSelectedDevice] = useState(initialSelectedDevice);
  const [guessingVolume, setGuessingVolume] = useState(initialGuessingVolume);
  const [betweenVolume, setBetweenVolume] = useState(initialBetweenVolume);
  const [autoAdvance, setAutoAdvance] = useState(initialAutoAdvance);
  const [getReadyDelaySec, setGetReadyDelaySec] = useState(initialGetReadyDelaySec);
  const [scoreboardDelaySec, setScoreboardDelaySec] = useState(
    initialScoreboardDelaySec,
  );

  const spotify: SpotifyValue = {
    state: {
      deviceId: "mock-web-sdk-device",
      isReady: true,
      isPaused: true,
      currentTrack: null,
      position: 0,
      duration: 0,
    },
    play: noopAsync,
    pause: noopAsync,
    resume: noopAsync,
    seek: noopAsync,
    setVolume: noopAsync,
    guessingVolume,
    betweenVolume,
    setGuessingVolume,
    setBetweenVolume,
    error: null,
    devices,
    selectedDevice,
    selectDevice: setSelectedDevice,
    refreshDevices: noopAsync,
  };

  const settings: SettingsValue = {
    autoAdvance,
    getReadyDelaySec,
    scoreboardDelaySec,
    setAutoAdvance,
    setGetReadyDelaySec,
    setScoreboardDelaySec,
  };

  return (
    <SpotifyPlayerContext.Provider value={spotify}>
      <GameSettingsContext.Provider value={settings}>
        {children}
      </GameSettingsContext.Provider>
    </SpotifyPlayerContext.Provider>
  );
}
