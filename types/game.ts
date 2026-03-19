import { z } from "zod";

const dateTimeSchema = z.iso
  .datetime()
  .transform((d) => new Date(d))
  .or(z.date());

export const GameTypeSchema = z.enum(["tournament", "guess_the_song"]);
export type GameType = z.infer<typeof GameTypeSchema>;

// Session types - container for multiple tournaments
export const SessionSchema = z.object({
  id: z.string(),
  ownerId: z.string(),
  gameType: GameTypeSchema.default("tournament"),
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
    "archived",
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

// Guess the Song types
export const GuessConfigSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  maxRounds: z.number().nullable(),
  guessTimeSec: z.number().default(30),
  hostPlays: z.boolean().default(false),
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
    guessState: GuessStateSchema.nullish(),
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

// Guess the Song SSE messages
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
  }),
});

export const GuessGameEndedSchema = z.object({
  type: z.literal("guess_game_ended"),
  data: z.object({
    scores: z.array(PlayerScoreSchema),
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
  GuessGameStartedSchema,
  GuessPickerSelectedSchema,
  GuessSongPickedSchema,
  GuessCountdownSchema,
  GuessPhaseStartedSchema,
  GuessSubmittedSchema,
  GuessTurnEndedSchema,
  GuessGameEndedSchema,
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
export type GuessGameStartedMessage = z.infer<typeof GuessGameStartedSchema>;
export type GuessPickerSelectedMessage = z.infer<typeof GuessPickerSelectedSchema>;
export type GuessSongPickedMessage = z.infer<typeof GuessSongPickedSchema>;
export type GuessCountdownMessage = z.infer<typeof GuessCountdownSchema>;
export type GuessPhaseStartedMessage = z.infer<typeof GuessPhaseStartedSchema>;
export type GuessSubmittedMessage = z.infer<typeof GuessSubmittedSchema>;
export type GuessTurnEndedMessage = z.infer<typeof GuessTurnEndedSchema>;
export type GuessGameEndedMessage = z.infer<typeof GuessGameEndedSchema>;

export type SSEMessage = z.infer<typeof SSEMessageSchema>;

// API request/response types
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

export const SubmitCategoryRequestSchema = z.object({
  category: z.string().min(1).max(100),
  tournamentId: z.string(),
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

// Guess the Song API request types
export const GuessConfigRequestSchema = z.object({
  guessTimeSec: z.number().min(10).max(120).optional(),
  maxRounds: z.number().min(1).max(20).nullable().optional(),
  hostPlays: z.boolean().optional(),
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
