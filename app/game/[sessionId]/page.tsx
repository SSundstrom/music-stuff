"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { Session } from "@/types/shared";

export default function GameRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;
  const [error, setError] = useState("");

  useEffect(() => {
    const redirect = async () => {
      try {
        const response = await fetch(`/api/game/${sessionId}`);
        if (!response.ok) throw new Error("Failed to fetch game state");

        const data = (await response.json()) as { session: Session };

        if (data.session.gameType === "guess_the_song") {
          router.replace(`/guess/${sessionId}`);
        } else {
          router.replace(`/tournament/${sessionId}`);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      }
    };

    redirect();
  }, [sessionId, router]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-green-500 to-green-700 p-4">
        <div className="rounded-lg bg-white p-8 text-center shadow-lg">
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-green-500 to-green-700">
      <div className="text-center">
        <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-white border-t-transparent" />
        <p className="text-white">Redirecting...</p>
      </div>
    </div>
  );
}
