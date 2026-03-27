import { useEffect, useState, useCallback } from "react";
import type {
  Session,
  Tournament,
  Player,
  Song,
  TournamentMatch,
  SSEMessage,
  GuessState,
} from "@/types/game";
import { useSSEStream } from "./useSSEStream";

interface UseGameSessionOptions {
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

interface GameSessionState {
  session: Session | null;
  tournament: Tournament | null;
  players: Player[];
  songs: Song[];
  matches: TournamentMatch[];
  guessState: GuessState | null;
  lastTurnResults: TurnResult[];
  lastGuessEndsAt: string | null;
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
    guessState: null,
    lastTurnResults: [],
    lastGuessEndsAt: null,
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
            guessState: message.data.guessState || null,
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

        case "playback_started":
          // Update the match with the currently playing song
          return {
            ...prevState,
            matches: prevState.matches.map((m) =>
              m.id === message.data.matchId
                ? {
                    ...m,
                    currentlyPlayingSongId: message.data.songId,
                  }
                : m,
            ),
          };

        case "playback_stopped":
          // Clear the currently playing song
          return {
            ...prevState,
            matches: prevState.matches.map((m) =>
              m.id === message.data.matchId
                ? {
                    ...m,
                    currentlyPlayingSongId: null,
                  }
                : m,
            ),
          };

        // Guess the Song events — most trigger a full game_state update,
        // but we handle the incremental ones for responsiveness
        case "guess_game_started":
        case "guess_picker_selected":
          return {
            ...prevState,
            lastTurnResults: [],
            lastGuessEndsAt: null,
            guessState: prevState.guessState
              ? {
                  ...prevState.guessState,
                  status: "playing" as const,
                  currentTurn: {
                    id: "",
                    sessionId: prevState.session?.id ?? "",
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
              : prevState.guessState,
          };

        case "guess_song_picked":
          return {
            ...prevState,
            guessState: prevState.guessState?.currentTurn
              ? {
                  ...prevState.guessState,
                  currentTurn: {
                    ...prevState.guessState.currentTurn,
                    status: "countdown" as const,
                  },
                }
              : prevState.guessState,
          };

        case "guess_countdown":
          return prevState;

        case "guess_phase_started":
          return {
            ...prevState,
            lastGuessEndsAt: message.data.endsAt,
            guessState: prevState.guessState?.currentTurn
              ? {
                  ...prevState.guessState,
                  currentTurn: {
                    ...prevState.guessState.currentTurn,
                    status: "guessing" as const,
                  },
                }
              : prevState.guessState,
          };

        case "guess_submitted":
          // Someone guessed — no details revealed
          return prevState;

        case "guess_turn_ended":
          return {
            ...prevState,
            lastTurnResults: message.data.results,
            guessState: prevState.guessState?.currentTurn
              ? {
                  ...prevState.guessState,
                  currentTurn: {
                    ...prevState.guessState.currentTurn,
                    status: "scoreboard" as const,
                    spotifyId: message.data.song.spotifyId,
                    songName: message.data.song.songName,
                    artistName: message.data.song.artistName,
                    imageUrl: message.data.song.imageUrl,
                  },
                }
              : prevState.guessState,
          };

        case "guess_game_ended":
          return {
            ...prevState,
            guessState: prevState.guessState
              ? {
                  ...prevState.guessState,
                  status: "ended" as const,
                  scores: message.data.scores,
                }
              : prevState.guessState,
          };

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
          guessState?: GuessState;
        };

        setState((prev) => ({
          ...prev,
          session: data.session,
          tournament: data.tournament || null,
          players: data.players,
          songs: data.songs,
          matches: data.matches || [],
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
    tournament: state.tournament,
    players: state.players,
    songs: state.songs,
    matches: state.matches,
    guessState: state.guessState,
    lastTurnResults: state.lastTurnResults,
    lastGuessEndsAt: state.lastGuessEndsAt,
    loading: state.loading,
    error: state.error,
    isConnected,
  };
}
