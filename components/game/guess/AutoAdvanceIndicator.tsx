"use client";

import { useEffect, useRef, useState } from "react";

interface AutoAdvanceIndicatorProps {
  /** Seconds until the host's client auto-advances. */
  delaySec: number;
  /** Leading text, e.g. "Song starts in" or "Next song in". */
  label: string;
}

/**
 * A purely visual countdown shown while the host's auto-advance timer is
 * running, so players can see the next song/turn is about to start. The real
 * timer lives in GuessGameOrchestrator; this just mirrors its duration.
 *
 * Pinned to the bottom of the viewport (position: fixed) so it stays visible
 * even when the scoreboard scrolls. Remount it (via a `key`) when the turn or
 * phase changes so the animation restarts.
 */
export default function AutoAdvanceIndicator({
  delaySec,
  label,
}: AutoAdvanceIndicatorProps) {
  const [remaining, setRemaining] = useState(delaySec);
  // Start full, then deplete to 0 on the next frame so the CSS transition runs.
  const [barWidth, setBarWidth] = useState(100);
  const startRef = useRef(0);

  useEffect(() => {
    startRef.current = performance.now();
    setRemaining(delaySec);
    setBarWidth(100);
    const raf = requestAnimationFrame(() => setBarWidth(0));

    const interval = setInterval(() => {
      const elapsed = (performance.now() - startRef.current) / 1000;
      const left = Math.max(0, delaySec - elapsed);
      setRemaining(left);
      if (left <= 0) clearInterval(interval);
    }, 100);

    return () => {
      cancelAnimationFrame(raf);
      clearInterval(interval);
    };
  }, [delaySec]);

  return (
    <div
      // Below the settings modal (z-50/z-40) but above page content.
      className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white/95 shadow-[0_-2px_8px_rgba(0,0,0,0.06)] backdrop-blur"
      aria-live="polite"
    >
      <div className="mx-auto flex max-w-2xl items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-gray-600">
        <span>{label}</span>
        <span className="tabular-nums font-bold text-green-600">
          {Math.ceil(remaining)}s
        </span>
      </div>
      <div className="h-1 w-full bg-gray-200">
        <div
          className="h-full bg-green-600"
          style={{
            width: `${barWidth}%`,
            transitionProperty: "width",
            transitionDuration: `${delaySec}s`,
            transitionTimingFunction: "linear",
          }}
        />
      </div>
    </div>
  );
}
