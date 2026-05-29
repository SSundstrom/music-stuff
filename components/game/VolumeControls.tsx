"use client";

interface VolumeControlsProps {
  /** Volume (0-100) used while players are guessing. */
  guessingVolume: number;
  /** Volume (0-100) used between songs. */
  betweenVolume: number;
  onGuessingVolumeChange: (volume: number) => void;
  onBetweenVolumeChange: (volume: number) => void;
}

export default function VolumeControls({
  guessingVolume,
  betweenVolume,
  onGuessingVolumeChange,
  onBetweenVolumeChange,
}: VolumeControlsProps) {
  return (
    <div className="mt-6 border-t border-gray-200 pt-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-900">Volume</h3>

      <div className="mb-3">
        <label className="mb-1 block text-xs font-medium text-gray-600">
          While guessing
        </label>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={guessingVolume}
          onChange={(e) => onGuessingVolumeChange(parseInt(e.target.value))}
          className="w-full"
        />
        <p className="text-xs text-gray-500">{guessingVolume}%</p>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">
          Between songs
        </label>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={betweenVolume}
          onChange={(e) => onBetweenVolumeChange(parseInt(e.target.value))}
          className="w-full"
        />
        <p className="text-xs text-gray-500">{betweenVolume}%</p>
      </div>
    </div>
  );
}
