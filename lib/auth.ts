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
      `SELECT accessToken FROM account
       WHERE userId = ? AND providerId = 'spotify'`,
    )
    .get(userId) as { accessToken: string } | undefined;

  return account?.accessToken ?? null;
}
