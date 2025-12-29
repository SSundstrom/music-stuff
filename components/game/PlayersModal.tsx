"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import type { Player } from "@/types/game";

interface PlayersModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: Player[];
  isOwner: boolean;
  sessionId: string;
  currentPlayerId: string | null;
  buttonRef?: React.RefObject<HTMLButtonElement | null>;
}

export default function PlayersModal({
  isOpen,
  onClose,
  players,
  isOwner,
  sessionId,
  currentPlayerId,
  buttonRef,
}: PlayersModalProps) {
  const [expandMenu, setExpandMenu] = useState<string | null>(null);
  const [loadingKick, setLoadingKick] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [position, setPosition] = useState({ top: 0, right: 0 });

  useEffect(() => {
    if (!isOpen || !buttonRef?.current) return;

    const rect = buttonRef.current.getBoundingClientRect();
    setPosition({
      top: rect.bottom + 8, // 8px below the button
      right: window.innerWidth - rect.right, // align with right edge
    });
  }, [isOpen, buttonRef]);

  const handleKickPlayer = async (playerId: string, playerName: string) => {
    if (
      !confirm(`Are you sure you want to kick ${playerName} from the game?`)
    ) {
      return;
    }

    setLoadingKick(playerId);
    setError("");

    try {
      const response = await fetch(`/api/game/${sessionId}/kick`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error: string };
        throw new Error(data.error);
      }

      setExpandMenu(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to kick player");
    } finally {
      setLoadingKick(null);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <>
      {/* Backdrop - only close on click */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Dropdown menu style modal */}
      <div
        className="fixed z-50 w-96 rounded-lg bg-white shadow-xl"
        style={{
          top: `${position.top}px`,
          right: `${position.right}px`,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 p-4">
          <h2 className="text-lg font-bold text-black">Players</h2>
          <button
            onClick={onClose}
            className="text-2xl text-gray-500 hover:text-gray-700"
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {error && (
            <div className="mb-4 rounded-lg bg-red-100 p-3 text-sm text-red-800">
              {error}
            </div>
          )}

          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600">
              {players.length} {players.length === 1 ? "player" : "players"}
            </span>
          </div>

          <div className="max-h-80 space-y-2 overflow-y-auto">
            {players.map((player) => (
              <div
                key={player.id}
                className="flex items-center justify-between rounded-lg bg-gray-50 p-3 hover:bg-gray-100"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center text-white font-semibold text-sm">
                    {player.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{player.name}</p>
                    <p className="text-xs text-gray-500">
                      {player.id === currentPlayerId
                        ? "You"
                        : `#${player.joinOrder + 1}`}
                    </p>
                  </div>
                  {player.isOwner && (
                    <span className="rounded-full bg-purple-100 px-2 py-1 text-xs font-semibold text-purple-800">
                      Owner
                    </span>
                  )}
                </div>

                {isOwner && player.id !== currentPlayerId && (
                  <div className="relative">
                    <button
                      onClick={() => handleKickPlayer(player.id, player.name)}
                      className="text-xs font-semibold text-red-600 hover:text-red-800 px-2 py-1 rounded hover:bg-red-50"
                    >
                      Kick
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {players.length === 0 && (
            <p className="text-center text-gray-500">No players yet</p>
          )}
        </div>
      </div>
    </>,
    document.body,
  );
}
