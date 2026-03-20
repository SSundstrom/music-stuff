import { useEffect, useState, useCallback } from "react";
import type { Session, Player } from "@/types/shared";
import type { GuessState } from "@/types/guess";
import type { SSEMessage } from "@/types/game";
import { useSSEStream } from "./useSSEStream";

interface UseGuessSessionOptions {
  sessionId: string;
  playerId: string | null;
}

export interface TurnResult {
  playerId: string;
  playerName: string;
  songName: string;
  artistName: string;
  songCorrect: boolean;
  artistCorrect: boolean;
  points: number;
}

interface GuessSessionState {
  session: Session | null;
  players: Player[];
  guessState: GuessState | null;
  lastTurnResults: TurnResult[];
  lastGuessEndsAt: string | null;
  loading: boolean;
  error: string;
  isConnected: boolean;
}

export function useGuessSession({
  sessionId,
  playerId,
}: UseGuessSessionOptions) {
  const [state, setState] = useState<GuessSessionState>({
    session: null,
    players: [],
    guessState: null,
    lastTurnResults: [],
    lastGuessEndsAt: null,
    loading: true,
    error: "",
    isConnected: false,
  });

  const handleMessage = useCallback((message: SSEMessage) => {
    setState((prev) => {
      switch (message.type) {
        case "game_state":
          return {
            ...prev,
            session: message.data.session,
            players: message.data.players,
            guessState: message.data.guessState || null,
            error: "",
          };

        case "player_joined":
          return { ...prev, players: [...prev.players, message.data] };

        case "player_left":
          return {
            ...prev,
            players: prev.players.filter(
              (p) => p.id !== message.data.playerId,
            ),
          };

        case "guess_game_started":
        case "guess_picker_selected":
          return {
            ...prev,
            lastTurnResults: [],
            lastGuessEndsAt: null,
            guessState: prev.guessState
              ? {
                  ...prev.guessState,
                  status: "playing" as const,
                  currentTurn: {
                    id: "",
                    sessionId: prev.session?.id ?? "",
                    roundNumber: message.data.roundNumber,
                    turnNumber: message.data.turnNumber,
                    pickerId: message.data.pickerId,
                    spotifyId: null,
                    songName: null,
                    artistName: null,
                    imageUrl: null,
                    startTime: 0,
                    status: "picking" as const,
                    guessingStartedAt: null,
                    createdAt: new Date(),
                  },
                }
              : prev.guessState,
          };

        case "guess_song_picked":
          return {
            ...prev,
            guessState: prev.guessState?.currentTurn
              ? {
                  ...prev.guessState,
                  currentTurn: {
                    ...prev.guessState.currentTurn,
                    status: "countdown" as const,
                  },
                }
              : prev.guessState,
          };

        case "guess_countdown":
          return prev;

        case "guess_phase_started":
          return {
            ...prev,
            lastGuessEndsAt: message.data.endsAt,
            guessState: prev.guessState?.currentTurn
              ? {
                  ...prev.guessState,
                  currentTurn: {
                    ...prev.guessState.currentTurn,
                    status: "guessing" as const,
                  },
                }
              : prev.guessState,
          };

        case "guess_submitted":
          return prev;

        case "guess_turn_ended":
          return {
            ...prev,
            lastTurnResults: message.data.results,
            guessState: prev.guessState?.currentTurn
              ? {
                  ...prev.guessState,
                  scores: message.data.scores,
                  currentTurn: {
                    ...prev.guessState.currentTurn,
                    status: "scoreboard" as const,
                    spotifyId: message.data.song.spotifyId,
                    songName: message.data.song.songName,
                    artistName: message.data.song.artistName,
                    imageUrl: message.data.song.imageUrl,
                  },
                }
              : prev.guessState,
          };

        case "guess_game_ended":
          return {
            ...prev,
            guessState: prev.guessState
              ? {
                  ...prev.guessState,
                  status: "ended" as const,
                  scores: message.data.scores,
                }
              : prev.guessState,
          };

        case "guess_game_restarted":
          return {
            ...prev,
            lastTurnResults: [],
            lastGuessEndsAt: null,
            guessState: prev.guessState
              ? {
                  ...prev.guessState,
                  status: "lobby" as const,
                  currentTurn: null,
                  scores: [],
                }
              : prev.guessState,
          };

        default:
          return prev;
      }
    });
  }, []);

  const onConnect = useCallback(() => {
    setState((prev) => ({ ...prev, isConnected: true }));
  }, []);

  const onDisconnect = useCallback(() => {
    setState((prev) => ({ ...prev, isConnected: false }));
  }, []);

  const onError = useCallback((error: Error) => {
    setState((prev) => ({ ...prev, error: error.message }));
  }, []);

  const { isConnected } = useSSEStream({
    sessionId,
    playerId,
    onMessage: handleMessage,
    onConnect,
    onDisconnect,
    onError,
  });

  useEffect(() => {
    const fetchInitialState = async () => {
      try {
        const response = await fetch(`/api/game/${sessionId}`);
        if (!response.ok) throw new Error("Failed to fetch game state");

        const data = (await response.json()) as {
          session: Session;
          players: Player[];
          guessState?: GuessState;
        };

        setState((prev) => ({
          ...prev,
          session: data.session,
          players: data.players,
          guessState: data.guessState || null,
          lastTurnResults: [],
          lastGuessEndsAt: null,
          loading: false,
          error: "",
        }));
      } catch (err) {
        setState((prev) => ({
          ...prev,
          error: err instanceof Error ? err.message : "An error occurred",
          loading: false,
        }));
      }
    };

    fetchInitialState();
  }, [sessionId]);

  return {
    session: state.session,
    players: state.players,
    guessState: state.guessState,
    lastTurnResults: state.lastTurnResults,
    lastGuessEndsAt: state.lastGuessEndsAt,
    loading: state.loading,
    error: state.error,
    isConnected,
  };
}
