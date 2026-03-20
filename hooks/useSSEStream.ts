import { useEffect, useRef, useState } from "react";
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

  const onMessageRef = useRef(onMessage);
  const onConnectRef = useRef(onConnect);
  const onDisconnectRef = useRef(onDisconnect);
  const onErrorRef = useRef(onError);

  onMessageRef.current = onMessage;
  onConnectRef.current = onConnect;
  onDisconnectRef.current = onDisconnect;
  onErrorRef.current = onError;

  useEffect(() => {
    if (!sessionId) return;

    let eventSource: EventSource | null = null;
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;
    let retryDelay = 1000;
    let disposed = false;

    function connect() {
      if (disposed) return;

      const streamUrl = playerId
        ? `/api/game/${sessionId}/stream?playerId=${encodeURIComponent(playerId)}`
        : `/api/game/${sessionId}/stream`;

      try {
        eventSource = new EventSource(streamUrl);

        eventSource.onopen = () => {
          console.log("[SSE] Connection established");
          retryDelay = 1000;
          setIsConnected(true);
          onConnectRef.current?.();
        };

        eventSource.addEventListener("message", (event: MessageEvent) => {
          try {
            const rawMessage = JSON.parse(event.data as string);
            console.log("[SSE] Received message:", rawMessage.type);
            const message = SSEMessageSchema.safeParse(rawMessage);
            if (!message.success) {
              console.error(message.error);
              return;
            }
            onMessageRef.current?.(message.data);
          } catch (error) {
            console.error("[SSE] Failed to parse message:", error);
            onErrorRef.current?.(
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
          eventSource = null;
          onDisconnectRef.current?.();
          scheduleReconnect();
        });
      } catch (error) {
        const err =
          error instanceof Error
            ? error
            : new Error("Failed to connect to SSE stream");
        console.error("[SSE] Connection failed:", err);
        onErrorRef.current?.(err);
        scheduleReconnect();
      }
    }

    function scheduleReconnect() {
      if (disposed) return;
      console.log(`[SSE] Reconnecting in ${retryDelay / 1000}s...`);
      retryTimeout = setTimeout(() => {
        retryTimeout = null;
        connect();
      }, retryDelay);
      retryDelay = Math.min(retryDelay * 2, 30000);
    }

    connect();

    return () => {
      disposed = true;
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
      if (eventSource) {
        setIsConnected(false);
        eventSource.close();
      }
    };
  }, [sessionId, playerId]);

  return {
    isConnected,
  };
}
