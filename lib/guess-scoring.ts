const POINTS_EXACT_SONG = 100;
const POINTS_ARTIST_ONLY = 25;
const SPEED_BONUS_MAX = 50;

interface ScoreInput {
  guessSpotifyId: string;
  guessArtistName: string;
  correctSpotifyId: string;
  correctArtistName: string;
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

export function calculateScore(input: ScoreInput): ScoreResult {
  const songCorrect = input.guessSpotifyId === input.correctSpotifyId;
  const artistCorrect =
    songCorrect ||
    normalizeForComparison(input.guessArtistName) ===
      normalizeForComparison(input.correctArtistName);

  let points = 0;

  if (songCorrect) {
    points += POINTS_EXACT_SONG;

    // Speed bonus: linear decay from SPEED_BONUS_MAX to 0 over guessTimeSec
    const elapsedMs =
      input.guessTimestamp.getTime() - input.phaseStartTimestamp.getTime();
    const elapsedSec = elapsedMs / 1000;
    const remaining = Math.max(0, input.guessTimeSec - elapsedSec);
    const speedBonus = Math.round(
      (remaining / input.guessTimeSec) * SPEED_BONUS_MAX,
    );
    points += speedBonus;
  } else if (artistCorrect) {
    points += POINTS_ARTIST_ONLY;
  }

  return { songCorrect, artistCorrect, points };
}
