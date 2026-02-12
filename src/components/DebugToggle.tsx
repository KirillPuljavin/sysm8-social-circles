"use client";

import { useDebug } from "@/contexts/DebugContext";
import { useEffect, useState } from "react";

export default function DebugToggle() {
  const { isDebug, toggleDebug } = useDebug();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch - only render after mount
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className="debug-toggle-container">
      <label className="debug-toggle-label">
        <span className="debug-toggle-text">Debug</span>
        <button
          onClick={toggleDebug}
          className={`debug-toggle-switch ${isDebug ? "active" : ""}`}
          role="switch"
          aria-checked={isDebug}
          aria-label="Toggle debug mode"
        >
          <span className="debug-toggle-slider" />
        </button>
      </label>
    </div>
  );
}
