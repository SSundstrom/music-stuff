import { useEffect, useState } from "react";
import { authClient } from "@/components/SessionProvider";
import type { AuthSession } from "@/lib/types";

export function useAuthSession() {
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);

  useEffect(() => {
    authClient.getSession().then(({ data: session }) => {
      const expired = session?.session.expiresAt.getTime() ?? 0;
      console.log({ session });
      if (expired < Date.now()) {
        return;
      }
      setAuthSession(session);
    });
  }, []);

  return authSession;
}
