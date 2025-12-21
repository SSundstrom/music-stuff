# Spotify Web Playback SDK Integration

This guide explains how the Spotify Web Playback SDK is integrated into the Spotify Tournament application for local song playback.

## Overview

The Web Playback SDK allows direct playback of Spotify songs in the browser without relying on external Spotify apps. The implementation uses:

- **Spotify Web Playback SDK** - Client-side player with native browser integration
- **SpotifyPlayerProvider** - React Context for managing player state and controls
- **SpotifyPlayer** - UI component displaying now-playing information and controls
- **Playback API** - Server endpoint for validating playback requests

## Architecture

### 1. SDK Initialization (app/layout.tsx)

The Spotify Web Playback SDK script is loaded asynchronously in the root layout:

```tsx
<script src="https://sdk.scdn.co/spotify-player.js" async></script>
```

This makes the `window.Spotify.Player` class available globally.

### 2. Player Context (components/SpotifyPlayerProvider.tsx)

The `SpotifyPlayerProvider` manages the player lifecycle:

**Key responsibilities:**
- Initializes the Web Playback SDK with user's OAuth token
- Listens for player state changes (ready, playback, errors)
- Exposes playback controls (play, pause, resume, seek, volume)
- Manages device ID and playback state

**State tracked:**
- `deviceId` - The browser-based device ID assigned by Spotify
- `isReady` - Whether the player is ready to accept playback commands
- `currentTrack` - Currently playing track info (name, artist, image, duration)
- `position` - Current playback position in ms
- `isPaused` - Playback status

**Usage:**
```tsx
import { useSpotifyPlayer } from "@/components/SpotifyPlayerProvider";

const MyComponent = () => {
  const { state, play, pause, resume, seek, setVolume, error } = useSpotifyPlayer();

  // Use player controls...
};
```

### 3. Player UI (components/SpotifyPlayer.tsx)

Displays the currently playing track with playback controls:

- Album artwork
- Track name and artist
- Progress bar with seek capability
- Play/pause button
- Volume control
- Duration display

This component is automatically added to the game page and updates in real-time as tracks play.

### 4. Playback API (app/api/playback/route.ts)

Server endpoint that:
- Authenticates the request using the user's session
- Retrieves the user's Spotify access token
- Validates the Spotify ID and device ID
- Calls the Spotify Web API to start playback
- Returns the playback status

**Endpoint:** `POST /api/playback`

**Request body:**
```json
{
  "spotifyId": "spotify:track:123456...",
  "deviceId": "device_id_from_player"
}
```

### 5. Match Display Integration (components/game/MatchDisplay.tsx)

When the match owner clicks "Play" for a song:

1. The `handlePlaySong` function calls `play(spotifyId)`
2. The Web Playback SDK plays the track
3. Auto-pause timer stops playback after the round duration (30s for round 1, 15s for later rounds)
4. Other players hear the playback and vote on their preference

## Authentication Flow

1. User signs in with Spotify OAuth
2. The user's access token is stored in the session
3. `SpotifyPlayerProvider` uses this token to authorize the player via `getOAuthToken` callback
4. The Spotify API verifies the token for playback requests

## Player Lifecycle

```
1. User signs in → Session is created with Spotify token
2. SpotifyPlayerProvider mounts → Waits for window.Spotify to be available
3. Player initialized → Creates new Spotify.Player instance
4. SDK ready event → Stores device ID and marks player as ready
5. Game starts → Player UI becomes visible
6. Owner clicks "Play" → Calls play() with Spotify track ID
7. Playback starts → Other listeners hear the track
8. Auto-pause triggered → Song stops after round duration
```

## Important Notes

### Device Support

The Web Playback SDK only works in browsers that:
- Support the [Encrypted Media Extensions (EME)](https://developer.mozilla.org/en-US/docs/Web/API/Encrypted_Media_Extensions_API)
- Have proper SSL/TLS (HTTPS)
- Are on the Spotify developer app's registered domains/localhost

### Spotify Premium Requirement

Users must have a Spotify Premium account to use the Web Playback SDK for playback. Free accounts will not be able to play tracks.

### OAuth Scope

The Spotify OAuth flow must include the `streaming` scope:
```
streaming user-read-email user-read-private
```

This is configured in the authentication setup and allows:
- `streaming` - Play tracks in the browser
- `user-read-email` - Read user email
- `user-read-private` - Read user profile

### Error Handling

The player emits these error events:
- `authentication_error` - Token invalid or expired
- `playback_error` - Cannot play this track
- `account_error` - Account issues (e.g., not Premium)

These are caught and displayed to users via the UI.

## Testing Playback

To test the Web Playback SDK locally:

1. Ensure you're using HTTPS (development uses `--experimental-https`)
2. Sign in with your Spotify account (must be Premium)
3. Verify the device appears in your Spotify app
4. Start a game and click "Play" on a song
5. Audio should play in your browser tab
6. Check DevTools console for any playback errors

## Troubleshooting

### Player not initializing
- Check that the SDK script loaded: `window.Spotify` should be defined
- Verify you're signed in with a Spotify Premium account
- Check browser console for CORS or SSL errors

### Playback not starting
- Verify the Spotify ID is in correct format: `spotify:track:id`
- Check that your access token hasn't expired
- Ensure you have Spotify Premium
- Look for authentication_error or playback_error events in console

### Device ID not appearing
- Wait a few seconds for the player to initialize
- Refresh the page
- Check browser console for error messages
- Verify the session token is valid

## Related Files

- `types/spotify.d.ts` - TypeScript definitions for the SDK
- `lib/spotify.ts` - Spotify API utilities (startPlayback, pausePlayback, etc.)
- `hooks/useAuthSession.ts` - Hook for accessing current user session
- `app/api/playback/route.ts` - Playback validation endpoint

## References

- [Spotify Web Playback SDK](https://developer.spotify.com/documentation/web-playback-sdk)
- [Spotify Web API](https://developer.spotify.com/documentation/web-api)
- [Player Object Documentation](https://developer.spotify.com/documentation/web-playback-sdk/reference)
