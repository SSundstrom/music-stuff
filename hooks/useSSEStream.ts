import { useEffect, useState } from "react";
import type { SSEMessage } from "@/types/game";
import { SSEMessageSchema } from "@/types/game";

interface UseSSEStreamOptions {
  sessionId: string;
  playerId: string | null;
  onMessage?: (message: SSEMessage) => void;
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
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!sessionId) return;

    let eventSource: EventSource | null = null;

    try {
      const streamUrl = playerId
        ? `/api/game/${sessionId}/stream?playerId=${encodeURIComponent(playerId)}`
        : `/api/game/${sessionId}/stream`;

      eventSource = new EventSource(streamUrl);

      // Use onopen property for immediate connection notification
      eventSource.onopen = () => {
        console.log("[SSE] Connection established");
        setIsConnected(true);
        onConnect?.();
      };

      eventSource.addEventListener("message", (event: MessageEvent) => {
        try {
          const rawMessage = JSON.parse(event.data as string);
          console.log("[SSE] Received message:", rawMessage.type);
          const message = SSEMessageSchema.parse(rawMessage);
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
        setIsConnected(false);
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
        setIsConnected(false);
        eventSource.close();
      }
    };
  }, [sessionId, playerId, onMessage, onConnect, onDisconnect, onError]);

  return {
    isConnected,
  };
}
