import { z } from "zod";
import {
  dateTimeSchema,
  SessionSchema,
  PlayerSchema,
} from "./shared";

export const GuessConfigSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  maxRounds: z.number().nullable(),
  guessTimeSec: z.number().default(30),
  guessingVolume: z.number().default(80),
  betweenVolume: z.number().default(30),
  pickOrder: z.array(z.string()).default([]),
});

export type GuessConfig = z.infer<typeof GuessConfigSchema>;

export const GuessTurnStatusSchema = z.enum([
  "picking",
  "countdown",
  "guessing",
  "scoreboard",
]);

export const GuessTurnSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  roundNumber: z.number(),
  turnNumber: z.number(),
  pickerId: z.string(),
  spotifyId: z.string().nullable(),
  songName: z.string().nullable(),
  artistName: z.string().nullable(),
  imageUrl: z.string().nullable(),
  isrc: z.string().nullable().optional(),
  startTime: z.number().default(0),
  status: GuessTurnStatusSchema.default("picking"),
  guessingStartedAt: dateTimeSchema.nullable(),
  createdAt: dateTimeSchema,
});

export type GuessTurn = z.infer<typeof GuessTurnSchema>;

export const GuessSchema = z.object({
  id: z.string(),
  guessTurnId: z.string(),
  playerId: z.string(),
  spotifyId: z.string(),
  songName: z.string(),
  artistName: z.string(),
  guessedAt: dateTimeSchema,
  songCorrect: z.boolean().default(false),
  artistCorrect: z.boolean().default(false),
  points: z.number().default(0),
  createdAt: dateTimeSchema,
});

export type Guess = z.infer<typeof GuessSchema>;

export const PlayerScoreSchema = z.object({
  playerId: z.string(),
  playerName: z.string(),
  totalPoints: z.number(),
  correctSongs: z.number(),
  correctArtists: z.number(),
});

export type PlayerScore = z.infer<typeof PlayerScoreSchema>;

export const GuessStateSchema = z.object({
  config: GuessConfigSchema.nullish(),
  currentTurn: GuessTurnSchema.nullish(),
  scores: z.array(PlayerScoreSchema),
  status: z.enum(["lobby", "playing", "ended"]),
});

export type GuessState = z.infer<typeof GuessStateSchema>;

// Guess SSE messages
export const GuessGameStartedSchema = z.object({
  type: z.literal("guess_game_started"),
  data: z.object({
    pickerId: z.string(),
    playerName: z.string(),
    roundNumber: z.number(),
    turnNumber: z.number(),
  }),
});

export const GuessPickerSelectedSchema = z.object({
  type: z.literal("guess_picker_selected"),
  data: z.object({
    pickerId: z.string(),
    playerName: z.string(),
    roundNumber: z.number(),
    turnNumber: z.number(),
  }),
});

export const GuessSongPickedSchema = z.object({
  type: z.literal("guess_song_picked"),
  data: z.object({
    guessTurnId: z.string(),
  }),
});

export const GuessCountdownSchema = z.object({
  type: z.literal("guess_countdown"),
  data: z.object({
    guessTurnId: z.string(),
  }),
});

export const GuessPhaseStartedSchema = z.object({
  type: z.literal("guess_phase_started"),
  data: z.object({
    guessTurnId: z.string(),
    endsAt: z.string(),
  }),
});

export const GuessSubmittedSchema = z.object({
  type: z.literal("guess_submitted"),
  data: z.object({
    playerId: z.string(),
    playerName: z.string(),
  }),
});

export const GuessTurnEndedSchema = z.object({
  type: z.literal("guess_turn_ended"),
  data: z.object({
    song: z.object({
      spotifyId: z.string(),
      songName: z.string(),
      artistName: z.string(),
      imageUrl: z.string().nullable(),
    }),
    results: z.array(
      z.object({
        playerId: z.string(),
        playerName: z.string(),
        songName: z.string(),
        artistName: z.string(),
        songCorrect: z.boolean(),
        artistCorrect: z.boolean(),
        points: z.number(),
      }),
    ),
    scores: z.array(PlayerScoreSchema),
  }),
});

export const GuessGameEndedSchema = z.object({
  type: z.literal("guess_game_ended"),
  data: z.object({
    scores: z.array(PlayerScoreSchema),
  }),
});

export const GuessGameRestartedSchema = z.object({
  type: z.literal("guess_game_restarted"),
  data: z.object({}),
});

export const GuessGameStateSchema = z.object({
  type: z.literal("game_state"),
  data: z.object({
    session: SessionSchema,
    players: z.array(PlayerSchema),
    guessState: GuessStateSchema.nullish(),
  }),
});

export type GuessGameStartedMessage = z.infer<typeof GuessGameStartedSchema>;
export type GuessPickerSelectedMessage = z.infer<typeof GuessPickerSelectedSchema>;
export type GuessSongPickedMessage = z.infer<typeof GuessSongPickedSchema>;
export type GuessCountdownMessage = z.infer<typeof GuessCountdownSchema>;
export type GuessPhaseStartedMessage = z.infer<typeof GuessPhaseStartedSchema>;
export type GuessSubmittedMessage = z.infer<typeof GuessSubmittedSchema>;
export type GuessTurnEndedMessage = z.infer<typeof GuessTurnEndedSchema>;
export type GuessGameEndedMessage = z.infer<typeof GuessGameEndedSchema>;
export type GuessGameRestartedMessage = z.infer<typeof GuessGameRestartedSchema>;
export type GuessGameStateMessage = z.infer<typeof GuessGameStateSchema>;

// Guess SSE union
export const GuessSSEMessageSchema = z.discriminatedUnion("type", [
  GuessGameStateSchema,
  GuessGameStartedSchema,
  GuessPickerSelectedSchema,
  GuessSongPickedSchema,
  GuessCountdownSchema,
  GuessPhaseStartedSchema,
  GuessSubmittedSchema,
  GuessTurnEndedSchema,
  GuessGameEndedSchema,
  GuessGameRestartedSchema,
]);

export type GuessSSEMessage = z.infer<typeof GuessSSEMessageSchema>;

// Guess API request types
export const GuessConfigRequestSchema = z.object({
  guessTimeSec: z.number().min(10).max(120).optional(),
  maxRounds: z.number().min(1).max(20).nullable().optional(),
  guessingVolume: z.number().min(0).max(100).optional(),
  betweenVolume: z.number().min(0).max(100).optional(),
});

export type GuessConfigRequest = z.infer<typeof GuessConfigRequestSchema>;

export const PickSongRequestSchema = z.object({
  spotifyId: z.string(),
  songName: z.string(),
  artistName: z.string(),
  startTime: z.number().min(0),
  imageUrl: z.string().nullable().optional(),
});

export type PickSongRequest = z.infer<typeof PickSongRequestSchema>;

export const SubmitGuessRequestSchema = z.object({
  spotifyId: z.string(),
  songName: z.string(),
  artistName: z.string(),
});

export type SubmitGuessRequest = z.infer<typeof SubmitGuessRequestSchema>;
