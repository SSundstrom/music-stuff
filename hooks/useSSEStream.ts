import { useEffect, useCallback } from "react";
import type { WSMessage } from "@/types/game";
import { WSMessageSchema } from "@/types/game";

interface UseSSEStreamOptions {
  sessionId: string;
  playerId: string | null;
  onMessage?: (message: WSMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

export function useSSEStream({
  sessionId,
  playerId,
  onMessage,
  onConnect,
  onDisconnect,
  onError,
}: UseSSEStreamOptions) {
  useEffect(() => {
    if (!sessionId || !playerId) return;

    let eventSource: EventSource | null = null;

    try {
      eventSource = new EventSource(
        `/api/game/${sessionId}/stream?playerId=${encodeURIComponent(playerId)}`,
      );

      eventSource.addEventListener("open", () => {
        console.log("[SSE] Connected");
        onConnect?.();
      });

      eventSource.addEventListener("message", (event: MessageEvent) => {
        try {
          const rawMessage = JSON.parse(event.data as string);
          const message = WSMessageSchema.parse(rawMessage);
          onMessage?.(message);
        } catch (error) {
          console.error("[SSE] Failed to parse message:", error);
          onError?.(
            new Error(
              `Failed to parse SSE message: ${error instanceof Error ? error.message : "Unknown error"}`,
            ),
          );
        }
      });

      eventSource.addEventListener("error", () => {
        console.error("[SSE] Connection error");
        eventSource?.close();
        onDisconnect?.();
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error("Failed to connect to SSE stream");
      console.error("[SSE] Connection failed:", err);
      onError?.(err);
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [sessionId, playerId, onMessage, onConnect, onDisconnect, onError]);

  return {
    isConnected: true, // EventSource manages connection state internally
  };
}
