import { useEffect, useState, useCallback } from "react";
import type { Session, Player, Song, WSMessage } from "@/types/game";
import { useSSEStream } from "./useSSEStream";

interface UseGameSessionOptions {
  sessionId: string;
  playerId: string | null;
}

interface GameSessionState {
  session: Session | null;
  players: Player[];
  songs: Song[];
  loading: boolean;
  error: string;
  isConnected: boolean;
}

export function useGameSession({
  sessionId,
  playerId,
}: UseGameSessionOptions) {
  const [state, setState] = useState<GameSessionState>({
    session: null,
    players: [],
    songs: [],
    loading: true,
    error: "",
    isConnected: false,
  });

  const handleMessage = useCallback((message: WSMessage) => {
    setState((prevState) => {
      switch (message.type) {
        case "game_state":
          // Full state update from server
          return {
            ...prevState,
            session: message.data.session,
            players: message.data.players,
            songs: message.data.songs || [],
            error: "",
          };

        case "player_joined":
          // Add new player to the list
          return {
            ...prevState,
            players: [...prevState.players, message.data],
          };

        case "player_left":
          // Remove player from the list
          return {
            ...prevState,
            players: prevState.players.filter(
              (p) => p.id !== message.data.player_id,
            ),
          };

        case "category_announced":
          // Update current category
          if (prevState.session) {
            return {
              ...prevState,
              session: {
                ...prevState.session,
                current_category: message.data.category,
              },
            };
          }
          return prevState;

        case "song_submitted":
          // A song was submitted - add it to the songs list
          return {
            ...prevState,
            songs: [...prevState.songs, message.data],
          };

        case "match_started":
          // Match started - update session status if needed
          return prevState;

        case "match_ended":
          // Match ended
          return prevState;

        case "round_complete":
          // Round completed
          if (prevState.session) {
            return {
              ...prevState,
              session: {
                ...prevState.session,
                current_round: message.data.round_number + 1,
              },
            };
          }
          return prevState;

        case "game_winner":
          // Game winner announced
          return prevState;

        default:
          return prevState;
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
    setState((prev) => ({
      ...prev,
      error: error.message,
    }));
  }, []);

  const { isConnected } = useSSEStream({
    sessionId,
    playerId,
    onMessage: handleMessage,
    onConnect,
    onDisconnect,
    onError,
  });

  // Initial fetch
  useEffect(() => {
    const fetchInitialState = async () => {
      try {
        const response = await fetch(`/api/game/${sessionId}`);
        if (!response.ok) throw new Error("Failed to fetch game state");

        const data = (await response.json()) as {
          session: Session;
          players: Player[];
          songs: Song[];
        };

        setState((prev) => ({
          ...prev,
          session: data.session,
          players: data.players,
          songs: data.songs,
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
    songs: state.songs,
    loading: state.loading,
    error: state.error,
    isConnected,
  };
}
