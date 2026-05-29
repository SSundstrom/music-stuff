import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useRef, useState } from "react";
import { MdSettings } from "react-icons/md";
import SettingsModal from "./SettingsModal";
import { MockProviders, mockDevices } from "./storyMocks";
import type { Player } from "@/types/game";

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

// The modal is a dropdown anchored under a settings cog (it positions itself
// from the button's bounding rect and portals to the body). This harness mounts
// that cog so the story renders the modal where it really appears.
function SettingsModalHarness(
  props: Omit<
    React.ComponentProps<typeof SettingsModal>,
    "isOpen" | "onClose" | "buttonRef"
  > & { startOpen?: boolean },
) {
  const { startOpen = true, ...modalProps } = props;
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(startOpen);

  return (
    <div className="min-h-[600px] bg-gray-100">
      <div className="flex justify-end p-4">
        <button
          ref={buttonRef}
          onClick={() => setIsOpen((open) => !open)}
          className="rounded-full bg-white p-2 text-gray-700 shadow hover:bg-gray-50"
          aria-label="Open settings"
        >
          <MdSettings className="h-6 w-6" />
        </button>
      </div>
      <SettingsModal
        {...modalProps}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        buttonRef={buttonRef}
      />
    </div>
  );
}

const meta: Meta<typeof SettingsModalHarness> = {
  title: "Game/SettingsModal",
  component: SettingsModalHarness,
  parameters: {
    layout: "fullscreen",
  },
  args: {
    players,
    isOwner: true,
    sessionId: "session1",
    currentPlayerId: "p1",
  },
};

export default meta;
type Story = StoryObj<typeof SettingsModalHarness>;

// Host view: player list with kick controls, a populated device list, volume
// sliders, and the auto-advance toggle.
export const Owner: Story = {
  decorators: [
    (Story) => (
      <MockProviders devices={mockDevices}>
        <Story />
      </MockProviders>
    ),
  ],
};

// Non-host: same panel but without the per-player "Kick" actions.
export const AsPlayer: Story = {
  args: {
    isOwner: false,
    currentPlayerId: "p2",
  },
  decorators: [
    (Story) => (
      <MockProviders devices={mockDevices}>
        <Story />
      </MockProviders>
    ),
  ],
};

// Auto-advance already enabled — reveals the get-ready and scoreboard delay
// sliders that are hidden when the toggle is off.
export const AutoAdvanceOn: Story = {
  decorators: [
    (Story) => (
      <MockProviders
        devices={mockDevices}
        initialAutoAdvance
        initialGetReadyDelaySec={5}
        initialScoreboardDelaySec={8}
      >
        <Story />
      </MockProviders>
    ),
  ],
};

// No external Spotify devices discovered — only "This Browser" is offered.
export const NoDevices: Story = {
  decorators: [
    (Story) => (
      <MockProviders devices={[]}>
        <Story />
      </MockProviders>
    ),
  ],
};
