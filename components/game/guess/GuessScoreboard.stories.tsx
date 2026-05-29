import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import GuessScoreboard from "./GuessScoreboard";
import type { GuessTurn, PlayerScore } from "@/types/game";

const scores: PlayerScore[] = [
  {
    playerId: "p1",
    playerName: "Alice",
    totalPoints: 150,
    correctSongs: 5,
    correctArtists: 3,
  },
  {
    playerId: "p2",
    playerName: "Bob",
    totalPoints: 120,
    correctSongs: 4,
    correctArtists: 2,
  },
  {
    playerId: "p3",
    playerName: "Charlie",
    totalPoints: 80,
    correctSongs: 2,
    correctArtists: 4,
  },
];

const turnResults = [
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
  // The picker is shown with an empty song/artist and their averaged score.
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

const currentTurn: GuessTurn = {
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
  status: "scoreboard",
  guessingStartedAt: new Date("2026-01-01T00:00:00Z"),
  createdAt: new Date("2026-01-01T00:00:00Z"),
};

const meta: Meta<typeof GuessScoreboard> = {
  title: "Game/Guess/GuessScoreboard",
  component: GuessScoreboard,
  args: {
    sessionId: "session1",
    currentTurn,
    scores,
    turnResults,
    isOwner: true,
    maxRounds: null,
    autoAdvanceSec: null,
    onNextTurn: () => {},
    onOneMoreRound: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof GuessScoreboard>;

// Host, game running with no round limit yet: the "One more round" button is
// offered alongside "Next Turn" so the host can wrap up after the next round.
export const OneMoreRoundAvailable: Story = {};

// Host has already triggered "One more round" (or set a round limit) and the
// current round is the last one — the button is replaced with a status line.
export const FinalRoundScheduled: Story = {
  args: {
    maxRounds: 2,
  },
};

// Auto-advance on: a countdown cue under the buttons shows when the next song
// will start automatically.
export const AutoAdvancing: Story = {
  args: {
    autoAdvanceSec: 8,
  },
};

// Non-host players see the scoreboard without any controls.
export const AsPlayer: Story = {
  args: {
    isOwner: false,
  },
};

// Picking phase: the next picker is choosing a song, so the group waits here
// with a "who's picking" banner, the picker highlighted in the standings, and
// no song reveal, turn results, or host controls.
export const Picking: Story = {
  args: {
    currentTurn: { ...currentTurn, status: "picking" },
    turnResults: [],
    picker: { id: "p3", name: "Charlie" },
  },
};
