import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import FinalScoreboard from "./FinalScoreboard";
import type { PlayerScore } from "@/types/game";

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

const meta: Meta<typeof FinalScoreboard> = {
  title: "Game/Guess/FinalScoreboard",
  component: FinalScoreboard,
  args: {
    scores,
    isOwner: true,
    onPlayAgain: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof FinalScoreboard>;

export const Default: Story = {};

export const AsPlayer: Story = {
  args: {
    isOwner: false,
  },
};
