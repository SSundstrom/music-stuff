// Barrel re-export file — all imports from "@/types/game" still work.
// Migrate imports to "@/types/shared", "@/types/tournament", or "@/types/guess"
// and then delete this file.

export * from "./shared";
export * from "./tournament";
export * from "./guess";

// Re-export the combined SSE types that useSSEStream and other shared code needs
import { z } from "zod";
import { PlayerJoinedSchema, PlayerLeftSchema } from "./shared";
import {
  CategoryAnnouncedSchema,
  SongSubmittedSchema,
  MatchStartedSchema,
  MatchEndedSchema,
  RoundCompleteSchema,
  GameWinnerSchema,
  PlaybackStartedSchema,
  PlaybackStoppedSchema,
} from "./tournament";
import {
  GuessGameStartedSchema,
  GuessPickerSelectedSchema,
  GuessSongPickedSchema,
  GuessCountdownSchema,
  GuessPhaseStartedSchema,
  GuessSubmittedSchema,
  GuessTurnEndedSchema,
  GuessGameEndedSchema,
  GuessGameRestartedSchema,
} from "./guess";

// The combined GameStateSchema that the server sends (has both tournament and guess fields)
import { SessionSchema, PlayerSchema } from "./shared";
import { TournamentSchema, SongSchema, TournamentMatchSchema } from "./tournament";
import { GuessStateSchema } from "./guess";

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

export type GameStateMessage = z.infer<typeof GameStateSchema>;

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
  GuessGameRestartedSchema,
]);

export type SSEMessage = z.infer<typeof SSEMessageSchema>;
