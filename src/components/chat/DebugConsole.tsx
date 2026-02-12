"use client";

import { useDebug } from "@/contexts/DebugContext";
import { useEffect, useState } from "react";

export default function DebugConsole() {
  const { isDebug, latestAction } = useDebug();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted || !isDebug) {
    return null;
  }

  // Show placeholder if no action yet
  if (!latestAction) {
    return (
      <div className="debug-console debug-console-idle">
        <div className="debug-console-header">
          <span className="debug-console-icon">🐛</span>
          <span className="debug-console-endpoint">Debug Mode Active</span>
        </div>
        <div className="debug-console-message">
          Waiting for API calls... Try posting a message, deleting, or managing members.
        </div>
      </div>
    );
  }

  // Show latest action
  const isSuccess = latestAction.status >= 200 && latestAction.status < 300;
  const statusEmoji = isSuccess ? "🟢" : "🔴";
  const statusClass = isSuccess ? "debug-console-success" : "debug-console-error";

  return (
    <div className={`debug-console ${statusClass}`}>
      <div className="debug-console-header">
        <span className="debug-console-icon">{statusEmoji}</span>
        <span className="debug-console-method">{latestAction.method}</span>
        <span className="debug-console-endpoint">{latestAction.endpoint}</span>
        <span className="debug-console-status">→ {latestAction.status}</span>
      </div>
      <div className="debug-console-message">{latestAction.message}</div>
    </div>
  );
}
