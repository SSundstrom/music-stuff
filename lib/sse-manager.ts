import type { SSEMessage } from "@/types/game";

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

  broadcast(sessionId: string, message: SSEMessage): void {
    const connections = this.sessions.get(sessionId);
    if (!connections) {
      console.log(
        `[SSE] No connections for session ${sessionId} to broadcast to`,
      );
      return;
    }

    console.log(
      `[SSE] Broadcasting ${message.type} to ${connections.length} clients in session ${sessionId}`,
    );

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

  sendToPlayer(sessionId: string, playerId: string, message: SSEMessage): void {
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
