import { betterAuth } from "better-auth";
import Database from "better-sqlite3";

const db = new Database("data/better-auth.db");

export const auth = betterAuth({
  database: db,
  secret: process.env.BETTER_AUTH_SECRET as string,
  baseURL: process.env.BETTER_AUTH_URL as string,
  socialProviders: {
    spotify: {
      clientId: process.env.SPOTIFY_CLIENT_ID as string,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET as string,
      scope: [
        "streaming",
        "user-read-email",
        "user-read-private",
        "user-read-playback-state",
        "user-modify-playback-state",
        "user-read-currently-playing",
      ],
    },
  },
});

export async function getSpotifyAccessToken(
  userId: string,
): Promise<string | null> {
  const account = db
    .prepare(
      `SELECT accessToken, accessTokenExpiresAt, refreshToken FROM account
       WHERE userId = ? AND providerId = 'spotify'`,
    )
    .get(userId) as {
    accessToken: string;
    accessTokenExpiresAt: number;
    refreshToken: string;
  } | undefined;

  if (!account) {
    return null;
  }

  // Check if token has expired
  if (account.accessTokenExpiresAt && Date.now() >= account.accessTokenExpiresAt) {
    // Token has expired, try to refresh it
    if (!account.refreshToken) {
      return null;
    }

    try {
      const refreshedToken = await refreshSpotifyToken(
        userId,
        account.refreshToken,
      );
      return refreshedToken;
    } catch {
      return null;
    }
  }

  return account.accessToken ?? null;
}

async function refreshSpotifyToken(
  userId: string,
  refreshToken: string,
): Promise<string> {
  const clientId = process.env.SPOTIFY_CLIENT_ID as string;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET as string;

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
    body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}`,
  });

  if (!response.ok) {
    throw new Error(`Failed to refresh Spotify token: ${response.statusText}`);
  }

  const data = (await response.json()) as {
    access_token: string;
    expires_in: number;
    refresh_token?: string;
  };

  // Update the access token and expiration time in the database
  const expiresAt = Date.now() + data.expires_in * 1000;

  db.prepare(
    `UPDATE account SET accessToken = ?, accessTokenExpiresAt = ? WHERE userId = ? AND providerId = 'spotify'`,
  ).run(data.access_token, expiresAt, userId);

  return data.access_token;
}
