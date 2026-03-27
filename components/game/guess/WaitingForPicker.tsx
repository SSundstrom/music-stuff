"use client";

import type { Player } from "@/types/game";

interface WaitingForPickerProps {
  picker: Player | undefined;
}

export default function WaitingForPicker({ picker }: WaitingForPickerProps) {
  return (
    <div className="rounded-lg bg-white p-8 shadow-lg text-center">
      <div className="mb-4 text-6xl">🎵</div>
      <h2 className="mb-2 text-2xl font-bold text-black">
        {picker?.name ?? "Someone"} is picking a song...
      </h2>
      <p className="text-gray-600">
        Get ready to guess what they play!
      </p>
      <div className="mt-4 flex justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-500 border-t-transparent" />
      </div>
    </div>
  );
}
