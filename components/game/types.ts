import { SpotifySearchResult } from "@/lib/spotify";

export type SongSelection = SpotifySearchResult & { startTimeS: number };
