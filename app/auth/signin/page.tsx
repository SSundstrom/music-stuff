"use client";

import { authClient } from "@/components/SessionProvider";
import { useRouter } from "next/navigation";

export default function SignInPage() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-green-500 to-green-700">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg text-center">
        <h1 className="mb-2 text-3xl font-bold text-black">
          Spotify Tournament
        </h1>
        <p className="mb-8 text-gray-600">
          Sign in with Spotify to create a game
        </p>

        <button
          onClick={async () => {
            await authClient.signIn.social({
              provider: "spotify",
            });
            router.push("/");
          }}
          className="w-full rounded-lg bg-green-600 px-4 py-3 font-semibold text-white hover:bg-green-700"
        >
          Sign in with Spotify
        </button>

        <button
          onClick={() => router.push("/")}
          className="mt-4 w-full rounded-lg border border-gray-300 px-4 py-3 font-semibold text-black hover:bg-gray-50"
        >
          Back to Home
        </button>
      </div>
    </div>
  );
}
