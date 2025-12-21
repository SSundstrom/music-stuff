let cachedAccessToken: string | null = null;
let tokenExpirationTime: number | null = null;

async function getSpotifyAccessToken(
  isOwner: boolean = false,
): Promise<string> {
  // For owner, use OAuth token from session
  if (isOwner) {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      throw new Error("Not authenticated with Spotify");
    }
    return session.accessToken as string;
  }

  // For server-side operations, use Client Credentials flow
  if (
    cachedAccessToken &&
    tokenExpirationTime &&
    Date.now() < tokenExpirationTime
  ) {
    return cachedAccessToken;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Missing Spotify API credentials");
  }

  const encoded = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${encoded}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    throw new Error(`Spotify auth failed: ${response.statusText}`);
  }

  const data = (await response.json()) as {
    access_token: string;
    expires_in: number;
  };
  cachedAccessToken = data.access_token;
  tokenExpirationTime = Date.now() + data.expires_in * 1000 - 60000; // Refresh 1 min before expiry

  return cachedAccessToken;
}

export interface SpotifySearchResult {
  id: string;
  name: string;
  artists: Array<{ name: string }>;
  images: Array<{ url: string }>;
  preview_url: string | null;
  duration_ms: number;
}

export async function searchSpotify(
  query: string,
): Promise<SpotifySearchResult[]> {
  const accessToken = await getSpotifyAccessToken();

  const response = await fetch(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=20`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Spotify search failed: ${response.statusText}`);
  }

  const data = (await response.json()) as {
    tracks: { items: Array<Record<string, unknown>> };
  };

  return data.tracks.items.map((track: Record<string, unknown>) => ({
    id: track.id as string,
    name: track.name as string,
    artists: (track.artists as Array<{ name: string }>).map((a) => ({
      name: a.name,
    })),
    images: (track.album as Record<string, unknown>).images as Array<{
      url: string;
    }>,
    preview_url: track.preview_url as string | null,
    duration_ms: track.duration_ms as number,
  }));
}

export async function getTrackDetails(spotifyId: string, accessToken: string) {
  const response = await fetch(
    `https://api.spotify.com/v1/tracks/${spotifyId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to get track details: ${response.statusText}`);
  }

  return response.json();
}

export async function startPlayback(
  deviceId: string,
  spotifyId: string,
  accessToken: string,
  positionMs: number = 0,
) {
  const response = await fetch(
    `https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        uris: [`spotify:track:${spotifyId}`],
        position_ms: positionMs,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to start playback: ${response.statusText}`);
  }
}

export async function pausePlayback(deviceId: string, accessToken: string) {
  const response = await fetch(
    `https://api.spotify.com/v1/me/player/pause?device_id=${deviceId}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to pause playback: ${response.statusText}`);
  }
}

export async function getCurrentPlayback(accessToken: string) {
  const response = await fetch(
    "https://api.spotify.com/v1/me/player/currently-playing",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to get current playback: ${response.statusText}`);
  }

  return response.json();
}

export async function getAvailableDevices(accessToken: string) {
  const response = await fetch("https://api.spotify.com/v1/me/player/devices", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get devices: ${response.statusText}`);
  }

  const data = (await response.json()) as {
    devices: Array<{ id: string; name: string }>;
  };
  return data.devices;
}
