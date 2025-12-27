"use client";

import { useState } from "react";
import type { Player, SubmitCategoryRequest } from "@/types/game";

interface CategoryPhaseProps {
  sessionId: string;
  tournamentId: string;
  currentPicker: Player | undefined;
  isCurrentPicker: boolean;
}

export default function CategoryPhase({
  sessionId,
  currentPicker,
  tournamentId,
  isCurrentPicker,
}: CategoryPhaseProps) {
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmitCategory = async () => {
    if (!category.trim()) {
      setError("Please enter a category");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/game/${sessionId}/category`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: category.trim(),
          tournamentId,
        } satisfies SubmitCategoryRequest),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error: string };
        throw new Error(data.error);
      }

      setCategory("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg bg-white p-8 shadow-lg">
      <h1 className="mb-2 text-3xl font-bold text-black">Category Selection</h1>
      <p className="mb-6 text-lg text-gray-700">
        {currentPicker?.name} is choosing the category
      </p>

      {error && (
        <div className="mb-4 rounded-lg bg-red-100 p-4 text-base text-red-800">
          {error}
        </div>
      )}

      {isCurrentPicker ? (
        <div className="space-y-4">
          <p className="text-lg text-gray-700">
            It&apos;s your turn! Choose a category.
          </p>
          <input
            type="text"
            placeholder="e.g., Happy songs, 80s rock, Chill vibes..."
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-lg focus:border-green-500 focus:outline-none"
          />
          <button
            onClick={handleSubmitCategory}
            disabled={loading}
            className="w-full rounded-lg bg-green-600 px-4 py-3 font-semibold text-white hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? "Submitting..." : "Submit Category"}
          </button>
        </div>
      ) : (
        <div className="rounded-lg bg-blue-50 p-4 text-base text-blue-800">
          Waiting for {currentPicker?.name} to choose a category...
        </div>
      )}
    </div>
  );
}
