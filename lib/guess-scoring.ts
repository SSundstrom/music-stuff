const POINTS_EXACT_MATCH = 100;
const POINTS_PARTIAL_MATCH = 50;
const SPEED_BONUS_MAX = 50;

interface ScoreInput {
  guessSpotifyId: string;
  guessSongName: string;
  guessArtistName: string;
  guessIsrc: string | null;
  correctSpotifyId: string;
  correctSongName: string;
  correctArtistName: string;
  correctIsrc: string | null;
  guessTimestamp: Date;
  phaseStartTimestamp: Date;
  guessTimeSec: number;
}

interface ScoreResult {
  songCorrect: boolean;
  artistCorrect: boolean;
  points: number;
}

function normalizeForComparison(str: string): string {
  return str.toLowerCase().trim();
}

/**
 * Strips Spotify track variant suffixes to get the core song title.
 * Spotify appends suffixes like "- Remastered 2011" or "(Deluxe Edition)"
 * to distinguish between versions of the same song.
 *
 * Examples:
 *   "Bohemian Rhapsody - Remastered 2011" → "bohemian rhapsody"
 *   "Iris (Remastered Version)" → "iris"
 */
function stripRemasterSuffix(name: string): string {
  return name
    .replace(/\s*[-–—]\s*remaster(ed)?.*$/i, "")
    .replace(/\s*\(remaster(ed)?.*\)$/i, "")
    .trim();
}

function stripEditionSuffix(name: string): string {
  return name
    .replace(/\s*[-–—]\s*(deluxe|anniversary|bonus track|edition|version).*$/i, "")
    .replace(/\s*\((deluxe|anniversary|bonus track|edition|version).*\)$/i, "")
    .trim();
}

function stripAudioVariantSuffix(name: string): string {
  return name
    .replace(/\s*[-–—]\s*(mono|stereo).*$/i, "")
    .replace(/\s*\((mono|stereo).*\)$/i, "")
    .trim();
}

function stripTrackVariantSuffixes(name: string): string {
  return stripAudioVariantSuffix(
    stripEditionSuffix(stripRemasterSuffix(name)),
  ).toLowerCase();
}

function isSameSong(input: ScoreInput): boolean {
  const exactMatch = input.guessSpotifyId === input.correctSpotifyId;
  if (exactMatch) return true;

  const isrcMatch =
    input.guessIsrc !== null &&
    input.correctIsrc !== null &&
    input.guessIsrc === input.correctIsrc;
  if (isrcMatch) return true;

  const sameSongName =
    stripTrackVariantSuffixes(input.guessSongName) ===
    stripTrackVariantSuffixes(input.correctSongName);
  if (sameSongName) return true;

  return false;
}

function calculateSpeedBonus(input: ScoreInput): number {
  const elapsedMs =
    input.guessTimestamp.getTime() - input.phaseStartTimestamp.getTime();
  const elapsedSec = elapsedMs / 1000;
  const remaining = Math.max(0, input.guessTimeSec - elapsedSec);
  return Math.round((remaining / input.guessTimeSec) * SPEED_BONUS_MAX);
}

export function calculateScore(input: ScoreInput): ScoreResult {
  const songCorrect = isSameSong(input);
  const artistCorrect =
    normalizeForComparison(input.guessArtistName) ===
    normalizeForComparison(input.correctArtistName);

  let points = 0;

  if (songCorrect && artistCorrect) {
    points += POINTS_EXACT_MATCH;
    points += calculateSpeedBonus(input);
  } else if (songCorrect || artistCorrect) {
    points += POINTS_PARTIAL_MATCH;
    points += calculateSpeedBonus(input);
  }

  return { songCorrect, artistCorrect, points };
}
