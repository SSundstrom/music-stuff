import { useEffect, useState } from "react";
import { authClient } from "@/components/SessionProvider";
import type { AuthSession } from "@/lib/types";

export function useAuthSession() {
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);

  useEffect(() => {
    authClient.getSession().then(({ data: session }) => {
      setAuthSession(session);
    });
  }, []);

  return authSession;
}
