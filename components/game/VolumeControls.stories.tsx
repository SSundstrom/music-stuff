import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import VolumeControls from "./VolumeControls";

const meta: Meta<typeof VolumeControls> = {
  title: "Game/VolumeControls",
  component: VolumeControls,
  // Frame it like the settings dropdown the controls live in.
  decorators: [
    (Story) => (
      <div className="w-96 rounded-lg bg-white p-4 shadow-xl">
        <Story />
      </div>
    ),
  ],
  args: {
    guessingVolume: 80,
    betweenVolume: 30,
  },
  // Wire the sliders to local state so the preview is interactive.
  render: (args) => {
    const [guessingVolume, setGuessingVolume] = useState(args.guessingVolume);
    const [betweenVolume, setBetweenVolume] = useState(args.betweenVolume);
    return (
      <VolumeControls
        guessingVolume={guessingVolume}
        betweenVolume={betweenVolume}
        onGuessingVolumeChange={setGuessingVolume}
        onBetweenVolumeChange={setBetweenVolume}
      />
    );
  },
};

export default meta;
type Story = StoryObj<typeof VolumeControls>;

export const Default: Story = {};

export const LoudGuessingQuietBetween: Story = {
  args: {
    guessingVolume: 100,
    betweenVolume: 15,
  },
};

export const Muted: Story = {
  args: {
    guessingVolume: 0,
    betweenVolume: 0,
  },
};
