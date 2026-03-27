import { useEffect, useState, useCallback } from "react";
import type { Session, Player } from "@/types/shared";
import type { Tournament, Song, TournamentMatch } from "@/types/tournament";
import type { SSEMessage } from "@/types/game";
import { useSSEStream } from "./useSSEStream";

interface UseTournamentSessionOptions {
  sessionId: string;
  playerId: string | null;
}

interface TournamentSessionState {
  session: Session | null;
  tournament: Tournament | null;
  players: Player[];
  songs: Song[];
  matches: TournamentMatch[];
  loading: boolean;
  error: string;
  isConnected: boolean;
}

export function useTournamentSession({
  sessionId,
  playerId,
}: UseTournamentSessionOptions) {
  const [state, setState] = useState<TournamentSessionState>({
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
    setState((prev) => {
      switch (message.type) {
        case "game_state":
          return {
            ...prev,
            session: message.data.session,
            tournament: message.data.tournament || null,
            players: message.data.players,
            songs: message.data.songs || [],
            matches: message.data.matches || [],
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

        case "category_announced":
          return prev;

        case "song_submitted":
          return { ...prev, songs: [...prev.songs, message.data] };

        case "match_started":
          return prev;

        case "match_ended":
          return {
            ...prev,
            matches: prev.matches.map((m) =>
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
        case "game_winner":
          return prev;

        case "playback_started":
          return {
            ...prev,
            matches: prev.matches.map((m) =>
              m.id === message.data.matchId
                ? { ...m, currentlyPlayingSongId: message.data.songId }
                : m,
            ),
          };

        case "playback_stopped":
          return {
            ...prev,
            matches: prev.matches.map((m) =>
              m.id === message.data.matchId
                ? { ...m, currentlyPlayingSongId: null }
                : m,
            ),
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
