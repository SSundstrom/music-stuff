import { z } from "zod";

export const dateTimeSchema = z.iso
  .datetime()
  .transform((d) => new Date(d))
  .or(z.date());

export const GameTypeSchema = z.enum(["tournament", "guess_the_song"]);
export type GameType = z.infer<typeof GameTypeSchema>;

export const SessionSchema = z.object({
  id: z.string(),
  ownerId: z.string(),
  gameType: GameTypeSchema.default("tournament"),
  status: z.enum(["active", "archived"]),
  createdAt: dateTimeSchema,
});

export type Session = z.infer<typeof SessionSchema>;

export const PlayerSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  name: z.string(),
  spotifyDeviceId: z.string().nullable(),
  isOwner: z.coerce.boolean(),
  joinOrder: z.number(),
  createdAt: dateTimeSchema,
});

export type Player = z.infer<typeof PlayerSchema>;

// Shared SSE messages
export const PlayerJoinedSchema = z.object({
  type: z.literal("player_joined"),
  data: PlayerSchema,
});

export const PlayerLeftSchema = z.object({
  type: z.literal("player_left"),
  data: z.object({ playerId: z.string() }),
});

export type PlayerJoinedMessage = z.infer<typeof PlayerJoinedSchema>;
export type PlayerLeftMessage = z.infer<typeof PlayerLeftSchema>;

// Shared API request types
export const CreateSessionRequestSchema = z.object({
  ownerId: z.string(),
  gameType: GameTypeSchema.default("tournament"),
});

export type CreateSessionRequest = z.infer<typeof CreateSessionRequestSchema>;

export const NewRoundRequestSchema = z.object({
  sessionId: z.string(),
});

export type NewRoundRequest = z.infer<typeof NewRoundRequestSchema>;

export const JoinSessionRequestSchema = z.object({
  sessionId: z.string(),
  playerName: z.string(),
});

export type JoinSessionRequest = z.infer<typeof JoinSessionRequestSchema>;
