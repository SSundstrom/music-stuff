import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { SpotifySearchResult } from "@/lib/spotify";
import SongSearcher from "./SongSearcher";

const mockResults: SpotifySearchResult[] = [
  {
    id: "track-1",
    name: "Bohemian Rhapsody",
    artists: [{ name: "Queen" }],
    images: [{ url: "https://via.placeholder.com/64" }],
    preview_url: null,
    duration_ms: 354000,
  },
  {
    id: "track-2",
    name: "Don't Stop Me Now",
    artists: [{ name: "Queen" }],
    images: [{ url: "https://via.placeholder.com/64" }],
    preview_url: "https://example.com/preview.mp3",
    duration_ms: 210000,
  },
  {
    id: "track-3",
    name: "Somebody to Love",
    artists: [{ name: "Queen" }],
    images: [{ url: "https://via.placeholder.com/64" }],
    preview_url: null,
    duration_ms: 297000,
  },
];

function mockFetch(results: SpotifySearchResult[] = mockResults) {
  return async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input.toString();
    if (url.includes("/api/spotify/search")) {
      return new Response(JSON.stringify(results), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response("Not found", { status: 404 });
  };
}

const meta: Meta<typeof SongSearcher> = {
  title: "Game/SongSearcher",
  component: SongSearcher,
  args: {
    onSongSelected: () => {},
    disabled: false,
    showStartTime: true,
  },
  decorators: [
    (Story) => (
      <div className="max-w-lg mx-auto p-4">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof SongSearcher>;

/** Default empty state — type to search. */
export const Empty: Story = {};

/** Shows search results with start time selectors. */
export const WithResults: Story = {
  beforeEach: () => {
    const originalFetch = window.fetch;
    window.fetch = mockFetch() as typeof window.fetch;
    return () => {
      window.fetch = originalFetch;
    };
  },
  play: async ({ canvasElement }) => {
    const input = canvasElement.querySelector("input")!;
    // Simulate typing to trigger the search
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value",
    )!.set!;
    nativeInputValueSetter.call(input, "queen");
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  },
};

/** Without start time selector (guess mode). */
export const WithoutStartTime: Story = {
  args: {
    showStartTime: false,
  },
  beforeEach: () => {
    const originalFetch = window.fetch;
    window.fetch = mockFetch() as typeof window.fetch;
    return () => {
      window.fetch = originalFetch;
    };
  },
  play: async ({ canvasElement }) => {
    const input = canvasElement.querySelector("input")!;
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value",
    )!.set!;
    nativeInputValueSetter.call(input, "queen");
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  },
};

/** Disabled state. */
export const Disabled: Story = {
  args: {
    disabled: true,
  },
};

/** No results found. */
export const NoResults: Story = {
  beforeEach: () => {
    const originalFetch = window.fetch;
    window.fetch = mockFetch([]) as typeof window.fetch;
    return () => {
      window.fetch = originalFetch;
    };
  },
  play: async ({ canvasElement }) => {
    const input = canvasElement.querySelector("input")!;
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value",
    )!.set!;
    nativeInputValueSetter.call(input, "xyznonexistent");
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  },
};
