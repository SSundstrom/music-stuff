import { useEffect, useState, useCallback } from "react";
import type {
  Session,
  Tournament,
  Player,
  Song,
  TournamentMatch,
  SSEMessage,
} from "@/types/game";
import { useSSEStream } from "./useSSEStream";

interface UseGameSessionOptions {
  sessionId: string;
  playerId: string | null;
}

interface GameSessionState {
  session: Session | null;
  tournament: Tournament | null;
  players: Player[];
  songs: Song[];
  matches: TournamentMatch[];
  loading: boolean;
  error: string;
  isConnected: boolean;
}

export function useGameSession({ sessionId, playerId }: UseGameSessionOptions) {
  const [state, setState] = useState<GameSessionState>({
    session: null,
    tournament: null,
    players: [],
    songs: [],
    matches: [],
    loading: true,
    error: "",
    isConnected: false,
  });

  const handleMessage = useCallback((message: SSEMessage) => {
    setState((prevState) => {
      switch (message.type) {
        case "game_state":
          // Full state update from server
          return {
            ...prevState,
            session: message.data.session,
            tournament: message.data.tournament || null,
            players: message.data.players,
            songs: message.data.songs || [],
            matches: message.data.matches || [],
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
              (p) => p.id !== message.data.playerId,
            ),
          };

        case "category_announced":
          // Category announced - full state update comes via game_state event
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
          // Match ended - update the match with winner and votes
          return {
            ...prevState,
            matches: prevState.matches.map((m) =>
              m.id === message.data.matchId
                ? {
                    ...m,
                    winner_id: message.data.winnerId,
                    votes_a: message.data.votesA,
                    votes_b: message.data.votesB,
                    status: "completed" as const,
                  }
                : m,
            ),
          };

        case "round_complete":
          // Round completed - the session will be updated via game_state event
          return prevState;

        case "game_winner":
          // Game winner announced - tournament status is updated via game_state event
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
          tournament?: Tournament;
          players: Player[];
          songs: Song[];
          matches?: TournamentMatch[];
        };

        setState((prev) => ({
          ...prev,
          session: data.session,
          tournament: data.tournament || null,
          players: data.players,
          songs: data.songs,
          matches: data.matches || [],
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
    tournament: state.tournament,
    players: state.players,
    songs: state.songs,
    matches: state.matches,
    loading: state.loading,
    error: state.error,
    isConnected,
  };
}
