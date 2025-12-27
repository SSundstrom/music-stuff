import { z } from "zod";

const dateTimeSchema = z.iso
  .datetime()
  .transform((d) => new Date(d))
  .or(z.date());

// Session types - container for multiple tournaments
export const SessionSchema = z.object({
  id: z.string(),
  ownerId: z.string(),
  status: z.enum(["active", "archived"]),
  createdAt: dateTimeSchema,
});

export type Session = z.infer<typeof SessionSchema>;

// Tournament types - individual category tournaments within a session
export const TournamentSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  category: z.string(),
  status: z.enum([
    "waiting",
    "category_selection",
    "song_submission",
    "tournament",
    "finished",
  ]),
  currentRound: z.number().default(0),
  currentPickerIndex: z.number().default(0),
  winningSongId: z.string().nullable().default(null),
  createdAt: dateTimeSchema,
});

export type Tournament = z.infer<typeof TournamentSchema>;

// Player types
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

// Song types
export const SongSchema = z.object({
  id: z.string(),
  tournamentId: z.string(),
  spotifyId: z.string(),
  playerId: z.string(),
  startTime: z.number(), // in seconds
  songName: z.string(),
  artistName: z.string(),
  imageUrl: z.string().nullable(),
  createdAt: dateTimeSchema,
});

export type Song = z.infer<typeof SongSchema>;

// Tournament match types
export const TournamentMatchSchema = z.object({
  id: z.string(),
  tournamentId: z.string(),
  songAId: z.string().nullable(),
  songBId: z.string().nullable(),
  winnerId: z.string().nullable(),
  status: z.enum(["pending", "playing", "voting", "completed"]),
  votesA: z.number().default(0),
  votesB: z.number().default(0),
  currentlyPlayingSongId: z.string().nullable().default(null),
  createdAt: dateTimeSchema,
});

export type TournamentMatch = z.infer<typeof TournamentMatchSchema>;

// Vote types
export const VoteSchema = z.object({
  id: z.string(),
  matchId: z.string(),
  playerId: z.string(),
  songId: z.string(),
  createdAt: dateTimeSchema,
});

export type Vote = z.infer<typeof VoteSchema>;

// SSE message schemas - individual types
export const PlayerJoinedSchema = z.object({
  type: z.literal("player_joined"),
  data: PlayerSchema,
});

export const PlayerLeftSchema = z.object({
  type: z.literal("player_left"),
  data: z.object({ playerId: z.string() }),
});

export const CategoryAnnouncedSchema = z.object({
  type: z.literal("category_announced"),
  data: z.object({ category: z.string() }),
});

export const SongSubmittedSchema = z.object({
  type: z.literal("song_submitted"),
  data: SongSchema,
});

export const MatchStartedSchema = z.object({
  type: z.literal("match_started"),
  data: z.object({
    matchId: z.string(),
    songA: SongSchema.nullable(),
    songB: SongSchema.nullable(),
    durationSeconds: z.number(),
  }),
});

export const MatchEndedSchema = z.object({
  type: z.literal("match_ended"),
  data: z.object({
    matchId: z.string(),
    winnerId: z.string(),
    votesA: z.number(),
    votesB: z.number(),
  }),
});

export const RoundCompleteSchema = z.object({
  type: z.literal("round_complete"),
  data: z.object({
    roundNumber: z.number(),
  }),
});

export const GameWinnerSchema = z.object({
  type: z.literal("game_winner"),
  data: z.object({
    winningSongId: z.string(),
  }),
});

export const GameStateSchema = z.object({
  type: z.literal("game_state"),
  data: z.object({
    session: SessionSchema,
    tournament: TournamentSchema.nullish(),
    players: z.array(PlayerSchema),
    songs: z.array(SongSchema),
    matches: z.array(TournamentMatchSchema),
  }),
});

export const PlaybackStartedSchema = z.object({
  type: z.literal("playback_started"),
  data: z.object({
    matchId: z.string(),
    songId: z.string(),
    songName: z.string(),
    artistName: z.string(),
  }),
});

export const PlaybackStoppedSchema = z.object({
  type: z.literal("playback_stopped"),
  data: z.object({
    matchId: z.string(),
  }),
});

// Combined SSE message schema
export const SSEMessageSchema = z.discriminatedUnion("type", [
  PlayerJoinedSchema,
  PlayerLeftSchema,
  CategoryAnnouncedSchema,
  SongSubmittedSchema,
  MatchStartedSchema,
  MatchEndedSchema,
  RoundCompleteSchema,
  GameWinnerSchema,
  GameStateSchema,
  PlaybackStartedSchema,
  PlaybackStoppedSchema,
]);

// SSE message types
export type PlayerJoinedMessage = z.infer<typeof PlayerJoinedSchema>;
export type PlayerLeftMessage = z.infer<typeof PlayerLeftSchema>;
export type CategoryAnnouncedMessage = z.infer<typeof CategoryAnnouncedSchema>;
export type SongSubmittedMessage = z.infer<typeof SongSubmittedSchema>;
export type MatchStartedMessage = z.infer<typeof MatchStartedSchema>;
export type MatchEndedMessage = z.infer<typeof MatchEndedSchema>;
export type RoundCompleteMessage = z.infer<typeof RoundCompleteSchema>;
export type GameWinnerMessage = z.infer<typeof GameWinnerSchema>;
export type GameStateMessage = z.infer<typeof GameStateSchema>;
export type PlaybackStartedMessage = z.infer<typeof PlaybackStartedSchema>;
export type PlaybackStoppedMessage = z.infer<typeof PlaybackStoppedSchema>;

export type SSEMessage = z.infer<typeof SSEMessageSchema>;

// API request/response types
export const CreateSessionRequestSchema = z.object({
  ownerId: z.string(),
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

export const SubmitCategoryRequestSchema = z.object({
  category: z.string().min(1).max(100),
});

export type SubmitCategoryRequest = z.infer<typeof SubmitCategoryRequestSchema>;

export const SubmitSongRequestSchema = z.object({
  spotifyId: z.string(),
  songName: z.string(),
  artistName: z.string(),
  startTime: z.number().min(0),
  imageUrl: z.string().nullable().optional(),
});

export type SubmitSongRequest = z.infer<typeof SubmitSongRequestSchema>;

export const VoteRequestSchema = z.object({
  matchId: z.string(),
  songId: z.string(),
});

export type VoteRequest = z.infer<typeof VoteRequestSchema>;
