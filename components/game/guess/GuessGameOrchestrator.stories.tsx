import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import GuessGameOrchestrator from "./GuessGameOrchestrator";
import { MockProviders } from "../storyMocks";
import type { GuessConfig, GuessState, GuessTurn, Player } from "@/types/game";
import type { TurnResult } from "@/hooks/useGuessSession";

const players: Player[] = [
  {
    id: "p1",
    sessionId: "session1",
    name: "Alice",
    spotifyDeviceId: null,
    isOwner: true,
    joinOrder: 0,
    createdAt: new Date("2026-01-01T00:00:00Z"),
  },
  {
    id: "p2",
    sessionId: "session1",
    name: "Bob",
    spotifyDeviceId: null,
    isOwner: false,
    joinOrder: 1,
    createdAt: new Date("2026-01-01T00:01:00Z"),
  },
  {
    id: "p3",
    sessionId: "session1",
    name: "Charlie",
    spotifyDeviceId: null,
    isOwner: false,
    joinOrder: 2,
    createdAt: new Date("2026-01-01T00:02:00Z"),
  },
];

const config: GuessConfig = {
  id: "config1",
  sessionId: "session1",
  maxRounds: null,
  guessTimeSec: 30,
  pickOrder: ["p1", "p2", "p3"],
};

const scores = [
  { playerId: "p1", playerName: "Alice", totalPoints: 150, correctSongs: 5, correctArtists: 3 },
  { playerId: "p2", playerName: "Bob", totalPoints: 120, correctSongs: 4, correctArtists: 2 },
  { playerId: "p3", playerName: "Charlie", totalPoints: 80, correctSongs: 2, correctArtists: 4 },
];

// Charlie is the picker this turn (so p1/p2 are the guessers).
const baseTurn: GuessTurn = {
  id: "turn1",
  sessionId: "session1",
  roundNumber: 2,
  turnNumber: 6,
  pickerId: "p3",
  spotifyId: "spotify-track-id",
  songName: "Mr. Brightside",
  artistName: "The Killers",
  imageUrl: null,
  isrc: null,
  startTime: 0,
  status: "picking",
  guessingStartedAt: null,
  createdAt: new Date("2026-01-01T00:00:00Z"),
};

const turnResults: TurnResult[] = [
  {
    playerId: "p1",
    playerName: "Alice",
    songName: "Mr. Brightside",
    artistName: "The Killers",
    songCorrect: true,
    artistCorrect: true,
    points: 30,
  },
  {
    playerId: "p2",
    playerName: "Bob",
    songName: "Somebody Told Me",
    artistName: "The Killers",
    songCorrect: false,
    artistCorrect: true,
    points: 10,
  },
  // The picker (Charlie) is shown with an empty song/artist and an averaged score.
  {
    playerId: "p3",
    playerName: "Charlie",
    songName: "",
    artistName: "",
    songCorrect: false,
    artistCorrect: false,
    points: 20,
  },
];

function state(overrides: Partial<GuessState>): GuessState {
  return {
    config,
    currentTurn: baseTurn,
    scores,
    status: "playing",
    ...overrides,
  };
}

const meta: Meta<typeof GuessGameOrchestrator> = {
  title: "Game/Guess/GuessGameOrchestrator",
  component: GuessGameOrchestrator,
  parameters: {
    // The orchestrator calls useRouter from next/navigation; this mounts
    // @storybook/nextjs-vite's app-router mock so that hook resolves.
    nextjs: { appDirectory: true },
  },
  args: {
    sessionId: "session1",
    playerId: "p1",
    players,
    isOwner: true,
    turnResults,
    endsAt: null,
  },
  decorators: [
    (Story, { parameters }) => (
      <MockProviders initialAutoAdvance={parameters.autoAdvance ?? false}>
        <div className="mx-auto max-w-2xl p-4">
          <Story />
        </div>
      </MockProviders>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof GuessGameOrchestrator>;

// Picking — viewed as the current picker (Charlie): the song searcher.
export const PickingAsPicker: Story = {
  args: {
    playerId: "p3",
    isOwner: false,
    guessState: state({ currentTurn: { ...baseTurn, status: "picking" } }),
  },
};

// Picking — viewed as everyone else (a guesser or the host): the scoreboard
// stays up with the standings, the current picker highlighted, and a
// "who's picking" banner. The host's advance controls are hidden here.
export const PickingAsWaiter: Story = {
  args: {
    playerId: "p1",
    guessState: state({ currentTurn: { ...baseTurn, status: "picking" } }),
  },
};

// Countdown — the host sees the "Start Playback" button.
export const CountdownAsHost: Story = {
  args: {
    playerId: "p1",
    isOwner: true,
    guessState: state({ currentTurn: { ...baseTurn, status: "countdown" } }),
  },
};

// Countdown with auto-advance on — the host sees the pinned "Song starts in"
// countdown bar below the Start Playback button.
export const CountdownAutoAdvance: Story = {
  parameters: { autoAdvance: true },
  args: {
    playerId: "p1",
    isOwner: true,
    guessState: state({ currentTurn: { ...baseTurn, status: "countdown" } }),
  },
};

// Countdown — a guesser just sees "Get ready to guess!".
export const CountdownAsGuesser: Story = {
  args: {
    playerId: "p1",
    isOwner: false,
    guessState: state({ currentTurn: { ...baseTurn, status: "countdown" } }),
  },
};

// Guessing — a guesser racing the timer with the song searcher.
export const GuessingAsGuesser: Story = {
  args: {
    playerId: "p1",
    isOwner: false,
    endsAt: new Date(Date.now() + 30_000).toISOString(),
    guessState: state({
      currentTurn: {
        ...baseTurn,
        status: "guessing",
        guessingStartedAt: new Date(),
      },
    }),
  },
};

// Guessing — the picker just waits for everyone else to lock in a guess.
export const GuessingAsPicker: Story = {
  args: {
    playerId: "p3",
    isOwner: false,
    endsAt: new Date(Date.now() + 30_000).toISOString(),
    guessState: state({
      currentTurn: {
        ...baseTurn,
        status: "guessing",
        guessingStartedAt: new Date(),
      },
    }),
  },
};

// Scoreboard — results for the turn plus the "Next Turn" / "One more round"
// controls (host, unlimited rounds).
export const Scoreboard: Story = {
  args: {
    playerId: "p1",
    isOwner: true,
    guessState: state({ currentTurn: { ...baseTurn, status: "scoreboard" } }),
  },
};

// Scoreboard with auto-advance on — the pinned "Next song in" countdown bar
// shows below the standings as the turn wraps up automatically.
export const ScoreboardAutoAdvance: Story = {
  parameters: { autoAdvance: true },
  args: {
    playerId: "p1",
    isOwner: true,
    guessState: state({ currentTurn: { ...baseTurn, status: "scoreboard" } }),
  },
};

// The game has ended — the final standings with the play-again control.
export const Ended: Story = {
  args: {
    playerId: "p1",
    isOwner: true,
    guessState: state({ status: "ended", currentTurn: null }),
  },
};

// Edge case: state is "playing" but there's no active turn yet.
export const WaitingToStart: Story = {
  args: {
    guessState: state({ currentTurn: null }),
  },
};
