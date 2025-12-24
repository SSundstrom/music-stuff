import type { SSEMessage } from "@/types/game";
import { eventBus } from "./event-bus";
import { getMatch } from "./game-session";

interface SSEConnection {
  controller: ReadableStreamDefaultController<Uint8Array>;
  playerId: string;
  onClose?: () => void;
}

class SSEManager {
  private sessions: Map<string, SSEConnection[]> = new Map();
  private eventHandlersInitialized = false;

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

  registerEventListeners(): void {
    if (this.eventHandlersInitialized) return;
    this.eventHandlersInitialized = true;

    // Listen to match:completed event and broadcast match_ended
    eventBus.on("match:completed", async (data) => {
      const { sessionId, matchId } = data;
      const match = getMatch(matchId);

      if (match) {
        this.broadcast(sessionId, {
          type: "match_ended",
          data: {
            match_id: matchId,
            winner_id: match.winner_id || "",
            votes_a: match.votes_a,
            votes_b: match.votes_b,
          },
        } satisfies SSEMessage);
      }
    });

    // Listen to round:advanced event and broadcast round_complete
    eventBus.on("round:advanced", async (data) => {
      const { sessionId, roundNumber } = data;
      this.broadcast(sessionId, {
        type: "round_complete",
        data: {
          round_number: roundNumber,
        },
      } satisfies SSEMessage);
    });

    // Listen to game:finished event and broadcast game_winner
    eventBus.on("game:finished", async (data) => {
      const { sessionId, winningSongId } = data;
      this.broadcast(sessionId, {
        type: "game_winner",
        data: {
          winning_song_id: winningSongId,
        },
      } satisfies SSEMessage);
    });
  }
}

export const sseManager = new SSEManager();
