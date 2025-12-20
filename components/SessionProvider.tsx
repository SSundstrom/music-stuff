"use client";

import { createAuthClient } from "better-auth/client";
import { ReactNode } from "react";

export const authClient = createAuthClient({
  baseURL: typeof window !== "undefined" ? window.location.origin : "",
});

export default function SessionProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
