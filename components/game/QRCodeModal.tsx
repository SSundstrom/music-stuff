"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { QRCodeSVG } from "qrcode.react";

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  buttonRef?: React.RefObject<HTMLButtonElement | null>;
}

export default function QRCodeModal({
  isOpen,
  onClose,
  sessionId,
  buttonRef,
}: QRCodeModalProps) {
  const [position, setPosition] = useState({ top: 0, right: 0 });
  const [gameUrl] = useState(() => {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/game/${sessionId}`;
    }
    return "";
  });

  useEffect(() => {
    if (!isOpen || !buttonRef?.current) return;

    const rect = buttonRef.current.getBoundingClientRect();
    setPosition({
      top: rect.bottom + 8,
      right: window.innerWidth - rect.right,
    });
  }, [isOpen, buttonRef]);

  if (!isOpen || !gameUrl) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* QR Code Modal */}
      <div
        className="fixed z-50 w-full max-w-md rounded-lg bg-white shadow-xl"
        style={{
          top: `${position.top}px`,
          right: `${position.right}px`,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 p-4">
          <h2 className="text-lg font-bold text-black">Join Game</h2>
          <button
            onClick={onClose}
            className="text-2xl text-gray-500 hover:text-gray-700"
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col items-center gap-4">
          <p className="text-sm text-gray-600 text-center">
            Scan this QR code to join the game
          </p>

          {/* QR Code */}
          <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
            <QRCodeSVG
              value={gameUrl}
              size={280}
              level="H"
              includeMargin={true}
            />
          </div>

          {/* Game URL */}
          <div className="w-full">
            <p className="text-xs text-gray-500 mb-2">Or visit:</p>
            <input
              type="text"
              value={gameUrl}
              readOnly
              className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-xs text-gray-700 text-center"
            />
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
