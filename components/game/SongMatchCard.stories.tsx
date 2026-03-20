import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import SongMatchCard from "./SongMatchCard";
import type { Song } from "@/types/game";

const song: Song = {
  id: "song-1",
  tournamentId: "tournament-1",
  spotifyId: "spotify-123",
  playerId: "player-1",
  startTime: 0,
  songName: "Bohemian Rhapsody",
  artistName: "Queen",
  imageUrl: null,
  createdAt: new Date(),
};

const meta: Meta<typeof SongMatchCard> = {
  title: "Game/SongMatchCard",
  component: SongMatchCard,
  args: {
    song,
    isPlaying: false,
    isCurrentlyPlaying: false,
    userVoted: false,
    isLoading: false,
    isOwner: true,
    duration: 30,
    onPlay: () => {},
    onVote: () => {},
    orderClass: "",
  },
};

export default meta;
type Story = StoryObj<typeof SongMatchCard>;

export const Default: Story = {};

export const CurrentlyPlaying: Story = {
  args: {
    isCurrentlyPlaying: true,
    isPlaying: true,
  },
};

export const Voted: Story = {
  args: {
    userVoted: true,
  },
};

export const NonOwner: Story = {
  args: {
    isOwner: false,
  },
};
