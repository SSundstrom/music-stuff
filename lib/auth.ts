import { betterAuth } from "better-auth";

import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from "./db-prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "sqlite",
  }),
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
  const db = prisma.;
  // .prepare(
  //   `SELECT accessToken, accessTokenExpiresAt, refreshToken FROM account
  //    WHERE userId = ? AND providerId = 'spotify'`,
  // )
  // .get(userId) as
  // | {
  //     accessToken: string;
  //     accessTokenExpiresAt: string | number | null;
  //     refreshToken: string;
  //   }
  // | undefined;

  if (!account) {
    console.log(`[auth] No Spotify account found for user ${userId}`);
    return null;
  }

  // Convert ISO string to timestamp if needed
  const expiresAtMs =
    typeof account.accessTokenExpiresAt === "string"
      ? new Date(account.accessTokenExpiresAt).getTime()
      : (account.accessTokenExpiresAt ?? 0);

  const now = Date.now();
  const timeUntilExpiry = expiresAtMs - now;
  console.log(
    `[auth] Token status for user ${userId}: expires in ${Math.round(timeUntilExpiry / 1000)}s`,
  );

  // Check if token has expired
  if (expiresAtMs && now >= expiresAtMs) {
    console.log(
      `[auth] Token expired for user ${userId}, attempting refresh...`,
    );
    // Token has expired, try to refresh it
    if (!account.refreshToken) {
      console.log(`[auth] No refresh token available for user ${userId}`);
      return null;
    }

    try {
      const refreshedToken = await refreshSpotifyToken(
        userId,
        account.refreshToken,
      );
      console.log(
        `[auth] Successfully refreshed token for user ${userId}, new token length: ${refreshedToken.length}`,
      );
      return refreshedToken;
    } catch (error) {
      console.error(
        `[auth] Failed to refresh token for user ${userId}:`,
        error,
      );
      return null;
    }
  }

  console.log(`[auth] Token still valid for user ${userId}`);
  return account.accessToken ?? null;
}

// async function refreshSpotifyToken(
//   userId: string,
//   refreshToken: string,
// ): Promise<string> {
//   const clientId = process.env.SPOTIFY_CLIENT_ID as string;
//   const clientSecret = process.env.SPOTIFY_CLIENT_SECRET as string;
//
//   if (!clientId || !clientSecret) {
//     throw new Error("Missing Spotify API credentials");
//   }
//
//   console.log(`[auth] Refreshing Spotify token for user ${userId}...`);
//
//   const encoded = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
//
//   const response = await fetch("https://accounts.spotify.com/api/token", {
//     method: "POST",
//     headers: {
//       Authorization: `Basic ${encoded}`,
//       "Content-Type": "application/x-www-form-urlencoded",
//     },
//     body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}`,
//   });
//
//   if (!response.ok) {
//     console.error(
//       `[auth] Spotify token refresh failed: ${response.status} ${response.statusText}`,
//     );
//     throw new Error(`Failed to refresh Spotify token: ${response.statusText}`);
//   }
//
//   const data = (await response.json()) as {
//     access_token: string;
//     expires_in: number;
//     refresh_token?: string;
//   };
//
//   console.log(
//     `[auth] Spotify returned new token, expires in ${data.expires_in}s`,
//   );
//
//   // Update the access token and expiration time in the database
//   // Subtract 60 seconds to refresh 1 minute before actual expiry for safety
//   const expiresAtMs = Date.now() + data.expires_in * 1000 - 60000;
//   const expiresAtISO = new Date(expiresAtMs).toISOString();
//
//   // Update the access token and expiration time, and refresh token if Spotify provided a new one
//   if (data.refresh_token) {
//     console.log(`[auth] Spotify provided new refresh token, updating database`);
//     db.prepare(
//       `UPDATE account SET accessToken = ?, accessTokenExpiresAt = ?, refreshToken = ? WHERE userId = ? AND providerId = 'spotify'`,
//     ).run(data.access_token, expiresAtISO, data.refresh_token, userId);
//   } else {
//     console.log(
//       `[auth] No new refresh token from Spotify, keeping existing one`,
//     );
//     db.prepare(
//       `UPDATE account SET accessToken = ?, accessTokenExpiresAt = ? WHERE userId = ? AND providerId = 'spotify'`,
//     ).run(data.access_token, expiresAtISO, userId);
//   }
//
//   console.log(`[auth] Token updated in database for user ${userId}`);
//   return data.access_token;
// }
