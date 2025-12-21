declare namespace Spotify {
  interface Image {
    height: number | null;
    url: string;
    width: number | null;
  }

  interface Artist {
    name: string;
    uri: string;
    external_urls: { spotify: string };
  }

  interface Album {
    images: Image[];
    name: string;
    uri: string;
    external_urls: { spotify: string };
  }

  interface Track {
    id: string;
    uri: string;
    name: string;
    album: Album;
    artists: Artist[];
    duration_ms: number;
    explicit: boolean;
    external_urls: { spotify: string };
    href: string;
    is_local: boolean;
    is_playable: boolean;
    linked_from?: Track;
    popularity: number;
    preview_url: string | null;
    type: "track";
  }

  interface PlaybackState {
    paused: boolean;
    position: number;
    duration: number;
    track_window: {
      current_track: Track;
      next_tracks: Track[];
      previous_tracks: Track[];
    };
    timestamp: number;
  }

  type PlaybackError = {
    message: string;
  };

  type DeviceId = {
    device_id: string;
  };

  type AuthenticationError = {
    message: string;
  };

  type PlayerState = PlaybackState | null;

  interface PlayerEvents {
    ready: (data: DeviceId) => void;
    not_ready: (data: DeviceId) => void;
    player_state_changed: (state: PlayerState) => void;
    authentication_error: (error: AuthenticationError) => void;
    playback_error: (error: PlaybackError) => void;
    account_error: (error: AuthenticationError) => void;
    autoplay_failed: () => void;
  }

  interface PlayerOptions {
    name: string;
    getOAuthToken: (callback: (token: string) => void) => void;
    volume?: number;
  }

  class Player {
    constructor(options: PlayerOptions);
    addListener<K extends keyof PlayerEvents>(
      event: K,
      callback: PlayerEvents[K],
    ): void;
    removeListener<K extends keyof PlayerEvents>(
      event: K,
      callback?: PlayerEvents[K],
    ): void;
    connect(): Promise<boolean>;
    disconnect(): void;
    getCurrentState(): Promise<PlayerState>;
    setName(name: string): Promise<void>;
    getVolume(): Promise<number>;
    setVolume(volume: number): Promise<void>;
    pause(): Promise<void>;
    resume(): Promise<void>;
    togglePlay(): Promise<void>;
    seek(positionMs: number): Promise<void>;
    previousTrack(): Promise<void>;
    nextTrack(): Promise<void>;
  }
}

interface Window {
  Spotify?: {
    Player: typeof Spotify.Player;
  };
  onSpotifyWebPlaybackSDKReady?: () => void;
}
