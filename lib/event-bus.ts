import { EventEmitter } from "events";

export interface VoteCastEvent {
  playerId: string;
  matchId: string;
  songId: string;
  sessionId: string;
}

export interface MatchCompletedEvent {
  matchId: string;
  sessionId: string;
}

export interface RoundAdvancedEvent {
  sessionId: string;
  roundNumber: number;
}

export interface GameFinishedEvent {
  sessionId: string;
  winningSongId: string;
}

interface EventMap {
  "vote:cast": VoteCastEvent;
  "match:completed": MatchCompletedEvent;
  "round:advanced": RoundAdvancedEvent;
  "game:finished": GameFinishedEvent;
}

export type EventKind = keyof EventMap;

export class TypedEventBus {
  private emitter: EventEmitter;

  constructor() {
    this.emitter = new EventEmitter();
  }

  on<K extends keyof EventMap>(
    event: K,
    listener: (data: EventMap[K]) => void | Promise<void>,
  ): void {
    this.emitter.on(event, listener);
  }

  off<K extends keyof EventMap>(
    event: K,
    listener: (data: EventMap[K]) => void | Promise<void>,
  ): void {
    this.emitter.off(event, listener);
  }

  emit<K extends keyof EventMap>(event: K, data: EventMap[K]): void {
    this.emitter.emit(event, data);
  }
}

export const eventBus = new TypedEventBus();
