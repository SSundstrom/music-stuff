import type { SSEMessage } from "@/types/game";
import { Redis } from "@upstash/redis";

interface SSEConnection {
  controller: ReadableStreamDefaultController<Uint8Array>;
  playerId: string;
  onClose?: () => void;
}

class SSEManager {
  private sessions: Map<string, SSEConnection[]> = new Map();

  addConnection(
    sessionId: string,
    playerId: string,
    controller: ReadableStreamDefaultController<Uint8Array>,
    onClose?: () => void,
  ): void {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, []);
    }
    this.sessions.get(sessionId)!.push({ controller, playerId, onClose });
  }

  removeConnection(
    sessionId: string,
    controller: ReadableStreamDefaultController<Uint8Array>,
  ): void {
    const connections = this.sessions.get(sessionId);
    if (connections) {
      const index = connections.findIndex((c) => c.controller === controller);
      if (index > -1) {
        const connection = connections[index];
        connection.onClose?.();
        connections.splice(index, 1);
      }
      if (connections.length === 0) {
        this.sessions.delete(sessionId);
      }
    }
  }

  async broadcast(sessionId: string, message: SSEMessage): Promise<void> {
    console.log(
      `[SSE] Broadcasting ${message.type} to session ${sessionId}`,
    );

    // Publish to Redis so other instances receive it
    const messageStr = JSON.stringify(message);
    try {
      const redis = Redis.fromEnv();
      await redis.publish(
        `tournament:sessions:${sessionId}:broadcast`,
        messageStr,
      );
    } catch (error) {
      console.error("[Redis] Publish error:", error);
    }

    // Also deliver locally to this instance's connections
    this.deliverToSession(sessionId, message);
  }

  async sendToPlayer(sessionId: string, playerId: string, message: SSEMessage): Promise<void> {
    // Publish to Redis so other instances receive it
    const messageStr = JSON.stringify(message);
    try {
      const redis = Redis.fromEnv();
      await redis.publish(
        `tournament:sessions:${sessionId}:player:${playerId}`,
        messageStr,
      );
    } catch (error) {
      console.error("[Redis] Publish error:", error);
    }

    // Also deliver locally to this instance's player connection
    this.deliverToPlayer(sessionId, playerId, message);
  }

  private deliverToSession(sessionId: string, message: SSEMessage): void {
    const connections = this.sessions.get(sessionId);
    if (!connections) {
      return;
    }

    const sseMessage = `data: ${JSON.stringify(message)}\n\n`;
    const encoder = new TextEncoder();
    const encoded = encoder.encode(sseMessage);

    const deadConnections: number[] = [];

    for (let i = 0; i < connections.length; i++) {
      const connection = connections[i];
      try {
        connection.controller.enqueue(encoded);
      } catch (error) {
        console.error(
          "[SSE] Error sending message to client, removing connection:",
          error,
        );
        deadConnections.unshift(i);
      }
    }

    // Remove dead connections
    for (const index of deadConnections) {
      this.removeConnection(sessionId, connections[index].controller);
    }
  }

  private deliverToPlayer(sessionId: string, playerId: string, message: SSEMessage): void {
    const connections = this.sessions.get(sessionId);
    if (!connections) return;

    const sseMessage = `data: ${JSON.stringify(message)}\n\n`;
    const encoder = new TextEncoder();
    const encoded = encoder.encode(sseMessage);

    const deadConnections: number[] = [];

    for (let i = 0; i < connections.length; i++) {
      const connection = connections[i];
      if (connection.playerId === playerId) {
        try {
          connection.controller.enqueue(encoded);
        } catch (error) {
          console.error(
            "[SSE] Error sending message to player, removing connection:",
            error,
          );
          deadConnections.unshift(i);
        }
      }
    }

    // Remove dead connections
    for (const index of deadConnections) {
      this.removeConnection(sessionId, connections[index].controller);
    }
  }

  getSessionConnections(sessionId: string): SSEConnection[] {
    return this.sessions.get(sessionId) || [];
  }
}

export const sseManager = new SSEManager();
