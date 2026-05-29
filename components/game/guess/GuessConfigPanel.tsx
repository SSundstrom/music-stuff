"use client";

import { useState } from "react";
import type { GuessConfig } from "@/types/game";

interface GuessConfigPanelProps {
  sessionId: string;
  config: GuessConfig | null | undefined;
  onConfigUpdated: () => void;
}

export default function GuessConfigPanel({
  sessionId,
  config,
  onConfigUpdated,
}: GuessConfigPanelProps) {
  const [guessTimeSec, setGuessTimeSec] = useState(config?.guessTimeSec ?? 30);
  const [maxRounds, setMaxRounds] = useState<number | null>(
    config?.maxRounds ?? null,
  );
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const response = await fetch(`/api/game/${sessionId}/guess/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guessTimeSec, maxRounds }),
      });
      if (!response.ok) throw new Error("Failed to save config");
      onConfigUpdated();
    } catch {
      // silently fail — user can retry
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg bg-gray-50 p-4">
      <h3 className="mb-3 text-lg font-bold text-black">Game Settings</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Guess Time (seconds)
          </label>
          <input
            type="range"
            min={10}
            max={120}
            step={5}
            value={guessTimeSec}
            onChange={(e) => setGuessTimeSec(parseInt(e.target.value))}
            className="w-full"
          />
          <p className="text-sm text-gray-600">{guessTimeSec}s</p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Max Rounds
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={20}
              value={maxRounds ?? ""}
              onChange={(e) =>
                setMaxRounds(e.target.value ? parseInt(e.target.value) : null)
              }
              placeholder="Unlimited"
              className="w-24 rounded border border-gray-300 px-3 py-2 text-sm"
            />
            <span className="text-sm text-gray-600">
              {maxRounds ? `${maxRounds} round${maxRounds > 1 ? "s" : ""}` : "Unlimited"}
            </span>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
