import { z } from "zod";

// Session types
export const SessionSchema = z.object({
  id: z.string(),
  owner_id: z.string(),
  status: z.enum(["waiting", "category_selection", "song_submission", "tournament", "finished"]),
  current_category: z.string().nullable(),
  current_round: z.number().default(1),
  current_picker_index: z.number().default(0),
  created_at: z.number(),
});

export type Session = z.infer<typeof SessionSchema>;

// Player types
export const PlayerSchema = z.object({
  id: z.string(),
  session_id: z.string(),
  name: z.string(),
  spotify_device_id: z.string().nullable(),
  is_owner: z.boolean().or(z.number()).transform((val) => Boolean(val)),
  join_order: z.number(),
  created_at: z.number(),
});

export type Player = z.infer<typeof PlayerSchema>;

// Song types
export const SongSchema = z.object({
  id: z.string(),
  session_id: z.string(),
  round_number: z.number(),
  spotify_id: z.string(),
  player_id: z.string(),
  start_time: z.number(), // in seconds
  song_name: z.string(),
  artist_name: z.string(),
  image_url: z.string().nullable(),
  created_at: z.number(),
});

export type Song = z.infer<typeof SongSchema>;

// Tournament match types
export const TournamentMatchSchema = z.object({
  id: z.string(),
  session_id: z.string(),
  round_number: z.number(),
  match_number: z.number(),
  song_a_id: z.string().nullable(),
  song_b_id: z.string().nullable(),
  winner_id: z.string().nullable(),
  status: z.enum(["pending", "playing", "voting", "completed"]),
  votes_a: z.number().default(0),
  votes_b: z.number().default(0),
  currently_playing_song_id: z.string().nullable().default(null),
  created_at: z.number(),
});

export type TournamentMatch = z.infer<typeof TournamentMatchSchema>;

// Vote types
export const VoteSchema = z.object({
  id: z.string(),
  match_id: z.string(),
  player_id: z.string(),
  song_id: z.string(),
  created_at: z.number(),
});

export type Vote = z.infer<typeof VoteSchema>;

// SSE message types
export const SSEMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("player_joined"),
    data: PlayerSchema,
  }),
  z.object({
    type: z.literal("player_left"),
    data: z.object({ player_id: z.string() }),
  }),
  z.object({
    type: z.literal("category_announced"),
    data: z.object({ category: z.string() }),
  }),
  z.object({
    type: z.literal("song_submitted"),
    data: SongSchema,
  }),
  z.object({
    type: z.literal("match_started"),
    data: z.object({
      match_id: z.string(),
      song_a: SongSchema.nullable(),
      song_b: SongSchema.nullable(),
      duration_seconds: z.number(),
    }),
  }),
  z.object({
    type: z.literal("match_ended"),
    data: z.object({
      match_id: z.string(),
      winner_id: z.string(),
      votes_a: z.number(),
      votes_b: z.number(),
    }),
  }),
  z.object({
    type: z.literal("round_complete"),
    data: z.object({
      round_number: z.number(),
    }),
  }),
  z.object({
    type: z.literal("game_winner"),
    data: z.object({
      winning_song_id: z.string(),
    }),
  }),
  z.object({
    type: z.literal("game_state"),
    data: z.object({
      session: SessionSchema,
      players: z.array(PlayerSchema),
      songs: z.array(SongSchema),
      matches: z.array(TournamentMatchSchema),
    }),
  }),
  z.object({
    type: z.literal("playback_started"),
    data: z.object({
      match_id: z.string(),
      song_id: z.string(),
      song_name: z.string(),
      artist_name: z.string(),
    }),
  }),
  z.object({
    type: z.literal("playback_stopped"),
    data: z.object({
      match_id: z.string(),
    }),
  }),
]);

export type SSEMessage = z.infer<typeof SSEMessageSchema>;

// API request/response types
export const CreateSessionRequestSchema = z.object({
  owner_id: z.string(),
});

export type CreateSessionRequest = z.infer<typeof CreateSessionRequestSchema>;

export const JoinSessionRequestSchema = z.object({
  session_id: z.string(),
  player_name: z.string(),
});

export type JoinSessionRequest = z.infer<typeof JoinSessionRequestSchema>;

export const SubmitCategoryRequestSchema = z.object({
  category: z.string().min(1).max(100),
});

export type SubmitCategoryRequest = z.infer<typeof SubmitCategoryRequestSchema>;

export const SubmitSongRequestSchema = z.object({
  spotify_id: z.string(),
  song_name: z.string(),
  artist_name: z.string(),
  start_time: z.number().min(0),
  image_url: z.string().nullable().optional(),
});

export type SubmitSongRequest = z.infer<typeof SubmitSongRequestSchema>;

export const VoteRequestSchema = z.object({
  match_id: z.string(),
  song_id: z.string(),
});

export type VoteRequest = z.infer<typeof VoteRequestSchema>;
