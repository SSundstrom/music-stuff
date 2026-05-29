import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import GuessConfigPanel from "./GuessConfigPanel";
import type { GuessConfig } from "@/types/game";

const config: GuessConfig = {
  id: "config1",
  sessionId: "session1",
  maxRounds: 5,
  guessTimeSec: 45,
  pickOrder: ["p1", "p2", "p3"],
};

const meta: Meta<typeof GuessConfigPanel> = {
  title: "Game/Guess/GuessConfigPanel",
  component: GuessConfigPanel,
  args: {
    sessionId: "session1",
    config,
    onConfigUpdated: () => {},
  },
  decorators: [
    (Story) => (
      <div className="max-w-md p-4">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof GuessConfigPanel>;

// Editing an existing config: a 5-round game with a 45s guess window.
export const WithConfig: Story = {};

// No config yet — falls back to the defaults (30s guess time, unlimited rounds).
export const Defaults: Story = {
  args: {
    config: null,
  },
};
