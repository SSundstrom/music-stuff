"use client";

import { useRef, useState } from "react";
import { MdSettings, MdQrCode2 } from "react-icons/md";
import type { Player } from "@/types/shared";
import SpotifyPlayer from "@/components/SpotifyPlayer";
import PlayersModal from "@/components/game/PlayersModal";
import QRCodeModal from "@/components/game/QRCodeModal";

interface GameShellProps {
  sessionId: string;
  isOwner: boolean;
  isConnected: boolean;
  players: Player[];
  currentPlayerId: string | null;
  loading: boolean;
  error: string;
  children: React.ReactNode;
  /** When set, the player's play button will restart this track from the given position */
  activeTrack?: {
    spotifyId: string;
    startTimeMs: number;
  };
}

export default function GameShell({
  sessionId,
  isOwner,
  isConnected,
  players,
  currentPlayerId,
  loading,
  error,
  children,
  activeTrack,
}: GameShellProps) {
  const [showPlayersModal, setShowPlayersModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const optionsButtonRef = useRef<HTMLButtonElement>(null);
  const qrButtonRef = useRef<HTMLButtonElement>(null);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-green-500 to-green-700">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-white border-t-transparent" />
          <p className="text-white">Loading game...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-green-500 to-green-700 p-4">
        <div className="rounded-lg bg-white p-8 text-center shadow-lg">
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-green-500 to-green-700 p-4">
      {!isConnected && (
        <div
          className="fixed top-4 right-4 text-2xl opacity-75 hover:opacity-100 transition-opacity"
          title="Connection lost - refresh to reconnect"
        >
          🔌
        </div>
      )}
      <div className="mx-auto max-w-4xl space-y-4">
        {isOwner && (
          <div className="flex justify-between items-center">
            <div className="flex-1">
              <SpotifyPlayer activeTrack={activeTrack} />
            </div>
            <button
              ref={qrButtonRef}
              onClick={() => setShowQRModal(true)}
              className="text-gray-600 hover:text-gray-900 transition-colors p-2 ml-2"
              aria-label="Share QR Code"
            >
              <MdQrCode2 size={28} />
            </button>
            <button
              ref={optionsButtonRef}
              onClick={() => setShowPlayersModal(true)}
              className="text-gray-600 hover:text-gray-900 transition-colors p-2 ml-2"
              aria-label="Options"
            >
              <MdSettings size={28} />
            </button>
          </div>
        )}

        <QRCodeModal
          isOpen={showQRModal}
          onClose={() => setShowQRModal(false)}
          sessionId={sessionId}
          buttonRef={qrButtonRef}
        />

        <PlayersModal
          isOpen={showPlayersModal}
          onClose={() => setShowPlayersModal(false)}
          players={players}
          isOwner={isOwner}
          sessionId={sessionId}
          currentPlayerId={currentPlayerId}
          buttonRef={optionsButtonRef}
        />

        {children}
      </div>
    </div>
  );
}
